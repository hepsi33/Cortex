import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter for classy look
import "./globals.css";
import { Providers } from "@/components/providers";
import { auth } from "@/lib/auth";
import TargetCursor from "@/components/ui/TargetCursor";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Premium Dashboard",
  description: "A classy dashboard application",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  console.log(`[RootLayout] Session: ${session?.user?.email ? "Logged In (" + session.user.email + ")" : "Logged Out"}`);

  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} antialiased`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
        <TargetCursor 
          spinDuration={2}
          hideDefaultCursor={true}
          parallaxOn={true}
        />
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
