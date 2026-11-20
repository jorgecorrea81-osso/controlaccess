import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

function parseOrigins(value) {
  if (!value || value.trim() === '' || value.trim() === '*') return true;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const corsOrigins = parseOrigins(
  process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173'
);

export const config = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/controlaccesos',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  /** true = refleja cualquier origen (útil con apps móviles). Array = lista blanca. */
  corsOrigins,
  socketPath: process.env.SOCKET_PATH || '/socket.io',
};
