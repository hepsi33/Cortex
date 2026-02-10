import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { openai } from "@/lib/openrouter";
import { auth } from "@/lib/auth";
import ytdl from "@distube/ytdl-core";

// Function to extract video ID from various YouTube URL formats
function extractVideoId(url: string) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Helper to try fetching transcript from Invidious instances
async function fetchInvidiousTranscript(videoId: string) {
    const instances = [
        "https://inv.tux.pizza",
        "https://vid.puffyan.us",
        "https://invidious.projectsegfau.lt",
        "https://invidious.fdn.fr",
        "https://invidious.perennialte.ch",
        "https://yt.artemislena.eu",
        "https://invidious.drgns.net"
    ];

    for (const instance of instances) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout per instance

            const res = await fetch(`${instance}/api/v1/captions/${videoId}`, { signal: controller.signal });
            clearTimeout(timeout);

            if (res.ok) {
                const data = await res.json();
                if (data.captions && data.captions.length > 0) {
                    // Find English or first
                    const track = data.captions.find((c: any) => c.languageCode === 'en' || c.label.includes('English') || c.language === 'English') || data.captions[0];
                    const contentRes = await fetch(`${instance}${track.url}`);
                    if (contentRes.ok) {
                        return await contentRes.text(); // Returns VTT/XML
                    }
                }
            }
        } catch (e) {
            continue; // Try next instance
        }
    }
    return null;
}

