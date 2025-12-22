import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context';
import { RichTextEditor } from '../components';
import { companyAPI, companyTipAPI } from '../services/api';
import './CompanyDetail.css';

const CompanyDetail = () => {
    const { id } = useParams();
    const { user, isAdmin } = useAuth();
    const [company, setCompany] = useState(null);
    const [tips, setTips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newTip, setNewTip] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [editingTip, setEditingTip] = useState(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        loadCompany();
        loadTips();
    }, [id]);

    const loadCompany = async () => {
        try {
            const { data } = await companyAPI.getById(id);
            setCompany(data);
        } catch (error) {
            console.error('Failed to load company:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTips = async () => {
        try {
            const { data } = await companyTipAPI.getTips(id);
            setTips(data);
        } catch (error) {
            console.error('Failed to load tips:', error);
        }
    };

    const handleSubmitTip = async (e) => {
        e.preventDefault();
        if (!newTip.trim()) return;

        try {
            await companyTipAPI.createTip(id, { content: newTip });
            setNewTip('');
            loadTips();
        } catch (error) {
            console.error('Failed to create tip:', error);
            alert('Failed to post tip');
        }
    };

    const handleReply = async (parentId) => {
        if (!replyContent.trim()) return;

        try {
            await companyTipAPI.createTip(id, { content: replyContent, parentTip: parentId });
            setReplyingTo(null);
            setReplyContent('');
            loadTips();
        } catch (error) {
            console.error('Failed to reply:', error);
            alert('Failed to post reply');
        }
    };

    const handleUpdateTip = async (tipId) => {
        if (!editContent.trim()) return;

        try {
            await companyTipAPI.updateTip(tipId, { content: editContent });
            setEditingTip(null);
            setEditContent('');
            loadTips();
        } catch (error) {
            console.error('Failed to update tip:', error);
            alert('Failed to update');
        }
    };

    const handleDeleteTip = async (tipId) => {
        if (!window.confirm('Delete this tip and all replies?')) return;

        try {
            await companyTipAPI.deleteTip(tipId);
            loadTips();
        } catch (error) {
            console.error('Failed to delete tip:', error);
            alert('Failed to delete');
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    };

    const formatStipend = (amount) => {
        if (!amount) return 'Not specified';
        return `₹${amount.toLocaleString('en-IN')}/month`;
    };

    const getDayClass = (day) => {
        const classes = {
            'Day 0': 'day-0',
            'Day 1': 'day-1',
            'Day 2': 'day-2',
            'Day 3': 'day-3',
            'Later': 'day-later'
        };
        return classes[day] || '';
    };

    const canEditTip = (tip) => {
        if (!user) return false;
        const isAuthor = tip.author?._id === user._id;
        return isAuthor || isAdmin;
    };

    const renderTip = (tip, depth = 0) => (
        <div key={tip._id} className={`tip-item depth-${Math.min(depth, 3)}`}>
            <div className="tip-header">
                <div className="tip-author">
                    <div className="avatar avatar-sm">
                        {tip.author?.displayPicture ? (
                            <img src={tip.author.displayPicture} alt={tip.author.fullName} />
                        ) : (
                            getInitials(tip.author?.fullName)
                        )}
                    </div>
                    <div className="tip-author-info">
                        <span className="tip-author-name">{tip.author?.fullName || 'Unknown'}</span>
                        <span className="tip-author-branch">{tip.author?.branch}</span>
                    </div>
                </div>
                <span className="tip-date">
                    {new Date(tip.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                    })}
                </span>
            </div>

            {editingTip === tip._id ? (
                <div className="tip-edit-form">
                    <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder="Edit your tip..."
                        minHeight="100px"
                    />
                    <div className="tip-edit-actions">
                        <button className="btn btn-sm btn-primary" onClick={() => handleUpdateTip(tip._id)}>
                            Save
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setEditingTip(null)}>
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="tip-content" dangerouslySetInnerHTML={{ __html: tip.content }} />
            )}

            <div className="tip-actions">
                {user && (
                    <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                            setReplyingTo(replyingTo === tip._id ? null : tip._id);
                            setReplyContent('');
                        }}
                    >
                        Reply
                    </button>
                )}
                {canEditTip(tip) && (
                    <>
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => {
                                setEditingTip(tip._id);
                                setEditContent(tip.content);
                            }}
                        >
                            Edit
                        </button>
                        <button
                            className="btn btn-sm btn-ghost text-danger"
                            onClick={() => handleDeleteTip(tip._id)}
                        >
                            Delete
                        </button>
                    </>
                )}
            </div>

            {replyingTo === tip._id && (
                <div className="reply-form">
                    <RichTextEditor
                        value={replyContent}
                        onChange={setReplyContent}
                        placeholder="Write a reply..."
                        minHeight="80px"
                    />
                    <div className="reply-actions">
                        <button className="btn btn-sm btn-primary" onClick={() => handleReply(tip._id)}>
                            Post Reply
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setReplyingTo(null)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {tip.replies && tip.replies.length > 0 && (
                <div className="tip-replies">
                    {tip.replies.map(reply => renderTip(reply, depth + 1))}
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="company-detail-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="company-detail-page">
                <div className="not-found">
                    <h2>Company not found</h2>
                    <Link to="/companies" className="btn btn-primary">Back to Companies</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="company-detail-page">
            {/* Company Header */}
            <div className="company-header">
                <div className="company-header-logo">
                    {company.logo ? (
                        <img src={company.logo} alt={company.name} />
                    ) : (
                        <span>{getInitials(company.name)}</span>
                    )}
                </div>
                <div className="company-header-info">
                    <h1>{company.name}</h1>
                    {company.description && (
                        <div className="company-description" dangerouslySetInnerHTML={{ __html: company.description }} />
                    )}
                </div>
                {isAdmin && (
                    <button
                        className="btn btn-outline"
                        onClick={() => setShowEditModal(true)}
                    >
                        Edit Details
                    </button>
                )}
            </div>

            {/* Roles Section */}
            {company.roles && company.roles.length > 0 && (
                <section className="roles-section">
                    <h2>Internship Roles</h2>
                    <div className="roles-grid">
                        {company.roles.map((role, index) => (
                            <div key={index} className="role-card">
                                <div className="role-header">
                                    <h3 className="role-name">{role.roleName}</h3>
                                    <span className={`day-badge ${getDayClass(role.day)}`}>
                                        {role.day}
                                    </span>
                                </div>

                                <div className="role-stipend">
                                    <span className="stipend-label">Compensation</span>
                                    <span className="stipend-amount">{formatStipend(role.totalStipend)}</span>
                                    {role.stipendBreakdown && role.stipendBreakdown.length > 0 && (
                                        <div className="stipend-breakdown">
                                            {role.stipendBreakdown.filter(item => item.type !== 'one-time').map((item, i) => (
                                                <div key={i} className="breakdown-item">
                                                    <span>{item.label}</span>
                                                    <span>₹{item.amount.toLocaleString('en-IN')}/mo</span>
                                                </div>
                                            ))}
                                            {role.stipendBreakdown.filter(item => item.type === 'one-time').length > 0 && (
                                                <div className="breakdown-section">
                                                    <span className="breakdown-section-label">One-time Benefits</span>
                                                    {role.stipendBreakdown.filter(item => item.type === 'one-time').map((item, i) => (
                                                        <div key={i} className="breakdown-item one-time">
                                                            <span>{item.label}</span>
                                                            <span>₹{item.amount.toLocaleString('en-IN')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {role.duration && (
                                    <div className="role-duration">
                                        <span className="duration-label">Duration</span>
                                        <span className="duration-value">{role.duration}</span>
                                    </div>
                                )}

                                {role.location && (
                                    <div className="role-location">
                                        <span className="location-label">Location</span>
                                        <span className="location-value">{role.location}</span>
                                    </div>
                                )}

                                {role.criteria && (
                                    <div className="role-criteria">
                                        <span className="criteria-label">Eligibility Criteria</span>
                                        <div className="criteria-content" dangerouslySetInnerHTML={{ __html: role.criteria }} />
                                    </div>
                                )}

                                {role.perks && role.perks !== '<p><br></p>' && role.perks.replace(/<[^>]*>/g, '').trim() && (
                                    <div className="role-perks">
                                        <span className="perks-label">Perks & Support</span>
                                        <div className="perks-content" dangerouslySetInnerHTML={{ __html: role.perks }} />
                                    </div>
                                )}

                                {/* Branches */}
                                {(role.hiringFor?.ug?.length > 0 || role.hiringFor?.pg?.length > 0 || role.hiringFor?.phd?.length > 0) && (
                                    <div className="role-branches">
                                        {role.hiringFor?.ug?.length > 0 && (
                                            <div className="branch-group">
                                                <span className="branch-label">UG</span>
                                                <div className="branch-chips">
                                                    {role.hiringFor.ug.map((branch, i) => (
                                                        <span key={i} className="branch-chip ug">{branch}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {role.hiringFor?.pg?.length > 0 && (
                                            <div className="branch-group">
                                                <span className="branch-label">PG</span>
                                                <div className="branch-chips">
                                                    {role.hiringFor.pg.map((branch, i) => (
                                                        <span key={i} className="branch-chip pg">{branch}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {role.hiringFor?.phd?.length > 0 && (
                                            <div className="branch-group">
                                                <span className="branch-label">PhD</span>
                                                <div className="branch-chips">
                                                    {role.hiringFor.phd.map((branch, i) => (
                                                        <span key={i} className="branch-chip phd">{branch}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Tips Section */}
            <section className="tips-section">
                <h2>Tips & Preparation Guide</h2>

                {user && (
                    <form className="new-tip-form" onSubmit={handleSubmitTip}>
                        <RichTextEditor
                            value={newTip}
                            onChange={setNewTip}
                            placeholder="Share your tips or suggestions for preparing for this company..."
                            minHeight="120px"
                        />
                        <button type="submit" className="btn btn-primary" disabled={!newTip || newTip === '<p><br></p>'}>
                            Post Tip
                        </button>
                    </form>
                )}

                {tips.length === 0 ? (
                    <div className="no-tips">
                        <p>No tips yet. Be the first to share your experience!</p>
                    </div>
                ) : (
                    <div className="tips-list">
                        {tips.map(tip => renderTip(tip))}
                    </div>
                )}
            </section>

            {/* Edit Modal - Simple inline for now */}
            {showEditModal && (
                <CompanyEditModal
                    company={company}
                    onClose={() => setShowEditModal(false)}
                    onSave={() => {
                        loadCompany();
                        setShowEditModal(false);
                    }}
                />
            )}
        </div>
    );
};

// Edit Modal Component
const CompanyEditModal = ({ company, onClose, onSave }) => {
    const [description, setDescription] = useState(company.description || '');
    const [roles, setRoles] = useState(company.roles || []);
    const [branches, setBranches] = useState({ ug: [], pg: [], phd: [] });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadBranches();
    }, []);

    const loadBranches = async () => {
        try {
            const { data } = await companyAPI.getBranches();
            setBranches(data);
        } catch (error) {
            console.error('Failed to load branches:', error);
        }
    };

    const addRole = () => {
        setRoles([...roles, {
            roleName: '',
            day: 'Day 1',
            duration: 2,
            totalStipend: null,
            stipendBreakdown: [],
            criteria: '',
            hiringFor: { ug: [], pg: [], phd: [] }
        }]);
    };

    const updateRole = (index, field, value) => {
        const updated = [...roles];
        updated[index] = { ...updated[index], [field]: value };
        setRoles(updated);
    };

    const updateRoleHiring = (index, type, values) => {
        const updated = [...roles];
        updated[index].hiringFor = { ...updated[index].hiringFor, [type]: values };
        setRoles(updated);
    };

    const addBreakdownItem = (roleIndex) => {
        const updated = [...roles];
        updated[roleIndex].stipendBreakdown = [
            ...(updated[roleIndex].stipendBreakdown || []),
            { label: '', amount: 0, type: 'monthly' }
        ];
        setRoles(updated);
    };

    const recalculateTotals = (role) => {
        const breakdown = role.stipendBreakdown || [];
        role.totalStipend = breakdown
            .filter(item => item.type !== 'one-time')
            .reduce((sum, item) => sum + (item.amount || 0), 0);
        role.totalOneTime = breakdown
            .filter(item => item.type === 'one-time')
            .reduce((sum, item) => sum + (item.amount || 0), 0);
    };

    const updateBreakdownItem = (roleIndex, itemIndex, field, value) => {
        const updated = [...roles];
        updated[roleIndex].stipendBreakdown[itemIndex] = {
            ...updated[roleIndex].stipendBreakdown[itemIndex],
            [field]: field === 'amount' ? Number(value) : value
        };
        recalculateTotals(updated[roleIndex]);
        setRoles(updated);
    };

    const removeBreakdownItem = (roleIndex, itemIndex) => {
        const updated = [...roles];
        updated[roleIndex].stipendBreakdown.splice(itemIndex, 1);
        recalculateTotals(updated[roleIndex]);
        setRoles(updated);
    };

    const removeRole = (index) => {
        setRoles(roles.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await companyAPI.updateDetails(company._id, { description, roles });
            onSave();
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content edit-company-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Company Details</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label>Company Description</label>
                        <RichTextEditor
                            value={description}
                            onChange={setDescription}
                            placeholder="Brief description about the company..."
                            minHeight="100px"
                        />
                    </div>

                    <div className="roles-editor">
                        <div className="roles-header">
                            <h3>Roles</h3>
                            <button type="button" className="btn btn-sm btn-outline" onClick={addRole}>
                                + Add Role
                            </button>
                        </div>

                        {roles.map((role, index) => (
                            <div key={index} className="role-edit-card">
                                <div className="role-edit-header">
                                    <input
                                        type="text"
                                        placeholder="Role name (e.g., SDE Intern)"
                                        value={role.roleName}
                                        onChange={(e) => updateRole(index, 'roleName', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-ghost text-danger"
                                        onClick={() => removeRole(index)}
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="role-edit-row">
                                    <div className="form-group">
                                        <label>Day</label>
                                        <select
                                            value={role.day}
                                            onChange={(e) => updateRole(index, 'day', e.target.value)}
                                        >
                                            <option value="Day 0">Day 0</option>
                                            <option value="Day 1">Day 1</option>
                                            <option value="Day 2">Day 2</option>
                                            <option value="Day 3">Day 3</option>
                                            <option value="Later">Later</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Duration</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., 2 months, 10-12 weeks"
                                            value={role.duration || ''}
                                            onChange={(e) => updateRole(index, 'duration', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Location</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Bangalore, Remote, Hybrid"
                                            value={role.location || ''}
                                            onChange={(e) => updateRole(index, 'location', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="stipend-editor">
                                    <div className="stipend-header">
                                        <label>Stipend Breakdown</label>
                                        <button
                                            type="button"
                                            className="btn btn-xs btn-ghost"
                                            onClick={() => addBreakdownItem(index)}
                                        >
                                            + Add Component
                                        </button>
                                    </div>
                                    {role.stipendBreakdown?.map((item, i) => (
                                        <div key={i} className="breakdown-edit-row">
                                            <input
                                                type="text"
                                                placeholder="Component (e.g., Base, Bonus)"
                                                value={item.label}
                                                onChange={(e) => updateBreakdownItem(index, i, 'label', e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Amount"
                                                value={item.amount || ''}
                                                onChange={(e) => updateBreakdownItem(index, i, 'amount', e.target.value)}
                                            />
                                            <select
                                                value={item.type || 'monthly'}
                                                onChange={(e) => updateBreakdownItem(index, i, 'type', e.target.value)}
                                                className="breakdown-type-select"
                                            >
                                                <option value="monthly">Monthly</option>
                                                <option value="one-time">One-time</option>
                                            </select>
                                            <button
                                                type="button"
                                                className="btn btn-xs btn-ghost"
                                                onClick={() => removeBreakdownItem(index, i)}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                    <div className="stipend-totals">
                                        {role.totalStipend > 0 && (
                                            <div className="stipend-total">
                                                Monthly: ₹{role.totalStipend.toLocaleString('en-IN')}/month
                                            </div>
                                        )}
                                        {role.totalOneTime > 0 && (
                                            <div className="stipend-total one-time">
                                                One-time: ₹{role.totalOneTime.toLocaleString('en-IN')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Eligibility Criteria</label>
                                    <RichTextEditor
                                        value={role.criteria || ''}
                                        onChange={(value) => updateRole(index, 'criteria', value)}
                                        placeholder="e.g., CGPA 7.5+, No backlogs, Branch requirements..."
                                        minHeight="80px"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Perks & Support</label>
                                    <RichTextEditor
                                        value={role.perks || ''}
                                        onChange={(value) => updateRole(index, 'perks', value)}
                                        placeholder="e.g., Meals, Accommodation, Travel support, Team events..."
                                        minHeight="80px"
                                    />
                                </div>

                                <div className="branches-editor">
                                    <BranchSelector
                                        label="UG Branches"
                                        options={branches.ug}
                                        selected={role.hiringFor?.ug || []}
                                        onChange={(values) => updateRoleHiring(index, 'ug', values)}
                                        colorClass="ug"
                                    />
                                    <BranchSelector
                                        label="PG Branches"
                                        options={branches.pg}
                                        selected={role.hiringFor?.pg || []}
                                        onChange={(values) => updateRoleHiring(index, 'pg', values)}
                                        colorClass="pg"
                                    />
                                    <BranchSelector
                                        label="PhD Branches"
                                        options={branches.phd}
                                        selected={role.hiringFor?.phd || []}
                                        onChange={(values) => updateRoleHiring(index, 'phd', values)}
                                        colorClass="phd"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Branch Selector Component with dropdown and checkboxes
const BranchSelector = ({ label, options, selected, onChange, colorClass }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useState(null);

    const toggleOption = (option) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const removeSelected = (option, e) => {
        e.stopPropagation();
        onChange(selected.filter(s => s !== option));
    };

    const selectAll = () => {
        onChange([...options]);
    };

    const clearAll = () => {
        onChange([]);
    };

    return (
        <div className="branch-selector">
            <label>{label}</label>
            <div className="branch-selector-container" ref={dropdownRef}>
                <div
                    className="branch-selector-trigger"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {selected.length === 0 ? (
                        <span className="branch-placeholder">Select branches...</span>
                    ) : (
                        <div className="branch-selected-chips">
                            {selected.slice(0, 2).map(s => (
                                <span key={s} className={`branch-selected-chip ${colorClass}`}>
                                    {s.replace('B.Tech. ', '').replace('M.Tech. ', '').replace('Ph.D. ', '')}
                                    <button onClick={(e) => removeSelected(s, e)}>&times;</button>
                                </span>
                            ))}
                            {selected.length > 2 && (
                                <span className="branch-more">+{selected.length - 2} more</span>
                            )}
                        </div>
                    )}
                    <span className="branch-arrow">{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                    <div className="branch-dropdown">
                        <div className="branch-dropdown-actions">
                            <button type="button" onClick={selectAll}>Select All</button>
                            <button type="button" onClick={clearAll}>Clear</button>
                        </div>
                        <div className="branch-dropdown-list">
                            {options.map(option => (
                                <label key={option} className="branch-option">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(option)}
                                        onChange={() => toggleOption(option)}
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyDetail;
