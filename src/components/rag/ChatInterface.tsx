'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, FileText } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatInterfaceProps {
    documentId: string;
}

export function ChatInterface({ documentId }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [activeCitation, setActiveCitation] = useState<number | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    chatId: chatId,
                    documentId: documentId,
                }),
            });

            if (!res.ok) throw new Error('Failed to send message');

            const newChatId = res.headers.get('X-Chat-Id');
            if (newChatId && !chatId) {
                setChatId(newChatId);
            }

            if (!res.body) return;
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '',
            };

            setMessages((prev) => [...prev, assistantMsg]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value);
                assistantMsg.content += text;

                setMessages((prev) => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { ...assistantMsg };
                    return newMsgs;
                });
            }

        } catch (err) {
            console.error(err);
            setMessages((prev) => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
            }]);
        } finally {
            setLoading(false);
        }
    };

    const renderContent = (content: string) => {
        const parts = content.split(/(\[\d+\])/g);

        return parts.map((part, index) => {
            if (part.match(/^\[\d+\]$/)) {
                return (
                    <button
                        key={index}
                        onClick={() => setActiveCitation(parseInt(part.replace(/[\[\]]/g, '')))}
                        className="text-blue-600 hover:text-blue-700 font-semibold mx-0.5 inline-flex items-center text-xs bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"
                        title="View Source"
                    >
                        {part}
                    </button>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-24">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Bot className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">Ask a question about this document</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                                }`}
                        >
                            {msg.role === 'user' ? (
                                msg.content
                            ) : (
                                <div className="whitespace-pre-wrap">{renderContent(msg.content)}</div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-100 rounded-xl px-4 py-3 border border-slate-200">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex gap-2 max-w-3xl mx-auto"
                >
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your question..."
                        className="flex-1 bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg px-4 py-2.5 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>

            {/* Citation Popup */}
            {activeCitation && (
                <div className="absolute bottom-24 right-4 w-72 bg-white border border-slate-200 shadow-lg p-4 rounded-xl text-sm z-10">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-500" /> Source [{activeCitation}]
                        </h4>
                        <button onClick={() => setActiveCitation(null)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
                    </div>
                    <p className="text-slate-500 text-xs italic">
                        Source content from the document chunk used to generate this answer.
                    </p>
                </div>
            )}
        </div>
    );
}
