import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context';
import { QuestionCard } from '../components';
import { questionAPI } from '../services/api';
import './MySubmissions.css';

const MyClaims = () => {
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMyClaims();
    }, []);

    const loadMyClaims = async () => {
        try {
            const { data } = await questionAPI.getMyClaims();
            setQuestions(data);
        } catch (error) {
            console.error('Failed to load claims:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnclaim = async (question) => {
        if (!window.confirm('Remove your claim from this question?')) return;

        try {
            await questionAPI.unclaim(question._id);
            loadMyClaims();
        } catch (error) {
            console.error('Failed to unclaim:', error);
            alert('Failed to remove claim');
        }
    };

    if (loading) {
        return (
            <div className="my-submissions-page">
                <div className="page-header">
                    <h1>My Claims</h1>
                </div>
                <div className="loading-grid">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton" style={{ height: '1.5rem', width: '60%', marginBottom: '0.5rem' }}></div>
                            <div className="skeleton" style={{ height: '4rem', width: '100%' }}></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="my-submissions-page">
            <div className="page-header">
                <div>
                    <h1>My Claims</h1>
                    <p>Questions you've claimed to be related to</p>
                </div>
                <Link to="/questions" className="btn btn-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Browse Questions
                </Link>
            </div>

            {questions.length === 0 ? (
                <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <h2>No claims yet</h2>
                    <p>You haven't claimed any questions yet. Browse questions and claim ones you're related to so others can reach out to you!</p>
                    <Link to="/questions" className="btn btn-primary btn-lg">
                        Browse Questions
                    </Link>
                </div>
            ) : (
                <>
                    <div className="submissions-stats">
                        <div className="stat-item">
                            <span className="stat-number">{questions.length}</span>
                            <span className="stat-text">Total Claims</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">
                                {questions.filter(q => q.type === 'interview').length}
                            </span>
                            <span className="stat-text">Interviews</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">
                                {questions.filter(q => q.type === 'oa').length}
                            </span>
                            <span className="stat-text">OA Questions</span>
                        </div>
                    </div>

                    <div className="questions-list">
                        {questions.map((question) => (
                            <QuestionCard
                                key={question._id}
                                question={question}
                                showActions={true}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default MyClaims;
