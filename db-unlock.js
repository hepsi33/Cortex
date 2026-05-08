const { postgres } = require('postgres');
require('dotenv').config();

const sql = require('postgres')(process.env.DATABASE_URL, { ssl: 'require' });

async function approve() {
  try {
    console.log('Unlocking all accounts...');
    const result = await sql`UPDATE profiles SET status = 'approved' WHERE status = 'pending'`;
    console.log('✅ Success! Approved users:', result.count);
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await sql.end();
  }
}

approve();
