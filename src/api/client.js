/**
 * ProtSphere API Client
 *
 * Replaces direct Firestore calls. All mutations go through backend.
 * Firestore reads still happen for real-time subscriptions via SDK.
 */

import { getAuth } from 'firebase/auth';

// API base URL — same origin in production (Vercel), or configure via env
const API_BASE = import.meta.env.VITE_API_URL || '/api';

let currentToken = null;
let tokenListener = null;

/**
 * Initialize: listen for auth token changes
 */
export function initApiClient() {
  const auth = getAuth();
  if (tokenListener) return;
  tokenListener = auth.onIdTokenChanged(async (user) => {
    if (user) {
      currentToken = await user.getIdToken();
    } else {
      currentToken = null;
    }
  });
}

/**
 * Get fresh token — force refresh if needed
 */
async function getToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    try {
      currentToken = await user.getIdToken(true);
    } catch {
      currentToken = await user.getIdToken();
    }
  }
  return currentToken;
}

/**
 * Core request function
 */
async function request(method, path, body = null) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const resp = await fetch(`${API_BASE}${path}`, opts);
  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.error || `API ${method} ${path} failed (${resp.status})`);
  }
  return data;
}

// ─── Auth ───
export const apiAuth = {
  verify: (idToken) => request('POST', '/api/auth/verify', { idToken }),
  me: () => request('GET', '/api/auth/me'),
  checkAdmin: (uid) => request('GET', `/api/auth/check-admin?uid=${uid}`),
};

// ─── People CRUD ───
export const apiPeople = {
  list: () => request('GET', '/api/people'),
  get: (id) => request('GET', `/api/people/${id}`),
  create: (data) => request('POST', '/api/people', data),
  update: (id, data) => request('PUT', `/api/people/${id}`, data),
  delete: (id) => request('DELETE', `/api/people/${id}`),
};

// ─── Events CRUD ───
export const apiEvents = {
  list: () => request('GET', '/api/events'),
  get: (id) => request('GET', `/api/events/${id}`),
  create: (data) => request('POST', '/api/events', data),
  update: (id, data) => request('PUT', `/api/events/${id}`, data),
  delete: (id) => request('DELETE', `/api/events/${id}`),
};

// ─── Memories CRUD ───
export const apiMemories = {
  list: () => request('GET', '/api/memories'),
  get: (id) => request('GET', `/api/memories/${id}`),
  create: (data) => request('POST', '/api/memories', data),
  update: (id, data) => request('PUT', `/api/memories/${id}`, data),
  delete: (id) => request('DELETE', `/api/memories/${id}`),
};

// ─── Places CRUD ───
export const apiPlaces = {
  list: () => request('GET', '/api/places'),
  get: (id) => request('GET', `/api/places/${id}`),
  create: (data) => request('POST', '/api/places', data),
  update: (id, data) => request('PUT', `/api/places/${id}`, data),
  delete: (id) => request('DELETE', `/api/places/${id}`),
};

// ─── Import / Export ───
export const apiDataHub = {
  listConnectors: () => request('GET', '/api/import/connectors'),
  importSheets: (url) => request('POST', '/api/import/sheets', { url }),
  importJson: (data) => request('POST', '/api/import/json', { data }),
  importUpload: (items) => request('POST', '/api/import/upload', { items }),
  exportJson: () => request('GET', '/api/export/json'),
  exportCollection: (coll) => request('GET', `/api/export/${coll}`),
};

export default { initApiClient, apiAuth, apiPeople, apiEvents, apiMemories, apiPlaces, apiDataHub };
