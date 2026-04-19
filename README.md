# Spotify Jukebox

A full-stack internal jukebox app. The tablet runs the player; anyone who scans the QR code can add songs and vote on the queue.

## Stack

- **Frontend**: Next.js 14 (App Router) + React + TypeScript + TailwindCSS + Zustand
- **Backend**: Node.js + Express + TypeScript + Socket.IO
- **Auth**: Spotify OAuth (Authorization Code Flow) — tokens stored server-side only
- **Realtime**: Socket.IO for instant queue/vote sync across all clients

## Prerequisites

- Node.js 18+
- A **Spotify Premium** account (required for Web Playback SDK)
- A Spotify Developer App — create one at [developer.spotify.com](https://developer.spotify.com/dashboard)

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd spotify-jukebox
npm install
```

### 2. Create a Spotify App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3001/auth/callback` to **Redirect URIs**
4. Copy your **Client ID** and **Client Secret**

### 3. Configure environment

```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env and fill in:
#   SPOTIFY_CLIENT_ID=
#   SPOTIFY_CLIENT_SECRET=
#   SESSION_SECRET=<any long random string>
# All other values have working defaults for local development

# Frontend
cp .env.example frontend/.env.local
# Edit frontend/.env.local:
#   NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
#   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### 4. Run

```bash
npm run dev
```

This starts both servers concurrently:
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:3001](http://localhost:3001)

### 5. Authenticate

Open `http://localhost:3000` — you'll be redirected to `/player`.  
Click **"Login with Spotify"** and complete the OAuth flow.

The tablet is now the active player.

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

| Feature | Details |
|---|---|
| Spotify OAuth | Authorization Code Flow, tokens in server session only |
| Web Playback SDK | Browser-based player on the tablet, auto-transfers playback |
| Real-time queue | Socket.IO broadcasts queue changes instantly to all clients |
| Voting | ▲/▼ per session, queue auto-sorts by score (FIFO tiebreak) |
| Anti-spam | Configurable song limit + cooldown per session |
| Party Mode | Disables anti-spam — toggle from the tablet |
| Smart autoplay | When queue empties, seeds recommendations from recently played |
| Analytics | In-memory play counts and user activity |
| Redis (optional) | Set `REDIS_URL` for persistent sessions across restarts |
| WakeLock | Prevents tablet screen from sleeping (HTTPS/localhost only) |

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `SPOTIFY_CLIENT_ID` | — | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | — | From Spotify Developer Dashboard |
| `SPOTIFY_REDIRECT_URI` | `http://localhost:3001/auth/callback` | Must match your Spotify app config |
| `SESSION_SECRET` | — | Long random string for session signing |
| `PORT` | `3001` | Backend port |
| `FRONTEND_URL` | `http://localhost:3000` | Used for CORS and OAuth redirects |
| `MAX_SONGS_PER_USER` | `3` | Max songs a user can add per session |
| `COOLDOWN_MS` | `30000` | Cooldown between submissions (ms) |
| `REDIS_URL` | _(empty)_ | Optional Redis URL for session persistence |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:3001` | Backend REST URL |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | Socket.IO server URL |

## Production Notes

- Run behind HTTPS (required for WakeLock API and secure cookies)
- Set `SESSION_SECRET` to a strong random value
- Set `REDIS_URL` for session persistence across restarts
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
