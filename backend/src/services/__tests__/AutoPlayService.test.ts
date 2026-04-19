import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutoPlayService } from '../AutoPlayService';
import type { QueueService } from '../QueueService';
import type { SpotifyService, TokenSet } from '../SpotifyService';
import type { Server } from 'socket.io';
import type { SpotifyTrack } from '@jukebox/shared';

const makeTokens = (): TokenSet => ({
  accessToken: 'at',
  refreshToken: 'rt',
  expiresAt: Date.now() + 3_600_000,
});

const makeTrack = (): SpotifyTrack => ({
  spotifyId: 'rec-1',
  uri: 'spotify:track:rec-1',
  title: 'Rec Track',
  artist: 'Artist',
  album: 'Album',
  albumArt: '',
  duration: 200000,
});

describe('AutoPlayService', () => {
  let mockQueue: Partial<QueueService>;
  let mockSpotify: Partial<SpotifyService>;
  let mockIo: Partial<Server>;
  let service: AutoPlayService;

  beforeEach(() => {
    vi.useFakeTimers();

    mockQueue = {
      isEmpty: vi.fn().mockReturnValue(true),
      getRecentlyPlayedIds: vi.fn().mockReturnValue(['seed-1', 'seed-2']),
      addTrack: vi.fn(),
      getQueue: vi.fn().mockReturnValue([]),
    };

    mockSpotify = {
      isExpired: vi.fn().mockReturnValue(false),
      refreshTokens: vi.fn(),
      getRecommendations: vi.fn().mockResolvedValue([makeTrack()]),
    };

    mockIo = { emit: vi.fn() };

    service = new AutoPlayService(
      mockQueue as QueueService,
      mockSpotify as SpotifyService,
      mockIo as Server
    );
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  it('does nothing when admin tokens have not been set', async () => {
    service.start();
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockSpotify.getRecommendations).not.toHaveBeenCalled();
  });

  it('does nothing when the queue is not empty', async () => {
    (mockQueue.isEmpty as ReturnType<typeof vi.fn>).mockReturnValue(false);
    service.setAdminTokens(makeTokens());
    service.start();
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockSpotify.getRecommendations).not.toHaveBeenCalled();
  });

  it('does nothing when there are no recently played tracks to seed from', async () => {
    (mockQueue.getRecentlyPlayedIds as ReturnType<typeof vi.fn>).mockReturnValue([]);
    service.setAdminTokens(makeTokens());
    service.start();
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockSpotify.getRecommendations).not.toHaveBeenCalled();
  });

  it('fetches recommendations and adds them when queue is empty', async () => {
    service.setAdminTokens(makeTokens());
    service.start();
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockSpotify.getRecommendations).toHaveBeenCalled();
    expect(mockQueue.addTrack).toHaveBeenCalledWith(makeTrack(), 'autoplay');
    expect(mockIo.emit).toHaveBeenCalledWith('queue:update', []);
  });

  it('refreshes expired tokens before calling recommendations', async () => {
    (mockSpotify.isExpired as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const freshTokens = makeTokens();
    (mockSpotify.refreshTokens as ReturnType<typeof vi.fn>).mockResolvedValue(freshTokens);

    service.setAdminTokens({ accessToken: 'old', refreshToken: 'rt', expiresAt: 0 });
    service.start();
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockSpotify.refreshTokens).toHaveBeenCalledWith('rt');
    expect(mockSpotify.getRecommendations).toHaveBeenCalled();
  });

  it('getAdminTokens returns tokens after setAdminTokens', () => {
    const tokens = makeTokens();
    service.setAdminTokens(tokens);
    expect(service.getAdminTokens()).toBe(tokens);
  });

  it('does not poll after stop() is called', async () => {
    service.setAdminTokens(makeTokens());
    service.start();
    service.stop();
    await vi.advanceTimersByTimeAsync(10000);
    expect(mockSpotify.getRecommendations).not.toHaveBeenCalled();
  });
});
