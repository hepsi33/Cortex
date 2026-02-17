'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this exists for tailwind-merge

interface Document {
    id: string;
    name: string;
    status: 'pending' | 'indexing' | 'completed' | 'failed';
    createdAt: string;
}

interface DocumentManagerProps {
    workspaceId: string | null;
}

export function DocumentManager({ workspaceId }: DocumentManagerProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDocuments = async () => {
        if (!workspaceId) {
            setDocuments([]);
            return;
        }
        try {
            const res = await fetch(`/api/documents?workspaceId=${workspaceId}`);
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
        // Poll for status updates every 5 seconds
        const interval = setInterval(fetchDocuments, 5000);
        return () => clearInterval(interval);
    }, [workspaceId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        if (workspaceId) {
            formData.append('workspaceId', workspaceId);
        }

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Upload failed');
            }

            // Refresh list
            fetchDocuments();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            await fetch(`/api/documents/${id}`, { method: 'DELETE' });
            fetchDocuments();
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const handleRetry = async (id: string) => {
        try {
            const res = await fetch(`/api/documents/${id}/retry`, { method: 'POST' });
            if (!res.ok) {
                // Warn user about content requirement (as per my implementation note)
                alert('Retry might fail if content was not stored. Please re-upload if it persists.');
            }
            fetchDocuments();
        } catch (err) {
            console.error('Retry failed', err);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#111827] w-full p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <FileText className="w-5 h-5 text-gray-400" />
                Documents
            </h2>

            {/* Upload Area */}
            <div className="mb-6">
                <label className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-[#0f172a] hover:bg-[#1f2937] transition-colors",
                    uploading ? "opacity-50 pointer-events-none" : "border-gray-700 hover:border-gray-600"
                )}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        ) : (
                            <>
                                <Upload className="w-8 h-8 mb-2 text-gray-500" />
                                <p className="text-sm text-gray-400">
                                    <span className="font-semibold text-white">Click to upload</span> PDF or TXT
                                </p>
                            </>
                        )}
                    </div>
                    <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleUpload} disabled={uploading} />
                </label>
                {error && (
                    <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {error}
                    </div>
                )}
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {documents.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm mt-10">
                        No documents yet.
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div key={doc.id} className="p-3 bg-[#1f2937] rounded-lg border border-gray-800 shadow-sm group hover:border-gray-700 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="text-sm font-medium text-gray-200 truncate w-40" title={doc.name}>
                                    {doc.name}
                                </h3>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {doc.status === 'failed' && (
                                        <button
                                            onClick={() => handleRetry(doc.id)}
                                            className="text-gray-400 hover:text-blue-400 p-1"
                                            title="Retry Indexing"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="text-gray-400 hover:text-red-400 p-1"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusBadge status={doc.status} />
                                <span className="text-xs text-gray-500 ml-auto">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'pending':
            return <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">Pending</span>;
        case 'indexing':
            return <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-900/50"><Loader2 className="w-3 h-3 animate-spin" /> Indexing</span>;
        case 'completed':
            return <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full border border-green-900/50">Ready</span>;
        case 'failed':
            return <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full border border-red-900/50">Failed</span>;
        default:
            return <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">{status}</span>;
    }
}
