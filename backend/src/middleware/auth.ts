import type { Request, Response, NextFunction } from 'express';
import { spotifyService } from '../index';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.tokens) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (spotifyService.isExpired(req.session.tokens)) {
    try {
      req.session.tokens = await spotifyService.refreshTokens(
        req.session.tokens.refreshToken
      );
      await new Promise<void>((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve()))
      );
    } catch {
      req.session.destroy(() => {});
      res.status(401).json({ error: 'Token refresh failed, please re-authenticate' });
      return;
    }
  }

  next();
}
