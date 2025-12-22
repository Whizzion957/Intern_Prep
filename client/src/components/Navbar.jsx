import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useTheme } from '../context';
import { useState, useRef, useEffect } from 'react';
import './Navbar.css';

const Navbar = () => {
    const { user, logout, isAdmin, isSuperAdmin } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
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

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">
                    <div className="navbar-logo">
                        <span className="logo-icon">IAI</span>
                    </div>
                    <div className="navbar-title">
                        <span className="title-main">Intern At IITR</span>
                        <span className="title-sub">Beta Version</span>
                    </div>
                </Link>

                <div className="navbar-actions">
                    {user && (
                        <>
                            <Link to="/questions" className="nav-link">
                                Questions
                            </Link>
                            <Link to="/companies" className="nav-link">
                                Companies
                            </Link>
                            <Link to="/add" className="nav-link">
                                Add Question
                            </Link>
                            {isSuperAdmin && (
                                <Link to="/admin" className="nav-link nav-link-admin">
                                    Admin
                                </Link>
                            )}
                        </>
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
                                        <span className="user-enrollment">{user.enrollmentNumber}</span>
                                        <span className="user-branch">{user.branch}</span>
                                    </div>
                                </div>
                                <hr className="dropdown-divider" />
                                <Link to="/my-claims" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                    My Claims
                                </Link>
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
        </nav>
    );
};

export default Navbar;
