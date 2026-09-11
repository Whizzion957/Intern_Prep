import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Google's button only accepts a pixel width, between these bounds
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

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
    const initialisedRef = useRef(false);
    const [ready, setReady] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const { isDark } = useTheme();

    useEffect(() => {
        callbackRef.current = onCredential;
    }, [onCredential]);

    // Load the script and initialise once
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;

        let cancelled = false;
        loadGoogleScript()
            .then(() => {
                if (cancelled) return;
                if (!initialisedRef.current) {
                    window.google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: (response) => callbackRef.current(response.credential),
                        ux_mode: 'popup',
                    });
                    initialisedRef.current = true;
                }
                setReady(true);
            })
            .catch((err) => {
                if (!cancelled) setLoadError(err.message);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // (Re)draw the button when the theme changes or the container is resized,
    // because Google bakes width and colours into the rendered button.
    useEffect(() => {
        const container = containerRef.current;
        if (!ready || !container) return;

        let lastWidth = 0;

        const draw = () => {
            const width = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, container.offsetWidth)));
            // Redrawing changes the container's contents, which fires the observer
            // again; only redraw when the available width actually changed.
            if (width === lastWidth) return;
            lastWidth = width;
            container.replaceChildren();
            window.google.accounts.id.renderButton(container, {
                type: 'standard',
                theme: isDark ? 'filled_black' : 'outline',
                size: 'large',
                shape: 'pill',
                text: 'continue_with',
                logo_alignment: 'left',
                width,
            });
        };

        draw();

        let frame = null;
        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(draw);
        });
        // Watch the parent: its width drives the button, and it doesn't change
        // when we swap the button itself out.
        observer.observe(container.parentElement || container);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [ready, isDark]);

    if (!GOOGLE_CLIENT_ID) {
        return <div className="alert alert-error">Google Sign-In is not configured (VITE_GOOGLE_CLIENT_ID).</div>;
    }

    if (loadError) {
        return <div className="alert alert-error">{loadError}</div>;
    }

    return (
        <div className={`google-signin-button ${ready ? 'is-ready' : ''}`}>
            <div ref={containerRef} className="google-signin-slot" />
            {!ready && <span className="google-signin-placeholder">Loading Google sign-in...</span>}
        </div>
    );
};

export default GoogleSignInButton;
