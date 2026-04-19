import { v4 as uuidv4 } from 'uuid';
import type { QueueTrack, SpotifyTrack } from '@jukebox/shared';
import { config } from '../config';

interface InternalQueueTrack extends Omit<QueueTrack, 'userVote'> {
  voters: Map<string, 1 | -1>;
}

export class QueueService {
  private queue: InternalQueueTrack[] = [];
  private recentlyPlayed: Array<{ spotifyId: string; title: string; artist: string; albumArt: string }> = [];
  private userActivity = new Map<string, { count: number; lastAdded: number }>();
  partyMode = false;

  getQueue(requestingSessionId?: string): QueueTrack[] {
    return this.queue.map((t) => ({
      id: t.id,
      spotifyId: t.spotifyId,
      uri: t.uri,
      title: t.title,
      artist: t.artist,
      album: t.album,
      albumArt: t.albumArt,
      duration: t.duration,
      addedBy: t.addedBy,
      votes: t.votes,
      addedAt: t.addedAt,
      userVote: requestingSessionId
        ? ((t.voters.get(requestingSessionId) ?? 0) as 0 | 1 | -1)
        : 0,
    }));
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  shift(): InternalQueueTrack | undefined {
    const track = this.queue.shift();
    if (track) {
      this.recentlyPlayed = [
        ...this.recentlyPlayed,
        {
          spotifyId: track.spotifyId,
          title: track.title,
          artist: track.artist,
          albumArt: track.albumArt,
        },
      ].slice(-5);
    }
    return track;
  }

  getRecentlyPlayed() {
    return this.recentlyPlayed;
  }

  getRecentlyPlayedIds(): string[] {
    return this.recentlyPlayed.map((t) => t.spotifyId);
  }

  canAdd(sessionId: string): { allowed: boolean; reason?: string } {
    if (this.partyMode) return { allowed: true };

    const activity = this.userActivity.get(sessionId);
    if (!activity) return { allowed: true };

    const now = Date.now();
    const elapsed = now - activity.lastAdded;
    if (elapsed < config.queue.cooldownMs) {
      const remaining = Math.ceil((config.queue.cooldownMs - elapsed) / 1000);
      return { allowed: false, reason: `Cooldown: ${remaining}s remaining` };
    }
    if (activity.count >= config.queue.maxSongsPerUser) {
      return {
        allowed: false,
        reason: `Song limit reached (${config.queue.maxSongsPerUser} per session)`,
      };
    }
    return { allowed: true };
  }

  addTrack(track: SpotifyTrack, sessionId: string): QueueTrack {
    const internal: InternalQueueTrack = {
      id: uuidv4(),
      spotifyId: track.spotifyId,
      uri: track.uri,
      title: track.title,
      artist: track.artist,
      album: track.album,
      albumArt: track.albumArt,
      duration: track.duration,
      addedBy: sessionId.slice(0, 8),
      votes: 0,
      addedAt: Date.now(),
      voters: new Map(),
    };

    this.queue.push(internal);
    this.sort();

    if (sessionId !== 'autoplay') {
      const activity = this.userActivity.get(sessionId);
      this.userActivity.set(sessionId, {
        count: (activity?.count ?? 0) + 1,
        lastAdded: Date.now(),
      });
    }

    return { ...internal, userVote: 0 };
  }

  vote(trackId: string, sessionId: string, direction: 1 | -1): boolean {
    const track = this.queue.find((t) => t.id === trackId);
    if (!track) return false;

    const existing = track.voters.get(sessionId);
    if (existing === direction) {
      track.voters.delete(sessionId);
      track.votes -= direction;
    } else {
      if (existing !== undefined) track.votes -= existing;
      track.voters.set(sessionId, direction);
      track.votes += direction;
    }

    this.sort();
    return true;
  }

  remove(trackId: string): boolean {
    const idx = this.queue.findIndex((t) => t.id === trackId);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    return true;
  }

  private sort(): void {
    this.queue.sort((a, b) => b.votes - a.votes || a.addedAt - b.addedAt);
  }

  getUserStatus(sessionId: string) {
    const activity = this.userActivity.get(sessionId);
    const now = Date.now();
    return {
      songsAdded: activity?.count ?? 0,
      maxSongs: config.queue.maxSongsPerUser,
      cooldownRemaining: activity
        ? Math.max(0, config.queue.cooldownMs - (now - activity.lastAdded))
        : 0,
    };
  }
}
