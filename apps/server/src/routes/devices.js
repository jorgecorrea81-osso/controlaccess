import { Router } from 'express';
import { z } from 'zod';
import { Device } from '../models/Device.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { processLocationUpdate } from '../services/trackingService.js';
import { broadcastDeviceMove, broadcastGeofenceEvents } from '../socket.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'guard'), async (_req, res, next) => {
  try {
    const devices = await Device.find()
      .populate(['user', 'insideGeofences'])
      .sort({ name: 1 });
    res.json({ devices: devices.map((d) => d.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  name: z.string().min(2),
  deviceKey: z.string().min(3),
  userId: z.string().optional().nullable(),
  label: z.string().optional(),
  active: z.boolean().optional(),
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const device = await Device.create({
      name: data.name,
      deviceKey: data.deviceKey,
      user: data.userId || null,
      label: data.label || '',
      active: data.active ?? true,
    });
    await device.populate(['user', 'insideGeofences']);
    res.status(201).json({ device: device.toSafeJSON() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    }
    next(err);
  }
});

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  source: z.enum(['mobile', 'web', 'simulator']).optional(),
});

/** Actualización REST (útil para pruebas web / simulador) */
router.post('/:deviceKey/location', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const data = locationSchema.parse(req.body);
    const result = await processLocationUpdate({
      deviceKey: req.params.deviceKey,
      ...data,
      source: data.source || 'web',
    });

    broadcastDeviceMove(req.app.get('io'), result.device);
    broadcastGeofenceEvents(req.app.get('io'), result.events);

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    }
    next(err);
  }
});

router.patch('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      label: z.string().optional(),
      active: z.boolean().optional(),
      userId: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const update = { ...data };
    if (data.userId !== undefined) {
      update.user = data.userId;
      delete update.userId;
    }

    const device = await Device.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate(['user', 'insideGeofences']);

    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });
    res.json({ device: device.toSafeJSON() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    }
    next(err);
  }
});

export default router;
