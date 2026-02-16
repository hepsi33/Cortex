"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Users, DollarSign, TrendingUp, Sparkles, FileText } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";

type DashboardClientProps = {
    displayName: string;
    email: string;
};

export function UserDashboardClient({ displayName, email }: DashboardClientProps) {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
            <header className="bg-[#111111] border-b border-white/10 sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white">Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium text-white">{displayName}</p>
                            <p className="text-xs text-gray-400">{email}</p>
                        </div>
                        <SignOutButton />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 flex-1">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-white">
                        Welcome back, {displayName}!
                    </h2>
                    <p className="text-gray-400 mt-2">Here's an overview of your performance today.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card className="glass border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-300">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-green-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">$45,231.89</div>
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> +20.1% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="glass border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-300">Subscriptions</CardTitle>
                            <Users className="h-4 w-4 text-blue-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">+2,350</div>
                            <p className="text-xs text-blue-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> +180.1% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="glass border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-300">Sales</CardTitle>
                            <Activity className="h-4 w-4 text-purple-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">+12,234</div>
                            <p className="text-xs text-purple-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> +19% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="glass border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-300">Active Now</CardTitle>
                            <Activity className="h-4 w-4 text-orange-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">+573</div>
                            <p className="text-xs text-orange-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> +201 since last hour
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        AI Study Tools
                    </h3>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Link href="/dashboard/ai-notes">
                            <Card className="glass border-white/10 hover:bg-white/5 transition-colors cursor-pointer group">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white">YouTube to Notes</CardTitle>
                                    <FileText className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-white">Generate Notes</div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Summarize videos and create study guides instantly
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/dashboard/rag">
                            <Card className="glass border-white/10 hover:bg-white/5 transition-colors cursor-pointer group">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white">Chat with Documents</CardTitle>
                                    <Sparkles className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-white">RAG Assistant</div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Upload PDFs and ask questions with AI citations
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4 glass border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <div className="h-[200px] flex items-center justify-center text-gray-500 border border-dashed border-white/20 rounded-lg">
                                Chart Placeholder
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="col-span-3 glass border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Recent Sales</CardTitle>
                            <CardDescription className="text-gray-400">You made 265 sales this month.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                                        OM
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium text-white">Olivia Martin</p>
                                        <p className="text-sm text-gray-400">olivia.martin@email.com</p>
                                    </div>
                                    <div className="ml-auto font-medium text-green-400">+$1,999.00</div>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-medium text-sm">
                                        JL
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium text-white">Jackson Lee</p>
                                        <p className="text-sm text-gray-400">jackson.lee@email.com</p>
                                    </div>
                                    <div className="ml-auto font-medium text-green-400">+$39.00</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
