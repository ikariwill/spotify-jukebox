import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen } from '@testing-library/react'

import { useQueueStore } from '../../../store/queueStore'
import { QueueView } from '../QueueView'

import type { QueueTrack } from "@jukebox/shared";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement("img", { src, alt }),
}));

const makeTrack = (overrides: Partial<QueueTrack> = {}): QueueTrack => ({
  id: "uuid-1",
  spotifyId: "spotify-1",
  uri: "spotify:track:1",
  title: "Queue Song",
  artist: "Artist",
  album: "Album",
  albumArt: "https://example.com/art.jpg",
  duration: 200000,
  addedBy: "session1",
  votes: 3,
  userVote: 0,
  addedAt: Date.now(),
  ...overrides,
});

describe("QueueView", () => {
  beforeEach(() => {
    useQueueStore.setState({ tracks: [] });
  });

  it("shows an empty queue message when there are no tracks", () => {
    render(<QueueView onVote={vi.fn()} />);
    expect(screen.getByText(/queue is empty/i)).toBeInTheDocument();
  });

  it("renders track title and artist", () => {
    useQueueStore.setState({ tracks: [makeTrack()] });
    render(<QueueView onVote={vi.fn()} />);
    expect(screen.getByText("Queue Song")).toBeInTheDocument();
    expect(screen.getByText("Artist")).toBeInTheDocument();
  });

  it("displays the current vote count", () => {
    useQueueStore.setState({ tracks: [makeTrack({ votes: 5 })] });
    render(<QueueView onVote={vi.fn()} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onVote(id, 1) when upvote is clicked", () => {
    const onVote = vi.fn();
    useQueueStore.setState({ tracks: [makeTrack()] });
    render(<QueueView onVote={onVote} />);
    fireEvent.click(screen.getByLabelText(/upvote/i));
    expect(onVote).toHaveBeenCalledWith("uuid-1", 1);
  });

  it("calls onVote(id, -1) when downvote is clicked", () => {
    const onVote = vi.fn();
    useQueueStore.setState({ tracks: [makeTrack()] });
    render(<QueueView onVote={onVote} />);
    fireEvent.click(screen.getByLabelText(/downvote/i));
    expect(onVote).toHaveBeenCalledWith("uuid-1", -1);
  });
});
