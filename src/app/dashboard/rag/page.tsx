'use client';

import { useState } from 'react';
import { WorkspaceSelector } from '@/components/rag/WorkspaceSelector';
import { DocumentManager } from '@/components/rag/DocumentManager';
import { ChatInterface } from '@/components/rag/ChatInterface';
import { Info, ArrowLeft, FileText, MessageSquare } from 'lucide-react';

interface Workspace {
    id: string;
    name: string;
    createdAt: string;
}

export default function KnowledgeWorkspacePage() {
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    // Mobile tab state: 'docs' shows sidebar content, 'chat' shows chat
    const [mobileTab, setMobileTab] = useState<'docs' | 'chat'>('docs');

    return (
        <div className="flex flex-col md:flex-row bg-[#020205] h-[calc(100vh-64px)] overflow-hidden">
            {/* Mobile Tab Bar - Fixed at bottom for better thumb reach */}
            <div className="md:hidden flex fixed bottom-0 left-0 w-full border-t border-white/10 bg-[#0a0a0c]/90 backdrop-blur-3xl z-50 h-16">
                <button
                    onClick={() => setMobileTab('docs')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${mobileTab === 'docs'
                            ? 'text-[#00d4ff]'
                            : 'text-white/40'
                        }`}
                >
                    <FileText className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Repository</span>
                </button>
                <button
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${mobileTab === 'chat'
                            ? 'text-[#e100ff]'
                            : 'text-white/40'
                        }`}
                >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Neural Chat</span>
                </button>
            </div>

            {/* Left Sidebar: Workspace & Documents */}
            <div className={`${mobileTab === 'docs' ? 'flex' : 'hidden'} md:flex w-full md:w-[400px] border-r border-white/5 bg-[#0a0a0c]/40 backdrop-blur-xl flex-col shrink-0 flex-1 md:flex-initial overflow-hidden pb-16 md:pb-0`}>
                <div className="p-6 border-b border-white/5 space-y-6">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-all cursor-target"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </button>
                    <WorkspaceSelector
                        currentWorkspace={currentWorkspace}
                        onWorkspaceChange={setCurrentWorkspace}
                    />
                </div>

                <div className="flex-1 min-h-0">
                    <DocumentManager workspaceId={currentWorkspace?.id || null} />
                </div>
            </div>

            {/* Right Area: Chat Interface */}
            <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 bg-[#020205] overflow-hidden pb-16 md:pb-0`}>
                {currentWorkspace ? (
                    <>
                        <div className="h-16 md:h-20 border-b border-white/5 px-6 md:px-10 flex items-center justify-between shrink-0 bg-[#0a0a0c]/20 backdrop-blur-md">
                            <div className="min-w-0">
                                <h2 className="text-sm md:text-lg font-black tracking-tighter uppercase italic text-white flex items-center gap-4 truncate">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                    {currentWorkspace.name}
                                </h2>
                            </div>
                            <div className="hidden lg:flex text-[9px] font-black text-white/20 uppercase tracking-[0.3em] items-center gap-3 shrink-0">
                                <Info className="w-3 h-3" />
                                Synchronized Context Active
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <ChatInterface workspaceId={currentWorkspace.id} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-[#020205]">
                        <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/10 animate-pulse">
                            <Info className="w-10 h-10 text-white/20" />
                        </div>
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-4">Neural Void</h3>
                        <p className="max-w-xs text-white/20 text-sm font-medium italic">
                            Initialize a workspace from the {' '}
                            <button onClick={() => setMobileTab('docs')} className="text-[#00d4ff] hover:underline transition-all">
                                repository
                            </button>{' '}
                            to begin synchronization.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
