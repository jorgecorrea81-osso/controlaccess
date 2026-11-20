import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'guard'), async (_req, res, next) => {
  try {
    const users = await User.find().sort({ name: 1 });
    res.json({ users: users.map((u) => u.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['admin', 'guard', 'employee']).optional(),
  department: z.string().optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.patch('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    Object.assign(user, data);
    await user.save();
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    }
    next(err);
  }
});

export default router;
