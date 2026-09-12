/**
 * Saviour API client
 *
 * Mirrors the app's axios setup (auth header, 401 handling) but keeps every
 * saviour endpoint in this folder. Note there is no upload call anywhere:
 * materials are public Google Drive links and we store no bytes.
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const saviour = axios.create({ baseURL: `${API_URL}/saviour`, withCredentials: true });

saviour.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

saviour.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const courseAPI = {
  search: (params) => saviour.get('/courses', { params }),
  get: (identifier) => saviour.get(`/courses/${encodeURIComponent(identifier)}`),
  materials: (identifier) => saviour.get(`/courses/${encodeURIComponent(identifier)}/materials`),
  create: (data) => saviour.post('/courses', data),
  update: (id, data) => saviour.put(`/courses/${id}`, data),
  request: (data) => saviour.post('/courses/requests', data),
  listRequests: (status) => saviour.get('/courses/requests', { params: { status } }),
  // Accepting creates the catalog entry; `course` overrides what the student guessed
  decideRequest: (id, decision, course, note) =>
    saviour.patch(`/courses/requests/${id}`, { decision, course, note }),
};

export const materialAPI = {
  create: (data) => saviour.post('/materials', data),
  mine: () => saviour.get('/materials/mine'),
  get: (id) => saviour.get(`/materials/${id}`),
  update: (id, data) => saviour.patch(`/materials/${id}`, data),
  withdraw: (id) => saviour.delete(`/materials/${id}`),
  upvote: (id) => saviour.post(`/materials/${id}/upvote`),
  report: (id, reason, detail) => saviour.post(`/materials/${id}/report`, { reason, detail }),
  request: (data) => saviour.post('/materials/request', data),
};

export const approvalAPI = {
  queue: () => saviour.get('/approvals'),
  decide: (id, decision, note) => saviour.patch(`/materials/${id}/decide`, { decision, note }),
  // The custodian's re-upload path: point the record at the saviour Drive copy
  relink: (id, url, approve = true) => saviour.patch(`/materials/${id}/relink`, { url, approve }),
};

export const custodianAPI = {
  list: (includeInactive) => saviour.get('/custodians', { params: { includeInactive } }),
  mine: () => saviour.get('/custodians/mine'),
  assign: (data) => saviour.post('/custodians', data),
  remove: (id) => saviour.delete(`/custodians/${id}`),
};

export const professorAPI = {
  search: (params) => saviour.get('/professors', { params }),
  update: (id, data) => saviour.patch(`/professors/${id}`, data),
  merge: (id, into) => saviour.post(`/professors/${id}/merge`, { into }),
};

export const gapAPI = {
  list: (params) => saviour.get('/gaps', { params }),
};

export const KINDS = [
  { value: 'past_paper', label: 'Past paper' },
  { value: 'solution', label: 'Solution' },
  { value: 'notes', label: 'Notes' },
  { value: 'slides', label: 'Slides' },
  { value: 'book', label: 'Book' },
  { value: 'cheatsheet', label: 'Cheatsheet' },
  { value: 'other', label: 'Other' },
];

export const EXAMS = [
  { value: 'mid', label: 'Mid term' },
  { value: 'end', label: 'End term' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'practical', label: 'Practical' },
];

// Kinds pinned to a sitting of an exam rather than to a lecturer
export const EXAM_KINDS = ['past_paper', 'solution'];

export const kindLabel = (value) => KINDS.find((k) => k.value === value)?.label || value;
export const examLabel = (value) => EXAMS.find((e) => e.value === value)?.label || value;

export default saviour;
