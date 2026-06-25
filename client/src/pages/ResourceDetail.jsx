import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useAuth } from '../context';
import { resourceAPI } from '../services/api';
import './ResourceDetail.css';

const ResourceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAdmin, isSuperAdmin } = useAuth();
    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadResource();
    }, [id]);

    const loadResource = async () => {
        try {
            const { data } = await resourceAPI.getById(id);
            setResource(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load resource');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this resource?')) return;

        try {
            await resourceAPI.delete(resource._id);
            navigate('/resources', { replace: true });
        } catch (err) {
            console.error('Failed to delete:', err);
            alert('Failed to delete resource');
        }
    };

    if (loading) {
        return (
            <div className="resource-detail-page">
                <div className="skeleton" style={{ height: '3rem', width: '60%', marginBottom: '1rem' }}></div>
                <div className="skeleton" style={{ height: '2rem', width: '30%', marginBottom: '2rem' }}></div>
                <div className="skeleton" style={{ height: '20rem', width: '100%' }}></div>
            </div>
        );
    }

    if (error || !resource) {
        return (
            <div className="resource-detail-page">
                <div className="error-state">
                    <h2>Oops!</h2>
                    <p>{error || 'Resource not found'}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/resources')}>
                        Back to Resources
                    </button>
                </div>
            </div>
        );
    }

    const canManage = user && (isAdmin || isSuperAdmin || resource.submittedBy?._id === user._id);
    const sanitizedContent = DOMPurify.sanitize(resource.content);

    return (
        <div className="resource-detail-page">
            <button className="btn btn-ghost back-btn" onClick={() => navigate(-1)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                </svg>
                Back
            </button>

            <article className="resource-detail-content">
                <header className="resource-header">
                    <div className="resource-title-row">
                        <h1>{resource.title}</h1>
                        {canManage && (
                            <div className="resource-actions">
                                <Link to={`/resources/${resource._id}/edit`} className="btn btn-ghost btn-sm">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Edit
                                </Link>
                                <button className="btn btn-ghost btn-sm text-error" onClick={handleDelete}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="resource-meta">
                        <span className="badge badge-primary category-badge">{resource.category}</span>
                        <span className="meta-divider">•</span>
                        <div className="meta-user">
                            <div className="resource-detail-avatar">
                                {resource.submittedBy?.displayPicture ? (
                                    <img src={resource.submittedBy.displayPicture} alt={resource.submittedBy?.fullName} />
                                ) : (
                                    <span>{resource.submittedBy?.fullName?.charAt(0).toUpperCase() || '?'}</span>
                                )}
                            </div>
                            <span className="meta-text">
                                Added by <span className="meta-owner">{resource.submittedBy?.fullName || 'Unknown'}</span>
                            </span>
                        </div>
                        <span className="meta-divider">•</span>
                        <span className="meta-text">
                            {new Date(resource.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </span>
                    </div>
                </header>

                <div className="resource-body">
                    <div 
                        className="rich-text-content"
                        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    />
                </div>
            </article>
        </div>
    );
};

export default ResourceDetail;
