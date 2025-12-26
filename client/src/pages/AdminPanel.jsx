import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { CompanySearch } from '../components';
import { adminAPI, questionAPI } from '../services/api';
import './AdminPanel.css';

const AdminPanel = () => {
    const { user, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchUser, setSearchUser] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

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
            const [usersRes, statsRes] = await Promise.all([
                adminAPI.getUsers({ limit: 1000 }), // Load all users
                adminAPI.getStats(),
            ]);
            setUsers(usersRes.data.users);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to load admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Server-side search with debounce
    const searchUsers = useCallback(async (searchTerm) => {
        if (!searchTerm.trim()) {
            // If search is empty, reload all users
            setSearchLoading(true);
            try {
                const res = await adminAPI.getUsers({ limit: 1000 });
                setUsers(res.data.users);
            } catch (error) {
                console.error('Failed to load users:', error);
            } finally {
                setSearchLoading(false);
            }
            return;
        }

        setSearchLoading(true);
        try {
            const res = await adminAPI.getUsers({ search: searchTerm, limit: 1000 });
            setUsers(res.data.users);
        } catch (error) {
            console.error('Failed to search users:', error);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchUser !== undefined) {
                searchUsers(searchUser);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchUser, searchUsers]);

    const handleRoleChange = async (userId, newRole) => {
        try {
            await adminAPI.updateUserRole(userId, newRole);
            setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Failed to update role:', error);
            alert(error.response?.data?.message || 'Failed to update role');
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

    // Display users directly (already filtered server-side)
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
            </div>

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

                    <div className="users-table-wrapper">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Enrollment</th>
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
                                        <td>{u.enrollmentNumber}</td>
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
                                        <span className="details">{selectedUser.enrollmentNumber} • {selectedUser.branch}</span>
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
                                                    <span className="enrollment">{u.enrollmentNumber}</span>
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
