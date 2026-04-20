"use client";

import { useCallback, useState } from 'react'

import { SearchBar } from '@/components/remote/SearchBar'
import { TrackList } from '@/components/remote/TrackList'
import { useQueue } from '@/hooks/useQueue'

import type { SpotifyTrack } from "@jukebox/shared";

export function PlayerSearch() {
  const { addTrack } = useQueue();
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(
    null,
  );
  const [addingId, setAddingId] = useState<string | null>(null);

  const showFeedback = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAdd = useCallback(
    async (track: SpotifyTrack) => {
      setAddingId(track.spotifyId);
      try {
        await addTrack(track);
        showFeedback(`"${track.title}" added!`, true);
      } catch (err: any) {
        showFeedback(err.message ?? "Failed to add track", false);
      } finally {
        setAddingId(null);
      }
    },
    [addTrack],
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
        Add Song
      </h2>
      <SearchBar onResults={setSearchResults} onLoading={setSearchLoading} />
      <div className="h-8 shrink-0 flex items-center">
        {feedback && (
          <div
            className={`w-full rounded-lg px-3 py-1.5 text-xs text-center ${
              feedback.ok
                ? "bg-spotify-green/20 text-spotify-green"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {feedback.msg}
          </div>
        )}
      </div>
      <div className="overflow-y-auto flex-1 min-h-0 -mx-1">
        <TrackList
          tracks={searchResults}
          onAdd={handleAdd}
          loading={searchLoading}
          addingId={addingId}
        />
      </div>
    </div>
  );
}
