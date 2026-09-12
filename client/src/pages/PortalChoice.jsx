import { Link } from 'react-router-dom';
import { useAuth } from '../context';
import './PortalChoice.css';

// Shown right after sign-in: the two halves of the platform live side by side,
// so people pick one instead of hunting for it in the navbar.
const PortalChoice = () => {
    const { user } = useAuth();
    const firstName = user?.fullName?.split(' ')[0];

    return (
        <div className="portal-page">
            <div className="portal-backdrop" aria-hidden="true" />

            <main className="portal-layout">
                <header className="portal-header">
                    <p className="portal-greeting">{firstName ? `Hi ${firstName},` : 'Welcome,'}</p>
                    <h1>Where are you headed?</h1>
                </header>

                <div className="portal-cards">
                    <Link to="/" className="portal-card portal-card-intern">
                        <span className="portal-icon" aria-hidden="true">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="14" rx="2" />
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                        </span>
                        <h2>Intern Prep</h2>
                        <p>
                            Interview questions, online assessments and company-wise tips from
                            students who have already been through the process.
                        </p>
                        <span className="portal-go">
                            Open
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </span>
                    </Link>

                    <Link to="/saviour" className="portal-card portal-card-saviour">
                        <span className="portal-icon" aria-hidden="true">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 10L12 5 2 10l10 5 10-5z" />
                                <path d="M6 12v5c3 3 9 3 12 0v-5" />
                            </svg>
                        </span>
                        <h2>Saviour</h2>
                        <p>
                            Past papers, notes and slides, organised by course and kept alive by
                            each batch so they survive after everyone graduates.
                        </p>
                        <span className="portal-go">
                            Open
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </span>
                    </Link>
                </div>

                <p className="portal-note">
                    You can switch between them anytime from the menu.
                </p>
            </main>
        </div>
    );
};

export default PortalChoice;
