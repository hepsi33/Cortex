import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import ytdl from "@distube/ytdl-core";
import { openai } from "@/lib/openrouter";
import { auth } from "@/lib/auth";

/**
 * Route goals:
 * - Better tracing (each strategy logs a structured trace)
 * - More resilient transcript fetching (adds YouTube timedtext)
 * - Cleaner/safer metadata extraction
 * - Returns a debug trace in dev (or when x-debug: 1 header is present)
 *
 * Notes:
 * - In production, avoid returning raw errors to clients unless you want that.
 */

type TraceStep = {
  at: string;
  step: string;
  ok: boolean;
  ms?: number;
  details?: any;
};

const isDev = process.env.NODE_ENV !== "production";

function nowIso() {
  return new Date().toISOString();
}

function safeString(v: unknown, max = 5000): string {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function extractVideoId(url: string) {
  // Supports: youtube.com/watch?v=, youtu.be/, /shorts/, /embed/
  const regex = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function cleanCaptionText(input: string): string {
  if (!input) return "";
  return input
    .replace(/\uFEFF/g, " ")
    .replace(/<[^>]+>/g, " ") // XML/HTML tags
    .replace(/^WEBVTT[\s\S]*?\n\n/i, "") // VTT header
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithTimeout(url: string, opts: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 8000, ...rest } = opts;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Strategy: YouTube timedtext endpoint.
 * Works for many videos where other libs fail.
 */
async function fetchTimedText(videoId: string) {
  const headers = {
    // Some hosts are picky; this helps.
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const urls = [
    // manual captions (if available)
    `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`,
    // auto-generated captions
    `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&kind=asr`,
  ];

  for (const url of urls) {
    const res = await fetchWithTimeout(url, { headers, timeoutMs: 8000 });
    const text = await res.text();
    if (res.ok && text && text.includes("<text")) {
      return cleanCaptionText(text);
    }
  }

  return null;
}

/**
 * Strategy: Invidious caption listing → download selected track.
 */
async function fetchInvidiousTranscript(videoId: string) {
  const instances = [
    "https://inv.tux.pizza",
    "https://vid.puffyan.us",
    "https://invidious.projectsegfau.lt",
    "https://invidious.fdn.fr",
    "https://invidious.perennialte.ch",
    "https://yt.artemislena.eu",
    "https://invidious.drgns.net",
  ];

  for (const instance of instances) {
    try {
      const listUrl = `${instance}/api/v1/captions/${videoId}`;
      const listRes = await fetchWithTimeout(listUrl, { timeoutMs: 6000 });
      if (!listRes.ok) continue;

      const data = await listRes.json();
      const captions = data?.captions;
      if (!Array.isArray(captions) || captions.length === 0) continue;

      const track =
        captions.find((c: any) => c?.languageCode === "en" || c?.label?.includes("English") || c?.language === "English") ||
        captions[0];

      if (!track?.url) continue;

      const captionUrl = String(track.url).startsWith("http") ? String(track.url) : `${instance}${track.url}`;
      const capRes = await fetchWithTimeout(captionUrl, { timeoutMs: 8000 });
      if (!capRes.ok) continue;

      const body = await capRes.text();
      const cleaned = cleanCaptionText(body);
      if (cleaned && cleaned.length > 50) return cleaned;
    } catch {
      // ignore and try next instance
      continue;
    }
  }

  return null;
}

function summarizeError(e: any) {
  return {
    message: e?.message ?? String(e),
    name: e?.name,
    code: e?.code,
    status: e?.status,
    stack: isDev ? e?.stack : undefined,
  };
}

function debugEnabled(req: Request) {
  // Allow debug mode by header or query param
  const h = req.headers.get("x-debug");
  const url = new URL(req.url);
  return isDev || h === "1" || url.searchParams.get("debug") === "1";
}

export async function POST(req: Request) {
  const trace: TraceStep[] = [];
  const t0 = Date.now();

  const push = (step: string, ok: boolean, startedAt: number, details?: any) => {
    trace.push({
      at: nowIso(),
      step,
      ok,
      ms: Date.now() - startedAt,
      details,
    });
  };

  try {
    // 0) Auth
    {
      const st = Date.now();
      const session = await auth();
      if (!session?.user) {
        push("auth", false, st, { reason: "Unauthorized" });
        return NextResponse.json({ error: "Unauthorized", trace: debugEnabled(req) ? trace : undefined }, { status: 401 });
      }
      push("auth", true, st, { userId: (session.user as any)?.id ?? "(unknown)" });
    }

    // 1) Input parsing
    const stInput = Date.now();
    const body = await req.json().catch((e) => {
      throw new Error(`Invalid JSON body: ${e?.message ?? e}`);
    });
    const videoUrl = body?.videoUrl;
    if (!videoUrl || typeof videoUrl !== "string") {
      push("input", false, stInput, { reason: "videoUrl missing" });
      return NextResponse.json({ error: "Video URL is required", trace: debugEnabled(req) ? trace : undefined }, { status: 400 });
    }
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      push("input", false, stInput, { reason: "Invalid YouTube URL", videoUrl });
      return NextResponse.json({ error: "Invalid YouTube URL", trace: debugEnabled(req) ? trace : undefined }, { status: 400 });
    }
    push("input", true, stInput, { videoId, videoUrl });

    let transcriptText = "";

    // 2) Strategy 1: youtube-transcript
    {
      const st = Date.now();
      try {
        const items = await YoutubeTranscript.fetchTranscript(videoId);
        const text = items?.map((i) => i.text).join(" ") ?? "";
        transcriptText = cleanCaptionText(text);
        const ok = transcriptText.length >= 50;
        push("strategy1/youtube-transcript", ok, st, { len: transcriptText.length });
      } catch (e: any) {
        push("strategy1/youtube-transcript", false, st, summarizeError(e));
      }
    }

    // 3) Strategy 1b: YouTube timedtext
    if (transcriptText.length < 50) {
      const st = Date.now();
      try {
        const text = await fetchTimedText(videoId);
        transcriptText = cleanCaptionText(text ?? "");
        const ok = transcriptText.length >= 50;
        push("strategy1b/timedtext", ok, st, { len: transcriptText.length });
      } catch (e: any) {
        push("strategy1b/timedtext", false, st, summarizeError(e));
      }
    }

    // 4) Strategy 2: Invidious
    if (transcriptText.length < 50) {
      const st = Date.now();
      try {
        const text = await fetchInvidiousTranscript(videoId);
        transcriptText = cleanCaptionText(text ?? "");
        const ok = transcriptText.length >= 50;
        push("strategy2/invidious", ok, st, { len: transcriptText.length });
      } catch (e: any) {
        push("strategy2/invidious", false, st, summarizeError(e));
      }
    }

    // 5) Strategy 3: ytdl-core captions track
    if (transcriptText.length < 50) {
      const st = Date.now();
      try {
        // Optional: cookie-based agent for restricted videos
        // Set YT_COOKIES env var to cookie lines if you need it.
        const cookies = process.env.YT_COOKIES;
        const agent = cookies ? ytdl.createAgent(cookies.split("\n").filter(Boolean)) : undefined;

        const info = await ytdl.getInfo(videoId, agent ? { agent } : undefined);
        const tracks = (info as any)?.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (!Array.isArray(tracks) || tracks.length === 0) {
          push("strategy3/ytdl-captions", false, st, { reason: "No captionTracks" });
        } else {
          const preferred = tracks.find((t: any) => t?.languageCode === "en" || t?.languageCode === "en-US") ?? tracks[0];
          const baseUrl = preferred?.baseUrl;
          if (!baseUrl) {
            push("strategy3/ytdl-captions", false, st, { reason: "No baseUrl" });
          } else {
            const res = await fetchWithTimeout(baseUrl, { timeoutMs: 12000 });
            const xml = await res.text();
            transcriptText = cleanCaptionText(xml);
            const ok = res.ok && transcriptText.length >= 50;
            push("strategy3/ytdl-captions", ok, st, { httpOk: res.ok, len: transcriptText.length });
          }
        }
      } catch (e: any) {
        push("strategy3/ytdl-captions", false, st, summarizeError(e));
      }
    }

    // 6) If still no transcript, do metadata fallback
    if (transcriptText.length < 50) {
      const st = Date.now();
      try {
        const cookies = process.env.YT_COOKIES;
        const agent = cookies ? ytdl.createAgent(cookies.split("\n").filter(Boolean)) : undefined;

        const info = await ytdl.getBasicInfo(videoId, agent ? { agent } : undefined);
        const vd = info?.videoDetails as any;

        const metadata = {
          title: vd?.title ?? "(unknown title)",
          description: vd?.description ?? vd?.shortDescription ?? "",
          author: vd?.author?.name ?? vd?.ownerChannelName ?? vd?.author ?? "Unknown",
          viewCount: vd?.viewCount ?? "0",
          category: vd?.category ?? "Unknown",
          lengthSeconds: vd?.lengthSeconds ?? "",
          keywords: Array.isArray(vd?.keywords) ? vd.keywords.slice(0, 20) : [],
        };

        push("strategy4/metadata-fetch", true, st, {
          title: metadata.title,
          descLen: metadata.description.length,
          author: metadata.author,
        });

        // If description is empty, we still can give notes — but warn clearly.
        const prompt = `
⚠️ NOTE: No transcript was available for this video. The notes below are inferred from metadata and may miss details.

Video metadata:
- Title: ${metadata.title}
- Channel: ${metadata.author}
- Category: ${metadata.category}
- View count: ${metadata.viewCount}
- Length (seconds): ${metadata.lengthSeconds}
- Keywords: ${metadata.keywords.join(", ")}
- Description:\n${metadata.description}

Task:
Create useful study notes anyway.
Strictly follow this structure:
## 📌 Overview
## 🔑 Likely Key Points
- Point 1
- Point 2
## 📝 Structured Notes
## ✅ What to verify while watching
## 🧠 Quick Quiz (3 questions)
`;

        const stAi = Date.now();
        const completion = await openai.chat.completions.create({
          model: "google/gemini-2.0-flash-001",
          messages: [
            { role: "system", content: "You are an expert educational assistant." },
            { role: "user", content: prompt },
          ],
        });

        const notes = completion.choices?.[0]?.message?.content ?? "No analysis generated.";
        push("strategy4/ai", true, stAi, { outLen: notes.length });

        return NextResponse.json(
          {
            notes,
            source: "metadata",
            trace: debugEnabled(req) ? trace : undefined,
            totalMs: Date.now() - t0,
          },
          { status: 200 }
        );
      } catch (e: any) {
        push("strategy4/metadata-fallback", false, st, summarizeError(e));

        // IMPORTANT: This returns the REAL reason now.
        return NextResponse.json(
          {
            error: "No transcript found, and metadata fallback failed.",
            details: debugEnabled(req) ? summarizeError(e) : undefined,
            trace: debugEnabled(req) ? trace : undefined,
            totalMs: Date.now() - t0,
          },
          { status: 400 }
        );
      }
    }

    // 7) Transcript-based notes
    {
      const stAi = Date.now();
      const clipped = transcriptText.slice(0, 25000);

      const prompt = `
You are an expert tutor. Create comprehensive study notes based on the following YouTube video transcript.

Strictly follow this structure:
## 📌 Overview
## 🔑 Key Concepts
- **Concept 1:** ...
- **Concept 2:** ...
## 📝 Detailed Notes
## 🧠 Quick Quiz (3 questions)

---
Transcript:\n${clipped}
`;

      try {
        const completion = await openai.chat.completions.create({
          model: "google/gemini-2.0-flash-001",
          messages: [
            { role: "system", content: "You are an expert tutor." },
            { role: "user", content: prompt },
          ],
        });

        const notes = completion.choices?.[0]?.message?.content ?? "No notes generated.";
        push("ai/transcript-notes", true, stAi, { outLen: notes.length, transcriptLen: transcriptText.length });

        return NextResponse.json(
          {
            notes,
            source: "transcript",
            transcriptLen: transcriptText.length,
            trace: debugEnabled(req) ? trace : undefined,
            totalMs: Date.now() - t0,
          },
          { status: 200 }
        );
      } catch (e: any) {
        push("ai/transcript-notes", false, stAi, summarizeError(e));

        // Handle quota/busy
        const msg = String(e?.message ?? e);
        if (msg.includes("429")) {
          return NextResponse.json({ error: "AI Service busy. Please try again later.", trace: debugEnabled(req) ? trace : undefined }, { status: 529 });
        }

        return NextResponse.json(
          {
            error: `AI Error: ${msg}`,
            trace: debugEnabled(req) ? trace : undefined,
            totalMs: Date.now() - t0,
          },
          { status: 500 }
        );
      }
    }
  } catch (e: any) {
    trace.push({ at: nowIso(), step: "fatal", ok: false, details: summarizeError(e) });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: debugEnabled(req) ? summarizeError(e) : undefined,
        trace: debugEnabled(req) ? trace : undefined,
      },
      { status: 500 }
    );
  }
}
