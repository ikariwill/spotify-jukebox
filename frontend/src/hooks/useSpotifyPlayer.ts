"use client";

import { useEffect, useRef } from 'react'

import { usePlayerStore } from '../store/playerStore'

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: any;
  }
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

async function fetchAccessToken(): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/auth/token`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch Spotify access token");
  const { accessToken } = await res.json();
  return accessToken;
}

export function useSpotifyPlayer() {
  const playerRef = useRef<any>(null);
  const setNowPlaying = usePlayerStore((s) => s.setNowPlaying);
  const setPlayerState = usePlayerStore((s) => s.setPlayerState);
  const lastTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "Jukebox Player",
        getOAuthToken: async (cb: (token: string) => void) => {
          try {
            const token = await fetchAccessToken();
            cb(token);
          } catch (err) {
            console.error("[Spotify SDK] Failed to get token:", err);
          }
        },
        volume: 0.5,
      });

      player.addListener("player_state_changed", (state: any) => {
        if (!state) return;
        const track = state.track_window.current_track;

        // Detect track end: paused at position 0 after a different track was playing
        const trackEnded =
          state.paused &&
          state.position === 0 &&
          lastTrackIdRef.current !== null &&
          lastTrackIdRef.current === track.id;

        lastTrackIdRef.current = track.id;

        if (trackEnded) {
          fetch(`${BACKEND_URL}/spotify/skip`, {
            method: "POST",
            credentials: "include",
          }).catch(console.error);
          return;
        }

        setNowPlaying({
          spotifyId: track.id,
          title: track.name,
          artist: track.artists.map((a: any) => a.name).join(", "),
          album: track.album.name,
          albumArt: track.album.images[0]?.url ?? "",
          duration: state.duration,
          progress: state.position,
          isPlaying: !state.paused,
        });
        setPlayerState({
          isPlaying: !state.paused,
          volume:
            state.volume != null ? Math.round(state.volume * 100) : undefined,
        });
      });

      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        console.log(
          "[Spotify SDK] Ready, transferring playback to device:",
          device_id,
        );
        fetch(`${BACKEND_URL}/spotify/transfer`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: device_id }),
        }).catch(console.error);
      });

      player.addListener(
        "not_ready",
        ({ device_id }: { device_id: string }) => {
          console.warn("[Spotify SDK] Device went offline:", device_id);
        },
      );

      player.addListener(
        "initialization_error",
        ({ message }: { message: string }) => {
          console.error("[Spotify SDK] Initialization error:", message);
        },
      );

      player.addListener(
        "authentication_error",
        ({ message }: { message: string }) => {
          console.error("[Spotify SDK] Authentication error:", message);
          // Redirect to re-auth
          window.location.href = `${BACKEND_URL}/auth/login`;
        },
      );

      player.addListener(
        "account_error",
        ({ message }: { message: string }) => {
          console.error(
            "[Spotify SDK] Account error (requires Premium):",
            message,
          );
          alert(
            "Spotify Premium is required for playback. Please upgrade your account.",
          );
        },
      );

      player.connect().then((success: boolean) => {
        if (success) console.log("[Spotify SDK] Connected");
        else console.error("[Spotify SDK] Failed to connect");
      });

      playerRef.current = player;
    };

    return () => {
      playerRef.current?.disconnect();
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [setNowPlaying, setPlayerState]);

  return playerRef;
}
