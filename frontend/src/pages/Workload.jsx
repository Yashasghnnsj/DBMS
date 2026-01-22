import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, TrendingUp, Clock, Calendar, CheckCircle, Settings, Plus, Trash2 } from 'lucide-react';
import { api } from '../utils/api';

const Workload = () => {
    const [scheduleData, setScheduleData] = useState([]);
    const [stats, setStats] = useState(null); // { backlog_count, message }
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, add_task, settings

    // Forms
    const [taskForm, setTaskForm] = useState({
        title: '',
        priority: 'medium',
        estimated_hours: 1.0,
        due_date: '',
        category: 'study'
    });
    const [scheduleSettings, setScheduleSettings] = useState({
        sleep_start: '23:00',
        sleep_end: '07:00',
        school_start: '09:00',
        school_end: '16:00'
    });

    useEffect(() => {
        fetchOptimization();
        fetchSettings();
    }, []);

    const fetchOptimization = async () => {
        try {
            // Fetch Optimized Schedule
            const res = await api.get('/workload/optimize');
            const data = await res.json();
            setScheduleData(data.plan || []);
            setStats({ backlog_count: data.backlog_count, message: data.message });
        } catch (err) {
            console.error("Failed to fetch optimization", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/workload/schedule');
            const data = await res.json();
            if (data.sleep_start) setScheduleSettings(data);
        } catch (err) { console.error(err); }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/workload/tasks', taskForm);
            if (res.ok) {
                alert("Task Added!");
                setTaskForm({ title: '', priority: 'medium', estimated_hours: 1.0, due_date: '', category: 'study' });
                fetchOptimization(); // Refresh
                setActiveTab('overview');
            }
        } catch (err) { alert("Error adding task"); }
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/workload/schedule', scheduleSettings);
            if (res.ok) {
                alert("Schedule Updated! optimized plan recalculating...");
                fetchOptimization();
            }
        } catch (err) { alert("Error updating settings"); }
    };

    const handleDeleteTask = async (id) => {
        if (!window.confirm("Delete this task?")) return;
        try {
            const res = await api.delete(`/workload/tasks/${id}`);
            if (res.ok) {
                fetchOptimization(); // Refresh
            }
        } catch (err) { alert("Error deleting task"); }
    };

    const statusColors = {
        low: 'bg-success-50 text-success-700 border-success-200',
        medium: 'bg-primary-50 text-primary-700 border-primary-200',
        high: 'bg-warning-50 text-warning-700 border-warning-200',
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Loading Workload Manager...</div>;

    return (
        <div className="space-y-12 pb-24 animate-fade-in">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-soft">
                            <Activity size={24} />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Efficiency Engine</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tightest leading-tight">Workload Manager</h1>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">AI-Optimized Schedule synthesis based on your neurological bandwidth.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setLoading(true); fetchOptimization(); }}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-100 transition-all shadow-soft group"
                        title="Recalculate Schedule"
                    >
                        <TrendingUp size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-soft">
                        {['overview', 'add_task', 'settings'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-white shadow-premium text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                {tab.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Insight */}
            <div className={`glass-card p-8 bg-slate-900 hover:bg-slate-900 border-none shadow-premium relative overflow-hidden animate-slide-up`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="flex items-start gap-6 relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stats?.backlog_count > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        <AlertCircle size={28} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-white tracking-tight">Daily Planning Insight</h3>
                        <p className="text-slate-400 font-medium leading-relaxed max-w-3xl">
                            {stats?.message}
                            {stats?.backlog_count > 0 && (
                                <span className="block mt-2 text-amber-500/80 text-sm font-bold uppercase tracking-widest">
                                    [Capacity Warning: {stats.backlog_count} items deferred to backlog]
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6 animate-slide-up">
                    {scheduleData.length > 0 ? scheduleData.map((day, idx) => (
                        <div key={idx} className={`glass-card p-6 flex flex-col h-full border-t-0 shadow-soft hover:shadow-premium transition-all relative group overflow-hidden ${day.stress === 'high' ? 'bg-red-50/30' : ''}`}>
                            <div className={`absolute top-0 left-0 right-0 h-1.5 ${day.stress === 'high' ? 'bg-red-500' : day.stress === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>

                            <div className="mb-6">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{day.day}</span>
                                <div className="text-3xl font-black text-slate-900 tracking-tighter">{day.date.split('-')[2]}</div>
                            </div>

                            {/* Capacity Bar */}
                            <div className="mb-8 space-y-2">
                                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <span>{day.allocated_hours}h LOAD</span>
                                    <span>{day.capacity}h MAX</span>
                                </div>
                                <div className="progress-bar h-2 bg-slate-100">
                                    <div
                                        style={{ width: `${Math.min(100, (day.allocated_hours / day.capacity) * 100)}%` }}
                                        className={`progress-fill ${day.stress === 'high' ? 'from-red-500 to-red-600' : day.stress === 'medium' ? 'from-amber-500 to-amber-600' : 'from-emerald-500 to-emerald-600'}`}
                                    ></div>
                                </div>
                            </div>

                            {/* Tasks List */}
                            <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                {day.tasks.length > 0 ? day.tasks.map(t => (
                                    <div key={t.id} className={`p-4 rounded-2xl shadow-sm border transition-all group/task relative ${t.type === 'manual' ? (t.priority === 'high' ? 'bg-red-50/50 border-red-100 hover:border-red-200' : 'bg-white border-slate-50 hover:border-blue-100') : 'bg-slate-50/50 border-slate-100 border-dashed'}`}>
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <div className="font-black text-slate-800 text-xs tracking-tight truncate leading-tight flex-1">{t.title}</div>
                                            {t.type === 'manual' && (
                                                <button
                                                    onClick={() => handleDeleteTask(t.id)}
                                                    className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/task:opacity-100"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                        {t.course_title && (
                                            <div className="text-[9px] font-bold text-blue-600/60 mb-1">{t.course_title}</div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${t.type === 'manual' ? (t.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600') : 'bg-slate-100 text-slate-500'}`}>
                                                {t.type === 'manual' ? (
                                                    t.priority === 'high' ? 'Urgent' :
                                                        t.priority === 'medium' ? 'Normal' : 'Low'
                                                ) : 'Flexible'}
                                            </span>
                                            <div className="flex items-center gap-1 text-slate-400">
                                                <Clock size={10} />
                                                <span className="text-[10px] font-bold">{t.hours}h</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                        <CheckCircle size={20} className="mb-2" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">No Load</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-24 text-center glass-card border-dashed">
                            <TrendingUp className="mx-auto mb-4 text-slate-300" size={48} />
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Awaiting Schedule Synthesis...</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'add_task' && (
                <div className="max-w-2xl mx-auto glass-card p-12 bg-white animate-slide-up shadow-2xl">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                            <Plus size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add New Task</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add your own study items</p>
                        </div>
                    </div>
                    <form onSubmit={handleAddTask} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Task Title</label>
                            <input type="text" required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-900 transition-all"
                                value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Advanced Calculus Synthesis" />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                                <select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-900 appearance-none" value={taskForm.category} onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}>
                                    <option value="school">School</option>
                                    <option value="study">Study</option>
                                    <option value="exam_prep">Exams</option>
                                    <option value="personal">Personal</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Priority Matrix</label>
                                <select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-900 appearance-none" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                                    <option value="high">Urgent (Do ASAP)</option>
                                    <option value="medium">Normal (Standard)</option>
                                    <option value="low">Low (Flexible)</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Time Needed (Hours)</label>
                                <input type="number" step="0.5" min="0.5" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-900"
                                    value={taskForm.estimated_hours} onChange={e => setTaskForm({ ...taskForm, estimated_hours: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Due Date</label>
                                <input type="date" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-900"
                                    value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="w-full btn btn-primary py-5 text-sm font-black uppercase tracking-widest shadow-premium">Save Task</button>
                    </form>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto glass-card p-12 bg-white animate-slide-up shadow-2xl">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                            <Settings size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Schedule Settings</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Set your study hour limits</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateSettings} className="space-y-10">
                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    <div className="w-1 h-3 bg-blue-600 rounded-full"></div>
                                    Sleep Schedule
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sleep Time</label>
                                        <input type="time" className="w-full px-6 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-900" value={scheduleSettings.sleep_start} onChange={e => setScheduleSettings({ ...scheduleSettings, sleep_start: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Wake Up</label>
                                        <input type="time" className="w-full px-6 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-900" value={scheduleSettings.sleep_end} onChange={e => setScheduleSettings({ ...scheduleSettings, sleep_end: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    <div className="w-1 h-3 bg-slate-900 rounded-full"></div>
                                    School Schedule
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deducted Start</label>
                                        <input type="time" className="w-full px-6 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-900" value={scheduleSettings.school_start} onChange={e => setScheduleSettings({ ...scheduleSettings, school_start: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deducted End</label>
                                        <input type="time" className="w-full px-6 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-900" value={scheduleSettings.school_end} onChange={e => setScheduleSettings({ ...scheduleSettings, school_end: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="w-full btn btn-primary py-5 text-sm font-black uppercase tracking-widest shadow-premium">Update Schedule</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Workload;
