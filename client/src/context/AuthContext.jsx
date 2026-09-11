import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const { data } = await authAPI.getMe();
            setUser(data);
        } catch (err) {
            console.error('Auth check failed:', err);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    // Called with the ID token from the "Sign in with Google" button
    const loginWithGoogle = async (credential) => {
        setError(null);
        try {
            const { data } = await authAPI.googleLogin(credential);
            localStorage.setItem('token', data.token);
            setUser(data.user);
        } catch (err) {
            // Access-denied responses are redirected by the api interceptor
            if (err.response?.data?.code !== 'ACCESS_DENIED') {
                setError(err.response?.data?.message || 'Login failed. Please try again.');
            }
            console.error('Login error:', err);
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
        }
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const isSuperAdmin = user?.role === 'superadmin';

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                error,
                loginWithGoogle,
                setError,
                logout,
                checkAuth,
                isAdmin,
                isSuperAdmin,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
