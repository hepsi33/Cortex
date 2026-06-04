import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { openai } from "@/lib/openrouter";
import { auth } from "@/lib/auth";
import { extractVideoId, resolveVideoId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

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
    const rawVideoId = extractVideoId(videoUrl);
    if (!rawVideoId) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    const videoId = await resolveVideoId(rawVideoId);

    let transcript = "";
    let videoTitle = "";
    let videoDescription = "";
    let videoChapters: any[] = [];

    try {
      const { Innertube } = await import("youtubei.js");
      const yt = await Innertube.create();
      const info = await yt.getInfo(videoId);
      
      // Get deep metadata for fallback
      videoTitle = info.basic_info.title ?? "";
      videoDescription = info.basic_info.short_description ?? "";
      
      // Attempt to extract chapters if available
      try {
        const primaryInfo = info.primary_info;
        const secondaryInfo = info.secondary_info;
        // @ts-ignore
        videoChapters = info.chapters ?? [];
      } catch (cErr) {
        console.warn("[Chapters] Extraction failed:", cErr);
      }

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
    
    if (!transcript || transcript.length < 100) {
        console.log(`[AI] Deep-diving into metadata for ${videoId}...`);
        
        // If we have absolutely nothing, try one last check on the title
        if (!videoTitle) videoTitle = "Unknown YouTube Video";

        const chaptersText = videoChapters?.length 
            ? `\n\nCHAPTERS:\n${videoChapters.map(c => `- ${c.title} (${c.time_range.start})`).join("\n")}`
            : "";
        
        aiInput = `TITLE: ${videoTitle}\n\nDESCRIPTION: ${videoDescription}${chaptersText}`;
        isMetadataFallback = true;
    }

    if (!transcript && !videoDescription && videoTitle === "Unknown YouTube Video") {
        return NextResponse.json({ error: "Could not extract any content from this video. It might be private or restricted." }, { status: 400 });
    }

    // AI Note Generation
    let notes = "";
    let noteSource: 'gemini' | 'openrouter' | 'local' = 'local';
    
    try {
      // Primary: Use Project's Native Gemini API
      console.log(`[AI] Generating study notes...`);
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const systemPrompt = "You are an expert tutor. Create concise, high-impact study notes. Use markdown with bold headers and bullet points. IMPORTANT: RETURN ONLY THE NOTES. NO CONVERSATIONAL FILLER. NO INTRODUCTIONS. NO 'OKAY' OR 'HERE IS THE SUMMARY'. START IMMEDIATELY WITH THE CONTENT.";
      const userPrompt = isMetadataFallback 
        ? `[EMERGENCY METADATA FALLBACK]
           I was unable to get the transcript. You MUST create a high-level summary based ONLY on this title and description. 
           Do NOT say you need more info. Do NOT say you can't do it. Just provide a conceptual overview of what this video is likely about based on these details:
           
           Video Title: ${videoTitle}
           Description: ${videoDescription}`
        : `Create detailed study notes for this transcript:\n\n${aiInput.slice(0, 30000)}`;

      const result = await model.generateContent([systemPrompt, userPrompt]);
      let finalNotes = result.response.text();
      
      // Post-process to remove common AI intro nonsense if it still appears
      finalNotes = finalNotes.replace(/^(Okay|Sure|Here is|Based on|I will|Since I cannot|Please note).*?\n/gi, "").trim();
      notes = finalNotes;
      noteSource = 'gemini';
    } catch (geminiErr: any) {
      console.warn(`[AI] Native Gemini failed:`, geminiErr.message);
      
      // Fallback: OpenRouter failover loop
      const { modelName } = await import("@/lib/openrouter");
      const modelsToTry = [
        modelName || "google/gemini-2.0-flash-001",
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3-8b-instruct:free"
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
          if (notes) {
            noteSource = 'openrouter';
            break;
          }
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
      source: noteSource,
      isLocal: noteSource === 'local'
    });

  } catch (e: any) {
    console.error("[Generate API Error]:", e);
    return NextResponse.json({ 
      error: e.message?.includes("API key") || e.message?.includes("Configuration") ? "API Configuration Required" : "Summarization failed",
      details: e.message 
    }, { status: 500 });
  }
}
