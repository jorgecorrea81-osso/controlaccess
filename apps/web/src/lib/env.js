/** URL base REST (incluye /api). En Vercel: https://tu-api.onrender.com/api */
export const API_BASE = String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/** Origen del servidor Socket.IO (sin path). En Vercel: https://tu-api.onrender.com */
export const SOCKET_URL = String(import.meta.env.VITE_SOCKET_URL || '/').replace(/\/$/, '') || '/';
