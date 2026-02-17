"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Sparkles, Youtube, FileText, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

export const dynamic = "force-dynamic";

export default function AINotesPage() {
    const [url, setUrl] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

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

            if (!res.ok) {
                throw new Error(data.error || "Failed to generate notes");
            }

            setNotes(data.notes);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Sparkles className="w-8 h-8 text-purple-400" />
                            AI Study Notes
                        </h1>
                        <p className="text-gray-400">Transform YouTube videos into comprehensive study guides</p>
                    </div>
                </div>

                {/* Input Section */}
                <Card className="glass border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Video Source</CardTitle>
                        <CardDescription className="text-gray-400">Paste a YouTube video URL below</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Youtube className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                <Input
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-purple-500"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={handleGenerate}
                                disabled={loading || !url}
                                className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Thinking...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate
                                    </>
                                )}
                            </Button>
                        </div>
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Results Section */}
                {notes && (
                    <Card className="glass border-white/10 animate-fade-in">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/20 rounded-lg">
                                        <FileText className="w-5 h-5 text-green-400" />
                                    </div>
                                    <CardTitle className="text-white">Generated Notes</CardTitle>
                                </div>
                                <Button variant="outline" size="sm" className="border-white/20 text-gray-400 hover:text-white hover:bg-white/10" onClick={() => navigator.clipboard.writeText(notes)}>
                                    Copy to Clipboard
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="prose prose-invert max-w-none prose-headings:text-purple-300 prose-a:text-blue-400 prose-strong:text-white text-gray-300 font-sans leading-relaxed">
                                <ReactMarkdown>{notes}</ReactMarkdown>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
