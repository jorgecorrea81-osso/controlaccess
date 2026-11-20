/**
 * En Vercel, web y API comparten el mismo dominio → usar /api
 * En local con Vite proxy también es /api
 */
export const API_BASE = String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
