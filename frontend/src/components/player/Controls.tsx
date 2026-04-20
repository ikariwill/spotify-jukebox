"use client";

import { Pause, Play, SkipBack, SkipForward, Volume1, Volume2 } from 'lucide-react'
import { useCallback, useRef } from 'react'

import { useSpotifyPlayerRef } from '@/hooks/useSpotifyPlayer'
import { api } from '@/lib/api'
import { usePlayerStore } from '@/store/playerStore'

export function Controls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const setPlayerState = usePlayerStore((s) => s.setPlayerState);
  const playerRef = useSpotifyPlayerRef();
  const volumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePlay = () => api.post("/spotify/play").catch(console.error);
  const handlePause = () => api.post("/spotify/pause").catch(console.error);
  const handlePrevious = async () => {
    const state = await playerRef.current?.getCurrentState();
    const progress = state?.position ?? 0;
    api.post("/spotify/previous", { progress }).catch(console.error);
  };
  const handleSkip = () => api.post("/spotify/skip").catch(console.error);

  const handleVolume = useCallback(
    (v: number) => {
      setPlayerState({ isPlaying, volume: v });
      if (volumeTimer.current) clearTimeout(volumeTimer.current);
      volumeTimer.current = setTimeout(() => {
        api.put("/spotify/volume", { volume: v }).catch(console.error);
      }, 300);
    },
    [isPlaying, setPlayerState],
  );

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex items-center gap-6">
        <button
          onClick={handlePrevious}
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          aria-label="Previous"
        >
          <SkipBack size={22} />
        </button>
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-lg cursor-pointer"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={22} fill="black" strokeWidth={0} />
          ) : (
            <Play
              size={22}
              fill="black"
              strokeWidth={0}
              className="translate-x-0.5"
            />
          )}
        </button>
        <button
          onClick={handleSkip}
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          aria-label="Skip"
        >
          <SkipForward size={22} />
        </button>
      </div>

      <div className="flex items-center gap-3 w-full max-w-xs">
        <Volume1 size={16} className="text-gray-500 shrink-0" />
        <input
          type="range"
          min={0}
          max={100}
          value={volume ?? 50}
          onChange={(e) => handleVolume(Number(e.target.value))}
          className="flex-1 accent-spotify-green"
          aria-label="Volume"
        />
        <Volume2 size={16} className="text-gray-500 shrink-0" />
      </div>
    </div>
  );
}
