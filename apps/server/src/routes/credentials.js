import { Router } from 'express';
import { z } from 'zod';
import { Credential } from '../models/Credential.js';
import { User } from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'guard'), async (_req, res, next) => {
  try {
    const credentials = await Credential.find().populate('user').sort({ createdAt: -1 });
    res.json({ credentials: credentials.map((c) => c.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  userId: z.string().min(1),
  cardCode: z.string().min(3),
  type: z.enum(['card', 'pin', 'qr', 'mobile']).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const user = await User.findById(data.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const credential = await Credential.create({
      user: data.userId,
      cardCode: data.cardCode,
      type: data.type || 'card',
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      notes: data.notes || '',
      active: data.active ?? true,
    });

    await credential.populate('user');
    res.status(201).json({ credential: credential.toSafeJSON() });
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
      active: z.boolean().optional(),
      notes: z.string().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      type: z.enum(['card', 'pin', 'qr', 'mobile']).optional(),
    });
    const data = schema.parse(req.body);

    if (data.expiresAt !== undefined) {
      data.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    const credential = await Credential.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    }).populate('user');

    if (!credential) return res.status(404).json({ error: 'Credencial no encontrada' });
    res.json({ credential: credential.toSafeJSON() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    }
    next(err);
  }
});

export default router;
