'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { FEATURE_FLAGS } from '@/config/features';

const features = [
    { name: 'RAG Repositories', free: '3 max', pro: 'Unlimited' },
    { name: 'AI Generations / Day', free: '10', pro: '1000' },
    { name: 'Focus Session Duration', free: '1 hour', pro: '4 hours' },
    { name: 'Topic-Based Quizzes', free: false, pro: true },
    { name: 'AI Flashcard Generation', free: false, pro: true },
    { name: 'Advanced AI Study Tools', free: false, pro: true },
    { name: 'Priority Support', free: false, pro: true },
];

export default function PricingPage() {
    const [loading, setLoading] = useState(false);
    const [showContactMsg, setShowContactMsg] = useState(false);

    // Load Razorpay script on mount
    useEffect(() => {
        if (FEATURE_FLAGS.ENABLE_STRIPE) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    const handleCheckout = async () => {
        if (!FEATURE_FLAGS.ENABLE_STRIPE) {
            setShowContactMsg(true);
            return;
        }
        setLoading(true);
        try {
            // Step 1: Create order on server
            const res = await fetch('/api/billing/checkout', { method: 'POST' });
            const data = await res.json();

            if (!data.orderId) {
                alert(data.error || 'Failed to create order');
                setLoading(false);
                return;
            }

            // Step 2: Open Razorpay popup
            const options = {
                key: data.keyId,
                amount: data.amount,
                currency: data.currency,
                name: 'Cortex',
                description: 'Cortex Pro — Unlimited AI Study Tools',
                order_id: data.orderId,
                handler: async (response: any) => {
                    // Step 3: Verify payment on server
                    const verifyRes = await fetch('/api/billing/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        }),
                    });
                    const result = await verifyRes.json();
                    if (result.success) {
                        window.location.href = '/dashboard?upgraded=true';
                    } else {
                        alert('Payment verification failed. Contact support.');
                    }
                },
                prefill: {},
                theme: {
                    color: '#e100ff',
                },
                modal: {
                    ondismiss: () => setLoading(false),
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (e) {
            alert('Failed to start checkout');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020205] text-white relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 via-transparent to-violet-900/10 pointer-events-none" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#e100ff]/5 rounded-full blur-[150px] pointer-events-none" />

            {/* Nav */}
            <nav className="relative z-10 p-8">
                <Link href="/dashboard" className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#e100ff] hover:text-white transition-all">
                    <ArrowLeft className="w-4 h-4" /> Dashboard
                </Link>
            </nav>

            {/* Header */}
            <div className="relative z-10 text-center pt-8 pb-16 px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#e100ff] mb-4">Upgrade Your Intelligence</p>
                    <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white mb-4">Choose Your Plan</h1>
                    <p className="text-white/40 text-sm max-w-md mx-auto">Unlock the full power of Cortex AI to supercharge your study sessions.</p>
                </motion.div>
            </div>

            {/* Cards */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 pb-12 grid md:grid-cols-2 gap-8">
                {/* FREE */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 space-y-8">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">Free Tier</p>
                        <h2 className="text-4xl font-black italic text-white">₹0</h2>
                        <p className="text-white/30 text-xs mt-1">Forever free</p>
                    </div>
                    <Link href="/dashboard"
                        className="block w-full text-center py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all">
                        Current Plan
                    </Link>
                    <div className="space-y-4">
                        {features.map((f) => (
                            <div key={f.name} className="flex items-center justify-between text-sm">
                                <span className="text-white/50">{f.name}</span>
                                {typeof f.free === 'string' ? (
                                    <span className="text-white/30 text-xs font-bold">{f.free}</span>
                                ) : f.free ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                    <X className="w-4 h-4 text-white/10" />
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* PRO */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="relative bg-gradient-to-b from-[#e100ff]/10 to-indigo-600/10 border border-[#e100ff]/20 rounded-[2rem] p-8 space-y-8 shadow-[0_0_60px_rgba(225,0,255,0.1)]">
                    <div className="absolute -top-4 right-8 bg-[#e100ff] px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Recommended
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e100ff] mb-2">Pro Tier</p>
                        <h2 className="text-4xl font-black italic text-white">₹499<span className="text-lg text-white/30">/mo</span></h2>
                        <p className="text-white/30 text-xs mt-1">Cancel anytime</p>
                    </div>
                    <button onClick={handleCheckout} disabled={loading}
                        className="w-full py-4 rounded-2xl bg-[#e100ff] text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#e100ff]/80 transition-all shadow-lg shadow-[#e100ff]/20 disabled:opacity-50 flex items-center justify-center gap-2">
                        <Zap className="w-4 h-4" />
                        {loading ? 'Processing...' : 'Upgrade to Pro'}
                    </button>
                    <div className="space-y-4">
                        {features.map((f) => (
                            <div key={f.name} className="flex items-center justify-between text-sm">
                                <span className="text-white/70">{f.name}</span>
                                {typeof f.pro === 'string' ? (
                                    <span className="text-[#e100ff] text-xs font-bold">{f.pro}</span>
                                ) : f.pro ? (
                                    <Check className="w-4 h-4 text-[#e100ff]" />
                                ) : (
                                    <X className="w-4 h-4 text-white/10" />
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Contact/Demo Message (when payments are disabled) */}
            {showContactMsg && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 max-w-lg mx-auto px-6 pb-24">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-center">
                        <p className="text-amber-400 text-sm font-bold mb-2">Payment Gateway Coming Soon</p>
                        <p className="text-white/40 text-xs">For demo access to Pro features, contact the administrator.</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
