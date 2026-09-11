import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url === '/auth/google';

        if (error.response?.status === 401 && !isLoginRequest) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }

        // Account not allowed by the access rules (set in Admin Panel)
        if (error.response?.status === 403 && error.response.data?.code === 'ACCESS_DENIED') {
            localStorage.removeItem('token');
            const params = new URLSearchParams({ reason: error.response.data.reason || '' });
            if (error.response.data.department) {
                params.set('branch', error.response.data.department);
            }
            if (error.response.data.year) {
                params.set('year', error.response.data.year);
            }
            window.location.href = `/beta-restricted?${params}`;
        }

        return Promise.reject(error);
    }
);

// Public API (no auth)
export const publicAPI = {
    getStats: () => api.get('/public/stats'),
};

// Auth API
export const authAPI = {
    googleLogin: (credential) => api.post('/auth/google', { credential }),
    getMe: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout'),
};

// Company API
export const companyAPI = {
    getAll: (search = '', page = 1) => api.get(`/companies?search=${search}&page=${page}`),
    getById: (id) => api.get(`/companies/${id}`),
    create: (formData) => api.post('/companies', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    updateLogo: (id, formData) => api.put(`/companies/${id}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    updateDetails: (id, data) => api.put(`/companies/${id}/details`, data),
    getBranches: () => api.get('/companies/branches'),
};

// Company Tips API
export const companyTipAPI = {
    getTips: (companyId) => api.get(`/companies/${companyId}/tips`),
    createTip: (companyId, data) => api.post(`/companies/${companyId}/tips`, data),
    updateTip: (tipId, data) => api.put(`/companies/tips/${tipId}`, data),
    deleteTip: (tipId) => api.delete(`/companies/tips/${tipId}`),
};

// Question API
export const questionAPI = {
    getAll: (params) => api.get('/questions', { params }),
    getById: (id) => api.get(`/questions/${id}`),
    create: (data) => api.post('/questions', data),
    update: (id, data) => api.put(`/questions/${id}`, data),
    delete: (id) => api.delete(`/questions/${id}`),
    // Visit tracking
    markVisited: (id) => api.post(`/questions/${id}/visit`),
    getVisited: () => api.get('/questions/user/visited'),
    // My submissions
    getMySubmissions: () => api.get('/questions/user/my-submissions'),
    getMySubmissionsCount: () => api.get('/questions/user/my-submissions-count'),
    // Rate limits
    getRateLimits: () => api.get('/questions/user/rate-limits'),
    // Admin: transfer ownership
    transferOwnership: (questionId, newOwnerEnrollment) =>
        api.put(`/questions/${questionId}/transfer`, { newOwnerEnrollment }),
};

// Resource API
export const resourceAPI = {
    getAll: (params) => api.get('/resources', { params }),
    getCategories: () => api.get('/resources/categories'),
    getById: (id) => api.get(`/resources/${id}`),
    create: (data) => api.post('/resources', data),
    update: (id, data) => api.put(`/resources/${id}`, data),
    delete: (id) => api.delete(`/resources/${id}`),
};

// Admin API
export const adminAPI = {
    getUsers: (params) => api.get('/admin/users', { params }),
    updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
    updateUserEnrollment: (id, enrollmentNumber) => api.put(`/admin/users/${id}/enrollment`, { enrollmentNumber }),
    addQuestionForUser: (data) => api.post('/admin/questions', data),
    getStats: () => api.get('/admin/stats'),
    getAccessRules: () => api.get('/admin/access'),
    updateAccessRules: (data) => api.put('/admin/access', data),
};

// Activity Logs API
export const logsAPI = {
    getLogs: (params) => api.get('/logs', { params }),
    getLogStats: () => api.get('/logs/stats'),
    getActions: () => api.get('/logs/actions'),
    getLog: (id) => api.get(`/logs/${id}`),
};

export default api;

