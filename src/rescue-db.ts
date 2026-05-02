import 'dotenv/config';
import postgres from 'postgres';

async function rescue() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("No DATABASE_URL found");
        return;
    }
    
    console.log("🚀 Starting Database Rescue...");
    const sql = postgres(url, { ssl: 'require' });
    
    try {
        console.log("📦 Creating 'profiles' table...");
        await sql`
            CREATE TABLE IF NOT EXISTS profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            );
        `;
        console.log("✅ 'profiles' table created successfully!");

        console.log("🔗 Updating foreign keys in other tables...");
        
        // Update workspaces
        await sql`ALTER TABLE IF EXISTS workspaces DROP CONSTRAINT IF EXISTS workspaces_user_id_users_id_fk;`.catch(() => {});
        await sql`ALTER TABLE IF EXISTS workspaces ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;`.catch(() => {});
        
        // Update documents
        await sql`ALTER TABLE IF EXISTS documents DROP CONSTRAINT IF EXISTS documents_user_id_users_id_fk;`.catch(() => {});
        await sql`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;`.catch(() => {});

        // Update chats
        await sql`ALTER TABLE IF EXISTS chats DROP CONSTRAINT IF EXISTS chats_user_id_users_id_fk;`.catch(() => {});
        await sql`ALTER TABLE IF EXISTS chats ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;`.catch(() => {});

        console.log("🎉 Database Rescue Complete! You can now use the app.");
        
    } catch (err) {
        console.error("❌ Rescue Failed:", err);
    } finally {
        await sql.end();
    }
}

rescue();
