import { API_BASE } from './env.js';

function getToken() {
  return localStorage.getItem('ca_token');
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Espera un momento y reintenta.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || `Error HTTP ${res.status}`);
    error.status = res.status;
    error.details = data.details;
    throw error;
  }

  return data;
}

export const authApi = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => api('/auth/me'),
};

export const devicesApi = {
  list: () => api('/devices'),
  create: (payload) => api('/devices', { method: 'POST', body: payload }),
  /** Endpoint público HTTP (Flutter + simulador) */
  pushLocation: (payload) => api('/devices/location', { method: 'POST', body: payload }),
  updateLocation: (deviceKey, payload) =>
    api(`/devices/${encodeURIComponent(deviceKey)}/location`, {
      method: 'POST',
      body: payload,
    }),
};

export const geofencesApi = {
  list: () => api('/geofences'),
  create: (payload) => api('/geofences', { method: 'POST', body: payload }),
  update: (id, payload) => api(`/geofences/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => api(`/geofences/${id}`, { method: 'DELETE' }),
  events: (limit = 50) => api(`/geofences/events?limit=${limit}`),
};
