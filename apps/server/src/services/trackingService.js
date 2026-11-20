import { Device } from '../models/Device.js';
import { Geofence } from '../models/Geofence.js';
import { GeofenceEvent } from '../models/GeofenceEvent.js';
import { isInsideGeofence } from './geo.js';

/**
 * Actualiza la posición de un dispositivo y calcula entradas/salidas de geocercas.
 */
export async function processLocationUpdate({
  deviceKey,
  lat,
  lng,
  accuracy = null,
  speed = null,
  heading = null,
  source = 'mobile',
}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const err = new Error('lat y lng deben ser números válidos');
    err.status = 400;
    throw err;
  }

  const device = await Device.findOne({ deviceKey: String(deviceKey).trim() });
  if (!device) {
    const err = new Error('Dispositivo no registrado');
    err.status = 404;
    throw err;
  }
  if (!device.active) {
    const err = new Error('Dispositivo inactivo');
    err.status = 403;
    throw err;
  }

  const geofences = await Geofence.find({ active: true });
  const previouslyInside = new Set((device.insideGeofences || []).map((id) => id.toString()));
  const nowInside = [];
  const transitions = [];

  for (const fence of geofences) {
    const inside = isInsideGeofence(lat, lng, fence);
    const fenceId = fence._id.toString();

    if (inside) {
      nowInside.push(fence._id);
      if (!previouslyInside.has(fenceId)) {
        transitions.push({ type: 'enter', geofence: fence });
      }
    } else if (previouslyInside.has(fenceId)) {
      transitions.push({ type: 'exit', geofence: fence });
    }
  }

  device.lastLocation = { type: 'Point', coordinates: [lng, lat] };
  device.lastSeenAt = new Date();
  device.online = true;
  device.accuracy = accuracy;
  device.speed = speed;
  device.heading = heading;
  device.insideGeofences = nowInside;
  await device.save();

  const events = [];
  for (const t of transitions) {
    const event = await GeofenceEvent.create({
      device: device._id,
      geofence: t.geofence._id,
      type: t.type,
      location: { type: 'Point', coordinates: [lng, lat] },
      source,
    });
    await event.populate(['device', 'geofence']);
    events.push(event.toSafeJSON());
  }

  await device.populate(['user', 'insideGeofences']);

  return {
    device: device.toSafeJSON(),
    events,
  };
}

export async function setDeviceOnline(deviceKey, online) {
  const device = await Device.findOneAndUpdate(
    { deviceKey },
    { online, ...(online ? { lastSeenAt: new Date() } : {}) },
    { new: true }
  ).populate(['user', 'insideGeofences']);
  return device ? device.toSafeJSON() : null;
}
