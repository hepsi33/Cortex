'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { ChatInterface } from '@/components/rag/ChatInterface';

interface DocumentInfo {
    id: string;
    name: string;
    status: string;
    chunkCount: number;
}

export default function DocumentChatPage() {
    const params = useParams();
    const router = useRouter();
    const documentId = params.documentId as string;
    const [doc, setDoc] = useState<DocumentInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDoc() {
            try {
                const res = await fetch('/api/documents');
                const data = await res.json();
                if (Array.isArray(data)) {
                    const found = data.find((d: any) => d.id === documentId);
                    if (found) {
                        setDoc(found);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch document', err);
            } finally {
                setLoading(false);
            }
        }
        fetchDoc();
    }, [documentId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!doc) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
                <p>Document not found.</p>
                <button
                    onClick={() => router.push('/dashboard/rag')}
                    className="mt-4 text-blue-600 hover:text-blue-700"
                >
                    ← Back to Documents
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-white">
                <button
                    onClick={() => router.push('/dashboard/rag')}
                    className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
                    title="Back to documents"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-sm font-medium text-slate-800 truncate">{doc.name}</h1>
                    <p className="text-xs text-slate-400">{doc.chunkCount} chunks indexed</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-hidden">
                <ChatInterface documentId={documentId} />
            </div>
        </div>
    );
}
