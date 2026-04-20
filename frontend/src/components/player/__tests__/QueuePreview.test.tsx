import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueuePreview } from '../QueuePreview';
import { useQueueStore } from '../../../store/queueStore';
import type { QueueTrack } from '@jukebox/shared';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));

const makeTrack = (overrides: Partial<QueueTrack> = {}): QueueTrack => ({
  id: 'uuid-1',
  spotifyId: 'spotify-1',
  uri: 'spotify:track:1',
  title: 'Queue Track',
  artist: 'Artist',
  album: 'Album',
  albumArt: 'https://example.com/art.jpg',
  duration: 200000,
  addedBy: 'session1',
  votes: 0,
  userVote: 0,
  addedAt: Date.now(),
  ...overrides,
});

describe('QueuePreview', () => {
  beforeEach(() => {
    useQueueStore.setState({ tracks: [] });
  });

  it('shows an empty queue message when there are no tracks', () => {
    render(<QueuePreview />);
    expect(screen.getByText(/queue is empty/i)).toBeInTheDocument();
  });

  it('renders track titles for tracks in the queue', () => {
    useQueueStore.setState({ tracks: [makeTrack({ title: 'Song A' }), makeTrack({ id: '2', title: 'Song B' })] });
    render(<QueuePreview />);
    expect(screen.getByText('Song A')).toBeInTheDocument();
    expect(screen.getByText('Song B')).toBeInTheDocument();
  });

  it('shows a positive vote count with a + prefix', () => {
    useQueueStore.setState({ tracks: [makeTrack({ votes: 5 })] });
    render(<QueuePreview />);
    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('shows negative vote count without a + prefix', () => {
    useQueueStore.setState({ tracks: [makeTrack({ votes: -2 })] });
    render(<QueuePreview />);
    expect(screen.getByText('-2')).toBeInTheDocument();
  });

  it('renders all tracks in the queue', () => {
    const tracks = Array.from({ length: 10 }, (_, i) =>
      makeTrack({ id: `id-${i}`, spotifyId: `sp-${i}`, title: `Song ${i}` })
    );
    useQueueStore.setState({ tracks });
    render(<QueuePreview />);
    for (let i = 0; i < 10; i++) {
      expect(screen.getByText(`Song ${i}`)).toBeInTheDocument();
    }
  });
});
