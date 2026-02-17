import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, workspaces, documents, chats } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { UserDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function UserDashboard() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });

    // Fetch Workspaces (with document counts)
    const userWorkspaces = await db.query.workspaces.findMany({
        where: eq(workspaces.userId, session.user.id),
        orderBy: (workspaces, { desc }) => [desc(workspaces.createdAt)],
        limit: 4,
        with: {
            documents: true,
        },
    });

    // Fetch Recent Documents
    const recentDocs = await db.query.documents.findMany({
        where: eq(documents.userId, session.user.id),
        orderBy: (documents, { desc }) => [desc(documents.createdAt)],
        limit: 3,
    });

    // Fetch Recent Chats (with workspace info)
    const recentChats = await db.query.chats.findMany({
        where: eq(chats.userId, session.user.id),
        orderBy: (chats, { desc }) => [desc(chats.createdAt)],
        limit: 3,
        with: {
            workspace: true,
        },
    });

    let displayName = user?.name || session.user.name || "User";
    if (!displayName.trim()) {
        displayName = "User";
    }

    return (
        <UserDashboardClient
            displayName={displayName}
            email={user?.email || session.user.email || ""}
            workspaces={userWorkspaces}
            recentDocs={recentDocs}
            recentChats={recentChats}
        />
    );
}
