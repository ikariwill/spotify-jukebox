import { Router } from 'express'

import { analyticsService, io, queueService } from '../index'

import type { SpotifyTrack } from "@jukebox/shared";

export const queueRouter = Router();

queueRouter.get("/", (req, res) => {
  res.json({
    tracks: queueService.getQueue(req.sessionID),
    partyMode: queueService.partyMode,
  });
});

queueRouter.post("/add", (req, res) => {
  const track: SpotifyTrack = req.body;

  if (!track?.spotifyId || !track?.uri || !track?.title) {
    res.status(400).json({ error: "Invalid track data" });
    return;
  }

  const { allowed, reason } = queueService.canAdd(req.sessionID);
  if (!allowed) {
    res.status(429).json({ error: reason });
    return;
  }

  const added = queueService.addTrack(track, req.sessionID);
  io.emit("queue:update", queueService.getQueue());
  res.status(201).json(added);
});

queueRouter.post("/:id/vote", (req, res) => {
  const direction = req.body.direction as 1 | -1;

  if (direction !== 1 && direction !== -1) {
    res.status(400).json({ error: "Direction must be 1 or -1" });
    return;
  }

  const success = queueService.vote(req.params.id, req.sessionID, direction);
  if (!success) {
    res.status(404).json({ error: "Track not found" });
    return;
  }

  io.emit("queue:update", queueService.getQueue());
  res.json({ ok: true });
});

queueRouter.delete("/:id", (req, res) => {
  const success = queueService.remove(req.params.id);
  if (!success) {
    res.status(404).json({ error: "Track not found" });
    return;
  }
  io.emit("queue:update", queueService.getQueue());
  res.json({ ok: true });
});

// Called by the player when a track finishes naturally
queueRouter.post("/played", (req, res) => {
  const track = queueService.shift();
  if (track) {
    analyticsService.recordPlay(track, track.addedBy);
  }
  io.emit("queue:update", queueService.getQueue());
  res.json({ ok: true, next: queueService.getQueue()[0] ?? null });
});
