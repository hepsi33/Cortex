const { postgres } = require('postgres');
require('dotenv').config();

const sql = require('postgres')(process.env.DATABASE_URL, { ssl: 'require' });

async function diagnose() {
  try {
    const failedDocs = await sql`SELECT id, name, status, file_type FROM documents WHERE status = 'failed' LIMIT 5`;
    console.log('Failed Documents:', failedDocs);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.end();
  }
}

diagnose();
