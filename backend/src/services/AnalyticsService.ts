import type { TrackStat, AnalyticsStats } from '@jukebox/shared';

interface TrackRecord {
  title: string;
  artist: string;
  albumArt: string;
  count: number;
}

export class AnalyticsService {
  private playCount = new Map<string, TrackRecord>();
  private userActivity = new Map<string, number>();

  recordPlay(track: { spotifyId: string; title: string; artist: string; albumArt: string }, sessionId: string): void {
    const existing = this.playCount.get(track.spotifyId);
    this.playCount.set(track.spotifyId, {
      title: track.title,
      artist: track.artist,
      albumArt: track.albumArt,
      count: (existing?.count ?? 0) + 1,
    });

    if (sessionId !== 'autoplay') {
      this.userActivity.set(sessionId, (this.userActivity.get(sessionId) ?? 0) + 1);
    }
  }

  getStats(): AnalyticsStats {
    const topTracks: TrackStat[] = Array.from(this.playCount.entries())
      .map(([spotifyId, rec]) => ({ spotifyId, ...rec }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topUsers = Array.from(this.userActivity.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { topTracks, topUsers };
  }
}
