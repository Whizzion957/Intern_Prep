import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context';
import { QuestionCard } from '../components';
import { questionAPI } from '../services/api';
import './ViewQuestions.css';

const ViewQuestions = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        type: searchParams.get('type') || '',
        year: searchParams.get('year') || '',
        sortBy: searchParams.get('sortBy') || 'createdAt',
        sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadQuestions();
    }, [filters, pagination.page]);

    useEffect(() => {
        // Show success toast if just submitted
        if (searchParams.get('submitted')) {
            // Could add a toast notification here
            searchParams.delete('submitted');
            setSearchParams(searchParams);
        }
    }, []);

    const loadQuestions = async () => {
        setLoading(true);
        try {
            const params = {
                ...filters,
                page: pagination.page,
                limit: 12,
            };

            // Remove empty params
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const { data } = await questionAPI.getAll(params);
            setQuestions(data.questions);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Failed to load questions:', error);
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
            type: '',
            year: '',
            sortBy: 'createdAt',
            sortOrder: 'desc',
        });
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const handleDelete = async (question) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;

        try {
            await questionAPI.delete(question._id);
            loadQuestions();
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete question');
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    const hasActiveFilters = filters.type || filters.result || filters.year;

    return (
        <div className="view-questions-page">
            <header className="page-header">
                <h1>Interview Questions</h1>
                <p>Browse and search all interview experiences shared by IITR students</p>
            </header>

            <div className="search-section">
                <div className="search-bar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by company, question, student name, branch, enrollment..."
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

                <button
                    className={`filter-toggle btn btn-outline ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    Filters
                    {hasActiveFilters && <span className="filter-badge">{[filters.type, filters.year].filter(Boolean).length}</span>}
                </button>
            </div>

            {showFilters && (
                <div className="filters-panel">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label>Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => handleFilterChange('type', e.target.value)}
                            >
                                <option value="">All Types</option>
                                <option value="interview">Interview</option>
                                <option value="oa">Online Assessment</option>
                                <option value="others">Others</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Year</label>
                            <select
                                value={filters.year}
                                onChange={(e) => handleFilterChange('year', e.target.value)}
                            >
                                <option value="">All Years</option>
                                {years.map((year) => (
                                    <option key={year} value={year}>{year}</option>
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
                                <option value="year">Interview Year</option>
                                <option value="company">Company</option>
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
                            Clear All Filters
                        </button>
                    )}
                </div>
            )}

            <div className="results-info">
                <span>{pagination.total} question{pagination.total !== 1 ? 's' : ''} found</span>
            </div>

            {loading ? (
                <div className="questions-loading">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton" style={{ height: '3rem', width: '3rem', borderRadius: '8px' }}></div>
                            <div style={{ flex: 1 }}>
                                <div className="skeleton" style={{ height: '1rem', width: '40%', marginBottom: '0.5rem' }}></div>
                                <div className="skeleton" style={{ height: '3rem', width: '100%' }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : questions.length === 0 ? (
                <div className="no-results">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <h3>No questions found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            ) : (
                <>
                    <div className="questions-grid">
                        {questions.map((question) => (
                            <QuestionCard
                                key={question._id}
                                question={question}
                                showActions={!!user}
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

export default ViewQuestions;
