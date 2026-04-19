import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsService } from '../AnalyticsService';

const makePlay = (overrides = {}) => ({
  spotifyId: 'track-1',
  title: 'Song A',
  artist: 'Artist A',
  albumArt: 'https://example.com/art.jpg',
  ...overrides,
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService();
  });

  describe('recordPlay', () => {
    it('increments play count for a track', () => {
      service.recordPlay(makePlay(), 'session-1');
      service.recordPlay(makePlay(), 'session-2');
      const { topTracks } = service.getStats();
      expect(topTracks[0].count).toBe(2);
    });

    it('tracks different songs independently', () => {
      service.recordPlay(makePlay({ spotifyId: 'a' }), 's1');
      service.recordPlay(makePlay({ spotifyId: 'b' }), 's2');
      service.recordPlay(makePlay({ spotifyId: 'b' }), 's3');
      const { topTracks } = service.getStats();
      expect(topTracks[0].spotifyId).toBe('b');
      expect(topTracks[0].count).toBe(2);
    });

    it('increments user activity for regular sessions', () => {
      service.recordPlay(makePlay(), 'session-1');
      const { topUsers } = service.getStats();
      expect(topUsers[0].userId).toBe('session-1');
      expect(topUsers[0].count).toBe(1);
    });

    it('does not count the autoplay session as a user', () => {
      service.recordPlay(makePlay(), 'autoplay');
      const { topUsers } = service.getStats();
      expect(topUsers).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('returns empty arrays on a fresh service', () => {
      const stats = service.getStats();
      expect(stats.topTracks).toHaveLength(0);
      expect(stats.topUsers).toHaveLength(0);
    });

    it('returns at most 10 top tracks', () => {
      for (let i = 0; i < 15; i++) {
        service.recordPlay(makePlay({ spotifyId: `track-${i}`, title: `Song ${i}` }), 's1');
      }
      expect(service.getStats().topTracks).toHaveLength(10);
    });

    it('returns at most 10 top users', () => {
      for (let i = 0; i < 15; i++) {
        service.recordPlay(makePlay(), `session-${i}`);
      }
      expect(service.getStats().topUsers).toHaveLength(10);
    });

    it('sorts topTracks by play count descending', () => {
      service.recordPlay(makePlay({ spotifyId: 'rare' }), 's1');
      service.recordPlay(makePlay({ spotifyId: 'popular' }), 's2');
      service.recordPlay(makePlay({ spotifyId: 'popular' }), 's3');
      const { topTracks } = service.getStats();
      expect(topTracks[0].spotifyId).toBe('popular');
    });

    it('sorts topUsers by song count descending', () => {
      service.recordPlay(makePlay(), 'casual');
      service.recordPlay(makePlay(), 'power-user');
      service.recordPlay(makePlay({ spotifyId: 'track-2' }), 'power-user');
      const { topUsers } = service.getStats();
      expect(topUsers[0].userId).toBe('power-user');
    });
  });
});
