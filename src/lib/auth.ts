import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
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
