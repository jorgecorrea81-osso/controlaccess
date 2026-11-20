import { Router } from 'express';
import { z } from 'zod';
import { AccessLog } from '../models/AccessLog.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { evaluateAccess } from '../services/accessService.js';
import { broadcastAccessEvent } from '../socket.js';

const router = Router();

router.use(authenticate);

const attemptSchema = z.object({
  cardCode: z.string().min(1),
  accessPointId: z.string().min(1),
  direction: z.enum(['in', 'out']).optional(),
});

router.post('/attempt', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const data = attemptSchema.parse(req.body);
    const result = await evaluateAccess({
      ...data,
      source: 'web',
      metadata: { operatorId: req.user._id.toString() },
    });

    broadcastAccessEvent(req.app.get('io'), result);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    }
    next(err);
  }
});

router.get('/logs', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const result = req.query.result;
    const filter = {};
    if (result === 'granted' || result === 'denied') filter.result = result;

    const logs = await AccessLog.find(filter)
      .populate(['user', 'credential', 'accessPoint'])
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ logs: logs.map((l) => l.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', authorize('admin', 'guard'), async (_req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [totalToday, grantedToday, deniedToday, totalUsers] = await Promise.all([
      AccessLog.countDocuments({ createdAt: { $gte: startOfDay } }),
      AccessLog.countDocuments({ createdAt: { $gte: startOfDay }, result: 'granted' }),
      AccessLog.countDocuments({ createdAt: { $gte: startOfDay }, result: 'denied' }),
      (await import('../models/User.js')).User.countDocuments({ active: true }),
    ]);

    res.json({
      stats: {
        totalToday,
        grantedToday,
        deniedToday,
        activeUsers: totalUsers,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
