import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { CompanySearch, AccessControlPanel } from '../components';
import { adminAPI, questionAPI } from '../services/api';
import './AdminPanel.css';

// IITR Google names end with the enrollment number: "AADIT KUMAR SAHOO 23114001"
const enrollmentInName = (googleName) => {
    const match = /^(?:.*\S)\s+(\d{6,10})$/.exec(String(googleName || '').trim());
    return match ? match[1] : null;
};

// Users worth an admin's attention: no enrollment number, or a Google name that
// disagrees with the stored one (someone may have edited their Google name).
const reviewNote = (user) => {
    const fromName = enrollmentInName(user.googleName);
    if (!user.enrollmentNumber) {
        return fromName ? `No enrollment number; Google name says ${fromName}` : 'No enrollment number';
    }
    if (fromName && fromName !== user.enrollmentNumber) {
        return `Google name says ${fromName}`;
    }
    return null;
};

const USERS_PER_PAGE = 25;

const AdminPanel = () => {
    const { user, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchUser, setSearchUser] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [reviewOnly, setReviewOnly] = useState(false);
    const [reviewCount, setReviewCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const pageRef = useRef(1);
    const sentinelRef = useRef(null);
    const [editingUser, setEditingUser] = useState(null);
    const [enrollmentDraft, setEnrollmentDraft] = useState('');
    const [savingEnrollment, setSavingEnrollment] = useState(false);

    // Add question for user form
    const [selectedUser, setSelectedUser] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        company: null,
        type: 'interview',
        otherType: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        result: 'not_revealed',
        question: '',
        suggestions: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate('/');
            return;
        }
        loadInitialData();
    }, [isSuperAdmin]);

    const loadInitialData = async () => {
        try {
            const statsRes = await adminAPI.getStats();
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to load admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    // One page of users at a time; page 1 replaces the list, later pages append
    const loadUsers = useCallback(async (page, { append = false } = {}) => {
        append ? setLoadingMore(true) : setSearchLoading(true);
        try {
            const { data } = await adminAPI.getUsers({
                page,
                limit: USERS_PER_PAGE,
                ...(searchUser.trim() && { search: searchUser.trim() }),
                ...(reviewOnly && { needsReview: true }),
            });
            pageRef.current = page;
            setUsers((current) => (append ? [...current, ...data.users] : data.users));
            setHasMore(data.pagination.hasMore);
            setReviewCount(data.reviewCount);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            append ? setLoadingMore(false) : setSearchLoading(false);
        }
    }, [searchUser, reviewOnly]);

    // Reload from page 1 when the search text or the review filter changes
    useEffect(() => {
        const timer = setTimeout(() => loadUsers(1), 300);
        return () => clearTimeout(timer);
    }, [loadUsers]);

    // Load the next page when the bottom of the table comes into view
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasMore || activeTab !== 'users') return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !loadingMore && !searchLoading) {
                loadUsers(pageRef.current + 1, { append: true });
            }
        }, { rootMargin: '200px' });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, searchLoading, activeTab, loadUsers]);

    const handleRoleChange = async (userId, newRole) => {
        try {
            await adminAPI.updateUserRole(userId, newRole);
            setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Failed to update role:', error);
            alert(error.response?.data?.message || 'Failed to update role');
        }
    };

    const handleEnrollmentSave = async (userId) => {
        setSavingEnrollment(true);
        try {
            const { data } = await adminAPI.updateUserEnrollment(userId, enrollmentDraft.trim());
            setUsers(users.map((u) => (u._id === userId ? { ...u, enrollmentNumber: data.enrollmentNumber } : u)));
            setEditingUser(null);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update enrollment number');
        } finally {
            setSavingEnrollment(false);
        }
    };

    const handleAddQuestionForUser = async (e) => {
        e.preventDefault();
        if (!selectedUser || !formData.company || !formData.question.trim()) {
            alert('Please fill all required fields');
            return;
        }

        setSubmitting(true);
        try {
            await adminAPI.addQuestionForUser({
                userId: selectedUser._id,
                company: formData.company._id,
                type: formData.type,
                otherType: formData.type === 'others' ? formData.otherType : undefined,
                month: parseInt(formData.month),
                year: parseInt(formData.year),
                result: formData.result,
                question: formData.question.trim(),
                suggestions: formData.suggestions.trim() || undefined,
            });

            alert('Question added successfully!');
            setShowAddForm(false);
            setSelectedUser(null);
            setFormData({
                company: null,
                type: 'interview',
                otherType: '',
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                result: 'not_revealed',
                question: '',
                suggestions: '',
            });
        } catch (error) {
            console.error('Failed to add question:', error);
            alert(error.response?.data?.message || 'Failed to add question');
        } finally {
            setSubmitting(false);
        }
    };

    // Already filtered, searched and paginated server-side
    const displayedUsers = users;

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    if (loading) {
        return (
            <div className="admin-panel">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading admin panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <header className="admin-header">
                <div>
                    <h1>Admin Panel</h1>
                    <p>Manage users and add questions for students</p>
                </div>
                <a href="/admin/logs" className="btn btn-outline" style={{ marginLeft: 'auto' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Activity Logs
                </a>
            </header>

            {/* Stats Grid */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon users">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.totalUsers}</span>
                            <span className="stat-label">Total Users</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon questions">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.totalQuestions}</span>
                            <span className="stat-label">Total Questions</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon companies">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.totalCompanies}</span>
                            <span className="stat-label">Companies</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="admin-tabs">
                <button
                    className={`tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Manage Users
                </button>
                <button
                    className={`tab ${activeTab === 'add' ? 'active' : ''}`}
                    onClick={() => setActiveTab('add')}
                >
                    Add Question for User
                </button>
                <button
                    className={`tab ${activeTab === 'access' ? 'active' : ''}`}
                    onClick={() => setActiveTab('access')}
                >
                    Access Control
                </button>
            </div>

            {/* Access Control Tab */}
            {activeTab === 'access' && <AccessControlPanel />}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="users-section">
                    <div className="search-bar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search users by name, enrollment, or branch..."
                            value={searchUser}
                            onChange={(e) => setSearchUser(e.target.value)}
                        />
                    </div>

                    <label className="review-filter">
                        <input
                            type="checkbox"
                            checked={reviewOnly}
                            onChange={(e) => setReviewOnly(e.target.checked)}
                        />
                        <span>Needs review ({reviewCount})</span>
                    </label>

                    <div className="users-table-wrapper">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Enrollment / Email</th>
                                    <th>Branch</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedUsers.map((u) => (
                                    <tr key={u._id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="avatar avatar-sm">
                                                    {u.displayPicture ? (
                                                        <img src={u.displayPicture} alt={u.fullName} />
                                                    ) : (
                                                        u.fullName?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                                                    )}
                                                </div>
                                                <span>{u.fullName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {editingUser === u._id ? (
                                                <div className="enrollment-edit">
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={enrollmentDraft}
                                                        onChange={(e) => setEnrollmentDraft(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleEnrollmentSave(u._id)}
                                                        placeholder="e.g. 23114001"
                                                        autoFocus
                                                    />
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleEnrollmentSave(u._id)}
                                                        disabled={savingEnrollment}
                                                    >
                                                        Save
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingUser(null)}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="enrollment-cell">
                                                    <span>{u.enrollmentNumber || u.email}</span>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        title="Edit enrollment number"
                                                        onClick={() => {
                                                            setEditingUser(u._id);
                                                            setEnrollmentDraft(u.enrollmentNumber || '');
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    {reviewNote(u) && (
                                                        <span className="enrollment-note" title={u.googleName || ''}>
                                                            {reviewNote(u)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>{u.branch}</td>
                                        <td>
                                            <span className={`role-badge role-${u.role}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>
                                            {u.role !== 'superadmin' && (
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                                    className="role-select"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            )}
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => {
                                                    setSelectedUser(u);
                                                    setActiveTab('add');
                                                }}
                                                title="Add question for this user"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="12" y1="5" x2="12" y2="19" />
                                                    <line x1="5" y1="12" x2="19" y2="12" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div ref={sentinelRef} className="users-more">
                        {(searchLoading || loadingMore) && <div className="spinner"></div>}
                        {!searchLoading && !loadingMore && hasMore && (
                            <button className="btn btn-outline btn-sm" onClick={() => loadUsers(pageRef.current + 1, { append: true })}>
                                Load more
                            </button>
                        )}
                        {!searchLoading && !hasMore && users.length > 0 && (
                            <span className="users-count">{users.length} shown</span>
                        )}
                        {!searchLoading && users.length === 0 && (
                            <span className="users-count">No users match this filter.</span>
                        )}
                    </div>
                </div>
            )}

            {/* Add Question Tab */}
            {activeTab === 'add' && (
                <div className="add-question-section">
                    <div className="form-card">
                        <h3>Add Question for User</h3>

                        {/* User Selection */}
                        <div className="form-group">
                            <label className="form-label">Select User *</label>
                            {selectedUser ? (
                                <div className="selected-user">
                                    <div className="avatar avatar-md">
                                        {selectedUser.displayPicture ? (
                                            <img src={selectedUser.displayPicture} alt={selectedUser.fullName} />
                                        ) : (
                                            selectedUser.fullName?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                                        )}
                                    </div>
                                    <div className="user-info">
                                        <span className="name">{selectedUser.fullName}</span>
                                        <span className="details">{selectedUser.enrollmentNumber || selectedUser.email} • {selectedUser.branch}</span>
                                    </div>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setSelectedUser(null)}
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="user-search">
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Search user by name or enrollment..."
                                        value={searchUser}
                                        onChange={(e) => setSearchUser(e.target.value)}
                                    />
                                    {searchUser && (
                                        <div className="user-dropdown">
                                            {displayedUsers.slice(0, 5).map((u) => (
                                                <div
                                                    key={u._id}
                                                    className="user-option"
                                                    onClick={() => {
                                                        setSelectedUser(u);
                                                        setSearchUser('');
                                                    }}
                                                >
                                                    <span className="name">{u.fullName}</span>
                                                    <span className="enrollment">{u.enrollmentNumber || u.email}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedUser && (
                            <form onSubmit={handleAddQuestionForUser}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Type *</label>
                                        <select
                                            className="form-select"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="interview">Interview</option>
                                            <option value="oa">Online Assessment</option>
                                            <option value="others">Others</option>
                                        </select>
                                    </div>
                                    {formData.type === 'others' && (
                                        <div className="form-group">
                                            <label className="form-label">Specify Type *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.otherType}
                                                onChange={(e) => setFormData({ ...formData, otherType: e.target.value })}
                                                placeholder="e.g., HR Round"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Month *</label>
                                        <select
                                            className="form-select"
                                            value={formData.month}
                                            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                        >
                                            {months.map((m, i) => (
                                                <option key={m} value={i + 1}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Year *</label>
                                        <select
                                            className="form-select"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                        >
                                            {years.map((y) => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Company *</label>
                                    <CompanySearch
                                        value={formData.company}
                                        onChange={(company) => setFormData({ ...formData, company })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Result *</label>
                                    <select
                                        className="form-select"
                                        value={formData.result}
                                        onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                                    >
                                        <option value="accepted">Accepted</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="not_revealed">Not Revealed</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Question *</label>
                                    <textarea
                                        className="form-textarea"
                                        value={formData.question}
                                        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                        placeholder="Enter the question..."
                                        rows={5}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Suggestions (Optional)</label>
                                    <textarea
                                        className="form-textarea"
                                        value={formData.suggestions}
                                        onChange={(e) => setFormData({ ...formData, suggestions: e.target.value })}
                                        placeholder="Any tips or approach..."
                                        rows={3}
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting ? 'Adding...' : 'Add Question'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
