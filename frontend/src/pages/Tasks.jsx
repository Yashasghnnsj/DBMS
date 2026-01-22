import React, { useState, useEffect } from 'react';
import { Plus, Loader } from 'lucide-react';
import { api } from '../utils/api';

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await api.get('/tasks/');
            const data = await response.json();
            if (response.ok) {
                setTasks(data);
            }
        } catch (err) {
            console.error("Failed to fetch tasks", err);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'To Do', id: 'todo', tasks: tasks.filter(t => t.status === 'todo') },
        { title: 'In Progress', id: 'in_progress', tasks: tasks.filter(t => t.status === 'in_progress') },
        { title: 'Done', id: 'done', tasks: tasks.filter(t => t.status === 'done') },
    ];

    const priorityColors = {
        high: 'border-danger-500 bg-danger-50',
        medium: 'border-warning-500 bg-warning-50',
        low: 'border-gray-300 bg-gray-50',
    };

    const priorityBadges = {
        high: 'bg-danger-100 text-danger-700',
        medium: 'bg-warning-100 text-warning-700',
        low: 'bg-gray-200 text-gray-700',
    };

    if (loading) return (
        <div className="flex justify-center py-20">
            <Loader className="animate-spin text-primary-600" size={32} />
        </div>
    );

    return (
        <div className="space-y-12 pb-24 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-soft">
                            <Plus size={24} />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Task Manager</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tightest leading-tight">Your Study Tasks</h1>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">Organize your study goals easily with our smart task list.</p>
                </div>
                <button className="btn btn-primary px-10 py-5 text-sm uppercase tracking-widest font-black flex items-center gap-3">
                    <Plus size={20} />
                    New Task
                </button>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {columns.map(column => (
                    <div key={column.id} className="glass-card p-6 min-h-[600px] flex flex-col bg-slate-50/50 border-slate-100/50">
                        <div className="flex justify-between items-center mb-10 px-2">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${column.id === 'todo' ? 'bg-slate-400' :
                                    column.id === 'in_progress' ? 'bg-blue-600' : 'bg-emerald-500'
                                    }`}></div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic">{column.title}</h3>
                            </div>
                            <span className="text-[10px] font-black bg-white border border-slate-100 px-3 py-1 rounded-full text-slate-400 shadow-soft">
                                {column.tasks.length}
                            </span>
                        </div>

                        {/* Tasks */}
                        <div className="space-y-6 flex-1">
                            {column.tasks.map(task => {
                                const isCreative = task.category === 'creative';
                                return (
                                    <div
                                        key={task.id}
                                        className={`card p-6 cursor-pointer transition-all duration-300 hover:scale-[1.03] group ${isCreative
                                            ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-premium'
                                            : 'bg-white border-none shadow-soft hover:shadow-premium'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isCreative ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' :
                                                task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                                                    task.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-slate-50 text-slate-500 border-slate-100'
                                                }`}>
                                                {isCreative ? 'Creative Task' :
                                                    task.priority === 'high' ? 'Urgent' :
                                                        task.priority === 'medium' ? 'Normal' : 'Low'
                                                }
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-tighter ${isCreative ? 'text-slate-500' : 'text-slate-300'}`}>
                                                #{task.tag || 'GEN'}
                                            </span>
                                        </div>
                                        <h4 className={`font-black tracking-tight text-sm mb-2 ${isCreative ? 'text-white' : 'text-slate-900'}`}>{task.title}</h4>
                                        <p className={`text-xs font-medium leading-relaxed line-clamp-2 ${isCreative ? 'text-slate-400' : 'text-slate-500'}`}>{task.description}</p>

                                        <div className={`mt-6 pt-4 border-t flex items-center justify-between ${isCreative ? 'border-white/5' : 'border-slate-50'}`}>
                                            <div className="flex -space-x-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">AI</div>
                                            </div>
                                            <div className={`text-[10px] font-bold ${isCreative ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {column.tasks.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-30">
                                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                                        <Plus className="text-slate-400" size={20} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zone Empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Tasks;