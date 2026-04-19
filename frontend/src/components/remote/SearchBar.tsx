"use client";

import { useEffect, useState } from 'react'

import { api } from '@/lib/api'

import type { SpotifyTrack } from "@jukebox/shared";

interface Props {
  onResults: (tracks: SpotifyTrack[]) => void;
  onLoading: (loading: boolean) => void;
}

export function SearchBar({ onResults, onLoading }: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      onResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      onLoading(true);
      try {
        const data = await api.get<SpotifyTrack[]>("/spotify/search", {
          q: query,
        });
        onResults(data);
      } catch {
        onResults([]);
      } finally {
        onLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onResults, onLoading]);

  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
        🔍
      </span>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs, artists, albums..."
        className="w-full bg-white/10 border border-white/10 rounded-full pl-10 pr-5 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-spotify-green transition-colors"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
