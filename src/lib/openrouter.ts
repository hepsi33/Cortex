import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY;

export const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Role-Based Dashboard",
    },
});

export const modelName = "google/gemini-flash-1.5-8b"; // Or "mistralai/mistral-7b-instruct:free" or "google/gemma-7b-it:free"
// Good free/cheap options on OpenRouter:
// google/gemini-flash-1.5-8b (very cheap/free often)
// meta-llama/llama-3-8b-instruct:free
// mistralai/mistral-7b-instruct:free
