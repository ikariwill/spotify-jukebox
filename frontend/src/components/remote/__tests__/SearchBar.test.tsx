import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchBar } from '../SearchBar';
import type { SpotifyTrack } from '@jukebox/shared';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mocks) },
}));

const makeTrack = (): SpotifyTrack => ({
  spotifyId: 'spotify-1',
  uri: 'spotify:track:1',
  title: 'Result',
  artist: 'Artist',
  album: 'Album',
  albumArt: '',
  duration: 200000,
});

describe('SearchBar', () => {
  let onResults: ReturnType<typeof vi.fn>;
  let onLoading: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    onResults = vi.fn();
    onLoading = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a search input', () => {
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('clears results immediately when the query is emptied', async () => {
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(onResults).toHaveBeenLastCalledWith([]);
  });

  it('does not call the API before the 300ms debounce delay', async () => {
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'beatles' } });
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('calls GET /spotify/search after the debounce delay', async () => {
    mocks.get.mockResolvedValue({ data: [makeTrack()] });
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'beatles' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(mocks.get).toHaveBeenCalledWith(
      '/spotify/search',
      expect.objectContaining({ params: { q: 'beatles' } })
    );
  });

  it('calls onLoading(true) then onLoading(false) during a search', async () => {
    mocks.get.mockResolvedValue({ data: [] });
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'test' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(onLoading).toHaveBeenCalledWith(true);
    expect(onLoading).toHaveBeenLastCalledWith(false);
  });

  it('passes search results to onResults', async () => {
    const track = makeTrack();
    mocks.get.mockResolvedValue({ data: [track] });
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'song' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(onResults).toHaveBeenLastCalledWith([track]);
  });

  it('calls onResults([]) on API error', async () => {
    mocks.get.mockRejectedValue(new Error('network'));
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'fail' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(onResults).toHaveBeenLastCalledWith([]);
  });
});
