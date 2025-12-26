import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { CompanySearch, RichTextEditor } from '../components';
import { questionAPI } from '../services/api';
import './AddQuestion.css';

const AddQuestion = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [rateLimit, setRateLimit] = useState(null);

    const [formData, setFormData] = useState({
        company: null,
        type: 'interview',
        otherType: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        question: '',
        suggestions: '',
    });

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    // Fetch rate limit status on mount
    useEffect(() => {
        const fetchRateLimits = async () => {
            try {
                const { data } = await questionAPI.getRateLimits();
                if (data.enabled && data.limits?.questions) {
                    setRateLimit(data.limits.questions);
                }
            } catch (err) {
                // Silently ignore - rate limiting may not be configured
            }
        };
        fetchRateLimits();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.company) {
            setError('Please select a company');
            return;
        }

        // Strip HTML tags for validation check
        const textOnly = formData.question.replace(/<[^>]*>/g, '').trim();
        if (!textOnly) {
            setError('Please enter the question');
            return;
        }

        if (formData.type === 'others' && !formData.otherType.trim()) {
            setError('Please specify the question type');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = {
                company: formData.company._id,
                type: formData.type,
                otherType: formData.type === 'others' ? formData.otherType : undefined,
                month: parseInt(formData.month),
                year: parseInt(formData.year),
                question: formData.question.trim(),
                suggestions: formData.suggestions.trim() || undefined,
            };

            await questionAPI.create(data);
            navigate('/questions?submitted=true');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit question');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-question-page">
            <div className="page-header">
                <h1>Add Interview Question</h1>
                <p>Share your interview experience to help your juniors</p>
            </div>

            {/* Rate Limit Banner */}
            {rateLimit && (
                <div className={`rate-limit-banner ${rateLimit.remaining <= 2 ? 'warning' : ''} ${rateLimit.remaining === 0 ? 'error' : ''}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>
                        {rateLimit.remaining === 0 ? (
                            <>You've reached your daily limit. Try again later.</>
                        ) : (
                            <>Daily quota: <strong>{rateLimit.remaining}</strong> of {rateLimit.limit} questions remaining</>
                        )}
                    </span>
                </div>
            )}

            <form className="add-question-form" onSubmit={handleSubmit}>


                {/* Question Details Section */}
                <section className="form-section">
                    <h3>Question Details</h3>

                    <div className="form-group">
                        <label className="form-label">Question Type *</label>
                        <div className="radio-group">
                            <label className={`radio-card ${formData.type === 'interview' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="type"
                                    value="interview"
                                    checked={formData.type === 'interview'}
                                    onChange={handleChange}
                                />
                                <div className="radio-content">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                    <span>Interview</span>
                                </div>
                            </label>
                            <label className={`radio-card ${formData.type === 'oa' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="type"
                                    value="oa"
                                    checked={formData.type === 'oa'}
                                    onChange={handleChange}
                                />
                                <div className="radio-content">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                        <line x1="8" y1="21" x2="16" y2="21" />
                                        <line x1="12" y1="17" x2="12" y2="21" />
                                    </svg>
                                    <span>Online Assessment</span>
                                </div>
                            </label>
                            <label className={`radio-card ${formData.type === 'others' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="type"
                                    value="others"
                                    checked={formData.type === 'others'}
                                    onChange={handleChange}
                                />
                                <div className="radio-content">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>Others</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {formData.type === 'others' && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="otherType">Specify Type *</label>
                            <input
                                type="text"
                                id="otherType"
                                name="otherType"
                                className="form-input"
                                placeholder="e.g., HR Round, Group Discussion"
                                value={formData.otherType}
                                onChange={handleChange}
                            />
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="month">Month *</label>
                            <select
                                id="month"
                                name="month"
                                className="form-select"
                                value={formData.month}
                                onChange={handleChange}
                            >
                                {months.map((month, index) => (
                                    <option key={month} value={index + 1}>{month}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="year">Year *</label>
                            <select
                                id="year"
                                name="year"
                                className="form-select"
                                value={formData.year}
                                onChange={handleChange}
                            >
                                {years.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Company *</label>
                        <CompanySearch
                            value={formData.company}
                            onChange={(company) => setFormData((prev) => ({ ...prev, company }))}
                        />
                    </div>

                </section>

                {/* Question Content Section */}
                <section className="form-section">
                    <h3>Question</h3>

                    <div className="form-group">
                        <label className="form-label">Question/Problem Statement *</label>
                        <RichTextEditor
                            value={formData.question}
                            onChange={(value) => setFormData((prev) => ({ ...prev, question: value }))}
                            placeholder="Describe the question or problem you were asked. Include all relevant details..."
                            minHeight="200px"
                        />
                        <span className="form-hint">Be as detailed as possible. Include examples, constraints, and expected outputs if applicable.</span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Suggestions (Optional)</label>
                        <RichTextEditor
                            value={formData.suggestions}
                            onChange={(value) => setFormData((prev) => ({ ...prev, suggestions: value }))}
                            placeholder="Any tips, approach you used, or advice for others attempting this question..."
                            minHeight="120px"
                        />
                    </div>
                </section>

                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}

                <div className="form-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                                Submitting...
                            </>
                        ) : (
                            'Submit Question'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddQuestion;
