"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles, User, Bot, Globe, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatInterfaceProps {
    workspaceId: string | null;
    chatId?: string;
    mode?: 'strict' | 'learning' | 'research';
}

export function ChatInterface({ workspaceId, chatId, mode = 'strict' }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchWeb, setSearchWeb] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (chatId) fetchMessages();
        
        const handleDocSelection = (e: any) => {
            setSelectedDocIds(e.detail || []);
        };
        const handleChatAction = (e: any) => {
            const prompt = e.detail;
            if (prompt) sendMessage(prompt);
        };

        window.addEventListener('selected-docs-changed', handleDocSelection);
        window.addEventListener('trigger-chat-action', handleChatAction);
        return () => {
            window.removeEventListener('selected-docs-changed', handleDocSelection);
            window.removeEventListener('trigger-chat-action', handleChatAction);
        };
    }, [chatId, workspaceId, selectedDocIds]);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/chat/${chatId}/messages`);
            const data = await res.json();
            if (Array.isArray(data)) setMessages(data);
        } catch (err) {
            console.error(err);
        }
    };

    const sendMessage = async (content: string) => {
        if (!content.trim() || loading) return;

        const userMessage: Message = { role: 'user', content };
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: content,
                    chatId,
                    workspaceId,
                    searchWeb,
                    mode,
                    selectedDocIds
                }),
            });

            if (!res.ok) throw new Error("Failed to send message");

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let assistantContent = "";

            setMessages(prev => [...prev, { role: 'assistant', content: "" }]);

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                assistantContent += chunk;
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
        setInput("");
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0c]/20 backdrop-blur-3xl rounded-[2rem] border border-white/5 overflow-hidden shadow-4xl relative">
            {/* Messages Area */}
            <ScrollArea className="flex-1 px-4 md:px-10 py-6">
                <div className="space-y-10 pb-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center animate-pulse">
                                <Sparkles className="w-10 h-10 text-white/10" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Awaiting Inquiry</p>
                                <p className="text-sm text-white/10 italic max-w-[280px] leading-relaxed">
                                    Your intelligence repository is synced. Ask a question to begin synthesis.
                                </p>
                            </div>
                        </div>
                    )}
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex gap-6",
                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center border transition-all duration-700",
                                msg.role === 'user' 
                                    ? "bg-white/5 border-white/10" 
                                    : "bg-[#e100ff]/10 border-[#e100ff]/20 shadow-[0_0_20px_rgba(225,0,255,0.1)]"
                            )}>
                                {msg.role === 'user' ? <User className="w-5 h-5 text-white/40" /> : <Bot className="w-5 h-5 text-[#e100ff]" />}
                            </div>
                            <div className={cn(
                                "max-w-[85%] p-4 px-6 rounded-3xl text-sm leading-relaxed relative group transition-all duration-700 break-words",
                                msg.role === 'user' 
                                    ? "bg-white text-black font-medium rounded-tr-none shadow-2xl" 
                                    : "bg-white/[0.03] text-white/80 border border-white/5 rounded-tl-none backdrop-blur-xl"
                            )}>
                                <div className="markdown-content">
                                    <ReactMarkdown>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                                <div className={cn(
                                    "absolute -bottom-6 text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity",
                                    msg.role === 'user' ? "right-4 text-white/20" : "left-4 text-[#e100ff]/40"
                                )}>
                                    {msg.role === 'user' ? 'Transmission Sent' : 'Synthesis Complete'}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-6 border-t border-white/5 bg-[#0a0a0c]/60 backdrop-blur-3xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            {selectedDocIds.length > 0 && (
                                <div className="flex items-center gap-2.5 px-4 h-8 bg-amber-400/10 border border-amber-400/20 rounded-xl">
                                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">{selectedDocIds.length} Linked</span>
                                </div>
                            )}
                        </div>
                        <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.2em] italic">Neural Link Active</p>
                    </div>
                    <div className="flex gap-4">
                        <Input
                            placeholder={loading ? "Synthesizing Knowledge..." : "Query your intelligence repository..."}
                            className="h-18 bg-white/5 border-white/5 rounded-[1.5rem] px-8 text-sm focus:border-[#e100ff]/50 transition-all placeholder:text-white/10"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={loading || !input.trim()}
                            className="h-18 w-18 bg-white text-black hover:bg-[#e100ff] hover:text-white rounded-[1.5rem] shrink-0 shadow-3xl transition-all"
                        >
                            {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Send className="w-7 h-7" />}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
