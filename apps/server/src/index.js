import http from 'http';
import { createApp } from './app.js';
import { config } from './config.js';
import { connectDB } from './db.js';
import { setupSocket } from './socket.js';

async function bootstrap() {
  if (!config.mongoUri || config.mongoUri.includes('<db_password>')) {
    throw new Error('MONGODB_URI no está configurada correctamente');
  }
  if (config.nodeEnv === 'production' && config.jwtSecret === 'dev-secret-change-me') {
    throw new Error('JWT_SECRET debe configurarse en producción');
  }

  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  const io = setupSocket(server);

  app.set('io', io);

  server.listen(config.port, config.host, () => {
    console.log(`[server] API escuchando en http://${config.host}:${config.port}`);
    console.log(`[server] Socket.IO path ${config.socketPath} (web + móvil)`);
    console.log(`[server] CORS: ${config.corsOrigins === true ? '* (abierto)' : config.corsOrigins}`);
  });
}

bootstrap().catch((err) => {
  console.error('[server] Error al iniciar:', err);
  process.exit(1);
});
