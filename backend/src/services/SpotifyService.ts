import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import type { SpotifyTrack, NowPlaying } from '@jukebox/shared';

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

declare module 'express-session' {
  interface SessionData {
    tokens?: TokenSet;
    oauthState?: string;
  }
}

export class SpotifyService {
  private readonly accountsApi: AxiosInstance;

  constructor() {
    this.accountsApi = axios.create({ baseURL: 'https://accounts.spotify.com' });
  }

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.spotify.clientId,
      scope: config.spotify.scopes,
      redirect_uri: config.spotify.redirectUri,
      state,
    });
    return `https://accounts.spotify.com/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<TokenSet> {
    const creds = Buffer.from(
      `${config.spotify.clientId}:${config.spotify.clientSecret}`
    ).toString('base64');

    const { data } = await this.accountsApi.post(
      '/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.spotify.redirectUri,
      }),
      {
        headers: {
          Authorization: `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenSet> {
    const creds = Buffer.from(
      `${config.spotify.clientId}:${config.spotify.clientSecret}`
    ).toString('base64');

    const { data } = await this.accountsApi.post(
      '/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  isExpired(tokens: TokenSet): boolean {
    return Date.now() >= tokens.expiresAt - 60_000;
  }

  private async apiGet<T>(
    path: string,
    tokens: TokenSet,
    params?: Record<string, string>
  ): Promise<T> {
    const { data } = await axios.get(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      params,
    });
    return data;
  }

  private async apiPut(path: string, tokens: TokenSet, body?: unknown): Promise<void> {
    await axios.put(`https://api.spotify.com/v1${path}`, body ?? null, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
  }

  private async apiPost(path: string, tokens: TokenSet, body?: unknown): Promise<void> {
    await axios.post(`https://api.spotify.com/v1${path}`, body ?? null, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
  }

  async searchTracks(query: string, tokens: TokenSet): Promise<SpotifyTrack[]> {
    const data = await this.apiGet<any>('/search', tokens, {
      q: query,
      type: 'track',
      limit: '20',
    });
    return data.tracks.items.map(this.mapTrack);
  }

  async getPlayer(tokens: TokenSet): Promise<NowPlaying | null> {
    try {
      const data = await this.apiGet<any>('/me/player', tokens);
      if (!data || !data.item) return null;
      return {
        spotifyId: data.item.id,
        title: data.item.name,
        artist: data.item.artists.map((a: any) => a.name).join(', '),
        album: data.item.album.name,
        albumArt: data.item.album.images[0]?.url ?? '',
        duration: data.item.duration_ms,
        progress: data.progress_ms ?? 0,
        isPlaying: data.is_playing,
      };
    } catch (err: any) {
      if (err.response?.status === 204) return null;
      throw err;
    }
  }

  async play(tokens: TokenSet, uris?: string[]): Promise<void> {
    await this.apiPut('/me/player/play', tokens, uris ? { uris } : undefined);
  }

  async pause(tokens: TokenSet): Promise<void> {
    await this.apiPut('/me/player/pause', tokens);
  }

  async skip(tokens: TokenSet): Promise<void> {
    await this.apiPost('/me/player/next', tokens);
  }

  async setVolume(tokens: TokenSet, volumePercent: number): Promise<void> {
    await this.apiPut(
      `/me/player/volume?volume_percent=${volumePercent}`,
      tokens
    );
  }

  async transferPlayback(tokens: TokenSet, deviceId: string): Promise<void> {
    await this.apiPut('/me/player', tokens, {
      device_ids: [deviceId],
      play: true,
    });
  }

  async getRecommendations(tokens: TokenSet, seedTrackIds: string[]): Promise<SpotifyTrack[]> {
    const data = await this.apiGet<any>('/recommendations', tokens, {
      seed_tracks: seedTrackIds.slice(0, 5).join(','),
      limit: '5',
    });
    return data.tracks.map(this.mapTrack);
  }

  private mapTrack(item: any): SpotifyTrack {
    return {
      spotifyId: item.id,
      uri: item.uri,
      title: item.name,
      artist: item.artists.map((a: any) => a.name).join(', '),
      album: item.album.name,
      albumArt: item.album.images[0]?.url ?? '',
      duration: item.duration_ms,
    };
  }
}
