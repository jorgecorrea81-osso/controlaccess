import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { config } from './config.js';
import { User } from './models/User.js';
import { Device } from './models/Device.js';
import { processLocationUpdate, setDeviceOnline } from './services/trackingService.js';

let ioRef = null;

/**
 * Socket.IO para tracking móvil (Flutter) y monitoreo web.
 *
 * Móvil:
 *  - auth: { deviceKey } o { token: JWT }
 *  - emit device:location { deviceKey, lat, lng, accuracy?, speed?, heading? }
 *
 * Monitores (web):
 *  - device:moved { device }
 *  - geofence:event { event }  // enter | exit
 */
export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    path: config.socketPath,
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Compatibilidad con redes móviles / proxies
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });

  ioRef = io;

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(payload.sub);
        if (!user || !user.active) return next(new Error('Usuario no válido'));
        socket.user = user;
        socket.role = 'monitor';
        return next();
      }

      const deviceKey = socket.handshake.auth?.deviceKey;
      if (deviceKey) {
        const device = await Device.findOne({ deviceKey, active: true });
        if (!device) return next(new Error('Dispositivo no válido'));
        socket.device = device;
        socket.role = 'device';
        return next();
      }

      return next(new Error('Token o deviceKey requerido'));
    } catch {
      next(new Error('Autenticación Socket fallida'));
    }
  });

  io.on('connection', (socket) => {
    const who = socket.user?.email || socket.device?.deviceKey || socket.id;
    console.log(`[socket] Conectado: ${who} (${socket.role})`);

    if (socket.role === 'monitor') {
      socket.join('monitors');
      socket.emit('connected', {
        message: 'Monitor autenticado',
        user: socket.user.toSafeJSON(),
      });
    }

    if (socket.role === 'device') {
      socket.join(`device:${socket.device.deviceKey}`);
      setDeviceOnline(socket.device.deviceKey, true).then((device) => {
        if (device) io.to('monitors').emit('device:moved', { device });
      });
    }

    socket.on('device:location', async (payload = {}, ack) => {
      try {
        const deviceKey =
          payload.deviceKey || socket.device?.deviceKey || socket.handshake.auth?.deviceKey;

        if (!deviceKey) {
          const error = { error: 'deviceKey requerido' };
          if (typeof ack === 'function') ack(error);
          return;
        }

        if (socket.role === 'device' && socket.device.deviceKey !== deviceKey) {
          const error = { error: 'No puedes actualizar otro dispositivo' };
          if (typeof ack === 'function') ack(error);
          return;
        }

        const result = await processLocationUpdate({
          deviceKey,
          lat: Number(payload.lat),
          lng: Number(payload.lng),
          accuracy: payload.accuracy ?? null,
          speed: payload.speed ?? null,
          heading: payload.heading ?? null,
          source: socket.role === 'device' ? 'mobile' : payload.source || 'simulator',
        });

        broadcastDeviceMove(io, result.device);
        broadcastGeofenceEvents(io, result.events);

        const response = { ok: true, ...result };
        if (typeof ack === 'function') ack(response);
        socket.emit('device:location:ack', response);
      } catch (err) {
        const error = { error: err.message || 'Error al procesar ubicación' };
        if (typeof ack === 'function') ack(error);
        socket.emit('device:location:ack', error);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`[socket] Desconectado: ${who}`);
      if (socket.role === 'device' && socket.device?.deviceKey) {
        const device = await setDeviceOnline(socket.device.deviceKey, false);
        if (device) io.to('monitors').emit('device:moved', { device });
      }
    });
  });

  return io;
}

export function broadcastDeviceMove(io, device) {
  const bus = io || ioRef;
  if (!bus || !device) return;
  bus.to('monitors').emit('device:moved', { device });
}

export function broadcastGeofenceEvents(io, events = []) {
  const bus = io || ioRef;
  if (!bus || !events.length) return;
  for (const event of events) {
    bus.to('monitors').emit('geofence:event', { event });
  }
  bus.to('monitors').emit('geofence:events', { events });
}
