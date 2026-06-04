const fs = require('fs');
const html = fs.readFileSync('temp_yt.html', 'utf8');
const titleMatch = html.match(/<title>(.*?)<\/title>/i);
console.log("Title:", titleMatch ? titleMatch[1] : null);
