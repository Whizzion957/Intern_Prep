import { useAuth } from '../context';
import './LoginPage.css';

const LoginPage = () => {
    const { login, error } = useAuth();

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-graphic">
                    <div className="graphic-circle circle-1"></div>
                    <div className="graphic-circle circle-2"></div>
                    <div className="graphic-circle circle-3"></div>
                </div>

                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo">
                            <span className="logo-icon">IQ</span>
                        </div>
                        <h1>Interview Questions</h1>
                        <p className="login-subtitle">
                            A collaborative platform for IIT Roorkee students to share and learn from interview experiences
                        </p>
                    </div>

                    <div className="login-features">
                        <div className="feature">
                            <div className="feature-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                            </div>
                            <div className="feature-text">
                                <h4>Share Questions</h4>
                                <p>Add interview & OA questions you've faced</p>
                            </div>
                        </div>

                        <div className="feature">
                            <div className="feature-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                            </div>
                            <div className="feature-text">
                                <h4>Search & Filter</h4>
                                <p>Find questions by company, branch, or topic</p>
                            </div>
                        </div>

                        <div className="feature">
                            <div className="feature-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div className="feature-text">
                                <h4>Community Driven</h4>
                                <p>Learn from your seniors and peers</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    <button className="btn-channeli" onClick={login}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                        </svg>
                        Login with Channel-i
                    </button>

                    <p className="login-note">
                        Only IIT Roorkee students can access this platform
                    </p>
                </div>

                <footer className="login-footer">
                    <p>Made with ❤️ for IITR students</p>
                </footer>
            </div>
        </div>
    );
};

export default LoginPage;
