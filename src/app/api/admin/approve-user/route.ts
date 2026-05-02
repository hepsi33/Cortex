import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const approveSchema = z.object({
    userId: z.string(),
    action: z.enum(["approve", "reject"]),
});

export async function POST(req: Request) {
    const session = await auth();

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { userId, action } = approveSchema.parse(body);

        const status = action === "approve" ? "approved" : "rejected";

        await db
            .update(profiles)
            .set({ status })
            .where(eq(profiles.id, userId));

        return NextResponse.json({ message: `User ${status} successfully` });
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to update user status" },
            { status: 500 }
        );
    }
}
