'use client';

import { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Plus, 
    Trophy, 
    ChevronRight, 
    RefreshCw,
    LayoutGrid,
    BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import SoftAurora from '@/components/dashboard/SoftAurora';
import { useRouter } from 'next/navigation';

interface Workspace {
    id: string;
    name: string;
    createdAt: string;
}

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

interface Flashcard {
    front: string;
    back: string;
}

type View = 'workspaces' | 'choice' | 'quiz-setup' | 'flashcard-setup' | 'quiz' | 'flashcards' | 'results';

export default function PracticePage() {
    const [view, setView] = useState<View>('workspaces');
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(false);

    // Quiz State
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState({ correct: 0, wrong: 0 });
    const [difficulty, setDifficulty] = useState('Medium');
    const [quizCount, setQuizCount] = useState([5]);

    // Flashcard State
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [cardCount, setCardCount] = useState([10]);
    const [topic, setTopic] = useState('');
    const [sessionMode, setSessionMode] = useState<'quiz' | 'flashcards' | null>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        fetchWorkspaces();
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            const res = await fetch('/api/user'); // Cortex has a /api/user route for this usually
            const data = await res.json();
            setSubscription(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchWorkspaces = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/workspaces');
            const data = await res.json();
            if (Array.isArray(data)) setWorkspaces(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startQuiz = async () => {
        if (!currentWorkspace) return;
        setLoading(true);
        try {
            const res = await fetch('/api/ai/quiz', {
                method: 'POST',
                body: JSON.stringify({
                    workspaceId: currentWorkspace.id,
                    difficulty,
                    count: quizCount[0]
                })
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setQuizQuestions(data);
                setCurrentQuestionIndex(0);
                setScore({ correct: 0, wrong: 0 });
                setSessionMode('quiz');
                setView('quiz');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startFlashcards = async () => {
        if (!currentWorkspace) return;
        setLoading(true);
        try {
            const res = await fetch('/api/ai/flashcards', {
                method: 'POST',
                body: JSON.stringify({
                    workspaceId: currentWorkspace.id,
                    count: cardCount[0],
                    topic
                })
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setFlashcards(data);
                setCurrentCardIndex(0);
                setIsFlipped(false);
                setSessionMode('flashcards');
                setView('flashcards');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    const handleAnswer = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
        setIsAnswered(true);
        const isCorrect = index === quizQuestions[currentQuestionIndex].correctAnswer;
        
        if (isCorrect) {
            setScore(s => ({ ...s, correct: s.correct + 1 }));
        } else {
            setScore(s => ({ ...s, wrong: s.wrong + 1 }));
        }
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < quizQuestions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            setView('results');
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
            <header className="px-8 h-24 flex items-center justify-between sticky top-0 z-50 bg-[#0a0a0c]/60 backdrop-blur-3xl border-b border-white/5">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => {
                            if (view === 'workspaces') window.location.href = '/dashboard';
                            else setView('workspaces');
                        }}
                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#e100ff] hover:text-white transition-all group cursor-target"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Practice</h1>
                        <p className="text-[10px] text-[#00d4ff] font-black uppercase tracking-widest mt-1">Mastery Engine</p>
                    </div>
                </div>
                {currentWorkspace && view !== 'workspaces' && (
                    <div className="px-6 py-2.5 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-3xl italic">
                        {currentWorkspace.name}
                    </div>
                )}
            </header>

            <main className="max-w-6xl mx-auto px-8 py-8 md:py-12 relative z-10">
                <AnimatePresence mode="wait">
                    {/* View: Workspace Selection */}
                    {view === 'workspaces' && (
                        <motion.div 
                            key="workspaces"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            className="space-y-16"
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-4">
                                    <h2 className="text-5xl font-black tracking-tighter italic uppercase leading-none">Pick a Space</h2>
                                    <p className="text-white/20 text-sm font-medium italic">Select a knowledge source to practice from.</p>
                                </div>
                                <Button 
                                    onClick={() => window.location.href = '/dashboard/my-space'}
                                    className="h-16 px-10 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-[#e100ff] hover:text-white transition-all shadow-2xl cursor-target"
                                >
                                    <Plus className="w-5 h-5 mr-3" />
                                    New Space
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {loading && Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="h-64 rounded-[2.5rem] bg-white/5 animate-pulse border border-white/5" />
                                ))}
                                {!loading && workspaces.map((ws) => (
                                    <button
                                        key={ws.id}
                                        onClick={() => {
                                            setCurrentWorkspace(ws);
                                            setView('choice');
                                        }}
                                        className="group text-left cursor-target"
                                    >
                                        <Card className="human-card h-full p-10 bg-[#0a0a0c]/60 backdrop-blur-3xl hover:border-[#00d4ff]/40 transition-all duration-700 relative overflow-hidden group-hover:-translate-y-2">
                                            <div className="p-5 bg-white/5 rounded-2xl border border-white/10 w-fit mb-10 group-hover:bg-[#00d4ff] group-hover:text-black transition-all duration-700">
                                                <LayoutGrid className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-3xl font-black tracking-tighter uppercase italic mb-4">{ws.name}</h3>
                                            <p className="text-[10px] font-black text-[#e100ff] uppercase tracking-widest">
                                                Active Session
                                            </p>
                                        </Card>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Choice Mode */}
                    {view === 'choice' && (
                        <motion.div 
                            key="choice"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10"
                        >
                            <button onClick={() => setView('quiz-setup')} className="group cursor-target">
                                <Card className="human-card p-12 bg-[#0a0a0c]/60 backdrop-blur-3xl hover:border-[#e100ff]/40 transition-all duration-700 h-full relative overflow-hidden group-hover:-translate-y-2">
                                    <div className="w-20 h-20 rounded-[1.5rem] bg-[#e100ff]/10 border border-[#e100ff]/20 flex items-center justify-center mb-12 group-hover:bg-[#e100ff] group-hover:text-white transition-all duration-700">
                                        <Trophy className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-6">Quiz</h2>
                                    <p className="text-white/20 text-sm italic leading-relaxed mb-10">Neural testing with precision-targeted questions.</p>
                                    <div className="flex items-center text-[#e100ff] font-black uppercase tracking-widest text-[10px]">
                                        Ready to forge <ChevronRight className="w-4 h-4 ml-2" />
                                    </div>
                                </Card>
                            </button>

                            <button onClick={() => setView('flashcard-setup')} className="group cursor-target">
                                <Card className="human-card p-12 bg-[#0a0a0c]/60 backdrop-blur-3xl hover:border-[#00d4ff]/40 transition-all duration-700 h-full relative overflow-hidden group-hover:-translate-y-2">
                                    <div className="w-20 h-20 rounded-[1.5rem] bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center mb-12 group-hover:bg-[#00d4ff] group-hover:text-black transition-all duration-700">
                                        <BookOpen className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-6">Cards</h2>
                                    <p className="text-white/20 text-sm italic leading-relaxed mb-10">Master concepts through spaced repetition.</p>
                                    <div className="flex items-center text-[#00d4ff] font-black uppercase tracking-widest text-[10px]">
                                        Review session <ChevronRight className="w-4 h-4 ml-2" />
                                    </div>
                                </Card>
                            </button>
                        </motion.div>
                    )}

                    {/* Quiz Setup */}
                    {view === 'quiz-setup' && (
                        <motion.div 
                            key="quiz-setup"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="max-w-xl mx-auto human-card bg-[#0a0a0c]/60 backdrop-blur-3xl p-12 space-y-12 shadow-3xl"
                        >
                            <h2 className="text-3xl font-black italic tracking-tighter uppercase text-center">Neural Setup</h2>
                            
                            <div className="space-y-12">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20">
                                        <span>Focus Level</span>
                                        <span className="text-[#e100ff] italic">{difficulty}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['Easy', 'Medium', 'Hard'].map((lvl) => (
                                            <button
                                                key={lvl}
                                                onClick={() => setDifficulty(lvl)}
                                                className={cn(
                                                    "h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-target",
                                                    difficulty === lvl ? "bg-[#e100ff] text-white border-[#e100ff] shadow-xl shadow-[#e100ff]/20" : "bg-white/5 text-white/20 border-white/5"
                                                )}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20">
                                        <span>Capacity</span>
                                        <span className="text-[#e100ff] italic">{quizCount[0]} Units</span>
                                    </div>
                                    <Slider 
                                        value={quizCount} 
                                        onValueChange={(v) => {
                                            if (subscription && !subscription.isPremium && v[0] > 10) {
                                                router.push('/pricing');
                                            } else {
                                                setQuizCount(v);
                                            }
                                        }} 
                                        min={3} max={20} step={1}
                                    />
                                </div>
                            </div>

                            <Button 
                                onClick={startQuiz}
                                disabled={loading}
                                className="w-full h-18 bg-[#e100ff] hover:bg-[#e100ff]/80 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-[#e100ff]/20 cursor-target"
                            >
                                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Initiate Trial"}
                            </Button>
                        </motion.div>
                    )}

                    {/* Quiz UI */}
                    {view === 'quiz' && quizQuestions.length > 0 && (
                        <motion.div 
                            key="quiz"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="max-w-3xl mx-auto space-y-12"
                        >
                            <div className="flex justify-between items-end">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Phase {currentQuestionIndex + 1} / {quizQuestions.length}</p>
                                    <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">{difficulty} Trial</h2>
                                </div>
                                <div className="flex gap-8">
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Mastered</p>
                                        <p className="text-2xl font-black text-emerald-500 italic">{score.correct}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Failed</p>
                                        <p className="text-2xl font-black text-rose-500 italic">{score.wrong}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="human-card bg-[#0a0a0c]/60 backdrop-blur-3xl p-8 md:p-12 space-y-10 min-h-[400px] flex flex-col justify-center shadow-4xl">
                                <h3 className="text-2xl md:text-3xl font-black leading-tight tracking-tight italic">{quizQuestions[currentQuestionIndex].question}</h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
                                        const isCorrect = idx === quizQuestions[currentQuestionIndex].correctAnswer;
                                        const isSelected = selectedOption === idx;
                                        
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(idx)}
                                                disabled={isAnswered}
                                                className={cn(
                                                    "group relative flex items-center p-5 rounded-2xl border-2 text-left transition-all duration-700 cursor-target",
                                                    !isAnswered && "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10",
                                                    isAnswered && isCorrect && "bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/20",
                                                    isAnswered && isSelected && !isCorrect && "bg-rose-500 border-rose-500 text-white shadow-xl shadow-rose-500/20",
                                                    isAnswered && !isSelected && !isCorrect && "opacity-20 scale-[0.98]"
                                                )}
                                            >
                                                <div className="flex items-start w-full">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs mr-8 border transition-colors duration-700 shrink-0",
                                                        !isAnswered && "bg-white/5 border-white/10 text-white/20",
                                                        isAnswered && (isCorrect || isSelected) && "bg-black/20 border-black/10 text-white",
                                                    )}>
                                                        {String.fromCharCode(65 + idx)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="block font-black uppercase text-sm tracking-tight mb-2">{option}</span>
                                                        {isAnswered && isCorrect && (
                                                            <motion.p 
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                className="text-[11px] font-medium leading-relaxed text-black/80 mt-2 border-t border-black/10 pt-2"
                                                            >
                                                                {quizQuestions[currentQuestionIndex].explanation}
                                                            </motion.p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {isAnswered && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center gap-8"
                                >
                                    <Button 
                                        onClick={nextQuestion}
                                        className="h-18 px-16 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-4xl hover:bg-emerald-500 hover:text-white transition-all cursor-target shrink-0"
                                    >
                                        {currentQuestionIndex < quizQuestions.length - 1 ? "Next Phase" : "Final Results"}
                                    </Button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* Flashcard Setup */}
                    {view === 'flashcard-setup' && (
                        <motion.div 
                            key="flashcard-setup"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="max-w-xl mx-auto human-card bg-[#0a0a0c]/60 backdrop-blur-3xl p-12 space-y-12 shadow-3xl"
                        >
                            <h2 className="text-3xl font-black italic tracking-tighter uppercase text-center">Memory Forge</h2>
                            
                            <div className="space-y-12">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20">
                                        <span>Target Topic</span>
                                        <span className="text-[#00d4ff] italic">Precision Focus</span>
                                    </div>
                                    <div className="relative">
                                        <Input 
                                            placeholder={subscription && !subscription.isPremium ? "Topic customization is a Pro feature" : "Specific topic (optional)"}
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            onClick={() => {
                                                if (subscription && !subscription.isPremium) {
                                                    router.push('/pricing');
                                                }
                                            }}
                                            readOnly={subscription && !subscription.isPremium}
                                            className="h-16 bg-white/5 border-white/5 rounded-2xl px-6 text-sm focus:ring-0 placeholder:text-white/10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20">
                                        <span>Batch Size</span>
                                        <span className="text-[#00d4ff] italic">{cardCount[0]} Cards</span>
                                    </div>
                                    <Slider 
                                        value={cardCount} 
                                        onValueChange={(v) => {
                                            if (subscription && !subscription.isPremium && v[0] > 5) {
                                                router.push('/pricing');
                                            } else {
                                                setCardCount(v);
                                            }
                                        }} 
                                        min={5} max={30} step={5}
                                    />
                                </div>
                            </div>

                            <Button 
                                onClick={startFlashcards}
                                disabled={loading}
                                className="w-full h-18 bg-[#00d4ff] hover:bg-[#00d4ff]/80 text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-[#00d4ff]/20 cursor-target"
                            >
                                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Synthesize Batch"}
                            </Button>
                        </motion.div>
                    )}

                    {/* Flashcard Practice */}
                    {view === 'flashcards' && flashcards.length > 0 && (
                        <motion.div 
                            key="flashcards"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-3xl mx-auto space-y-16"
                        >
                            <div className="flex justify-between items-end">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-[#00d4ff] uppercase tracking-widest">Active Recall {currentCardIndex + 1} / {flashcards.length}</p>
                                    <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Spaced Repetition</h2>
                                </div>
                            </div>

                            <div 
                                className="relative w-full h-[500px] cursor-target perspective-1000 group"
                                onClick={() => setIsFlipped(!isFlipped)}
                            >
                                <motion.div 
                                    className={cn(
                                        "w-full h-full duration-700 preserve-3d transition-all",
                                        isFlipped && "rotate-y-180"
                                    )}
                                >
                                    {/* Front */}
                                    <Card className="absolute inset-0 backface-hidden human-card p-16 md:p-24 bg-[#0a0a0c]/60 backdrop-blur-3xl border border-white/5 flex flex-col items-center justify-center text-center">
                                        <div className="absolute top-10 left-10 w-10 h-10 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center text-[#00d4ff] font-black italic">
                                            Q
                                        </div>
                                        <h3 className="text-4xl font-black italic leading-tight tracking-tight">{flashcards[currentCardIndex].front}</h3>
                                        <p className="absolute bottom-10 text-[8px] font-black uppercase tracking-[0.3em] text-white/10">Click to reveal Neural Answer</p>
                                    </Card>

                                    {/* Back */}
                                    <Card className="absolute inset-0 backface-hidden rotate-y-180 human-card p-16 md:p-24 bg-[#00d4ff] border border-[#00d4ff]/40 flex flex-col items-center justify-center text-center text-black">
                                        <div className="absolute top-10 left-10 w-10 h-10 rounded-xl bg-black/10 border border-black/10 flex items-center justify-center font-black italic">
                                            A
                                        </div>
                                        <h3 className="text-3xl font-bold leading-relaxed">{flashcards[currentCardIndex].back}</h3>
                                    </Card>
                                </motion.div>
                            </div>

                            <div className="flex justify-center gap-6">
                                <Button 
                                    disabled={currentCardIndex === 0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentCardIndex(i => i - 1);
                                        setIsFlipped(false);
                                    }}
                                    className="h-16 px-10 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black font-black uppercase tracking-widest transition-all cursor-target"
                                >
                                    Prev
                                </Button>
                                <Button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (currentCardIndex < flashcards.length - 1) {
                                            setCurrentCardIndex(i => i + 1);
                                            setIsFlipped(false);
                                        } else {
                                            setView('results');
                                        }
                                    }}
                                    className="h-16 px-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-[#00d4ff] hover:text-black transition-all shadow-4xl cursor-target"
                                >
                                    {currentCardIndex < flashcards.length - 1 ? "Next Card" : "Complete Review"}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Results View */}
                    {view === 'results' && (
                        <motion.div 
                            key="results"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl mx-auto text-center space-y-12"
                        >
                            <div className="w-32 h-32 rounded-[2.5rem] bg-[#00d4ff]/20 border border-[#00d4ff]/40 flex items-center justify-center mx-auto shadow-4xl animate-bounce">
                                <Trophy className="w-16 h-16 text-[#00d4ff]" />
                            </div>
                            <div className="space-y-6">
                                <h2 className="text-6xl font-black tracking-tighter uppercase italic leading-none">Session Complete</h2>
                                <p className="text-white/20 text-lg font-medium italic">Neural pathways strengthened. Information encoded.</p>
                            </div>

                            {sessionMode === 'quiz' ? (
                                <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
                                    <div className="human-card p-10 bg-[#0a0a0c]/60 backdrop-blur-3xl border border-emerald-500/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Mastered</p>
                                        <p className="text-4xl font-black text-emerald-500 italic">{score.correct}</p>
                                    </div>
                                    <div className="human-card p-10 bg-[#0a0a0c]/60 backdrop-blur-3xl border border-rose-500/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Failed</p>
                                        <p className="text-4xl font-black text-rose-500 italic">{score.wrong}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="human-card p-10 max-w-sm mx-auto bg-[#0a0a0c]/60 backdrop-blur-3xl border border-[#00d4ff]/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Cards Reviewed</p>
                                    <p className="text-5xl font-black text-[#00d4ff] italic">{flashcards.length}</p>
                                </div>
                            )}

                            <Button 
                                onClick={() => setView('workspaces')}
                                className="h-18 px-16 bg-[#e100ff] hover:bg-[#e100ff]/80 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-4xl cursor-target"
                            >
                                Return to Hub
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
