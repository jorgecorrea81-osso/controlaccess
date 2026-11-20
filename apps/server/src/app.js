import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import devicesRoutes from './routes/devices.js';
import geofencesRoutes from './routes/geofences.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      service: 'controlaccesos-api',
      docs: '/api/health',
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'controlaccesos-api',
      focus: 'realtime-geofence-tracking',
      socketsReady: true,
      env: config.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/devices', devicesRoutes);
  app.use('/api/geofences', geofencesRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
