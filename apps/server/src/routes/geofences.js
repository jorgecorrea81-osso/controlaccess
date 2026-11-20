import { Router } from 'express';
import { z } from 'zod';
import { Geofence } from '../models/Geofence.js';
import { GeofenceEvent } from '../models/GeofenceEvent.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const geofences = await Geofence.find().sort({ name: 1 });
    res.json({ geofences: geofences.map((g) => g.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
});

router.get('/events', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = await GeofenceEvent.find()
      .populate(['device', 'geofence'])
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ events: events.map((e) => e.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
});

const fenceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(['polygon', 'circle']),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(1),
  radiusMeters: z.number().positive().nullable().optional(),
  color: z.string().optional(),
  active: z.boolean().optional(),
});

router.post('/', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const data = fenceSchema.parse(req.body);

    if (data.type === 'circle' && (!data.radiusMeters || data.radiusMeters <= 0)) {
      return res.status(400).json({ error: 'El círculo necesita un radio válido' });
    }
    if (data.type === 'polygon' && data.coordinates.length < 3) {
      return res.status(400).json({ error: 'El polígono necesita al menos 3 puntos' });
    }

    const geofence = await Geofence.create({
      ...data,
      radiusMeters: data.type === 'circle' ? data.radiusMeters : null,
    });
    res.status(201).json({ geofence: geofence.toSafeJSON() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos al crear la geocerca',
        details: err.errors,
      });
    }
    next(err);
  }
});

router.patch('/:id', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const data = fenceSchema.partial().parse(req.body);
    const geofence = await Geofence.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!geofence) return res.status(404).json({ error: 'Geocerca no encontrada' });
    res.json({ geofence: geofence.toSafeJSON() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    }
    next(err);
  }
});

router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const geofence = await Geofence.findByIdAndDelete(req.params.id);
    if (!geofence) return res.status(404).json({ error: 'Geocerca no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
