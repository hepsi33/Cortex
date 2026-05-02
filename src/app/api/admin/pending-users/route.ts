import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const pendingUsers = await db.query.profiles.findMany({
            where: eq(profiles.status, "pending"),
            columns: {
                id: true,
                name: true,
                email: true,
                status: true,
                createdAt: true,
            },
        });

        return NextResponse.json(pendingUsers);
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to fetch pending users" },
            { status: 500 }
        );
    }
}
