"use client";

import { Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { api } from '@/lib/api'
import { usePlayerStore } from '@/store/playerStore'
import { useQueueStore } from '@/store/queueStore'

type HistoryEntry = {
  spotifyId: string;
  title: string;
  artist: string;
  albumArt: string;
};

export function QueuePreview() {
  const tracks = useQueueStore(useShallow((s) => s.tracks));
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const [tab, setTab] = useState<"queue" | "history">("queue");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (tab === "history") {
      api
        .get<{ tracks: HistoryEntry[] }>("/queue/history")
        .then((d) => setHistory([...d.tracks].reverse()))
        .catch(console.error);
    }
  }, [tab]);

  const handleClearClick = () => {
    if (!confirming) {
      setConfirming(true);
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirming(false);
    api.delete("/queue/clear").catch(console.error);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-5 mb-4 border-b border-white/5">
        <button
          onClick={() => setTab("queue")}
          className={`pb-2 text-sm font-semibold transition-colors ${
            tab === "queue"
              ? "text-white border-b-2 border-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Queue
        </button>
        <button
          onClick={() => setTab("history")}
          className={`pb-2 text-sm font-semibold transition-colors ${
            tab === "history"
              ? "text-white border-b-2 border-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Recently played
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "queue" && (
          <>
            {/* Now playing */}
            {nowPlaying && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-white mb-2">
                  Now playing
                </p>
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
                  <Image
                    src={nowPlaying.albumArt}
                    alt={nowPlaying.album}
                    width={40}
                    height={40}
                    className="rounded shrink-0"
                    unoptimized
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-spotify-green">
                      {nowPlaying.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {nowPlaying.artist}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Next in queue */}
            {tracks.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-white">
                  Next in queue
                </p>
                <button
                  onClick={handleClearClick}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                    confirming
                      ? "text-red-400 hover:text-red-300"
                      : "text-gray-600 hover:text-gray-400"
                  }`}
                  aria-label="Clear queue"
                >
                  <Trash2 size={12} />
                  {confirming ? "Confirm?" : "Clear"}
                </button>
              </div>
            )}
            <ul className="space-y-1">
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
                  {t.votes !== 0 && (
                    <span
                      className={`text-xs font-bold shrink-0 ${t.votes > 0 ? "text-spotify-green" : "text-red-400"}`}
                    >
                      {t.votes > 0 ? `+${t.votes}` : t.votes}
                    </span>
                  )}
                </li>
              ))}
              {tracks.length === 0 && (
                <li className="text-center text-gray-700 text-sm py-8">
                  Queue is empty
                </li>
              )}
            </ul>
          </>
        )}

        {tab === "history" && (
          <ul className="space-y-1">
            {history.map((t) => (
              <li
                key={t.spotifyId}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <Image
                  src={t.albumArt}
                  alt={t.title}
                  width={36}
                  height={36}
                  className="rounded shrink-0"
                  unoptimized
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-gray-500 truncate">{t.artist}</p>
                </div>
              </li>
            ))}
            {history.length === 0 && (
              <li className="text-center text-gray-700 text-sm py-8">
                No recently played tracks
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
