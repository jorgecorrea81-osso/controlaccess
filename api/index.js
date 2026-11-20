/**
 * Entrada serverless para Vercel.
 * Expone toda la API Express en /api/*
 */
import { createApp } from '../apps/server/src/app.js';
import { connectDB } from '../apps/server/src/db.js';

const app = createApp();

let ready;

export default async function handler(req, res) {
  try {
    if (!ready) {
      ready = connectDB();
    }
    await ready;
  } catch (err) {
    console.error('[api] DB error', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'No se pudo conectar a MongoDB', detail: err.message }));
    return;
  }

  return app(req, res);
}
