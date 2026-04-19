export const config = {
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI ?? 'http://localhost:3001/auth/callback',
    scopes: [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
    ].join(' '),
  },
  session: {
    secret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-production',
    maxAge: 24 * 60 * 60 * 1000,
  },
  server: {
    port: parseInt(process.env.PORT ?? '3001', 10),
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },
  queue: {
    maxSongsPerUser: parseInt(process.env.MAX_SONGS_PER_USER ?? '3', 10),
    cooldownMs: parseInt(process.env.COOLDOWN_MS ?? '30000', 10),
  },
  redis: {
    url: process.env.REDIS_URL,
  },
} as const;
