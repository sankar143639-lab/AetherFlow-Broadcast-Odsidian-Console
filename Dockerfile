# syntax=docker/dockerfile:1.4
# Multi-Stage Production Dockerfile for Cloud-Native Media Processing Pipeline
# Incorporates Node.js 22 LTS, FFmpeg 6.1 binary with libx264/libx265, and minimal footprint

# -------------------------------------------------------------
# STAGE 1: Dependency Installation & TypeScript Compilation
# -------------------------------------------------------------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies required for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Generate Prisma Client & compile Next.js / Vite assets
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi
RUN npm run build

# Prune devDependencies for minimal runtime image
RUN npm prune --production

# -------------------------------------------------------------
# STAGE 2: Production Worker & Application Runtime
# -------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install FFmpeg with full codec libraries (libx264, libx265, libvpx, libopus, aac)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
    && ffmpeg -version \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and media scratch buffer directory
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/sh -m appuser && \
    mkdir -p /tmp/transcode-scratch && \
    chown -R appuser:nodejs /tmp/transcode-scratch /app

# Copy production artifacts from builder stage
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=appuser:nodejs /app/lib ./lib
COPY --from=builder --chown=appuser:nodejs /app/worker ./worker

USER appuser

EXPOSE 3000

# Docker healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.js"]
