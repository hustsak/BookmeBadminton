# =============================================================================
# BookMeBadminton - Production Multi-Stage Dockerfile
# Optimized for Node.js 20 on Linux Alpine with Prisma & Next.js App Router
# =============================================================================

# 1. Base image with OpenSSL required by Prisma
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 2. Dependencies installation
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 3. Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set dummy DATABASE_URL during build for prisma generate & Next.js page collection
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/bookme_badminton?schema=public"

RUN npx prisma generate
RUN npm run build

# 4. Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next ./.next

USER nextjs

EXPOSE 3000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "run", "start"]
