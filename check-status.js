const { postgres } = require('postgres');
require('dotenv').config();

const sql = require('postgres')(process.env.DATABASE_URL, { ssl: 'require' });

async function checkStatus() {
  try {
    const status = await sql`SELECT status, count(*) FROM documents GROUP BY status`;
    console.log('Document Status Count:', status);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.end();
  }
}

checkStatus();
