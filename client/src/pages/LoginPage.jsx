import { useEffect, useState } from 'react';
import { useAuth } from '../context';
import { GoogleSignInButton } from '../components';
import { publicAPI } from '../services/api';
import './LoginPage.css';

const INSIDE = ['Online assessments', 'Interview rounds', 'Senior tips'];

const LoginPage = () => {
    const { loginWithGoogle, error } = useAuth();
    const [stats, setStats] = useState(null);

    // Real totals, so the page says what's actually inside (counts need no login)
    useEffect(() => {
        publicAPI.getStats().then(({ data }) => setStats(data)).catch(() => { });
    }, []);

    return (
        <div className="login-page">
            <div className="login-backdrop" aria-hidden="true" />

            <main className="login-layout">
                <section className="login-intro">
                    <div className="login-brand">
                        <span className="brand-mark">IQ</span>
                        <span className="brand-name">Intern at IITR</span>
                        <span className="brand-sep">/</span>
                        <span className="brand-by">by students, for students</span>
                    </div>

                    <h1>
                        The interview questions your seniors <em>wish they'd had</em>.
                    </h1>

                    <p className="login-lede">
                        OAs, interview rounds and the follow-ups nobody warns you about, written
                        down by IIT Roorkee students right after they walked out, with what they'd
                        revise next time.
                    </p>

                    <ul className="login-chips">
                        {INSIDE.map((item) => <li key={item}>{item}</li>)}
                    </ul>

                    <dl className="login-stats">
                        <div>
                            <dd>{stats ? stats.questions : '-'}</dd>
                            <dt>Questions</dt>
                        </div>
                        <div>
                            <dd>{stats ? stats.companies : '-'}</dd>
                            <dt>Companies</dt>
                        </div>
                        <div>
                            <dd>{stats ? stats.students : '-'}</dd>
                            <dt>Students</dt>
                        </div>
                    </dl>
                </section>

                <section className="login-panel">
                    <div className="login-card">
                        <h2>Sign in to continue</h2>
                        <p className="card-sub">Your institute Google account. No new password to remember.</p>

                        {error && <div className="alert alert-error">{error}</div>}

                        <GoogleSignInButton onCredential={loginWithGoogle} />

                        <p className="login-note">
                            Only <strong>@iitr.ac.in</strong> accounts can sign in. We read just
                            your name, photo and email, nothing else.
                        </p>
                    </div>

                    <p className="login-help">
                        Personal Gmail accounts won't work.
                    </p>
                </section>
            </main>
        </div>
    );
};

export default LoginPage;
