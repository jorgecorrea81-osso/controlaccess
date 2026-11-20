import { io } from 'socket.io-client';
import { SOCKET_URL } from './env.js';

let socket = null;

export function connectSocket(token, handlers = {}) {
  disconnectSocket();

  socket = io(SOCKET_URL, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socket.on('device:moved', (payload) => handlers.onDeviceMoved?.(payload));
  socket.on('geofence:event', (payload) => handlers.onGeofenceEvent?.(payload));
  socket.on('geofence:events', (payload) => handlers.onGeofenceEvents?.(payload));
  socket.on('connect', () => handlers.onConnect?.());
  socket.on('disconnect', () => handlers.onDisconnect?.());
  socket.on('connect_error', (err) => {
    console.warn('[socket]', err.message);
    handlers.onError?.(err);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

/** Emite ubicación (simulador web o futuro Flutter vía mismo evento) */
export function emitDeviceLocation(payload) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket no conectado'));
      return;
    }
    socket.emit('device:location', payload, (ack) => {
      if (ack?.error) reject(new Error(ack.error));
      else resolve(ack);
    });
  });
}
