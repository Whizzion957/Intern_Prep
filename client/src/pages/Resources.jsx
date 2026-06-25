import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context';
import { resourceAPI } from '../services/api';
import './Resources.css';

const ResourceCard = ({ resource, onDelete, showActions }) => {
    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    };

    const getPlainText = (html) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    const previewText = getPlainText(resource.content);

    return (
        <article className="resource-card card">
            <div className="resource-card-header">
                <div className="resource-title-group">
                    <h3 className="resource-title">{resource.title}</h3>
                    <span className="badge badge-primary">{resource.category}</span>
                </div>
            </div>

            <Link to={`/resources/${resource._id}`} className="resource-content-link">
                <p className="resource-text">
                    {previewText.length > 200
                        ? previewText.substring(0, 200) + '...'
                        : previewText}
                </p>
            </Link>

            <div className="resource-card-footer">
                <div className="resource-meta">
                    <div className="resource-avatar">
                        {resource.submittedBy?.displayPicture ? (
                            <img src={resource.submittedBy.displayPicture} alt={resource.submittedBy?.fullName} />
                        ) : (
                            <span>{getInitials(resource.submittedBy?.fullName)}</span>
                        )}
                    </div>
                    <div className="meta-info">
                        <span className="meta-owner">
                            {resource.submittedBy?.fullName || 'Unknown'}
                        </span>
                        <span className="meta-date">
                            {new Date(resource.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                {showActions && (
                    <div className="resource-actions">
                        <Link
                            to={`/resources/${resource._id}/edit`}
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
                            onClick={() => onDelete?.(resource)}
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

const Resources = () => {
    const { user, isAdmin, isSuperAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [resources, setResources] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: parseInt(searchParams.get('page')) || 1,
        pages: 1,
        total: 0
    });

    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        category: searchParams.get('category') || '',
        sortBy: searchParams.get('sortBy') || 'createdAt',
        sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.category) params.set('category', filters.category);
        if (filters.sortBy !== 'createdAt') params.set('sortBy', filters.sortBy);
        if (filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder);
        if (pagination.page > 1) params.set('page', pagination.page.toString());

        setSearchParams(params, { replace: true });
    }, [filters, pagination.page]);

    useEffect(() => {
        loadResources();
    }, [filters, pagination.page]);

    const loadCategories = async () => {
        try {
            const { data } = await resourceAPI.getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const loadResources = async () => {
        setLoading(true);
        try {
            const params = {
                ...filters,
                page: pagination.page,
                limit: 12,
            };

            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const { data } = await resourceAPI.getAll(params);
            setResources(data.resources);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Failed to load resources:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        const value = e.target.value;
        setFilters((prev) => ({ ...prev, search: value }));
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            category: '',
            sortBy: 'createdAt',
            sortOrder: 'desc',
        });
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const handleDelete = async (resource) => {
        if (!window.confirm('Are you sure you want to delete this resource?')) return;

        try {
            await resourceAPI.delete(resource._id);
            loadResources();
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete resource');
        }
    };

    const hasActiveFilters = filters.search || filters.category;
    const canManage = (resource) => {
        if (!user) return false;
        if (isAdmin || isSuperAdmin) return true;
        return resource.submittedBy?._id === user._id;
    };

    return (
        <div className="resources-page">
            <header className="page-header">
                <div className="header-content">
                    <h1>Resources</h1>
                    <p>Important topics, guides, and study materials</p>
                </div>
                {user && (
                    <Link to="/add-resource" className="btn btn-primary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Resource
                    </Link>
                )}
            </header>

            <div className="search-section">
                <div className="search-bar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search resources by title, content, or category..."
                        value={filters.search}
                        onChange={handleSearch}
                    />
                    {filters.search && (
                        <button className="clear-search" onClick={() => handleFilterChange('search', '')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="filters-panel">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>Category</label>
                        <select
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Sort By</label>
                        <select
                            value={filters.sortBy}
                            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        >
                            <option value="createdAt">Date Added</option>
                            <option value="title">Title</option>
                            <option value="category">Category</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Order</label>
                        <select
                            value={filters.sortOrder}
                            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                        >
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                </div>

                {hasActiveFilters && (
                    <button className="clear-filters btn btn-ghost btn-sm" onClick={clearFilters}>
                        Clear Filters
                    </button>
                )}
            </div>

            <div className="results-info">
                <span>{pagination.total} resource{pagination.total !== 1 ? 's' : ''} found</span>
            </div>

            {loading ? (
                <div className="resources-loading">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton" style={{ height: '2rem', width: '60%', marginBottom: '1rem' }}></div>
                            <div className="skeleton" style={{ height: '4rem', width: '100%', marginBottom: '1rem' }}></div>
                            <div className="skeleton" style={{ height: '2rem', width: '40%' }}></div>
                        </div>
                    ))}
                </div>
            ) : resources.length === 0 ? (
                <div className="no-results">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <h3>No resources found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            ) : (
                <>
                    <div className="resources-grid">
                        {resources.map((resource) => (
                            <ResourceCard
                                key={resource._id}
                                resource={resource}
                                showActions={canManage(resource)}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>

                    {pagination.pages > 1 && (
                        <div className="pagination">
                            <button
                                className="btn btn-outline btn-sm"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                            >
                                Previous
                            </button>
                            <span className="pagination-info">
                                Page {pagination.page} of {pagination.pages}
                            </span>
                            <button
                                className="btn btn-outline btn-sm"
                                disabled={pagination.page === pagination.pages}
                                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Resources;
