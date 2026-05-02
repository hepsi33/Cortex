import { db } from './src/lib/db';
import { documents } from './src/drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkStatus() {
    const indexingDocs = await db.query.documents.findMany({
        where: eq(documents.status, 'indexing')
    });
    
    console.log(`Found ${indexingDocs.length} documents currently indexing:`);
    indexingDocs.forEach(doc => {
        console.log(`- ${doc.name}: ${doc.processedCount}/${doc.chunkCount} (${Math.round((doc.processedCount / doc.chunkCount) * 100)}%)`);
    });
}
checkStatus().catch(console.error);
