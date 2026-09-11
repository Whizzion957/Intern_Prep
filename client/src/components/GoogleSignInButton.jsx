import { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let scriptPromise = null;

// Load Google Identity Services once, only on pages that need it
const loadGoogleScript = () => {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = GOOGLE_SCRIPT_SRC;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => {
                scriptPromise = null;
                reject(new Error('Could not load Google Sign-In. Check your connection or ad blocker.'));
            };
            document.head.appendChild(script);
        });
    }
    return scriptPromise;
};

// Renders Google's official button; calls onCredential with the ID token
const GoogleSignInButton = ({ onCredential }) => {
    const containerRef = useRef(null);
    const callbackRef = useRef(onCredential);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        callbackRef.current = onCredential;
    }, [onCredential]);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;

        let cancelled = false;
        loadGoogleScript()
            .then(() => {
                if (cancelled || !containerRef.current) return;
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (response) => callbackRef.current(response.credential),
                    ux_mode: 'popup',
                });
                window.google.accounts.id.renderButton(containerRef.current, {
                    theme: 'filled_blue',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    width: Math.min(400, Math.max(200, containerRef.current.offsetWidth)),
                });
            })
            .catch((err) => {
                if (!cancelled) setLoadError(err.message);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    if (!GOOGLE_CLIENT_ID) {
        return <div className="alert alert-error">Google Sign-In is not configured (VITE_GOOGLE_CLIENT_ID).</div>;
    }

    if (loadError) {
        return <div className="alert alert-error">{loadError}</div>;
    }

    return <div ref={containerRef} className="google-signin-button" />;
};

export default GoogleSignInButton;
