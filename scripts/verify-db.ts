
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function run() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL missing");
        return;
    }

    console.log(`Testing connection to: ${new URL(url).hostname}`);

    try {
        const sql = neon(url);
        const result = await sql`SELECT version()`;
        console.log("SUCCESS: Connected to database!");
        console.log("Version:", result[0].version);
    } catch (e: any) {
        console.error("FAILED:", e.message);
        if (e.cause) console.error("Cause:", e.cause);
    }
}

run();
