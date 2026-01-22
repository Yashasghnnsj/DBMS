import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Award } from 'lucide-react';
import { api } from '../utils/api';

const Analytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const [detailedStats, setDetailedStats] = useState(null);

    const fetchAnalytics = async () => {
        try {
            const [basicRes, detailedRes] = await Promise.all([
                api.get('/courses/analytics'),
                api.get('/dashboard/detailed')
            ]);

            const basicData = await basicRes.json();
            const detailedData = await detailedRes.json();

            if (basicRes.ok) setStats(basicData);
            if (detailedRes.ok) setDetailedStats(detailedData);

        } catch (err) {
            console.error("Failed to fetch analytics", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Analytics</h1>
                <p className="text-gray-600">Track your learning progress and performance</p>
            </div>

            {/* AI Summary */}
            <div className="card p-6 bg-primary-50 border-primary-200">
                <div className="flex items-center gap-2 mb-3">
                    <Award size={20} className="text-primary-600" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">AI Summary</h3>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                    You have completed {stats.completion_rate}% of your enrolled courses.
                    <span className="font-medium text-primary-700"> Stick to your schedule to improve your streak!</span>
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">Average Progress</h3>
                        <TrendingUp className="text-success-600" size={20} />
                    </div>
                    <p className="text-3xl font-semibold text-gray-900 mb-1">{stats.average_score}%</p>
                    <p className="text-sm text-success-600">Across all courses</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
                        <BarChart2 className="text-primary-600" size={20} />
                    </div>
                    <p className="text-3xl font-semibold text-gray-900 mb-1">{stats.completion_rate}%</p>
                    <p className="text-sm text-gray-500">Keep learning!</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">Study Streak</h3>
                        <Award className="text-warning-600" size={20} />
                    </div>
                    <p className="text-3xl font-semibold text-gray-900 mb-1">{stats.study_streak} days</p>
                    <p className="text-sm text-warning-600">Mock Streak</p>
                </div>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Subject Performance */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Subject Performance</h3>
                    <div className="space-y-4">
                        {stats.subject_performance && stats.subject_performance.length > 0 ? (
                            stats.subject_performance.map((item, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-700 font-medium">{item.subject}</span>
                                        <span className="text-gray-900 font-semibold">{item.score}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            style={{ width: `${item.score}%` }}
                                            className={`h-full ${item.color} transition-all duration-500`}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No courses enrolled yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Advanced Metrics - Full Width */}
            {detailedStats && (
                <div className="card p-6 border-primary-100 bg-gradient-to-br from-white to-primary-50">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <TrendingUp size={24} className="text-primary-600" /> Learning History
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-gray-700 font-medium">Study Pace</h4>
                                <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-primary-600 shadow-sm">Weekly</span>
                            </div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-5xl font-bold text-gray-900">{detailedStats.learning_velocity}</span>
                                <span className="text-gray-500">quizzes / week</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${Math.min(100, (detailedStats.learning_velocity / 5) * 100)}%` }}></div>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">Optimal pace: 3-5 quizzes/week</p>
                        </div>

                        <div>
                            <h4 className="text-gray-700 font-medium mb-4">30-Day Activity</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {Array.from({ length: 30 }).map((_, i) => {
                                    const val = detailedStats.heatmap && detailedStats.heatmap[i] ? detailedStats.heatmap[i].count : 0;
                                    const intensity = val > 2 ? 'bg-primary-600' : val > 0 ? 'bg-primary-300' : 'bg-gray-200';
                                    return (
                                        <div key={i} className={`w-8 h-8 rounded ${intensity} transition-all hover:scale-110`} title={`Day ${i + 1}: ${val} activities`}></div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analytics;
