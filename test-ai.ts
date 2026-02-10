import "dotenv/config";

async function main() {
    const videoId = "dQw4w9WgXcQ";

    // List from api.invidious.io with high health
    const instances = [
        "https://inv.bp.projectsegfau.lt",
        "https://invidious.fdn.fr",
        "https://invidious.perennialte.ch",
        "https://invidious.drgns.net",
        "https://yt.artemislena.eu",
        "https://invidious.flokinet.to"
    ];

    for (const instance of instances) {
        console.log(`\nTesting ${instance}...`);
        const url = `${instance}/api/v1/captions/${videoId}`;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (res.ok) {
                const data = await res.json();
                console.log(`✅ ${instance} WORKED! Tracks: ${data.captions?.length}`);

                if (data.captions && data.captions.length > 0) {
                    const urlPath = data.captions[0].url; // e.g. /api/v1/captions/...
                    console.log(`Resource path: ${urlPath}`);

                    // Fetch the content to be sure
                    const contentUrl = instance + urlPath;
                    const contentRes = await fetch(contentUrl);
                    if (contentRes.ok) {
                        const content = await contentRes.text();
                        console.log(`Content gathered. Length: ${content.length}`);
                        // If success, print and exit
                        console.log(`\n!!! SUCCESS with ${instance} !!!`);
                        break;
                    }
                }
            } else {
                console.log(`❌ ${instance} returned ${res.status}`);
            }

        } catch (error) {
            console.error(`❌ ${instance} failed:`, (error as any).message);
        }
    }
}

main();
