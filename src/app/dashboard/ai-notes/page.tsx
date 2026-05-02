"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Youtube, ArrowLeft, Zap, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import SoftAurora from "@/components/dashboard/SoftAurora";

export default function VideosPage() {
    const [url, setUrl] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    
    const handleDownload = () => {
        const blob = new Blob([notes], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Cortex_Notes_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleGenerate = async () => {
        if (!url) return;
        setLoading(true);
        setError("");
        setNotes("");
        
        try {
            const res = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoUrl: url }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setNotes(data.notes);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020205] text-white selection:bg-[#e100ff]/30 relative overflow-x-hidden">
            {/* Soft Aurora Background */}
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                <SoftAurora
                    speed={0.4}
                    scale={1.4}
                    brightness={0.6}
                    color1="#00d4ff"
                    color2="#e100ff"
                />
            </div>

            {/* Header */}
            <header className="px-4 md:px-8 h-20 md:h-24 flex items-center justify-between sticky top-0 z-50 bg-[#0a0a0c]/60 backdrop-blur-3xl border-b border-white/5">
                <div className="flex items-center gap-4 md:gap-6">
                    <button 
                        onClick={() => router.push("/dashboard")}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#e100ff] hover:text-white transition-all group cursor-target"
                    >
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase leading-none">AI Notes</h1>
                        <p className="text-[8px] md:text-[10px] text-[#00d4ff] font-black uppercase tracking-widest mt-1">Neural Summarizer</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {notes && (
                        <div className="flex gap-2 md:gap-4">
                            <Button 
                                variant="ghost" 
                                onClick={handleDownload}
                                className="h-10 md:h-14 px-4 md:px-8 rounded-xl md:rounded-2xl bg-white/5 text-white/60 hover:bg-white hover:text-black text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl cursor-target"
                            >
                                <Download className="w-3 h-3 md:w-4 md:h-4 mr-2 md:mr-3" />
                                <span className="hidden sm:inline">Export TXT</span>
                                <span className="sm:hidden">Export</span>
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-16 relative z-10">
                {/* Input Area */}
                {!notes && (
                    <div className="max-w-3xl mx-auto py-12 md:py-24 text-center space-y-8 md:space-y-12">
                        <div className="relative mx-auto w-20 h-20 md:w-28 md:h-28 cursor-target">
                            <div className="absolute inset-0 bg-[#e100ff]/20 blur-2xl rounded-full" />
                            <div className="relative w-full h-full rounded-2xl md:rounded-[2.5rem] bg-[#0a0a0c]/80 backdrop-blur-3xl border border-white/5 flex items-center justify-center shadow-4xl">
                                <Youtube className="w-8 h-8 md:w-12 md:h-12 text-[#e100ff]" />
                            </div>
                        </div>
                        <div className="space-y-3 md:space-y-4">
                            <h2 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase leading-none">What are we learning today?</h2>
                            <p className="text-white/20 text-xs md:text-sm font-medium italic">Transform any lecture or tutorial into precision notes instantly.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 backdrop-blur-3xl shadow-4xl">
                            <Input
                                placeholder="Paste YouTube Link"
                                className="h-12 md:h-16 bg-transparent border-none px-6 md:px-8 text-sm focus:ring-0 placeholder:text-white/10"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                            <Button
                                onClick={handleGenerate}
                                disabled={loading || !url}
                                className="h-12 md:h-16 w-full sm:w-auto px-10 md:px-12 rounded-xl md:rounded-2xl bg-[#e100ff] hover:bg-[#e100ff]/80 text-white font-black uppercase tracking-widest shadow-2xl transition-all cursor-target"
                            >
                                {loading ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <Zap className="w-5 h-5 md:w-6 md:h-6" />}
                            </Button>
                        </div>
                        {error && <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] animate-pulse">{error}</p>}
                    </div>
                )}

                {/* Results */}
                {notes && (
                    <div className="grid grid-cols-1 gap-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        <Card className="human-card p-16 bg-[#0a0a0c]/60 backdrop-blur-3xl border border-white/5">
                            <div className="prose prose-invert max-w-none prose-headings:text-white prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-headings:italic prose-p:text-white/60 prose-p:leading-relaxed prose-strong:text-[#00d4ff] prose-li:text-white/60 prose-hr:border-white/5 space-y-12">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
                            </div>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
