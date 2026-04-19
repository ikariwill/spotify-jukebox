import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueueService } from '../QueueService';
import type { SpotifyTrack } from '@jukebox/shared';

const makeTrack = (overrides: Partial<SpotifyTrack> = {}): SpotifyTrack => ({
  spotifyId: 'spotify-id-1',
  uri: 'spotify:track:1',
  title: 'Test Track',
  artist: 'Test Artist',
  album: 'Test Album',
  albumArt: 'https://example.com/art.jpg',
  duration: 200000,
  ...overrides,
});

describe('QueueService', () => {
  let service: QueueService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new QueueService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── addTrack ────────────────────────────────────────────────────────────────

  describe('addTrack', () => {
    it('adds a track and returns it with votes=0 and userVote=0', () => {
      const added = service.addTrack(makeTrack(), 'session-1');
      expect(added.votes).toBe(0);
      expect(added.userVote).toBe(0);
      expect(service.getQueue()).toHaveLength(1);
    });

    it('assigns a unique id per queue slot even for duplicate tracks', () => {
      const a = service.addTrack(makeTrack(), 's1');
      const b = service.addTrack(makeTrack(), 's2');
      expect(a.id).not.toBe(b.id);
    });

    it('records user activity for regular sessions', () => {
      service.addTrack(makeTrack(), 'session-1');
      expect(service.getUserStatus('session-1').songsAdded).toBe(1);
    });

    it('does not record activity for the autoplay session', () => {
      service.addTrack(makeTrack(), 'autoplay');
      expect(service.getUserStatus('autoplay').songsAdded).toBe(0);
    });

    it('sets addedBy to the first 8 chars of the session id', () => {
      const added = service.addTrack(makeTrack(), 'abcdefghijkl');
      expect(added.addedBy).toBe('abcdefgh');
    });
  });

  // ── canAdd ──────────────────────────────────────────────────────────────────

  describe('canAdd', () => {
    it('allows first submission for a new session', () => {
      expect(service.canAdd('new-session').allowed).toBe(true);
    });

    it('blocks immediately after the first submission (cooldown)', () => {
      service.addTrack(makeTrack(), 'session-1');
      const result = service.canAdd('session-1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/Cooldown/);
    });

    it('allows after the cooldown period elapses', () => {
      service.addTrack(makeTrack(), 'session-1');
      vi.advanceTimersByTime(30001);
      expect(service.canAdd('session-1').allowed).toBe(true);
    });

    it('blocks when the session has reached max songs per session', () => {
      for (let i = 0; i < 3; i++) {
        service.addTrack(makeTrack({ spotifyId: `id-${i}` }), 'session-1');
        vi.advanceTimersByTime(30001);
      }
      const result = service.canAdd('session-1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/limit/i);
    });

    it('bypasses all limits when partyMode is enabled', () => {
      service.partyMode = true;
      for (let i = 0; i < 10; i++) {
        service.addTrack(makeTrack({ spotifyId: `id-${i}` }), 'session-1');
      }
      expect(service.canAdd('session-1').allowed).toBe(true);
    });
  });

  // ── vote ────────────────────────────────────────────────────────────────────

  describe('vote', () => {
    it('upvotes a track', () => {
      const { id } = service.addTrack(makeTrack(), 's1');
      service.vote(id, 's2', 1);
      expect(service.getQueue()[0].votes).toBe(1);
    });

    it('downvotes a track', () => {
      const { id } = service.addTrack(makeTrack(), 's1');
      service.vote(id, 's2', -1);
      expect(service.getQueue()[0].votes).toBe(-1);
    });

    it('toggles the vote off when the same direction is submitted twice', () => {
      const { id } = service.addTrack(makeTrack(), 's1');
      service.vote(id, 's2', 1);
      service.vote(id, 's2', 1);
      expect(service.getQueue()[0].votes).toBe(0);
    });

    it('switches vote direction correctly', () => {
      const { id } = service.addTrack(makeTrack(), 's1');
      service.vote(id, 's2', 1);
      service.vote(id, 's2', -1);
      expect(service.getQueue()[0].votes).toBe(-1);
    });

    it('accumulates votes from multiple sessions', () => {
      const { id } = service.addTrack(makeTrack(), 's1');
      service.vote(id, 's2', 1);
      service.vote(id, 's3', 1);
      service.vote(id, 's4', -1);
      expect(service.getQueue()[0].votes).toBe(1);
    });

    it('returns false for an unknown track id', () => {
      expect(service.vote('unknown-id', 's1', 1)).toBe(false);
    });

    it('exposes the correct userVote for the requesting session', () => {
      const { id } = service.addTrack(makeTrack(), 's1');
      service.vote(id, 's2', 1);
      expect(service.getQueue('s2')[0].userVote).toBe(1);
    });

    it('returns userVote=0 for sessions that have not voted', () => {
      const { id } = service.addTrack(makeTrack(), 's1');
      service.vote(id, 's2', 1);
      expect(service.getQueue('s3')[0].userVote).toBe(0);
    });
  });

  // ── sorting ─────────────────────────────────────────────────────────────────

  describe('sorting', () => {
    it('places higher-voted tracks first', () => {
      const a = service.addTrack(makeTrack({ spotifyId: 'a' }), 's1');
      const b = service.addTrack(makeTrack({ spotifyId: 'b' }), 's1');
      service.vote(b.id, 's2', 1);
      expect(service.getQueue()[0].spotifyId).toBe('b');
    });

    it('uses addedAt as FIFO tiebreaker for equal votes', () => {
      vi.advanceTimersByTime(1);
      service.addTrack(makeTrack({ spotifyId: 'first' }), 's1');
      vi.advanceTimersByTime(1);
      service.addTrack(makeTrack({ spotifyId: 'second' }), 's1');
      expect(service.getQueue()[0].spotifyId).toBe('first');
    });

    it('re-sorts after a vote changes relative scores', () => {
      const a = service.addTrack(makeTrack({ spotifyId: 'a' }), 's1');
      vi.advanceTimersByTime(1);
      const b = service.addTrack(makeTrack({ spotifyId: 'b' }), 's1');
      service.vote(b.id, 's2', 1);
      service.vote(b.id, 's3', 1);
      service.vote(a.id, 's4', 1);
      const queue = service.getQueue();
      expect(queue[0].spotifyId).toBe('b');
      expect(queue[1].spotifyId).toBe('a');
    });
  });

  // ── shift ───────────────────────────────────────────────────────────────────

  describe('shift', () => {
    it('removes and returns the first track', () => {
      service.addTrack(makeTrack({ spotifyId: 'first' }), 's1');
      const shifted = service.shift();
      expect(shifted?.spotifyId).toBe('first');
      expect(service.isEmpty()).toBe(true);
    });

    it('returns undefined when the queue is empty', () => {
      expect(service.shift()).toBeUndefined();
    });

    it('records the shifted track in recentlyPlayed', () => {
      service.addTrack(makeTrack({ spotifyId: 'played-1' }), 's1');
      service.shift();
      expect(service.getRecentlyPlayedIds()).toContain('played-1');
    });

    it('keeps at most 5 recently played tracks', () => {
      for (let i = 0; i < 7; i++) {
        service.addTrack(makeTrack({ spotifyId: `track-${i}` }), 'autoplay');
        service.shift();
      }
      expect(service.getRecentlyPlayedIds()).toHaveLength(5);
    });

    it('keeps the most recent 5 tracks (drops the oldest)', () => {
      for (let i = 0; i < 7; i++) {
        service.addTrack(makeTrack({ spotifyId: `track-${i}` }), 'autoplay');
        service.shift();
      }
      const ids = service.getRecentlyPlayedIds();
      expect(ids).not.toContain('track-0');
      expect(ids).not.toContain('track-1');
      expect(ids).toContain('track-6');
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes an existing track and returns true', () => {
      const { id } = service.addTrack(makeTrack(), 's1');
      expect(service.remove(id)).toBe(true);
      expect(service.getQueue()).toHaveLength(0);
    });

    it('returns false for an unknown id', () => {
      expect(service.remove('unknown')).toBe(false);
    });
  });

  // ── getUserStatus ────────────────────────────────────────────────────────────

  describe('getUserStatus', () => {
    it('returns zeroed status for a session with no activity', () => {
      const status = service.getUserStatus('new-session');
      expect(status.songsAdded).toBe(0);
      expect(status.cooldownRemaining).toBe(0);
      expect(status.maxSongs).toBe(3);
    });

    it('reports elapsed cooldown correctly', () => {
      service.addTrack(makeTrack(), 'session-1');
      vi.advanceTimersByTime(10000);
      const status = service.getUserStatus('session-1');
      expect(status.cooldownRemaining).toBeGreaterThan(0);
      expect(status.cooldownRemaining).toBeLessThanOrEqual(30000);
    });

    it('returns cooldownRemaining=0 after cooldown expires', () => {
      service.addTrack(makeTrack(), 'session-1');
      vi.advanceTimersByTime(31000);
      expect(service.getUserStatus('session-1').cooldownRemaining).toBe(0);
    });
  });

  // ── isEmpty ─────────────────────────────────────────────────────────────────

  describe('isEmpty', () => {
    it('returns true on a fresh service', () => {
      expect(service.isEmpty()).toBe(true);
    });

    it('returns false after a track is added', () => {
      service.addTrack(makeTrack(), 's1');
      expect(service.isEmpty()).toBe(false);
    });
  });
});
