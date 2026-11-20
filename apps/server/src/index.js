import http from 'http';
import { createApp } from './app.js';
import { config } from './config.js';
import { connectDB } from './db.js';

async function bootstrap() {
  if (!config.mongoUri || config.mongoUri.includes('<db_password>')) {
    throw new Error('MONGODB_URI no está configurada correctamente');
  }

  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(config.port, config.host, () => {
    console.log(`[server] API HTTP en http://${config.host}:${config.port}`);
    console.log('[server] Modo: HTTP (compatible con Vercel serverless)');
  });
}

bootstrap().catch((err) => {
  console.error('[server] Error al iniciar:', err);
  process.exit(1);
});
