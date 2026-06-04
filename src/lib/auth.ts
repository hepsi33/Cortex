import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                const email = user.email;
                if (!email) return false;
                
                try {
                    const { db } = await import("./db");
                    const { profiles } = await import("@/drizzle/schema");
                    const { eq } = await import("drizzle-orm");
                    
                    let dbUser = await db.query.profiles.findFirst({
                        where: eq(profiles.email, email)
                    });
                    
                    if (!dbUser) {
                        const newId = crypto.randomUUID();
                        const [created] = await db.insert(profiles).values({
                            id: newId as any,
                            name: user.name || "Google User",
                            email: email,
                            password: "google_oauth_no_password",
                            role: "user",
                            status: "approved"
                        }).returning();
                        dbUser = created;
                    }
                    
                    user.id = dbUser.id;
                    (user as any).role = dbUser.role;
                    (user as any).status = dbUser.status;
                    (user as any).isGuest = false;
                } catch (e) {
                    console.error("Google OAuth DB sync failed:", e);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.name = user.name;
                token.email = user.email;
                token.role = (user as any).role;
                token.id = user.id ?? "";
                token.status = (user as any).status;
                token.isGuest = (user as any).isGuest;
            }

            // Fail-safe: if token.id is not a UUID, resolve it from the database by email
            const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token.id as string);
            if (!isValidUuid && token.email) {
                try {
                    const { db } = await import("./db");
                    const { profiles } = await import("@/drizzle/schema");
                    const { eq } = await import("drizzle-orm");
                    
                    const dbUser = await db.query.profiles.findFirst({
                        where: eq(profiles.email, token.email as string)
                    });
                    
                    if (dbUser) {
                        token.id = dbUser.id;
                        token.role = dbUser.role;
                        token.status = dbUser.status;
                        token.isGuest = false;
                        token.name = dbUser.name || token.name;
                    }
                } catch (e) {
                    console.error("JWT fail-safe database lookup failed:", e);
                }
            }

            return token;
        }
    },
    providers: [
        ...authConfig.providers,
        Credentials({
            id: "guest",
            name: "Guest",
            credentials: {},
            authorize: async () => {
                const id = Array.from({ length: 36 }, (_, i) => 
                    [8, 13, 18, 23].includes(i) ? '-' : Math.floor(Math.random() * 16).toString(16)
                ).join('');
                return {
                    id: id,
                    name: "Guest Voyager",
                    email: `guest_${id}@cortex.study`,
                    role: "user",
                    status: "active",
                    isGuest: true
                };
            }
        }),
        Credentials({
            id: "credentials",
            name: "Credentials",
            credentials: {
                email: {},
                password: {},
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // Dynamic imports to stay Edge-friendly
                const { db } = await import("./db");
                const { profiles } = await import("@/drizzle/schema");
                const { eq } = await import("drizzle-orm");
                const { compare } = await import("bcryptjs");

                const email = credentials.email as string;
                const password = credentials.password as string;

                const user = await db.query.profiles.findFirst({
                    where: eq(profiles.email, email),
                });

                if (!user) {
                    throw new Error("User not found.");
                }

                const isPasswordValid = await compare(password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Invalid password.");
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                };
            },
        }),
    ],
});
