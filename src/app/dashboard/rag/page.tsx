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
        <div className="flex flex-col md:flex-row bg-[#0b0f19] h-[calc(100vh-64px)] overflow-hidden">
            {/* Mobile Tab Bar */}
            <div className="md:hidden flex border-b border-gray-800 bg-[#111827] shrink-0">
                <button
                    onClick={() => setMobileTab('docs')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${mobileTab === 'docs'
                            ? 'text-blue-400 border-b-2 border-blue-400 bg-[#0b0f19]'
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    Documents
                </button>
                <button
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${mobileTab === 'chat'
                            ? 'text-blue-400 border-b-2 border-blue-400 bg-[#0b0f19]'
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                </button>
            </div>

            {/* Left Sidebar: Workspace & Documents — hidden on mobile when chat tab active */}
            <div className={`${mobileTab === 'docs' ? 'flex' : 'hidden'} md:flex w-full md:w-[350px] border-r border-gray-800 bg-[#111827] flex-col shrink-0 flex-1 md:flex-initial overflow-hidden`}>
                {/* Back Button & Workspace Selector */}
                <div className="p-3 md:p-4 border-b border-gray-800 bg-[#111827] space-y-3 md:space-y-4">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <WorkspaceSelector
                        currentWorkspace={currentWorkspace}
                        onWorkspaceChange={setCurrentWorkspace}
                    />
                </div>

                {/* Document List */}
                <div className="flex-1 overflow-hidden">
                    <DocumentManager workspaceId={currentWorkspace?.id || null} />
                </div>
            </div>

            {/* Right Area: Chat Interface — hidden on mobile when docs tab active */}
            <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 bg-[#0b0f19] overflow-hidden`}>
                {currentWorkspace ? (
                    <>
                        <div className="h-12 md:h-14 border-b border-gray-800 px-4 md:px-6 flex items-center justify-between shrink-0 bg-[#0b0f19]">
                            <div className="min-w-0">
                                <h2 className="font-semibold text-white flex items-center gap-2 text-sm md:text-base truncate">
                                    {currentWorkspace.name}
                                    <span className="hidden sm:inline text-xs font-normal text-gray-400 border border-gray-700 rounded-full px-2 py-0.5 bg-[#1f2937]">
                                        Workspace
                                    </span>
                                </h2>
                            </div>
                            <div className="hidden sm:flex text-xs text-gray-400 items-center gap-1.5 shrink-0">
                                <Info className="w-4 h-4" />
                                Chatting with all documents in this workspace
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ChatInterface workspaceId={currentWorkspace.id} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 md:p-8 text-center bg-[#0b0f19]">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-[#1f2937] rounded-2xl flex items-center justify-center mb-4 border border-gray-800">
                            <Info className="w-7 h-7 md:w-8 md:h-8 text-gray-500" />
                        </div>
                        <h3 className="text-base md:text-lg font-medium text-white mb-2">No Workspace Selected</h3>
                        <p className="max-w-md text-gray-500 text-sm md:text-base">
                            Select or create a workspace from the {' '}
                            <button onClick={() => setMobileTab('docs')} className="text-blue-400 underline md:no-underline md:cursor-default">
                                sidebar
                            </button>{' '}
                            to start organizing documents and chatting.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
