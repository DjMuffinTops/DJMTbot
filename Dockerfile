# Multi-stage build for DJMTbot Discord bot

# Stage 1: Build stage
FROM node:24.13.1-alpine AS builder

# Install FFmpeg, build tools, and opus development libraries for native modules
RUN apk add --no-cache ffmpeg python3 make g++

# Install pnpm
RUN corepack enable pnpm

# Set working directory
WORKDIR /app

# Copy dependency manifests first so dependency installation remains cached
# when only application source code changes.
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Install JavaScript dependencies without lifecycle scripts. The source tree is
# copied below, so source changes do not invalidate this expensive layer.
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source and configuration after dependencies for better Docker caching.
COPY json ./json
COPY src ./src

# Build native Opus bindings explicitly. This is rerun only when the builder
# dependency layer changes or the image cache is intentionally invalidated.
RUN \
    echo "=== Building @discordjs/opus native module ===" && \
    cd node_modules/@discordjs/opus && npm run install && \
    echo "=== ✓ Opus native module built successfully ===" && \
    ls -lh $(find /app/node_modules/@discordjs/opus -name "*.node")

# Build TypeScript code
RUN pnpm build

# Stage 2: Production stage
FROM node:24.13.1-alpine

# Install FFmpeg and opus runtime library for audio processing
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy node_modules with compiled native bindings from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Copy JSON configuration files
COPY json ./json

# Create a non-root user for security
RUN addgroup -g 1001 -S djmtbot && \
    adduser -S djmtbot -u 1001 && \
    mkdir -p /app/logs && \
    chown -R djmtbot:djmtbot /app

# Switch to non-root user
USER djmtbot

# Set environment variables
ENV NODE_ENV=production

# Expose port for Express (if used)
EXPOSE 3000

# Start the bot
CMD ["node", "--trace-warnings", "dist/app.js"]
