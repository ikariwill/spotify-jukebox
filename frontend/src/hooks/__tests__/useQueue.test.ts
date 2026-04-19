import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { SpotifyTrack } from '@jukebox/shared';
import { useQueueStore } from '../../store/queueStore';
import { usePlayerStore } from '../../store/playerStore';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mocks.get,
      post: mocks.post,
      delete: mocks.delete,
    })),
  },
}));

import { useQueue } from '../useQueue';

const makeTrack = (): SpotifyTrack => ({
  spotifyId: 'spotify-1',
  uri: 'spotify:track:1',
  title: 'Track',
  artist: 'Artist',
  album: 'Album',
  albumArt: '',
  duration: 200000,
});

describe('useQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueueStore.setState({ tracks: [], userStatus: null });
    usePlayerStore.setState({ partyMode: false } as any);
  });

  describe('fetchQueue', () => {
    it('updates tracks and userStatus from GET /queue', async () => {
      mocks.get.mockResolvedValue({
        data: {
          tracks: [{ id: '1', title: 'Track', votes: 0 }],
          userStatus: { songsAdded: 1, maxSongs: 3, cooldownRemaining: 0 },
          partyMode: false,
        },
      });
      const { result } = renderHook(() => useQueue());
      await act(async () => { await result.current.fetchQueue(); });
      expect(useQueueStore.getState().tracks).toHaveLength(1);
      expect(useQueueStore.getState().userStatus?.songsAdded).toBe(1);
    });

    it('sets partyMode in playerStore from response', async () => {
      mocks.get.mockResolvedValue({
        data: { tracks: [], userStatus: { songsAdded: 0, maxSongs: 3, cooldownRemaining: 0 }, partyMode: true },
      });
      const { result } = renderHook(() => useQueue());
      await act(async () => { await result.current.fetchQueue(); });
      expect(usePlayerStore.getState().partyMode).toBe(true);
    });
  });

  describe('addTrack', () => {
    it('posts to /queue/add and then fetches the updated queue', async () => {
      mocks.post.mockResolvedValue({ data: {} });
      mocks.get.mockResolvedValue({
        data: { tracks: [], userStatus: { songsAdded: 1, maxSongs: 3, cooldownRemaining: 0 }, partyMode: false },
      });
      const { result } = renderHook(() => useQueue());
      await act(async () => { await result.current.addTrack(makeTrack()); });
      expect(mocks.post).toHaveBeenCalledWith('/queue/add', makeTrack());
      expect(mocks.get).toHaveBeenCalledWith('/queue');
    });

    it('propagates errors so callers can display feedback', async () => {
      mocks.post.mockRejectedValue({ response: { data: { error: 'Cooldown active' } } });
      const { result } = renderHook(() => useQueue());
      await expect(
        act(async () => { await result.current.addTrack(makeTrack()); })
      ).rejects.toBeTruthy();
    });
  });

  describe('vote', () => {
    it('posts to /queue/:id/vote with the correct direction', async () => {
      mocks.post.mockResolvedValue({ data: { ok: true } });
      const { result } = renderHook(() => useQueue());
      await act(async () => { await result.current.vote('track-uuid', 1); });
      expect(mocks.post).toHaveBeenCalledWith('/queue/track-uuid/vote', { direction: 1 });
    });
  });

  describe('removeTrack', () => {
    it('sends DELETE to /queue/:id', async () => {
      mocks.delete.mockResolvedValue({ data: { ok: true } });
      const { result } = renderHook(() => useQueue());
      await act(async () => { await result.current.removeTrack('track-uuid'); });
      expect(mocks.delete).toHaveBeenCalledWith('/queue/track-uuid');
    });
  });
});
