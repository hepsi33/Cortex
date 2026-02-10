import "dotenv/config";
import { openai } from "./src/lib/openrouter";

async function main() {
    console.log("Testing OpenRouter API...");

    try {
        const completion = await openai.chat.completions.create({
            // model: "google/gemini-2.0-flash-lite-preview-02-05:free", 
            model: "google/gemini-2.0-flash-001",
            messages: [
                { role: "user", content: "Say hello from OpenRouter!" }
            ],
        });

        console.log("✅ Response:", completion.choices[0].message.content);
    } catch (error: any) {
        console.error("❌ OpenRouter Error:", error);
    }
}

main();
