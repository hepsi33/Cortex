import postgres from 'postgres';
import 'dotenv/config';

async function patch() {
    const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });
    try {
        console.log("🛠️  Patching database...");
        await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS processed_count INTEGER DEFAULT 0 NOT NULL;`;
        console.log("✅ processed_count column added.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Patch failed:", err);
        process.exit(1);
    }
}
patch();
