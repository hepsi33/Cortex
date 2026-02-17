'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, FileText, Globe } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatInterfaceProps {
    workspaceId: string | null;
}

export function ChatInterface({ workspaceId }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);
    const [searchWeb, setSearchWeb] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [activeCitation, setActiveCitation] = useState<number | null>(null);

    // Reset chat when workspace changes
    useEffect(() => {
        setMessages([]);
        setChatId(null);
        setInput('');
    }, [workspaceId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading || !workspaceId) return;

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
                    workspaceId: workspaceId,
                    searchWeb: searchWeb
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
        <div className="flex flex-col h-full bg-[#0b0f19] relative">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-24 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
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
                                : 'bg-[#1f2937] text-gray-200 border border-gray-800'
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
                        <div className="bg-[#1f2937] rounded-xl px-4 py-3 border border-gray-800">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#0b0f19] border-t border-gray-800">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex flex-col gap-2 max-w-3xl mx-auto"
                >
                    <div className="flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={workspaceId ? "Ask a question..." : "Select a workspace to chat"}
                            className="flex-1 bg-[#0f172a] border border-gray-700 text-white placeholder:text-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading || !workspaceId}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim() || !workspaceId}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-[#1f2937] disabled:text-gray-500 text-white rounded-lg px-4 py-2.5 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 px-1">
                        <label className={`flex items-center gap-2 text-xs cursor-pointer ${searchWeb ? 'text-blue-500 font-medium' : 'text-gray-400 hover:text-gray-300'}`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${searchWeb ? 'bg-blue-600 border-blue-600' : 'bg-[#1f2937] border-gray-600'}`}>
                                {searchWeb && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={searchWeb}
                                onChange={(e) => setSearchWeb(e.target.checked)}
                            />
                            <Globe className="w-3 h-3" />
                            Search Web (Firecrawl)
                        </label>
                    </div>
                </form>
            </div>

            {/* Citation Popup */}
            {activeCitation && (
                <div className="absolute bottom-24 right-4 w-72 bg-[#1f2937] border border-gray-800 shadow-lg p-4 rounded-xl text-sm z-10 text-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-white flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-500" /> Source [{activeCitation}]
                        </h4>
                        <button onClick={() => setActiveCitation(null)} className="text-gray-400 hover:text-white text-lg">&times;</button>
                    </div>
                    <p className="text-gray-400 text-xs italic">
                        Source content from the document chunk used to generate this answer.
                    </p>
                </div>
            )}
        </div>
    );
}
