# Testing Guide

## Stack

- **Vitest** in both `backend` and `frontend` (no Jest)
- **React Testing Library** for component and hook tests
- **No Supertest** — backend tests are pure unit tests with mocked req/res

## Running tests

```bash
# Both packages
npm run test

# Single package
npm run test --workspace=backend
npm run test --workspace=frontend

# Watch mode
npm run test:watch --workspace=backend

# Coverage report
npm run test:coverage --workspace=backend
npm run test:coverage --workspace=frontend
```

## File locations

Tests live next to the code they test:

```
backend/src/services/QueueService.ts
backend/src/services/__tests__/QueueService.test.ts

frontend/src/components/player/NowPlaying.tsx
frontend/src/components/player/__tests__/NowPlaying.test.tsx
```

## Backend — mocking axios

Use `vi.hoisted()` to define mock functions before the `vi.mock` factory runs. This is required because `vi.mock` is hoisted to the top of the file by Vitest.

```ts
const mocks = vi.hoisted(() => ({
  accountsPost: vi.fn(),
  apiGet: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({ post: mocks.accountsPost })),
    get: mocks.apiGet,
  },
}));
```

## Backend — mocking `index.ts`

Middleware and routes import services from `backend/src/index.ts`. Mock it using the path relative to the **test file**:

```ts
// Test is at: src/middleware/__tests__/auth.test.ts
// index.ts is at: src/index.ts
// Relative path from test file: ../../index

vi.mock('../../index', () => ({
  spotifyService: {
    isExpired: vi.fn(),
    refreshTokens: vi.fn(),
  },
}));
```

Vitest resolves both paths to the same module — the mock applies correctly to all imports.

## Backend — fake timers for time-dependent logic

`QueueService.canAdd()` uses `Date.now()`. Use fake timers:

```ts
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it('allows after cooldown expires', () => {
  service.addTrack(makeTrack(), 'session-1');
  vi.advanceTimersByTime(30001);
  expect(service.canAdd('session-1').allowed).toBe(true);
});
```

For `AutoPlayService` (uses `setInterval`), use `vi.advanceTimersByTimeAsync`:

```ts
service.start();
await vi.advanceTimersByTimeAsync(5000);
expect(mockSpotify.getRecommendations).toHaveBeenCalled();
service.stop();
```

## Backend — mocking req/res for middleware

```ts
const makeReq = (overrides: any = {}): Partial<Request> => ({
  session: {
    tokens: { accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 3_600_000 },
    save: vi.fn((cb: any) => cb(null)),
    destroy: vi.fn((cb: any) => cb(null)),
    ...overrides.session,
  } as any,
  ...overrides,
});

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};
```

## Backend — testing socket handlers

Capture registered handlers by intercepting `socket.on`:

```ts
const socket = { emit: vi.fn(), on: vi.fn(), request: { session: { id: 'session-1' } } };
const io = { on: vi.fn((e, cb) => { if (e === 'connection') cb(socket); }), emit: vi.fn() };

registerSocketHandlers(io as any, queueService);

// Extract the handler for a specific event
const addHandler = socket.on.mock.calls.find(([e]) => e === 'queue:add')?.[1];
const cb = vi.fn();
addHandler(track, cb);
expect(cb).toHaveBeenCalledWith(); // no error arg = success
```

## Frontend — resetting Zustand stores between tests

Always reset store state in `beforeEach` to prevent test pollution:

```ts
beforeEach(() => {
  usePlayerStore.setState({
    nowPlaying: null, isPlaying: false, volume: 50, progress: 0, partyMode: false,
  });
  useQueueStore.setState({ tracks: [], userStatus: null });
});
```

## Frontend — mocking `next/image`

Add per test file (or globally in `src/test/setup.ts` if needed everywhere):

```ts
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));
```

## Frontend — mocking axios for component tests

```ts
const mocks = vi.hoisted(() => ({
  post: vi.fn().mockResolvedValue({}),
  put: vi.fn().mockResolvedValue({}),
}));

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mocks) },
}));
```

The component calls `axios.create()` at module scope — `vi.hoisted` ensures the mock is in place before the module initialises.

## Frontend — debounce testing in SearchBar

`SearchBar` debounces search by 300ms via `setTimeout`. Use fake timers + `act`:

```ts
vi.useFakeTimers();
render(<SearchBar onResults={vi.fn()} onLoading={vi.fn()} />);
fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'test' } });
await act(async () => { vi.advanceTimersByTime(300); });
expect(mockGet).toHaveBeenCalled();
vi.useRealTimers();
```

## Frontend — mocking `socket.io-client`

```ts
const mocks = vi.hoisted(() => ({
  on: vi.fn(),
  disconnect: vi.fn(),
  io: vi.fn(),
}));

vi.mock('socket.io-client', () => ({ io: mocks.io }));

mocks.io.mockReturnValue({ on: mocks.on, disconnect: mocks.disconnect });
```

## Frontend test setup (`src/test/setup.ts`)

Loaded automatically before every test file (configured in `vitest.config.ts`).  
Sets `@testing-library/jest-dom` matchers and env vars:

```ts
import '@testing-library/jest-dom';
process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:3001';
process.env.NEXT_PUBLIC_SOCKET_URL = 'http://localhost:3001';
```

## Vitest config — path aliases

Both `backend/vitest.config.ts` and `frontend/vitest.config.ts` define the `@jukebox/shared` alias pointing directly to the TypeScript source (not the compiled output). This means tests do not require `npm run build --workspace=shared` before running.

```ts
resolve: {
  alias: {
    '@jukebox/shared': path.resolve(__dirname, '../shared/types/index.ts'),
  },
},
```
