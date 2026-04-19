import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../playerStore';
import type { NowPlaying, PlayerState } from '@jukebox/shared';

const makeNowPlaying = (overrides: Partial<NowPlaying> = {}): NowPlaying => ({
  spotifyId: 'track-1',
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  albumArt: 'https://example.com/art.jpg',
  duration: 200000,
  progress: 0,
  isPlaying: true,
  ...overrides,
});

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      nowPlaying: null,
      isPlaying: false,
      volume: 50,
      progress: 0,
      partyMode: false,
    });
  });

  describe('setNowPlaying', () => {
    it('sets nowPlaying and resets progress to track progress', () => {
      const np = makeNowPlaying({ progress: 45000 });
      usePlayerStore.getState().setNowPlaying(np);
      const state = usePlayerStore.getState();
      expect(state.nowPlaying).toBe(np);
      expect(state.progress).toBe(45000);
    });

    it('accepts null to clear the current track', () => {
      usePlayerStore.getState().setNowPlaying(makeNowPlaying());
      usePlayerStore.getState().setNowPlaying(null);
      expect(usePlayerStore.getState().nowPlaying).toBeNull();
    });

    it('sets progress to 0 when nowPlaying is null', () => {
      usePlayerStore.getState().setNowPlaying(null);
      expect(usePlayerStore.getState().progress).toBe(0);
    });
  });

  describe('setPlayerState', () => {
    it('updates isPlaying and volume', () => {
      const state: PlayerState = { isPlaying: true, volume: 80 };
      usePlayerStore.getState().setPlayerState(state);
      expect(usePlayerStore.getState().isPlaying).toBe(true);
      expect(usePlayerStore.getState().volume).toBe(80);
    });
  });

  describe('setProgress', () => {
    it('sets progress to the given value in ms', () => {
      usePlayerStore.getState().setProgress(90000);
      expect(usePlayerStore.getState().progress).toBe(90000);
    });
  });

  describe('setPartyMode', () => {
    it('enables party mode', () => {
      usePlayerStore.getState().setPartyMode(true);
      expect(usePlayerStore.getState().partyMode).toBe(true);
    });

    it('disables party mode', () => {
      usePlayerStore.setState({ partyMode: true });
      usePlayerStore.getState().setPartyMode(false);
      expect(usePlayerStore.getState().partyMode).toBe(false);
    });
  });

  describe('tick', () => {
    it('advances progress by 1000ms when playing', () => {
      usePlayerStore.setState({
        isPlaying: true,
        progress: 10000,
        nowPlaying: makeNowPlaying({ duration: 200000 }),
      });
      usePlayerStore.getState().tick();
      expect(usePlayerStore.getState().progress).toBe(11000);
    });

    it('does not advance progress when paused', () => {
      usePlayerStore.setState({
        isPlaying: false,
        progress: 10000,
        nowPlaying: makeNowPlaying({ duration: 200000 }),
      });
      usePlayerStore.getState().tick();
      expect(usePlayerStore.getState().progress).toBe(10000);
    });

    it('does not advance progress beyond the track duration', () => {
      usePlayerStore.setState({
        isPlaying: true,
        progress: 200000,
        nowPlaying: makeNowPlaying({ duration: 200000 }),
      });
      usePlayerStore.getState().tick();
      expect(usePlayerStore.getState().progress).toBe(200000);
    });

    it('does not advance when nowPlaying is null', () => {
      usePlayerStore.setState({ isPlaying: true, progress: 5000, nowPlaying: null });
      usePlayerStore.getState().tick();
      expect(usePlayerStore.getState().progress).toBe(5000);
    });
  });
});
