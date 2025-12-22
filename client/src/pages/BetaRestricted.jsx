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
                <div className="beta-icon">🚀</div>

                {reason === 'batch' ? (
                    <>
                        <h1>Launching Soon!</h1>
                        <p className="beta-message">
                            Thank you for your interest in <strong>Intern At IITR</strong>!
                        </p>
                        <p className="beta-details">
                            We're currently in beta testing with batches 2023 and earlier.
                            Access for batch 20{year} will be available soon!
                        </p>
                        <div className="info-box">
                            <span className="info-icon">ℹ️</span>
                            <span>Stay tuned - we'll be opening up to all batches shortly!</span>
                        </div>
                    </>
                ) : reason === 'department' ? (
                    <>
                        <h1>Beta Access Limited</h1>
                        <p className="beta-message">
                            Thank you for your interest in <strong>Intern At IITR</strong>!
                        </p>
                        <p className="beta-details">
                            We're currently in beta testing with the Computer Science & Engineering department.
                            Support for <strong>{branch}</strong> is coming soon!
                        </p>
                        <div className="info-box">
                            <span className="info-icon">ℹ️</span>
                            <span>We're expanding to more departments after the beta phase.</span>
                        </div>
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

                <Link to="/" className="btn btn-primary">
                    Back to Home
                </Link>
            </div>
        </div>
    );
};

export default BetaRestricted;
