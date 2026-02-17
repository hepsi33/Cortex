
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function listModels() {
    console.log("=== Listing Available Gemini Models ===");

    if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is missing");
        return;
    }

    // The Node SDK doesn't always expose listModels nicely in the main class in older versions, 
    // but the generic API does. Let's try to access the model list if possible or just test common names.
    // Actually, we can use the `listModels` method if it exists on the client or manager.
    // But since I'm not sure of the exact SDK version capabilities for listing (it varies),
    // I will test a known list of vision candidates.

    const candidates = [
        "gemini-2.0-flash-exp", // Sometimes it's -exp
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro-001",
        "gemini-1.0-pro-vision-001",
        "gemini-pro"
    ];

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    for (const modelName of candidates) {
        process.stdout.write(`Testing ${modelName}... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            // For vision capability test, we usually need an image, but we can verify text-generation 
            // as a proxy for "model exists and I can call it".
            const result = await model.generateContent("Test");
            console.log("OK");
        } catch (e: any) {
            let msg = e.message;
            if (msg.includes("404")) msg = "NOT FOUND";
            else if (msg.includes("429")) msg = "RATE LIMITED";
            else if (msg.includes("403")) msg = "FORBIDDEN";
            console.log(`FAILED (${msg})`);
        }
    }
}

listModels();
