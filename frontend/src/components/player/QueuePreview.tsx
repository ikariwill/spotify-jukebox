"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { api } from '@/lib/api'
import { useQueue } from '@/hooks/useQueue'
import { usePlayerStore } from '@/store/playerStore'
import { useQueueStore } from '@/store/queueStore'

import type { QueueTrack } from '@jukebox/shared'

type HistoryEntry = {
  spotifyId: string;
  title: string;
  artist: string;
  albumArt: string;
  duration: number;
};

function formatMs(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function SortableTrackItem({ track, index, onPlay }: { track: QueueTrack; index: number; onPlay: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer touch-none group"
      onClick={onPlay}
      {...attributes}
      {...listeners}
    >
      <span className="text-gray-600 w-4 text-xs text-center shrink-0">{index + 1}</span>
      <Image
        src={track.albumArt}
        alt={track.album}
        width={36}
        height={36}
        className="rounded shrink-0"
        unoptimized
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{track.title}</p>
        <p className="text-xs text-gray-500 truncate">{track.artist}</p>
      </div>
      <span className="text-xs text-gray-600 shrink-0">{formatMs(track.duration)}</span>
      {track.votes !== 0 && (
        <span
          className={`text-xs font-bold shrink-0 ${track.votes > 0 ? "text-spotify-green" : "text-red-400"}`}
        >
          {track.votes > 0 ? `+${track.votes}` : track.votes}
        </span>
      )}
    </li>
  );
}

export function QueuePreview() {
  const tracks = useQueueStore(useShallow((s) => s.tracks));
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { reorderTrack, playNow } = useQueue();
  const [tab, setTab] = useState<"queue" | "history">("queue");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = tracks.findIndex((t) => t.id === active.id);
    const toIndex = tracks.findIndex((t) => t.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderTrack(fromIndex, toIndex);
    }
  };

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
          className={`pb-2 text-sm font-semibold transition-colors cursor-pointer ${
            tab === "queue"
              ? "text-white border-b-2 border-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Queue
        </button>
        <button
          onClick={() => setTab("history")}
          className={`pb-2 text-sm font-semibold transition-colors cursor-pointer ${
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
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold text-white">
                    Now playing
                  </p>
                  <span className="flex items-end gap-0.5 h-3">
                    <span
                      className={`sound-bar${isPlaying ? "" : " paused"}`}
                    />
                    <span
                      className={`sound-bar${isPlaying ? "" : " paused"}`}
                    />
                    <span
                      className={`sound-bar${isPlaying ? "" : " paused"}`}
                    />
                    <span
                      className={`sound-bar${isPlaying ? "" : " paused"}`}
                    />
                  </span>
                </div>
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
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tracks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-1">
                  {tracks.map((t, i) => (
                    <SortableTrackItem key={t.id} track={t} index={i} onPlay={() => playNow(i)} />
                  ))}
                  {tracks.length === 0 && (
                    <li className="text-center text-gray-700 text-sm py-8">
                      Queue is empty
                    </li>
                  )}
                </ul>
              </SortableContext>
            </DndContext>
          </>
        )}

        {tab === "history" && (
          <ul className="space-y-1">
            {history.map((t) => (
              <li
                key={t.spotifyId}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() =>
                  api
                    .post("/spotify/play", { uris: [`spotify:track:${t.spotifyId}`] })
                    .catch(console.error)
                }
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
                {t.duration > 0 && (
                  <span className="text-xs text-gray-600 shrink-0">
                    {formatMs(t.duration)}
                  </span>
                )}
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
