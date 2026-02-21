# DayPilot API — production image
# Build: docker build -t daypilot-api -f apps/api/Dockerfile .
# Run:   docker run -p 3001:3001 --env-file .env daypilot-api

# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Copy workspace config, API app, and Prisma
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api ./apps/api/
COPY prisma ./prisma/

# Install deps (API + Prisma at root)
RUN pnpm install --frozen-lockfile

# Generate Prisma client and build API
RUN pnpm exec prisma generate --schema=prisma/schema.prisma
RUN pnpm run build --filter @daypilot/api

# --- Run stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy built API and runtime deps
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/apps/api/src/generated ./src/generated

# Prisma client lives in apps/api/src/generated; runtime needs it
RUN ls -la src/generated 2>/dev/null || true

EXPOSE 3001

CMD ["node", "dist/main.js"]
