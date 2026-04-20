import { Router } from 'express'

import { io, queueService, spotifyService } from '../index'
import { requireAuth } from '../middleware/auth'
import { apiLimiter, searchLimiter } from '../middleware/rateLimit'

export const spotifyRouter = Router();
spotifyRouter.use(requireAuth);
spotifyRouter.use(apiLimiter);

spotifyRouter.get("/search", searchLimiter, async (req, res) => {
  const q = (req.query.q as string)?.trim();
  if (!q) {
    res.status(400).json({ error: "Query required" });
    return;
  }
  try {
    const tracks = await spotifyService.searchTracks(q, req.session.tokens!);
    res.json(tracks);
  } catch (err: any) {
    res
      .status(502)
      .json({ error: "Spotify search failed", details: err.message });
  }
});

spotifyRouter.get("/player", async (req, res) => {
  try {
    const state = await spotifyService.getPlayer(req.session.tokens!);
    res.json(state);
  } catch (err: any) {
    res
      .status(502)
      .json({ error: "Player fetch failed", details: err.message });
  }
});

spotifyRouter.post("/play", async (req, res) => {
  try {
    const uris = req.body?.uris;
    await spotifyService.play(req.session.tokens!, uris);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(502).json({ error: "Play failed", details: err.message });
  }
});

spotifyRouter.post("/pause", async (req, res) => {
  try {
    await spotifyService.pause(req.session.tokens!);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(502).json({ error: "Pause failed", details: err.message });
  }
});

spotifyRouter.post("/previous", async (req, res) => {
  try {
    const prev = await queueService.popHistory();
    if (!prev) {
      res.status(400).json({ error: "No history available" });
      return;
    }
    await spotifyService.play(req.session.tokens!, [
      `spotify:track:${prev.spotifyId}`,
    ]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(502).json({ error: "Previous failed", details: err.message });
  }
});

spotifyRouter.post("/skip", async (req, res) => {
  try {
    const next = queueService.shift();
    if (next) {
      await spotifyService.play(req.session.tokens!, [next.uri]);
      io.emit("queue:update", queueService.getQueue());
    } else {
      await spotifyService.skip(req.session.tokens!);
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(502).json({ error: "Skip failed", details: err.message });
  }
});

spotifyRouter.put("/volume", async (req, res) => {
  const volume = parseInt(req.body?.volume, 10);
  if (isNaN(volume) || volume < 0 || volume > 100) {
    res.status(400).json({ error: "Volume must be 0–100" });
    return;
  }
  try {
    await spotifyService.setVolume(req.session.tokens!, volume);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(502).json({ error: "Volume failed", details: err.message });
  }
});

spotifyRouter.put("/transfer", async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    res.status(400).json({ error: "deviceId required" });
    return;
  }
  try {
    await spotifyService.transferPlayback(req.session.tokens!, deviceId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(502).json({ error: "Transfer failed", details: err.message });
  }
});
