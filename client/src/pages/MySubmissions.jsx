import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context';
import { QuestionCard } from '../components';
import { questionAPI } from '../services/api';
import './MySubmissions.css';

const MySubmissions = () => {
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMyQuestions();
    }, []);

    const loadMyQuestions = async () => {
        try {
            const { data } = await questionAPI.getMy();
            setQuestions(data);
        } catch (error) {
            console.error('Failed to load questions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (question) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;

        try {
            await questionAPI.delete(question._id);
            loadMyQuestions();
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete question');
        }
    };

    if (loading) {
        return (
            <div className="my-submissions-page">
                <div className="page-header">
                    <h1>My Submissions</h1>
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
                    <h1>My Submissions</h1>
                    <p>Interview questions and experiences you've shared</p>
                </div>
                <Link to="/add" className="btn btn-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add New
                </Link>
            </div>

            {questions.length === 0 ? (
                <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="12" x2="12" y2="18" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    <h2>No submissions yet</h2>
                    <p>You haven't shared any interview questions yet. Help your juniors by sharing your experiences!</p>
                    <Link to="/add" className="btn btn-primary btn-lg">
                        Add Your First Question
                    </Link>
                </div>
            ) : (
                <>
                    <div className="submissions-stats">
                        <div className="stat-item">
                            <span className="stat-number">{questions.length}</span>
                            <span className="stat-text">Total Submissions</span>
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
                                question={{
                                    ...question,
                                    submittedBy: user,
                                }}
                                isOwner={true}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default MySubmissions;
