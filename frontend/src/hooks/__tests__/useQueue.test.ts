import { beforeEach, describe, expect, it, vi } from 'vitest'

import { act, renderHook } from '@testing-library/react'

import { usePlayerStore } from '../../store/playerStore'
import { useQueueStore } from '../../store/queueStore'
import { useQueue } from '../useQueue'

import type { SpotifyTrack } from "@jukebox/shared";
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockOk(data: unknown) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

const makeTrack = (): SpotifyTrack => ({
  spotifyId: "spotify-1",
  uri: "spotify:track:1",
  title: "Track",
  artist: "Artist",
  album: "Album",
  albumArt: "",
  duration: 200000,
});

describe("useQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueueStore.setState({ tracks: [] });
    usePlayerStore.setState({ partyMode: false } as any);
  });

  describe("fetchQueue", () => {
    it("updates tracks from GET /queue", async () => {
      mockOk({
        tracks: [{ id: "1", title: "Track", votes: 0 }],
        partyMode: false,
      });
      const { result } = renderHook(() => useQueue());
      await act(async () => {
        await result.current.fetchQueue();
      });
      expect(useQueueStore.getState().tracks).toHaveLength(1);
    });

    it("sets partyMode in playerStore from response", async () => {
      mockOk({
        tracks: [],
        partyMode: true,
      });
      const { result } = renderHook(() => useQueue());
      await act(async () => {
        await result.current.fetchQueue();
      });
      expect(usePlayerStore.getState().partyMode).toBe(true);
    });
  });

  describe("addTrack", () => {
    it("posts to /queue/add and then fetches the updated queue", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
          text: () => Promise.resolve(""),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                tracks: [],
                partyMode: false,
              }),
            ),
        });
      const { result } = renderHook(() => useQueue());
      await act(async () => {
        await result.current.addTrack(makeTrack());
      });
      expect(mockFetch.mock.calls[0][0]).toContain("/queue/add");
      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
      expect(mockFetch.mock.calls[1][0]).toContain("/queue");
    });

    it("propagates errors so callers can display feedback", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve(""),
      });
      const { result } = renderHook(() => useQueue());
      await expect(
        act(async () => {
          await result.current.addTrack(makeTrack());
        }),
      ).rejects.toBeTruthy();
    });
  });

  describe("vote", () => {
    it("posts to /queue/:id/vote with the correct direction", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        text: () => Promise.resolve(""),
      });
      const { result } = renderHook(() => useQueue());
      await act(async () => {
        await result.current.vote("track-uuid", 1);
      });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/queue/track-uuid/vote");
      expect(JSON.parse(init.body)).toEqual({ direction: 1 });
    });
  });

  describe("removeTrack", () => {
    it("sends DELETE to /queue/:id", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        text: () => Promise.resolve(""),
      });
      const { result } = renderHook(() => useQueue());
      await act(async () => {
        await result.current.removeTrack("track-uuid");
      });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/queue/track-uuid");
      expect(init.method).toBe("DELETE");
    });
  });
});
