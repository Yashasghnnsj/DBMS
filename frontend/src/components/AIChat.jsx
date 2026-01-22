import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Sparkles, X, Bot, User, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AIChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', content: "Hello! I'm your **Professor AI**. How can I assist your academic journey today?" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    // Determine context
    const getContext = () => {
        const path = window.location.pathname;
        if (path.includes('/quiz/')) {
            const parts = path.split('/quiz/');
            return { type: 'quiz', id: parts[1] };
        }
        if (path.includes('/learning-path')) {
            return { type: 'course', id: null }; // Backend can find active enrollment
        }
        return { type: 'general', id: null };
    };

    const handleSend = async () => {
        if (!inputValue.trim() || loading) return;

        const userMsg = inputValue;
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        const ctx = getContext();

        try {
            const res = await api.post('/chat/message', {
                message: userMsg,
                context_type: ctx.type,
                context_id: ctx.id
            });
            const data = await res.json();

            if (res.ok) {
                setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { role: 'ai', content: "*(System Error: AI connectivity throttled. Please try again in a moment.)*" }]);
        } finally {
            setLoading(false);
        }
    };

    // Load history when opening
    useEffect(() => {
        if (isOpen) {
            const ctx = getContext();
            const fetchHistory = async () => {
                try {
                    let url = `/chat/history?context_type=${ctx.type}`;
                    if (ctx.id) url += `&context_id=${ctx.id}`;

                    const res = await api.get(url);
                    if (res.ok) {
                        const data = await res.json();
                        const history = data.map(msg => ({
                            role: msg.role === 'assistant' ? 'ai' : 'user',
                            content: msg.content
                        }));
                        if (history.length > 0) setMessages(history);
                    }
                } catch (e) { console.error(e); }
            };
            fetchHistory();
        }
    }, [isOpen]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        if (window.confirm("Clear conversation history?")) {
            setMessages([{ role: 'ai', content: "History cleared. How can I help you now?" }]);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
                        className={`pointer-events-auto bg-white/90 backdrop-blur-2xl rounded-[2.5rem] mb-6 flex flex-col overflow-hidden shadow-premium border border-white/50 transition-all duration-500 ring-1 ring-slate-900/5 ${isExpanded ? 'w-[600px] h-[700px]' : 'w-[400px] h-[580px]'
                            }`}
                    >
                        {/* Premium Header */}
                        <div className="p-6 pb-4 flex justify-between items-center relative">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-soft transform rotate-3">
                                    <Sparkles className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Professor AI</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Context Ready</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={clearChat}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
                                    title="Clear History"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-100"
                                >
                                    {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-100"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Context Badge */}
                        <div className="px-6 mb-2">
                            <div className="px-3 py-1 bg-slate-900/5 rounded-full text-[9px] font-black text-slate-500 flex items-center gap-1.5 w-fit border border-slate-900/10 uppercase tracking-widest">
                                <Bot size={10} />
                                ACTIVE CONTEXT: {getContext().type}
                            </div>
                        </div>

                        {/* Chat Content */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-6 hidden-scrollbar bg-gradient-to-b from-transparent to-slate-50/30">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={idx}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-soft ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'
                                        }`}>
                                        {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                                    </div>
                                    <div className={`p-4 rounded-[1.5rem] text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200 shadow-lg'
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-soft prose prose-slate prose-sm max-w-none'
                                        }`}>
                                        {msg.role === 'ai' ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {loading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                        <Bot size={14} />
                                    </div>
                                    <div className="bg-white p-4 rounded-[1.5rem] rounded-tl-none border border-slate-100 shadow-soft">
                                        <div className="flex gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white border-t border-slate-100">
                            <div className="relative flex items-end gap-3 bg-slate-50 rounded-[1.5rem] p-2 pr-3 border border-slate-200 focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-slate-900/5 transition-all duration-300">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Ask anything..."
                                    rows={1}
                                    className="flex-1 bg-transparent border-none rounded-[1.2rem] px-3 py-2 text-sm focus:outline-none text-slate-900 placeholder:text-slate-400 resize-none max-h-32"
                                    style={{ height: 'auto' }}
                                    onInput={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={loading || !inputValue.trim()}
                                    className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all duration-300 disabled:opacity-50 disabled:grayscale group shadow-soft"
                                >
                                    <Send size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </button>
                            </div>
                            <p className="text-[10px] text-center mt-3 font-bold text-slate-300 uppercase tracking-widest">
                                Powered by Gemini 2.5 Intelligence
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`pointer-events-auto w-16 h-16 rounded-[1.8rem] flex items-center justify-center shadow-premium transition-all duration-500 z-50 transform relative overflow-hidden group ${isOpen ? 'bg-slate-900 text-white' : 'bg-slate-900 text-white'
                    }`}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {isOpen ? <X size={28} /> : <Sparkles size={28} className="animate-pulse" />}
            </motion.button>
        </div>
    );
};

export default AIChat;
