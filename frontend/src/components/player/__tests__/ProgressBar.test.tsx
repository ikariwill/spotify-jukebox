import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';
import { usePlayerStore } from '../../../store/playerStore';
import type { NowPlaying } from '@jukebox/shared';

const makeNowPlaying = (overrides: Partial<NowPlaying> = {}): NowPlaying => ({
  spotifyId: 'track-1',
  title: 'Song',
  artist: 'Artist',
  album: 'Album',
  albumArt: '',
  duration: 120000,
  progress: 0,
  isPlaying: true,
  ...overrides,
});

describe('ProgressBar', () => {
  beforeEach(() => {
    usePlayerStore.setState({ nowPlaying: null, isPlaying: false, progress: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 0:00 / 0:00 when nothing is playing', () => {
    render(<ProgressBar />);
    const times = screen.getAllByText('0:00');
    expect(times.length).toBeGreaterThanOrEqual(2);
  });

  it('formats current progress and duration correctly', () => {
    usePlayerStore.setState({
      nowPlaying: makeNowPlaying({ duration: 120000 }),
      progress: 75000,
      isPlaying: false,
    });
    render(<ProgressBar />);
    expect(screen.getByText('1:15')).toBeInTheDocument();
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('advances progress via tick while playing', async () => {
    vi.useFakeTimers();
    usePlayerStore.setState({
      nowPlaying: makeNowPlaying({ duration: 200000 }),
      progress: 0,
      isPlaying: true,
    });
    render(<ProgressBar />);
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(usePlayerStore.getState().progress).toBe(3000);
  });

  it('does not advance progress when paused', async () => {
    vi.useFakeTimers();
    usePlayerStore.setState({
      nowPlaying: makeNowPlaying({ duration: 200000 }),
      progress: 10000,
      isPlaying: false,
    });
    render(<ProgressBar />);
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(usePlayerStore.getState().progress).toBe(10000);
  });
});
