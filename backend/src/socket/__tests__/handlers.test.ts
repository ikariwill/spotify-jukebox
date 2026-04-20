import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerSocketHandlers } from '../handlers';
import type { QueueService } from '../../services/QueueService';
import type { SpotifyTrack } from '@jukebox/shared';

const makeTrack = (overrides: Partial<SpotifyTrack> = {}): SpotifyTrack => ({
  spotifyId: 'spotify-1',
  uri: 'spotify:track:1',
  title: 'Track',
  artist: 'Artist',
  album: 'Album',
  albumArt: '',
  duration: 180000,
  ...overrides,
});

const makeSocket = (sessionId = 'session-1') => ({
  emit: vi.fn(),
  on: vi.fn(),
  id: 'socket-id',
  request: { session: { id: sessionId } },
});

const makeIo = (socket: ReturnType<typeof makeSocket>) => ({
  on: vi.fn((event: string, cb: (s: any) => void) => {
    if (event === 'connection') cb(socket);
  }),
  emit: vi.fn(),
});

const makeQueueService = (): Partial<QueueService> => ({
  getQueue: vi.fn().mockReturnValue([]),
  partyMode: false,
  canAdd: vi.fn().mockReturnValue({ allowed: true }),
  addTrack: vi.fn(),
  vote: vi.fn().mockReturnValue(true),
});

// Helper to extract a registered socket handler by event name
const getHandler = (socket: ReturnType<typeof makeSocket>, event: string) => {
  const call = socket.on.mock.calls.find(([e]) => e === event);
  return call?.[1] as ((...args: any[]) => void) | undefined;
};

describe('registerSocketHandlers', () => {
  let socket: ReturnType<typeof makeSocket>;
  let io: ReturnType<typeof makeIo>;
  let queue: Partial<QueueService>;

  beforeEach(() => {
    socket = makeSocket();
    io = makeIo(socket);
    queue = makeQueueService();
    registerSocketHandlers(io as any, queue as QueueService);
  });

  describe('on connection', () => {
    it('emits queue:update with current queue to the connecting socket', () => {
      expect(socket.emit).toHaveBeenCalledWith('queue:update', []);
    });

    it('emits party-mode:update with current partyMode to the connecting socket', () => {
      expect(socket.emit).toHaveBeenCalledWith('party-mode:update', false);
    });
  });

  describe('queue:add', () => {
    it('adds the track and broadcasts queue:update when allowed', () => {
      const handler = getHandler(socket, 'queue:add')!;
      const cb = vi.fn();
      handler(makeTrack(), cb);
      expect(queue.addTrack).toHaveBeenCalled();
      expect(io.emit).toHaveBeenCalledWith('queue:update', []);
      expect(cb).toHaveBeenCalledWith();
    });

    it('calls back with an error message when canAdd blocks the user', () => {
      (queue.canAdd as ReturnType<typeof vi.fn>).mockReturnValue({ allowed: false, reason: 'Cooldown: 25s remaining' });
      const handler = getHandler(socket, 'queue:add')!;
      const cb = vi.fn();
      handler(makeTrack(), cb);
      expect(queue.addTrack).not.toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith('Cooldown: 25s remaining');
    });

    it('calls back with an error for invalid track data', () => {
      const handler = getHandler(socket, 'queue:add')!;
      const cb = vi.fn();
      handler({ title: 'missing fields' }, cb);
      expect(queue.addTrack).not.toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith('Invalid track data');
    });
  });

  describe('queue:vote', () => {
    it('votes and broadcasts queue:update on success', () => {
      const handler = getHandler(socket, 'queue:vote')!;
      const cb = vi.fn();
      handler('track-id', 1, cb);
      expect(queue.vote).toHaveBeenCalledWith('track-id', 'session-1', 1);
      expect(io.emit).toHaveBeenCalledWith('queue:update', []);
      expect(cb).toHaveBeenCalledWith();
    });

    it('calls back with an error when the track is not found', () => {
      (queue.vote as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const handler = getHandler(socket, 'queue:vote')!;
      const cb = vi.fn();
      handler('unknown-id', 1, cb);
      expect(cb).toHaveBeenCalledWith('Track not found');
    });
  });

  describe('sessionId fallback', () => {
    it('uses socket.id when session is undefined', () => {
      const noSessionSocket = { ...makeSocket(), request: {} };
      noSessionSocket.id = 'socket-fallback-id';
      const fallbackIo = makeIo(noSessionSocket as any);
      registerSocketHandlers(fallbackIo as any, queue as QueueService);

      const handler = (noSessionSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        ([e]) => e === 'queue:vote'
      )?.[1];
      const cb = vi.fn();
      handler?.('track-id', 1, cb);
      expect(queue.vote).toHaveBeenCalledWith('track-id', 'socket-fallback-id', 1);
    });
  });

  describe('disconnect', () => {
    it('registers a disconnect handler without throwing', () => {
      const handler = getHandler(socket, 'disconnect');
      expect(handler).toBeDefined();
      expect(() => handler!()).not.toThrow();
    });
  });
});
