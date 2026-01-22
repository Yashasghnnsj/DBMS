import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Quiz from './pages/Quiz'; // Keep Quiz for now to check import
import LearningPath from './pages/LearningPath';
import Tasks from './pages/Tasks';
import Workload from './pages/Workload';
import Courses from './pages/Courses';
import Analytics from './pages/Analytics';
import Landing from './pages/Landing';
import AdminDashboard from './pages/AdminDashboard';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h1>
                    <pre className="text-left bg-gray-100 p-4 rounded overflow-auto max-w-2xl mx-auto">
                        {this.state.error && this.state.error.toString()}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for stored token and user data
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={
                        user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />
                    } />

                    {user ? (
                        <Route element={<Layout user={user} onLogout={handleLogout} />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/learning-path" element={<LearningPath />} />
                            <Route path="/tasks" element={<Tasks />} />
                            <Route path="/workload" element={<Workload />} />
                            <Route path="/courses" element={<Courses />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/quiz/:topicId" element={<Quiz />} />
                            <Route path="/admin" element={
                                user.is_admin || localStorage.getItem('is_admin') === 'true'
                                    ? <AdminDashboard />
                                    : <Navigate to="/dashboard" replace />
                            } />
                        </Route>
                    ) : (
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    )}
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
