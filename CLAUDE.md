# Spotify Jukebox — CLAUDE.md

Internal jukebox app: one tablet runs the player, mobile users scan a QR code to add/vote on songs.

## Monorepo (pnpm workspaces + Turborepo)

```
spotify-jukebox/
├── turbo.json            Turborepo pipeline (build, dev, test, lint)
├── pnpm-workspace.yaml   pnpm workspace declaration
├── shared/               TypeScript types shared by backend and frontend
├── backend/              Express + Socket.IO (port 3001)
└── frontend/             Next.js 14 App Router (port 3000)
```

**Package manager: pnpm.** Always run `pnpm install` from the root, never inside a sub-package.  
After changing `shared/types/index.ts`, run `pnpm build` (Turborepo rebuilds dependents automatically).  
Internal workspace dependencies use the `workspace:*` protocol (e.g. `"@jukebox/shared": "workspace:*"`).

## Commands

```bash
pnpm dev                                              # start both servers (parallel, no cache)
pnpm build                                            # shared → backend → frontend (cached)
pnpm test                                             # run all unit tests (cached)
pnpm test:coverage                                    # coverage for all packages (cached)
pnpm lint                                             # lint all packages

# Single package (bypass turbo, run vitest directly)
pnpm --filter @jukebox/backend test
pnpm --filter @jukebox/frontend test
pnpm --filter @jukebox/backend test:coverage
pnpm --filter @jukebox/frontend test:coverage
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
