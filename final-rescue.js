const { postgres } = require('postgres');
require('dotenv').config();

const sql = require('postgres')(process.env.DATABASE_URL, { ssl: 'require' });

async function finalRescue() {
  try {
    console.log('Resetting failed documents for the new Robust Parser...');
    const result = await sql`UPDATE documents SET status = 'pending' WHERE status = 'failed'`;
    console.log('✅ Documents Reset:', result.count);
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await sql.end();
  }
}

finalRescue();
