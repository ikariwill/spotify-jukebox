"use client";

import Image from 'next/image'

import { useQueueStore } from '@/store/queueStore'

interface Props {
  onVote: (trackId: string, direction: 1 | -1) => void;
}

export function QueueView({ onVote }: Props) {
  const tracks = useQueueStore((s) => s.tracks);

  return (
    <div>
      <ul className="space-y-1">
        {tracks.map((t, i) => (
          <li
            key={t.id}
            className="flex items-center gap-3 bg-white/5 rounded-xl p-3"
          >
            <span className="text-gray-700 text-xs w-4 text-center shrink-0">
              {i + 1}
            </span>
            <Image
              src={t.albumArt}
              alt={t.album}
              width={40}
              height={40}
              className="rounded shrink-0"
              unoptimized
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.title}</p>
              <p className="text-xs text-gray-500 truncate">{t.artist}</p>
              <p className="text-xs text-gray-700">by {t.addedBy}</p>
            </div>
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <button
                onClick={() => onVote(t.id, 1)}
                className={`text-base leading-none transition-colors cursor-pointer ${
                  t.userVote === 1
                    ? "text-spotify-green"
                    : "text-gray-600 hover:text-gray-300"
                }`}
                aria-label="Upvote"
              >
                ▲
              </button>
              <span
                className={`text-xs font-bold w-5 text-center ${
                  t.votes > 0
                    ? "text-spotify-green"
                    : t.votes < 0
                      ? "text-red-400"
                      : "text-gray-500"
                }`}
              >
                {t.votes}
              </span>
              <button
                onClick={() => onVote(t.id, -1)}
                className={`text-base leading-none transition-colors cursor-pointer ${
                  t.userVote === -1
                    ? "text-red-400"
                    : "text-gray-600 hover:text-gray-300"
                }`}
                aria-label="Downvote"
              >
                ▼
              </button>
            </div>
          </li>
        ))}
        {tracks.length === 0 && (
          <li className="text-center text-gray-700 py-10">
            Queue is empty — add a song!
          </li>
        )}
      </ul>
    </div>
  );
}
