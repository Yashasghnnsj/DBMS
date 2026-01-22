import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Clock, CheckCircle, Calendar, BookOpen, Brain, Activity, BarChart3, Zap, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../utils/api';

const StatCard = ({ title, value, change, changeLabel, icon: Icon, color = "primary" }) => {
    const colorClasses = {
        primary: "text-blue-600 bg-blue-500/10",
        success: "text-emerald-600 bg-emerald-500/10",
        warning: "text-amber-600 bg-amber-500/10",
        purple: "text-violet-600 bg-violet-500/10",
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="glass-card p-8 group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 "></div>
            <div className="flex items-start justify-between mb-6 relative z-10">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-4xl font-extrabold text-slate-900 tracking-tighter">{value}</h3>
                </div>
                <div className={`p-4 rounded-[1.25rem] ${colorClasses[color]} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-soft`}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="flex items-center gap-2 text-xs relative z-10">
                <div className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center">
                    <TrendingUp size={12} className="mr-1" />
                    {change}
                </div>
                <span className="text-slate-400 font-bold uppercase tracking-tight">{changeLabel}</span>
            </div>
        </motion.div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [detailedStats, setDetailedStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const fetchData = async () => {
            try {
                const [statsRes, activityRes, detailedRes] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/activity'),
                    api.get('/dashboard/detailed')
                ]);

                if (statsRes.ok) setStats(await statsRes.json());
                if (activityRes.ok) setRecentActivity(await activityRes.json());
                if (detailedRes.ok) setDetailedStats(await detailedRes.json());

            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[80vh] gap-4">
                <Zap className="animate-pulse text-blue-600" size={48} />
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Initializing Intelligence Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-24">
            {/* Premium Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="px-3 py-1 bg-slate-900 rounded-full text-[10px] font-black text-white uppercase tracking-widest">Mastery Status: Active</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Level 12 Scholar</div>
                    </div>
                    <h1 className="text-6xl font-black text-slate-900 tracking-tightest leading-none">
                        Pulse <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Analytics</span>
                    </h1>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xl px-6 py-4 rounded-[2rem] border border-white/50 shadow-soft">
                        <div className="text-right">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Learning Velocity</div>
                            <div className="text-xl font-black text-slate-900">{detailedStats?.learning_velocity || '0.0'} <span className="text-xs text-slate-400">topics/wk</span></div>
                        </div>
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-soft">
                            <Activity size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatCard
                        title="Mastery Quotient"
                        value={stats.focus_score.value}
                        change={stats.focus_score.change}
                        changeLabel={stats.focus_score.label}
                        icon={Target}
                        color="primary"
                    />
                    <StatCard
                        title="Milestones Cleared"
                        value={stats.tasks_completed.value}
                        change={stats.tasks_completed.change}
                        changeLabel={stats.tasks_completed.label}
                        icon={CheckCircle}
                        color="success"
                    />
                    <StatCard
                        title="Academic Burn"
                        value={stats.study_hours.value}
                        change={stats.study_hours.change}
                        changeLabel={stats.study_hours.label}
                        icon={Clock}
                        color="warning"
                    />
                    <StatCard
                        title="Active Syllabi"
                        value={stats.active_courses.value}
                        change={stats.active_courses.change}
                        changeLabel={stats.active_courses.label}
                        icon={BookOpen}
                        color="purple"
                    />
                </div>
            )}

            {/* Analysis Deck */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-10">

                    {/* Mastery Heatmap (Custom CSS) */}
                    <div className="glass-card p-10 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Mastery Heatmap</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Consistency analysis over 30 days</p>
                            </div>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4].map(v => (
                                    <div key={v} className={`w-3 h-3 rounded-sm bg-blue-${v * 2}00 shadow-sm opacity-${20 + v * 20}`} />
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-between">
                            {Array.from({ length: 30 }).map((_, i) => {
                                const day = 29 - i;
                                const date = new Date();
                                date.setDate(date.getDate() - day);
                                const dateStr = date.toISOString().split('T')[0];
                                const count = detailedStats?.heatmap?.find(h => h.date === dateStr)?.count || 0;

                                return (
                                    <motion.div
                                        whileHover={{ scale: 1.2 }}
                                        key={i}
                                        className={`w-10 h-10 rounded-xl transition-all duration-500 shadow-soft border border-black/5 ${count === 0 ? 'bg-slate-50' :
                                            count === 1 ? 'bg-blue-200' :
                                                count === 2 ? 'bg-blue-400' : 'bg-blue-600'
                                            }`}
                                        title={`${dateStr}: ${count} activities`}
                                    />
                                );
                            })}
                        </div>
                        <div className="mt-6 flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            <span>30 Days Ago</span>
                            <span>Today</span>
                        </div>
                    </div>

                    {/* Performance Trends */}
                    <div className="glass-card p-10 bg-slate-900 text-white border-none relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <BarChart3 size={120} />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight mb-8">Concept Mastery Trends</h3>
                        <div className="space-y-8 relative z-10">
                            {detailedStats?.performance_trend?.length > 0 ? detailedStats.performance_trend.map((p, i) => (
                                <div key={i} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-3">
                                            <div className="text-xs font-black uppercase tracking-widest text-slate-500">{p.date}</div>
                                            <div className="text-sm font-bold text-white truncate max-w-[200px]">{p.quiz}</div>
                                        </div>
                                        <div className="text-lg font-black">{p.score}%</div>
                                    </div>
                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${p.score}%` }}
                                            transition={{ duration: 1, delay: i * 0.1 }}
                                            className={`h-full rounded-full shadow-soft ${p.score >= 70 ? 'bg-emerald-400' : 'bg-blue-500'}`}
                                        />
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 opacity-50">Initialize assessments to populate trends</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-10">
                    {/* Strength/Weakness Analysis */}
                    <div className="glass-card p-10">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Proficiency Matrix</h3>
                        <div className="space-y-6">
                            {detailedStats?.strengths?.map((s, i) => (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.category}</span>
                                        <span className={`font-black text-xs px-2 py-0.5 rounded-full ${s.score > 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{s.score}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full">
                                        <div
                                            className={`h-full rounded-full ${s.score > 70 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                            style={{ width: `${s.score}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Flight Deck Shortcuts */}
                    <div className="glass-card p-10 bg-gradient-to-br from-blue-600 to-indigo-700 border-none text-white shadow-blue-200">
                        <h3 className="text-2xl font-black tracking-tight mb-6">Quick Actions</h3>
                        <div className="space-y-4">
                            <button onClick={() => window.location.href = '/courses'} className="w-full flex items-center justify-between p-5 rounded-[1.5rem] bg-white/10 hover:bg-white/20 transition-all border border-white/10 group">
                                <div className="flex items-center gap-4">
                                    <BookOpen size={20} />
                                    <span className="font-bold uppercase tracking-widest text-[10px]">Active Syllabi</span>
                                </div>
                                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button onClick={() => window.location.href = '/learning-path'} className="w-full flex items-center justify-between p-5 rounded-[1.5rem] bg-slate-900 border border-white/5 hover:-translate-y-1 transition-all group shadow-premium">
                                <div className="flex items-center gap-4">
                                    <Brain size={20} className="text-blue-400" />
                                    <span className="font-bold uppercase tracking-widest text-[10px]">Intelligence Sync</span>
                                </div>
                                <Zap size={16} className="text-blue-400 animate-pulse" />
                            </button>
                        </div>
                    </div>

                    {/* Recent Pulse Activity Log */}
                    <div className="glass-card p-10 bg-slate-50 border-slate-100">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Activity Pulse</h3>
                        <div className="space-y-4">
                            {recentActivity.map((activity, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 leading-tight">{activity.task}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
