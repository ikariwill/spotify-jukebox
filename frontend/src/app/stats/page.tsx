import type { AnalyticsStats } from '@jukebox/shared';
import Image from 'next/image';
import Link from 'next/link';

async function getStats(): Promise<AnalyticsStats | null> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${backendUrl}/analytics`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function StatsPage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen bg-spotify-dark px-6 py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">📊 Jukebox Stats</h1>
        <Link href="/player" className="text-sm text-gray-500 hover:text-white transition-colors">
          ← Back to Player
        </Link>
      </div>

      {!stats ? (
        <p className="text-gray-600">No stats available yet.</p>
      ) : (
        <div className="space-y-10">
          {/* Top Tracks */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Most Played Tracks
            </h2>
            {stats.topTracks.length === 0 ? (
              <p className="text-gray-700 text-sm">No plays recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {stats.topTracks.map((track, i) => (
                  <li
                    key={track.spotifyId}
                    className="flex items-center gap-4 bg-white/5 rounded-xl p-3"
                  >
                    <span className="text-gray-600 text-sm w-5 text-center">{i + 1}</span>
                    {track.albumArt && (
                      <Image
                        src={track.albumArt}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded"
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
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Most Active Users
            </h2>
            {stats.topUsers.length === 0 ? (
              <p className="text-gray-700 text-sm">No user activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {stats.topUsers.map((user, i) => (
                  <li
                    key={user.userId}
                    className="flex items-center gap-4 bg-white/5 rounded-xl p-3"
                  >
                    <span className="text-gray-600 text-sm w-5 text-center">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400">
                      {user.userId.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-mono text-gray-400">
                      {user.userId}…
                    </span>
                    <span className="text-spotify-green font-bold text-sm shrink-0">
                      {user.count} song{user.count !== 1 ? 's' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
