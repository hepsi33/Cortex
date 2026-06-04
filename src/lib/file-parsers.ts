import mammoth from 'mammoth';
import officeParser from 'officeparser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import JSZip from 'jszip';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { hasBudget, isApproachingLimit, recordCall, markProviderExhausted } from './api-budget';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function parsePdf(buffer: Buffer): Promise<string> {
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    console.log(`[Parser] Parsing PDF (${sizeMB}MB)...`);

    try {
        const { PDFParse } = await import('pdf-parse');
        const uint8 = new Uint8Array(buffer);
        const parser = new PDFParse({ data: uint8 });
        const result = await parser.getText();
        let text = result.text;
        
        // Detect 'page numbers only' or empty content
        const textWithoutMarkers = text.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();
        const looksLikePageNumbersOnly = textWithoutMarkers.length < 200 && text.includes('--');

        if (!text || text.trim().length < 50 || looksLikePageNumbersOnly) {
            console.log(`[Parser] PDF text is sparse or malformed. Trying vision OCR...`);
            return await parsePdfWithVision(buffer);
        }

        console.log(`[Parser] PDF parsed: ${text.length} chars extracted`);
        return text;
    } catch (err: any) {
        console.warn(`[Parser] Standard PDF parse failed (${err.message}). Trying vision fallback...`);
        try {
            return await parsePdfWithVision(buffer);
        } catch (visionErr: any) {
            console.error(`[Parser] All PDF extraction methods failed:`, visionErr.message);
            throw new Error(`Could not read this PDF. It may be corrupted or protected.`);
        }
    }
}

/**
 * Multi-provider PDF vision OCR: Gemini → Groq
 */
async function parsePdfWithVision(buffer: Buffer): Promise<string> {
    // Try Gemini first if budget allows
    if (hasBudget('gemini-generate') && !isApproachingLimit('gemini-generate')) {
        try {
            return await parsePdfWithGemini(buffer);
        } catch (err: any) {
            console.warn(`[Parser] Gemini PDF vision failed: ${err.message}. Trying Groq...`);
        }
    } else {
        console.log(`[Parser] Gemini budget low, skipping to Groq vision...`);
    }

    // Fallback: Groq vision
    return await parsePdfWithGroq(buffer);
}

async function parsePdfWithGemini(buffer: Buffer): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

    const tempPath = path.join(os.tmpdir(), `cortex-temp-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
    fs.writeFileSync(tempPath, buffer);

    try {
        console.log(`[Parser] Uploading ${(buffer.length / 1024 / 1024).toFixed(1)}MB PDF to Gemini File API...`);
        const uploadResult = await fileManager.uploadFile(tempPath, {
            mimeType: "application/pdf",
            displayName: "Document",
        });

        console.log(`[Parser] File uploaded to Gemini. Processing...`);
        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResult.file.mimeType,
                    fileUri: uploadResult.file.uri
                }
            },
            "Extract all the text from this PDF exactly as it appears. If there are images or diagrams, describe them. Maintain headings and structure."
        ]);

        fileManager.deleteFile(uploadResult.file.name).catch(e => console.warn("Failed to delete from Gemini server", e));
        recordCall('gemini-generate');

        const response = await result.response;
        return response.text();
    } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('429') || msg.includes('quota') || msg.includes('Quota')) {
            markProviderExhausted('gemini-generate');
        }
        throw err;
    } finally {
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
    }
}

/**
 * Groq vision fallback for PDF OCR.
 * Converts first pages to PNG screenshots and uses Groq's vision model.
 */
async function parsePdfWithGroq(buffer: Buffer): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not set for vision fallback');

    console.log(`[Parser] Using Groq vision for PDF OCR (rendering pages as screenshots)...`);
    
    try {
        const { PDFParse } = await import('pdf-parse');
        const uint8 = new Uint8Array(buffer);
        const parser = new PDFParse({ data: uint8 });
        
        // Render first 5 pages to screenshots
        const result = await parser.getScreenshot({
            first: 5,
            imageDataUrl: true,
            imageBuffer: false
        });

        if (result.pages.length === 0) {
            throw new Error("No pages rendered");
        }

        // Map pages to image_url items for Groq message
        const contentItems: any[] = result.pages.map(page => ({
            type: 'image_url',
            image_url: { url: page.dataUrl }
        }));

        contentItems.push({
            type: 'text',
            text: 'Extract all the text from this document exactly as it appears. Maintain headings, lists, and structure. If there are diagrams, describe them briefly.'
        });

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [
                    {
                        role: 'user',
                        content: contentItems
                    }
                ],
                temperature: 0.1,
                max_tokens: 8000,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq vision failed (${response.status}): ${errText.substring(0, 200)}`);
        }

        const data = await response.json();
        recordCall('groq-generate');
        const text = data.choices?.[0]?.message?.content || '';
        
        if (!text || text.trim().length < 20) {
            throw new Error('Groq vision returned insufficient text');
        }
        
        console.log(`[Parser] Groq vision OCR success: ${text.length} chars extracted`);
        return text;

    } catch (e: any) {
        console.error(`[Parser] Groq vision PDF render/OCR failed: ${e.message}`);
        throw new Error(`Groq vision PDF OCR failed: ${e.message}`);
    }
}

