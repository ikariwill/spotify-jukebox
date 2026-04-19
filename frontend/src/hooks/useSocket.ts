'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@jukebox/shared';
import { usePlayerStore } from '../store/playerStore';
import { useQueueStore } from '../store/queueStore';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function useSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  const initialized = useRef(false);

  const setTracks = useQueueStore((s) => s.setTracks);
  const setNowPlaying = usePlayerStore((s) => s.setNowPlaying);
  const setPlayerState = usePlayerStore((s) => s.setPlayerState);
  const setPartyMode = usePlayerStore((s) => s.setPartyMode);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';
    socket = io(url, { withCredentials: true });

    socket.on('queue:update', setTracks);
    socket.on('now-playing:update', setNowPlaying);
    socket.on('player:state', setPlayerState);
    socket.on('party-mode:update', setPartyMode);

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    return () => {
      socket?.disconnect();
      socket = null;
      initialized.current = false;
    };
  }, [setTracks, setNowPlaying, setPlayerState, setPartyMode]);

  return socket;
}
