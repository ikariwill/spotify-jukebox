import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Controls } from '../Controls';
import { usePlayerStore } from '../../../store/playerStore';

const mocks = vi.hoisted(() => ({
  post: vi.fn().mockResolvedValue({}),
  put: vi.fn().mockResolvedValue({}),
}));

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mocks) },
}));

describe('Controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerStore.setState({ isPlaying: false, volume: 50 });
  });

  it('shows the play button when paused', () => {
    render(<Controls />);
    expect(screen.getByLabelText(/play/i)).toBeInTheDocument();
  });

  it('shows the pause button when playing', () => {
    usePlayerStore.setState({ isPlaying: true, volume: 50 });
    render(<Controls />);
    expect(screen.getByLabelText(/pause/i)).toBeInTheDocument();
  });

  it('calls POST /spotify/play when play is clicked', () => {
    render(<Controls />);
    fireEvent.click(screen.getByLabelText(/play/i));
    expect(mocks.post).toHaveBeenCalledWith('/spotify/play');
  });

  it('calls POST /spotify/pause when pause is clicked', () => {
    usePlayerStore.setState({ isPlaying: true, volume: 50 });
    render(<Controls />);
    fireEvent.click(screen.getByLabelText(/pause/i));
    expect(mocks.post).toHaveBeenCalledWith('/spotify/pause');
  });

  it('calls POST /spotify/skip when skip is clicked', () => {
    render(<Controls />);
    fireEvent.click(screen.getByLabelText(/skip/i));
    expect(mocks.post).toHaveBeenCalledWith('/spotify/skip');
  });

  it('calls PUT /spotify/volume when volume slider changes', () => {
    render(<Controls />);
    fireEvent.change(screen.getByLabelText(/volume/i), { target: { value: '80' } });
    expect(mocks.put).toHaveBeenCalledWith('/spotify/volume', { volume: 80 });
  });

  it('renders a volume slider with the current volume value', () => {
    usePlayerStore.setState({ isPlaying: false, volume: 70 });
    render(<Controls />);
    const slider = screen.getByLabelText(/volume/i) as HTMLInputElement;
    expect(slider.value).toBe('70');
  });
});
