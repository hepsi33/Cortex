import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { db } from "./db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        Credentials({
            id: "guest",
            name: "Guest",
            credentials: {},
            authorize: async () => {
                // Generate a valid UUID for the guest to prevent DB crashes
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
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.name = user.name;
                token.email = user.email;
                token.role = user.role as string;
                token.id = user.id as string;
                token.status = (user as any).status as string;
                token.isGuest = (user as any).isGuest as boolean;
            }
            return token;
        },
        async redirect({ url, baseUrl }) {
            // Always send users to dashboard if they are signed in
            if (url.startsWith("/")) {
                return `${baseUrl}${url}`;
            } else if (new URL(url).origin === baseUrl) {
                return url;
            }
            return baseUrl;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
                session.user.status = token.status as string;
                (session.user as any).isGuest = token.isGuest as boolean;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.AUTH_SECRET,
});
