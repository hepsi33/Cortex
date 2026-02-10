import "dotenv/config";
import { YoutubeTranscript } from "youtube-transcript";

async function main() {
    const videoId = "yHk7Vavmc7Q";
    console.log(`Debugging transcript list for ${videoId}...`);

    try {
        // Fetch LIST of transcripts
        const transcriptList = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        console.log(`Direct Fetch (en): ${transcriptList.length} items`);

        // Try to see if there are other languages or tracks
        // The library doesn't expose a 'list' method easily without hacking, 
        // but let's try calling it without lang to see if it defaults better.

        console.log("Fetching default...");
        const defaultTranscript = await YoutubeTranscript.fetchTranscript(videoId);
        console.log(`Default Fetch: ${defaultTranscript.length} items`);

    } catch (error: any) {
        console.log(`Transcript Error: ${error.message}`);
        if (error.message.includes("Captions are disabled")) {
            console.log("Library says: Captions are disabled");
        }
    }
}

main();
