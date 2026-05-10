"use client";

import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface PremiumLockProps {
    children: React.ReactNode;
    isPremium: boolean;
    featureName: string;
    description?: string;
    className?: string;
}

/**
 * PREMIUM LOCK COMPONENT
 * 
 * Why: This creates the "Premium SaaS" feel. It lets users see the feature 
 *      but blocks interaction until they upgrade.
 * 
 * How: It uses a CSS backdrop-filter (blur) and an absolute-positioned overlay.
 */
const PremiumLock = ({ 
    children, 
    isPremium, 
    featureName, 
    description = "Unlock this advanced AI feature with Cortex Pro.",
    className = "" 
}: PremiumLockProps) => {
    const router = useRouter();

    // If the user is premium, just show the content normally
    if (isPremium) {
        return <div className={className}>{children}</div>;
    }

    return (
        <div className={`relative group ${className}`}>
            {/* The Actual Content (Blurred) */}
            <div className="select-none pointer-events-none filter blur-[3px] opacity-40 transition-all duration-500">
                {children}
            </div>

            {/* The Lock Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6 text-center">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl max-w-[280px]"
                >
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
                        <Lock className="w-6 h-6 text-indigo-400" />
                    </div>
                    
                    <h3 className="text-white font-bold text-lg mb-2 flex items-center justify-center gap-2">
                        {featureName}
                        <Sparkles className="w-4 h-4 text-amber-400" />
                    </h3>
                    
                    <p className="text-white/60 text-sm mb-6 leading-relaxed">
                        {description}
                    </p>

                    <button
                        onClick={() => router.push('/pricing')}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                    >
                        Upgrade to Pro
                    </button>
                </motion.div>
            </div>
            
            {/* Darken the background slightly */}
            <div className="absolute inset-0 bg-black/10 rounded-xl pointer-events-none" />
        </div>
    );
};

export default PremiumLock;
