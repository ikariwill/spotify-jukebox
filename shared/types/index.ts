// ── Queue ─────────────────────────────────────────────────────────────────────

export interface QueueTrack {
  id: string;
  spotifyId: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  addedBy: string;
  votes: number;
  userVote: 0 | 1 | -1;
  addedAt: number;
}

export interface QueueState {
  tracks: QueueTrack[];
  nowPlaying: NowPlaying | null;
}

// ── Now Playing ───────────────────────────────────────────────────────────────

export interface NowPlaying {
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  progress: number;
  isPlaying: boolean;
}

// ── Spotify Track ─────────────────────────────────────────────────────────────

export interface SpotifyTrack {
  spotifyId: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
}

// ── Player State ──────────────────────────────────────────────────────────────

export interface PlayerState {
  isPlaying: boolean;
  volume?: number;
}

// ── Anti-spam ─────────────────────────────────────────────────────────────────

export interface UserLimitStatus {
  songsAdded: number;
  maxSongs: number;
  cooldownRemaining: number;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface TrackStat {
  spotifyId: string;
  title: string;
  artist: string;
  albumArt: string;
  count: number;
}

export interface AnalyticsStats {
  topTracks: TrackStat[];
  topUsers: Array<{ userId: string; count: number }>;
}

// ── Socket.IO events ──────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  "queue:update": (queue: QueueTrack[]) => void;
  "now-playing:update": (nowPlaying: NowPlaying | null) => void;
  "player:state": (state: PlayerState) => void;
  "party-mode:update": (enabled: boolean) => void;
}

export interface ClientToServerEvents {
  "queue:add": (track: SpotifyTrack, callback: (err?: string) => void) => void;
  "queue:vote": (
    trackId: string,
    direction: 1 | -1,
    callback: (err?: string) => void,
  ) => void;
}

// ── API Responses ─────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}
