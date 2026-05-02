import 'dotenv/config';
import { db } from './src/lib/db';
import { documents } from './src/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

async function rescue() {
    console.log("Checking for stuck documents (100% progress but still 'indexing')...");
    const stuckDocs = await db.update(documents)
        .set({ status: 'completed' })
        .where(
            and(
                eq(documents.status, 'indexing'),
                sql`${documents.processedCount} >= ${documents.chunkCount}`,
                sql`${documents.chunkCount} > 0`
            )
        )
        .returning();
    
    if (stuckDocs.length > 0) {
        console.log(`✅ Rescued ${stuckDocs.length} documents:`);
        stuckDocs.forEach(d => console.log(`- ${d.name}`));
    } else {
        console.log("No stuck documents found.");
    }
    process.exit(0);
}
rescue().catch(console.error);
