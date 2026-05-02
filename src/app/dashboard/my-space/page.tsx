"use client";

import { useState } from "react";
import { WorkspaceSelector } from "@/components/rag/WorkspaceSelector";
import { DocumentManager } from "@/components/rag/DocumentManager";
import { ChatInterface } from "@/components/rag/ChatInterface";
import { ArrowLeft, MessageSquare, Zap, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SoftAurora from "@/components/dashboard/SoftAurora";

interface Workspace {
    id: string;
    name: string;
    createdAt: string;
}

export default function MySpacePage() {
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [mobileTab, setMobileTab] = useState<'docs' | 'chat'>('docs');
    const [isStrict, setIsStrict] = useState(true);

    return (
        <div className="flex flex-col md:flex-row bg-[#020205] h-screen overflow-hidden text-white/90 font-sans relative">
            {/* Soft Aurora Background */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <SoftAurora
                    speed={0.3}
                    scale={1.2}
                    brightness={0.7}
                    color1="#00d4ff"
                    color2="#e100ff"
                />
            </div>

            {/* Left Sidebar: My Files */}
            <div className={cn(
                "md:flex w-full md:w-[400px] border-r border-white/5 bg-[#0a0a0c]/40 backdrop-blur-3xl flex-col shrink-0 overflow-hidden transition-all z-10",
                mobileTab === 'chat' ? 'hidden' : 'flex'
            )}>
                {/* Header */}
                <div className="p-10 space-y-10">
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="relative z-50 flex items-center gap-3 text-[10px] font-black text-white/20 hover:text-[#e100ff] uppercase tracking-[0.3em] transition-all group cursor-target"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                        Dashboard
                    </button>
                    
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">My Space</h1>
                        <p className="text-[10px] text-[#e100ff] font-black uppercase tracking-widest italic mt-2">Personal Repository</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Current Space</label>
                        <WorkspaceSelector
                            currentWorkspace={currentWorkspace}
                            onWorkspaceChange={setCurrentWorkspace}
                        />
                    </div>
                </div>

                {/* Document List */}
                <div className="flex-1 overflow-hidden px-6 pb-10">
                    {currentWorkspace ? (
                        <DocumentManager workspaceId={currentWorkspace.id} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-10">
                            <LayoutGrid className="w-16 h-16 stroke-[1]" />
                            <p className="text-xs font-black uppercase tracking-widest">Select a space to access files</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden relative z-10",
                mobileTab === 'docs' ? 'hidden md:flex' : 'flex'
            )}>
                {/* Chat Header */}
                <div className="h-24 border-b border-white/5 px-10 flex items-center justify-between shrink-0 bg-[#0a0a0c]/60 backdrop-blur-3xl z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-[#e100ff]/10 border border-[#e100ff]/20 flex items-center justify-center shadow-2xl">
                            <MessageSquare className="w-6 h-6 text-[#e100ff]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tighter text-white uppercase italic">
                                {currentWorkspace ? currentWorkspace.name : 'Waiting for Space'}
                            </h2>
                            <p className="text-[10px] text-[#00d4ff] uppercase font-black tracking-widest mt-1 italic">
                                {currentWorkspace ? 'Context Active' : 'Select a source to begin'}
                            </p>
                        </div>
                    </div>

                    {/* Quick Analysis */}
                    <div className="flex items-center gap-4">
                        {currentWorkspace && (
                            <div className="flex items-center gap-3 mr-6 pr-6 border-r border-white/5">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => window.dispatchEvent(new CustomEvent('trigger-chat-action', { detail: 'Summarize the selected documents with high precision.' }))}
                                    className="h-12 px-6 bg-white/5 hover:bg-[#e100ff] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl cursor-target"
                                >
                                    <Zap className="w-4 h-4 mr-3" /> Summary
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => window.dispatchEvent(new CustomEvent('trigger-chat-action', { detail: 'Extract the most important key points and insights from the selected documents, providing references where possible.' }))}
                                    className="h-12 px-6 bg-white/5 hover:bg-[#e100ff] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl cursor-target"
                                >
                                    <List className="w-4 h-4 mr-3" /> Key Points
                                </Button>
                            </div>
                        )}
                        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 cursor-target">
                            <button 
                                onClick={() => setIsStrict(true)}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-target",
                                    isStrict ? "bg-[#e100ff] text-white" : "text-white/40 hover:text-white"
                                )}
                            >
                                Local
                            </button>
                            <button 
                                onClick={() => setIsStrict(false)}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-target",
                                    !isStrict ? "bg-[#e100ff] text-white" : "text-white/40 hover:text-white"
                                )}
                            >
                                Web
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chat Interface */}
                <div className="flex-1 overflow-hidden p-4 md:p-6">
                    <ChatInterface 
                        workspaceId={currentWorkspace?.id || null} 
                        mode={isStrict ? 'strict' : 'research'}
                    />
                </div>

                {/* Mobile Tab Switcher */}
                <div className="md:hidden absolute bottom-10 left-1/2 -translate-x-1/2 flex bg-white/5 backdrop-blur-3xl border border-white/10 rounded-full p-2 shadow-4xl z-50 cursor-target">
                    <button
                        onClick={() => setMobileTab('docs')}
                        className={cn(
                            "px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-target",
                            mobileTab === 'docs' ? "bg-white text-black" : "text-white/40"
                        )}
                    >
                        Files
                    </button>
                    <button
                        onClick={() => setMobileTab('chat')}
                        className={cn(
                            "px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-target",
                            mobileTab === 'chat' ? "bg-white text-black" : "text-white/40"
                        )}
                    >
                        Chat
                    </button>
                </div>
            </div>
        </div>
    );
}
