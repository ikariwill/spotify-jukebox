"use client";

import { useEffect, useState } from 'react'

import { Controls } from '@/components/player/Controls'
import { NowPlaying } from '@/components/player/NowPlaying'
import { ProgressBar } from '@/components/player/ProgressBar'
import { QRCodeDisplay } from '@/components/player/QRCodeDisplay'
import { QueuePreview } from '@/components/player/QueuePreview'
import { useSocket } from '@/hooks/useSocket'
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer'
import { api } from '@/lib/api'
import { usePlayerStore } from '@/store/playerStore'

export default function PlayerPage() {
  useSpotifyPlayer();
  useSocket();

  const partyMode = usePlayerStore((s) => s.partyMode);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    setRemoteUrl(`http://${window.location.hostname}:3000/remote`);
  }, []);

  // Check auth on mount
  useEffect(() => {
    api
      .get<{ authenticated: boolean }>("/auth/status")
      .then((data) => setIsAuthenticated(data.authenticated))
      .catch(() => setIsAuthenticated(false));
  }, []);

  // WakeLock to prevent screen sleep on tablet
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let wakeLock: WakeLockSentinel | null = null;

    const acquire = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock.request("screen");
      } catch {
        // WakeLock unavailable (e.g. on HTTP in some browsers)
      }
    };

    acquire();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      wakeLock?.release();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const togglePartyMode = () => {
    api.post("/admin/party-mode").catch(console.error);
  };

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-spotify-dark">
        <div className="text-center">
          <p className="text-6xl mb-4">🎵</p>
          <h1 className="text-3xl font-bold text-spotify-green mb-2">
            Jukebox
          </h1>
          <p className="text-gray-400 mb-8">
            Connect your Spotify account to start
          </p>
          <a
            href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"}/auth/login`}
            className="bg-spotify-green text-black font-bold px-8 py-4 rounded-full text-lg hover:bg-green-400 transition-colors"
          >
            Login with Spotify
          </a>
        </div>
      </div>
    );
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-dark flex overflow-hidden">
      {/* Left panel — now playing + controls */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-10 lg:p-14">
        <NowPlaying />
        <div className="w-full max-w-sm space-y-5">
          <ProgressBar />
          <Controls />
        </div>

        {/* Party Mode + Stats links */}
        <div className="flex items-center gap-6 mt-2">
          <button
            onClick={togglePartyMode}
            className={`text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
              partyMode
                ? "bg-yellow-400 text-black border-yellow-400"
                : "border-white/20 text-gray-400 hover:border-white/40 hover:text-white"
            }`}
          >
            🎉 Party Mode {partyMode ? "ON" : "OFF"}
          </button>
          <a
            href="/stats"
            className="text-sm text-gray-600 hover:text-gray-400 transition-colors"
          >
            📊 Stats
          </a>
        </div>
      </div>

      {/* Right panel — queue + QR code */}
      <div className="w-72 xl:w-80 flex flex-col gap-4 p-6 border-l border-white/5 bg-black/20">
        <QueuePreview />
        <QRCodeDisplay url={remoteUrl} />
      </div>
    </div>
  );
}
