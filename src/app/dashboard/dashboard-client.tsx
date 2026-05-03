"use client";

import { SignOutButton } from "@/components/sign-out-button";
import SoftAurora from "@/components/dashboard/SoftAurora";
import FloatingCards from "@/components/dashboard/FloatingCards";
import TargetCursor from "@/components/ui/TargetCursor";

type DashboardClientProps = {
    displayName: string;
    email: string;
    workspaces: any[];
    recentDocs: any[];
    recentChats: any[];
    stats: {
        focusedTime: string;
        quizzesTaken: number;
        totalSpaces: number;
        totalDocs: number;
    };
};

export function UserDashboardClient({
    displayName,
    email,
    workspaces,
    recentDocs,
    recentChats,
    stats
}: DashboardClientProps) {

    return (
        <div 
            className="relative w-screen h-screen overflow-hidden text-white font-sans bg-[#020205]"
        >
            <TargetCursor 
                spinDuration={2}
                hideDefaultCursor={true}
                parallaxOn={true}
            />
            
            {/* LAYER 1: Background Aurora */}
            <div className="absolute inset-0 z-0">
                <SoftAurora
                    speed={0.4}
                    scale={1.2}
                    brightness={0.8}
                    color1="#00d4ff"
                    color2="#e100ff"
                    noiseFrequency={2.0}
                    noiseAmplitude={1.2}
                    bandHeight={0.4}
                    bandSpread={1.2}
                    octaveDecay={0.2}
                    layerOffset={0}
                    colorSpeed={0.8}
                    enableMouseInteraction={true}
                    mouseInfluence={0.15}
                />
            </div>

            {/* LAYER 2: HTML UI Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                
                {/* Header */}
                <header className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between pointer-events-auto">
                    {/* Brand Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center relative">
                            <img 
                                src="/cortex_logo.png" 
                                alt="Cortex Logo" 
                                className="w-full h-full object-contain scale-125"
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-widest text-white leading-tight" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>CORTEX</h1>
                            <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#e100ff]">YOUR STUDY PARTNER</p>
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-6 bg-black/40 px-6 py-3 rounded-full border border-white/10 backdrop-blur-md cursor-target">
                        <div className="text-right">
                            <p className="text-sm font-black uppercase tracking-widest text-white truncate max-w-[120px]">{displayName}</p>
                            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#e100ff]">ACTIVE VOYAGER</p>
                        </div>
                        <div className="w-[1px] h-6 bg-white/20"></div>
                        <div className="cursor-target">
                            <SignOutButton />
                        </div>
                    </div>
                </header>

                {/* Floating Cards */}
                <FloatingCards />

                {/* Footer Center */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full border border-[#e100ff]/50 flex items-center justify-center">
                        <div className="w-3 h-3 bg-[#e100ff] rounded-full" />
                    </div>
                    <p className="text-[10px] font-bold tracking-[0.5em] text-[#e100ff]">CORTEX.SYS</p>
                </div>

                {/* HUD: Bottom Left (Hexagons) */}
                <div className="absolute bottom-8 left-8 opacity-70 flex items-center gap-2">
                    <div className="relative w-16 h-16 animate-[spin_20s_linear_infinite]">
                        <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-[#e100ff] stroke-1">
                            <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" />
                        </svg>
                        <svg viewBox="0 0 100 100" className="absolute top-0 left-0 w-full h-full fill-none stroke-[#e100ff] stroke-[0.5] rotate-90 scale-75">
                            <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" />
                        </svg>
                    </div>
                    <div className="h-[1px] w-24 bg-gradient-to-r from-[#e100ff]/50 to-transparent" />
                </div>

                {/* HUD: Bottom Right (Mechanical Circle & Sparkle) */}
                <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4 opacity-70">
                    <div className="animate-star-sparkle text-white text-2xl leading-none">✦</div>
                    <div className="relative w-20 h-20 animate-[spin_15s_linear_infinite_reverse]">
                        <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-[#e100ff] stroke-1">
                            <circle cx="50" cy="50" r="45" strokeDasharray="4 4" />
                            <circle cx="50" cy="50" r="35" />
                            <circle cx="50" cy="50" r="25" strokeDasharray="10 5" />
                        </svg>
                    </div>
                </div>

            </div>
        </div>
    );
}
