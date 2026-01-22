import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Activity, Award, TrendingUp, Search, Shield, Trash2, Cpu, HardDrive, Zap, BarChart3, ChevronRight, Globe, Server, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';

const AdminStatCard = ({ title, value, icon: Icon, color }) => (
    <div className="glass-card p-6 flex items-center justify-between">
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-3xl font-black text-slate-900">{value}</h3>
        </div>
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 shadow-soft`}>
            <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        total_users: 0,
        active_users: 0,
        total_courses: 0,
        total_enrollments: 0
    });
    const [userProgress, setUserProgress] = useState([]);
    const [systemStatus, setSystemStatus] = useState(null);
    const [engagement, setEngagement] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, users, system, insights
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const [statsRes, progressRes, systemRes, engagementRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/admin/user-progress'),
                    api.get('/admin/system-status'),
                    api.get('/admin/engagement-metrics')
                ]);

                if (statsRes.ok) setStats(await statsRes.json());
                if (progressRes.ok) setUserProgress(await progressRes.json());
                if (systemRes.ok) setSystemStatus(await systemRes.json());
                if (engagementRes.ok) setEngagement(await engagementRes.json());
            } catch (error) {
                console.error("Failed to fetch admin data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, []);

    const handleToggleAdmin = async (studentId) => {
        try {
            const res = await api.post(`/admin/users/${studentId}/toggle-admin`, {});
            if (res.ok) {
                const data = await res.json();
                setUserProgress(prev => prev.map(u =>
                    u.student_id === studentId ? { ...u, is_admin: data.is_admin } : u
                ));
            }
        } catch (error) { console.error(error); }
    };

    const handleDeleteUser = async (studentId) => {
        if (!window.confirm("Delete this user permanently?")) return;
        try {
            const res = await api.delete(`/admin/users/${studentId}`);
            if (res.ok) {
                setUserProgress(prev => prev.filter(u => u.student_id !== studentId));
            }
        } catch (error) { console.error(error); }
    };

    const filteredUsers = userProgress.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
                <Server className="animate-pulse text-blue-600" size={48} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sychronizing Intelligence Layer...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-32">
            {/* Professional Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-premium">
                            <Shield size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Control</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tightest leading-tight">Admin Dashboard</h1>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">Track site usage and manage student performance across the entire system.</p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-soft">
                    {['overview', 'users', 'system', 'insights'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-white shadow-premium text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {tab === 'users' ? 'User Directory' : tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <AdminStatCard
                                title="Total Students"
                                value={stats.total_users}
                                icon={Users}
                                color="bg-blue-600"
                            />
                            <AdminStatCard
                                title="Active Users"
                                value={stats.active_users}
                                icon={Activity}
                                color="bg-emerald-500"
                            />
                            <AdminStatCard
                                title="Total Courses"
                                value={stats.total_courses}
                                icon={BookOpen}
                                color="bg-violet-600"
                            />
                            <AdminStatCard
                                title="Enrollments"
                                value={stats.total_enrollments}
                                icon={Award}
                                color="bg-amber-500"
                            />
                        </div>

                        {/* Recent Performance Snapshot */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="glass-card p-10 bg-slate-900 !hover:bg-slate-900 hover:bg-slate-900 text-white border-none relative overflow-hidden">
                                <h3 className="text-xl font-black mb-8 tracking-tight flex items-center gap-2 text-white">
                                    <TrendingUp size={20} className="text-blue-400" />
                                    Growth Trajectory
                                </h3>
                                <div className="flex items-end gap-3 h-48 px-4">
                                    {engagement?.enrollment_trend.map((val, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                            <div
                                                className="w-full bg-blue-500/20 group-hover:bg-blue-500/40 transition-all rounded-t-lg relative"
                                                style={{ height: `${(val / Math.max(...engagement.enrollment_trend)) * 100}%` }}
                                            >
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs">
                                                    {val}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-600 uppercase">W{i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-card p-10">
                                <h3 className="text-xl font-black text-slate-900 mb-8 tracking-tight">Top Performing Subject</h3>
                                <div className="space-y-6">
                                    {engagement?.top_courses.map((course, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-transform hover:scale-[1.02]">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-soft text-blue-600">
                                                    <BookOpen size={20} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-slate-900">{course.title}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{course.students} Learners Enrolled</div>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300" size={16} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'users' && (
                    <motion.div
                        key="users"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="glass-card overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">User Management Directory</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit and update platform permissions</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name, email or ID..."
                                    className="pl-12 pr-6 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:outline-none text-sm w-full sm:w-80 shadow-soft transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-5">Full Academic Profile</th>
                                        <th className="px-8 py-5">Course Activity</th>
                                        <th className="px-8 py-5">Avg. Progress</th>
                                        <th className="px-8 py-5">Account Status</th>
                                        <th className="px-8 py-5 text-right">Administrative Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.student_id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-soft flex items-center justify-center text-sm font-black text-blue-600 border border-slate-100">
                                                        {user.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-900 text-sm">{user.full_name}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{user.student_id} • {user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex gap-2">
                                                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                                                        <Activity size={12} /> {user.courses_in_progress}
                                                    </div>
                                                    <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                                                        <CheckCircle size={12} /> {user.courses_completed}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 bg-slate-100 rounded-full w-24 overflow-hidden border border-slate-200/50">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${user.average_completion >= 80 ? 'bg-emerald-500' :
                                                                user.average_completion >= 40 ? 'bg-blue-500' : 'bg-slate-400'
                                                                }`}
                                                            style={{ width: `${user.average_completion}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[11px] font-black text-slate-900">{user.average_completion}%</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit shadow-soft ${user.is_admin ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500'
                                                    }`}>
                                                    {user.is_admin ? <Shield size={12} /> : null}
                                                    {user.is_admin ? 'SysAdmin' : 'Student'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleToggleAdmin(user.student_id)}
                                                        className={`p-2 rounded-xl transition-all shadow-soft border ${user.is_admin ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'}`}
                                                        title={user.is_admin ? "Demote to Student" : "Promote to Admin"}
                                                    >
                                                        <Shield size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.student_id)}
                                                        className="p-2 bg-red-50 border border-red-100 text-red-500 rounded-xl hover:bg-red-100 transition-all shadow-soft"
                                                        title="Delete Account"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'system' && (
                    <motion.div
                        key="system"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                        <div className="glass-card p-10 bg-slate-900 !hover:bg-slate-900 hover:bg-slate-900 text-white border-none space-y-8">
                            <h3 className="text-xl font-black tracking-tight flex items-center gap-3 text-white">
                                <Zap size={20} className="text-yellow-400" />
                                AI Services Status
                            </h3>
                            <div className="space-y-6">
                                {Object.entries(systemStatus?.ai_services || {}).map(([service, status]) => (
                                    <div key={service} className="flex items-center justify-between p-5 bg-white/5 rounded-[2rem] border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                                            <span className="text-sm font-bold uppercase tracking-widest text-slate-400">{service.replace('_', ' ')}</span>
                                        </div>
                                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">{status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card p-10 space-y-8">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <HardDrive size={20} className="text-blue-600" />
                                Resource Allocation
                            </h3>
                            <div className="space-y-10">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-3">
                                            <Cpu className="text-slate-400" size={18} />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPU Synthetic Load</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-900">{systemStatus?.resources.cpu_usage}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${systemStatus?.resources.cpu_usage}%` }}
                                            className="h-full bg-blue-600 rounded-full shadow-soft"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-3">
                                            <HardDrive className="text-slate-400" size={18} />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Memory Usage</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-900">{systemStatus?.resources.memory_usage}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${systemStatus?.resources.memory_usage}%` }}
                                            className="h-full bg-violet-600 rounded-full shadow-soft"
                                        />
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Globe className="text-blue-500" size={20} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global API Latency</span>
                                    </div>
                                    <span className="text-lg font-black text-slate-900">{systemStatus?.resources.api_latency}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'insights' && (
                    <motion.div
                        key="insights"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        <div className="glass-card p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-blue-200">
                            <div className="flex items-center gap-6 mb-10">
                                <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
                                    <BarChart3 size={32} />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-black tracking-tightest">Platform Intelligence Summary</h2>
                                    <p className="text-blue-100 font-bold uppercase tracking-widest text-[11px] mt-1">Global performance synthesis based on {stats.total_enrollments} data points</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                                <div className="p-8 bg-white/10 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
                                    <div className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-2">Completion Velocity</div>
                                    <div className="text-4xl font-black text-white">4.2x <span className="text-sm text-blue-300 font-bold">AVG</span></div>
                                </div>
                                <div className="p-8 bg-white/10 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
                                    <div className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-2">Student Engagement</div>
                                    <div className="text-4xl font-black text-white">88% <span className="text-sm text-blue-300 font-bold">RETENTION</span></div>
                                </div>
                                <div className="p-8 bg-white/10 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
                                    <div className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-2">Knowledge Transfer</div>
                                    <div className="text-4xl font-black text-white">High <span className="text-sm text-blue-300 font-bold">QUALITY</span></div>
                                </div>
                            </div>

                            <p className="text-lg text-blue-50 font-medium leading-relaxed italic border-l-4 border-blue-300/50 pl-8">
                                "The ecosystem is showing robust growth patterns in STEM disciplines. Student completion rates have increased by 14% this quarter, largely driven by personalized AI-generated study paths and real-time reasoning exercises."
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
