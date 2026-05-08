const { postgres } = require('postgres');
require('dotenv').config();

const sql = require('postgres')(process.env.DATABASE_URL, { ssl: 'require' });

async function check() {
  try {
    const users = await sql`SELECT id, email, status FROM profiles`;
    console.log('Users found:', users);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.end();
  }
}

check();
