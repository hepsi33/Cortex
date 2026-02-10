import "dotenv/config";

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Listing models...");

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach((m: any) => {
                if (m.supportedGenerationMethods?.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.error("No models found or error:", data);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
