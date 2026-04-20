import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SpotifyService, TokenSet, type } from '../SpotifyService'

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockOk(data: unknown, status = 200) {
  mockFetch.mockResolvedValue({
    ok: true,
    status,
    headers: { get: (key: string) => key === 'content-type' ? 'application/json' : null },
    text: () => Promise.resolve(status === 204 ? "" : JSON.stringify(data)),
    json: () => Promise.resolve(data),
  });
}

function mockErr(status: number) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(""),
  });
}

const validTokens: TokenSet = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: Date.now() + 3_600_000,
};

const expiredTokens: TokenSet = {
  accessToken: "old-token",
  refreshToken: "refresh-token",
  expiresAt: Date.now() - 1000,
};

const spotifyTrackPayload = {
  id: "track-id",
  uri: "spotify:track:track-id",
  name: "Song Name",
  artists: [{ name: "Artist A" }, { name: "Artist B" }],
  album: { name: "Album Name", images: [{ url: "https://img.url/art.jpg" }] },
  duration_ms: 180000,
};

describe("SpotifyService", () => {
  let service: SpotifyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SpotifyService();
  });

  // ── buildAuthUrl ────────────────────────────────────────────────────────────

  describe("buildAuthUrl", () => {
    it("returns a Spotify authorize URL", () => {
      const url = service.buildAuthUrl("state-123");
      expect(url).toContain("https://accounts.spotify.com/authorize");
    });

    it("includes the state parameter", () => {
      const url = service.buildAuthUrl("my-state");
      expect(url).toContain("state=my-state");
    });

    it("includes required scopes", () => {
      const url = service.buildAuthUrl("s");
      expect(url).toContain("streaming");
      expect(url).toContain("user-modify-playback-state");
    });

    it("sets response_type=code", () => {
      expect(service.buildAuthUrl("s")).toContain("response_type=code");
    });
  });

  // ── isExpired ───────────────────────────────────────────────────────────────

  describe("isExpired", () => {
    it("returns false for a fresh token", () => {
      expect(service.isExpired(validTokens)).toBe(false);
    });

    it("returns true for an expired token", () => {
      expect(service.isExpired(expiredTokens)).toBe(true);
    });

    it("returns true when within the 60-second buffer", () => {
      const almostExpired: TokenSet = {
        ...validTokens,
        expiresAt: Date.now() + 30_000,
      };
      expect(service.isExpired(almostExpired)).toBe(true);
    });
  });

  // ── exchangeCode ────────────────────────────────────────────────────────────

  describe("exchangeCode", () => {
    it("calls the accounts API with the correct grant type", async () => {
      mockOk({ access_token: "at", refresh_token: "rt", expires_in: 3600 });
      await service.exchangeCode("auth-code");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("accounts.spotify.com/api/token");
      expect(init.headers.Authorization).toMatch(/^Basic /);
    });

    it("returns a TokenSet with correct shape", async () => {
      mockOk({ access_token: "at", refresh_token: "rt", expires_in: 3600 });
      const tokens = await service.exchangeCode("code");
      expect(tokens.accessToken).toBe("at");
      expect(tokens.refreshToken).toBe("rt");
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  // ── refreshTokens ───────────────────────────────────────────────────────────

  describe("refreshTokens", () => {
    it("returns new tokens", async () => {
      mockOk({
        access_token: "new-at",
        refresh_token: "new-rt",
        expires_in: 3600,
      });
      const tokens = await service.refreshTokens("old-rt");
      expect(tokens.accessToken).toBe("new-at");
      expect(tokens.refreshToken).toBe("new-rt");
    });

    it("preserves the old refreshToken when Spotify does not return a new one", async () => {
      mockOk({ access_token: "new-at", expires_in: 3600 });
      const tokens = await service.refreshTokens("kept-rt");
      expect(tokens.refreshToken).toBe("kept-rt");
    });
  });

  // ── searchTracks ────────────────────────────────────────────────────────────

  describe("searchTracks", () => {
    it("calls GET /search with correct parameters", async () => {
      mockOk({ tracks: { items: [] } });
      await service.searchTracks("beatles", validTokens);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("api.spotify.com/v1/search");
      expect(url).toContain("q=beatles");
      expect(url).toContain("type=track");
    });

    it("maps tracks to the SpotifyTrack shape", async () => {
      mockOk({ tracks: { items: [spotifyTrackPayload] } });
      const results = await service.searchTracks("test", validTokens);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        spotifyId: "track-id",
        title: "Song Name",
        artist: "Artist A, Artist B",
        album: "Album Name",
        albumArt: "https://img.url/art.jpg",
        duration: 180000,
      });
    });
  });

  // ── getPlayer ───────────────────────────────────────────────────────────────

  describe("getPlayer", () => {
    it("returns null when Spotify returns 204 (no active device)", async () => {
      mockOk(null, 204);
      const result = await service.getPlayer(validTokens);
      expect(result).toBeNull();
    });

    it("returns null when the response has no item", async () => {
      mockOk(null);
      expect(await service.getPlayer(validTokens)).toBeNull();
    });

    it("maps the player response to NowPlaying", async () => {
      mockOk({
        is_playing: true,
        progress_ms: 45000,
        item: spotifyTrackPayload,
      });
      const np = await service.getPlayer(validTokens);
      expect(np).toMatchObject({
        spotifyId: "track-id",
        title: "Song Name",
        isPlaying: true,
        progress: 45000,
      });
    });

    it("rethrows unexpected errors", async () => {
      mockErr(500);
      await expect(service.getPlayer(validTokens)).rejects.toThrow(
        "Spotify API error 500",
      );
    });
  });

  // ── play / pause / skip ──────────────────────────────────────────────────────

  describe("play", () => {
    it("calls PUT /me/player/play", async () => {
      mockOk(null, 204);
      await service.play(validTokens);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/me/player/play");
      expect(init.method).toBe("PUT");
    });

    it("passes URIs in the body when provided", async () => {
      mockOk(null, 204);
      await service.play(validTokens, ["spotify:track:abc"]);
      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body)).toEqual({ uris: ["spotify:track:abc"] });
    });
  });

  describe("pause", () => {
    it("calls PUT /me/player/pause", async () => {
      mockOk(null, 204);
      await service.pause(validTokens);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/me/player/pause");
      expect(init.method).toBe("PUT");
    });
  });

  describe("skip", () => {
    it("calls POST /me/player/next", async () => {
      mockOk(null, 204);
      await service.skip(validTokens);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/me/player/next");
      expect(init.method).toBe("POST");
    });
  });

  // ── setVolume ───────────────────────────────────────────────────────────────

  describe("setVolume", () => {
    it("includes volume_percent in the URL", async () => {
      mockOk(null, 204);
      await service.setVolume(validTokens, 75);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("volume_percent=75");
    });
  });

  // ── getRecommendations ──────────────────────────────────────────────────────

  describe("getRecommendations", () => {
    it("caps seed_tracks at 5 entries", async () => {
      mockOk({ tracks: [] });
      await service.getRecommendations(validTokens, [
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
      ]);
      const [url] = mockFetch.mock.calls[0];
      const seeds = new URL(url).searchParams.get("seed_tracks")!;
      expect(seeds.split(",").length).toBe(5);
    });

    it("maps recommendations to SpotifyTrack[]", async () => {
      mockOk({ tracks: [spotifyTrackPayload] });
      const results = await service.getRecommendations(validTokens, [
        "seed-id",
      ]);
      expect(results[0].title).toBe("Song Name");
    });
  });

  // ── transferPlayback ────────────────────────────────────────────────────────

  describe("transferPlayback", () => {
    it("calls PUT /me/player with device_ids array", async () => {
      mockOk(null, 204);
      await service.transferPlayback(validTokens, "device-abc");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/me/player");
      expect(JSON.parse(init.body)).toEqual({
        device_ids: ["device-abc"],
        play: true,
      });
    });
  });

  // ── seek ────────────────────────────────────────────────────────────────────

  describe("seek", () => {
    it("calls PUT /me/player/seek with position_ms in the URL", async () => {
      mockOk(null, 204);
      await service.seek(validTokens, 30000);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/me/player/seek");
      expect(url).toContain("position_ms=30000");
      expect(init.method).toBe("PUT");
    });
  });

  // ── searchTracksByPopularity ─────────────────────────────────────────────────

  describe("searchTracksByPopularity", () => {
    it("sorts results by descending popularity", async () => {
      const low  = { ...spotifyTrackPayload, id: "low",  name: "Low",  popularity: 10 };
      const high = { ...spotifyTrackPayload, id: "high", name: "High", popularity: 90 };
      mockOk({ tracks: { items: [low, high] } });
      const results = await service.searchTracksByPopularity("query", validTokens);
      expect(results[0].spotifyId).toBe("high");
      expect(results[1].spotifyId).toBe("low");
    });

    it("respects the returnLimit parameter", async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        ...spotifyTrackPayload,
        id: `t${i}`,
        popularity: i,
      }));
      mockOk({ tracks: { items } });
      const results = await service.searchTracksByPopularity("query", validTokens, 2);
      expect(results).toHaveLength(2);
    });
  });

  // ── getTracksByCategory ──────────────────────────────────────────────────────

  describe("getTracksByCategory", () => {
    it("uses the CATEGORY_SEARCH_FALLBACK query for known categories", async () => {
      mockOk({ tracks: { items: [] } });
      await service.getTracksByCategory(validTokens, "pop");
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("pop+hits");
    });

    it("falls back to the categoryId itself for unknown categories", async () => {
      mockOk({ tracks: { items: [] } });
      await service.getTracksByCategory(validTokens, "bossa-nova");
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("bossa-nova");
    });
  });

  // ── getCategories ────────────────────────────────────────────────────────────

  describe("getCategories", () => {
    it("returns mapped categories from the browse endpoint", async () => {
      mockOk({
        categories: {
          items: [
            { id: "pop", name: "Pop", icons: [{ url: "https://img/pop.jpg" }] },
            { id: "rock", name: "Rock", icons: [] },
          ],
        },
      });
      const categories = await service.getCategories(validTokens);
      expect(categories).toHaveLength(2);
      expect(categories[0]).toEqual({ id: "pop", name: "Pop", imageUrl: "https://img/pop.jpg" });
      expect(categories[1]).toEqual({ id: "rock", name: "Rock", imageUrl: "" });
    });

    it("passes the limit parameter to the API", async () => {
      mockOk({ categories: { items: [] } });
      await service.getCategories(validTokens, 10);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("limit=10");
    });
  });
});
