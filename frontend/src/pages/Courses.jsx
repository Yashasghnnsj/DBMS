import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Users, Star, Search, Plus, ArrowRight, Loader, Trash2, GraduationCap } from 'lucide-react';
import { api } from '../utils/api';

const Courses = () => {
    const navigate = useNavigate();
    const [myCourses, setMyCourses] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchExtra, setSearchExtra] = useState({ insight: '', related: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchMyCourses();
    }, []);

    const fetchMyCourses = async () => {
        try {
            const response = await api.get('/courses/my-courses');
            const data = await response.json();
            if (response.ok) {
                // Filter out 'dropped' or 'completed' courses from the Active Curriculum view
                const activeCourses = data.filter(c => c.enrollment_status === 'active');
                setMyCourses(activeCourses);
            }
        } catch (err) {
            console.error("Failed to fetch courses", err);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault(); // support direct call
        if (!searchQuery.trim()) return;

        setSearching(true);
        setLoading(true);
        setError('');
        setSearchResults([]);
        setSearchExtra({ insight: '', related: [] });

        try {
            const response = await api.get(`/courses/search?q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();

            if (response.ok) {
                // Map the global best_book_link to each result if available
                const detailedResults = (data.results || []).map(r => ({
                    ...r,
                    best_book: data.best_book,
                    best_book_link: data.best_book_link
                }));
                setSearchResults(detailedResults);
                setSearchExtra({
                    insight: data.chatbot_insight || '',
                    related: data.related_searches || []
                });
            } else {
                setError('Search failed. Please try again.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (courseData) => {
        try {
            const response = await api.post('/courses/', {
                title: courseData.title,
                description: courseData.description,
                category: searchQuery,
                best_book: courseData.best_book,
                best_book_link: courseData.best_book_link
            });

            if (response.ok) {
                // Refresh my courses and clear search
                fetchMyCourses();
                setSearching(false);
                setSearchQuery('');
            }
        } catch (err) {
            console.error("Enrollment failed", err);
        }
    };

    const handleDelete = async (courseId, e) => {
        e.stopPropagation(); // prevent navigation
        if (!window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) return;

        try {
            const res = await api.delete(`/courses/${courseId}`);

            if (res.ok) {
                fetchMyCourses(); // refresh list
            } else {
                alert("Failed to delete course.");
            }
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const CourseCard = ({ course, isEnrolled }) => (
        <div className="card card-hover group h-full flex flex-col">
            <div className={`min-h-[12rem] bg-gradient-to-br ${isEnrolled ? 'from-blue-600 to-indigo-600' : 'from-slate-800 to-slate-900'} p-8 pb-10 flex flex-col justify-between relative transition-all duration-500 group-hover:scale-[1.02]`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-all"></div>

                <div className="flex items-start justify-between z-10 w-full mb-6">
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-soft group-hover:rotate-12 transition-transform duration-500">
                        <BookOpen size={24} />
                    </div>
                    {isEnrolled && (
                        <div className="flex gap-2">
                            <div className="px-3 py-1 bg-white/20 text-white backdrop-blur-md rounded-full text-[10px] font-black tracking-widest uppercase border border-white/10">
                                {(course.progress || 0)}%
                            </div>
                            <button
                                onClick={(e) => handleDelete(course.course_id, e)}
                                className="p-2 bg-white/10 hover:bg-red-500/80 rounded-xl transition-all duration-300 text-white border border-white/10 group/del"
                                title="Delete Course"
                            >
                                <Trash2 size={16} className="group-hover/del:scale-110 transition-transform" />
                            </button>
                        </div>
                    )}
                </div>
                <h3 className="text-2xl font-black text-white line-clamp-2 tracking-tight transition-all group-hover:translate-x-1 relative z-10">{course.title}</h3>
            </div>

            <div className="p-8 space-y-6 flex-1 flex flex-col">
                <p className="text-sm font-medium text-slate-500 line-clamp-3 leading-relaxed">
                    {course.description || "Master this subject with our smart learning path and practice questions."}
                </p>

                {course.best_book_referenced && (
                    <div className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <BookOpen size={12} />
                            Recommended Reference
                        </div>
                        <div className="text-sm font-bold text-slate-900 line-clamp-1">{course.best_book_referenced}</div>
                        {course.best_book_link && (
                            <a
                                href={course.best_book_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                            >
                                View Textbook <ArrowRight size={10} />
                            </a>
                        )}
                    </div>
                )}

                {isEnrolled && (
                    <div className="mt-auto space-y-3">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Weekly Progress</span>
                            <span className="text-xs font-bold text-slate-900">{course.progress || 0}%</span>
                        </div>
                        <div className="progress-bar">
                            <div
                                style={{ width: `${course.progress || 0}%` }}
                                className="progress-fill"
                            ></div>
                        </div>
                    </div>
                )}



                <button
                    onClick={() => isEnrolled ? navigate('/learning-path') : handleEnroll(course)}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-500 active:scale-95 ${isEnrolled
                        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-soft'
                        : 'bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white'
                        }`}
                >
                    {isEnrolled ? (
                        <>Launch Dashboard <ArrowRight size={18} /></>
                    ) : (
                        <>Start Enrollment <Plus size={18} /></>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-12 pb-24">
            {/* Search Section */}
            <div className="glass-card p-12 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
                    <div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tightest mb-4 uppercase italic">Global Search</h1>
                        <p className="text-lg text-slate-500 font-medium">Access over 100,000+ AI-summarized academic pathways instantly.</p>
                    </div>

                    <form onSubmit={handleSearch} className="relative group/form">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-20 group-focus-within/form:opacity-40 transition duration-500"></div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Quantum Mechanics, Bio-Ethics, or World History..."
                                className="w-full pl-24 pr-40 py-6 rounded-[2rem] bg-white border-none shadow-premium text-xl font-bold text-slate-900 placeholder:text-slate-300 transition-all outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/form:text-blue-600 transition-colors" size={28} />
                            <button
                                type="submit"
                                disabled={loading}
                                className="absolute right-3 top-3 bottom-3 bg-slate-900 text-white px-10 rounded-[1.5rem] font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all duration-300 disabled:opacity-50 shadow-soft"
                            >
                                {loading ? <Loader className="animate-spin" size={20} /> : 'Search'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Content Area */}
            {searching ? (
                <div className="space-y-10 animate-slide-up">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-soft">
                                <Search size={20} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">AI Summary</h2>
                        </div>
                        <button
                            onClick={() => { setSearching(false); setSearchQuery(''); }}
                            className="text-xs font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.2em] flex items-center gap-2"
                        >
                            <ArrowRight size={14} className="rotate-180" /> Clear Search
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest animate-pulse">Searching database...</p>
                        </div>
                    ) : error ? (
                        <div className="glass-card p-12 text-center text-red-500 font-bold border-red-100 bg-red-50/10">
                            {error}
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* Chatbot Insight */}
                            {searchExtra.insight && (
                                <div className="glass-card p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-none shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                                    <div className="flex gap-8 relative z-10">
                                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center border border-white/10 flex-shrink-0 animate-float shadow-glass">
                                            <div className="flex gap-1">
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black tracking-tight uppercase italic opacity-60">AI Summary</h3>
                                            <p className="text-slate-200 text-lg font-medium leading-relaxed max-w-4xl">{searchExtra.insight}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Related Searches */}
                            {searchExtra.related && searchExtra.related.length > 0 && (
                                <div className="flex gap-3 flex-wrap items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Deepen Research:</span>
                                    {searchExtra.related.map((term, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setSearchQuery(term); handleSearch({ preventDefault: () => { } }); }}
                                            className="px-5 py-2.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-900 hover:text-white hover:shadow-soft transition-all duration-300"
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {searchResults.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                    {searchResults.map((course, idx) => (
                                        <CourseCard key={idx} course={course} isEnrolled={false} />
                                    ))}
                                </div>
                            ) : (
                                <div className="glass-card p-24 text-center space-y-4">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Search size={32} className="text-slate-200" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900">No Results Found</h3>
                                    <p className="text-slate-500 font-medium">Try broadening your search term or using keywords like "Fundamentals" or "Advanced".</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-10 animate-fade-in">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-soft">
                                <GraduationCap size={20} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">My Courses</h2>
                        </div>
                    </div>

                    {myCourses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {myCourses.map(course => (
                                <CourseCard key={course.course_id} course={course} isEnrolled={true} />
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card p-24 text-center group">
                            <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 group-hover:bg-blue-600 group-hover:rotate-12 transition-all duration-700">
                                <BookOpen className="text-slate-200 group-hover:text-white transition-colors" size={48} />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">No Courses Found</h3>
                            <p className="text-slate-500 font-medium mb-10 max-w-sm mx-auto leading-relaxed">
                                Your course list is currently empty. Use the search bar above to find your first subject.
                            </p>
                            <button
                                onClick={() => document.querySelector('input').focus()}
                                className="btn btn-primary px-10 py-5 text-sm uppercase tracking-widest font-black"
                            >
                                Begin Discovery
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Courses;