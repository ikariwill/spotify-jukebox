import { create } from 'zustand';
import type { QueueTrack, UserLimitStatus } from '@jukebox/shared';

interface QueueStore {
  tracks: QueueTrack[];
  userStatus: UserLimitStatus | null;
  setTracks: (tracks: QueueTrack[]) => void;
  setUserStatus: (status: UserLimitStatus) => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  tracks: [],
  userStatus: null,
  setTracks: (tracks) => set({ tracks }),
  setUserStatus: (userStatus) => set({ userStatus }),
}));
