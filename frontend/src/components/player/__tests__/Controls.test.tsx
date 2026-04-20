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

  it("renders the volume slider with current volume as aria-valuenow", () => {
    usePlayerStore.setState({ isPlaying: false, volume: 70 });
    render(<Controls />);
    const slider = screen.getByRole("slider", { name: /volume/i });
    expect(slider).toHaveAttribute("aria-valuenow", "70");
  });

  it("calls PUT /spotify/volume when volume slider is dragged", () => {
    render(<Controls />);
    const slider = screen.getByRole("slider", { name: /volume/i });

    vi.spyOn(slider, "getBoundingClientRect").mockReturnValue({
      left: 0, width: 100, top: 0, bottom: 0, right: 100, height: 0, x: 0, y: 0, toJSON: () => {},
    });

    fireEvent.mouseDown(slider, { clientX: 80 });
    fireEvent.mouseUp(window, { clientX: 80 });

    expect(usePlayerStore.getState().volume).toBe(80);
  });
});
