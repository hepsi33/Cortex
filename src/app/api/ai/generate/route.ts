import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { openai } from "@/lib/openrouter";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

function extractVideoId(url: string) {
  const regex = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function cleanCaptionText(input: string): string {
  if (!input) return "";
  return input
    .replace(/\uFEFF/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTimedText(videoId: string) {
  try {
    const res = await fetch(`https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`);
    const text = await res.text();
    if (res.ok && text.includes("<text")) return cleanCaptionText(text);
  } catch { return null; }
  return null;
}

export async function POST(req: Request) {
  const t0 = Date.now();
  
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { videoUrl } = await req.json();
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });

    // Parallel fetching for speed with more robust youtubei.js
    let transcript = "";
    let videoTitle = "";
    let videoDescription = "";

    try {
      const { Innertube } = await import("youtubei.js");
      const yt = await Innertube.create();
      const info = await yt.getInfo(videoId);
      
      // Get basic metadata for fallback
      videoTitle = info.basic_info.title ?? "";
      videoDescription = info.basic_info.short_description ?? "";

      try {
        const transcriptData = await info.getTranscript();
        if (transcriptData?.transcript?.content?.body?.initial_segments) {
          transcript = transcriptData.transcript.content.body.initial_segments
            .map((s: any) => s.snippet?.text ?? "")
            .join(" ");
        }
      } catch (tErr) {
        console.warn("[Transcript] info.getTranscript() failed:", tErr);
      }
    } catch (err) {
      console.error("[Transcript] youtubei.js core failed, trying scrapers:", err);
      transcript = await Promise.any([
        YoutubeTranscript.fetchTranscript(videoId).then(items => items.map(i => i.text).join(" ")),
        fetchTimedText(videoId).then(text => { if (!text) throw new Error(); return text; }),
      ]).catch(() => "");
    }

    // Determine content for AI
    let aiInput = transcript;
    let isMetadataFallback = false;
    
    if (!transcript || transcript.length < 50) {
        if (videoTitle || videoDescription) {
            aiInput = `TITLE: ${videoTitle}\n\nDESCRIPTION: ${videoDescription}`;
            isMetadataFallback = true;
        } else {
            return NextResponse.json({ error: "Transcript unavailable for this video. Please try a video with closed captions enabled." }, { status: 400 });
        }
    }

    // AI Note Generation
    let notes = "";
    
    try {
      // Primary: Use Project's Native Gemini API (more likely to be configured)
      console.log(`[AI] Attempting summarization with Native Gemini...`);
      const { model: geminiModel } = await import("@/lib/gemini");
      const systemPrompt = "You are an expert tutor. Create concise, high-impact study notes. Use markdown with bold headers and bullet points.";
      const userPrompt = isMetadataFallback 
        ? `I couldn't get the transcript for this video. Here is the video info. Create a structured summary based on this:\n\n${aiInput}`
        : `Create detailed study notes for this transcript:\n\n${aiInput.slice(0, 30000)}`;

      const result = await geminiModel.generateContent([systemPrompt, userPrompt]);
      notes = result.response.text();
    } catch (geminiErr: any) {
      console.warn(`[AI] Native Gemini failed:`, geminiErr.message);
      
      // Fallback: OpenRouter failover loop
      const { modelName } = await import("@/lib/openrouter");
      const modelsToTry = [
        modelName || "google/gemini-flash-1.5-8b",
        "google/gemini-2.0-flash-001",
        "meta-llama/llama-3.1-8b-instruct:free"
      ];

      for (const model of modelsToTry) {
        try {
          console.log(`[AI] Attempting fallback with OpenRouter model: ${model}`);
          const completion = await openai.chat.completions.create({
            model: model,
            messages: [
              { role: "system", content: "You are an expert tutor. Create concise, high-impact study notes. Use markdown with bold headers and bullet points." },
              { role: "user", content: isMetadataFallback 
                  ? `I couldn't get the transcript for this video. Here is the video info. Create a structured summary based on this:\n\n${aiInput}`
                  : `Create detailed study notes for this transcript:\n\n${aiInput.slice(0, 20000)}` 
              },
            ],
            temperature: 0.3,
          });
          notes = completion?.choices?.[0]?.message?.content ?? "";
          if (notes) break;
        } catch (err: any) {
          console.warn(`[AI] Fallback model ${model} failed:`, err.message);
        }
      }
    }

    if (!notes) {
      console.warn("[AI] All APIs failed, attempting Local Intelligence fallback...");
      
      // Local Intelligence Fallback (Regex-based extraction)
      const sentences = aiInput.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
      const keywords = ["important", "key", "remember", "concept", "example", "result", "process", "system"];
      const insights = sentences.filter(s => keywords.some(k => s.toLowerCase().includes(k))).slice(0, 10);
      
      if (insights.length > 0) {
        notes = `# Local Insight Summary (API Offline)\n\n**Note: This summary was generated locally because your AI API keys are not configured.**\n\n` + 
                insights.map(s => `* ${s}.`).join("\n");
      } else {
        throw new Error("Invalid API Configuration. Please set your GEMINI_API_KEY or OPENROUTER_API_KEY in the .env file.");
      }
    }

    return NextResponse.json({
      notes,
      totalMs: Date.now() - t0,
      isLocal: true
    });

  } catch (e: any) {
    console.error("[Generate API Error]:", e);
    return NextResponse.json({ 
      error: e.message?.includes("API key") || e.message?.includes("Configuration") ? "API Configuration Required" : "Summarization failed",
      details: e.message 
    }, { status: 500 });
  }
}
