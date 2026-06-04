const { Innertube } = require('youtubei.js');
async function test() {
    const yt = await Innertube.create();
    try {
        const info = await yt.getInfo('cU2x6q_IJcQ');
        const transcriptData = await info.getTranscript();
        console.log("Transcript found! Length:", JSON.stringify(transcriptData).length);
    } catch (e) {
        console.error("No transcript:", e.message);
    }
}
test();
