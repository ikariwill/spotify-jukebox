"use client";

import { useCallback } from 'react'

import { api } from '../lib/api'
import { usePlayerStore } from '../store/playerStore'
import { useQueueStore } from '../store/queueStore'

import type { SpotifyTrack } from "@jukebox/shared";

export function useQueue() {
  const { tracks } = useQueueStore();

  const fetchQueue = useCallback(async () => {
    const data = await api.get<{
      tracks: any[];
      partyMode: boolean;
    }>("/queue");
    useQueueStore.getState().setTracks(data.tracks);
    usePlayerStore.getState().setPartyMode(data.partyMode);
  }, []);

  const addTrack = useCallback(
    async (track: SpotifyTrack) => {
      await api.post("/queue/add", track);
      await fetchQueue();
    },
    [fetchQueue],
  );

  const vote = useCallback(async (trackId: string, direction: 1 | -1) => {
    await api.post(`/queue/${trackId}/vote`, { direction });
  }, []);

  const removeTrack = useCallback(async (trackId: string) => {
    await api.delete(`/queue/${trackId}`);
  }, []);

  return { tracks, fetchQueue, addTrack, vote, removeTrack };
}
