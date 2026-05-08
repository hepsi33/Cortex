const { postgres } = require('postgres');
require('dotenv').config();

const sql = require('postgres')(process.env.DATABASE_URL, { ssl: 'require' });

async function rescue() {
  try {
    console.log('Step 1: Resizing vector column to 768...');
    // We drop and recreate the column to ensure no mismatched data exists
    await sql`ALTER TABLE embeddings DROP COLUMN IF EXISTS vector`;
    await sql`ALTER TABLE embeddings ADD COLUMN vector vector(768)`;
    
    console.log('Step 2: Resetting failed documents to pending...');
    const result = await sql`UPDATE documents SET status = 'pending' WHERE status = 'failed'`;
    
    console.log('✅ Rescue Complete! Reprocessing documents:', result.count);
  } catch (e) {
    console.error('❌ Error during rescue:', e.message);
  } finally {
    await sql.end();
  }
}

rescue();
