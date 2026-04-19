import { create } from 'zustand'

import type { NowPlaying, PlayerState } from "@jukebox/shared";

interface PlayerStore {
  nowPlaying: NowPlaying | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  partyMode: boolean;
  setNowPlaying: (np: NowPlaying | null) => void;
  setPlayerState: (state: PlayerState) => void;
  setProgress: (ms: number) => void;
  setPartyMode: (enabled: boolean) => void;
  tick: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  nowPlaying: null,
  isPlaying: false,
  volume: 50,
  progress: 0,
  partyMode: false,

  setNowPlaying: (np) => set({ nowPlaying: np, progress: np?.progress ?? 0 }),

  setPlayerState: (state) =>
    set({ isPlaying: state.isPlaying, volume: state.volume ?? get().volume }),

  setProgress: (ms) => set({ progress: ms }),

  setPartyMode: (enabled) => set({ partyMode: enabled }),

  tick: () => {
    const { isPlaying, progress, nowPlaying } = get();
    if (isPlaying && nowPlaying && progress < nowPlaying.duration) {
      set({ progress: progress + 1000 });
    }
  },
}));
