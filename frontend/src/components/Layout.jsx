import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, CheckSquare, Activity, BookOpen, BarChart2, GraduationCap, User as UserIcon, LogOut, Shield } from 'lucide-react';
import AIChat from './AIChat';

const SidebarItem = ({ to, icon: Icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
        }
    >
        <Icon size={22} className="flex-shrink-0" />
        <span className="font-semibold tracking-tight">{label}</span>
    </NavLink>
);

const Layout = ({ user, onLogout }) => {
    return (
        <div className="flex h-screen overflow-hidden mesh-gradient">
            {/* Sidebar */}
            <aside className="w-72 relative z-50 flex flex-col h-full inset-y-0 m-4 ml-6 gap-4">
                <div className="glass-card flex flex-col h-full overflow-hidden border-white/50">
                    {/* Brand */}
                    <div className="p-8 pb-4 flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-premium transform rotate-3 hover:rotate-0 transition-transform duration-500 overflow-hidden p-1">
                            <img src="/rvce_logo.png" alt="RVCE Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 leading-tight tracking-tighter uppercase italic">Academic<br />Companion</h1>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto hidden-scrollbar">
                        <div className="px-5 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            Main Menu
                        </div>
                        <SidebarItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                        <SidebarItem to="/analytics" icon={BarChart2} label="Analytics" />

                        {(user?.is_admin || localStorage.getItem('is_admin') === 'true') && (
                            <>
                                <div className="mt-10 px-5 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                    Administration
                                </div>
                                <SidebarItem to="/admin" icon={Shield} label="Admin Dashboard" />
                            </>
                        )}

                        <div className="mt-10 px-5 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            Learning Path
                        </div>
                        <SidebarItem to="/courses" icon={BookOpen} label="My Courses" />
                        <SidebarItem to="/learning-path" icon={Map} label="My Learning Path" />

                        <div className="mt-10 px-5 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            Productivity
                        </div>
                        <SidebarItem to="/tasks" icon={CheckSquare} label="Task Manager" />
                        <SidebarItem to="/workload" icon={Activity} label="Study Schedule" />
                    </nav>

                    {/* User Profile */}
                    <div className="p-6 mt-auto">
                        <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100 transition-all duration-300 hover:shadow-soft">
                            <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-bold border-2 border-white shadow-soft flex-shrink-0">
                                <UserIcon size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 truncate tracking-tight">
                                    {user?.full_name || 'Guest Student'}
                                </h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {user?.student_id || 'STU-OFFLINE'}
                                </p>
                            </div>
                            <button
                                onClick={onLogout}
                                className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all duration-300 group"
                                title="Safe Logout"
                            >
                                <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative h-full custom-scrollbar">
                <div className="max-w-7xl mx-auto p-8 lg:p-12 pb-24">
                    <div className="animate-fade-in">
                        <Outlet />
                    </div>
                </div>
                <AIChat />
            </main>
        </div>
    );
};

export default Layout;