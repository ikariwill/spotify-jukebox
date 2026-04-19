import { Router } from 'express';
import crypto from 'crypto';
import { spotifyService, autoPlayService } from '../index';
import { config } from '../config';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

authRouter.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  res.redirect(spotifyService.buildAuthUrl(state));
});

authRouter.get('/callback', async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    res.redirect(`${config.server.frontendUrl}/?error=${encodeURIComponent(error)}`);
    return;
  }

  if (!code || state !== req.session.oauthState) {
    res.status(400).json({ error: 'Invalid state or missing code' });
    return;
  }

  try {
    const tokens = await spotifyService.exchangeCode(code);
    req.session.tokens = tokens;
    autoPlayService.setAdminTokens(tokens);

    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    );

    res.redirect(`${config.server.frontendUrl}/player`);
  } catch (err: any) {
    console.error('[Auth] Token exchange failed:', err.message);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

authRouter.post('/refresh', async (req, res) => {
  if (!req.session.tokens) {
    res.status(401).json({ error: 'No session' });
    return;
  }
  try {
    req.session.tokens = await spotifyService.refreshTokens(
      req.session.tokens.refreshToken
    );
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    );
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Refresh failed' });
  }
});

// Returns only accessToken for the Spotify Web Playback SDK (never refreshToken)
authRouter.get('/token', requireAuth, (req, res) => {
  res.json({ accessToken: req.session.tokens!.accessToken });
});

authRouter.get('/status', (req, res) => {
  res.json({ authenticated: !!req.session.tokens });
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});
