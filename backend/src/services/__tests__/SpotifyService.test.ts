import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotifyService, type TokenSet } from '../SpotifyService';

// vi.hoisted ensures these fns are available when the mock factory runs
const mocks = vi.hoisted(() => ({
  accountsPost: vi.fn(),
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({ post: mocks.accountsPost })),
    get: mocks.apiGet,
    put: mocks.apiPut,
    post: mocks.apiPost,
  },
}));

const validTokens: TokenSet = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 3_600_000,
};

const expiredTokens: TokenSet = {
  accessToken: 'old-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() - 1000,
};

const spotifyTrackPayload = {
  id: 'track-id',
  uri: 'spotify:track:track-id',
  name: 'Song Name',
  artists: [{ name: 'Artist A' }, { name: 'Artist B' }],
  album: { name: 'Album Name', images: [{ url: 'https://img.url/art.jpg' }] },
  duration_ms: 180000,
};

describe('SpotifyService', () => {
  let service: SpotifyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SpotifyService();
  });

  // ── buildAuthUrl ────────────────────────────────────────────────────────────

  describe('buildAuthUrl', () => {
    it('returns a Spotify authorize URL', () => {
      const url = service.buildAuthUrl('state-123');
      expect(url).toContain('https://accounts.spotify.com/authorize');
    });

    it('includes the state parameter', () => {
      const url = service.buildAuthUrl('my-state');
      expect(url).toContain('state=my-state');
    });

    it('includes required scopes', () => {
      const url = service.buildAuthUrl('s');
      expect(url).toContain('streaming');
      expect(url).toContain('user-modify-playback-state');
    });

    it('sets response_type=code', () => {
      expect(service.buildAuthUrl('s')).toContain('response_type=code');
    });
  });

  // ── isExpired ───────────────────────────────────────────────────────────────

  describe('isExpired', () => {
    it('returns false for a fresh token', () => {
      expect(service.isExpired(validTokens)).toBe(false);
    });

    it('returns true for an expired token', () => {
      expect(service.isExpired(expiredTokens)).toBe(true);
    });

    it('returns true when within the 60-second buffer', () => {
      const almostExpired: TokenSet = { ...validTokens, expiresAt: Date.now() + 30_000 };
      expect(service.isExpired(almostExpired)).toBe(true);
    });
  });

  // ── exchangeCode ────────────────────────────────────────────────────────────

  describe('exchangeCode', () => {
    it('calls the accounts API with the correct grant type', async () => {
      mocks.accountsPost.mockResolvedValue({
        data: { access_token: 'at', refresh_token: 'rt', expires_in: 3600 },
      });
      await service.exchangeCode('auth-code');
      expect(mocks.accountsPost).toHaveBeenCalledWith(
        '/api/token',
        expect.any(URLSearchParams),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringContaining('Basic ') }) })
      );
    });

    it('returns a TokenSet with correct shape', async () => {
      mocks.accountsPost.mockResolvedValue({
        data: { access_token: 'at', refresh_token: 'rt', expires_in: 3600 },
      });
      const tokens = await service.exchangeCode('code');
      expect(tokens.accessToken).toBe('at');
      expect(tokens.refreshToken).toBe('rt');
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  // ── refreshTokens ───────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('returns new tokens', async () => {
      mocks.accountsPost.mockResolvedValue({
        data: { access_token: 'new-at', refresh_token: 'new-rt', expires_in: 3600 },
      });
      const tokens = await service.refreshTokens('old-rt');
      expect(tokens.accessToken).toBe('new-at');
      expect(tokens.refreshToken).toBe('new-rt');
    });

    it('preserves the old refreshToken when Spotify does not return a new one', async () => {
      mocks.accountsPost.mockResolvedValue({
        data: { access_token: 'new-at', expires_in: 3600 },
      });
      const tokens = await service.refreshTokens('kept-rt');
      expect(tokens.refreshToken).toBe('kept-rt');
    });
  });

  // ── searchTracks ────────────────────────────────────────────────────────────

  describe('searchTracks', () => {
    it('calls GET /search with correct parameters', async () => {
      mocks.apiGet.mockResolvedValue({ data: { tracks: { items: [] } } });
      await service.searchTracks('beatles', validTokens);
      expect(mocks.apiGet).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/search',
        expect.objectContaining({ params: expect.objectContaining({ q: 'beatles', type: 'track' }) })
      );
    });

    it('maps tracks to the SpotifyTrack shape', async () => {
      mocks.apiGet.mockResolvedValue({ data: { tracks: { items: [spotifyTrackPayload] } } });
      const results = await service.searchTracks('test', validTokens);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        spotifyId: 'track-id',
        title: 'Song Name',
        artist: 'Artist A, Artist B',
        album: 'Album Name',
        albumArt: 'https://img.url/art.jpg',
        duration: 180000,
      });
    });
  });

  // ── getPlayer ───────────────────────────────────────────────────────────────

  describe('getPlayer', () => {
    it('returns null when Spotify returns no active device (204)', async () => {
      const err: any = new Error('No Content');
      err.response = { status: 204 };
      mocks.apiGet.mockRejectedValue(err);
      const result = await service.getPlayer(validTokens);
      expect(result).toBeNull();
    });

    it('returns null when the response has no item', async () => {
      mocks.apiGet.mockResolvedValue({ data: null });
      expect(await service.getPlayer(validTokens)).toBeNull();
    });

    it('maps the player response to NowPlaying', async () => {
      mocks.apiGet.mockResolvedValue({
        data: {
          is_playing: true,
          progress_ms: 45000,
          item: spotifyTrackPayload,
        },
      });
      const np = await service.getPlayer(validTokens);
      expect(np).toMatchObject({
        spotifyId: 'track-id',
        title: 'Song Name',
        isPlaying: true,
        progress: 45000,
      });
    });

    it('rethrows unexpected errors', async () => {
      mocks.apiGet.mockRejectedValue(new Error('Network error'));
      await expect(service.getPlayer(validTokens)).rejects.toThrow('Network error');
    });
  });

  // ── play / pause / skip ──────────────────────────────────────────────────────

  describe('play', () => {
    it('calls PUT /me/player/play', async () => {
      mocks.apiPut.mockResolvedValue({});
      await service.play(validTokens);
      expect(mocks.apiPut).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/player/play',
        null,
        expect.anything()
      );
    });

    it('passes URIs in the body when provided', async () => {
      mocks.apiPut.mockResolvedValue({});
      await service.play(validTokens, ['spotify:track:abc']);
      expect(mocks.apiPut).toHaveBeenCalledWith(
        expect.any(String),
        { uris: ['spotify:track:abc'] },
        expect.anything()
      );
    });
  });

  describe('pause', () => {
    it('calls PUT /me/player/pause', async () => {
      mocks.apiPut.mockResolvedValue({});
      await service.pause(validTokens);
      expect(mocks.apiPut).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/player/pause',
        null,
        expect.anything()
      );
    });
  });

  describe('skip', () => {
    it('calls POST /me/player/next', async () => {
      mocks.apiPost.mockResolvedValue({});
      await service.skip(validTokens);
      expect(mocks.apiPost).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/player/next',
        null,
        expect.anything()
      );
    });
  });

  // ── setVolume ───────────────────────────────────────────────────────────────

  describe('setVolume', () => {
    it('includes volume_percent in the URL', async () => {
      mocks.apiPut.mockResolvedValue({});
      await service.setVolume(validTokens, 75);
      expect(mocks.apiPut).toHaveBeenCalledWith(
        expect.stringContaining('volume_percent=75'),
        null,
        expect.anything()
      );
    });
  });

  // ── getRecommendations ──────────────────────────────────────────────────────

  describe('getRecommendations', () => {
    it('caps seed_tracks at 5 entries', async () => {
      mocks.apiGet.mockResolvedValue({ data: { tracks: [] } });
      await service.getRecommendations(validTokens, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      const call = mocks.apiGet.mock.calls[0];
      const seeds: string = call[1].params.seed_tracks;
      expect(seeds.split(',').length).toBe(5);
    });

    it('maps recommendations to SpotifyTrack[]', async () => {
      mocks.apiGet.mockResolvedValue({ data: { tracks: [spotifyTrackPayload] } });
      const results = await service.getRecommendations(validTokens, ['seed-id']);
      expect(results[0].title).toBe('Song Name');
    });
  });

  // ── transferPlayback ────────────────────────────────────────────────────────

  describe('transferPlayback', () => {
    it('calls PUT /me/player with device_ids array', async () => {
      mocks.apiPut.mockResolvedValue({});
      await service.transferPlayback(validTokens, 'device-abc');
      expect(mocks.apiPut).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/player',
        { device_ids: ['device-abc'], play: true },
        expect.anything()
      );
    });
  });
});
