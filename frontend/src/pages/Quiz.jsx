import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Brain, CheckCircle, XCircle, ArrowRight, Loader, Award, Sparkles, BookOpen, Clock, AlertTriangle, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';

const Quiz = () => {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [reasoning, setReasoning] = useState({});
    const [result, setResult] = useState(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const response = await api.post(`/quiz/generate/${topicId}`, {});
                const data = await response.json();
                setQuiz(data);
            } catch (err) {
                console.error("Failed to load quiz", err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [topicId]);

    const handleAnswer = (questionId, option) => {
        setAnswers(prev => ({ ...prev, [questionId]: option }));
    };

    const handleReasoning = (questionId, value) => {
        setReasoning(prev => ({ ...prev, [questionId]: value }));
    };

    const submitQuiz = async () => {
        // Validate all questions have answers
        const unansweredQuestions = [];
        const missingReasoning = [];

        quiz.questions.forEach((q, idx) => {
            if (!answers[q.id]) {
                unansweredQuestions.push(idx + 1);
            }
            const reasoningText = (reasoning[q.id] || '').trim();
            if (!reasoningText || reasoningText.length < 10) {
                missingReasoning.push(idx + 1);
            }
        });

        if (unansweredQuestions.length > 0) {
            alert(`Please answer question(s): ${unansweredQuestions.join(', ')}`);
            return;
        }

        if (missingReasoning.length > 0) {
            alert(`Please provide reasoning (minimum 10 characters) for question(s): ${missingReasoning.join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(`/quiz/submit/${quiz.quiz_id}`, { answers, reasoning });
            const data = await response.json();
            setResult(data);
        } catch (err) {
            console.error("Failed to submit quiz", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-[80vh] gap-4">
            <div className="relative">
                <Loader className="animate-spin text-slate-900" size={48} />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" size={20} />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Analyzing Deep Concepts...</p>
        </div>
    );

    if (result) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto py-12 px-4 pb-32"
            >
                <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-premium p-10 border border-white/50 relative overflow-hidden">
                    {/* Background Accents */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-32 -mt-32 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full -ml-32 -mb-32 blur-3xl" />

                    <div className="relative z-10 text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 12, stiffness: 200 }}
                            className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-soft transform rotate-6 ${result.passed ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'
                                }`}>
                            {result.passed ? <Award size={48} /> : <BookOpen size={48} />}
                        </motion.div>

                        <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
                            {result.passed ? 'Assessment Mastered!' : 'Mastery in Progress'}
                        </h2>

                        <p className="text-slate-500 text-lg mb-10 max-w-2xl mx-auto font-medium">
                            {result.passed
                                ? "Excellent work. You've demonstrated a robust understanding of the core concepts with sound reasoning."
                                : "We've identified a few conceptual gaps. Don't worry, we've adjusted your path to fix these misconceptions."}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-soft">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Efficiency Score</div>
                                <div className="text-4xl font-black text-slate-900">{result.score.toFixed(0)}%</div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-soft">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</div>
                                <div className={`text-4xl font-black ${result.passed ? 'text-emerald-500' : 'text-slate-900'}`}>
                                    {result.passed ? 'PASSED' : 'LEARNING'}
                                </div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-soft">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Next Step</div>
                                <div className="text-xl font-bold text-blue-600">
                                    {result.passed ? 'PROJECT' : 'REMEDIAL'}
                                </div>
                            </div>
                        </div>

                        {/* Reasoning Insights Section */}
                        {result.misconceptions && result.misconceptions.length > 0 && (
                            <div className="mb-12 text-left">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-soft">
                                        <AlertTriangle size={16} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Professor AI: Misconception Analysis</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {result.misconceptions.map((m, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            key={i}
                                            className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start gap-4"
                                        >
                                            <div className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs flex-shrink-0">
                                                {i + 1}
                                            </div>
                                            <p className="text-amber-900 font-semibold">{m}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Remedial Resources */}
                        {result.remedial_resources && result.remedial_resources.length > 0 && (
                            <div className="mb-12 text-left">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-soft">
                                        <PlayCircle size={16} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recommended Remediation</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {result.remedial_resources.map((v, i) => (
                                        <a
                                            key={i}
                                            href={v.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group bg-white border border-slate-100 p-5 rounded-2xl shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all flex items-center gap-4"
                                        >
                                            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white group-hover:bg-blue-600 transition-colors">
                                                <PlayCircle size={24} />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-sm font-black text-slate-900 truncate">{v.title}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Video Resource</div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => navigate('/learning-path')}
                                className="flex-1 py-5 px-8 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-premium hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                            >
                                {result.passed ? 'Initiate Mastery Project' : 'Sync Adjusted Timeline'}
                                <ArrowRight size={18} />
                            </button>
                            {!result.passed && (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="py-5 px-8 bg-white text-slate-900 border border-slate-200 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-soft hover:bg-slate-50 transition-all"
                                >
                                    Retry Assessment
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (!quiz) return <div className="text-center py-24 font-black text-slate-300 uppercase tracking-widest">Assessment Initialization Failed</div>;

    const question = quiz.questions && quiz.questions.length > 0 ? quiz.questions[currentQuestionIndex] : null;
    const isLastQuestion = quiz.questions ? currentQuestionIndex === quiz.questions.length - 1 : false;

    if (!question) return (
        <div className="flex flex-col justify-center items-center h-[80vh] gap-4">
            <XCircle className="text-red-500" size={48} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Assessment questions could not be retrieved.</p>
            <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-[10px]">Return to Learning Path</button>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 pb-32">
            <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-soft">
                            <Sparkles className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Active Assessment</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Professor AI Context: {quiz.title}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">
                            {String(currentQuestionIndex + 1).padStart(2, '0')}<span className="text-slate-300 font-bold text-lg"> / {String(quiz.questions.length).padStart(2, '0')}</span>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Sequence</div>
                    </div>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner border border-slate-200/50">
                    <motion.div
                        className="h-full bg-slate-900 rounded-full shadow-soft"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                    ></motion.div>
                </div>
            </div>

            <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-10"
            >
                <div className="space-y-6">
                    <h1 className="text-3xl font-black text-slate-900 leading-[1.2] tracking-tight">
                        {question.text}
                    </h1>

                    {/* Interaction Area */}
                    <div className="space-y-4">
                        {question.type === 'mcq' || question.type === 'true_false' ? (
                            <div className="grid grid-cols-1 gap-3">
                                {question.options.map((option, idx) => {
                                    const isSelected = answers[question.id] === option;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(question.id, option)}
                                            className={`w-full p-6 text-left rounded-[2rem] border-2 transition-all duration-300 group relative overflow-hidden
                                            ${isSelected
                                                    ? 'border-slate-900 bg-slate-900 text-white shadow-premium'
                                                    : 'border-slate-100 bg-white hover:border-slate-300 text-slate-600 shadow-soft'}
                                        `}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                                    ${isSelected ? 'border-white' : 'border-slate-300 group-hover:border-slate-900'}
                                                `}>
                                                    {isSelected && <div className="w-3 h-3 rounded-full bg-white shadow-soft" />}
                                                </div>
                                                <span className="text-lg font-bold">{option}</span>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent pointer-events-none" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <textarea
                                className="w-full p-6 bg-white border-2 border-slate-100 rounded-[2rem] focus:border-slate-900 focus:ring-0 min-h-[160px] text-lg font-semibold text-slate-900 shadow-soft transition-all"
                                placeholder="Formulate your detailed answer..."
                                value={answers[question.id] || ''}
                                onChange={(e) => handleAnswer(question.id, e.target.value)}
                            />
                        )}
                    </div>
                </div>

                {/* Reasoning Layer */}
                <div className="p-8 bg-slate-50/80 backdrop-blur-md rounded-[2.5rem] border border-slate-100 shadow-soft relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Brain size={64} className="text-slate-900" />
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-soft">
                            <Brain size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Active Reasoning Engine</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Explain your mental model for this choice</p>
                        </div>
                    </div>

                    <textarea
                        className="w-full p-6 bg-white border border-slate-200 rounded-[1.8rem] focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 shadow-inner"
                        placeholder="Professor AI is listening to your logic..."
                        rows={3}
                        value={reasoning[question.id] || ''}
                        onChange={(e) => handleReasoning(question.id, e.target.value)}
                    />
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="px-8 py-5 bg-white text-slate-400 border border-slate-200 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:text-slate-900 hover:border-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                        Back
                    </button>

                    <button
                        onClick={() => {
                            if (isLastQuestion) {
                                submitQuiz();
                            } else {
                                setCurrentQuestionIndex(prev => prev + 1);
                            }
                        }}
                        disabled={!answers[question.id] || loading}
                        className="flex-1 py-5 px-8 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-premium hover:bg-slate-800 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                    >
                        {loading ? 'Processing Mastery...' : (isLastQuestion ? 'Complete Assessment' : 'Commit Answer')}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Quiz;
