'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Trash2, Loader2, MessageSquare, Clock, AlertCircle } from 'lucide-react';

interface Document {
    id: string;
    name: string;
    status: 'pending' | 'indexing' | 'completed' | 'failed';
    chunkCount: number;
    createdAt: string;
}

export default function RagPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const fetchDocuments = async () => {
        try {
            const res = await fetch('/api/documents');
            const data = await res.json();
            if (Array.isArray(data)) {
                setDocuments(data);
            }
        } catch (err) {
            console.error('Failed to fetch documents', err);
        }
    };

    useEffect(() => {
        fetchDocuments();
        const interval = setInterval(fetchDocuments, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Upload failed');
            }

            fetchDocuments();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Delete this document and all its chat history?')) return;

        try {
            await fetch(`/api/documents/${id}`, { method: 'DELETE' });
            fetchDocuments();
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `about ${hours} hour${hours > 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    };

    const statusLabel = (status: string) => {
        switch (status) {
            case 'pending': return { text: 'Processing...', color: 'text-yellow-600' };
            case 'indexing': return { text: 'Indexing...', color: 'text-blue-600' };
            case 'completed': return { text: 'Ready', color: 'text-emerald-600' };
            case 'failed': return { text: 'Failed', color: 'text-red-600' };
            default: return { text: status, color: 'text-slate-500' };
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">
                        My Documents
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Upload PDFs and ask questions about them using RAG.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Card Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Upload Card */}
                    <label className="group cursor-pointer">
                        <div className="h-52 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl flex flex-col items-center justify-center gap-3 bg-white hover:bg-blue-50/50 transition-all duration-300 shadow-sm">
                            {uploading ? (
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors duration-300">
                                        <Upload className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-slate-600">Click to upload PDF</p>
                                        <p className="text-xs text-slate-400 mt-0.5">PDF or TXT (MAX 10MB)</p>
                                    </div>
                                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200">
                                        Upload Document
                                    </span>
                                </>
                            )}
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.txt"
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                    </label>

                    {/* Document Cards */}
                    {documents.map((doc) => {
                        const status = statusLabel(doc.status);
                        const isReady = doc.status === 'completed';

                        return (
                            <div
                                key={doc.id}
                                className={`h-52 border border-slate-200 rounded-xl p-5 flex flex-col justify-between bg-white hover:shadow-md transition-all duration-300 ${isReady ? 'cursor-pointer hover:border-blue-300' : ''}`}
                                onClick={() => isReady && router.push(`/dashboard/rag/${doc.id}`)}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, doc.id)}
                                            className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h3 className="text-sm font-medium text-slate-800 mt-3 line-clamp-2 leading-snug" title={doc.name}>
                                        {doc.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                                        <Clock className="w-3 h-3" />
                                        Added {timeAgo(doc.createdAt)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-3">
                                    {doc.status === 'completed' ? (
                                        <button
                                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/dashboard/rag/${doc.id}`);
                                            }}
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            View & Chat
                                        </button>
                                    ) : (
                                        <span className={`text-xs flex items-center gap-1 ${status.color}`}>
                                            {(doc.status === 'pending' || doc.status === 'indexing') && (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            )}
                                            {status.text}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
