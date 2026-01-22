import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Activity, Award, TrendingUp, Search } from 'lucide-react';
import { api } from '../utils/api';
import { motion } from 'framer-motion';

const AdminStatCard = ({ title, value, icon: Icon, color }) => (
    <div className="glass-card p-6 flex items-center justify-between">
        <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-3xl font-black text-slate-900">{value}</h3>
        </div>
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10`}>
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
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const [statsRes, progressRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/admin/user-progress')
                ]);

                if (statsRes.ok) setStats(await statsRes.json());
                if (progressRes.ok) setUserProgress(await progressRes.json());
            } catch (error) {
                console.error("Failed to fetch admin data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, []);

    const filteredUsers = userProgress.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin Control Center</h1>
                    <p className="text-slate-500 font-medium">Monitor platform growth and student performance</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest">
                        Admin Access
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AdminStatCard
                    title="Total Students"
                    value={stats.total_users}
                    icon={Users}
                    color="bg-blue-600 text-blue-600"
                />
                <AdminStatCard
                    title="Active Users"
                    value={stats.active_users}
                    icon={Activity}
                    color="bg-emerald-500 text-emerald-500"
                />
                <AdminStatCard
                    title="Total Courses"
                    value={stats.total_courses}
                    icon={BookOpen}
                    color="bg-violet-600 text-violet-600"
                />
                <AdminStatCard
                    title="Enrollments"
                    value={stats.total_enrollments}
                    icon={Award}
                    color="bg-amber-500 text-amber-500"
                />
            </div>

            {/* User Progress Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-slate-900">Student Progress Registry</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full sm:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Courses Enrolled</th>
                                <th className="px-6 py-4">In Progress</th>
                                <th className="px-6 py-4">Completed</th>
                                <th className="px-6 py-4">Avg Completion</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.student_id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {user.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm">{user.full_name}</div>
                                                    <div className="text-xs text-slate-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                            {user.courses_enrolled}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                            {user.courses_in_progress}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                            {user.courses_completed}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full w-24 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${user.average_completion >= 100 ? 'bg-emerald-500' :
                                                                user.average_completion >= 50 ? 'bg-blue-500' : 'bg-slate-400'
                                                            }`}
                                                        style={{ width: `${user.average_completion}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-500">{user.average_completion}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${user.courses_completed > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {user.courses_completed > 0 ? 'Achiever' : 'Active'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">
                                        No students found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
