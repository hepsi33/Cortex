"use client";

import { SignOutButton } from "@/components/sign-out-button";
import SoftAurora from "@/components/dashboard/SoftAurora";
import FloatingCards from "@/components/dashboard/FloatingCards";

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
            <div className="absolute inset-0 z-10 pointer-events-none overflow-y-auto md:overflow-hidden">
                
                {/* Responsive Header */}
                <header className="flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6 pointer-events-auto">
                    {/* Brand Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center relative">
                            <img 
                                src="/login_logo.png" 
                                alt="Cortex Logo" 
                                className="w-full h-full object-contain scale-150"
                                style={{ mixBlendMode: 'screen' }}
                            />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black tracking-widest text-white leading-tight" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>CORTEX</h1>
                            <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.4em] text-[#e100ff]">YOUR STUDY PARTNER</p>
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-4 md:gap-6 bg-black/40 px-4 md:px-6 py-2 md:py-3 rounded-full border border-white/10 backdrop-blur-md">
                        <div className="text-right">
                            <p className="text-xs md:text-sm font-black uppercase tracking-widest text-white truncate max-w-[120px]">{displayName}</p>
                            <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.3em] text-[#e100ff]">ACTIVE VOYAGER</p>
                        </div>
                        <div className="w-[1px] h-6 bg-white/20"></div>
                        <SignOutButton />
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

                {/* HUD: Bottom Left (Hexagons) - Hidden on Mobile to prevent overlap */}
                <div className="hidden md:flex absolute bottom-8 left-8 opacity-70 items-center gap-2">
                    <div className="relative w-16 h-16 animate-[spin_20s_linear_infinite]">
                        <div className="absolute inset-0 border border-[#e100ff]/20 [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]" />
                        <div className="absolute inset-2 border border-[#e100ff]/40 [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex gap-1">
                            {[1,1,0,1].map((v, i) => <div key={i} className={`w-1 h-3 ${v ? 'bg-[#e100ff]' : 'bg-white/10'}`} />)}
                        </div>
                        <p className="text-[8px] font-bold tracking-widest text-[#e100ff]">NODE.042</p>
                    </div>
                </div>

                {/* HUD: Bottom Right (Scanning) - Hidden on Mobile to prevent overlap */}
                <div className="hidden md:flex absolute bottom-8 right-8 opacity-70 items-end gap-4">
                    <div className="text-right">
                        <p className="text-[8px] font-bold tracking-widest text-[#00d4ff]">SCANNING.CORE</p>
                        <p className="text-[10px] font-black text-white tabular-nums">SYNC: 98.4%</p>
                    </div>
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-2 border-[#00d4ff]/20 rounded-full animate-ping" />
                        <div className="absolute inset-2 border border-[#00d4ff]/40 rounded-full animate-[spin_4s_linear_infinite]" style={{ borderRightColor: 'transparent' }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-1 h-1 bg-[#00d4ff] rounded-full animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
