
import mammoth from 'mammoth';
import officeParser from 'officeparser';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini for Vision
// @ts-ignore
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Helper to get first working vision model
async function getVisionModel() {
    const candidates = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-vision"];
    for (const model of candidates) {
        try {
            return genAI.getGenerativeModel({ model: model });
        } catch (e) {
            continue;
        }
    }
    return genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Default
}

// We'll initialize lazily inside the function or just use a default for now and handle errors dynamically
const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Using Pro for better OCR

export async function parsePdf(buffer: Buffer): Promise<string> {
    try {
        // pdf-parse can have different export styles depending on environment
        const pdf: any = await import('pdf-parse');
        const pdfParse = pdf.default || pdf;
        
        if (typeof pdfParse !== 'function') {
            console.error("[Parser] pdf-parse is not a function:", pdfParse);
            throw new Error("PDF parser initialization failed");
        }
        
        const data = await pdfParse(buffer);
        return data.text;
    } catch (err: any) {
        console.error("[Parser] PDF Parse logic error:", err);
        throw err;
    }
}

export async function parseDocx(buffer: Buffer): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ buffer: buffer });
        return result.value;
    } catch (e) {
        console.warn("Mammoth failed, trying OfficeParser...", e);
        return new Promise((resolve, reject) => {
            // @ts-ignore
            officeParser.parseOffice(buffer, { outputErrorToConsole: false }, (data: string, err: Error) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
            });
        });
    }
}

export async function parsePptx(buffer: Buffer): Promise<string> {
    // officeparser callbacks to promise
    return new Promise((resolve, reject) => {
        // @ts-ignore
        officeParser.parseOffice(buffer, { outputErrorToConsole: false }, (data: string, err: Error) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        });
    });
}

export async function parseImage(buffer: Buffer, mimeType: string): Promise<string> {
    // Only gemini-2.0-flash seems available for this key, so we focus on retrying it
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
    If there are diagrams, describe them. 
    DO NOT just list the alphabet or numbers; read the actual content of the document.
    Return ONLY the extracted text and descriptions.`;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            const msg = error.message || '';
            lastError = error;

            if (msg.includes("429") && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
                console.warn(`Gemini 429 (Rate Limit). Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            break; // Don't retry non-429 errors blindly
        }
    }

    // GRACEFUL FALLBACK: Store base64 data so the image can be re-analyzed later via retry.
    const sizeKB = Math.round(buffer.length / 1024);
    const base64Data = buffer.toString('base64');
    console.warn(`Gemini Vision unavailable (${lastError?.message}). Storing image for later re-analysis (${sizeKB}KB, ${mimeType}).`);
    return `[IMAGE_PENDING_ANALYSIS]
mimeType: ${mimeType}
size: ${sizeKB}KB
data: ${base64Data}
[/IMAGE_PENDING_ANALYSIS]
AI vision analysis was unavailable at upload time due to API rate limits. Use the retry button to re-analyze when quota resets.`;
}

export async function parseText(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
}
