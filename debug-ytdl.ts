import "dotenv/config";
import ytdl from "@distube/ytdl-core";
import fs from "fs";

async function main() {
    const videoId = "yHk7Vavmc7Q";
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Debugging ytdl captions for ${url}...`);

    try {
        const info = await ytdl.getInfo(url);

        const playerResponse = info.player_response;
        const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (captions && captions.length > 0) {
            console.log(`✅ Found ${captions.length} caption tracks!`);
            captions.forEach((t: any) => {
                console.log(`- ${t.name?.simpleText} (${t.languageCode}) [${t.kind || 'manual'}]`);
            });

            // Try to fetch one
            const track = captions.find((t: any) => t.languageCode === 'en' || t.languageCode === 'en-US') || captions[0];
            console.log(`Fetching from: ${track.baseUrl}`);

            const res = await fetch(track.baseUrl);
            const xml = await res.text();

            console.log(`XML Length: ${xml.length}`);
            if (xml.length > 0) {
                const text = xml.replace(/<[^>]+>/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/\s+/g, ' ')
                    .trim();
                console.log(`Sample: ${text.substring(0, 100)}...`);
            } else {
                console.log("❌ XML body empty");
            }

        } else {
            console.log("❌ No captions found in player_response");
        }

    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main();
