'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, 
    Pause, 
    RotateCcw, 
    CloudRain, 
    Trees, 
    Waves, 
    Wind,
    ArrowLeft,
    Coffee,
    Settings2,
    X,
    LayoutGrid,
    BookOpen,
    Maximize2,
    Minimize2,
    Volume2,
    VolumeX,
    Sparkles
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

const wallpapers = [
    { id: 'jfKfPfyJRdk', name: 'Lofi Study', icon: Coffee }, 
    { id: 'o4qjk8_5gmU', name: 'Rainy Night', icon: CloudRain }, 
    { id: 'hp_Anj_X_x8', name: 'Deep Library', icon: BookOpen }, 
    { id: 'pu5vm4_BqAs', name: 'Wild Nature', icon: Trees }, // User Requested 4K Nature
    { id: 'wqDKLGS-caw', name: 'Deep Space', icon: Wind }, 
];

const ambientSounds = [
    { 
        id: 'rain', 
        name: 'Gentle Rain', 
        icon: CloudRain, 
        type: 'youtube',
        url: 'q76bMs-NwRk' 
    },
    { 
        id: 'birds', 
        name: 'Morning Birds', 
        icon: Trees, 
        type: 'youtube',
        url: 'rYoZgpAEkFs' 
    },
    { 
        id: 'waves', 
        name: 'Ocean Waves', 
        icon: Waves, 
        type: 'youtube',
        url: 'bn9F19Hi1Lk' 
    },
    { 
        id: 'white-noise', 
        name: 'White Noise', 
        icon: Wind, 
        type: 'youtube',
        url: 'nMfPqeZjc2c' 
    },
    { 
        id: 'cafe', 
        name: 'Cafe Ambience', 
        icon: Coffee, 
        type: 'youtube',
        url: 'h2zkV-l_TbY' 
    },
    { 
        id: 'storm', 
        name: 'Thunderstorm', 
        icon: CloudRain, 
        type: 'youtube',
        url: 'xK_m77VZYnc' 
    },
    { 
        id: 'library', 
        name: 'Library focus', 
        icon: BookOpen, 
        type: 'youtube',
        url: '4vIQON2fDWM' 
    },
];

