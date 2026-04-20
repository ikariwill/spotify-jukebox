FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:3001
ARG NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:3001
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY shared/ ./shared/
COPY frontend/ ./frontend/
RUN mkdir -p frontend/public
RUN pnpm --filter @jukebox/shared build
RUN pnpm --filter @jukebox/frontend build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/next.config.mjs ./frontend/next.config.mjs
EXPOSE 3000
CMD ["pnpm", "--filter", "@jukebox/frontend", "start"]
