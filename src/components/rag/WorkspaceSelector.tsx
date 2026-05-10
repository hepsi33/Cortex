'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Folder, Pencil, Trash2, Check, X, Loader2, LayoutGrid, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import PremiumLock from "@/components/premium/PremiumLock";

interface Workspace {
    id: string;
    name: string;
    createdAt: string;
}

interface WorkspaceSelectorProps {
    currentWorkspace: Workspace | null;
    onWorkspaceChange: (workspace: Workspace | null) => void;
}

export function WorkspaceSelector({ currentWorkspace, onWorkspaceChange }: WorkspaceSelectorProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [creating, setCreating] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [subscription, setSubscription] = useState<{ isPremium: boolean; limits: any } | null>(null);

    useEffect(() => {
        fetchWorkspaces();
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            const res = await fetch('/api/billing/status'); // We'll need this endpoint
            const data = await res.json();
            setSubscription(data);
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
        }
    };

    const fetchWorkspaces = async () => {
        try {
            const res = await fetch('/api/workspaces');
            const data = await res.json();
            if (Array.isArray(data)) {
                setWorkspaces(data);
                if (!currentWorkspace && data.length > 0) {
                    onWorkspaceChange(data[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch workspaces:', error);
        } finally {
            setLoading(false);
        }
    };

    const isLimitReached = !subscription?.isPremium && workspaces.length >= (subscription?.limits?.MAX_REPOS || 3);

    const handleCreate = async () => {
        if (!newWorkspaceName.trim() || creating) return;
        
        // Final safety check
        if (isLimitReached) {
            router.push('/pricing');
            return;
        }

        setCreating(true);
        try {
            const res = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newWorkspaceName }),
            });
            
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const error = new Error(err.error || 'Server error') as any;
                error.details = err.details;
                throw error;
            }

            const workspace = await res.json();
            if (workspace.id) {
                setWorkspaces([workspace, ...workspaces]);
                onWorkspaceChange(workspace);
                setIsCreateOpen(false);
                setNewWorkspaceName('');
            }
        } catch (error: any) {
            if (error.message === 'Limit Reached' || error.details?.includes('upgrade')) {
                router.push('/pricing');
            } else {
                const detail = error.details ? ` (${error.details})` : '';
                alert(`Failed to create space: ${error.message}${detail}`);
            }
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!currentWorkspace || !confirm(`Delete workspace "${currentWorkspace.name}" and all its documents?`)) return;
        try {
            await fetch(`/api/workspaces/${currentWorkspace.id}`, { method: 'DELETE' });
            const remaining = workspaces.filter(w => w.id !== currentWorkspace.id);
            setWorkspaces(remaining);
            onWorkspaceChange(remaining[0] || null);
        } catch (error) {
            console.error('Failed to delete workspace:', error);
        }
    };

    if (loading) {
        return (
            <div className="h-14 w-full bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-center animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-white/20" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                {isRenaming ? (
                    <div className="flex-1 flex items-center gap-2">
                        <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-14 bg-white/5 border-[#e100ff]/30 text-white focus-visible:ring-1 focus-visible:ring-[#e100ff]/50 rounded-2xl"
                            autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-14 w-14 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-2xl" onClick={async () => {
                            if (!currentWorkspace || !renameValue.trim()) return;
                            try {
                                const res = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: renameValue }),
                                });
                                const updated = await res.json();
                                if (updated.id) {
                                    setWorkspaces(workspaces.map(w => w.id === updated.id ? updated : w));
                                    onWorkspaceChange(updated);
                                    setIsRenaming(false);
                                }
                            } catch (error) {
                                console.error('Failed to rename workspace:', error);
                            }
                        }}>
                            <Check className="w-5 h-5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-14 w-14 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl" onClick={() => setIsRenaming(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-14 flex-1 bg-white/[0.03] border-white/5 hover:bg-white/5 hover:border-white/10 text-white rounded-2xl px-6 justify-between transition-all group shadow-xl">
                                    <span className="flex items-center gap-4 truncate">
                                        <div className="w-8 h-8 rounded-xl bg-[#00d4ff]/10 flex items-center justify-center border border-[#00d4ff]/20">
                                            <Folder className="w-4 h-4 text-[#00d4ff]" />
                                        </div>
                                        <span className="text-sm font-black uppercase tracking-widest italic truncate max-w-[140px]">
                                            {currentWorkspace?.name || "Select Space"}
                                        </span>
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[280px] bg-[#0a0a0c]/90 backdrop-blur-3xl border-white/5 text-white rounded-2xl p-2 shadow-4xl animate-in fade-in zoom-in duration-200">
                                <ScrollArea className="max-h-[300px]">
                                    {workspaces.map(w => (
                                        <DropdownMenuItem 
                                            key={w.id} 
                                            onClick={() => onWorkspaceChange(w)} 
                                            className={cn(
                                                "h-12 px-4 rounded-xl flex items-center justify-between cursor-pointer transition-all mb-1",
                                                w.id === currentWorkspace?.id ? "bg-[#e100ff]/10 text-[#e100ff]" : "hover:bg-white/5"
                                            )}
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest truncate">{w.name}</span>
                                            {w.id === currentWorkspace?.id && <Check className="w-3.5 h-3.5" />}
                                        </DropdownMenuItem>
                                    ))}
                                </ScrollArea>
                                <DropdownMenuSeparator className="bg-white/5 my-2" />
                                <DropdownMenuItem onClick={() => {
                                    setRenameValue(currentWorkspace?.name || '');
                                    setIsRenaming(true);
                                }} className="h-12 px-4 rounded-xl hover:bg-white/5 cursor-pointer text-[10px] font-black uppercase tracking-widest">
                                    <Pencil className="w-3.5 h-3.5 mr-3 text-white/40" /> Rename Space
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDelete} className="h-12 px-4 rounded-xl hover:bg-red-500/10 text-red-400 cursor-pointer text-[10px] font-black uppercase tracking-widest">
                                    <Trash2 className="w-3.5 h-3.5 mr-3" /> Purge Space
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5 my-2" />
                                
                                {isLimitReached ? (
                                    <DropdownMenuItem className="p-0 hover:bg-transparent focus:bg-transparent">
                                        <PremiumLock 
                                            isPremium={false} 
                                            featureName="Advanced Repositories" 
                                            description="Free users are limited to 3 repositories. Upgrade to materialize more."
                                            className="w-full"
                                        >
                                            <div className="h-12 px-4 rounded-xl bg-white/5 text-white/20 cursor-not-allowed text-[10px] font-black uppercase tracking-widest flex items-center">
                                                <Plus className="w-3.5 h-3.5 mr-3" /> Initialize New Space
                                            </div>
                                        </PremiumLock>
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => setIsCreateOpen(true)} className="h-12 px-4 rounded-xl bg-white text-black hover:bg-[#e100ff] hover:text-white cursor-pointer text-[10px] font-black uppercase tracking-widest transition-all">
                                        <Plus className="w-3.5 h-3.5 mr-3" /> Initialize New Space
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {isLimitReached ? (
                            <PremiumLock 
                                isPremium={false} 
                                featureName="Repository Limit" 
                                className="h-14 w-14"
                            >
                                <Button size="icon" variant="outline" className="h-full w-full bg-white/5 border-white/5 text-white/20 rounded-2xl cursor-not-allowed">
                                    <Plus className="w-6 h-6" />
                                </Button>
                            </PremiumLock>
                        ) : (
                            <Button 
                                size="icon" 
                                variant="outline" 
                                onClick={() => setIsCreateOpen(true)}
                                className="h-14 w-14 bg-[#e100ff]/10 border-[#e100ff]/20 text-[#e100ff] hover:bg-[#e100ff] hover:text-white rounded-2xl shadow-xl transition-all"
                            >
                                <Plus className="w-6 h-6" />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="bg-[#0a0a0c]/90 backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-10 max-w-xl">
                    <DialogHeader className="space-y-4">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic text-white flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#00d4ff]/10 border border-[#00d4ff]/20 rounded-2xl flex items-center justify-center">
                                <LayoutGrid className="w-6 h-6 text-[#00d4ff]" />
                            </div>
                            New Research Space
                        </DialogTitle>
                        <DialogDescription className="text-xs text-white/20 font-black uppercase tracking-widest leading-relaxed">
                            Define a new specialized intelligence repository.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-8 py-8">
                        <Input
                            placeholder="Space Identifier (e.g. Quantum Physics, Q3 Earnings)"
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            className="h-16 bg-white/5 border-white/5 rounded-2xl px-6 text-sm focus:border-[#00d4ff]/50 transition-all placeholder:text-white/5 font-medium"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <Button 
                            onClick={handleCreate} 
                            disabled={!newWorkspaceName.trim() || creating} 
                            className="w-full h-16 bg-white text-black hover:bg-[#00d4ff] hover:text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-3xl"
                        >
                            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Materialize Space'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
