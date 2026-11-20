import { Router } from 'express';
import { z } from 'zod';
import { Device } from '../models/Device.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { processLocationUpdate } from '../services/trackingService.js';

const router = Router();

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  source: z.enum(['mobile', 'web', 'simulator']).optional(),
});

/**
 * Registro público para app móvil Flutter.
 */
router.post('/register', async (req, res, next) => {
  try {
    const schema = z.object({
      deviceKey: z.string().min(3).max(120),
      name: z.string().min(2).max(120).optional(),
      label: z.string().max(120).optional(),
    });
    const data = schema.parse(req.body);
    const deviceKey = data.deviceKey.trim();

    let device = await Device.findOne({ deviceKey }).populate(['user', 'insideGeofences']);
    if (!device) {
      device = await Device.create({
        name: data.name?.trim() || `Móvil ${deviceKey.slice(-6)}`,
        deviceKey,
        label: data.label?.trim() || 'Flutter',
        active: true,
      });
      await device.populate(['user', 'insideGeofences']);
    }

    res.status(201).json({ device: device.toSafeJSON() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    }
    next(err);
  }
});

/**
 * Actualización de ubicación por HTTP (Flutter / simulador sin JWT).
 * Body: { deviceKey, lat, lng, ... }
 */
router.post('/location', async (req, res, next) => {
  try {
    const schema = locationSchema.extend({
      deviceKey: z.string().min(3),
    });
    const data = schema.parse(req.body);

    const result = await processLocationUpdate({
      deviceKey: data.deviceKey,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy ?? null,
      speed: data.speed ?? null,
      heading: data.heading ?? null,
      source: data.source || 'mobile',
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    }
    next(err);
  }
});

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

router.post('/:deviceKey/location', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const data = locationSchema.parse(req.body);
    const result = await processLocationUpdate({
      deviceKey: req.params.deviceKey,
      ...data,
      source: data.source || 'web',
    });
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
