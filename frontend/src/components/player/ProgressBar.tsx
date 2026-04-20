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
  const [dragPct, setDragPct] = useState(0);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [skipTransition, setSkipTransition] = useState(false);
  const prevTrackId = useRef<string | null>(null);

  const suppressTransition = (flag: boolean) => {
    setSkipTransition(flag);
    if (flag) requestAnimationFrame(() => setSkipTransition(false));
  };

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
  // Fill and thumb follow drag; on hover they stay at playback position
  const displayPct = dragging ? dragPct : playbackPct;

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
    setHoverPct(pctFromEvent(e));
  }, [pctFromEvent]);

  const handleMouseLeave = useCallback(() => {
    suppressTransition(true);
    setHoverPct(null);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pct = pctFromEvent(e);
    setDragging(true);
    setDragPct(pct);
    setHoverPct(null);

    const onMove = (ev: MouseEvent) => setDragPct(pctFromEvent(ev));
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

  return (
    <div className="w-full">
      <div
        ref={trackRef}
        className="relative flex items-center h-4 cursor-pointer group"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative w-full h-1.5 bg-[#535353] rounded-full overflow-hidden">
          {/* White layer: extends to hover position (or playback when not hovering) */}
          <div
            className="absolute inset-y-0 left-0 bg-white"
            style={{
              width: dragging ? `${dragPct}%` : `${hoverPct ?? playbackPct}%`,
              transition: (!dragging && hoverPct === null && !skipTransition) ? 'width 1s linear' : 'none',
            }}
          />
          {/* Green layer: always covers 0..playback, only visible on hover/drag */}
          <div
            className="absolute inset-y-0 left-0 bg-spotify-green"
            style={{
              width: dragging ? `${dragPct}%` : `${playbackPct}%`,
              opacity: (hoverPct !== null || dragging) ? 1 : 0,
              transition: 'none',
            }}
          />
        </div>

        {/* Thumb — stays at playback/drag position, not hover */}
        <div
          className="absolute w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `${displayPct}%`, transform: 'translateX(-50%)' }}
        />

        {/* Tooltip — follows mouse on hover, follows thumb on drag */}
        {(hoverPct !== null || dragging) && (
          <div
            className="absolute -top-7 px-1.5 py-0.5 bg-neutral-800 text-white text-xs rounded pointer-events-none whitespace-nowrap"
            style={{
              left: `${dragging ? dragPct : hoverPct!}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {formatMs(Math.round(((dragging ? dragPct : hoverPct!) / 100) * duration))}
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