export default function FocusPage() {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [currentWallpaper, setCurrentWallpaper] = useState(wallpapers[0]);
    const [activeSounds, setActiveSounds] = useState<Record<string, number>>({}); 
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSounds, setShowSounds] = useState(false);
    
    const [studyMins, setStudyMins] = useState(25);
    const [breakMins, setBreakMins] = useState(5);
    const [isBreak, setIsBreak] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [totalFocusSeconds, setTotalFocusSeconds] = useState(25 * 60);
    const [completedMilestones, setCompletedMilestones] = useState<number[]>([]);
    const [savedFocusTime, setSavedFocusTime] = useState<number | null>(null);
    const [breakWarning, setBreakWarning] = useState(false);

    const audioElements = useRef<Record<string, HTMLAudioElement>>({});
    const ytPlayers = useRef<Record<string, any>>({});
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        
        // Load YouTube API if needed
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        return () => {
            Object.values(audioElements.current).forEach(audio => {
                audio.pause();
                audio.src = '';
            });
            Object.values(ytPlayers.current).forEach(player => {
                if (player.destroy) player.destroy();
            });
        };
    }, []);

    const initYTPlayer = (soundId: string, videoId: string) => {
        if (!window.YT || !window.YT.Player) return;

        const playerDiv = document.createElement('div');
        playerDiv.id = `yt-player-${soundId}`;
        playerDiv.style.display = 'none';
        document.body.appendChild(playerDiv);

        ytPlayers.current[soundId] = new window.YT.Player(playerDiv.id, {
            height: '0',
            width: '0',
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                loop: 1,
                playlist: videoId,
                controls: 0,
                showinfo: 0,
                modestbranding: 1
            },
            events: {
                onReady: (event: any) => {
                    event.target.setVolume(activeSounds[soundId] || 50);
                    event.target.playVideo();
                }
            }
        });
    };

    const toggleSound = (soundId: string) => {
        const isCurrentlyActive = activeSounds[soundId] !== undefined;
        const sound = ambientSounds.find(s => s.id === soundId);
        if (!sound) return;

        if (isCurrentlyActive) {
            const newActive = { ...activeSounds };
            delete newActive[soundId];
            setActiveSounds(newActive);
            
            if (sound.type === 'native' && audioElements.current[soundId]) {
                audioElements.current[soundId].pause();
            } else if (sound.type === 'youtube' && ytPlayers.current[soundId]) {
                ytPlayers.current[soundId].pauseVideo();
            }
        } else {
            setActiveSounds(prev => ({ ...prev, [soundId]: 50 }));
            setIsMuted(false);

            if (sound.type === 'native') {
                if (!audioElements.current[soundId]) {
                    const audio = new Audio(sound.url);
                    audio.loop = true;
                    audio.crossOrigin = "anonymous";
                    audioElements.current[soundId] = audio;
                }
                audioElements.current[soundId].volume = 0.5;
                audioElements.current[soundId].play().catch(() => {});
            } else if (sound.type === 'youtube') {
                if (!ytPlayers.current[soundId]) {
                    initYTPlayer(soundId, sound.url);
                } else {
                    ytPlayers.current[soundId].playVideo();
                }
            }
        }
    };

    // Sync volume and playback
    useEffect(() => {
        Object.entries(activeSounds).forEach(([id, vol]) => {
            const sound = ambientSounds.find(s => s.id === id);
            if (!sound) return;

            if (sound.type === 'native') {
                const audio = audioElements.current[id];
                if (audio) {
                    if (isMuted) {
                        audio.pause();
                    } else {
                        audio.volume = vol / 100;
                        if (audio.paused) audio.play().catch(() => {});
                    }
                }
            } else if (sound.type === 'youtube') {
                const player = ytPlayers.current[id];
                if (player && player.setVolume) {
                    if (isMuted) {
                        player.pauseVideo();
                    } else {
                        player.setVolume(vol);
                        if (player.getPlayerState && player.getPlayerState() !== 1) {
                            player.playVideo();
                        }
                    }
                }
            }
        });
    }, [activeSounds, isMuted]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    const next = prev - 1;
                    const elapsed = totalFocusSeconds - next;

                    if (!isBreak) {
                        // Check for Milestones
                        let milestones: number[] = [];
                        if (totalFocusSeconds <= 120 * 60) {
                            milestones = [Math.floor(totalFocusSeconds / 2)];
                        } else {
                            for (let m = 60 * 60; m < totalFocusSeconds; m += 60 * 60) {
                                milestones.push(m);
                            }
                        }

                        const upcomingMilestone = milestones.find(m => 
                            !completedMilestones.includes(m) && (m - elapsed) <= 10 && (m - elapsed) > 0
                        );

                        if (upcomingMilestone) {
                            setBreakWarning(true);
                        }

                        const currentMilestone = milestones.find(m => 
                            elapsed >= m && !completedMilestones.includes(m)
                        );

                        if (currentMilestone) {
                            setBreakWarning(false);
                            setSavedFocusTime(next);
                            setCompletedMilestones([...completedMilestones, currentMilestone]);
                            setIsBreak(true);
                            return breakMins * 60;
                        }
                    }
                    return next;
                });
            }, 1000);
        } else if (timeLeft === 0) {
            if (isBreak) {
                // Break ended
                setIsBreak(false);
                if (savedFocusTime !== null) {
                    // Resume from milestone
                    setTimeLeft(savedFocusTime);
                    setSavedFocusTime(null);
                } else {
                    // End of entire focus session
                    setTimeLeft(studyMins * 60);
                    setTotalFocusSeconds(studyMins * 60);
                    setCompletedMilestones([]);
                }
                setIsActive(true);
            } else {
                // Focus session ended naturally
                setIsBreak(true);
                setTimeLeft(breakMins * 60);
                setIsActive(true);
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, isBreak, breakMins, studyMins]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setIsBreak(false);
        setTimeLeft(studyMins * 60);
        setTotalFocusSeconds(studyMins * 60);
        setCompletedMilestones([]);
        setSavedFocusTime(null);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <div 
            ref={containerRef}
            className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden font-sans select-none bg-black text-white"
        >
            {/* Background Wallpaper */}
            <div className={cn(
                "absolute inset-0 pointer-events-none overflow-hidden transition-all duration-1000",
                isBreak ? "opacity-30 blur-md scale-95" : "opacity-100"
            )}>
                <div className="absolute inset-0 bg-black/60 z-[1] backdrop-blur-[1.5px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[115vw] h-[115vh]">
                    {mounted && (
                        <iframe
                            key={currentWallpaper.id}
                            className="w-full h-full object-cover scale-[1.3]"
                            src={`https://www.youtube.com/embed/${currentWallpaper.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${currentWallpaper.id}&rel=0&modestbranding=1&vq=hd2160&enablejsapi=1`}
                            allow="autoplay; encrypted-media"
                            frameBorder="0"
                        />
                    )}
                </div>
            </div>

            {/* Header Area */}
            <div className="absolute top-10 left-10 right-10 flex justify-between items-center z-20">
                <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/5 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#e100ff] hover:text-white transition-all group cursor-target"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Dashboard
                </button>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-3.5 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/5 text-white/40 hover:text-white transition-all hover:bg-white/5 cursor-target"
                    >
                        <Settings2 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={toggleFullscreen}
                        className="p-3.5 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/5 text-white/40 hover:text-white transition-all hover:bg-white/5 cursor-target"
                    >
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Central Content */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center space-y-2">
                <motion.div 
                    key={timeLeft}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 1 }}
                    className="text-[12rem] md:text-[18rem] font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-[0_0_80px_rgba(225,0,255,0.15)] italic"
                >
                    {formatTime(timeLeft)}
                </motion.div>

                <div className="flex items-center gap-10 -translate-y-6">
                    <AnimatePresence>
                        {breakWarning && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="absolute -top-24 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-3xl flex items-center gap-4 shadow-[0_0_50px_rgba(244,63,94,0.1)]"
                            >
                                <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center animate-pulse">
                                    <Coffee className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Neural Break Soon</span>
                                    <span className="text-[8px] font-bold text-rose-500/60 uppercase">System entering recovery in 10s...</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={toggleTimer}
                        className={cn(
                            "w-24 h-24 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 border-2 cursor-target",
                            isActive 
                                ? "bg-white/5 border-white/10 text-white/20 hover:text-white hover:bg-white/10" 
                                : "bg-[#e100ff] text-white border-[#e100ff] scale-105 shadow-[0_0_50px_rgba(225,0,255,0.25)]"
                        )}
                    >
                        {isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current translate-x-1" />}
                    </button>
                    <button
                        onClick={resetTimer}
                        className="w-20 h-20 rounded-[2.2rem] bg-white/5 border border-white/10 text-white/20 hover:text-rose-500 hover:border-rose-500/40 transition-all flex items-center justify-center cursor-target"
                    >
                        <RotateCcw className="w-8 h-8" />
                    </button>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-8 flex justify-center gap-6 z-20">
                <div className="flex bg-[#0a0a0c]/60 backdrop-blur-3xl border border-white/5 p-2.5 rounded-[2.5rem] shadow-4xl items-center">
                    <div className="flex gap-2 pr-6 border-r border-white/10">
                        {wallpapers.map((wp) => (
                            <button
                                key={wp.id}
                                onClick={() => setCurrentWallpaper(wp)}
                                className={cn(
                                    "p-4 rounded-2xl transition-all duration-500 border cursor-target",
                                    currentWallpaper.id === wp.id 
                                        ? "bg-[#e100ff] text-white border-[#e100ff] scale-105 shadow-xl" 
                                        : "bg-white/5 text-white/20 border-white/5 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <wp.icon className="w-5 h-5" />
                            </button>
                        ))}
                    </div>

                    <div className="relative pl-6">
                        <button 
                            onClick={() => setShowSounds(!showSounds)}
                            className={cn(
                                "h-12 px-10 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-4 cursor-target",
                                showSounds ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Ambient Mix
                        </button>

                        <AnimatePresence>
                            {showSounds && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full mb-8 right-0 w-80 bg-[#0a0a0c]/98 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 space-y-8 shadow-4xl"
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Soundscape</p>
                                        <button 
                                            onClick={() => setIsMuted(!isMuted)}
                                            className="text-[10px] font-black text-[#e100ff] hover:text-[#e100ff]/80 uppercase italic flex items-center gap-2 cursor-target"
                                        >
                                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                            {isMuted ? "Unmute" : "Silence"}
                                        </button>
                                    </div>

                                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                                        {ambientSounds.map((sound) => {
                                            const isActive = activeSounds[sound.id] !== undefined;
                                            const soundVolume = activeSounds[sound.id] || 50;

                                            return (
                                                <div key={sound.id} className="space-y-3 p-4 rounded-[2rem] bg-white/5 border border-white/5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "p-2.5 rounded-xl transition-all",
                                                                isActive ? "bg-[#00d4ff] text-black" : "bg-white/5 text-white/40"
                                                            )}>
                                                                <sound.icon className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">{sound.name}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => toggleSound(sound.id)}
                                                            className={cn(
                                                                "px-4 py-1.5 rounded-full text-[8px] font-black uppercase transition-all",
                                                                isActive 
                                                                    ? "bg-[#e100ff] text-white shadow-lg shadow-[#e100ff]/20" 
                                                                    : "bg-white/5 text-white/40 hover:bg-white/10"
                                                            )}
                                                        >
                                                            {isActive ? "Active" : "Enable"}
                                                        </button>
                                                    </div>
                                                    
                                                    {isActive && (
                                                        <div className="pt-2">
                                                            <Slider 
                                                                value={[soundVolume]} 
                                                                onValueChange={(val: number[]) => {
                                                                    setActiveSounds(prev => ({
                                                                        ...prev,
                                                                        [sound.id]: val[0]
                                                                    }));
                                                                }}
                                                                max={100} 
                                                                step={1}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Settings */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center px-6 bg-[#020205]/90 backdrop-blur-3xl"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-md bg-[#0a0a0c] border border-white/5 rounded-[3.5rem] p-10 space-y-10 shadow-4xl"
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="text-3xl font-black italic tracking-tighter uppercase text-white">Neural Config</h3>
                                <button onClick={() => setShowSettings(false)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-target">
                                    <X className="w-5 h-5 text-white/40" />
                                </button>
                            </div>

                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Work Period</label>
                                        <span className="text-xl font-black italic text-[#e100ff]">
                                            {studyMins >= 60 ? `${Math.floor(studyMins / 60)}h ${studyMins % 60}m` : `${studyMins}m`}
                                        </span>
                                    </div>
                                    <Slider 
                                        value={[studyMins]} 
                                        onValueChange={(v) => setStudyMins(v[0])}
                                        min={10} max={240} step={5}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Rest Period</label>
                                        <span className="text-xl font-black italic text-rose-500">
                                            {breakMins >= 60 ? `${Math.floor(breakMins / 60)}h ${breakMins % 60}m` : `${breakMins}m`}
                                        </span>
                                    </div>
                                    <Slider 
                                        value={[breakMins]} 
                                        onValueChange={(v) => setBreakMins(v[0])}
                                        min={5} max={60} step={5}
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={() => {
                                    setIsActive(false);
                                    resetTimer();
                                    setShowSettings(false);
                                }}
                                className="w-full h-14 bg-[#e100ff] text-white rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-[#e100ff]/80 transition-all shadow-2xl cursor-target"
                            >
                                Re-Sync Session
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Neural Break Overlay */}
            <AnimatePresence>
                {isBreak && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md"
                    >
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-center space-y-8"
                        >
                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 bg-rose-500/20 border border-rose-500/40 rounded-[2.5rem] flex items-center justify-center mb-8 animate-pulse shadow-[0_0_50px_rgba(244,63,94,0.2)]">
                                    <Sparkles className="w-10 h-10 text-rose-500" />
                                </div>
                                <h2 className="text-6xl font-black italic uppercase tracking-tighter text-white mb-2">Neural Reset</h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-500/60">Session Paused • Recovery in progress</p>
                            </div>

                            <div className="text-[12rem] font-black italic tabular-nums tracking-tighter text-white drop-shadow-[0_0_100px_rgba(255,255,255,0.1)]">
                                {formatTime(timeLeft)}
                            </div>

                            <button 
                                onClick={() => {
                                    setIsBreak(false);
                                    setTimeLeft(studyMins * 60);
                                    setIsActive(true);
                                }}
                                className="px-12 py-5 bg-white text-black rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-rose-500 hover:text-white transition-all shadow-4xl cursor-target"
                            >
                                Skip Break & Resume
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
