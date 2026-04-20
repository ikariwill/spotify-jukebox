import { create } from 'zustand'

import type { QueueTrack } from "@jukebox/shared";

interface QueueStore {
  tracks: QueueTrack[];
  setTracks: (tracks: QueueTrack[]) => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  tracks: [],
  setTracks: (tracks) => set({ tracks }),
}));
