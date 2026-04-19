"use client";

import { api } from '@/lib/api'
import { usePlayerStore } from '@/store/playerStore'

export function Controls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const setPlayerState = usePlayerStore((s) => s.setPlayerState);

  const handlePlay = () => api.post("/spotify/play").catch(console.error);
  const handlePause = () => api.post("/spotify/pause").catch(console.error);
  const handleSkip = () => api.post("/spotify/skip").catch(console.error);

  const handleVolume = (v: number) => {
    setPlayerState({ isPlaying, volume: v });
    api.put("/spotify/volume", { volume: v }).catch(console.error);
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div className="flex items-center gap-10">
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-spotify-black text-2xl hover:scale-105 active:scale-95 transition-transform shadow-lg"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          onClick={handleSkip}
          className="text-gray-400 hover:text-white active:scale-95 transition-all text-3xl"
          aria-label="Skip"
        >
          ⏭
        </button>
      </div>

      <div className="flex items-center gap-3 w-full max-w-xs">
        <span className="text-gray-500 text-sm">🔈</span>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => handleVolume(Number(e.target.value))}
          className="flex-1"
          aria-label="Volume"
        />
        <span className="text-gray-500 text-sm">🔊</span>
      </div>
    </div>
  );
}
