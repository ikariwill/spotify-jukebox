import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@jukebox/shared';
import type { QueueService } from './QueueService';
import type { SpotifyService } from './SpotifyService';
import type { TokenSet } from './SpotifyService';

export class AutoPlayService {
  private adminTokens: TokenSet | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly POLL_MS = 5000;

  constructor(
    private readonly queueService: QueueService,
    private readonly spotifyService: SpotifyService,
    private readonly io: Server<ClientToServerEvents, ServerToClientEvents>
  ) {}

  setAdminTokens(tokens: TokenSet): void {
    this.adminTokens = tokens;
  }

  getAdminTokens(): TokenSet | null {
    return this.adminTokens;
  }

  start(): void {
    this.pollInterval = setInterval(() => this.tick(), this.POLL_MS);
  }

  stop(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private async tick(): Promise<void> {
    if (!this.adminTokens || !this.queueService.isEmpty()) return;

    try {
      if (this.spotifyService.isExpired(this.adminTokens)) {
        this.adminTokens = await this.spotifyService.refreshTokens(
          this.adminTokens.refreshToken
        );
      }

      const recentIds = this.queueService.getRecentlyPlayedIds();
      if (recentIds.length === 0) return;

      const recommendations = await this.spotifyService.getRecommendations(
        this.adminTokens,
        recentIds
      );

      for (const rec of recommendations) {
        this.queueService.addTrack(rec, 'autoplay');
      }

      this.io.emit('queue:update', this.queueService.getQueue());
    } catch (err) {
      console.error('[AutoPlayService] Error fetching recommendations:', err);
    }
  }
}
