# API Reference

All REST endpoints are on `http://127.0.0.1:3001`.

> **Note:** Always use `127.0.0.1` instead of `localhost` — Spotify's OAuth redirect policy requires it to avoid cross-site cookie issues in Chrome.  
> Endpoints marked **🔒 auth** require a valid `express-session` cookie (i.e. the tablet must be logged in).

---

## Auth — `/auth`

### `GET /auth/login`

Redirects the browser to Spotify OAuth. Sets a CSRF state in session.

### `GET /auth/callback`

Spotify redirects here after user approves. Exchanges code for tokens, saves in session, sets admin tokens for AutoPlayService, redirects to `FRONTEND_URL/player`.

### `POST /auth/refresh`

Manually refresh the access token. Usually not needed — `requireAuth` middleware refreshes automatically.

### `GET /auth/token` 🔒

Returns only `{ accessToken }` for the Spotify Web Playback SDK. **Never returns refreshToken.**

### `GET /auth/status`

Returns `{ authenticated: boolean }`. Used by the player page to show the login gate.

### `POST /auth/logout`

Destroys the session.

---

## Spotify — `/spotify` 🔒

All routes go through `requireAuth` (auto-refresh) and `apiLimiter` (60 req/min).

### `GET /spotify/search?q=<query>`

Returns `SpotifyTrack[]`. Also applies `searchLimiter` (30 req/min).

### `GET /spotify/player`

Returns `NowPlaying | null` — current Spotify playback state.

### `POST /spotify/play`

Body (optional): `{ uris: string[] }`. Resumes or starts playback.

### `POST /spotify/pause`

Pauses playback.

### `POST /spotify/skip`

Skips to next track.

### `PUT /spotify/volume`

Body: `{ volume: number }` — must be 0–100.

### `PUT /spotify/transfer`

Body: `{ deviceId: string }`. Transfers playback to the SDK device.  
Called automatically by `useSpotifyPlayer` after the `ready` event fires.

---

## Queue — `/queue`

### `GET /queue`

Returns:

```ts
{
  tracks: QueueTrack[];      // userVote populated per session cookie
  userStatus: UserLimitStatus;
  partyMode: boolean;
}
```

### `POST /queue/add`

Body: `SpotifyTrack`. Adds to queue. Returns 429 if anti-spam blocks the session.

### `POST /queue/:id/vote`

Body: `{ direction: 1 | -1 }`. Toggles off if same direction voted twice.

### `DELETE /queue/:id`

Removes a track (admin use — no auth guard currently, add `requireAuth` if needed).

### `POST /queue/played`

Called by the player when a track finishes. Shifts the first track, records analytics, broadcasts updated queue.

---

## Analytics — `/analytics`

### `GET /analytics`

Returns `AnalyticsStats`:

```ts
{
  topTracks: TrackStat[];   // sorted by play count, max 10
  topUsers:  { userId: string; count: number }[];  // max 10, anonymized
}
```

---

## Admin — `/admin` 🔒

### `POST /admin/party-mode`

Toggles `queueService.partyMode`. Broadcasts `party-mode:update` to all socket clients.  
Returns `{ partyMode: boolean }`.

---

## Socket.IO events

Connect with `{ withCredentials: true }` so the session cookie is sent.

### Server → Client

| Event                | Payload              | When emitted                                           |
| -------------------- | -------------------- | ------------------------------------------------------ |
| `queue:update`       | `QueueTrack[]`       | After any queue mutation (add, vote, remove, autoplay) |
| `now-playing:update` | `NowPlaying \| null` | When the SDK fires `player_state_changed`              |
| `player:state`       | `PlayerState`        | When isPlaying or volume changes                       |
| `party-mode:update`  | `boolean`            | When party mode is toggled                             |

### Client → Server

| Event        | Payload                               | Callback                 |
| ------------ | ------------------------------------- | ------------------------ |
| `queue:add`  | `SpotifyTrack`                        | `(err?: string) => void` |
| `queue:vote` | `trackId: string, direction: 1 \| -1` | `(err?: string) => void` |

On connection, the server immediately emits `queue:update` and `party-mode:update` to the new socket.

---

## Shared types (from `shared/types/index.ts`)

```ts
QueueTrack        id, spotifyId, uri, title, artist, album, albumArt,
                  duration, addedBy, votes, userVote, addedAt

NowPlaying        spotifyId, title, artist, album, albumArt,
                  duration, progress, isPlaying

SpotifyTrack      spotifyId, uri, title, artist, album, albumArt, duration

PlayerState       isPlaying, volume

UserLimitStatus   songsAdded, maxSongs, cooldownRemaining

TrackStat         spotifyId, title, artist, albumArt, count

AnalyticsStats    topTracks: TrackStat[], topUsers: { userId, count }[]
```

**`QueueTrack.id`** is an internal UUID (for queue operations).  
**`QueueTrack.spotifyId`** is the Spotify track ID. The same song can appear twice in the queue with different UUIDs.
