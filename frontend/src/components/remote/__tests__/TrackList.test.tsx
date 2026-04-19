import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackList } from '../TrackList';
import type { SpotifyTrack } from '@jukebox/shared';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));

const makeTrack = (overrides: Partial<SpotifyTrack> = {}): SpotifyTrack => ({
  spotifyId: 'spotify-1',
  uri: 'spotify:track:1',
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  albumArt: 'https://example.com/art.jpg',
  duration: 213000,
  ...overrides,
});

describe('TrackList', () => {
  it('shows a loading indicator while searching', () => {
    render(<TrackList tracks={[]} onAdd={vi.fn()} loading={true} />);
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it('shows a hint to search when there are no results and not loading', () => {
    render(<TrackList tracks={[]} onAdd={vi.fn()} loading={false} />);
    expect(screen.getByText(/search for a song/i)).toBeInTheDocument();
  });

  it('renders a list item per track', () => {
    const tracks = [makeTrack(), makeTrack({ spotifyId: 's2', title: 'Song B' })];
    render(<TrackList tracks={tracks} onAdd={vi.fn()} loading={false} />);
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Song B')).toBeInTheDocument();
  });

  it('calls onAdd with the correct track when Add is clicked', () => {
    const onAdd = vi.fn();
    const track = makeTrack();
    render(<TrackList tracks={[track]} onAdd={onAdd} loading={false} />);
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).toHaveBeenCalledWith(track);
  });

  it('disables the Add button and shows "..." while adding', () => {
    const track = makeTrack();
    render(<TrackList tracks={[track]} onAdd={vi.fn()} loading={false} addingId={track.spotifyId} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('...');
  });

  it('formats duration as M:SS', () => {
    render(<TrackList tracks={[makeTrack({ duration: 213000 })]} onAdd={vi.fn()} loading={false} />);
    expect(screen.getByText(/3:33/)).toBeInTheDocument();
  });
});
