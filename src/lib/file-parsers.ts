import mammoth from 'mammoth';
import officeParser from 'officeparser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import JSZip from 'jszip';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function parsePdf(buffer: Buffer): Promise<string> {
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    console.log(`[Parser] Parsing PDF (${sizeMB}MB)...`);

    try {
        const { PDFParse } = await import('pdf-parse');
        
        const uint8 = new Uint8Array(buffer);
        const parser = new PDFParse(uint8);
        const result = await parser.getText();
        let text = result.text;
        
        // Detect 'page numbers only' or empty content
        const textWithoutMarkers = text.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();
        const looksLikePageNumbersOnly = textWithoutMarkers.length < 200 && text.includes('--');

        if (!text || text.trim().length < 50 || looksLikePageNumbersOnly) {
            console.log(`[Parser] PDF text is sparse (${text?.length || 0} chars) or malformed. Using Gemini Vision fallback...`);
            try {
                text = await parsePdfWithGemini(buffer);
                console.log(`[Parser] Gemini Vision success: ${text.length} chars extracted`);
            } catch (geminiErr: any) {
                console.error(`[Parser] Gemini PDF fallback failed:`, geminiErr.message);
                if (!text || text.trim().length < 10) throw geminiErr;
                // If we have some text (even if it's just page numbers), return it if Gemini fails
            }
        }

        console.log(`[Parser] PDF parsed: ${text.length} chars extracted`);
        return text;
    } catch (err: any) {
        console.error(`[Parser] PDF parse error:`, err.message);
        throw err;
    }
}

async function parsePdfWithGemini(buffer: Buffer): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // For very large PDFs, we might need to limit the size to avoid payload limits
    // but 1.5 Flash handles up to 200MB. base64 adds ~33% overhead.
    if (buffer.length > 50 * 1024 * 1024) {
        console.warn("[Parser] PDF is very large for Gemini fallback. Using first 20MB.");
        buffer = buffer.subarray(0, 20 * 1024 * 1024);
    }

    const result = await model.generateContent([
        {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType: "application/pdf"
            }
        },
        "Extract all the text from this PDF exactly as it appears. If there are images or diagrams, describe them. Maintain headings and structure."
    ]);

    const response = await result.response;
    return response.text();
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

    const modelName = "gemini-2.0-flash";
    const maxRetries = 3;

    const imagePart = {
        inlineData: {
            data: buffer.toString('base64'),
            mimeType: mimeType
        },
    };
    const prompt = `This is a document or a textbook page. Please extract ALL text from this image exactly as it appears. 
    Maintain the structure (headings, lists, tables). 
    If there are diagrams, describe them briefly.
    Return ONLY the extracted text and descriptions.`;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();
            
            if (text && text.trim().length > 0) {
                console.log(`[Parser] Image OCR success: ${text.length} chars extracted`);
                return text;
            }
            throw new Error("Gemini returned empty text for image");
        } catch (error: any) {
            const msg = error.message || '';
            lastError = error;

            if (msg.includes("429") && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 3000;
                console.warn(`[Parser] Rate limited. Waiting ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            if (attempt < maxRetries) {
                console.warn(`[Parser] Image attempt ${attempt + 1} failed: ${msg}. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
        }
    }

    console.error(`[Parser] All image OCR attempts failed: ${lastError?.message}`);
    return `[Image: ${mimeType}, ${sizeMB}MB] — AI vision analysis failed. Error: ${lastError?.message || 'Unknown'}. Please re-upload when API quota resets.`;
}

export async function parseText(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
}
