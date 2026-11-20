import mongoose from 'mongoose';
import { config } from './config.js';

let connecting;

/**
 * Conexión cacheada para cold starts de Vercel serverless.
 */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connecting) {
    mongoose.set('strictQuery', true);
    connecting = mongoose
      .connect(config.mongoUri, {
        bufferCommands: false,
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000,
      })
      .then((conn) => {
        console.log('[db] MongoDB conectado');
        return conn;
      })
      .catch((err) => {
        connecting = null;
        throw err;
      });
  }

  return connecting;
}
