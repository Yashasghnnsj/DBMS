import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Brain, Activity, Target, Zap, ChevronRight, Sparkles, BookOpen } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        viewport={{ once: true }}
        className="glass-card p-10 group hover:bg-white/40 transition-all duration-500 border-white/50"
    >
        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white mb-8 shadow-premium group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
            <Icon size={32} />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{title}</h3>
        <p className="text-slate-500 font-medium leading-relaxed">{description}</p>
    </motion.div>
);

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen mesh-gradient relative overflow-hidden flex flex-col items-center">
            {/* Animated Background Orbs */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 animate-float"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-violet-400/20 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 animate-float" style={{ animationDelay: '-2s' }}></div>

            {/* Navigation Header */}
            <header className="w-full max-w-7xl px-8 py-10 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-premium transform rotate-3 overflow-hidden p-1">
                        <img src="/rvce_logo.png" alt="RVCE Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Academic<br />Companion</span>
                </div>
                <button
                    onClick={() => navigate('/login')}
                    className="px-8 py-3 bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-900 hover:bg-white hover:shadow-soft transition-all"
                >
                    Login
                </button>
            </header>

            {/* Hero Section */}
            <main className="w-full max-w-7xl px-8 pt-20 pb-40 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="inline-flex items-center gap-3 px-6 py-2 bg-slate-900 rounded-full text-[10px] font-black text-white uppercase tracking-widest mb-10 shadow-premium"
                >
                    <Sparkles size={14} className="text-blue-400" />
                    Next-Generation Study Assistant
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-7xl md:text-8xl font-black text-slate-900 tracking-tightest leading-[0.9] mb-12"
                >
                    Master Everything.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
                        Effortlessly.
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-xl md:text-2xl text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed mb-16"
                >
                    The AI-powered companion that researches textbooks, analyzes your reasoning, and optimizes your schedule for elite academic performance.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-6 justify-center"
                >
                    <button
                        onClick={() => navigate('/login')}
                        className="px-12 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-premium hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 group"
                    >
                        Enter Portal <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        className="px-12 py-6 bg-white/80 backdrop-blur-md border border-white/50 text-slate-900 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-soft hover:bg-white hover:-translate-y-1 transition-all"
                    >
                        Learn More
                    </button>
                </motion.div>
            </main>

            {/* Features Section */}
            <section className="w-full max-w-7xl px-8 pb-40 relative z-10">
                <div className="text-center mb-24">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Smart Learning Features</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Built for high-performance students</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    <FeatureCard
                        icon={Brain}
                        delay={0.1}
                        title="Reasoning Assessments"
                        description="Don't just answer; explain your logic. Our AI analyzes your thought process to detect and fix deep conceptual misconceptions in real-time."
                    />
                    <FeatureCard
                        icon={Activity}
                        delay={0.2}
                        title="Better Planning"
                        description="A smart schedule that adapts to your time, sleep hours, and school commitments to prevent stress."
                    />
                    <FeatureCard
                        icon={Zap}
                        delay={0.3}
                        title="Quick Summaries"
                        description="AI research that finds top-rated textbooks and instantly creates study notes for any topic."
                    />
                </div>
            </section>

            {/* Footer */}
            <footer className="w-full bg-white/30 backdrop-blur-xl border-t border-white/50 py-20 px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex items-center gap-4 opacity-50">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-soft overflow-hidden p-0.5">
                            <img src="/rvce_logo.png" alt="RVCE Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-tighter">Academic Companion © 2025</span>
                    </div>
                    <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <a href="#" className="hover:text-slate-900 transition-colors">Twitter</a>
                        <a href="#" className="hover:text-slate-900 transition-colors">GitHub</a>
                        <a href="#" className="hover:text-slate-900 transition-colors">Documentation</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
