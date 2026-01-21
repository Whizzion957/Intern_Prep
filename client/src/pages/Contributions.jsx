import { Link } from 'react-router-dom';
import './Contributions.css';

const Contributions = () => {
    return (
        <div className="contributions-page">
            <div className="contributions-container">
                {/* Header */}
                <header className="contributions-header">
                    <h1>Credits & Contributions</h1>
                    <p>The people who made this platform possible</p>
                </header>

                {/* Developers Section */}
                <section className="section developers-section">
                    <h2>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 18l6-6-6-6" />
                            <path d="M8 6l-6 6 6 6" />
                        </svg>
                        Developers
                    </h2>
                    <div className="developers-grid">
                        <div className="developer-card primary">
                            <div className="developer-avatar">
                                <span>A</span>
                            </div>
                            <div className="developer-info">
                                <h3>Aadit Kumar Sahoo</h3>
                                <span className="role">Lead Developer</span>
                                <p>IIT Roorkee • CSE'27</p>
                                <div className="developer-links">
                                    <a href="https://github.com/Whizzion957" target="_blank" rel="noopener noreferrer">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                        </svg>
                                    </a>
                                    <a href="https://www.linkedin.com/in/aadit-kumar-sahoo-b017691ab/" target="_blank" rel="noopener noreferrer">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="developer-card ai">
                            <div className="developer-avatar ai-avatar">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                    <path d="M2 17l10 5 10-5" />
                                    <path d="M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <div className="developer-info">
                                <h3>Antigravity AI</h3>
                                <span className="role">AI Pair Programmer</span>
                                <p>Google DeepMind</p>
                                <div className="ai-badge">
                                    <span>✨ Powered by Gemini</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contributors Section */}
                <section className="section contributors-section">
                    <h2>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Contributors
                    </h2>
                    <p className="section-subtitle">
                        Everyone who has contributed questions, tips, and helped build this community.
                    </p>
                    <div className="contributors-cta">
                        <p>Want to contribute? Share your interview experiences!</p>
                        <Link to="/add" className="btn btn-primary">
                            Add Your Question
                        </Link>
                    </div>
                </section>

                {/* Contact Section */}
                <section className="section contact-section">
                    <h2>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                        </svg>
                        Contact Developer
                    </h2>
                    <div className="contact-cards">
                        <a href="mailto:aaditkumarsahoo@gmail.com" className="contact-card">
                            <div className="contact-icon email">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            </div>
                            <div className="contact-info">
                                <span className="contact-label">Email</span>
                                <span className="contact-value">aaditkumarsahoo@gmail.com</span>
                            </div>
                        </a>
                        <a href="https://www.linkedin.com/in/aadit-kumar-sahoo-b017691ab/" target="_blank" rel="noopener noreferrer" className="contact-card">
                            <div className="contact-icon linkedin">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                </svg>
                            </div>
                            <div className="contact-info">
                                <span className="contact-label">LinkedIn</span>
                                <span className="contact-value">Aadit Kumar Sahoo</span>
                            </div>
                        </a>
                        <a href="https://github.com/Whizzion957" target="_blank" rel="noopener noreferrer" className="contact-card">
                            <div className="contact-icon github">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </div>
                            <div className="contact-info">
                                <span className="contact-label">GitHub</span>
                                <span className="contact-value">Aadit Kumar Sahoo</span>
                            </div>
                        </a>
                    </div>
                </section>

                {/* Footer */}
                <footer className="contributions-footer">
                    <p>Built with ❤️ for IIT Roorkee</p>
                    <Link to="/" className="back-link">← Back to Home</Link>
                </footer>
            </div>
        </div>
    );
};

export default Contributions;