export async function POST(req: Request) {
    try {
        // Authenticate user
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { videoUrl } = await req.json();

        if (!videoUrl) {
            return NextResponse.json({ error: "Video URL is required" }, { status: 400 });
        }

        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
        }

        let transcriptText = "";

        // STRATEGY 1: Standard youtube-transcript
        try {
            console.log("Strategy 1: youtube-transcript");
            const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
            transcriptText = transcriptItems.map(item => item.text).join(" ");

            if (!transcriptText || transcriptText.trim().length < 50) {
                throw new Error("Transcript is too short or empty");
            }
        } catch (error1) {
            console.error("Strategy 1 failed:", (error1 as any).message);

            // STRATEGY 2: Invidious Fallback (API)
            try {
                console.log("Strategy 2: Invidious API");
                const invidiousText = await fetchInvidiousTranscript(videoId);
                if (invidiousText) {
                    // Simple cleanup of VTT/XML tags if needed
                    transcriptText = invidiousText
                        .replace(/<[^>]+>/g, " ") // Remove XML/HTML tags
                        .replace(/WEBVTT/g, "")   // Remove VTT header
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/\s+/g, " ")     // Normalize whitespace
                        .trim();
                } else {
                    throw new Error("All Invidious instances failed");
                }
            } catch (error2) {
                console.error("Strategy 2 failed:", (error2 as any).message);

                // STRATEGY 3: ytdl-core (Auto-generated captions)
                try {
                    console.log("Strategy 3: ytdl-core");
                    const info = await ytdl.getInfo(videoId);
                    const tracks = info.player_response.captions?.playerCaptionsTracklistRenderer?.captionTracks;

                    if (tracks && tracks.length > 0) {
                        // Prefer English
                        const track = tracks.find((t: any) => t.languageCode === 'en' || t.languageCode === 'en-US') || tracks[0];
                        console.log(`Fetching caption track: ${track.name?.simpleText}`);

                        const res = await fetch(track.baseUrl);
                        if (res.ok) {
                            const xml = await res.text();
                            if (xml) {
                                // Simple XML to Text cleanup
                                transcriptText = xml.replace(/<[^>]+>/g, ' ')
                                    .replace(/&amp;/g, '&')
                                    .replace(/&quot;/g, '"')
                                    .replace(/&#39;/g, "'")
                                    .replace(/\s+/g, ' ')
                                    .trim();
                            }
                        }
                    }
                } catch (error3) {
                    console.error("Strategy 3 failed:", (error3 as any).message);
                }
            }
        }

        if (!transcriptText || transcriptText.trim().length < 50) {
            console.log("Strategies 1-3 failed. Trying Strategy 4: Metadata Fallback");
            try {
                const info = await ytdl.getBasicInfo(videoId);
                const metadata = {
                    title: info.videoDetails.title,
                    description: info.videoDetails.description, // Full description
                    author: info.videoDetails.author.name,
                    viewCount: info.videoDetails.viewCount,
                    category: info.videoDetails.category
                };

                console.log(`Using metadata for video: ${metadata.title}`);

                const prompt = `
                You are a video content analyzer. The user wants study notes, but no transcript is available.
                Use the following video metadata to provide a context-based analysis and summary.

                **Video Information:**
                - **Title:** ${metadata.title}
                - **Channel:** ${metadata.author}
                - **View Count:** ${metadata.viewCount}
                - **Category:** ${metadata.category}
                - **Description:** 
                ${metadata.description}

                **Instructions:**
                1. **Analyze:** Based on the title and description, infer the likely content, educational value, and key topics.
                2. **Summarize:** Provide a structured summary of what this video likely covers.
                3. **Key Concepts:** List 3-5 potential key concepts based on the description keywords.
                4. **Study Tips:** Suggest how to approach learning this topic.
                5. **Disclaimer:** Start with a clear note: "⚠️ **Note:** Transcripts were not available for this video. This analysis is based on the video title and description."

                Strictly follow this output format:
                ## ⚠️ Context-Based Analysis
                (Your disclaimer and inference about content type)

                ## 📌 Likely Topics & Summary
                (Summary based on description)

                ## 🔑 Potential Key Concepts
                - **Concept 1**
                - **Concept 2**
                
                ## 📝 Study Recommendations
                (Tips on how to verify/learn this info)
                `;

                console.log("Sending metadata request to OpenRouter...");
                const completion = await openai.chat.completions.create({
                    model: "google/gemini-2.0-flash-001",
                    messages: [
                        { role: "system", content: "You are an expert educational assistant." },
                        { role: "user", content: prompt }
                    ],
                });

                const notes = completion.choices[0].message.content || "No analysis generated.";
                console.log("Metadata analysis received.");

                return NextResponse.json({ notes });

            } catch (metaError) {
                console.error("Strategy 4 failed:", (metaError as any).message);
                return NextResponse.json({
                    error: "No transcript found and metadata passed insufficient context. Please try a different video."
                }, { status: 400 });
            }
        }

        console.log(`Transcript fetched. Length: ${transcriptText.length}`);

        // Generate study notes using Gemini
        try {
            const prompt = `
            You are an expert tutor. Create comprehensive study notes based on the following YouTube video transcript.

            Strictly follow this structure:
            ## 📌 Overview
            (A brief summary of the video's main topic)

            ## 🔑 Key Concepts
            (List the most important ideas discussed)
            - **Concept 1:** Explanation...
            - **Concept 2:** Explanation...

            ## 📝 Detailed Notes
            (Break down the content into logical sections with headings)

            ## 🧠 Quiz Issues
            (Generate 3 short quiz questions to test understanding)

            ---
            **Transcript:**
            ${transcriptText.substring(0, 25000)} 
            `;

            console.log("Sending request to OpenRouter...");

            const completion = await openai.chat.completions.create({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: "You are an expert tutor." },
                    { role: "user", content: prompt }
                ],
            });

            const notes = completion.choices[0].message.content || "No notes generated.";
            console.log("OpenRouter response received.");

            return NextResponse.json({ notes });
        } catch (error: any) {
            console.error("Gemini API Error:", error);
            // Handle block/quota errors specially
            if (error.message.includes('429')) {
                return NextResponse.json({ error: "AI Service busy. Please try again later." }, { status: 529 });
            }
            return NextResponse.json({ error: `AI Error: ${error.message}` }, { status: 500 });
        }

    } catch (error) {
        console.error("General API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
