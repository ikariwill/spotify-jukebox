import type { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@jukebox/shared';
import type { QueueService } from '../services/QueueService';

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  queueService: QueueService
): void {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    const session = (socket.request as any).session;
    const sessionId: string = session?.id ?? socket.id;

    socket.emit('queue:update', queueService.getQueue(sessionId));
    socket.emit('party-mode:update', queueService.partyMode);

    socket.on('queue:add', (track, callback) => {
      if (!track?.spotifyId || !track?.uri || !track?.title) {
        callback?.('Invalid track data');
        return;
      }

      const { allowed, reason } = queueService.canAdd(sessionId);
      if (!allowed) {
        callback?.(reason);
        return;
      }

      queueService.addTrack(track, sessionId);
      io.emit('queue:update', queueService.getQueue());
      callback?.();
    });

    socket.on('queue:vote', (trackId, direction, callback) => {
      const success = queueService.vote(trackId, sessionId, direction);
      if (!success) {
        callback?.('Track not found');
        return;
      }
      io.emit('queue:update', queueService.getQueue());
      callback?.();
    });

    socket.on('disconnect', () => {
      // no-op — session state is preserved in express-session
    });
  });
}
