import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context';
import { questionAPI, adminAPI } from '../services/api';
import { sanitizeHTML } from '../utils/sanitize';
import '../components/RichTextEditor.css';
import './QuestionDetail.css';

const QuestionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Transfer ownership modal state
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [newOwnerEnrollment, setNewOwnerEnrollment] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const [transferError, setTransferError] = useState('');

    useEffect(() => {
        loadQuestion();
    }, [id]);

    // Mark question as visited when loaded
    useEffect(() => {
        if (question && user) {
            questionAPI.markVisited(id).catch(() => {
                // Silently ignore errors - visit tracking is not critical
            });
        }
    }, [question, user, id]);

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

    // Search users for transfer ownership
    useEffect(() => {
        if (!showTransferModal || newOwnerEnrollment.length < 2) {
            setUserSearchResults([]);
            return;
        }

        const delaySearch = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                const { data } = await adminAPI.getUsers({ search: newOwnerEnrollment, limit: 5 });
                setUserSearchResults(data.users || data || []);
            } catch (err) {
                console.error('User search error:', err);
                setUserSearchResults([]);
            } finally {
                setSearchingUsers(false);
            }
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [newOwnerEnrollment, showTransferModal]);

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;

        try {
            await questionAPI.delete(id);
            navigate('/questions');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete question');
        }
    };

    const handleTransferOwnership = async () => {
        const enrollmentToTransfer = selectedUser?.enrollmentNumber || newOwnerEnrollment.trim();

        if (!enrollmentToTransfer) {
            setTransferError('Please select or enter an enrollment number');
            return;
        }

        setTransferring(true);
        setTransferError('');

        try {
            const { data } = await questionAPI.transferOwnership(id, enrollmentToTransfer);
            setQuestion(data);
            setShowTransferModal(false);
            setNewOwnerEnrollment('');
            setSelectedUser(null);
            setUserSearchResults([]);
            alert('Ownership transferred successfully!');
        } catch (err) {
            setTransferError(err.response?.data?.message || 'Failed to transfer ownership');
        } finally {
            setTransferring(false);
        }
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setNewOwnerEnrollment(user.enrollmentNumber);
        setUserSearchResults([]);
    };

    const clearSelectedUser = () => {
        setSelectedUser(null);
        setNewOwnerEnrollment('');
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

    // Check if user can modify (owner or admin)
    const isOwner = user && question.submittedBy &&
        question.submittedBy._id === user._id;
    const canModify = isOwner || isAdmin;

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
                            <h1>
                                {question.company?.name}
                                {question.questionNumber && (
                                    <span className="question-number">#{question.questionNumber}</span>
                                )}
                            </h1>
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
                        dangerouslySetInnerHTML={{ __html: sanitizeHTML(question.question) }}
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
                            dangerouslySetInnerHTML={{ __html: sanitizeHTML(question.suggestions) }}
                        />
                    </section>
                )}

                {/* Owner Section */}
                {question.submittedBy && (
                    <section className="owner-section">
                        <h2>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            Submitted By
                        </h2>
                        <div className="owner-card">
                            <div className="owner-avatar">
                                {question.submittedBy.displayPicture ? (
                                    <img src={question.submittedBy.displayPicture} alt={question.submittedBy.fullName} />
                                ) : (
                                    <span>{getInitials(question.submittedBy.fullName)}</span>
                                )}
                            </div>
                            <div className="owner-details">
                                <span className="owner-name">{question.submittedBy.fullName}</span>
                                <span className="owner-enrollment">{question.submittedBy.enrollmentNumber}</span>
                                <span className="owner-branch">{question.submittedBy.branch}</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* Actions */}
                <footer className="question-footer">
                    <div className="footer-meta">
                        <span>Added on {new Date(question.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</span>
                    </div>

                    <div className="footer-actions">
                        {canModify && (
                            <>
                                <Link to={`/questions/${id}/edit`} className="btn btn-secondary">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Edit
                                </Link>
                                <button onClick={handleDelete} className="btn btn-ghost text-error">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    Delete
                                </button>
                            </>
                        )}

                        {/* Admin: Transfer Ownership */}
                        {isAdmin && (
                            <button
                                onClick={() => setShowTransferModal(true)}
                                className="btn btn-secondary"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="8.5" cy="7" r="4" />
                                    <polyline points="17 11 19 13 23 9" />
                                </svg>
                                Transfer Ownership
                            </button>
                        )}
                    </div>
                </footer>
            </article>

            {/* Transfer Ownership Modal */}
            {showTransferModal && (
                <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Transfer Ownership</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowTransferModal(false)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="transfer-info">
                                Transfer this question to another user. They will become the owner and will be able to edit or delete it.
                            </p>

                            <div className="form-group">
                                <label>Current Owner</label>
                                <input
                                    type="text"
                                    value={question.submittedBy?.enrollmentNumber || 'No owner'}
                                    disabled
                                />
                            </div>

                            <div className="form-group">
                                <label>New Owner</label>
                                {selectedUser ? (
                                    <div className="selected-user-tag">
                                        <div className="selected-user-info">
                                            <span className="selected-user-name">{selectedUser.fullName}</span>
                                            <span className="selected-user-enrollment">{selectedUser.enrollmentNumber}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="clear-user-btn"
                                            onClick={clearSelectedUser}
                                            disabled={transferring}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="user-search-container">
                                        <input
                                            type="text"
                                            placeholder="Search by name or enrollment number..."
                                            value={newOwnerEnrollment}
                                            onChange={(e) => setNewOwnerEnrollment(e.target.value)}
                                            disabled={transferring}
                                        />
                                        {searchingUsers && (
                                            <div className="search-spinner"></div>
                                        )}
                                        {userSearchResults.length > 0 && (
                                            <div className="user-search-dropdown">
                                                {userSearchResults.map(user => (
                                                    <div
                                                        key={user._id}
                                                        className="user-search-result"
                                                        onClick={() => handleSelectUser(user)}
                                                    >
                                                        <div className="user-result-avatar">
                                                            {user.displayPicture ? (
                                                                <img src={user.displayPicture} alt={user.fullName} />
                                                            ) : (
                                                                <span>{getInitials(user.fullName)}</span>
                                                            )}
                                                        </div>
                                                        <div className="user-result-info">
                                                            <span className="user-result-name">{user.fullName}</span>
                                                            <span className="user-result-enrollment">{user.enrollmentNumber}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {transferError && (
                                <div className="error-message">{transferError}</div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowTransferModal(false)}
                                disabled={transferring}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleTransferOwnership}
                                disabled={transferring || (!selectedUser && !newOwnerEnrollment.trim())}
                            >
                                {transferring ? 'Transferring...' : 'Transfer Ownership'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionDetail;
