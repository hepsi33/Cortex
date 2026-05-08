const { postgres } = require('postgres');
require('dotenv').config();

const sql = require('postgres')(process.env.DATABASE_URL, { ssl: 'require' });

async function fixIndex() {
  try {
    console.log('Step 1: Recreating HNSW Index for 768 dimensions...');
    // Drop the old index if it exists and recreate it for the new dimension size
    await sql`DROP INDEX IF EXISTS embeddings_vector_idx`;
    await sql`CREATE INDEX ON embeddings USING hnsw (vector vector_cosine_ops)`;
    
    console.log('Step 2: Resetting failed documents for final retry...');
    await sql`UPDATE documents SET status = 'pending' WHERE status = 'failed'`;
    
    console.log('✅ Index Recreated and Documents Reset!');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await sql.end();
  }
}

fixIndex();
