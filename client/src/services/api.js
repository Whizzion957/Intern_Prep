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
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    getLoginUrl: () => api.get('/auth/login'),
    getMe: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout'),
};

// Company API
export const companyAPI = {
    getAll: (search = '') => api.get(`/companies?search=${search}`),
    getById: (id) => api.get(`/companies/${id}`),
    create: (formData) => api.post('/companies', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    updateLogo: (id, formData) => api.put(`/companies/${id}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Question API
export const questionAPI = {
    getAll: (params) => api.get('/questions', { params }),
    getById: (id) => api.get(`/questions/${id}`),
    getMy: () => api.get('/questions/my'),
    create: (data) => api.post('/questions', data),
    update: (id, data) => api.put(`/questions/${id}`, data),
    delete: (id) => api.delete(`/questions/${id}`),
    claim: (id) => api.post(`/questions/${id}/claim`),
    unclaim: (id) => api.delete(`/questions/${id}/claim`),
    // Admin: add/remove any user's claim
    adminAddClaim: (questionId, userId) => api.post(`/questions/${questionId}/claim/${userId}`),
    adminRemoveClaim: (questionId, userId) => api.delete(`/questions/${questionId}/claim/${userId}`),
};

// Admin API
export const adminAPI = {
    getUsers: (params) => api.get('/admin/users', { params }),
    updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
    addQuestionForUser: (data) => api.post('/admin/questions', data),
    getStats: () => api.get('/admin/stats'),
};

export default api;
