import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  on: vi.fn(),
  disconnect: vi.fn(),
  io: vi.fn(),
}));

vi.mock('socket.io-client', () => ({
  io: mocks.io,
}));

// Stub stores so we can verify which setters are wired to which events
const storeMocks = vi.hoisted(() => ({
  setTracks: vi.fn(),
  setNowPlaying: vi.fn(),
  setPlayerState: vi.fn(),
  setPartyMode: vi.fn(),
}));

vi.mock('../../store/queueStore', () => ({
  useQueueStore: (selector: any) =>
    selector({ setTracks: storeMocks.setTracks }),
}));

vi.mock('../../store/playerStore', () => ({
  usePlayerStore: (selector: any) =>
    selector({
      setNowPlaying: storeMocks.setNowPlaying,
      setPlayerState: storeMocks.setPlayerState,
      setPartyMode: storeMocks.setPartyMode,
    }),
}));

import { useSocket } from '../useSocket';

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.io.mockReturnValue({ on: mocks.on, disconnect: mocks.disconnect });
  });

  it('connects to the socket URL with credentials', () => {
    renderHook(() => useSocket());
    expect(mocks.io).toHaveBeenCalledWith(
      'http://localhost:3001',
      expect.objectContaining({ withCredentials: true })
    );
  });

  it('registers a listener for queue:update', () => {
    renderHook(() => useSocket());
    const events = mocks.on.mock.calls.map(([event]: [string]) => event);
    expect(events).toContain('queue:update');
  });

  it('registers a listener for now-playing:update', () => {
    renderHook(() => useSocket());
    const events = mocks.on.mock.calls.map(([event]: [string]) => event);
    expect(events).toContain('now-playing:update');
  });

  it('registers a listener for player:state', () => {
    renderHook(() => useSocket());
    const events = mocks.on.mock.calls.map(([event]: [string]) => event);
    expect(events).toContain('player:state');
  });

  it('registers a listener for party-mode:update', () => {
    renderHook(() => useSocket());
    const events = mocks.on.mock.calls.map(([event]: [string]) => event);
    expect(events).toContain('party-mode:update');
  });

  it('disconnects the socket when the component unmounts', () => {
    const { unmount } = renderHook(() => useSocket());
    unmount();
    expect(mocks.disconnect).toHaveBeenCalled();
  });

  it('wires queue:update to queueStore.setTracks', () => {
    renderHook(() => useSocket());
    const call = mocks.on.mock.calls.find(([event]: [string]) => event === 'queue:update');
    expect(call?.[1]).toBe(storeMocks.setTracks);
  });

  it('wires now-playing:update to playerStore.setNowPlaying', () => {
    renderHook(() => useSocket());
    const call = mocks.on.mock.calls.find(([event]: [string]) => event === 'now-playing:update');
    expect(call?.[1]).toBe(storeMocks.setNowPlaying);
  });
});
