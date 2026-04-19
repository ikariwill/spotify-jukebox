'use client';

import Image from 'next/image';
import { usePlayerStore } from '@/store/playerStore';

export function NowPlaying() {
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);

  if (!nowPlaying) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="w-64 h-64 rounded-2xl bg-white/5 flex items-center justify-center">
          <span className="text-6xl opacity-30">♪</span>
        </div>
        <p className="text-gray-500 text-lg">Nothing playing</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <Image
          src={nowPlaying.albumArt}
          alt={nowPlaying.album}
          width={280}
          height={280}
          className="rounded-2xl shadow-2xl shadow-black/60"
          priority
          unoptimized
        />
      </div>
      <div className="text-center max-w-xs">
        <p className="text-2xl font-bold truncate">{nowPlaying.title}</p>
        <p className="text-lg text-gray-400 mt-1 truncate">{nowPlaying.artist}</p>
        <p className="text-sm text-gray-600 mt-0.5 truncate">{nowPlaying.album}</p>
      </div>
    </div>
  );
}
