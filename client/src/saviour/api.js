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
  myRequests: () => saviour.get('/courses/requests/mine'),
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
  // One-click: the server copies the public file into the custodian's folder
  // using their short-lived drive.file token, then approves.
  adopt: (id, accessToken) => saviour.post(`/materials/${id}/adopt`, { accessToken }),
};

export const custodianAPI = {
  list: (includeInactive) => saviour.get('/custodians', { params: { includeInactive } }),
  mine: () => saviour.get('/custodians/mine'),
  assign: (data) => saviour.post('/custodians', data),
  remove: (id) => saviour.delete(`/custodians/${id}`),
  // The custodian records the folder they just granted via the Picker
  connectFolder: (id, folderId, folderUrl) =>
    saviour.patch(`/custodians/${id}/folder`, { folderId, folderUrl }),
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
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'surprise_quiz', label: 'Surprise quiz' },
  { value: 'tutorial', label: 'Tutorial' },
];

// Which sitting a paper or solution is from
export const EXAMS = [
  { value: 'mid', label: 'MTE' },
  { value: 'end', label: 'ETE' },
  { value: 'practical', label: 'Practical' },
];

// Legacy values that still exist on old records
const LEGACY_LABELS = {
  cheatsheet: 'Cheatsheet',
  other: 'Other',
  quiz_exam: 'Quiz',
  tutorial_exam: 'Tutorial',
};

// Kinds that get their own block on the course page (order matters), each with
// year links to a dedicated list page. Papers and solutions live in the grid.
export const NON_EXAM_KINDS = ['assignment', 'quiz', 'surprise_quiz', 'tutorial', 'notes', 'slides', 'book'];

const PLURAL = {
  assignment: 'Assignments',
  quiz: 'Quizzes',
  surprise_quiz: 'Surprise quizzes',
  tutorial: 'Tutorials',
  notes: 'Notes',
  slides: 'Slides',
  book: 'Books',
};
export const kindLabelPlural = (value) => PLURAL[value] || `${kindLabel(value)}`;

export const EXAM_KINDS = ['past_paper', 'solution'];
export const PROFESSOR_REQUIRED_KINDS = ['notes', 'slides', 'assignment', 'quiz', 'surprise_quiz', 'tutorial'];

export const kindLabel = (value) =>
  KINDS.find((k) => k.value === value)?.label || LEGACY_LABELS[value] || value;
export const examLabel = (value) =>
  EXAMS.find((e) => e.value === value)?.label ||
  { quiz: 'Quiz', tutorial: 'Tutorial' }[value] || value;

export default saviour;
