import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { QueueService } from '../QueueService'

import type { SpotifyTrack } from "@jukebox/shared";

const makeTrack = (overrides: Partial<SpotifyTrack> = {}): SpotifyTrack => ({
  spotifyId: "spotify-id-1",
  uri: "spotify:track:1",
  title: "Test Track",
  artist: "Test Artist",
  album: "Test Album",
  albumArt: "https://example.com/art.jpg",
  duration: 200000,
  ...overrides,
});

describe("QueueService", () => {
  let service: QueueService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new QueueService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── addTrack ────────────────────────────────────────────────────────────────

  describe("addTrack", () => {
    it("adds a track and returns it with votes=0 and userVote=0", () => {
      const added = service.addTrack(makeTrack(), "session-1");
      expect(added.votes).toBe(0);
      expect(added.userVote).toBe(0);
      expect(service.getQueue()).toHaveLength(1);
    });

    it("assigns a unique id per queue slot even for duplicate tracks", () => {
      const a = service.addTrack(makeTrack(), "s1");
      const b = service.addTrack(makeTrack(), "s2");
      expect(a.id).not.toBe(b.id);
    });

    it("sets addedBy to the first 8 chars of the session id", () => {
      const added = service.addTrack(makeTrack(), "abcdefghijkl");
      expect(added.addedBy).toBe("abcdefgh");
    });
  });

  // ── canAdd ──────────────────────────────────────────────────────────────────

  describe("canAdd", () => {
    it("always allows adding tracks", () => {
      expect(service.canAdd("any-session").allowed).toBe(true);
    });
  });

  // ── vote ────────────────────────────────────────────────────────────────────

  describe("vote", () => {
    it("upvotes a track", () => {
      const { id } = service.addTrack(makeTrack(), "s1");
      service.vote(id, "s2", 1);
      expect(service.getQueue()[0].votes).toBe(1);
    });

    it("downvotes a track", () => {
      const { id } = service.addTrack(makeTrack(), "s1");
      service.vote(id, "s2", -1);
      expect(service.getQueue()[0].votes).toBe(-1);
    });

    it("toggles the vote off when the same direction is submitted twice", () => {
      const { id } = service.addTrack(makeTrack(), "s1");
      service.vote(id, "s2", 1);
      service.vote(id, "s2", 1);
      expect(service.getQueue()[0].votes).toBe(0);
    });

    it("switches vote direction correctly", () => {
      const { id } = service.addTrack(makeTrack(), "s1");
      service.vote(id, "s2", 1);
      service.vote(id, "s2", -1);
      expect(service.getQueue()[0].votes).toBe(-1);
    });

    it("accumulates votes from multiple sessions", () => {
      const { id } = service.addTrack(makeTrack(), "s1");
      service.vote(id, "s2", 1);
      service.vote(id, "s3", 1);
      service.vote(id, "s4", -1);
      expect(service.getQueue()[0].votes).toBe(1);
    });

    it("returns false for an unknown track id", () => {
      expect(service.vote("unknown-id", "s1", 1)).toBe(false);
    });

    it("exposes the correct userVote for the requesting session", () => {
      const { id } = service.addTrack(makeTrack(), "s1");
      service.vote(id, "s2", 1);
      expect(service.getQueue("s2")[0].userVote).toBe(1);
    });

    it("returns userVote=0 for sessions that have not voted", () => {
      const { id } = service.addTrack(makeTrack(), "s1");
      service.vote(id, "s2", 1);
      expect(service.getQueue("s3")[0].userVote).toBe(0);
    });
  });

  // ── sorting ─────────────────────────────────────────────────────────────────

  describe("sorting", () => {
    it("places higher-voted tracks first", () => {
      const a = service.addTrack(makeTrack({ spotifyId: "a" }), "s1");
      const b = service.addTrack(makeTrack({ spotifyId: "b" }), "s1");
      service.vote(b.id, "s2", 1);
      expect(service.getQueue()[0].spotifyId).toBe("b");
    });

    it("uses addedAt as FIFO tiebreaker for equal votes", () => {
      vi.advanceTimersByTime(1);
      service.addTrack(makeTrack({ spotifyId: "first" }), "s1");
      vi.advanceTimersByTime(1);
      service.addTrack(makeTrack({ spotifyId: "second" }), "s1");
      expect(service.getQueue()[0].spotifyId).toBe("first");
    });

    it("re-sorts after a vote changes relative scores", () => {
      const a = service.addTrack(makeTrack({ spotifyId: "a" }), "s1");
      vi.advanceTimersByTime(1);
      const b = service.addTrack(makeTrack({ spotifyId: "b" }), "s1");
      service.vote(b.id, "s2", 1);
      service.vote(b.id, "s3", 1);
      service.vote(a.id, "s4", 1);
      const queue = service.getQueue();
      expect(queue[0].spotifyId).toBe("b");
      expect(queue[1].spotifyId).toBe("a");
    });
  });

  // ── shift ───────────────────────────────────────────────────────────────────

  describe("shift", () => {
    it("removes and returns the first track", () => {
      service.addTrack(makeTrack({ spotifyId: "first" }), "s1");
      const shifted = service.shift();
      expect(shifted?.spotifyId).toBe("first");
      expect(service.isEmpty()).toBe(true);
    });

    it("returns undefined when the queue is empty", () => {
      expect(service.shift()).toBeUndefined();
    });

    it("records the shifted track in recentlyPlayed", () => {
      service.addTrack(makeTrack({ spotifyId: "played-1" }), "s1");
      service.shift();
      expect(service.getRecentlyPlayedIds()).toContain("played-1");
    });

    it("keeps at most 20 recently played tracks", () => {
      for (let i = 0; i < 25; i++) {
        service.addTrack(makeTrack({ spotifyId: `track-${i}` }), "autoplay");
        service.shift();
      }
      expect(service.getRecentlyPlayedIds()).toHaveLength(20);
    });

    it("keeps the most recent 20 tracks (drops the oldest)", () => {
      for (let i = 0; i < 25; i++) {
        service.addTrack(makeTrack({ spotifyId: `track-${i}` }), "autoplay");
        service.shift();
      }
      const ids = service.getRecentlyPlayedIds();
      expect(ids).not.toContain("track-0");
      expect(ids).not.toContain("track-4");
      expect(ids).toContain("track-24");
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe("remove", () => {
    it("removes an existing track and returns true", () => {
      const { id } = service.addTrack(makeTrack(), "s1");
      expect(service.remove(id)).toBe(true);
      expect(service.getQueue()).toHaveLength(0);
    });

    it("returns false for an unknown id", () => {
      expect(service.remove("unknown")).toBe(false);
    });
  });

  // ── reorder ─────────────────────────────────────────────────────────────────

  describe("reorder", () => {
    it("moves a track from one index to another", () => {
      service.addTrack(makeTrack({ spotifyId: "a" }), "s1");
      vi.advanceTimersByTime(1);
      service.addTrack(makeTrack({ spotifyId: "b" }), "s1");
      vi.advanceTimersByTime(1);
      service.addTrack(makeTrack({ spotifyId: "c" }), "s1");

      service.reorder(2, 0);

      const ids = service.getQueue().map((t) => t.spotifyId);
      expect(ids).toEqual(["c", "a", "b"]);
    });

    it("returns true on a valid reorder", () => {
      service.addTrack(makeTrack({ spotifyId: "a" }), "s1");
      vi.advanceTimersByTime(1);
      service.addTrack(makeTrack({ spotifyId: "b" }), "s1");
      expect(service.reorder(0, 1)).toBe(true);
    });

    it("returns false when fromIndex equals toIndex", () => {
      service.addTrack(makeTrack(), "s1");
      expect(service.reorder(0, 0)).toBe(false);
    });

    it("returns false for out-of-bounds indices", () => {
      service.addTrack(makeTrack(), "s1");
      expect(service.reorder(0, 5)).toBe(false);
      expect(service.reorder(-1, 0)).toBe(false);
    });

    it("returns false on an empty queue", () => {
      expect(service.reorder(0, 1)).toBe(false);
    });
  });

  // ── isEmpty ─────────────────────────────────────────────────────────────────

  describe("isEmpty", () => {
    it("returns true on a fresh service", () => {
      expect(service.isEmpty()).toBe(true);
    });

    it("returns false after a track is added", () => {
      service.addTrack(makeTrack(), "s1");
      expect(service.isEmpty()).toBe(false);
    });
  });
});
