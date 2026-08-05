# DayPilot API — production image
# Build: docker build -t daypilot-api -f apps/api/Dockerfile .
# Run:   docker run -p 3001:3001 --env-file .env daypilot-api

# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api ./apps/api/
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

RUN pnpm exec prisma generate --schema=prisma/schema.prisma
RUN pnpm run build --filter @daypilot/api

# --- Run stage ---
# Fresh npm install of production deps (avoids broken pnpm symlink trees in Alpine)
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/apps/api/src/generated ./src/generated
COPY --from=builder /app/apps/api/scripts/start.sh ./start.sh
RUN chmod +x /app/start.sh

# Install only production dependencies into a flat node_modules
RUN npm install --omit=dev --no-package-lock \
  && npx prisma generate --schema=prisma/schema.prisma

EXPOSE 3001

CMD ["/app/start.sh"]
