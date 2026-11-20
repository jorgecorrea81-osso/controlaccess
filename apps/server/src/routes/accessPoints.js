import { Router } from 'express';
import { z } from 'zod';
import { AccessPoint } from '../models/AccessPoint.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const points = await AccessPoint.find().sort({ name: 1 });
    res.json({ accessPoints: points.map((p) => p.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  location: z.string().optional(),
  description: z.string().optional(),
  allowedRoles: z.array(z.enum(['admin', 'guard', 'employee'])).optional(),
  active: z.boolean().optional(),
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const point = await AccessPoint.create(data);
    res.status(201).json({ accessPoint: point.toSafeJSON() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    }
    next(err);
  }
});

router.patch('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const data = createSchema.partial().parse(req.body);
    const point = await AccessPoint.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!point) return res.status(404).json({ error: 'Punto de acceso no encontrado' });
    res.json({ accessPoint: point.toSafeJSON() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    }
    next(err);
  }
});

export default router;
