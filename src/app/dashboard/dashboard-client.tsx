"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Youtube, FileText, MessageSquare, ArrowRight, Folder, Clock, Plus, Sparkles, Bot, Search } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Workspace = {
    id: string;
    name: string;
    createdAt: Date;
    documents: any[];
};

type Document = {
    id: string;
    name: string;
    status: string;
    createdAt: Date;
};

type Chat = {
    id: string;
    title: string;
    createdAt: Date;
    workspace: { name: string } | null;
};

type DashboardClientProps = {
    displayName: string;
    email: string;
    workspaces: Workspace[];
    recentDocs: Document[];
    recentChats: Chat[];
};

export function UserDashboardClient({
    displayName,
    email,
    workspaces = [],
    recentDocs = [],
    recentChats = []
}: DashboardClientProps) {

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-sans">
            {/* Header */}
            <header className="bg-[#0a0a0a] border-b border-white/5 sticky top-0 z-10 backdrop-blur-md bg-opacity-80">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-tight">AI Workspace</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium text-white">{displayName}</p>
                            <p className="text-xs text-gray-500">{email}</p>
                        </div>
                        <SignOutButton />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 flex-1 max-w-7xl">
                {/* Welcome Section */}
                <div className="mb-10">
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                        Welcome back, {displayName}
                    </h2>
                    <p className="text-gray-400 text-lg">
                        Access your AI study tools, documents, and workspaces.
                    </p>
                </div>

                {/* AI Study Tools Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-10">
                    {/* YouTube Tool */}
                    <Link href="/dashboard/ai-notes" className="group">
                        <Card className="h-full bg-[#111111] border-white/5 hover:border-purple-500/50 transition-all hover:bg-[#161616]">
                            <CardHeader>
                                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2 group-hover:bg-purple-500/20 transition-colors">
                                    <Youtube className="w-5 h-5 text-purple-400" />
                                </div>
                                <CardTitle className="text-white group-hover:text-purple-400 transition-colors">YouTube Notes</CardTitle>
                                <CardDescription className="text-gray-400">Convert YouTube lectures into structured study notes.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium text-purple-400 flex items-center gap-1">
                                    Open Tool <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Knowledge Workspace */}
                    <Link href="/dashboard/rag" className="group">
                        <Card className="h-full bg-[#111111] border-white/5 hover:border-blue-500/50 transition-all hover:bg-[#161616]">
                            <CardHeader>
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2 group-hover:bg-blue-500/20 transition-colors">
                                    <Bot className="w-5 h-5 text-blue-400" />
                                </div>
                                <CardTitle className="text-white group-hover:text-blue-400 transition-colors">Knowledge Workspace</CardTitle>
                                <CardDescription className="text-gray-400">Upload documents, organize workspaces, and chat with AI.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium text-blue-400 flex items-center gap-1">
                                    Open Workspace <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-8 lg:grid-cols-3">

                    {/* Left Column: Workspaces */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <Folder className="w-5 h-5 text-gray-400" />
                                Your Workspaces
                            </h3>
                            <Link href="/dashboard/rag">
                                <span className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                                    <Plus className="w-3 h-3" /> New Workspace
                                </span>
                            </Link>
                        </div>

                        {workspaces.length === 0 ? (
                            <div className="bg-[#111111] border border-white/5 rounded-xl p-8 text-center">
                                <Folder className="w-10 h-10 text-gray-600 mx-auto mb-3 opacity-50" />
                                <h4 className="text-white font-medium mb-1">No workspaces yet</h4>
                                <p className="text-gray-500 text-sm mb-4">Create a workspace to start organizing your documents.</p>
                                <Link href="/dashboard/rag">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                                        Create Workspace
                                    </span>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {workspaces.map((ws) => (
                                    <Link key={ws.id} href="/dashboard/rag">
                                        <div className="bg-[#111111] border border-white/5 rounded-xl p-5 hover:border-gray-600 transition-all cursor-pointer group h-full flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                                                        <Folder className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs text-gray-500 font-mono">{formatDate(ws.createdAt)}</span>
                                                </div>
                                                <h4 className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">{ws.name}</h4>
                                            </div>
                                            <div className="mt-4 flex items-center text-xs text-gray-400 gap-2">
                                                <FileText className="w-3 h-3" />
                                                {ws.documents.length} document{ws.documents.length !== 1 && 's'}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Recent Activity */}
                    <div className="space-y-8">

                        {/* Recent Documents */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Recent Documents
                            </h3>
                            <div className="space-y-3">
                                {recentDocs.length === 0 ? (
                                    <p className="text-sm text-gray-600 italic">No documents uploaded yet.</p>
                                ) : (
                                    recentDocs.map((doc) => (
                                        <div key={doc.id} className="bg-[#111111] border border-white/5 p-3 rounded-lg flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center shrink-0">
                                                <FileText className="w-4 h-4 text-gray-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-white truncate" title={doc.name}>{doc.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        doc.status === 'completed' ? "bg-green-500" :
                                                            doc.status === 'indexing' ? "bg-blue-500" :
                                                                doc.status === 'failed' ? "bg-red-500" : "bg-gray-500"
                                                    )} />
                                                    <span className="text-xs text-gray-500 capitalize">{doc.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Recent Chats */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" /> Recent Chats
                            </h3>
                            <div className="space-y-3">
                                {recentChats.length === 0 ? (
                                    <p className="text-sm text-gray-600 italic">No chats started yet.</p>
                                ) : (
                                    recentChats.map((chat) => (
                                        <Link key={chat.id} href="/dashboard/rag">
                                            <div className="bg-[#111111] border border-white/5 p-3 rounded-lg hover:bg-[#161616] transition-colors cursor-pointer group">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs text-blue-400 font-medium px-1.5 py-0.5 rounded bg-blue-400/10 border border-blue-400/20">
                                                        {chat.workspace?.name || 'Workspace'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-600">{formatDate(chat.createdAt)}</span>
                                                </div>
                                                <p className="text-sm text-gray-300 line-clamp-2 group-hover:text-white transition-colors">
                                                    {chat.title || "New Conversation"}
                                                </p>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
