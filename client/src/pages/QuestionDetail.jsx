import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context';
import { questionAPI, adminAPI } from '../services/api';
import '../components/RichTextEditor.css'; // For rendered-content styles
import './QuestionDetail.css';

const QuestionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [claiming, setClaiming] = useState(false);

    // Admin add claim modal state
    const [showAddClaimModal, setShowAddClaimModal] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        loadQuestion();
    }, [id]);

    // Search users when search term changes
    useEffect(() => {
        if (!showAddClaimModal || userSearch.length < 2) {
            setSearchResults([]);
            return;
        }

        const delaySearch = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const { data } = await adminAPI.getUsers({ search: userSearch, limit: 10 });
                // Filter out users who have already claimed
                const claimedUserIds = question?.claimedBy?.map(c => c.user?._id) || [];
                const filtered = (data.users || data || []).filter(
                    u => !claimedUserIds.includes(u._id)
                );
                setSearchResults(filtered);
            } catch (err) {
                console.error('Search users error:', err);
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [userSearch, showAddClaimModal, question?.claimedBy]);

    const loadQuestion = async () => {
        try {
            const { data } = await questionAPI.getById(id);
            setQuestion(data);
        } catch (err) {
            setError('Question not found');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;

        try {
            await questionAPI.delete(id);
            navigate('/questions');
        } catch (err) {
            alert('Failed to delete question');
        }
    };

    const handleClaim = async () => {
        if (!user) return;
        setClaiming(true);
        try {
            const { data } = await questionAPI.claim(id);
            setQuestion(data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to claim question');
        } finally {
            setClaiming(false);
        }
    };

    const handleUnclaim = async () => {
        if (!user) return;
        setClaiming(true);
        try {
            const { data } = await questionAPI.unclaim(id);
            setQuestion(data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to unclaim question');
        } finally {
            setClaiming(false);
        }
    };

    // Admin: remove any user's claim
    const handleAdminRemoveClaim = async (userId) => {
        if (!isAdmin) return;
        if (!window.confirm('Remove this user\'s claim?')) return;

        setClaiming(true);
        try {
            const { data } = await questionAPI.adminRemoveClaim(id, userId);
            setQuestion(data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove claim');
        } finally {
            setClaiming(false);
        }
    };

    // Admin: add any user's claim
    const handleAdminAddClaim = async (userId) => {
        if (!isAdmin) return;

        setClaiming(true);
        try {
            const { data } = await questionAPI.adminAddClaim(id, userId);
            setQuestion(data);
            setShowAddClaimModal(false);
            setUserSearch('');
            setSearchResults([]);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add claim');
        } finally {
            setClaiming(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    };

    const getTypeBadge = (type, otherType) => {
        switch (type) {
            case 'interview':
                return <span className="badge badge-primary">Interview</span>;
            case 'oa':
                return <span className="badge badge-info">Online Assessment</span>;
            case 'others':
                return <span className="badge badge-warning">{otherType || 'Others'}</span>;
            default:
                return null;
        }
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Check if current user has claimed this question
    const userHasClaimed = user && question?.claimedBy?.some(
        claim => claim.user?.enrollmentNumber === user.enrollmentNumber
    );

    if (loading) {
        return (
            <div className="question-detail-page">
                <div className="loading-container">
                    <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
                    <p>Loading question...</p>
                </div>
            </div>
        );
    }

    if (error || !question) {
        return (
            <div className="question-detail-page">
                <div className="error-container">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <h2>Question Not Found</h2>
                    <p>The question you're looking for doesn't exist or has been deleted.</p>
                    <Link to="/questions" className="btn btn-primary">
                        Back to Questions
                    </Link>
                </div>
            </div>
        );
    }

    // Any authenticated user can edit/delete (anonymous questions)
    const canModify = !!user;

    return (
        <div className="question-detail-page">
            <div className="breadcrumb">
                <Link to="/questions">Questions</Link>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
                <span>{question.company?.name}</span>
            </div>

            <article className="question-detail">
                <header className="question-header">
                    <div className="company-section">
                        <div className="company-logo">
                            {question.company?.logo ? (
                                <img src={question.company.logo} alt={question.company.name} />
                            ) : (
                                <span>{getInitials(question.company?.name)}</span>
                            )}
                        </div>
                        <div className="company-info">
                            <h1>{question.company?.name}</h1>
                            <div className="question-meta">
                                {getTypeBadge(question.type, question.otherType)}
                                <span className="meta-separator">•</span>
                                <span className="meta-date">
                                    {monthNames[question.month - 1]} {question.year}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="question-content">
                    <h2>Question</h2>
                    <div
                        className="question-text rendered-content"
                        dangerouslySetInnerHTML={{ __html: question.question }}
                    />
                </section>

                {question.suggestions && (
                    <section className="suggestions-content">
                        <h2>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            Suggestions & Tips
                        </h2>
                        <div
                            className="suggestions-text rendered-content"
                            dangerouslySetInnerHTML={{ __html: question.suggestions }}
                        />
                    </section>
                )}

                {/* Claimed By Section */}
                <section className="claimed-section">
                    <h2>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        People Related to This Question
                        {question.claimedBy?.length > 0 && (
                            <span className="claim-count">{question.claimedBy.length}</span>
                        )}
                    </h2>

                    {question.claimedBy?.length > 0 ? (
                        <div className="claimed-users">
                            {question.claimedBy.map((claim, index) => (
                                <div key={index} className="claimed-user-card">
                                    <div className="claimed-user-avatar">
                                        {claim.user?.displayPicture ? (
                                            <img src={claim.user.displayPicture} alt={claim.user.fullName} />
                                        ) : (
                                            <span>{getInitials(claim.user?.fullName)}</span>
                                        )}
                                    </div>
                                    <div className="claimed-user-info">
                                        <span className="claimed-user-name">{claim.user?.fullName}</span>
                                        <span className="claimed-user-details">
                                            {claim.user?.enrollmentNumber} • {claim.user?.branch}
                                        </span>
                                    </div>
                                    {isAdmin && claim.user?._id && (
                                        <button
                                            className="btn btn-ghost btn-sm text-error claim-remove-btn"
                                            onClick={() => handleAdminRemoveClaim(claim.user._id)}
                                            disabled={claiming}
                                            title="Remove claim"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-claims">No one has claimed this question yet. Be the first!</p>
                    )}

                    <div className="claim-actions">
                        {user && (
                            <>
                                {userHasClaimed ? (
                                    <button
                                        className="btn btn-outline"
                                        onClick={handleUnclaim}
                                        disabled={claiming}
                                    >
                                        {claiming ? 'Removing...' : 'Remove My Claim'}
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleClaim}
                                        disabled={claiming}
                                    >
                                        {claiming ? 'Claiming...' : "I'm Related to This Question"}
                                    </button>
                                )}
                            </>
                        )}

                        {isAdmin && (
                            <button
                                className="btn btn-outline"
                                onClick={() => setShowAddClaimModal(true)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="8.5" cy="7" r="4" />
                                    <line x1="20" y1="8" x2="20" y2="14" />
                                    <line x1="23" y1="11" x2="17" y2="11" />
                                </svg>
                                Add User Claim
                            </button>
                        )}
                    </div>
                </section>

                <footer className="question-footer">
                    <div className="question-meta-footer">
                        <span className="meta-text">
                            Added on {new Date(question.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </span>
                    </div>

                    {canModify && (
                        <div className="action-buttons">
                            <Link to={`/questions/${question._id}/edit`} className="btn btn-outline">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit
                            </Link>
                            <button className="btn btn-ghost text-error" onClick={handleDelete}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Delete
                            </button>
                        </div>
                    )}
                </footer>
            </article>

            {/* Admin Add Claim Modal */}
            {showAddClaimModal && (
                <div className="modal-overlay" onClick={() => setShowAddClaimModal(false)}>
                    <div className="modal add-claim-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add User Claim</h3>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowAddClaimModal(false)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search by name or enrollment..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                autoFocus
                            />

                            {searchLoading && (
                                <div className="search-loading">Searching...</div>
                            )}

                            {searchResults.length > 0 && (
                                <div className="user-search-results">
                                    {searchResults.map((u) => (
                                        <div
                                            key={u._id}
                                            className="user-search-item"
                                            onClick={() => handleAdminAddClaim(u._id)}
                                        >
                                            <div className="user-search-avatar">
                                                {u.displayPicture ? (
                                                    <img src={u.displayPicture} alt={u.fullName} />
                                                ) : (
                                                    <span>{getInitials(u.fullName)}</span>
                                                )}
                                            </div>
                                            <div className="user-search-info">
                                                <span className="user-search-name">{u.fullName}</span>
                                                <span className="user-search-details">
                                                    {u.enrollmentNumber} • {u.branch}
                                                </span>
                                            </div>
                                            <button className="btn btn-primary btn-sm">Add</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {userSearch.length >= 2 && !searchLoading && searchResults.length === 0 && (
                                <div className="no-results">No users found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionDetail;
