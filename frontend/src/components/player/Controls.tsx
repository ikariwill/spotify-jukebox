"use client";

import { Pause, Play, SkipBack, SkipForward, Volume1, Volume2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { useSpotifyPlayerRef } from '@/hooks/useSpotifyPlayer'
import { api } from '@/lib/api'
import { usePlayerStore } from '@/store/playerStore'

function VolumeSlider({ volume, onChange }: { volume: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragPct, setDragPct] = useState(0);
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const playbackPct = Math.min(Math.max(volume, 0), 100);
  const displayPct = dragging ? dragPct : playbackPct;

  const pctFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) * 100;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setHoverPct(pctFromEvent(e));
  }, [pctFromEvent]);

  const handleMouseLeave = useCallback(() => {
    setHoverPct(null);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pct = pctFromEvent(e);
    setDragging(true);
    setDragPct(pct);
    setHoverPct(null);
    onChange(Math.round(pct));

    const onMove = (ev: MouseEvent) => {
      const p = pctFromEvent(ev);
      setDragPct(p);
      onChange(Math.round(p));
    };
    const onUp = (ev: MouseEvent) => {
      const finalPct = pctFromEvent(ev);
      setDragging(false);
      onChange(Math.round(finalPct));
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pctFromEvent, onChange]);

  const isInteracting = hoverPct !== null || dragging;
  const tooltipPct = dragging ? dragPct : hoverPct;

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Volume"
      aria-valuenow={volume}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative flex items-center h-4 flex-1 cursor-pointer group"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative w-full h-1.5 bg-[#4d4c4d] rounded-full overflow-hidden">
        {/* White layer: extends to hover or playback */}
        <div
          className="absolute inset-y-0 left-0 bg-white"
          style={{ width: `${isInteracting ? (hoverPct ?? playbackPct) : playbackPct}%` }}
        />
        {/* Green layer: covers 0..playback, visible on hover/drag */}
        <div
          className="absolute inset-y-0 left-0 bg-spotify-green"
          style={{
            width: dragging ? `${dragPct}%` : `${playbackPct}%`,
            opacity: isInteracting ? 1 : 0,
          }}
        />
      </div>

      {/* Thumb */}
      <div
        className="absolute w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ left: `${displayPct}%`, transform: 'translateX(-50%)' }}
      />

      {/* Tooltip */}
      {tooltipPct !== null && (
        <div
          className="absolute -top-7 px-1.5 py-0.5 bg-neutral-800 text-white text-xs rounded pointer-events-none whitespace-nowrap"
          style={{ left: `${tooltipPct}%`, transform: 'translateX(-50%)' }}
        >
          {Math.round(tooltipPct)}
        </div>
      )}
    </div>
  );
}

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
        <VolumeSlider volume={volume ?? 50} onChange={handleVolume} />
        <Volume2 size={16} className="text-gray-500 shrink-0" />
      </div>
    </div>
  );
}
