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

export function DocumentManager() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        // Poll for status updates every 5 seconds
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
        <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 w-80 p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
            </h2>

            {/* Upload Area */}
            <div className="mb-6">
                <label className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors",
                    uploading ? "opacity-50 pointer-events-none" : "border-slate-300 hover:border-slate-400"
                )}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                        ) : (
                            <>
                                <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                <p className="text-sm text-slate-500">
                                    <span className="font-semibold">Click to upload</span> PDF or TXT
                                </p>
                            </>
                        )}
                    </div>
                    <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleUpload} disabled={uploading} />
                </label>
                {error && (
                    <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {error}
                    </div>
                )}
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {documents.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm mt-10">
                        No documents yet.
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div key={doc.id} className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm group">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="text-sm font-medium text-slate-900 truncate w-40" title={doc.name}>
                                    {doc.name}
                                </h3>
                                <div className="flex gap-1">
                                    {doc.status === 'failed' && (
                                        <button
                                            onClick={() => handleRetry(doc.id)}
                                            className="text-slate-400 hover:text-blue-500 p-1"
                                            title="Retry Indexing"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="text-slate-400 hover:text-red-500 p-1"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusBadge status={doc.status} />
                                <span className="text-xs text-slate-400 ml-auto">
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
            return <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Pending</span>;
        case 'indexing':
            return <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Indexing</span>;
        case 'completed':
            return <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Ready</span>;
        case 'failed':
            return <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Failed</span>;
        default:
            return <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{status}</span>;
    }
}
