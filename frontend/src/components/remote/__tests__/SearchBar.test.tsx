import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { act, fireEvent, render, screen } from '@testing-library/react'

import { SearchBar } from '../SearchBar'

import type { SpotifyTrack } from "@jukebox/shared";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const makeTrack = (): SpotifyTrack => ({
  spotifyId: "spotify-1",
  uri: "spotify:track:1",
  title: "Result",
  artist: "Artist",
  album: "Album",
  albumArt: "",
  duration: 200000,
});

describe("SearchBar", () => {
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

  it("renders a search input", () => {
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("clears results immediately when the query is emptied", async () => {
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(onResults).toHaveBeenLastCalledWith([]);
  });

  it("does not call the API before the 300ms debounce delay", async () => {
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "beatles" },
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls GET /spotify/search after the debounce delay", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify([makeTrack()])),
    });
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "beatles" },
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/spotify/search");
    expect(url).toContain("q=beatles");
  });

  it("calls onLoading(true) then onLoading(false) during a search", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("[]"),
    });
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "test" },
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(onLoading).toHaveBeenCalledWith(true);
    expect(onLoading).toHaveBeenLastCalledWith(false);
  });

  it("passes search results to onResults", async () => {
    const track = makeTrack();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify([track])),
    });
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "song" },
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(onResults).toHaveBeenLastCalledWith([track]);
  });

  it("calls onResults([]) on API error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(""),
    });
    render(<SearchBar onResults={onResults} onLoading={onLoading} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "fail" },
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(onResults).toHaveBeenLastCalledWith([]);
  });
});
