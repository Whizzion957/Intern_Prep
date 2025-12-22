import { useState, useEffect, useRef } from 'react';
import { companyAPI } from '../services/api';
import './CompanySearch.css';

const CompanySearch = ({ value, onChange, onCreateNew }) => {
    const [search, setSearch] = useState('');
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newLogo, setNewLogo] = useState(null);
    const [creating, setCreating] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [showLogoUpload, setShowLogoUpload] = useState(false);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const logoInputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setShowCreateForm(false);
                setShowLogoUpload(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (search.length > 0) {
            searchCompanies();
        } else {
            setCompanies([]);
        }
    }, [search]);

    const searchCompanies = async () => {
        setLoading(true);
        try {
            const { data } = await companyAPI.getAll(search);
            setCompanies(data.companies || data || []);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (company) => {
        onChange(company);
        setSearch('');
        setIsOpen(false);
        setShowCreateForm(false);
        setShowLogoUpload(false);
    };

    const handleCreateNew = async () => {
        if (!search.trim()) return;

        setCreating(true);
        try {
            const formData = new FormData();
            formData.append('name', search.trim());
            if (newLogo) {
                formData.append('logo', newLogo);
            }

            const { data } = await companyAPI.create(formData);
            handleSelect(data);
            onCreateNew?.(data);
        } catch (error) {
            console.error('Create company error:', error);
            alert(error.response?.data?.message || 'Failed to create company');
        } finally {
            setCreating(false);
            setNewLogo(null);
        }
    };

    const handleUploadLogoForExisting = async (file) => {
        if (!value || !file) return;

        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);

            const { data } = await companyAPI.updateLogo(value._id, formData);
            onChange(data); // Update the selected company with new logo
            setShowLogoUpload(false);
            alert('Logo uploaded successfully!');
        } catch (error) {
            console.error('Upload logo error:', error);
            alert(error.response?.data?.message || 'Failed to upload logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    };

    const noResults = search.length > 0 && !loading && companies.length === 0;

    return (
        <div className="company-search" ref={wrapperRef}>
            <div className="company-search-input-wrapper">
                {value ? (
                    <div className="selected-company">
                        <div className="selected-company-avatar">
                            {value.logo ? (
                                <img src={value.logo} alt={value.name} />
                            ) : (
                                <span>{getInitials(value.name)}</span>
                            )}
                        </div>
                        <span className="selected-company-name">{value.name}</span>

                        {/* Show Add Logo button if no logo */}
                        {!value.logo && (
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm add-logo-btn"
                                onClick={() => setShowLogoUpload(!showLogoUpload)}
                                title="Add logo for this company"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                                Add Logo
                            </button>
                        )}

                        <button
                            type="button"
                            className="clear-selection"
                            onClick={() => onChange(null)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <input
                        ref={inputRef}
                        type="text"
                        className="form-input"
                        placeholder="Search or add company..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                )}
            </div>

            {/* Logo upload dropdown for existing company */}
            {showLogoUpload && value && !value.logo && (
                <div className="logo-upload-dropdown">
                    <div className="logo-upload-content">
                        <h4>Add Logo for {value.name}</h4>
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadLogoForExisting(e.target.files[0])}
                            hidden
                        />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploadingLogo}
                        >
                            {uploadingLogo ? (
                                <>
                                    <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                                    Uploading...
                                </>
                            ) : (
                                'Choose Image'
                            )}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setShowLogoUpload(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {isOpen && !value && (
                <div className="company-search-dropdown">
                    {loading && (
                        <div className="search-loading">
                            <div className="spinner"></div>
                            <span>Searching...</span>
                        </div>
                    )}

                    {!loading && companies.length > 0 && (
                        <ul className="company-list">
                            {companies.map((company) => (
                                <li
                                    key={company._id}
                                    className="company-item"
                                    onClick={() => handleSelect(company)}
                                >
                                    <div className="company-item-avatar">
                                        {company.logo ? (
                                            <img src={company.logo} alt={company.name} />
                                        ) : (
                                            <span>{getInitials(company.name)}</span>
                                        )}
                                    </div>
                                    <span className="company-item-name">{company.name}</span>
                                    {!company.logo && (
                                        <span className="no-logo-badge">No logo</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {noResults && !showCreateForm && (
                        <div className="no-results">
                            <p>No company found for "{search}"</p>
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => setShowCreateForm(true)}
                            >
                                + Add "{search}"
                            </button>
                        </div>
                    )}

                    {showCreateForm && (
                        <div className="create-company-form">
                            <h4>Add New Company</h4>
                            <p className="create-company-name">{search}</p>

                            <div className="logo-upload">
                                <label htmlFor="company-logo" className="logo-upload-label">
                                    {newLogo ? (
                                        <img
                                            src={URL.createObjectURL(newLogo)}
                                            alt="Logo preview"
                                            className="logo-preview"
                                        />
                                    ) : (
                                        <>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            <span>Upload Logo (optional)</span>
                                        </>
                                    )}
                                </label>
                                <input
                                    type="file"
                                    id="company-logo"
                                    accept="image/*"
                                    onChange={(e) => setNewLogo(e.target.files[0])}
                                    hidden
                                />
                                {newLogo && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setNewLogo(null)}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div className="create-actions">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setShowCreateForm(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleCreateNew}
                                    disabled={creating}
                                >
                                    {creating ? 'Creating...' : 'Create Company'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CompanySearch;
