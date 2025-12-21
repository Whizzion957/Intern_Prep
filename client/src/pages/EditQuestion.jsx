import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context';
import { CompanySearch, RichTextEditor } from '../components';
import { questionAPI, companyAPI } from '../services/api';
import './EditQuestion.css';

const EditQuestion = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [question, setQuestion] = useState(null);

    const [formData, setFormData] = useState({
        company: null,
        type: 'interview',
        otherType: '',
        month: 1,
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

    useEffect(() => {
        loadQuestion();
    }, [id]);

    const loadQuestion = async () => {
        try {
            const { data } = await questionAPI.getById(id);
            setQuestion(data);

            // No ownership check - any authenticated user can edit
            setFormData({
                company: data.company,
                type: data.type,
                otherType: data.otherType || '',
                month: data.month,
                year: data.year,
                question: data.question,
                suggestions: data.suggestions || '',
            });
        } catch (err) {
            setError('Question not found');
        } finally {
            setLoading(false);
        }
    };

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

        setSubmitting(true);
        setError(null);

        try {
            await questionAPI.update(id, {
                company: formData.company._id,
                type: formData.type,
                otherType: formData.type === 'others' ? formData.otherType : undefined,
                month: parseInt(formData.month),
                year: parseInt(formData.year),
                question: formData.question.trim(),
                suggestions: formData.suggestions.trim() || undefined,
            });

            navigate(`/questions/${id}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update question');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="edit-question-page">
                <div className="loading-container">
                    <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
                    <p>Loading question...</p>
                </div>
            </div>
        );
    }

    if (error && !question) {
        return (
            <div className="edit-question-page">
                <div className="error-container">
                    <h2>Question Not Found</h2>
                    <p>{error}</p>
                    <Link to="/questions" className="btn btn-primary">
                        Back to Questions
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="edit-question-page">
            <div className="breadcrumb">
                <Link to="/questions">Questions</Link>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
                <Link to={`/questions/${id}`}>{question?.company?.name}</Link>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
                <span>Edit</span>
            </div>

            <div className="page-header">
                <h1>Edit Question</h1>
                <p>Update your interview question details</p>
            </div>

            <form className="edit-question-form" onSubmit={handleSubmit}>


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
                            placeholder="Describe the question or problem you were asked..."
                            minHeight="200px"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Suggestions (Optional)</label>
                        <RichTextEditor
                            value={formData.suggestions}
                            onChange={(value) => setFormData((prev) => ({ ...prev, suggestions: value }))}
                            placeholder="Any tips, approach you used, or advice..."
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
                    <Link to={`/questions/${id}`} className="btn btn-ghost">
                        Cancel
                    </Link>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                        {submitting ? (
                            <>
                                <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditQuestion;
