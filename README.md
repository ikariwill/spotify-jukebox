# Spotify Jukebox

A full-stack internal jukebox app. The tablet runs the player; anyone who scans the QR code can add songs and vote on the queue.

## Stack

- **Frontend**: Next.js 15 (App Router) + React + TypeScript + TailwindCSS + Zustand
- **Backend**: Node.js + Express + TypeScript + Socket.IO
- **Auth**: Spotify OAuth (Authorization Code Flow) — tokens stored server-side only
- **Realtime**: Socket.IO for instant queue/vote sync across all clients

## Prerequisites

- Node.js 24 LTS (local dev only)
- Docker + Docker Compose (recommended)
- A **Spotify Premium** account (required for Web Playback SDK)
- A Spotify Developer App — create one at [developer.spotify.com](https://developer.spotify.com/dashboard)

## Quick Start

> **Important:** Always use `http://127.0.0.1` instead of `http://localhost`. Spotify's OAuth redirect policy requires it — Chrome blocks session cookies on `localhost` OAuth redirects, causing "Invalid state or missing code" errors.

### 1. Create a Spotify App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://127.0.0.1:3001/auth/callback` to **Redirect URIs**
4. Copy your **Client ID** and **Client Secret**

### 2. Configure the backend environment

```bash
cp backend/.env.example backend/.env
# Fill in SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SESSION_SECRET
```

---

## Running with Docker (recommended)

Includes Redis, backend and frontend — no local Node.js required.

```bash
git clone <repo-url>
cd spotify-jukebox
docker compose up -d
```

- Frontend: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- Backend: [http://127.0.0.1:3001](http://127.0.0.1:3001)

Open `http://127.0.0.1:3000`, click **"Login with Spotify"** and complete the OAuth flow.

> Redis data (sessions, queue, history) is persisted in a Docker volume and survives container restarts.

### Rebuilding after code changes

```bash
docker compose build
docker compose up -d
```

---

## Running locally (dev mode)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure frontend environment

```bash
cp frontend/.env.example frontend/.env.local
# NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:3001
# NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:3001
```

### 3. Start Redis (optional, for persistence)

```bash
docker compose up -d redis
```

Or run Redis locally and set `REDIS_URL=redis://localhost:6379` in `backend/.env`.

### 4. Run

```bash
pnpm dev
```

This starts both servers concurrently:

- Frontend: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- Backend: [http://127.0.0.1:3001](http://127.0.0.1:3001)

Open `http://127.0.0.1:3000` and click **"Login with Spotify"**.

## Usage

### Tablet (Player UI) — `/player`

- Shows the current track, album art, progress bar
- Playback controls: play/pause, skip, volume
- Queue preview (next 6 songs)
- QR code — scan to open the mobile add-song interface
- **Party Mode** toggle — disables anti-spam limits for parties

### Mobile (Remote UI) — `/remote`

- Scan the QR code from the tablet, or visit `http://<tablet-ip>:3000/remote`
- Search for tracks and add them to the queue
- Vote tracks up/down to reorder the queue
- One vote per user/session (toggle to remove)

### Analytics — `/stats`

- Top played tracks
- Most active users (anonymized session IDs)

## Features

| Feature          | Details                                                                            |
| ---------------- | ---------------------------------------------------------------------------------- |
| Spotify OAuth    | Authorization Code Flow, tokens in server session only                             |
| Web Playback SDK | Browser-based player on the tablet, auto-transfers playback                        |
| Real-time queue  | Socket.IO broadcasts queue changes instantly to all clients                        |
| Voting           | ▲/▼ per session, queue auto-sorts by score (FIFO tiebreak)                         |
| Anti-spam        | Configurable song limit + cooldown per session                                     |
| Party Mode       | Disables anti-spam — toggle from the tablet                                        |
| Smart autoplay   | When queue empties, seeds recommendations from recently played                     |
| Analytics        | In-memory play counts and user activity                                            |
| Redis            | Persistent sessions, queue and history across restarts (via Docker or `REDIS_URL`) |
| WakeLock         | Prevents tablet screen from sleeping (HTTPS/localhost only)                        |

## Environment Variables

### Backend (`backend/.env`)

| Variable                | Default                               | Description                                                   |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------- |
| `SPOTIFY_CLIENT_ID`     | —                                     | From Spotify Developer Dashboard                              |
| `SPOTIFY_CLIENT_SECRET` | —                                     | From Spotify Developer Dashboard                              |
| `SPOTIFY_REDIRECT_URI`  | `http://127.0.0.1:3001/auth/callback` | Must match Spotify app — **use `127.0.0.1`, not `localhost`** |
| `SESSION_SECRET`        | —                                     | Long random string for session signing                        |
| `PORT`                  | `3001`                                | Backend port                                                  |
| `FRONTEND_URL`          | `http://127.0.0.1:3000`               | Used for CORS and OAuth redirects — **use `127.0.0.1`**       |
| `MAX_SONGS_PER_USER`    | `3`                                   | Max songs a user can add per session                          |
| `COOLDOWN_MS`           | `30000`                               | Cooldown between submissions (ms)                             |
| `REDIS_URL`             | _(empty)_                             | Redis URL — set to `redis://localhost:6379` for local dev     |
| `COOKIE_SECURE`         | `false`                               | Set to `true` only when running behind HTTPS                  |

### Frontend (`frontend/.env.local`)

| Variable                  | Default                 | Description                                |
| ------------------------- | ----------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_BACKEND_URL` | `http://127.0.0.1:3001` | Backend REST URL — **use `127.0.0.1`**     |
| `NEXT_PUBLIC_SOCKET_URL`  | `http://127.0.0.1:3001` | Socket.IO server URL — **use `127.0.0.1`** |

## Docker

See [Running with Docker](#running-with-docker-recommended) above.

## Production Notes

- Run behind HTTPS (required for WakeLock API and secure cookies)
- Set `SESSION_SECRET` to a strong random value
- Redis is used for persistent sessions, queue and history — set `REDIS_URL` or use Docker Compose
- Update `SPOTIFY_REDIRECT_URI` in both your Spotify app config and `backend/.env`
- Update `FRONTEND_URL` in `backend/.env` to your production domain

## Project Structure

```
spotify-jukebox/
├── shared/               # TypeScript types shared by frontend and backend
├── backend/
│   └── src/
│       ├── index.ts      # Composition root
│       ├── config.ts
│       ├── services/     # SpotifyService, QueueService, AnalyticsService, AutoPlayService
│       ├── middleware/   # Auth (auto-refresh), rate limiting
│       ├── routes/       # /auth, /spotify, /queue, /analytics, /admin
│       └── socket/       # Socket.IO handlers
└── frontend/
    └── src/
        ├── app/          # Next.js App Router pages
        ├── components/   # Player and Remote UI components
        ├── hooks/        # useSocket, useQueue, useSpotifyPlayer
        └── store/        # Zustand stores
```
