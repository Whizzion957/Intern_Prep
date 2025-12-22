import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { companyAPI } from '../services/api';
import './Companies.css';

const Companies = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    useEffect(() => {
        loadCompanies(1); // Reset to page 1 when search changes
    }, [search]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        setSearchParams(params, { replace: true });
    }, [search]);

    const loadCompanies = async (page = 1) => {
        setLoading(true);
        try {
            const { data } = await companyAPI.getAll(search, page);
            setCompanies(data.companies);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Failed to load companies:', error);
            // Fallback for old API format
            if (Array.isArray(error?.response?.data)) {
                setCompanies(error.response.data);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            loadCompanies(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    };

    return (
        <div className="companies-page">
            <header className="page-header">
                <h1>Companies</h1>
                <p>Browse companies that recruit from IIT Roorkee</p>
            </header>

            <div className="search-section">
                <div className="search-bar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search companies..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="clear-search" onClick={() => setSearch('')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="results-info">
                <span>{pagination.total} compan{pagination.total !== 1 ? 'ies' : 'y'} found</span>
                {pagination.pages > 1 && (
                    <span className="page-info">Page {pagination.page} of {pagination.pages}</span>
                )}
            </div>

            {loading ? (
                <div className="companies-loading">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="skeleton-card company-skeleton">
                            <div className="skeleton" style={{ height: '4rem', width: '4rem', borderRadius: '12px' }}></div>
                            <div className="skeleton" style={{ height: '1.25rem', width: '60%', marginTop: '1rem' }}></div>
                        </div>
                    ))}
                </div>
            ) : companies.length === 0 ? (
                <div className="no-results">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <h3>No companies found</h3>
                    <p>Try adjusting your search</p>
                </div>
            ) : (
                <>
                    <div className="companies-grid">
                        {companies.map((company) => (
                            <Link
                                key={company._id}
                                to={`/companies/${company._id}`}
                                className="company-card"
                            >
                                <div className="company-logo">
                                    {company.logo ? (
                                        <img src={company.logo} alt={company.name} />
                                    ) : (
                                        <span>{getInitials(company.name)}</span>
                                    )}
                                </div>
                                <h3 className="company-name">{company.name}</h3>
                            </Link>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="pagination">
                            <button
                                className="btn btn-ghost"
                                disabled={pagination.page <= 1}
                                onClick={() => handlePageChange(pagination.page - 1)}
                            >
                                ← Previous
                            </button>

                            <div className="page-numbers">
                                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === pagination.pages || Math.abs(p - pagination.page) <= 2)
                                    .map((pageNum, idx, arr) => (
                                        <span key={pageNum}>
                                            {idx > 0 && arr[idx - 1] !== pageNum - 1 && <span className="ellipsis">...</span>}
                                            <button
                                                className={`page-btn ${pageNum === pagination.page ? 'active' : ''}`}
                                                onClick={() => handlePageChange(pageNum)}
                                            >
                                                {pageNum}
                                            </button>
                                        </span>
                                    ))}
                            </div>

                            <button
                                className="btn btn-ghost"
                                disabled={pagination.page >= pagination.pages}
                                onClick={() => handlePageChange(pagination.page + 1)}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Companies;
