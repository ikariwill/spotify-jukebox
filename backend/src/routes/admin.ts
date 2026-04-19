import { Router } from 'express';
import { queueService, io } from '../index';
import { requireAuth } from '../middleware/auth';

export const adminRouter = Router();

adminRouter.post('/party-mode', requireAuth, (req, res) => {
  queueService.partyMode = !queueService.partyMode;
  io.emit('party-mode:update', queueService.partyMode);
  res.json({ partyMode: queueService.partyMode });
});
