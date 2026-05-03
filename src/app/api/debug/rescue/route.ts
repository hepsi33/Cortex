import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        // Basic protection: only let the user who owns the project (you) run this
        // or just let it run if you're in a hurry, but let's check for a secret param
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');

        if (secret !== 'rescue_me_2026') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('🚀 Starting PRODUCTION Database Rescue...');
        
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

        return NextResponse.json({ 
            success: true, 
            message: 'Production Database Rescued! Dimensions set to 768.',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Production Rescue failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
