import "dotenv/config";

import { db } from "../lib/db";
import { profiles } from "./schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

import * as readline from "readline";

async function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(query, (ans) => {
            rl.close();
            resolve(ans);
        });
    });
}

async function main() {
    let adminEmail = process.argv[2];
    let adminPassword = process.argv[3];

    if (!adminEmail) {
        console.log("No email provided via command line arguments.");
        adminEmail = await askQuestion("Enter Admin Email (default: test@test.com): ");
    }

    if (!adminEmail) adminEmail = "test@test.com";

    if (!adminPassword) {
        if (process.stdin.isTTY) {
            adminPassword = await askQuestion("Enter Admin Password (default: Test123@123): ");
        }
    }

    if (!adminPassword) adminPassword = "Test123@123";

    console.log(`Seeding admin user: ${adminEmail}`);

    const existingUsers = await db.select().from(profiles).where(eq(profiles.email, adminEmail));

    if (existingUsers.length === 0) {
        const passwordHash = await hash(adminPassword, 10);
        await db.insert(profiles).values({
            name: "Admin User",
            email: adminEmail,
            password: passwordHash,
            role: "admin",
            status: "approved",
        });
        console.log("Admin user seeded successfully");
    } else {
        const passwordHash = await hash(adminPassword, 10);
        await db.update(profiles)
            .set({ password: passwordHash })
            .where(eq(profiles.email, adminEmail));
        console.log("Admin user password updated successfully");
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
