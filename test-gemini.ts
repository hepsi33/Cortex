import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function main() {
    console.log("Testing Gemini API...");
    const apiKey = process.env.GEMINI_API_KEY!;

    if (!apiKey) {
        console.error("❌ No API key found");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Use the available model name
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = "Explain quantum physics in 10 words.";
        console.log(`Prompt: "${prompt}"`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log(`\n✅ Gemini Response:\n${text}`);
    } catch (error: any) {
        console.error("\n❌ Gemini Error:", error.message);
    }
}

main();
