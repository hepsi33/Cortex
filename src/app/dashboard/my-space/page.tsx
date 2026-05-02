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

            {/* Mobile Tab Bar - Fixed at bottom for better thumb reach */}
            <div className="md:hidden flex fixed bottom-0 left-0 w-full border-t border-white/10 bg-[#0a0a0c]/90 backdrop-blur-3xl z-50 h-16">
                <button
                    onClick={() => setMobileTab('docs')}
                    className={cn(
                        "flex-1 flex flex-col items-center justify-center gap-1 transition-all",
                        mobileTab === 'docs' ? 'text-[#00d4ff]' : 'text-white/40'
                    )}
                >
                    <List className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Files</span>
                </button>
                <button
                    onClick={() => setMobileTab('chat')}
                    className={cn(
                        "flex-1 flex flex-col items-center justify-center gap-1 transition-all",
                        mobileTab === 'chat' ? 'text-[#e100ff]' : 'text-white/40'
                    )}
                >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Neural Chat</span>
                </button>
            </div>

            {/* Left Sidebar: My Files */}
            <div className={cn(
                "md:flex w-full md:w-[400px] border-r border-white/5 bg-[#0a0a0c]/40 backdrop-blur-3xl flex-col shrink-0 overflow-hidden transition-all z-10 pb-16 md:pb-0",
                mobileTab === 'chat' ? 'hidden' : 'flex'
            )}>
                {/* Header */}
                <div className="p-6 md:p-10 space-y-6 md:space-y-10">
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="relative z-50 flex items-center gap-3 text-[10px] font-black text-white/20 hover:text-[#e100ff] uppercase tracking-[0.3em] transition-all group cursor-target"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                        Dashboard
                    </button>
                    
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic leading-none">My Space</h1>
                        <p className="text-[8px] md:text-[10px] text-[#e100ff] font-black uppercase tracking-widest italic mt-1 md:mt-2">Personal Repository</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Current Space</label>
                        <WorkspaceSelector
                            currentWorkspace={currentWorkspace}
                            onWorkspaceChange={setCurrentWorkspace}
                        />
                    </div>
                </div>

                {/* Document List */}
                <div className="flex-1 overflow-hidden px-4 md:px-6 pb-4 md:pb-10">
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
                "flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden relative z-10 pb-16 md:pb-0",
                mobileTab === 'docs' ? 'hidden md:flex' : 'flex'
            )}>
                {/* Chat Header */}
                <div className="h-20 md:h-24 border-b border-white/5 px-6 md:px-10 flex items-center justify-between shrink-0 bg-[#0a0a0c]/60 backdrop-blur-3xl z-10">
                    <div className="flex items-center gap-3 md:gap-5">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-[#e100ff]/10 border border-[#e100ff]/20 flex items-center justify-center shadow-2xl">
                            <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-[#e100ff]" />
                        </div>
                        <div>
                            <h2 className="text-sm md:text-lg font-black tracking-tighter text-white uppercase italic">
                                {currentWorkspace ? currentWorkspace.name : 'Waiting for Space'}
                            </h2>
                            <p className="text-[8px] md:text-[10px] text-[#00d4ff] uppercase font-black tracking-widest mt-0.5 md:mt-1 italic">
                                {currentWorkspace ? 'Context Active' : 'Select a source to begin'}
                            </p>
                        </div>
                    </div>

                    {/* Quick Analysis - Hidden on small mobile */}
                    <div className="hidden sm:flex items-center gap-4">
                        {currentWorkspace && (
                            <div className="flex items-center gap-3 mr-6 pr-6 border-r border-white/5">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => window.dispatchEvent(new CustomEvent('trigger-chat-action', { detail: 'Summarize the selected documents with high precision.' }))}
                                    className="h-10 md:h-12 px-4 md:px-6 bg-white/5 hover:bg-[#e100ff] hover:text-white rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-xl cursor-target"
                                >
                                    <Zap className="w-3 h-3 md:w-4 md:h-4 mr-2 md:mr-3" /> Summary
                                </Button>
                            </div>
                        )}
                        <div className="flex bg-white/5 p-1 rounded-xl md:rounded-2xl border border-white/10">
                            <button 
                                onClick={() => setIsStrict(true)}
                                className={cn(
                                    "px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all",
                                    isStrict ? "bg-[#e100ff] text-white" : "text-white/40 hover:text-white"
                                )}
                            >
                                Local
                            </button>
                            <button 
                                onClick={() => setIsStrict(false)}
                                className={cn(
                                    "px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all",
                                    !isStrict ? "bg-[#e100ff] text-white" : "text-white/40 hover:text-white"
                                )}
                            >
                                Web
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chat Interface */}
                <div className="flex-1 overflow-hidden p-4 md:p-8">
                    <ChatInterface 
                        workspaceId={currentWorkspace?.id || null} 
                        mode={isStrict ? 'strict' : 'research'}
                    />
                </div>
            </div>
        </div>
    );
}
