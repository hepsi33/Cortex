import 'dotenv/config';
import { db } from './lib/db';
import { sql } from 'drizzle-orm';

async function rescue() {
    console.log('🚀 Starting Database Rescue...');
    
    try {
        // 1. Drop existing embeddings table to reset dimensions correctly
        console.log('🔄 Dropping old embeddings table...');
        await db.execute(sql`DROP TABLE IF EXISTS embeddings CASCADE;`);
        
        // 2. Re-create the table with correct 768 dimensions
        console.log('🏗️ Re-creating embeddings table with 768 dimensions...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "embeddings" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
                "content" text NOT NULL,
                "metadata" jsonb,
                "vector" vector(768)
            );
        `);
        
        // 3. Create HNSW index for fast search
        console.log('⚡ Creating HNSW vector index...');
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS "embeddings_vector_idx" ON "embeddings" 
            USING hnsw ("vector" vector_cosine_ops);
        `);

        console.log('✅ Database Rescue Complete! Vector dimensions are now 768.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Rescue failed:', error);
        process.exit(1);
    }
}

rescue();
