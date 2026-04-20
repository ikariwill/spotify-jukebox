'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';

function formatMs(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function ProgressBar() {
  const progress = usePlayerStore((s) => s.progress);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const tick = usePlayerStore((s) => s.tick);

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [activePct, setActivePct] = useState(0);
  const [skipTransition, setSkipTransition] = useState(false);
  const prevTrackId = useRef<string | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isPlaying, tick]);

  useEffect(() => {
    const currentId = nowPlaying?.spotifyId ?? null;
    if (currentId !== prevTrackId.current) {
      prevTrackId.current = currentId;
      setSkipTransition(true);
      const id = setTimeout(() => setSkipTransition(false), 50);
      return () => clearTimeout(id);
    }
  }, [nowPlaying?.spotifyId]);

  const duration = nowPlaying?.duration ?? 1;
  const playbackPct = Math.min((progress / duration) * 100, 100);
  // During interaction show the drag/hover position, otherwise playback
  const displayPct = dragging ? activePct : (hoverPct ?? playbackPct);

  const pctFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) * 100;
  }, []);

  const seek = useCallback((pct: number) => {
    const ms = Math.round((pct / 100) * duration);
    setProgress(ms);
    api.post('/spotify/seek', { positionMs: ms }).catch(console.error);
  }, [duration, setProgress]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) setHoverPct(pctFromEvent(e));
  }, [dragging, pctFromEvent]);

  const handleMouseLeave = useCallback(() => {
    if (!dragging) setHoverPct(null);
  }, [dragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pct = pctFromEvent(e);
    setDragging(true);
    setActivePct(pct);
    setHoverPct(null);

    const onMove = (ev: MouseEvent) => setActivePct(pctFromEvent(ev));
    const onUp = (ev: MouseEvent) => {
      const finalPct = pctFromEvent(ev);
      setDragging(false);
      seek(finalPct);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pctFromEvent, seek]);

  const isInteracting = dragging || hoverPct !== null;
  const tooltipMs = Math.round((displayPct / 100) * duration);

  return (
    <div className="w-full">
      <div
        ref={trackRef}
        className="relative flex items-center h-4 cursor-pointer group"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-spotify-green rounded-full"
            style={{
              width: `${isInteracting ? displayPct : playbackPct}%`,
              transition: (dragging || skipTransition || hoverPct !== null) ? 'none' : 'width 1s linear',
            }}
          />
        </div>

        {/* Thumb */}
        <div
          className="absolute w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `${displayPct}%`, transform: 'translateX(-50%)' }}
        />

        {/* Time tooltip */}
        {isInteracting && (
          <div
            className="absolute -top-7 px-1.5 py-0.5 bg-neutral-800 text-white text-xs rounded pointer-events-none"
            style={{ left: `${displayPct}%`, transform: 'translateX(-50%)' }}
          >
            {formatMs(tooltipMs)}
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-1.5">
        <span>{formatMs(progress)}</span>
        <span>{formatMs(duration)}</span>
      </div>
    </div>
  );
}
