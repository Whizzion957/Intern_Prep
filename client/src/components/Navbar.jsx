import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useTheme } from '../context';
import { useState, useRef, useEffect } from 'react';
import { questionAPI } from '../services/api';
import { custodianAPI } from '../saviour/api';
import './Navbar.css';

const Navbar = () => {
    const { user, logout, isAdmin, isSuperAdmin } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    // The two portals share this navbar but not their links
    const inSaviour = pathname.startsWith('/saviour');
    const [savTour, setSavTour] = useState({ isCustodian: false, isAdmin: false });
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [rateLimits, setRateLimits] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch rate limits when dropdown opens
    useEffect(() => {
        if (dropdownOpen && user) {
            questionAPI.getRateLimits()
                .then(({ data }) => {
                    if (data.enabled) {
                        setRateLimits(data.limits);
                    }
                })
                .catch(() => setRateLimits(null));
        }
    }, [dropdownOpen, user]);

    // Who this person is inside Saviour decides which of its links they see
    useEffect(() => {
        if (!inSaviour || !user) return;
        custodianAPI.mine()
            .then(({ data }) => setSavTour({
                isCustodian: (data.custodianships || []).length > 0 || data.isSuperadmin,
                isAdmin: Boolean(data.isAdmin || data.isSuperadmin),
            }))
            .catch(() => setSavTour({ isCustodian: false, isAdmin: false }));
    }, [inSaviour, user]);

    // Flag the document while inside Saviour so its palette (defined in
    // saviour.css) applies to the portal and this navbar. Cleared on the way out.
    useEffect(() => {
        const root = document.documentElement;
        if (inSaviour) root.setAttribute('data-portal', 'saviour');
        else root.removeAttribute('data-portal');
        return () => root.removeAttribute('data-portal');
    }, [inSaviour]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to={inSaviour ? '/saviour' : '/'} className="navbar-brand" onClick={closeMobileMenu}>
                    <div className="navbar-logo">
                        <span className="logo-icon">{inSaviour ? 'SAV' : 'IAI'}</span>
                    </div>
                    <div className="navbar-title">
                        <span className="title-main">{inSaviour ? 'Saviour' : 'Intern At IITR'}</span>
                        <span className="title-sub">{inSaviour ? 'Course material' : 'Beta Version'}</span>
                    </div>
                </Link>

                <div className="navbar-actions">
                    {/* Desktop nav links */}
                    {user && inSaviour && (
                        <div className="nav-links-desktop">
                            <Link to="/saviour" className="nav-link">
                                Courses
                            </Link>
                            <Link to="/saviour/add" className="nav-link">
                                Add Material
                            </Link>
                            <Link to="/saviour/mine" className="nav-link">
                                My Submissions
                            </Link>
                            {savTour.isCustodian && (
                                <Link to="/saviour/approvals" className="nav-link">
                                    Approvals
                                </Link>
                            )}
                            {(savTour.isCustodian || savTour.isAdmin) && (
                                <Link to="/saviour/admin" className="nav-link">
                                    Corrections
                                </Link>
                            )}
                            {isSuperAdmin && (
                                <Link to="/saviour/custodians" className="nav-link nav-link-admin">
                                    Custodians
                                </Link>
                            )}
                            <Link to="/portal" className="nav-link nav-link-portal" title="Switch portal">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                </svg>
                                Switch
                            </Link>
                        </div>
                    )}

                    {user && !inSaviour && (
                        <div className="nav-links-desktop">
                            <Link to="/questions" className="nav-link">
                                Questions
                            </Link>
                            <Link to="/resources" className="nav-link">
                                Resources
                            </Link>
                            <Link to="/companies" className="nav-link">
                                Companies
                            </Link>
                            <Link to="/add" className="nav-link">
                                Add Question
                            </Link>
                            <Link to="/contributions" className="nav-link">
                                Credits
                            </Link>
                            {isSuperAdmin && (
                                <Link to="/admin" className="nav-link nav-link-admin">
                                    Admin
                                </Link>
                            )}
                            <Link to="/portal" className="nav-link nav-link-portal" title="Switch portal">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                </svg>
                                Switch
                            </Link>
                        </div>
                    )}

                    {/* Mobile hamburger button */}
                    {user && (
                        <button
                            className="mobile-menu-toggle"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="3" y1="18" x2="21" y2="18" />
                                </svg>
                            )}
                        </button>
                    )}

                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="5" />
                                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>

                    {user ? (
                        <div className={`dropdown ${dropdownOpen ? 'open' : ''}`} ref={dropdownRef}>
                            <button
                                className="user-menu-trigger"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                <div className="avatar avatar-md">
                                    {user.displayPicture ? (
                                        <img src={user.displayPicture} alt={user.fullName} />
                                    ) : (
                                        getInitials(user.fullName)
                                    )}
                                </div>
                                <span className="user-name">{user.fullName?.split(' ')[0]}</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            <div className="dropdown-menu">
                                <div className="dropdown-header">
                                    <div className="user-info">
                                        <span className="user-full-name">{user.fullName}</span>
                                        <span className="user-enrollment">{user.enrollmentNumber || user.email}</span>
                                        <span className="user-branch">{user.branch}</span>
                                    </div>
                                </div>
                                <hr className="dropdown-divider" />
                                <Link to={inSaviour ? '/saviour/mine' : '/my-submissions'} className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                    My Submissions
                                </Link>
                                {/* {rateLimits && (
                                    <>
                                        <hr className="dropdown-divider" />
                                        <div className="dropdown-section-title">Daily Limits</div>
                                        <div className="rate-limits-grid">
                                            {rateLimits.questions && (
                                                <div className="rate-limit-item">
                                                    <span className="rate-limit-label">Questions</span>
                                                    <span className={`rate-limit-value ${rateLimits.questions.remaining <= 2 ? 'low' : ''}`}>
                                                        {rateLimits.questions.remaining}/{rateLimits.questions.limit}
                                                    </span>
                                                </div>
                                            )}
                                            {rateLimits.companies && (
                                                <div className="rate-limit-item">
                                                    <span className="rate-limit-label">Companies</span>
                                                    <span className={`rate-limit-value ${rateLimits.companies.remaining <= 1 ? 'low' : ''}`}>
                                                        {rateLimits.companies.remaining}/{rateLimits.companies.limit}
                                                    </span>
                                                </div>
                                            )}
                                            {rateLimits.tips && (
                                                <div className="rate-limit-item">
                                                    <span className="rate-limit-label">Tips</span>
                                                    <span className={`rate-limit-value ${rateLimits.tips.remaining <= 5 ? 'low' : ''}`}>
                                                        {rateLimits.tips.remaining}/{rateLimits.tips.limit}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )} */}
                                <Link to="/portal" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="7" height="7" rx="1" />
                                        <rect x="14" y="3" width="7" height="7" rx="1" />
                                        <rect x="3" y="14" width="7" height="7" rx="1" />
                                        <rect x="14" y="14" width="7" height="7" rx="1" />
                                    </svg>
                                    Switch portal
                                </Link>
                                <hr className="dropdown-divider" />
                                <button className="dropdown-item" onClick={handleLogout}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    Logout
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Link to="/login" className="btn btn-primary btn-sm">
                            Login
                        </Link>
                    )}
                </div>
            </div>

            {/* Mobile menu overlay */}
            {user && mobileMenuOpen && (
                <div className="mobile-menu">
                    {inSaviour ? (
                        <>
                            <Link to="/saviour" className="mobile-menu-item" onClick={closeMobileMenu}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                                Courses
                            </Link>
                            <Link to="/saviour/add" className="mobile-menu-item" onClick={closeMobileMenu}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="16" />
                                    <line x1="8" y1="12" x2="16" y2="12" />
                                </svg>
                                Add Material
                            </Link>
                            <Link to="/saviour/mine" className="mobile-menu-item" onClick={closeMobileMenu}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                </svg>
                                My Submissions
                            </Link>
                            {savTour.isCustodian && (
                                <Link to="/saviour/approvals" className="mobile-menu-item" onClick={closeMobileMenu}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 11l3 3L22 4" />
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                    </svg>
                                    Approvals
                                </Link>
                            )}
                            {(savTour.isCustodian || savTour.isAdmin) && (
                                <Link to="/saviour/admin" className="mobile-menu-item" onClick={closeMobileMenu}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Corrections
                                </Link>
                            )}
                            {isSuperAdmin && (
                                <Link to="/saviour/custodians" className="mobile-menu-item mobile-menu-admin" onClick={closeMobileMenu}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                    </svg>
                                    Custodians
                                </Link>
                            )}
                            <Link to="/portal" className="mobile-menu-item" onClick={closeMobileMenu}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                </svg>
                                Switch portal
                            </Link>
                        </>
                    ) : (
                        <>
                    <Link to="/questions" className="mobile-menu-item" onClick={closeMobileMenu}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Questions
                    </Link>
                    <Link to="/resources" className="mobile-menu-item" onClick={closeMobileMenu}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        Resources
                    </Link>
                    <Link to="/companies" className="mobile-menu-item" onClick={closeMobileMenu}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                        Companies
                    </Link>
                    <Link to="/add" className="mobile-menu-item" onClick={closeMobileMenu}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        Add Question
                    </Link>
                    <Link to="/my-submissions" className="mobile-menu-item" onClick={closeMobileMenu}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        My Submissions
                    </Link>
                    <Link to="/contributions" className="mobile-menu-item" onClick={closeMobileMenu}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        Credits
                    </Link>
                    <Link to="/portal" className="mobile-menu-item" onClick={closeMobileMenu}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                        Switch portal
                    </Link>
                    {isSuperAdmin && (
                        <Link to="/admin" className="mobile-menu-item mobile-menu-admin" onClick={closeMobileMenu}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                            Admin Panel
                        </Link>
                    )}
                        </>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
