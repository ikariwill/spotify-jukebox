import { beforeEach, describe, expect, it } from 'vitest'

import { useQueueStore } from '../queueStore'

import type { QueueTrack } from "@jukebox/shared";

const makeTrack = (overrides: Partial<QueueTrack> = {}): QueueTrack => ({
  id: "uuid-1",
  spotifyId: "spotify-1",
  uri: "spotify:track:1",
  title: "Track",
  artist: "Artist",
  album: "Album",
  albumArt: "",
  duration: 200000,
  addedBy: "session1",
  votes: 0,
  userVote: 0,
  addedAt: Date.now(),
  ...overrides,
});

describe("queueStore", () => {
  beforeEach(() => {
    useQueueStore.setState({ tracks: [] });
  });

  describe("setTracks", () => {
    it("replaces the tracks array", () => {
      useQueueStore.getState().setTracks([makeTrack()]);
      expect(useQueueStore.getState().tracks).toHaveLength(1);
    });

    it("clears tracks when given an empty array", () => {
      useQueueStore.setState({ tracks: [makeTrack()] });
      useQueueStore.getState().setTracks([]);
      expect(useQueueStore.getState().tracks).toHaveLength(0);
    });
  });
});
