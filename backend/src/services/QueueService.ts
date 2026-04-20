import { v4 as uuidv4 } from 'uuid'

import type { RedisQueueStore } from "./RedisQueueStore";

import type { QueueTrack, SpotifyTrack } from "@jukebox/shared";

interface HistoryEntry {
  spotifyId: string;
  title: string;
  artist: string;
  albumArt: string;
}

interface InternalQueueTrack extends Omit<QueueTrack, "userVote"> {
  voters: Map<string, 1 | -1>;
}

interface SerializedTrack extends Omit<InternalQueueTrack, "voters"> {
  voters: Record<string, 1 | -1>;
}

export class QueueService {
  private queue: InternalQueueTrack[] = [];
  private recentlyPlayed: HistoryEntry[] = [];
  private store: RedisQueueStore | null = null;
  partyMode = false;

  setStore(store: RedisQueueStore): void {
    this.store = store;
  }

  async hydrate(): Promise<void> {
    if (!this.store) return;
    const serialized = await this.store.loadQueue<SerializedTrack>();
    this.queue = serialized.map((t) => ({
      ...t,
      voters: new Map(Object.entries(t.voters) as [string, 1 | -1][]),
    }));
    this.recentlyPlayed = await this.store.loadHistory<HistoryEntry>();
    console.log(
      `[Queue] Hydrated ${this.queue.length} tracks, ${this.recentlyPlayed.length} history entries from Redis`,
    );
  }

  private async persist(): Promise<void> {
    if (!this.store) return;
    const serialized: SerializedTrack[] = this.queue.map((t) => ({
      ...t,
      voters: Object.fromEntries(t.voters) as Record<string, 1 | -1>,
    }));
    await this.store.saveQueue(serialized);
  }

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
      const entry: HistoryEntry = {
        spotifyId: track.spotifyId,
        title: track.title,
        artist: track.artist,
        albumArt: track.albumArt,
      };
      this.recentlyPlayed = [...this.recentlyPlayed, entry].slice(-20);
      this.store?.pushHistory(entry).catch(console.error);
      this.persist().catch(console.error);
    }
    return track;
  }

  getRecentlyPlayed() {
    return this.recentlyPlayed;
  }

  getRecentlyPlayedIds(): string[] {
    return this.recentlyPlayed.map((t) => t.spotifyId);
  }

  async popHistory(): Promise<HistoryEntry | null> {
    if (this.store) {
      return this.store.popHistory<HistoryEntry>();
    }
    return this.recentlyPlayed.pop() ?? null;
  }

  canAdd(_sessionId: string): { allowed: boolean; reason?: string } {
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
    this.persist().catch(console.error);

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
    this.persist().catch(console.error);
    return true;
  }

  remove(trackId: string): boolean {
    const idx = this.queue.findIndex((t) => t.id === trackId);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    this.persist().catch(console.error);
    return true;
  }

  private sort(): void {
    this.queue.sort((a, b) => b.votes - a.votes || a.addedAt - b.addedAt);
  }
}
