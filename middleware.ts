import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const { pathname } = req.nextUrl;
    console.log(`[Middleware] Processing: ${pathname} | LoggedIn: ${isLoggedIn}`);

    const protectedRoutes = ["/dashboard", "/admin"];
    const authRoutes = ["/login", "/signup"];

    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
    const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

    // 0. Public Routes: Explicitly allow these to avoid ANY redirection
    const publicRoutes = ["/", "/pending"];
    if (publicRoutes.includes(pathname) || pathname.startsWith("/get-started")) {
        return null;
    }

    // 1. Redirect logged-in users away from auth pages (login/signup)
    if (isAuthRoute && isLoggedIn) {
        console.log(`[Middleware] Authenticated user on auth route (${pathname}). Redirecting.`);
        const role = req.auth?.user?.role;
        if (role === 'admin') {
            return NextResponse.redirect(new URL("/admin", req.nextUrl));
        }
        return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    // 2. Redirect unauthenticated users away from protected routes
    if (isProtectedRoute && !isLoggedIn) {
        let callbackUrl = pathname;
        if (req.nextUrl.search) {
            callbackUrl += req.nextUrl.search;
        }
        const encodedCallbackUrl = encodeURIComponent(callbackUrl);
        return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, req.nextUrl));
    }

    // 3. Role-based protection for Admin routes
    if (pathname.startsWith("/admin") && req.auth?.user?.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    // 4. Allow everything else (Landing, Get Started, etc.)
    return null;
});

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
