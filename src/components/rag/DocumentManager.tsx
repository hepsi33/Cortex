"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Link as LinkIcon, File, X, Loader2, CheckCircle2, AlertCircle, Globe, Youtube, Trash2, CheckSquare, Square, ExternalLink, Sparkles } from "lucide-react";
import { uploadDocumentAction } from "@/lib/actions/upload-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogTrigger 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Document {
    id: string;
    name: string;
    fileType: string;
    status: string;
    chunkCount: number;
    processedCount: number;
    createdAt: string;
}

export function DocumentManager({ workspaceId }: { workspaceId: string | null }) {
    const [docs, setDocs] = useState<Document[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [url, setUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [showUrlDialog, setShowUrlDialog] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<null | 'selected' | string>(null);

    // Reset selection when workspace changes
    useEffect(() => {
        setSelectedIds(new Set());
        window.dispatchEvent(new CustomEvent('selected-docs-changed', { detail: [] }));
    }, [workspaceId]);

    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        if (!workspaceId) return;
        fetchDocs();
        const interval = setInterval(fetchDocs, 10000); // Increased to 10s to be safer
        return () => clearInterval(interval);
    }, [workspaceId]);

    const fetchDocs = async () => {
        if (isFetching) return;
        setIsFetching(true);
        try {
            const res = await fetch(`/api/documents?workspaceId=${workspaceId}`);
            if (!res.ok) {
                console.warn(`[Docs] Fetch failed: ${res.status} ${res.statusText}`);
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) setDocs(data);
        } catch (err) {
            console.error('[Docs] Failed to fetch documents:', err);
        } finally {
            setLoading(false);
            setIsFetching(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("workspaceId", workspaceId || "");

                const res = await uploadDocumentAction(formData);
                
                if (!res.success) {
                    if (res.error === 'Limit Reached') {
                        router.push('/pricing');
                        break;
                    }
                    const msg = `Failed to upload ${file.name}: ${res.error}`;
                    console.error(msg);
                    alert(msg);
                }
            }
            fetchDocs();
        } catch (err) {
            console.error(err);
            alert("Connection error during upload. Please try again.");
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleUrlUpload = async () => {
        if (!url) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("url", url);
            formData.append("workspaceId", workspaceId || "");

            const res = await uploadDocumentAction(formData);
            if (res.success) {
                setUrl("");
                setShowUrlDialog(false);
                fetchDocs();
            } else {
                if (res.error === 'Limit Reached') {
                    router.push('/pricing');
                } else {
                    alert(`Failed to process link: ${res.error}`);
                }
            }
        } catch (err) {
            console.error(err);
            alert("Network error processing link.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        
        try {
            const idsToDelete = Array.from(selectedIds);
            await Promise.all(idsToDelete.map(id => 
                fetch(`/api/documents/${id}`, { method: "DELETE" })
            ));
            setSelectedIds(new Set());
            window.dispatchEvent(new CustomEvent('selected-docs-changed', { detail: [] }));
            setShowDeleteConfirm(null);
            fetchDocs();
        } catch (err) {
            console.error(err);
            alert("Error deleting some documents.");
        }
    };

    const handleDeleteSingle = async (id: string) => {
        try {
            await fetch(`/api/documents/${id}`, { method: "DELETE" });
            setShowDeleteConfirm(null);
            fetchDocs();
        } catch (err) {
            console.error(err);
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
        window.dispatchEvent(new CustomEvent('selected-docs-changed', { detail: Array.from(next) }));
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === docs.length && docs.length > 0) {
            setSelectedIds(new Set());
            window.dispatchEvent(new CustomEvent('selected-docs-changed', { detail: [] }));
        } else {
            const next = new Set(docs.map(d => d.id));
            setSelectedIds(next);
            window.dispatchEvent(new CustomEvent('selected-docs-changed', { detail: docs.map(d => d.id) }));
        }
    };

    return (
        <div className="h-full flex flex-col space-y-8 p-4 md:p-6">
            {/* Unified Upload Center */}
            <div className="space-y-4">
                <div className="relative group">
                    <div className={cn(
                        "flex items-center gap-4 h-20 px-6 rounded-[1.5rem] bg-white/[0.03] border border-white/5 focus-within:border-[#e100ff]/50 transition-all shadow-2xl",
                        uploading && "opacity-50 pointer-events-none"
                    )}>
                        <div className="relative">
                            <input
                                type="file"
                                multiple
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-[#e100ff] group-hover:text-white transition-all shadow-lg">
                                <Upload className="w-5 h-5 text-white/40 group-hover:text-white" />
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                            <p className="text-xs font-black uppercase tracking-widest text-white/60">Upload Documents</p>
                        </div>

                        <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
                            <DialogTrigger asChild>
                                <button className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#e100ff]/30 transition-all group/btn shadow-2xl">
                                    <div className="flex items-center gap-2">
                                        <Youtube className="w-3.5 h-3.5 text-red-500" />
                                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase text-white/40 tracking-widest group-hover/btn:text-white transition-colors">AI READY</span>
                                </button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#0a0a0c]/90 backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-10 max-w-xl">
                                <DialogHeader className="space-y-4">
                                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic text-white flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#e100ff]/10 border border-[#e100ff]/20 rounded-2xl flex items-center justify-center">
                                            <ExternalLink className="w-6 h-6 text-[#e100ff]" />
                                        </div>
                                        Ingest Link
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-white/20 font-black uppercase tracking-widest leading-relaxed">
                                        Connect a website or YouTube video to your intelligence repository.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-8 py-8">
                                    <div className="relative group/input">
                                        <Input
                                            placeholder="https://youtube.com/watch?v=... or https://example.com"
                                            className="h-16 bg-white/5 border-white/5 rounded-2xl px-6 text-sm focus:border-[#e100ff]/50 transition-all placeholder:text-white/5 font-medium"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUrlUpload()}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleUrlUpload}
                                        disabled={!url || uploading}
                                        className="w-full h-16 bg-white text-black hover:bg-[#e100ff] hover:text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-3xl flex items-center justify-center gap-3"
                                    >
                                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                        Initialize Synthesis
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest text-center px-6">
                    Universal Knowledge Input: PDF, DOCX, Images, URLs, YouTube
                </p>
            </div>

            {/* Document Pile */}
            <div className="flex-1 flex flex-col min-h-0 space-y-6 mt-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                        {docs.length > 0 && (
                            <button 
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-amber-400 transition-colors"
                            >
                                {selectedIds.size === docs.length ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}
                                {selectedIds.size === docs.length ? "DESELECT ALL" : "SELECT ALL"}
                            </button>
                        )}
                        {selectedIds.size > 0 && (
                            <button 
                                onClick={() => setShowDeleteConfirm('selected')}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 shadow-lg shadow-red-500/5"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                DELETE ({selectedIds.size})
                            </button>
                        )}
                    </div>
                </div>

                <ScrollArea className="flex-1 pr-4 -mr-4 h-full">
                    <div className="grid gap-3 pb-20">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-20">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Scanning Repository</p>
                            </div>
                        ) : docs.length === 0 ? (
                            <div className="text-center py-20 border border-white/5 rounded-[2rem] bg-white/[0.01] opacity-20">
                                <p className="text-[10px] font-black uppercase tracking-widest italic">Knowledge Pile Empty</p>
                            </div>
                        ) : (
                            docs.map((doc) => (
                                <div
                                    key={doc.id}
                                    className={cn(
                                        "group flex items-center gap-4 p-5 rounded-2xl border transition-all",
                                        selectedIds.has(doc.id) ? "bg-amber-400/5 border-amber-400/20" : "bg-white/[0.02] border-white/5 hover:border-white/10"
                                    )}
                                >
                                    <button 
                                        onClick={() => toggleSelect(doc.id)}
                                        className="shrink-0 text-white/10 hover:text-amber-400 transition-colors"
                                    >
                                        {selectedIds.has(doc.id) ? <CheckSquare className="w-5 h-5 text-amber-400" /> : <Square className="w-5 h-5" />}
                                    </button>
                                    <div className="p-3 bg-white/5 rounded-xl shrink-0">
                                        {doc.fileType === "url" ? <Globe className="w-4 h-4 text-blue-400" /> : 
                                         doc.fileType === "youtube" ? <Youtube className="w-4 h-4 text-red-500" /> :
                                         <File className="w-4 h-4 text-white/40" />}
                                    </div>
                                    <div className="min-w-0 flex-1 py-1">
                                        <p className="text-[11px] font-black uppercase tracking-tight leading-tight text-white/90 break-all line-clamp-2 pr-2">{doc.name}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {doc.status === "processing" ? (
                                                <span className="flex items-center gap-1.5 text-[8px] font-black text-amber-400 uppercase tracking-widest">
                                                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Syncing
                                                </span>
                                            ) : doc.status === "indexing" ? (
                                                <div className="flex flex-col gap-1 w-full max-w-[120px]">
                                                    <span className="flex items-center gap-1.5 text-[8px] font-black text-[#00d4ff] uppercase tracking-widest">
                                                        <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Indexing {doc.chunkCount > 0 ? `(${Math.round((doc.processedCount || 0) / doc.chunkCount * 100)}%)` : ''}
                                                    </span>
                                                    {doc.chunkCount > 0 && (
                                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-[#00d4ff] transition-all duration-500" 
                                                                style={{ width: `${Math.round((doc.processedCount || 0) / doc.chunkCount * 100)}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : doc.status === "completed" ? (
                                                <span className="flex items-center gap-1.5 text-[8px] font-black text-green-500 uppercase tracking-widest">
                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Context Ready
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-[8px] font-black text-red-500 uppercase tracking-widest">
                                                    <AlertCircle className="w-2.5 h-2.5" /> Failed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowDeleteConfirm(doc.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 h-10 w-10 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* In-App Deletion Confirmation */}
            <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
                <DialogContent className="bg-[#0a0a0c]/90 backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-10 max-w-sm">
                    <DialogHeader className="space-y-4">
                        <DialogTitle className="text-xl font-black uppercase tracking-tighter italic text-white flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            Confirm Removal
                        </DialogTitle>
                        <DialogDescription className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                            {showDeleteConfirm === 'selected' 
                                ? `Are you sure you want to remove ${selectedIds.size} selected documents from your repository?`
                                : `Are you sure you want to remove this document from your repository?`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 pt-6">
                        <Button
                            variant="ghost"
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (showDeleteConfirm === 'selected') handleDeleteSelected();
                                else handleDeleteSingle(showDeleteConfirm as string);
                            }}
                            className="flex-1 h-12 bg-red-500 text-white hover:bg-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-red-500/20"
                        >
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
