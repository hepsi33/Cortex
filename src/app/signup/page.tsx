"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chrome } from "lucide-react";
import Link from "next/link";
import SoftAurora from "@/components/dashboard/SoftAurora";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            if (res.ok) {
                router.push("/login?signup=success");
            } else {
                const data = await res.json();
                setError(data.message || "Registration failed");
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#020205] p-6 relative overflow-hidden text-white">
            {/* Soft Aurora Background */}
            <div className="absolute inset-0 z-0">
                <SoftAurora
                    speed={0.4}
                    scale={1.2}
                    brightness={0.8}
                    color1="#00d4ff"
                    color2="#e100ff"
                />
            </div>
            
            <div className="w-full max-w-[440px] z-10 space-y-12">
                <div className="text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-[#e100ff]/20 blur-2xl rounded-full group-hover:bg-[#e100ff]/40 transition-all duration-700" />
                            <div className="relative w-32 h-32 flex items-center justify-center overflow-hidden">
                                <img 
                                    src="/login_logo.png" 
                                    alt="Cortex Logo" 
                                    className="w-full h-full object-contain scale-125"
                                    style={{ imageRendering: 'high-quality' as any, mixBlendMode: 'screen' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">Join Cortex</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#e100ff]">Your study partner</p>
                    </div>
                </div>

                <div className="human-card p-10 space-y-8 bg-[#0a0a0c]/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem]">
                    <div className="space-y-4">
                        <Button 
                            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                            className="w-full h-16 rounded-2xl bg-white text-black hover:bg-gray-100 font-bold text-sm gap-4 transition-all"
                        >
                            <Chrome className="w-5 h-5" />
                            Continue with Google
                        </Button>
                        
                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                            <div className="relative flex justify-center text-[8px] uppercase font-black tracking-widest"><span className="bg-[#0a0a0c]/0 px-4 text-white/20">Or create account</span></div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <Input
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-14 bg-white/5 border-white/10 rounded-xl text-sm focus:border-[#e100ff]/50 transition-colors"
                                required
                            />
                            <Input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-14 bg-white/5 border-white/10 rounded-xl text-sm focus:border-[#e100ff]/50 transition-colors"
                                required
                            />
                            <Input
                                type="password"
                                placeholder="Create Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-14 bg-white/5 border-white/10 rounded-xl text-sm focus:border-[#e100ff]/50 transition-colors"
                                required
                            />
                        </div>
                        
                        {error && <p className="text-[10px] font-black text-[#e100ff] uppercase tracking-widest text-center">{error}</p>}

                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="w-full h-14 rounded-xl bg-[#e100ff] text-white hover:bg-[#c100dd] font-black uppercase tracking-widest shadow-xl shadow-[#e100ff]/10"
                        >
                            {loading ? "Creating Profile..." : "Create Account"}
                        </Button>
                    </form>
                </div>

                <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                        Already a member?{" "}
                        <Link href="/login" className="text-[#00d4ff] hover:text-[#00b4dd] font-bold transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
