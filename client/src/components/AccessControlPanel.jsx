import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const toLines = (list) => (list || []).join('\n');
const fromLines = (text) => text.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);

// Admin Panel tab for controlling who can log in
const AccessControlPanel = () => {
    const [departments, setDepartments] = useState([]);
    const [restrictDepartments, setRestrictDepartments] = useState(false);
    const [allowedDepartments, setAllowedDepartments] = useState([]);
    const [years, setYears] = useState([]);
    const [restrictYears, setRestrictYears] = useState(false);
    const [allowedYears, setAllowedYears] = useState([]);
    const [allowedEmails, setAllowedEmails] = useState('');
    const [blockedEmails, setBlockedEmails] = useState('');
    const [newCode, setNewCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        adminAPI.getAccessRules()
            .then(({ data }) => {
                setDepartments(data.departments);
                setRestrictDepartments(data.restrictDepartments);
                setAllowedDepartments(data.allowedDepartments);
                setYears(data.years);
                setRestrictYears(data.restrictYears);
                setAllowedYears(data.allowedYears);
                setAllowedEmails(toLines(data.allowedEmails));
                setBlockedEmails(toLines(data.blockedEmails));
            })
            .catch(() => setMessage({ type: 'error', text: 'Failed to load access rules' }))
            .finally(() => setLoading(false));
    }, []);

    const toggleDepartment = (code) => {
        setAllowedDepartments((current) =>
            current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
        );
    };

    const toggleYear = (year) => {
        setAllowedYears((current) =>
            current.includes(year) ? current.filter((y) => y !== year) : [...current, year]
        );
    };

    const addDepartmentCode = () => {
        const code = newCode.trim().toLowerCase();
        if (!/^[a-z0-9-]{1,20}$/.test(code)) return;
        if (!departments.some((d) => d.code === code)) {
            setDepartments([...departments, { code, name: code.toUpperCase(), users: 0 }]);
        }
        if (!allowedDepartments.includes(code)) {
            setAllowedDepartments([...allowedDepartments, code]);
        }
        setNewCode('');
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await adminAPI.updateAccessRules({
                restrictDepartments,
                allowedDepartments,
                restrictYears,
                allowedYears,
                allowedEmails: fromLines(allowedEmails),
                blockedEmails: fromLines(blockedEmails),
            });
            setMessage({ type: 'success', text: 'Access rules saved. They apply to everyone within 30 seconds.' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save access rules' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="add-question-section">
            <div className="form-card">
                <h3>Who Can Log In</h3>
                <p className="form-hint">
                    Only verified IIT Roorkee Google accounts (@iitr.ac.in) can ever sign in.
                    Admins and superadmins are always allowed.
                </p>

                <div className="form-group">
                    <label className="access-toggle">
                        <input
                            type="checkbox"
                            checked={restrictDepartments}
                            onChange={(e) => setRestrictDepartments(e.target.checked)}
                        />
                        <span>Only allow selected departments</span>
                    </label>
                    <p className="form-hint">
                        Department comes from the email address, e.g. name@<strong>cs</strong>.iitr.ac.in.
                        When off, every IITR student can log in.
                    </p>
                </div>

                {restrictDepartments && (
                    <div className="form-group">
                        <label className="form-label">Allowed Departments</label>
                        <div className="access-departments">
                            {departments.map((d) => (
                                <label key={d.code} className="access-department">
                                    <input
                                        type="checkbox"
                                        checked={allowedDepartments.includes(d.code)}
                                        onChange={() => toggleDepartment(d.code)}
                                    />
                                    <span>{d.name}</span>
                                    <span className="access-code">{d.code}{d.users ? ` · ${d.users} users` : ''}</span>
                                </label>
                            ))}
                        </div>
                        <div className="access-add-code">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Other code, e.g. pe"
                                value={newCode}
                                onChange={(e) => setNewCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addDepartmentCode()}
                            />
                            <button type="button" className="btn btn-outline btn-sm" onClick={addDepartmentCode}>
                                Add
                            </button>
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <label className="access-toggle">
                        <input
                            type="checkbox"
                            checked={restrictYears}
                            onChange={(e) => setRestrictYears(e.target.checked)}
                        />
                        <span>Only allow selected batches</span>
                    </label>
                    <p className="form-hint">
                        Batch is the joining year from the enrollment number (23114001 → 2023).
                        Users without an enrollment number are blocked while this is on.
                    </p>
                </div>

                {restrictYears && (
                    <div className="form-group">
                        <label className="form-label">Allowed Batches</label>
                        <div className="access-departments">
                            {years.map((y) => (
                                <label key={y.year} className="access-department">
                                    <input
                                        type="checkbox"
                                        checked={allowedYears.includes(y.year)}
                                        onChange={() => toggleYear(y.year)}
                                    />
                                    <span>{y.year} batch</span>
                                    <span className="access-code">{y.users ? `${y.users} users` : ''}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Always Allow (one email per line)</label>
                    <textarea
                        className="form-textarea"
                        rows={4}
                        value={allowedEmails}
                        onChange={(e) => setAllowedEmails(e.target.value)}
                        placeholder="name_x@ee.iitr.ac.in"
                    />
                    <p className="form-hint">Let specific people in even if their department or batch isn't allowed.</p>
                </div>

                <div className="form-group">
                    <label className="form-label">Block (one email per line)</label>
                    <textarea
                        className="form-textarea"
                        rows={4}
                        value={blockedEmails}
                        onChange={(e) => setBlockedEmails(e.target.value)}
                        placeholder="name_x@cs.iitr.ac.in"
                    />
                    <p className="form-hint">Blocked users are signed out on their next request.</p>
                </div>

                {message && (
                    <div className={`alert alert-${message.type}`}>{message.text}</div>
                )}

                <div className="form-actions">
                    <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Access Rules'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccessControlPanel;
