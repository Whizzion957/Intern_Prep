import { useSearchParams, Link } from 'react-router-dom';
import './BetaRestricted.css';

const BetaRestricted = () => {
    const [searchParams] = useSearchParams();
    const reason = searchParams.get('reason');
    const branch = searchParams.get('branch');
    const year = searchParams.get('year');

    return (
        <div className="beta-restricted-page">
            <div className="beta-card">
                <div className="beta-icon">{reason === 'department' || reason === 'year' ? '🚀' : '🔒'}</div>

                {reason === 'department' ? (
                    <>
                        <h1>Access Limited</h1>
                        <p className="beta-message">
                            Thank you for your interest in <strong>Intern At IITR</strong>!
                        </p>
                        <p className="beta-details">
                            Access is currently open to selected departments only.
                            {branch && <> Support for <strong>{branch}</strong> is coming soon!</>}
                        </p>
                        <div className="info-box">
                            <span className="info-icon">ℹ️</span>
                            <span>We're expanding to more departments soon.</span>
                        </div>
                    </>
                ) : reason === 'year' ? (
                    <>
                        <h1>Launching Soon!</h1>
                        <p className="beta-message">
                            Thank you for your interest in <strong>Intern At IITR</strong>!
                        </p>
                        <p className="beta-details">
                            Access is currently open to selected batches only.
                            {year && <> Access for the <strong>{year}</strong> batch will be available soon!</>}
                        </p>
                        <div className="info-box">
                            <span className="info-icon">ℹ️</span>
                            <span>Stay tuned - we'll be opening up to more batches shortly!</span>
                        </div>
                    </>
                ) : reason === 'not_iitr' ? (
                    <>
                        <h1>IITR Account Required</h1>
                        <p className="beta-message">
                            <strong>Intern At IITR</strong> is only for IIT Roorkee students.
                        </p>
                        <p className="beta-details">
                            Please sign in with your institute Google account (e.g. name@cs.iitr.ac.in),
                            not a personal Gmail account.
                        </p>
                    </>
                ) : reason === 'blocked' ? (
                    <>
                        <h1>Access Revoked</h1>
                        <p className="beta-details">
                            Your account doesn't have access to this platform.
                            Contact the platform admins if you think this is a mistake.
                        </p>
                    </>
                ) : (
                    <>
                        <h1>Coming Soon!</h1>
                        <p className="beta-message">
                            <strong>Intern At IITR</strong> is currently in beta testing.
                        </p>
                        <p className="beta-details">
                            Full access will be available soon. Thank you for your patience!
                        </p>
                    </>
                )}

                <Link to="/login" className="btn btn-primary">
                    Back to Login
                </Link>
            </div>
        </div>
    );
};

export default BetaRestricted;
