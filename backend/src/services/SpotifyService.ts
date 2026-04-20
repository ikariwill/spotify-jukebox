import { config } from '../config'

import type { SpotifyTrack, NowPlaying } from "@jukebox/shared";

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

declare module "express-session" {
  interface SessionData {
    tokens?: TokenSet;
    oauthState?: string;
  }
}

const ACCOUNTS_BASE = "https://accounts.spotify.com";
const API_BASE = "https://api.spotify.com/v1";

// Fallback search query used when Spotify Browse has no matching category
const CATEGORY_SEARCH_FALLBACK: Record<string, string> = {
  pop: "pop hits",
  rock: "rock hits",
  "hip-hop": "hip hop hits",
  electronic: "electronic dance",
  "r-b": "r&b soul hits",
  latin: "latin hits",
  indie: "indie pop",
  jazz: "jazz classics",
  classical: "classical music",
  metal: "heavy metal",
  reggae: "reggae hits",
  country: "country hits",
  blues: "blues classics",
  soul: "soul music hits",
  funk: "funk carioca",
  punk: "punk rock",
  sertanejo: "sertanejo universitario",
  pagode: "pagode baile",
  samba: "samba brasil",
  mpb: "mpb brasil",
};

async function spotifyFetch<T = void>(
  url: string,
  options: RequestInit & { params?: Record<string, string> } = {},
): Promise<T> {
  const { params, ...init } = options;
  const fullUrl = params ? `${url}?${new URLSearchParams(params)}` : url;
  console.log("[spotifyFetch]", fullUrl.replace(/Bearer [^ ]+/, "Bearer ***"));
  const res = await fetch(fullUrl, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Spotify API error ${res.status}: ${body}`);
    (err as any).response = { status: res.status };
    throw err;
  }
  if (res.status === 204) return undefined as unknown as T;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json"))
    return undefined as unknown as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

export class SpotifyService {
  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.spotify.clientId,
      scope: config.spotify.scopes,
      redirect_uri: config.spotify.redirectUri,
      state,
    });
    return `${ACCOUNTS_BASE}/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<TokenSet> {
    const creds = Buffer.from(
      `${config.spotify.clientId}:${config.spotify.clientSecret}`,
    ).toString("base64");

    const data = await spotifyFetch<any>(`${ACCOUNTS_BASE}/api/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.spotify.redirectUri,
      }),
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenSet> {
    const creds = Buffer.from(
      `${config.spotify.clientId}:${config.spotify.clientSecret}`,
    ).toString("base64");

    const data = await spotifyFetch<any>(`${ACCOUNTS_BASE}/api/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

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
    params?: Record<string, string>,
  ): Promise<T> {
    return spotifyFetch<T>(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      params,
    });
  }

  private async apiPut(
    path: string,
    tokens: TokenSet,
    body?: unknown,
  ): Promise<void> {
    await spotifyFetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  private async apiPost(
    path: string,
    tokens: TokenSet,
    body?: unknown,
  ): Promise<void> {
    await spotifyFetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async searchTracks(query: string, tokens: TokenSet): Promise<SpotifyTrack[]> {
    const data = await this.apiGet<any>("/search", tokens, {
      q: query,
      type: "track",
      limit: "10",
      market: "from_token",
    });
    return data.tracks.items.map(this.mapTrack);
  }

  async searchTracksByPopularity(
    query: string,
    tokens: TokenSet,
    returnLimit = 20,
  ): Promise<SpotifyTrack[]> {
    const data = await this.apiGet<any>("/search", tokens, {
      q: query,
      type: "track",
      limit: "10",
    });
    const sorted = (data.tracks.items as any[])
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, returnLimit);

    return sorted.map(this.mapTrack);
  }

  async getTracksByCategory(
    tokens: TokenSet,
    categoryId: string,
  ): Promise<SpotifyTrack[]> {
    const query = CATEGORY_SEARCH_FALLBACK[categoryId] ?? categoryId;
    return this.searchTracksByPopularity(query, tokens);
  }

  async getPlayer(tokens: TokenSet): Promise<NowPlaying | null> {
    try {
      const data = await this.apiGet<any>("/me/player", tokens);
      if (!data || !data.item) return null;
      return {
        spotifyId: data.item.id,
        title: data.item.name,
        artist: data.item.artists.map((a: any) => a.name).join(", "),
        album: data.item.album.name,
        albumArt: data.item.album.images[0]?.url ?? "",
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
    await this.apiPut("/me/player/play", tokens, uris ? { uris } : undefined);
  }

  async pause(tokens: TokenSet): Promise<void> {
    await this.apiPut("/me/player/pause", tokens);
  }

  async skip(tokens: TokenSet): Promise<void> {
    await this.apiPost("/me/player/next", tokens);
  }

  async seek(tokens: TokenSet, positionMs: number): Promise<void> {
    await this.apiPut(`/me/player/seek?position_ms=${positionMs}`, tokens);
  }

  async setVolume(tokens: TokenSet, volumePercent: number): Promise<void> {
    await this.apiPut(
      `/me/player/volume?volume_percent=${volumePercent}`,
      tokens,
    );
  }

  async transferPlayback(tokens: TokenSet, deviceId: string): Promise<void> {
    await this.apiPut("/me/player", tokens, {
      device_ids: [deviceId],
      play: true,
    });
  }

  async getRecommendations(
    tokens: TokenSet,
    seedTrackIds: string[],
  ): Promise<SpotifyTrack[]> {
    const data = await this.apiGet<any>("/recommendations", tokens, {
      seed_tracks: seedTrackIds.slice(0, 5).join(","),
      limit: "5",
    });
    return data.tracks.map(this.mapTrack);
  }


  async getCategories(
    tokens: TokenSet,
    limit = 20,
  ): Promise<{ id: string; name: string; imageUrl: string }[]> {
    const data = await this.apiGet<any>("/browse/categories", tokens, {
      limit: String(limit),
      locale: "en_US",
    });
    return data.categories.items.map((c: any) => ({
      id: c.id,
      name: c.name,
      imageUrl: c.icons[0]?.url ?? "",
    }));
  }

  private mapTrack(item: any): SpotifyTrack {
    return {
      spotifyId: item.id,
      uri: item.uri,
      title: item.name,
      artist: item.artists.map((a: any) => a.name).join(", "),
      album: item.album.name,
      albumArt: item.album.images[0]?.url ?? "",
      duration: item.duration_ms,
    };
  }
}
