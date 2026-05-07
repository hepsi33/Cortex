import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            role: string;
            id: string;
            status: string;
            isGuest?: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        role: string;
        id: string;
        status: string;
        isGuest?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: string;
        id: string;
        status: string;
        isGuest?: boolean;
    }
}
