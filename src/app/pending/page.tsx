import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock, ArrowLeft, Brain } from "lucide-react";

export default function PendingPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0A0A0B] p-6 relative overflow-hidden selection:bg-amber-400/30">
            {/* Organic Glow Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="w-full max-w-[480px] z-10 space-y-12">
                <div className="text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full group-hover:bg-amber-500/40 transition-all duration-700" />
                            <div className="relative w-24 h-24 flex items-center justify-center overflow-hidden">
                                <img 
                                    src="/login_logo.png" 
                                    alt="Cortex Logo" 
                                    className="w-full h-full object-contain scale-125"
                                    style={{ imageRendering: 'high-quality' as any }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black tracking-tighter uppercase italic text-white leading-none">Cortex</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Your study partner</p>
                    </div>
                </div>

                <div className="human-card p-12 space-y-10 bg-[#121214]/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] text-center">
                    <div className="mx-auto w-20 h-20 bg-amber-400/10 border border-amber-400/20 rounded-full flex items-center justify-center shadow-2xl">
                        <Clock className="w-10 h-10 text-amber-400 animate-pulse" />
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Trial Awaiting Sync</h2>
                        <p className="text-white/40 text-sm font-medium italic leading-relaxed">
                            Your neural profile has been created successfully and is currently awaiting administrator verification.
                        </p>
                    </div>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                            You will gain entry to the dashboard once the review is complete. This cycle usually takes 24-48 hours.
                        </p>
                    </div>

                    <Button asChild className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-amber-400 hover:text-black font-black uppercase tracking-widest transition-all">
                        <Link href="/login">
                            <ArrowLeft className="w-4 h-4 mr-3" />
                            Back to Core
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
