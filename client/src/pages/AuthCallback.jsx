import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { handleCallback } = useAuth();

    useEffect(() => {
        const processCallback = async () => {
            const token = searchParams.get('token');
            const error = searchParams.get('error');

            if (error) {
                navigate('/login?error=' + error);
                return;
            }

            if (token) {
                try {
                    await handleCallback(token);
                    navigate('/');
                } catch (err) {
                    navigate('/login?error=auth_failed');
                }
            } else {
                navigate('/login?error=no_token');
            }
        };

        processCallback();
    }, [searchParams, handleCallback, navigate]);

    return (
        <div className="loading-page">
            <div className="loading-content">
                <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
                <p>Authenticating...</p>
            </div>
            <style>{`
        .loading-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--background);
        }
        .loading-content {
          text-align: center;
        }
        .loading-content p {
          margin-top: 1rem;
          color: var(--text-secondary);
        }
      `}</style>
        </div>
    );
};

export default AuthCallback;
