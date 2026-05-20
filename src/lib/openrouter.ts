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

export const modelName = "google/gemini-2.0-flash-001"; // Primary OpenRouter model
// Good free/cheap options on OpenRouter:
// google/gemini-2.0-flash-001
// google/gemini-2.0-flash-exp:free
// meta-llama/llama-3-8b-instruct:free
// mistralai/mistral-7b-instruct:free
