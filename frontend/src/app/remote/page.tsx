'use client';

import { useState, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useQueue } from '@/hooks/useQueue';
import { SearchBar } from '@/components/remote/SearchBar';
import { TrackList } from '@/components/remote/TrackList';
import { QueueView } from '@/components/remote/QueueView';
import type { SpotifyTrack } from '@jukebox/shared';

type Tab = 'search' | 'queue';

export default function RemotePage() {
  useSocket();

  const { addTrack, vote, fetchQueue } = useQueue();
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const showFeedback = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleAdd = useCallback(
    async (track: SpotifyTrack) => {
      setAddingId(track.spotifyId);
      try {
        await addTrack(track);
        showFeedback(`"${track.title}" added to queue!`, true);
      } catch (err: any) {
        const msg = err.response?.data?.error ?? 'Failed to add track';
        showFeedback(msg, false);
      } finally {
        setAddingId(null);
      }
    },
    [addTrack]
  );

  const handleVote = useCallback(
    async (trackId: string, direction: 1 | -1) => {
      try {
        await vote(trackId, direction);
      } catch {
        showFeedback('Vote failed', false);
      }
    },
    [vote]
  );

  // Initial queue fetch
  useState(() => {
    fetchQueue();
  });

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col bg-spotify-dark">
      {/* Header */}
      <div className="px-4 pt-6 pb-0 sticky top-0 bg-spotify-dark z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-spotify-green">🎵 Jukebox</h1>
          <span className="text-xs text-gray-600">Add songs to the queue</span>
        </div>

        <SearchBar onResults={setSearchResults} onLoading={setSearchLoading} />

        {/* Tabs */}
        <div className="flex mt-4 border-b border-white/10">
          {(['search', 'queue'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-spotify-green -mb-px'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'queue' ? '🎶 Queue' : '🔍 Search'}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`mx-4 mt-3 rounded-xl px-4 py-2.5 text-sm text-center transition-all ${
            feedback.ok ? 'bg-spotify-green/20 text-spotify-green' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-8">
        {activeTab === 'search' ? (
          <TrackList
            tracks={searchResults}
            onAdd={handleAdd}
            loading={searchLoading}
            addingId={addingId}
          />
        ) : (
          <QueueView onVote={handleVote} />
        )}
      </div>
    </div>
  );
}