export async function parseDocx(buffer: Buffer): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ buffer: buffer });
        return result.value;
    } catch (e) {
        console.warn("[Parser] Mammoth failed, trying OfficeParser...", e);
        return new Promise((resolve, reject) => {
            // @ts-ignore
            officeParser.parseOffice(buffer, { outputErrorToConsole: false }, (data: string, err: Error) => {
                if (err) { reject(err); return; }
                resolve(data);
            });
        });
    }
}

export async function parsePptx(buffer: Buffer): Promise<string> {
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    console.log(`[Parser] Fast-parsing PPTX (${sizeMB}MB)...`);
    
    try {
        const zip = await JSZip.loadAsync(buffer);
        let fullText = "";

        // Get all slide files and notes files
        const files = Object.keys(zip.files);
        const slideFiles = files.filter(n => n.startsWith('ppt/slides/slide') && n.endsWith('.xml'));
        const notesFiles = files.filter(n => n.startsWith('ppt/notesSlides/notesSlide') && n.endsWith('.xml'));
        
        // Sort slides numerically
        slideFiles.sort((a, b) => parseInt(a.match(/\d+/)?.[0] || "0") - parseInt(b.match(/\d+/)?.[0] || "0"));

        for (const slideFile of slideFiles) {
            const content = await zip.files[slideFile].async('string');
            // Extract text from <a:t> nodes (handles attributes like xml:space)
            const matches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
            if (matches) {
                const slideText = matches.map(m => m.replace(/<a:t[^>]*>|<\/a:t>/g, '')).join(' ');
                fullText += `[Slide] ${slideText}\n`;
            }
        }

        // Also extract speaker notes if they exist
        for (const notesFile of notesFiles) {
            const content = await zip.files[notesFile].async('string');
            const matches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
            if (matches) {
                const notesText = matches.map(m => m.replace(/<a:t[^>]*>|<\/a:t>/g, '')).join(' ');
                fullText += `[Notes] ${notesText}\n`;
            }
        }

        if (!fullText || fullText.length < 50) {
            console.warn("[Parser] JSZip extraction yielded little text, falling back to officeParser...");
            return new Promise((resolve, reject) => {
                // @ts-ignore
                officeParser.parseOffice(buffer, { outputErrorToConsole: false }, (data: string, err: Error) => {
                    if (err) { resolve(data || ""); return; } // Don't crash if fallback fails but has partial data
                    resolve(data);
                });
            });
        }

        console.log(`[Parser] PPTX parsed: ${fullText.length} chars extracted`);
        return fullText;
    } catch (err) {
        console.error("[Parser] Fast PPTX parse failed, trying fallback:", err);
        return new Promise((resolve, reject) => {
            // @ts-ignore
            officeParser.parseOffice(buffer, { outputErrorToConsole: false }, (data: string, err: Error) => {
                if (err) { reject(new Error("Both PPTX parsers failed")); return; }
                resolve(data);
            });
        });
    }
}

export async function parseImage(buffer: Buffer, mimeType: string): Promise<string> {
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    console.log(`[Parser] Processing image (${sizeMB}MB, ${mimeType})...`);

    if (buffer.length > 20 * 1024 * 1024) {
        throw new Error(`Image too large (${sizeMB}MB). Maximum supported size is 20MB.`);
    }

    const base64 = buffer.toString('base64');
    const prompt = `This is a document or a textbook page. Please extract ALL text from this image exactly as it appears. 
    Maintain the structure (headings, lists, tables). 
    If there are diagrams, describe them briefly.
    Return ONLY the extracted text and descriptions.`;

    // Provider 1: Gemini
    if (hasBudget('gemini-generate') && !isApproachingLimit('gemini-generate')) {
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                const result = await model.generateContent([prompt, {
                    inlineData: { data: base64, mimeType }
                }]);
                const response = await result.response;
                const text = response.text();
                recordCall('gemini-generate');
                
                if (text && text.trim().length > 0) {
                    console.log(`[Parser] Image OCR (Gemini) success: ${text.length} chars`);
                    return text;
                }
                throw new Error('Gemini returned empty text');
            } catch (error: any) {
                const msg = error.message || '';
                if (msg.includes('429') && attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 3000;
                    console.warn(`[Parser] Gemini rate limited. Waiting ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                console.warn(`[Parser] Gemini image attempt ${attempt + 1} failed: ${msg}`);
                if (msg.includes('429') || msg.includes('quota') || msg.includes('Quota')) {
                    markProviderExhausted('gemini-generate');
                }
                break; // Fall through to Groq
            }
        }
    }

    // Provider 2: Groq vision
    console.log(`[Parser] Falling back to Groq vision for image OCR...`);
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
                            { type: 'text', text: prompt }
                        ]
                    }],
                    temperature: 0.1,
                    max_tokens: 4000,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                recordCall('groq-generate');
                const text = data.choices?.[0]?.message?.content || '';
                if (text && text.trim().length > 0) {
                    console.log(`[Parser] Image OCR (Groq) success: ${text.length} chars`);
                    return text;
                }
            } else {
                const errText = await response.text();
                console.warn(`[Parser] Groq image failed (${response.status}): ${errText.substring(0, 100)}`);
            }
        } catch (groqErr: any) {
            console.warn(`[Parser] Groq image failed: ${groqErr.message}`);
        }
    }

    // All providers failed
    console.error(`[Parser] All image OCR providers exhausted`);
    return `[Image: ${mimeType}, ${sizeMB}MB] — All AI vision providers exhausted. Document will be re-indexed when API quota resets.`;
}

export async function parseText(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
}
