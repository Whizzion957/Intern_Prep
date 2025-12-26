import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context';
import { QuestionCard } from '../components';
import { questionAPI, companyAPI } from '../services/api';
import './ViewQuestions.css';

const ViewQuestions = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: parseInt(searchParams.get('page')) || 1,
        pages: 1,
        total: 0
    });

    // Company filter refs and state
    const companyDropdownRef = useRef(null);
    const [companySearch, setCompanySearch] = useState('');
    const [companyResults, setCompanyResults] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companySearchLoading, setCompanySearchLoading] = useState(false);
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
    const [visitedQuestions, setVisitedQuestions] = useState([]);

    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        company: searchParams.get('company') || '',
        type: searchParams.get('type') || '',
        year: searchParams.get('year') || '',
        sortBy: searchParams.get('sortBy') || 'createdAt',
        sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    // Sync filters to URL for browser history support
    useEffect(() => {
        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.company) params.set('company', filters.company);
        if (filters.type) params.set('type', filters.type);
        if (filters.year) params.set('year', filters.year);
        if (filters.sortBy !== 'createdAt') params.set('sortBy', filters.sortBy);
        if (filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder);
        if (pagination.page > 1) params.set('page', pagination.page.toString());

        setSearchParams(params, { replace: true });
    }, [filters, pagination.page]);

    // Close company dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target)) {
                setShowCompanyDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        loadQuestions();
    }, [filters, pagination.page]);

    // Load visited questions on mount
    useEffect(() => {
        const loadVisited = async () => {
            if (user) {
                try {
                    const { data } = await questionAPI.getVisited();
                    setVisitedQuestions(data || []);
                } catch (error) {
                    console.error('Failed to load visited questions:', error);
                }
            }
        };
        loadVisited();
    }, [user]);

    // Company search with debounce
    useEffect(() => {
        if (companySearch.length < 1) {
            setCompanyResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setCompanySearchLoading(true);
            try {
                const { data } = await companyAPI.getAll(companySearch);
                setCompanyResults(data.companies || data || []);
            } catch (error) {
                console.error('Company search error:', error);
                setCompanyResults([]);
            } finally {
                setCompanySearchLoading(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [companySearch]);

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

    const handleCompanySelect = (company) => {
        setSelectedCompany(company);
        setFilters((prev) => ({ ...prev, company: company._id }));
        setPagination((prev) => ({ ...prev, page: 1 }));
        setCompanySearch('');
        setCompanyResults([]);
        setShowCompanyDropdown(false);
    };

    const clearCompanyFilter = () => {
        setSelectedCompany(null);
        setFilters((prev) => ({ ...prev, company: '' }));
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            company: '',
            type: '',
            year: '',
            sortBy: 'createdAt',
            sortOrder: 'desc',
        });
        setSelectedCompany(null);
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

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    const hasActiveFilters = filters.search || filters.type || filters.year || filters.company;

    return (
        <div className="view-questions-page">
            <header className="page-header">
                <h1>Interview Questions</h1>
                <p>Browse and search all interview experiences shared by IITR students</p>
            </header>

            {/* Search Bar */}
            <div className="search-section">
                <div className="search-bar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search questions, companies, or claimed users..."
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

            {/* Selected Company Display */}
            {selectedCompany && (
                <div className="selected-company-display">
                    <div className="selected-company-logo">
                        {selectedCompany.logo ? (
                            <img src={selectedCompany.logo} alt={selectedCompany.name} />
                        ) : (
                            <span>{getInitials(selectedCompany.name)}</span>
                        )}
                    </div>
                    <span className="selected-company-name">{selectedCompany.name}</span>
                    <button className="clear-company-btn" onClick={clearCompanyFilter}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Filters - Always Visible */}
            <div className="filters-panel">
                <div className="filters-row">
                    {/* Company Search Filter */}
                    <div className="filter-group company-filter-group" ref={companyDropdownRef}>
                        <label>Company</label>
                        <div className="company-search-wrapper">
                            <input
                                type="text"
                                className="company-search-input"
                                placeholder={selectedCompany ? selectedCompany.name : "Search company..."}
                                value={companySearch}
                                onChange={(e) => {
                                    setCompanySearch(e.target.value);
                                    setShowCompanyDropdown(true);
                                }}
                                onFocus={() => setShowCompanyDropdown(true)}
                            />
                            {showCompanyDropdown && companyResults.length > 0 && (
                                <div className="company-dropdown">
                                    {companyResults.map((company) => (
                                        <div
                                            key={company._id}
                                            className="company-dropdown-item"
                                            onClick={() => handleCompanySelect(company)}
                                        >
                                            <div className="company-dropdown-logo">
                                                {company.logo ? (
                                                    <img src={company.logo} alt={company.name} />
                                                ) : (
                                                    <span>{getInitials(company.name)}</span>
                                                )}
                                            </div>
                                            <span>{company.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {showCompanyDropdown && companySearchLoading && (
                                <div className="company-dropdown">
                                    <div className="company-dropdown-loading">Searching...</div>
                                </div>
                            )}
                        </div>
                    </div>

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
                                isVisited={visitedQuestions.includes(question._id)}
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
