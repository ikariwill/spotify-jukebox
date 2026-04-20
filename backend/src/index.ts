import 'dotenv/config'

import cors from 'cors'
import express from 'express'
import session from 'express-session'
import http from 'http'
import { Server } from 'socket.io'

import { config } from './config'
import { AnalyticsService } from './services/AnalyticsService'
import { AutoPlayService } from './services/AutoPlayService'
import { QueueService } from './services/QueueService'
import { RedisQueueStore } from './services/RedisQueueStore'
import { SpotifyService } from './services/SpotifyService'
import { registerSocketHandlers } from './socket/handlers'

import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@jukebox/shared";

// ── Services (exported for use in routes/middleware) ─────────────────────────
export const spotifyService = new SpotifyService();
export const queueService = new QueueService();
export const analyticsService = new AnalyticsService();

// ── Express + HTTP server ─────────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
export const io = new Server<ClientToServerEvents, ServerToClientEvents>(
  httpServer,
  {
    cors: {
      origin: config.server.frontendUrl,
      credentials: true,
    },
  },
);

// AutoPlayService needs io, so it's created after io
export const autoPlayService = new AutoPlayService(
  queueService,
  spotifyService,
  io,
);

// ── Session store (Redis if REDIS_URL set, else memory) ───────────────────────
async function buildRedis() {
  if (!config.redis.url) return null;
  try {
    const { createClient } = await import("redis" as any);
    const client = createClient({ url: config.redis.url });
    await client.connect();
    console.log("[Redis] Connected");
    return client;
  } catch (err) {
    console.warn("[Redis] Unavailable, falling back to memory:", err);
    return null;
  }
}

async function buildSessionStore(redisClient: any) {
  if (redisClient) {
    try {
      const { RedisStore } = await import("connect-redis");
      console.log("[Session] Using Redis store");
      return new RedisStore({ client: redisClient });
    } catch (err) {
      console.warn("[Session] RedisStore init failed:", err);
    }
  }
  console.log("[Session] Using MemoryStore");
  return undefined;
}

async function start() {
  const redisClient = await buildRedis();
  const store = await buildSessionStore(redisClient);

  if (redisClient) {
    const queueStore = new RedisQueueStore(redisClient);
    queueService.setStore(queueStore);
    await queueService.hydrate();
  }

  const sessionMiddleware = session({
    store,
    secret: config.session.secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : false,
      maxAge: config.session.maxAge,
      secure: process.env.NODE_ENV === "production",
    },
  });

  // ── Middleware ───────────────────────────────────────────────────────────────
  app.use(cors({ origin: config.server.frontendUrl, credentials: true }));
  app.use(express.json());
  app.use(sessionMiddleware);

  // Share express-session with Socket.IO connections
  const wrap = (middleware: any) => (socket: any, next: any) =>
    middleware(socket.request, socket.request.res ?? {}, next);
  io.use(wrap(sessionMiddleware));

  // ── Routes ───────────────────────────────────────────────────────────────────
  // Routes are imported after services are exported to avoid circular deps
  const { authRouter } = await import("./routes/auth");
  const { spotifyRouter } = await import("./routes/spotify");
  const { queueRouter } = await import("./routes/queue");
  const { analyticsRouter } = await import("./routes/analytics");
  const { adminRouter } = await import("./routes/admin");

  app.use("/auth", authRouter);
  app.use("/spotify", spotifyRouter);
  app.use("/queue", queueRouter);
  app.use("/analytics", analyticsRouter);
  app.use("/admin", adminRouter);

  // ── Socket handlers ──────────────────────────────────────────────────────────
  registerSocketHandlers(io, queueService);

  // ── Auto-play ────────────────────────────────────────────────────────────────
  autoPlayService.start();

  // ── Start server ─────────────────────────────────────────────────────────────
  httpServer.listen(config.server.port, () => {
    console.log(
      `[Server] Backend running on http://localhost:${config.server.port}`,
    );
  });
}

start().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
