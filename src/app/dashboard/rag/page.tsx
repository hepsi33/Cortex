'use client';

import { useState } from 'react';
import { WorkspaceSelector } from '@/components/rag/WorkspaceSelector';
import { DocumentManager } from '@/components/rag/DocumentManager';
import { ChatInterface } from '@/components/rag/ChatInterface';
import { Info, ArrowLeft } from 'lucide-react';

interface Workspace {
    id: string;
    name: string;
    createdAt: string;
}

export default function KnowledgeWorkspacePage() {
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

    return (
        <div className="flex bg-[#0b0f19] h-[calc(100vh-64px)] overflow-hidden">
            {/* Left Sidebar: Workspace & Documents */}
            <div className="w-[350px] border-r border-gray-800 bg-[#111827] flex flex-col shrink-0">
                {/* Back Button & Workspace Selector */}
                <div className="p-4 border-b border-gray-800 bg-[#111827] space-y-4">
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

            {/* Right Area: Chat Interface */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#0b0f19]">
                {currentWorkspace ? (
                    <>
                        <div className="h-14 border-b border-gray-800 px-6 flex items-center justify-between shrink-0 bg-[#0b0f19]">
                            <div>
                                <h2 className="font-semibold text-white flex items-center gap-2">
                                    {currentWorkspace.name}
                                    <span className="text-xs font-normal text-gray-400 border border-gray-700 rounded-full px-2 py-0.5 bg-[#1f2937]">
                                        Workspace
                                    </span>
                                </h2>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1.5">
                                <Info className="w-4 h-4" />
                                Chatting with all documents in this workspace
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ChatInterface workspaceId={currentWorkspace.id} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-[#0b0f19]">
                        <div className="w-16 h-16 bg-[#1f2937] rounded-2xl flex items-center justify-center mb-4 border border-gray-800">
                            <Info className="w-8 h-8 text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No Workspace Selected</h3>
                        <p className="max-w-md text-gray-500">
                            Select or create a workspace from the sidebar to start organizing documents and chatting.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

