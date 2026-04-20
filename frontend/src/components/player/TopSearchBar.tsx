"use client";

import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { BrowseCategories } from '@/components/player/BrowseCategories'
import { TrackList } from '@/components/remote/TrackList'
import { useQueue } from '@/hooks/useQueue'
import { api } from '@/lib/api'

import type { SpotifyTrack } from "@jukebox/shared";

interface Category {
  id: string;
  name: string;
  imageUrl: string;
}

export function TopSearchBar() {
  const { addTrack } = useQueue();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const categoriesFetchedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCategories = useCallback(() => {
    if (categoriesFetchedRef.current) return;
    categoriesFetchedRef.current = true;
    setCategoriesLoading(true);
    api
      .get<Category[]>("/spotify/categories")
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setAddedIds(new Set());
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<SpotifyTrack[]>("/spotify/search", {
          q: query,
        });
        setResults(data);
        setAddedIds(new Set());
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
        setResults([]);
        setAddedIds(new Set());
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAdd = useCallback(
    async (track: SpotifyTrack) => {
      setAddingId(track.spotifyId);
      try {
        await addTrack(track);
        setAddedIds((prev) => new Set(prev).add(track.spotifyId));
      } catch {
      } finally {
        setAddingId(null);
      }
    },
    [addTrack],
  );

  const handleCategorySelect = useCallback(async (categoryId: string) => {
    setLoading(true);
    setResults([]);
    setAddedIds(new Set());
    setError(null);
    try {
      const tracks = await api.get<SpotifyTrack[]>(
        `/spotify/genre/${categoryId}`,
      );
      setResults(tracks);
    } catch {
      setError("Could not load tracks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = () => {
    setQuery("");
    setResults([]);
    setAddedIds(new Set());
    setError(null);
    inputRef.current?.focus();
  };

  const showBrowse = !query.trim() && results.length === 0 && !loading;
  const visibleResults = results.filter((t) => !addedIds.has(t.spotifyId));
  const dropdownOpen = open;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
      {/* Input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setOpen(true);
            fetchCategories();
          }}
          placeholder="What do you want to play?"
          className="w-full bg-white/10 border border-white/10 rounded-full pl-10 pr-9 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-spotify-green transition-colors text-sm"
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown overlay */}
      {dropdownOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#282828] rounded-xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto p-3">
            {error ? (
              <p className="text-center text-sm text-red-400 py-6">{error}</p>
            ) : showBrowse ? (
              <BrowseCategories
                categories={categories}
                loading={categoriesLoading}
                onCategorySelect={handleCategorySelect}
              />
            ) : (
              <TrackList
                tracks={visibleResults}
                onAdd={handleAdd}
                loading={loading}
                addingId={addingId}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
