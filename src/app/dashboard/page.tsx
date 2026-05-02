import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, workspaces, documents, chats } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { UserDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function UserDashboard() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const userId = session.user.id;
    const isGuest = userId.startsWith("guest_") || (session.user as any).isGuest;
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    // Derive name from email if needed
    const deriveName = (email: string) => {
        const part = email.split('@')[0];
        return part.split(/[._-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    };

    // Default state
    let dashboardData = {
        displayName: session.user.name || deriveName(session.user.email || "") || "User",
        email: session.user.email || "",
        workspaces: [],
        recentDocs: [],
        recentChats: [],
        stats: {
            focusedTime: "0h 0m",
            quizzesTaken: 0,
            totalSpaces: 0,
            totalDocs: 0
        }
    };

    if (isGuest || !isValidUuid) {
        return (
            <UserDashboardClient
                displayName={dashboardData.displayName}
                email={dashboardData.email}
                workspaces={dashboardData.workspaces}
                recentDocs={dashboardData.recentDocs}
                recentChats={dashboardData.recentChats}
                stats={dashboardData.stats}
            />
        );
    }

    try {
        const [user] = await db.select()
            .from(profiles)
            .where(eq(profiles.id, userId as any))
            .limit(1);

        if (user) {
            dashboardData.displayName = user.name || session.user.name || deriveName(user.email) || "User";
            dashboardData.email = user.email || session.user.email || "";
        }

        // Fetch Workspaces (with document counts)
        const userWorkspaces = await db.query.workspaces.findMany({
            where: eq(workspaces.userId, session.user.id),
            orderBy: (workspaces, { desc }) => [desc(workspaces.createdAt)],
            limit: 4,
            with: {
                documents: true,
            },
        });
        dashboardData.workspaces = userWorkspaces as any;

        // Fetch Recent Documents
        const recentDocs = await db.query.documents.findMany({
            where: eq(documents.userId, session.user.id),
            orderBy: (documents, { desc }) => [desc(documents.createdAt)],
            limit: 3,
        });
        dashboardData.recentDocs = recentDocs as any;

        // Fetch Recent Chats (with workspace info)
        const recentChats = await db.query.chats.findMany({
            where: eq(chats.userId, session.user.id),
            orderBy: (chats, { desc }) => [desc(chats.createdAt)],
            limit: 3,
            with: {
                workspace: true,
            },
        });
        dashboardData.recentChats = recentChats as any;

        // Stats calculation
        dashboardData.stats.totalSpaces = userWorkspaces.length;
        dashboardData.stats.totalDocs = recentDocs.length;

    } catch (error) {
        console.error("Dashboard data fetch failed critically:", error);
        // Page continues with dashboardData default values
    }

    if (!dashboardData.displayName.trim()) {
        dashboardData.displayName = "User";
    }

    return (
        <UserDashboardClient
            displayName={dashboardData.displayName}
            email={dashboardData.email}
            workspaces={dashboardData.workspaces}
            recentDocs={dashboardData.recentDocs}
            recentChats={dashboardData.recentChats}
            stats={dashboardData.stats}
        />
    );
}
