"use client";

import { PlayCircle, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import "../../app/dashboard/dashboard.css";

export default function FloatingCards() {
    const baseGlassStyle = {
        background: 'rgba(8, 14, 24, 0.55)',
        backdropFilter: 'blur(16px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden pause-on-hover" style={{ top: '15%' }}>
            {/* VIDEOS Card */}
            <div className="absolute animate-card-orbit pointer-events-auto" style={{ animationDelay: '0s' }}>
                <Link href="/dashboard/ai-notes"
                    className="block w-[500px] min-h-[240px] p-8 cursor-pointer animate-card-float-simple group transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.03)] hover:shadow-[0_0_15px_rgba(225,0,255,0.15)] cursor-target"
                    style={{ ...baseGlassStyle }}
                >
                    <div className="flex justify-between items-start mb-6">
                        <p className="text-[10px] font-bold text-white/50 tracking-widest">
                            STATE <span style={{ color: '#e100ff' }}>READY</span>
                        </p>
                    </div>
                    <div className="flex flex-col justify-center h-full gap-4">
                        <div className="flex items-center gap-3">
                            <PlayCircle size={26} color="#e100ff" />
                            <h3 className="text-2xl font-black text-white tracking-widest">VIDEOS</h3>
                        </div>
                        <p className="text-sm text-white/40">Access your synchronized study materials.</p>
                    </div>
                </Link>
            </div>

            {/* PRACTICE Card */}
            <div className="absolute animate-card-orbit pointer-events-auto" style={{ animationDelay: '-5s' }}>
                <Link href="/dashboard/practice"
                    className="block w-[500px] min-h-[240px] p-8 cursor-pointer animate-card-float-simple group transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.03)] hover:shadow-[0_0_15px_rgba(0,212,255,0.15)] cursor-target"
                    style={{ ...baseGlassStyle }}
                >
                    <div className="flex justify-between items-start mb-6">
                        <p className="text-[10px] font-bold text-white/50 tracking-widest">
                            STATE <span style={{ color: '#00d4ff' }}>0 DONE</span>
                        </p>
                    </div>
                    <div className="flex flex-col justify-center h-full gap-4">
                        <div className="flex items-center gap-3">
                            <Star size={26} color="#00d4ff" />
                            <h3 className="text-2xl font-black text-white tracking-widest">PRACTICE</h3>
                        </div>
                        <p className="text-sm text-white/40">Test your knowledge with AI quizzes.</p>
                    </div>
                </Link>
            </div>

            {/* MY SPACE Card */}
            <div className="absolute animate-card-orbit pointer-events-auto" style={{ animationDelay: '-10s' }}>
                <Link href="/dashboard/my-space"
                    className="block w-[500px] min-h-[240px] p-8 cursor-pointer animate-card-float-simple group transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.03)] hover:shadow-[0_0_15px_rgba(225,0,255,0.15)] cursor-target"
                    style={{ ...baseGlassStyle }}
                >
                    <div className="flex justify-between items-start mb-6">
                        <p className="text-[10px] font-bold text-white/50 tracking-widest">
                            STATE <span style={{ color: '#e100ff' }}>0 ACTIVE</span>
                        </p>
                    </div>
                    <div className="flex flex-col justify-center h-full gap-4">
                        <h3 className="text-3xl font-black text-white tracking-widest">MY SPACE</h3>
                        <p className="text-sm text-white/60">Upload files & get answers instantly from your personal AI tutor.</p>
                    </div>
                </Link>
            </div>

            {/* FOCUS Card */}
            <div className="absolute animate-card-orbit pointer-events-auto" style={{ animationDelay: '-15s' }}>
                <Link href="/dashboard/focus"
                    className="block w-[500px] min-h-[240px] p-8 cursor-pointer animate-card-float-simple group transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.03)] hover:shadow-[0_0_15px_rgba(0,212,255,0.15)] cursor-target"
                    style={{ ...baseGlassStyle }}
                >
                    <div className="flex justify-between items-start mb-6">
                        <p className="text-[10px] font-bold text-white/50 tracking-widest">
                            STATE <span style={{ color: '#00d4ff' }}>0M TODAY</span>
                        </p>
                    </div>
                    <div className="flex flex-col justify-center h-full gap-4">
                        <h3 className="text-3xl font-black tracking-widest" style={{ color: '#00d4ff' }}>FOCUS</h3>
                        <p className="text-sm text-white/60">Deep work & nature sounds with clean, distraction-free timers.</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
