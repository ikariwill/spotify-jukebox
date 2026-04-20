# Architecture & Data Flow

## Overview

```
┌─────────────────────────────────────────────────────────┐
│  Tablet  (127.0.0.1:3000/player)                         │
│  - Spotify Web Playback SDK (browser player)             │
│  - Shows: album art, controls, queue preview, QR code    │
└────────────────┬────────────────────────────────────────┘
                 │  HTTP + WebSocket (Socket.IO)
┌────────────────▼────────────────────────────────────────┐
│  Backend  (127.0.0.1:3001)                               │
│  - Express + Socket.IO                                   │
│  - express-session (tokens never leave here)             │
│  - SpotifyService  QueueService  AnalyticsService        │
│  - AutoPlayService  (polls every 5s when queue empty)    │
└────────────┬───────────────────────────────┬────────────┘
             │  HTTP + WebSocket             │  node-redis
┌────────────▼────────────────┐  ┌──────────▼────────────┐
│  Mobile  (127.0.0.1:3000/   │  │  Redis                 │
│  remote)                    │  │  - Sessions            │
│  - Search, add, vote ▲/▼    │  │  - Queue + history     │
└─────────────────────────────┘  └───────────────────────┘
```

## Monorepo packages

| Package    | Entry point          | Purpose                                                  |
| ---------- | -------------------- | -------------------------------------------------------- |
| `shared`   | `types/index.ts`     | TypeScript interfaces shared by backend and frontend     |
| `backend`  | `src/index.ts`       | Composition root — wires all services, routes, Socket.IO |
| `frontend` | `src/app/layout.tsx` | Next.js App Router                                       |

## Backend service layer

```
SpotifyService     Stateless. Receives TokenSet on every call.
                   Owns OAuth flow, all Spotify API calls.

QueueService       In-memory queue with voting and anti-spam.
                   Owns the source of truth for the queue.
                   If a RedisQueueStore is attached (via setStore),
                   the queue and history are persisted to Redis.

RedisQueueStore    Thin Redis adapter for QueueService.
                   Serialises queue (JSON string) and history (Redis list).
                   Wired in index.ts when REDIS_URL is set.

AnalyticsService   In-memory play counts and user activity.

AutoPlayService    Polls every 5s. Needs setAdminTokens() called
                   after OAuth to be able to hit the Spotify API.
```

Services are instantiated in `backend/src/index.ts` and exported:

```ts
export const spotifyService   = new SpotifyService();
export const queueService     = new QueueService();
export const analyticsService = new AnalyticsService();
export const autoPlayService  = new AutoPlayService(...);
```

On startup, if `REDIS_URL` is set, a Redis client is connected and wired:

```ts
const redisClient = await buildRedis(); // connects node-redis client
const queueStore = new RedisQueueStore(redisClient);
queueService.setStore(queueStore);
await queueService.hydrate(); // loads persisted queue + history
```

Routes and middleware import from `../index` (or `../../index`).  
Routes themselves are loaded via **dynamic import** inside `start()` to break the circular dependency:

```ts
// index.ts — inside async start()
const { authRouter } = await import("./routes/auth");
```

## Token flow

```
Browser (tablet)
  │  GET /auth/login
  ▼
Backend
  │  redirect → Spotify OAuth
  ▼
Spotify accounts.spotify.com
  │  redirect back with code
  ▼
Backend GET /auth/callback
  │  exchangeCode(code) → { accessToken, refreshToken, expiresAt }
  │  stored in express-session (server-side only)
  │  autoPlayService.setAdminTokens(tokens)
  │  redirect → /player
  ▼
Browser (tablet) — authenticated

Spotify Web Playback SDK needs a token:
  Browser → GET /auth/token → Backend returns only accessToken from session
  (refreshToken never leaves the server)
```

## Session sharing with Socket.IO

```ts
// index.ts
const wrap = (mw: any) => (socket: any, next: any) =>
  mw(socket.request, socket.request.res ?? {}, next);
io.use(wrap(sessionMiddleware));
```

This lets socket handlers read `socket.request.session.id` for per-user anti-spam and vote deduplication.

## Real-time flow

```
Mobile user adds a track
  → POST /queue/add  (REST)  or  socket emit 'queue:add'
  → QueueService.addTrack()
  → io.emit('queue:update', queue)   ← all clients update instantly
  → Tablet QueuePreview re-renders via Zustand
```

## Queue sorting

Tracks sort by: **votes desc → addedAt asc** (FIFO tiebreaker).  
Re-sort runs after every `addTrack`, `vote`, and `remove` call.

## Auto-play

`AutoPlayService` polls every 5 seconds. When `queueService.isEmpty()` is true and `recentlyPlayed` has at least one seed:

1. Refreshes admin tokens if expired
2. Calls `GET /recommendations?seed_tracks=<last 5 played>`
3. Adds results via `queueService.addTrack(rec, 'autoplay')`
4. Broadcasts `queue:update`

No recommendations fire until the first track has been played (no seeds yet).

## Party mode

`queueService.partyMode` (boolean). When `true`:

- `canAdd()` always returns `{ allowed: true }`
- No cooldown, no per-user song limit

Toggled via `POST /admin/party-mode` (requires auth). State is broadcast to all clients via `party-mode:update` socket event.
