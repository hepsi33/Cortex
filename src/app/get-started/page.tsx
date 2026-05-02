import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, Zap, LayoutTemplate, ArrowRight, Brain, BookOpen, Clock, Youtube } from "lucide-react";
import { NavButtons, HeroButtons } from "@/components/nav-buttons";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function GetStartedPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0B] flex flex-col text-white selection:bg-amber-400/30">
            {/* Header */}
            <header className="px-10 h-20 flex items-center justify-between border-b border-white/5 bg-[#0A0A0B]/80 backdrop-blur-3xl sticky top-0 z-50">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                        <img 
                            src="/login_logo.png" 
                            alt="Cortex Logo" 
                            className="w-full h-full object-contain scale-110"
                            style={{ imageRendering: 'high-quality' as any }}
                        />
                    </div>
                    <span className="text-2xl font-black tracking-tighter uppercase italic group-hover:text-amber-400 transition-colors">Cortex</span>
                </Link>
                <div className="flex items-center gap-2">
                    <NavButtons />
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 container mx-auto px-6 py-20 flex flex-col items-center text-center">
                <div className="max-w-4xl space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[10px] font-black uppercase tracking-[0.4em] backdrop-blur-3xl mb-8">
                        <Zap className="w-3 h-3 fill-current" />
                        Next-Gen Learning
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic text-white leading-[0.9]">
                        Master your <span className="text-amber-400">knowledge</span>.
                    </h1>
                    <p className="text-lg md:text-xl text-white/40 font-medium italic leading-relaxed max-w-2xl mx-auto">
                        Cortex is a precision-engineered learning hub designed for focused minds. 
                        Transform videos, manage documents, and conquer exams with the ultimate study companion.
                    </p>
                    <div className="pt-8">
                        <HeroButtons />
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-32 w-full max-w-6xl">
                    <Card className="human-card p-4 bg-[#121214] border border-white/5 group hover:border-amber-400/40 transition-all duration-700">
                        <CardHeader>
                            <div className="p-4 w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-6 group-hover:bg-amber-400 group-hover:text-black transition-all">
                                <Clock className="w-8 h-8" />
                            </div>
                            <CardTitle className="text-2xl font-black italic uppercase tracking-tight text-white">Focus Zones</CardTitle>
                            <CardDescription className="text-white/20 text-[10px] uppercase font-black tracking-widest mt-2">Zero Distraction</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-white/40 italic leading-relaxed">
                                Curated ambient environments and pomodoro tracking designed to put your brain in a flow state.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="human-card p-4 bg-[#121214] border border-white/5 group hover:border-amber-400/40 transition-all duration-700">
                        <CardHeader>
                            <div className="p-4 w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-6 group-hover:bg-amber-400 group-hover:text-black transition-all">
                                <Youtube className="w-8 h-8" />
                            </div>
                            <CardTitle className="text-2xl font-black italic uppercase tracking-tight text-white">AI Mastery</CardTitle>
                            <CardDescription className="text-white/20 text-[10px] uppercase font-black tracking-widest mt-2">Instant Insight</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-white/40 italic leading-relaxed">
                                Transform any lecture or tutorial into precision study notes and interactive visualizations instantly.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="human-card p-4 bg-[#121214] border border-white/5 group hover:border-amber-400/40 transition-all duration-700">
                        <CardHeader>
                            <div className="p-4 w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-6 group-hover:bg-amber-400 group-hover:text-black transition-all">
                                <Brain className="w-8 h-8" />
                            </div>
                            <CardTitle className="text-2xl font-black italic uppercase tracking-tight text-white">Knowledge Vault</CardTitle>
                            <CardDescription className="text-white/20 text-[10px] uppercase font-black tracking-widest mt-2">Neural Storage</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-white/40 italic leading-relaxed">
                                Organize your documents and chat with your files using advanced context-aware RAG technology.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* How It Works */}
                <div className="mt-40 max-w-4xl w-full space-y-16">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">The Flow</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="relative p-10 bg-[#121214] border border-white/5 rounded-[2.5rem] text-left space-y-6">
                            <div className="absolute top-8 right-8 text-5xl font-black italic text-white/5">01</div>
                            <h3 className="text-xl font-black uppercase italic text-amber-400">Sync</h3>
                            <p className="text-sm text-white/40 italic">Create your profile and initialize your personal learning hub.</p>
                        </div>

                        <div className="relative p-10 bg-[#121214] border border-white/5 rounded-[2.5rem] text-left space-y-6">
                            <div className="absolute top-8 right-8 text-5xl font-black italic text-white/5">02</div>
                            <h3 className="text-xl font-black uppercase italic text-amber-400">Forge</h3>
                            <p className="text-sm text-white/40 italic">Upload documents or link videos to build your knowledge base.</p>
                        </div>

                        <div className="relative p-10 bg-[#121214] border border-white/5 rounded-[2.5rem] text-left space-y-6">
                            <div className="absolute top-8 right-8 text-5xl font-black italic text-white/5">03</div>
                            <h3 className="text-xl font-black uppercase italic text-amber-400">Master</h3>
                            <p className="text-sm text-white/40 italic">Engage with AI quizzes and flashcards to achieve total mastery.</p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-40 mb-20 w-full max-w-4xl relative group">
                    <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-[3.5rem] group-hover:bg-amber-400/30 transition-all duration-700" />
                    <Card className="human-card bg-amber-400 border-none p-16 text-center relative overflow-hidden">
                        <div className="space-y-6">
                            <h2 className="text-5xl font-black italic tracking-tighter uppercase text-black leading-none">Ready for deep focus?</h2>
                            <p className="text-black/60 text-lg font-medium italic">
                                Join the collective mind and elevate your learning capacity today.
                            </p>
                            <div className="flex justify-center gap-6 pt-10">
                                <HeroButtons />
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
