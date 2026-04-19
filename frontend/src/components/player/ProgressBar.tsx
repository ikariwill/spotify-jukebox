'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';

function formatMs(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function ProgressBar() {
  const progress = usePlayerStore((s) => s.progress);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const tick = usePlayerStore((s) => s.tick);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isPlaying, tick]);

  const duration = nowPlaying?.duration ?? 1;
  const pct = Math.min((progress / duration) * 100, 100);

  return (
    <div className="w-full">
      <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-spotify-green rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1.5">
        <span>{formatMs(progress)}</span>
        <span>{formatMs(duration)}</span>
      </div>
    </div>
  );
}
