import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NowPlaying } from '../NowPlaying';
import { usePlayerStore } from '../../../store/playerStore';
import type { NowPlaying as NowPlayingType } from '@jukebox/shared';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));

const makeNowPlaying = (overrides: Partial<NowPlayingType> = {}): NowPlayingType => ({
  spotifyId: 'track-1',
  title: 'My Song',
  artist: 'Great Artist',
  album: 'Great Album',
  albumArt: 'https://example.com/art.jpg',
  duration: 200000,
  progress: 0,
  isPlaying: true,
  ...overrides,
});

describe('NowPlaying', () => {
  beforeEach(() => {
    usePlayerStore.setState({ nowPlaying: null });
  });

  it('renders a placeholder when nothing is playing', () => {
    render(<NowPlaying />);
    expect(screen.getByText(/nothing playing/i)).toBeInTheDocument();
  });

  it('renders the track title when something is playing', () => {
    usePlayerStore.setState({ nowPlaying: makeNowPlaying() });
    render(<NowPlaying />);
    expect(screen.getByText('My Song')).toBeInTheDocument();
  });

  it('renders the artist name', () => {
    usePlayerStore.setState({ nowPlaying: makeNowPlaying() });
    render(<NowPlaying />);
    expect(screen.getByText('Great Artist')).toBeInTheDocument();
  });

  it('renders the album name', () => {
    usePlayerStore.setState({ nowPlaying: makeNowPlaying() });
    render(<NowPlaying />);
    expect(screen.getByText('Great Album')).toBeInTheDocument();
  });

  it('renders album art with correct src', () => {
    usePlayerStore.setState({ nowPlaying: makeNowPlaying() });
    render(<NowPlaying />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/art.jpg');
  });
});
