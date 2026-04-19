import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueueView } from '../QueueView';
import { useQueueStore } from '../../../store/queueStore';
import type { QueueTrack, UserLimitStatus } from '@jukebox/shared';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));

const makeTrack = (overrides: Partial<QueueTrack> = {}): QueueTrack => ({
  id: 'uuid-1',
  spotifyId: 'spotify-1',
  uri: 'spotify:track:1',
  title: 'Queue Song',
  artist: 'Artist',
  album: 'Album',
  albumArt: 'https://example.com/art.jpg',
  duration: 200000,
  addedBy: 'session1',
  votes: 3,
  userVote: 0,
  addedAt: Date.now(),
  ...overrides,
});

describe('QueueView', () => {
  beforeEach(() => {
    useQueueStore.setState({ tracks: [], userStatus: null });
  });

  it('shows an empty queue message when there are no tracks', () => {
    render(<QueueView onVote={vi.fn()} />);
    expect(screen.getByText(/queue is empty/i)).toBeInTheDocument();
  });

  it('renders track title and artist', () => {
    useQueueStore.setState({ tracks: [makeTrack()] });
    render(<QueueView onVote={vi.fn()} />);
    expect(screen.getByText('Queue Song')).toBeInTheDocument();
    expect(screen.getByText('Artist')).toBeInTheDocument();
  });

  it('displays the current vote count', () => {
    useQueueStore.setState({ tracks: [makeTrack({ votes: 5 })] });
    render(<QueueView onVote={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onVote(id, 1) when upvote is clicked', () => {
    const onVote = vi.fn();
    useQueueStore.setState({ tracks: [makeTrack()] });
    render(<QueueView onVote={onVote} />);
    fireEvent.click(screen.getByLabelText(/upvote/i));
    expect(onVote).toHaveBeenCalledWith('uuid-1', 1);
  });

  it('calls onVote(id, -1) when downvote is clicked', () => {
    const onVote = vi.fn();
    useQueueStore.setState({ tracks: [makeTrack()] });
    render(<QueueView onVote={onVote} />);
    fireEvent.click(screen.getByLabelText(/downvote/i));
    expect(onVote).toHaveBeenCalledWith('uuid-1', -1);
  });

  it('shows the cooldown timer when cooldownRemaining > 0', () => {
    const status: UserLimitStatus = { songsAdded: 1, maxSongs: 3, cooldownRemaining: 15000 };
    useQueueStore.setState({ userStatus: status });
    render(<QueueView onVote={vi.fn()} />);
    expect(screen.getByText(/cooldown: 15s/i)).toBeInTheDocument();
  });

  it('shows songs added count when not in cooldown', () => {
    const status: UserLimitStatus = { songsAdded: 2, maxSongs: 3, cooldownRemaining: 0 };
    useQueueStore.setState({ userStatus: status });
    render(<QueueView onVote={vi.fn()} />);
    expect(screen.getByText(/2\/3 songs added/i)).toBeInTheDocument();
  });
});
