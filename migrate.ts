import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        console.log("Adding processed_count column...");
        await db.execute(sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS processed_count INTEGER DEFAULT 0 NOT NULL;`);
        console.log("Success!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
