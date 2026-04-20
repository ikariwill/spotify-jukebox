import { create } from 'zustand'

import type { QueueTrack } from "@jukebox/shared";

interface QueueStore {
  tracks: QueueTrack[];
  setTracks: (tracks: QueueTrack[]) => void;
  moveTrack: (fromIndex: number, toIndex: number) => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  tracks: [],
  setTracks: (tracks) => set({ tracks }),
  moveTrack: (fromIndex, toIndex) =>
    set((state) => {
      const tracks = [...state.tracks];
      const [track] = tracks.splice(fromIndex, 1);
      tracks.splice(toIndex, 0, track);
      return { tracks };
    }),
}));
