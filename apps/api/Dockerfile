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
COPY packages/lib ./packages/lib/
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

# Compile shared lib to JS (package.json points at .ts for local/dev; runtime needs .js)
RUN pnpm --filter @daypilot/api exec tsc -p ../../packages/lib/tsconfig.json --noEmit false --declaration false --declarationMap false \
  && node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('packages/lib/package.json','utf8'));p.main='./dist/index.js';p.types='./dist/index.js';p.exports={'.':{require:'./dist/index.js',import:'./dist/index.js',default:'./dist/index.js'}};fs.writeFileSync('packages/lib/package.json',JSON.stringify(p,null,2)+'\n');"

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
COPY --from=builder /app/packages/lib ./packages/lib
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/apps/api/src/generated ./src/generated
COPY --from=builder /app/apps/api/scripts/start.sh ./start.sh
RUN chmod +x /app/start.sh

# workspace:* is pnpm-only; point npm at the compiled local package
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.dependencies['@daypilot/lib']='file:./packages/lib';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');"

# Install only production dependencies into a flat node_modules
RUN npm install --omit=dev --no-package-lock \
  && npx prisma generate --schema=prisma/schema.prisma

EXPOSE 3001

CMD ["/app/start.sh"]
