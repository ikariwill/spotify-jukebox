'use client';

import Image from 'next/image';
import type { SpotifyTrack } from '@jukebox/shared';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface Props {
  tracks: SpotifyTrack[];
  onAdd: (track: SpotifyTrack) => void;
  loading: boolean;
  addingId?: string | null;
}

export function TrackList({ tracks, onAdd, loading, addingId }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-600">
        <span className="animate-pulse">Searching...</span>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-700">
        Search for a song to add it to the queue
      </div>
    );
  }

  return (
    <ul className="space-y-0.5">
      {tracks.map((track) => (
        <li
          key={track.spotifyId}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
        >
          <Image
            src={track.albumArt}
            alt={track.album}
            width={48}
            height={48}
            className="rounded-lg shrink-0"
            unoptimized
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{track.title}</p>
            <p className="text-xs text-gray-500 truncate">
              {track.artist} · {formatDuration(track.duration)}
            </p>
          </div>
          <button
            onClick={() => onAdd(track)}
            disabled={addingId === track.spotifyId}
            className="shrink-0 bg-spotify-green text-black font-semibold rounded-full px-4 py-1.5 text-sm hover:bg-green-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingId === track.spotifyId ? '...' : 'Add'}
          </button>
        </li>
      ))}
    </ul>
  );
}
