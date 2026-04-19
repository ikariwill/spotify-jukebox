# Backend Patterns

## Adding a new route

1. Create `backend/src/routes/myroute.ts` and export a `Router`
2. Import the service you need from `'../index'`
3. Register in `backend/src/index.ts` inside `start()` via dynamic import:

```ts
// backend/src/index.ts — inside async start()
const { myRouter } = await import('./routes/myroute');
app.use('/mypath', myRouter);
```

> Dynamic import is required here. Static imports from routes back into `index.ts` create a circular dependency because `index.ts` also exports the service instances.

## Using services in a route

```ts
// backend/src/routes/queue.ts
import { queueService, io } from '../index';

router.post('/add', (req, res) => {
  const added = queueService.addTrack(req.body, req.sessionID);
  io.emit('queue:update', queueService.getQueue());
  res.status(201).json(added);
});
```

The `io` instance and all services are singletons exported from `index.ts`.

## Protecting a route

```ts
import { requireAuth } from '../middleware/auth';

router.get('/protected', requireAuth, (req, res) => {
  // req.session.tokens is guaranteed to be fresh here
  const token = req.session.tokens!.accessToken;
});
```

`requireAuth` automatically refreshes the token if it's within 60 seconds of expiry. If refresh fails, it destroys the session and returns 401.

## Calling the Spotify API

Always pass tokens from `req.session.tokens` — never cache them in the service:

```ts
router.get('/search', requireAuth, async (req, res) => {
  const tracks = await spotifyService.searchTracks(q, req.session.tokens!);
  res.json(tracks);
});
```

`SpotifyService` is stateless by design. It does not store tokens internally.

## Session data shape

Defined via module augmentation in `SpotifyService.ts`:

```ts
declare module 'express-session' {
  interface SessionData {
    tokens?: TokenSet;       // { accessToken, refreshToken, expiresAt }
    oauthState?: string;     // CSRF token for OAuth
  }
}
```

Access in any route or middleware via `req.session.tokens` and `req.sessionID`.

## Broadcasting via Socket.IO

After any queue mutation, always broadcast to all clients:

```ts
io.emit('queue:update', queueService.getQueue());
```

Pass no `sessionId` to `getQueue()` for broadcasts — all clients receive `userVote: 0` and reconcile their own vote state locally.

## Anti-spam check

```ts
const { allowed, reason } = queueService.canAdd(req.sessionID);
if (!allowed) return res.status(429).json({ error: reason });
```

Anti-spam is bypassed automatically when `queueService.partyMode === true`.

## Rate limiting

Two limiters are available from `middleware/rateLimit.ts`:
- `apiLimiter` — 60 req/min (applied globally on `/spotify`)
- `searchLimiter` — 30 req/min (applied only on `GET /spotify/search`)

Apply as standard Express middleware: `router.use(apiLimiter)`.

## Extending QueueTrack

`QueueService` uses `InternalQueueTrack` internally (which has `voters: Map<string, 1|-1>`).  
Public consumers always receive `QueueTrack` (from `shared/types/index.ts`), with `voters` stripped and `userVote` computed per-session.

Do **not** add fields to `QueueTrack` in `shared/` without also handling them in `QueueService.getQueue()`.

## Redis session store

The session store falls back to `MemoryStore` unless `REDIS_URL` is set.  
The setup is in `index.ts` inside `buildSessionStore()`. Connect-redis v7 is used with ioredis.  
No code changes are needed to switch — just set the env var.

## AutoPlayService lifecycle

`autoPlayService.start()` is called once in `index.ts`.  
`autoPlayService.setAdminTokens(tokens)` must be called after the OAuth callback to enable recommendations. This is done in `routes/auth.ts`:

```ts
authRouter.get('/callback', async (req, res) => {
  const tokens = await spotifyService.exchangeCode(code);
  req.session.tokens = tokens;
  autoPlayService.setAdminTokens(tokens);   // ← required
  ...
});
```

If the server restarts, tokens are lost from `AutoPlayService`. The tablet must re-authenticate.
