import mammoth from 'mammoth';
import officeParser from 'officeparser';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function parsePdf(buffer: Buffer): Promise<string> {
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    console.log(`[Parser] Parsing PDF (${sizeMB}MB)...`);

    try {
        const { PDFParse } = await import('pdf-parse');
        
        // pdf-parse v2 requires Uint8Array, not Buffer
        const uint8 = new Uint8Array(buffer);
        const parser = new PDFParse(uint8);
        await parser.load();
        const text = await parser.getText();
        
        if (!text || text.trim().length < 10) {
            throw new Error(`PDF parsed but content too short (${text?.length || 0} chars). May be image-only.`);
        }

        console.log(`[Parser] PDF parsed: ${text.length} chars`);
        return text;
    } catch (err: any) {
        console.error(`[Parser] PDF parse error:`, err.message);
        throw err;
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
    return new Promise((resolve, reject) => {
        // @ts-ignore
        officeParser.parseOffice(buffer, { outputErrorToConsole: false }, (data: string, err: Error) => {
            if (err) { reject(err); return; }
            resolve(data);
        });
    });
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
