import { Router } from 'express';
import { analyticsService } from '../index';

export const analyticsRouter = Router();

analyticsRouter.get('/', (_req, res) => {
  res.json(analyticsService.getStats());
});
