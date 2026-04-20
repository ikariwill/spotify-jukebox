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
  const displayPct = dragging ? dragPct : Math.min((progress / duration) * 100, 100);

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pct = pctFromEvent(e);
    setDragging(true);
    setDragPct(pct);

    const onMove = (ev: MouseEvent) => {
      setDragPct(pctFromEvent(ev));
    };
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
      >
        <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-spotify-green rounded-full"
            style={{ width: `${displayPct}%`, transition: (dragging || skipTransition) ? 'none' : 'width 1s linear' }}
          />
        </div>
        <div
          className="absolute w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `${displayPct}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1.5">
        <span>{formatMs(dragging ? Math.round((dragPct / 100) * duration) : progress)}</span>
        <span>{formatMs(duration)}</span>
      </div>
    </div>
  );
}
