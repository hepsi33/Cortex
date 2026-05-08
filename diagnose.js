const { postgres } = require('postgres');
require('dotenv').config();

const sql = require('postgres')(process.env.DATABASE_URL, { ssl: 'require' });

async function check() {
  try {
    console.log('Testing DB connection...');
    const result = await sql`SELECT 1 as connected`;
    console.log('✅ Connection OK:', result);

    console.log('Testing documents query...');
    const docs = await sql`SELECT id, name FROM documents LIMIT 1`;
    console.log('✅ Documents table OK');

    console.log('Checking profiles table...');
    const profiles = await sql`SELECT id, name FROM profiles LIMIT 1`;
    console.log('✅ Profiles table OK');

  } catch (e) {
    console.error('❌ DB Error:', e.message);
  } finally {
    await sql.end();
  }
}

check();
