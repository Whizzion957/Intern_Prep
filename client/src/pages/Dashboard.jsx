import { Link } from 'react-router-dom';
import { useAuth } from '../context';
import { useState, useEffect } from 'react';
import { questionAPI, adminAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
    const { user, isAdmin } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentQuestions, setRecentQuestions] = useState([]);
    const [claimedCount, setClaimedCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Strip HTML tags for display
    const getPlainText = (html) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            // Get recent questions (for display) and stats
            const [questionsRes, statsRes] = await Promise.all([
                questionAPI.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
                isAdmin ? adminAPI.getStats() : Promise.resolve({ data: null }),
            ]);

            setRecentQuestions(questionsRes.data.questions || []);

            // Count questions claimed by current user
            const allQuestions = questionsRes.data.questions || [];
            const claimed = allQuestions.filter(q =>
                q.claimedBy?.some(claim => claim.user?.enrollmentNumber === user?.enrollmentNumber)
            );
            setClaimedCount(claimed.length);

            if (statsRes.data) {
                setStats(statsRes.data);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="welcome-section">
                    <h1>Welcome back, {user?.fullName?.split(' ')[0]}!</h1>
                    <p>Ready to help your juniors ace their interviews?</p>
                </div>
            </header>

            <div className="dashboard-grid">
                <Link to="/add" className="action-card add-card">
                    <div className="action-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </div>
                    <div className="action-content">
                        <h2>Add Question</h2>
                        <p>Share an interview question or OA you've faced</p>
                    </div>
                    <div className="action-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </div>
                </Link>

                <Link to="/questions" className="action-card view-card">
                    <div className="action-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <div className="action-content">
                        <h2>View Questions</h2>
                        <p>Browse and search all interview experiences</p>
                    </div>
                    <div className="action-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </div>
                </Link>
            </div>

            <div className="dashboard-sections">
                <section className="stats-section">
                    <h3>Quick Stats</h3>
                    {loading ? (
                        <div className="stats-loading">
                            <div className="skeleton" style={{ height: '4rem', width: '100%' }}></div>
                        </div>
                    ) : (
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value">{claimedCount}</div>
                                <div className="stat-label">Questions Claimed</div>
                            </div>
                            {stats && (
                                <>
                                    <div className="stat-card">
                                        <div className="stat-value">{stats.totalQuestions}</div>
                                        <div className="stat-label">Total Questions</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{stats.totalCompanies}</div>
                                        <div className="stat-label">Companies</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{stats.totalUsers}</div>
                                        <div className="stat-label">Contributors</div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </section>

                {recentQuestions.length > 0 && (
                    <section className="recent-section">
                        <div className="section-header">
                            <h3>Recent Questions</h3>
                            <Link to="/questions" className="btn btn-ghost btn-sm">
                                View All
                            </Link>
                        </div>
                        <div className="recent-list">
                            {recentQuestions.slice(0, 3).map((q) => {
                                const plainText = getPlainText(q.question);
                                return (
                                    <Link to={`/questions/${q._id}`} key={q._id} className="recent-item">
                                        <div className="recent-company">
                                            {q.company?.name || 'Unknown Company'}
                                        </div>
                                        <div className="recent-question">
                                            {plainText.length > 80 ? plainText.substring(0, 80) + '...' : plainText}
                                        </div>
                                        <div className="recent-meta">
                                            <span className={`badge badge-${q.type === 'interview' ? 'primary' : q.type === 'oa' ? 'info' : 'warning'}`}>
                                                {q.type === 'oa' ? 'OA' : q.type === 'interview' ? 'Interview' : q.otherType || 'Other'}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default Dashboard;

