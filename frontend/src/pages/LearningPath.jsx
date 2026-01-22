import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Lock, Play, Clock, ArrowRight, BrainCircuit, Loader } from 'lucide-react';
import { api } from '../utils/api';

const LearningPath = () => {
    const navigate = useNavigate();
    const [activeCourse, setActiveCourse] = useState(null);
    const [topics, setTopics] = useState([]);
    const [currentTopic, setCurrentTopic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [videoUrl, setVideoUrl] = useState('');
    const [notesModal, setNotesModal] = useState({ isOpen: false, title: '', content: '', noteId: null });
    const [dataView, setDataView] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [notesHistory, setNotesHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [allCourses, setAllCourses] = useState([]);

    const fetchNotesHistory = async (topicId) => {
        try {
            const res = await api.get(`/ai/notes/topic/${topicId}`);
            if (res.ok) {
                const data = await res.json();
                setNotesHistory(data);
            }
        } catch (err) {
            console.error('Failed to fetch notes history:', err);
        }
    };

    const loadHistoricalNote = (note) => {
        setNotesModal({
            isOpen: true,
            title: note.title,
            content: note.content,
            noteId: note.note_id
        });
        setShowHistory(false);
    };

    const fetchAllActiveCourses = async () => {
        try {
            const res = await api.get('/courses/enrollments/active');
            if (res.ok) {
                const courses = await res.json();
                setAllCourses(courses);
            }
        } catch (err) {
            console.error('Failed to fetch active courses:', err);
        }
    };

    const switchCourse = async (courseId) => {
        setLoading(true);
        try {
            // Save to localStorage for persistence across pages
            localStorage.setItem('selectedCourseId', courseId.toString());

            const res = await api.get(`/courses/learning-path/active?course_id=${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setActiveCourse(data.course);
                setTopics(data.topics || []);
                if (data.topics && data.topics.length > 0) {
                    setCurrentTopic(data.topics[data.current_topic_index || 0]);
                }
            }
        } catch (err) {
            console.error("Failed to switch course", err);
        } finally {
            setLoading(false);
        }
    };


    const handleGenerateNotes = async (topic) => {
        try {
            // Show loading state in modal immediately
            setNotesModal({ isOpen: true, title: topic.title, content: 'Generating comprehensive notes with AI... This may take a moment.', noteId: null });
            setIsEditing(false);

            const res = await api.post('/ai/notes/generate', { topic_id: topic.topic_id });
            const data = await res.json();

            if (res.ok) {
                // Support new nested structure or legacy
                const noteData = data.note || data;
                setNotesModal({
                    isOpen: true,
                    title: noteData.title,
                    content: noteData.content || '',
                    noteId: noteData.note_id
                });
                // Fetch history for this topic
                await fetchNotesHistory(topic.topic_id);
            } else {
                setNotesModal({ isOpen: true, title: 'Error', content: 'Failed to generate notes. Please try again.', noteId: null });
            }
        } catch (err) {
            setNotesModal({ isOpen: true, title: 'Error', content: 'Connection failed.', noteId: null });
        }
    };

    const handleEditNotes = () => {
        setEditedContent(notesModal.content);
        setIsEditing(true);
    };

    const handleSaveNotes = async () => {
        if (!notesModal.noteId) return;

        try {
            const res = await api.put(`/ai/notes/${notesModal.noteId}`, { content: editedContent });
            if (res.ok) {
                setNotesModal({ ...notesModal, content: editedContent });
                setIsEditing(false);
            }
        } catch (err) {
            console.error('Failed to save notes:', err);
        }
    };

    const handleDiscardChanges = () => {
        setEditedContent('');
        setIsEditing(false);
    };

    useEffect(() => {
        fetchActiveCourse();
        fetchAllActiveCourses();
    }, []);

    useEffect(() => {
        if (currentTopic && currentTopic.youtube_video_id) {
            setVideoUrl(`https://www.youtube.com/embed/${currentTopic.youtube_video_id}`);
        } else {
            setVideoUrl('');
        }
    }, [currentTopic]);

    const fetchActiveCourse = async () => {
        try {
            // Check localStorage for user's selected course
            const selectedCourseId = localStorage.getItem('selectedCourseId');

            let url = '/courses/learning-path/active';
            if (selectedCourseId) {
                url += `?course_id=${selectedCourseId}`;
            }

            // Use the dedicated endpoint that calculates deadlines dynamically
            const res = await api.get(url);

            if (res.ok) {
                const data = await res.json();
                setActiveCourse(data.course);
                setTopics(data.topics || []);
                // Determine current topic based on index or status
                if (data.topics && data.topics.length > 0) {
                    setCurrentTopic(data.topics[data.current_topic_index || 0]);
                }

                // Save course ID to localStorage if not already saved
                if (!selectedCourseId && data.course) {
                    localStorage.setItem('selectedCourseId', data.course.course_id.toString());
                }

            } else {
                // Fallback or handle no active course
                setActiveCourse(null);
            }
        } catch (err) {
            console.error("Failed to load learning path", err);
        } finally {
            setLoading(false);
        }
    };

    const handleTopicComplete = async (topic) => {
        try {
            const res = await api.post(`/courses/topics/${topic.topic_id}/complete`, {});

            if (res.ok) {
                // Determine next topic
                const currentIndex = topics.findIndex(t => t.topic_id === topic.topic_id);
                if (currentIndex < topics.length - 1) {
                    setCurrentTopic(topics[currentIndex + 1]);
                }
            }
        } catch (err) {
            console.error("Failed to complete topic", err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader className="animate-spin text-primary-600" size={32} />
            </div>
        );
    }

    if (!activeCourse) {
        return (
            <div className="text-center py-20 px-4">
                <div className="bg-primary-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="text-primary-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Learning Path</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    You haven't enrolled in any courses yet. Explore our catalog to start your journey.
                </p>
                <a href="/courses" className="btn btn-primary inline-flex items-center gap-2">
                    Browse Courses <ArrowRight size={16} />
                </a>
            </div>
        );
    }

    const progress = activeCourse?.completion_percentage || 0;



    // ... existing code ...

    return (
        <div className="space-y-12 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-fade-in">
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-soft">
                            <BookOpen size={24} />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Curriculum</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tightest leading-tight">{activeCourse.title}</h1>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">{activeCourse.description || "Master this domain with our AI-enhanced learning path and deep reasoning protocols."}</p>
                    {activeCourse.best_book_referenced && (
                        <a
                            href={activeCourse.best_book_link || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold w-fit border border-blue-100 animate-fade-in transition-all group/book ${activeCourse.best_book_link ? 'hover:bg-blue-100 cursor-pointer' : 'cursor-default'}`}
                        >
                            <BookOpen size={14} />
                            <span className="uppercase tracking-wider group-hover/book:translate-x-1 transition-transform">Expertise Foundation: {activeCourse.best_book_referenced}</span>
                            {activeCourse.best_book_link && <Play size={10} className="fill-blue-700" />}
                        </a>
                    )}
                </div>
                <div className="w-full md:w-64 space-y-3">
                    {/* Course Switcher */}
                    {allCourses.length > 1 && (
                        <div className="mb-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Active Courses</label>
                            <select
                                value={activeCourse?.course_id || ''}
                                onChange={(e) => switchCourse(parseInt(e.target.value))}
                                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                            >
                                {allCourses.map(course => (
                                    <option key={course.course_id} value={course.course_id}>
                                        {course.title} ({Math.round(course.completion_percentage)}%)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery Level</span>
                        <span className="text-sm font-black text-blue-600">{Math.round(progress)}%</span>
                    </div>
                    <div className="progress-bar h-3">
                        <div
                            style={{ width: `${progress}%` }}
                            className="progress-fill"
                        ></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left: Main Content & Video */}
                <div className="lg:col-span-8 space-y-10">
                    {currentTopic && (
                        <div className="animate-slide-up">
                            {/* Video Player Section */}
                            <div className="mb-10 rounded-[2.5rem] overflow-hidden shadow-premium bg-slate-900 border-8 border-slate-900 relative group">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                                {videoUrl ? (
                                    <div className="aspect-video">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={videoUrl}
                                            title={currentTopic.title}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="relative z-10"
                                        ></iframe>
                                    </div>
                                ) : (
                                    <div className="p-16 flex flex-col items-center justify-center text-center bg-slate-900 text-white min-h-[400px]">
                                        <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 animate-float">
                                            <Play size={40} className="text-blue-500 fill-blue-500 ml-1" />
                                        </div>
                                        <h3 className="text-3xl font-black mb-4 tracking-tight">External Seminar Required</h3>
                                        <p className="text-slate-400 mb-10 max-w-lg font-medium leading-relaxed">
                                            Our neural search couldn't index a direct feed for this specific module. Explore the world's largest repository for deep-dive tutorials.
                                        </p>
                                        <a
                                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(currentTopic.title + " " + activeCourse.title)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary px-10 py-5 text-sm uppercase tracking-widest font-black"
                                        >
                                            Research on YouTube
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className="glass-card p-10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{currentTopic.title}</h2>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">Primary Module Content</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleGenerateNotes(currentTopic)}
                                            className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-soft group"
                                        >
                                            <BrainCircuit size={24} className="group-hover:rotate-12 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                                <div className="prose prose-slate max-w-none">
                                    <p className="text-lg text-slate-600 font-medium leading-relaxed">
                                        This module covers critical concepts in {currentTopic.title}. Watch the seminar above and utilize our AI Synthesis engine to generate deep-dive study notes and reasoning exercises.
                                    </p>
                                </div>
                                <div className="pt-6 border-t border-slate-50 flex flex-wrap gap-4">
                                    <button
                                        onClick={() => navigate(`/quiz/${currentTopic.topic_id}`)}
                                        className="btn btn-primary px-10 py-5 text-sm uppercase tracking-widest font-black flex items-center gap-3"
                                    >
                                        Initiate Assessment <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Timeline Sidebar */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="glass-card p-8 bg-slate-900 border-none shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <h3 className="text-xl font-black text-white mb-8 tracking-tight relative z-10 flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                            Curriculum Relay
                        </h3>

                        <div className="space-y-6 relative">
                            <div className="absolute left-[1.15rem] top-2 bottom-2 w-0.5 bg-white/10"></div>

                            {topics.map((topic, index) => {
                                const isCompleted = index < Math.floor((progress / 100) * topics.length);
                                const isCurrent = currentTopic?.topic_id === topic.topic_id;
                                const isLocked = !isCompleted && !isCurrent;

                                return (
                                    <button
                                        key={topic.topic_id}
                                        onClick={() => !isLocked && setCurrentTopic(topic)}
                                        className={`w-full text-left relative flex gap-5 group transition-all duration-500 ${isLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                                    >
                                        <div className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${isCompleted ? 'bg-emerald-500 border-emerald-400 text-white' :
                                            isCurrent ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' :
                                                'bg-slate-800 border-slate-700 text-slate-500'
                                            }`}>
                                            {isCompleted ? <CheckCircle size={16} /> :
                                                isCurrent ? <Play size={16} className="ml-0.5" /> :
                                                    <Lock size={16} />}
                                        </div>

                                        <div className={`flex-1 pt-1 space-y-1 ${isCurrent ? 'translate-x-1' : ''} transition-transform`}>
                                            <h4 className={`text-sm font-bold tracking-tight ${isCurrent ? 'text-white' : 'text-slate-400'} group-hover:text-white transition-colors`}>
                                                {topic.title}
                                            </h4>
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                <span>{topic.estimated_duration_minutes}m</span>
                                                {topic.suggested_deadline && (
                                                    <span className={isCurrent ? 'text-blue-400' : ''}>
                                                        • {new Date(topic.suggested_deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Stats Overlay */}
                    <div className="glass-card p-8 border-slate-100">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Quiz</div>
                                <div className="text-sm font-bold text-slate-900">
                                    {currentTopic?.quiz_date ? new Date(currentTopic.quiz_date).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Date</div>
                                <div className="text-sm font-bold text-slate-900 text-red-600">
                                    {currentTopic?.suggested_deadline ? new Date(currentTopic.suggested_deadline).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Notes Modal */}
            {notesModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setNotesModal({ ...notesModal, isOpen: false })}></div>
                    <div className="glass-card w-full max-w-5xl h-[90vh] flex flex-col bg-slate-100 border-white shadow-2xl relative z-10 animate-slide-up overflow-hidden">

                        {/* Toolbar */}
                        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm z-20">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">{notesModal.title}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Generated Study Material</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {!isEditing ? (
                                    <>
                                        <button
                                            onClick={() => setDataView(!dataView)}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors"
                                        >
                                            {dataView ? 'View Document' : 'View JSON'}
                                        </button>
                                        {notesModal.noteId && (
                                            <>
                                                <button
                                                    onClick={handleEditNotes}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setShowHistory(!showHistory)}
                                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                                                >
                                                    {showHistory ? 'Hide History' : 'View History'}
                                                </button>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleSaveNotes}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={handleDiscardChanges}
                                            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                                        >
                                            Discard
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        setNotesModal({ ...notesModal, isOpen: false });
                                        setIsEditing(false);
                                    }}
                                    className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-500"
                                >
                                    <ArrowRight className="rotate-45" size={24} />
                                </button>
                            </div>
                        </div>


                        {/* Document View */}
                        <div className="flex-1 overflow-hidden flex">
                            {/* History Sidebar */}
                            {showHistory && (
                                <div className="w-80 bg-slate-50 border-r border-slate-200 overflow-y-auto p-6">
                                    <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-wide">Notes History</h3>
                                    <div className="space-y-3">
                                        {notesHistory.length > 0 ? notesHistory.map((note) => (
                                            <button
                                                key={note.note_id}
                                                onClick={() => loadHistoricalNote(note)}
                                                className={`w-full text-left p-4 rounded-xl transition-all ${note.note_id === notesModal.noteId
                                                    ? 'bg-blue-100 border-2 border-blue-500'
                                                    : 'bg-white hover:bg-slate-100 border border-slate-200'
                                                    }`}
                                            >
                                                <div className="text-sm font-bold text-slate-900 mb-1 line-clamp-2">{note.title}</div>
                                                <div className="text-xs text-slate-500">
                                                    {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString()}
                                                </div>
                                            </button>
                                        )) : (
                                            <p className="text-sm text-slate-400 text-center py-8">No history available</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Main Content */}
                            <div className="flex-1 overflow-y-auto bg-slate-200 p-8 flex justify-center">
                                {/* A4 Paper Container */}
                                <div className="bg-white w-full max-w-[210mm] min-h-fit shadow-2xl p-[20mm] relative">
                                    {isEditing ? (
                                        <div className="h-full">
                                            <textarea
                                                value={editedContent}
                                                onChange={(e) => setEditedContent(e.target.value)}
                                                className="w-full h-full min-h-[600px] p-6 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                placeholder="Edit your notes here..."
                                            />
                                        </div>
                                    ) : dataView ? (
                                        <pre className="text-xs font-mono bg-slate-900 text-green-400 p-6 rounded-xl overflow-auto whitespace-pre-wrap">
                                            {(() => {
                                                try {
                                                    const parsed = typeof notesModal.content === 'string' && notesModal.content.startsWith('{')
                                                        ? JSON.parse(notesModal.content)
                                                        : { raw: notesModal.content };
                                                    return JSON.stringify(parsed, null, 2);
                                                } catch (e) { return notesModal.content; }
                                            })()}
                                        </pre>
                                    ) : (
                                        <div className="prose prose-slate max-w-none prose-p:font-serif prose-p:text-lg prose-headings:font-sans">
                                            {/* Render Content */}
                                            {(() => {
                                                try {
                                                    const contentObj = typeof notesModal.content === 'string' && notesModal.content.startsWith('{')
                                                        ? JSON.parse(notesModal.content)
                                                        : null;

                                                    if (contentObj && contentObj.sections) {
                                                        return (
                                                            <>
                                                                <div className="border-b-2 border-slate-900 pb-6 mb-8">
                                                                    <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Study Notes</h1>
                                                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{contentObj.title}</p>
                                                                </div>
                                                                {contentObj.sections.map((sec, idx) => {
                                                                    // Handle content that might be string or array
                                                                    let contentToRender = sec.content;
                                                                    if (Array.isArray(contentToRender)) {
                                                                        contentToRender = contentToRender.join('\n');
                                                                    }

                                                                    // Simple markdown-to-HTML conversion
                                                                    const formatContent = (text) => {
                                                                        return text
                                                                            // Headers
                                                                            .replace(/### (.+)/g, '<h3 class="text-xl font-bold text-slate-800 mt-6 mb-3">$1</h3>')
                                                                            .replace(/## (.+)/g, '<h2 class="text-2xl font-bold text-slate-800 mt-6 mb-4">$2</h2>')
                                                                            // Bold
                                                                            .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
                                                                            // Bullet points
                                                                            .replace(/^- (.+)$/gm, '<li class="ml-6 mb-2">$1</li>')
                                                                            // Numbered lists
                                                                            .replace(/^\d+\. (.+)$/gm, '<li class="ml-6 mb-2">$1</li>')
                                                                            // Line breaks
                                                                            .replace(/\n/g, '<br/>');
                                                                    };

                                                                    return (
                                                                        <div key={idx} className="mb-8">
                                                                            <h2 className="text-2xl font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-4">{sec.heading}</h2>
                                                                            <div
                                                                                className="text-slate-700 leading-relaxed prose prose-slate max-w-none"
                                                                                dangerouslySetInnerHTML={{ __html: formatContent(contentToRender) }}
                                                                            />
                                                                        </div>
                                                                    );
                                                                })}
                                                                <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs font-mono text-slate-400">
                                                                    Generated by Academic Companion AI • {new Date().toLocaleDateString()}
                                                                </div>
                                                            </>
                                                        );
                                                    } else {
                                                        // Fallback for old markdown notes
                                                        return <div dangerouslySetInnerHTML={{ __html: notesModal.content.replace(/\n/g, '<br/>') }}></div>;
                                                    }
                                                } catch (e) {
                                                    return <div className="text-red-500">Error rendering document: {e.message}</div>;
                                                }
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LearningPath;