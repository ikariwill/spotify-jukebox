# Frontend Patterns

## Pages

| Route     | File                      | Notes                                              |
| --------- | ------------------------- | -------------------------------------------------- |
| `/`       | `src/app/page.tsx`        | Redirects to `/player`                             |
| `/player` | `src/app/player/page.tsx` | Tablet kiosk UI. `'use client'` required.          |
| `/remote` | `src/app/remote/page.tsx` | Mobile song-add UI. `'use client'` required.       |
| `/stats`  | `src/app/stats/page.tsx`  | Server component. Fetches analytics via `fetch()`. |

All pages that use hooks must start with `'use client'`.  
`layout.tsx` is a Server Component — do not add `'use client'` to it.

## Zustand stores

Two stores in `src/store/`:

```ts
// playerStore — tablet player state
nowPlaying: NowPlaying | null
isPlaying: boolean
volume: number
progress: number       // ms, advanced locally by tick()
partyMode: boolean

// queueStore — shared queue state
tracks: QueueTrack[]
userStatus: UserLimitStatus | null
```

**Reading store state in components:**

```tsx
const nowPlaying = usePlayerStore((s) => s.nowPlaying); // selector, not the whole store
```

**Writing store state outside React (e.g. in hooks or tests):**

```ts
usePlayerStore.getState().setNowPlaying(np);
useQueueStore.getState().setTracks([]);
```

**Resetting state in tests:**

```ts
beforeEach(() => {
  usePlayerStore.setState({
    nowPlaying: null,
    isPlaying: false,
    volume: 50,
    progress: 0,
    partyMode: false,
  });
  useQueueStore.setState({ tracks: [], userStatus: null });
});
```

## Hooks

### `useSocket` (`src/hooks/useSocket.ts`)

Creates a singleton Socket.IO connection. Must be called once per page — calling it in multiple components is safe (module-level singleton).

Automatically wires server events to the stores:

- `queue:update` → `queueStore.setTracks`
- `now-playing:update` → `playerStore.setNowPlaying`
- `player:state` → `playerStore.setPlayerState`
- `party-mode:update` → `playerStore.setPartyMode`

### `useQueue` (`src/hooks/useQueue.ts`)

REST helpers over `axios` with `withCredentials: true`. Returns `{ tracks, userStatus, fetchQueue, addTrack, vote, removeTrack }`.

`addTrack` calls `POST /queue/add` then re-fetches to refresh `userStatus`. Real-time track updates come via socket, not polling.

### `useSpotifyPlayer` (`src/hooks/useSpotifyPlayer.ts`)

Tablet-only. Dynamically injects the Spotify SDK `<script>` tag.  
**Only call this hook on the `/player` page.**

Key behaviour:

- `getOAuthToken` calls `GET /auth/token` — never reads tokens from localStorage or cookies
- On `ready`: calls `PUT /spotify/transfer` to make the browser tab the active device
- On `authentication_error`: redirects to `/auth/login`
- On `account_error`: alerts that Spotify Premium is required

## Backend API calls

All `axios` instances in the frontend use:

```ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:3001",
  withCredentials: true, // ← sends the session cookie
});
```

Never use `fetch()` for backend calls except in `useSpotifyPlayer` (which uses native `fetch` for the token endpoint) and `stats/page.tsx` (Server Component).

## Adding a new component

1. Place player-facing components in `src/components/player/`
2. Place mobile-facing components in `src/components/remote/`
3. Add `'use client'` only if the component uses hooks or event handlers
4. Create the test file at `src/components/<area>/__tests__/<ComponentName>.test.tsx`

## Next.js `Image` component

Spotify CDN hostnames are allowlisted in `next.config.ts`. Always use `unoptimized` for Spotify album art (avoids Next.js optimizer hitting an external CDN on a local network):

```tsx
<Image
  src={track.albumArt}
  alt={track.album}
  width={48}
  height={48}
  unoptimized
/>
```

In tests, mock `next/image` as a plain `<img>`:

```ts
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement("img", { src, alt }),
}));
```

## QR code

`QRCodeDisplay` renders via the `qrcode` npm package into a `<canvas>`. The URL is generated in the `/player` page:

```ts
// Auto-detects LAN IP — works without config when tablet and phones share a network
const remoteUrl = `http://${window.location.hostname}:3000/remote`;
```

Override with `NEXT_PUBLIC_REMOTE_URL` if the hostname detection doesn't work (e.g. behind a reverse proxy).

## WakeLock

`/player` page uses `navigator.wakeLock.request('screen')` to prevent the tablet from sleeping.  
Only works on HTTPS or `localhost`. Silently fails on plain HTTP — this is expected.  
Re-acquired on `visibilitychange` because the browser releases WakeLock when the tab is hidden.

## Progress bar tick

`ProgressBar` starts a `setInterval(tick, 1000)` while `isPlaying` is true. `tick()` advances `playerStore.progress` by 1000ms locally without hitting the server.

The server corrects the progress value whenever `now-playing:update` fires (from the SDK's `player_state_changed` event).
