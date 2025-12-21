import { Link } from 'react-router-dom';
import './QuestionCard.css';

const QuestionCard = ({ question, onEdit, onDelete, showActions = true }) => {
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

    // Strip HTML tags for preview text
    const getPlainText = (html) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const company = question.company || {};
    const previewText = getPlainText(question.question);

    return (
        <article className="question-card card">
            <div className="question-card-header">
                <div className="company-info">
                    <div className="company-avatar">
                        {company.logo ? (
                            <img src={company.logo} alt={company.name} />
                        ) : (
                            <span>{getInitials(company.name)}</span>
                        )}
                    </div>
                    <div className="company-details">
                        <h3 className="company-name">{company.name}</h3>
                        <span className="question-date">
                            {monthNames[question.month - 1]} {question.year}
                        </span>
                    </div>
                </div>
                <div className="question-badges">
                    {getTypeBadge(question.type, question.otherType)}
                </div>
            </div>

            <Link to={`/questions/${question._id}`} className="question-content">
                <p className="question-text">
                    {previewText.length > 200
                        ? previewText.substring(0, 200) + '...'
                        : previewText}
                </p>
            </Link>

            <div className="question-card-footer">
                <div className="question-meta">
                    <span className="meta-text">
                        Added {new Date(question.createdAt).toLocaleDateString()}
                    </span>
                </div>

                {showActions && (
                    <div className="question-actions">
                        <Link
                            to={`/questions/${question._id}/edit`}
                            className="btn btn-ghost btn-sm"
                            title="Edit"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </Link>
                        <button
                            className="btn btn-ghost btn-sm text-error"
                            onClick={() => onDelete?.(question)}
                            title="Delete"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
};

export default QuestionCard;
