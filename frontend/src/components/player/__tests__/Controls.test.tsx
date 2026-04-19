import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen } from '@testing-library/react'

import { usePlayerStore } from '../../../store/playerStore'
import { Controls } from '../Controls'

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 204,
  text: () => Promise.resolve(""),
});
vi.stubGlobal("fetch", mockFetch);

describe("Controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(""),
    });
    usePlayerStore.setState({ isPlaying: false, volume: 50 });
  });

  it("shows the play button when paused", () => {
    render(<Controls />);
    expect(screen.getByLabelText(/play/i)).toBeInTheDocument();
  });

  it("shows the pause button when playing", () => {
    usePlayerStore.setState({ isPlaying: true, volume: 50 });
    render(<Controls />);
    expect(screen.getByLabelText(/pause/i)).toBeInTheDocument();
  });

  it("calls POST /spotify/play when play is clicked", () => {
    render(<Controls />);
    fireEvent.click(screen.getByLabelText(/play/i));
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/spotify/play");
    expect(init.method).toBe("POST");
  });

  it("calls POST /spotify/pause when pause is clicked", () => {
    usePlayerStore.setState({ isPlaying: true, volume: 50 });
    render(<Controls />);
    fireEvent.click(screen.getByLabelText(/pause/i));
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/spotify/pause");
    expect(init.method).toBe("POST");
  });

  it("calls POST /spotify/skip when skip is clicked", () => {
    render(<Controls />);
    fireEvent.click(screen.getByLabelText(/skip/i));
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/spotify/skip");
    expect(init.method).toBe("POST");
  });

  it("calls PUT /spotify/volume when volume slider changes", () => {
    render(<Controls />);
    fireEvent.change(screen.getByLabelText(/volume/i), {
      target: { value: "80" },
    });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/spotify/volume");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ volume: 80 });
  });

  it("renders a volume slider with the current volume value", () => {
    usePlayerStore.setState({ isPlaying: false, volume: 70 });
    render(<Controls />);
    const slider = screen.getByLabelText(/volume/i) as HTMLInputElement;
    expect(slider.value).toBe("70");
  });
});
