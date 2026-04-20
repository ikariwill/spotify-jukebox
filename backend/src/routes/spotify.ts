import { Router } from 'express'

import CATEGORIES from '../data/categoryImages.json'
import { io, queueService, spotifyService } from '../index'
import { requireAuth } from '../middleware/auth'
import { apiLimiter, searchLimiter } from '../middleware/rateLimit'

export const spotifyRouter = Router();
spotifyRouter.use(requireAuth);
spotifyRouter.use(apiLimiter);

spotifyRouter.get("/categories", (_req, res) => {
  res.json(CATEGORIES);
});

spotifyRouter.get("/genre/:id", async (req, res) => {
  try {
    const tracks = await spotifyService.getTracksByCategory(
      req.session.tokens!,
      req.params.id,
    );
    res.json(tracks);
  } catch (err: any) {
    console.error("[Genre] Failed for:", req.params.id, err.message);
    res.status(502).json({ error: "Genre fetch failed", details: err.message });
  }
});

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
    const progressMs: number = req.body?.progress ?? 0;
    const RESTART_THRESHOLD_MS = 5000;

    const prev = await queueService.popHistory();

    // No history or past threshold: just restart from beginning, never touch queue
    if (!prev || progressMs > RESTART_THRESHOLD_MS) {
      await spotifyService.seek(req.session.tokens!, 0);
      // If we popped history but are restarting, put it back
      if (prev) queueService.pushHistory(prev);
      res.json({ ok: true });
      return;
    }

    // Has history and within threshold: go to previous track
    // Put current track back at the front of the queue so skip returns to it,
    // but only if it's not already there (prevents duplicates on repeated clicks)
    const current = await spotifyService.getPlayer(req.session.tokens!);
    if (current) {
      const queue = queueService.getQueue();
      const alreadyAtFront = queue[0]?.spotifyId === current.spotifyId;
      if (!alreadyAtFront) {
        queueService.prependTrack({
          spotifyId: current.spotifyId,
          uri: `spotify:track:${current.spotifyId}`,
          title: current.title,
          artist: current.artist,
          album: current.album,
          albumArt: current.albumArt,
          duration: current.duration,
        });
        io.emit("queue:update", queueService.getQueue());
      }
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
