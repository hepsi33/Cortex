import "dotenv/config";
import postgres from "postgres";

async function main() {
    const sql = postgres(process.env.DATABASE_URL!);
    
    console.log("Fetching policies for documents table...");
    
    const policies = await sql`
        SELECT policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'documents'
    `;
    
    for (const policy of policies) {
        console.log(policy);
    }
    
    await sql.end();
}

main().catch(console.error);
