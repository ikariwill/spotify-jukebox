"use client";

import { X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

import { api } from '@/lib/api'

import type { AnalyticsStats } from "@jukebox/shared";

interface Props {
  onClose: () => void;
}

export function StatsModal({ onClose }: Props) {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AnalyticsStats>("/analytics")
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-[#181818] rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-bold">📊 Jukebox Stats</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors cursor-pointer"
            aria-label="Close stats"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-8">
          {loading ? (
            <p className="text-center text-gray-600 animate-pulse py-10">Loading...</p>
          ) : !stats ? (
            <p className="text-center text-gray-600 py-10">No stats available yet.</p>
          ) : (
            <>
              {/* Top Tracks */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Most Played Tracks
                </h3>
                {stats.topTracks.length === 0 ? (
                  <p className="text-gray-700 text-sm">No plays recorded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.topTracks.map((track, i) => (
                      <li
                        key={track.spotifyId}
                        className="flex items-center gap-3 bg-white/5 rounded-xl p-3"
                      >
                        <span className="text-gray-600 text-sm w-5 text-center shrink-0">
                          {i + 1}
                        </span>
                        {track.albumArt && (
                          <Image
                            src={track.albumArt}
                            alt=""
                            width={36}
                            height={36}
                            className="rounded shrink-0"
                            unoptimized
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{track.title}</p>
                          <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                        </div>
                        <span className="text-spotify-green font-bold text-sm shrink-0">
                          ×{track.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Top Users */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Most Active Users
                </h3>
                {stats.topUsers.length === 0 ? (
                  <p className="text-gray-700 text-sm">No user activity yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.topUsers.map((user, i) => (
                      <li
                        key={user.userId}
                        className="flex items-center gap-3 bg-white/5 rounded-xl p-3"
                      >
                        <span className="text-gray-600 text-sm w-5 text-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                          {user.userId.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="flex-1 text-sm font-mono text-gray-400 truncate">
                          {user.userId}…
                        </span>
                        <span className="text-spotify-green font-bold text-sm shrink-0">
                          {user.count} song{user.count !== 1 ? "s" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
