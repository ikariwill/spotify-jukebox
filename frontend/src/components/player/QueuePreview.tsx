"use client";

import Image from 'next/image'
import { useShallow } from 'zustand/react/shallow'

import { useQueueStore } from '@/store/queueStore'

export function QueuePreview() {
  const tracks = useQueueStore(useShallow((s) => s.tracks.slice(0, 6)));

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
        Up Next
      </h3>
      <ul className="flex-1 overflow-y-auto space-y-1">
        {tracks.map((t, i) => (
          <li
            key={t.id}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <span className="text-gray-600 w-4 text-xs text-center shrink-0">
              {i + 1}
            </span>
            <Image
              src={t.albumArt}
              alt={t.album}
              width={36}
              height={36}
              className="rounded shrink-0"
              unoptimized
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.title}</p>
              <p className="text-xs text-gray-500 truncate">{t.artist}</p>
            </div>
            <span
              className={`text-xs font-bold shrink-0 ${
                t.votes > 0
                  ? "text-spotify-green"
                  : t.votes < 0
                    ? "text-red-400"
                    : "text-gray-600"
              }`}
            >
              {t.votes > 0 ? `+${t.votes}` : t.votes}
            </span>
          </li>
        ))}
        {tracks.length === 0 && (
          <li className="text-center text-gray-700 text-sm py-8">
            Queue is empty
          </li>
        )}
      </ul>
    </div>
  );
}
