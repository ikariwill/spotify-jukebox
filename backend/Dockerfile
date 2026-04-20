FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY shared/ ./shared/
COPY backend/ ./backend/
RUN pnpm --filter @jukebox/shared build
RUN pnpm --filter @jukebox/backend build

FROM node:24-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 3001
CMD ["node", "backend/dist/index.js"]
