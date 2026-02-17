'use client';

import { useState, useEffect } from 'react';
import { Plus, Folder, MoreVertical, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface Workspace {
    id: string;
    name: string;
    createdAt: string;
}

interface WorkspaceSelectorProps {
    currentWorkspace: Workspace | null;
    onWorkspaceChange: (workspace: Workspace) => void;
}

export function WorkspaceSelector({ currentWorkspace, onWorkspaceChange }: WorkspaceSelectorProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const fetchWorkspaces = async () => {
        try {
            const res = await fetch('/api/workspaces');
            const data = await res.json();
            if (Array.isArray(data)) {
                setWorkspaces(data);
                // Auto-select first workspace if none selected and workspaces exist
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

    const handleCreate = async () => {
        if (!newWorkspaceName.trim()) return;
        try {
            const res = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newWorkspaceName }),
            });
            const workspace = await res.json();
            if (workspace.id) {
                setWorkspaces([workspace, ...workspaces]);
                onWorkspaceChange(workspace);
                setIsCreateOpen(false);
                setNewWorkspaceName('');
            }
        } catch (error) {
            console.error('Failed to create workspace:', error);
        }
    };

    const handleRename = async () => {
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

    if (loading) return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;

    if (workspaces.length === 0 && !loading) {
        return (
            <div className="flex items-center gap-2">
                <Button onClick={() => setIsCreateOpen(true)} variant="outline" size="sm" className="gap-2 bg-[#1f2937] border-gray-800 text-white hover:bg-[#374151] hover:text-white">
                    <Plus className="w-4 h-4" /> Create Workspace
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="bg-[#111827] border-gray-800 text-white">
                        <DialogHeader><DialogTitle className="text-white">Create New Workspace</DialogTitle></DialogHeader>
                        <Input
                            placeholder="Workspace Name (e.g., Engineering, Q1 Finance)"
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            className="bg-[#0f172a] border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-blue-600"
                        />
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={!newWorkspaceName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white border-none">Create</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            {isRenaming ? (
                <div className="flex items-center gap-1">
                    <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-8 w-40 bg-[#0f172a] border-gray-700 text-white focus-visible:ring-blue-600"
                        autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-gray-800" onClick={handleRename}>
                        <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-gray-800" onClick={() => setIsRenaming(false)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2 min-w-[200px] justify-between bg-[#1f2937] border-gray-800 text-white hover:bg-[#374151] hover:text-white">
                            <span className="flex items-center gap-2 truncate">
                                <Folder className="w-4 h-4 text-blue-500" />
                                {currentWorkspace?.name || "Select Workspace"}
                            </span>
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[200px] bg-[#1f2937] border-gray-800 text-white">
                        {workspaces.map(w => (
                            <DropdownMenuItem key={w.id} onClick={() => onWorkspaceChange(w)} className="justify-between focus:bg-gray-700 focus:text-white cursor-pointer">
                                <span className={w.id === currentWorkspace?.id ? "font-semibold text-white" : "text-gray-300"}>{w.name}</span>
                                {w.id === currentWorkspace?.id && <Check className="w-3 h-3 text-blue-500" />}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <DropdownMenuItem onClick={() => {
                            setRenameValue(currentWorkspace?.name || '');
                            setIsRenaming(true);
                        }} className="focus:bg-gray-700 focus:text-white cursor-pointer">
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Rename Current
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-red-400 focus:text-red-400 focus:bg-gray-700 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Current
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <DropdownMenuItem onClick={() => setIsCreateOpen(true)} className="focus:bg-gray-700 focus:text-white cursor-pointer">
                            <Plus className="w-3.5 h-3.5 mr-2" /> Create New...
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="bg-[#111827] border-gray-800 text-white">
                    <DialogHeader><DialogTitle className="text-white">Create New Workspace</DialogTitle></DialogHeader>
                    <Input
                        placeholder="Workspace Name"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        className="bg-[#0f172a] border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-blue-600"
                    />
                    <DialogFooter>
                        <Button onClick={handleCreate} disabled={!newWorkspaceName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white border-none">Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
