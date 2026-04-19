# Spotify Jukebox — CLAUDE.md

Internal jukebox app: one tablet runs the player, mobile users scan a QR code to add/vote on songs.

## Monorepo (npm workspaces)

```
spotify-jukebox/
├── shared/     TypeScript types shared by backend and frontend
├── backend/    Express + Socket.IO (port 3001)
└── frontend/   Next.js 14 App Router (port 3000)
```

**Always run `npm install` from the root**, never inside a sub-package.  
After changing `shared/types/index.ts`, run `npm run build --workspace=shared`.

## Commands

```bash
npm run dev                          # start both servers
npm run test                         # run all unit tests
npm run test --workspace=backend     # backend only
npm run test --workspace=frontend    # frontend only
npm run test:coverage --workspace=backend
npm run test:coverage --workspace=frontend
npm run build                        # shared → backend → frontend
```

## Path aliases

| Alias | Resolves to |
|---|---|
| `@jukebox/shared` | `shared/types/index.ts` (both backend and frontend) |
| `@/*` | `frontend/src/*` (frontend only) |

Both `tsconfig.json` and `vitest.config.ts` in each package define these aliases independently.

## Key constraints

- Tokens are **never sent to the browser** — only `accessToken` is returned by `GET /auth/token` for the Spotify SDK
- Backend services are exported from `backend/src/index.ts`; routes import them from there
- Routes are loaded via **dynamic import** inside `start()` to avoid circular deps with `index.ts`
- The `requireAuth` middleware auto-refreshes expired tokens transparently
- Socket.IO shares `express-session` via `wrap(sessionMiddleware)` in `index.ts` — do not remove it

## Docs

- [Architecture & data flow](docs/architecture.md)
- [API reference — REST + Socket.IO](docs/api-reference.md)
- [Backend patterns](docs/backend-patterns.md)
- [Frontend patterns](docs/frontend-patterns.md)
- [Testing guide](docs/testing.md)
