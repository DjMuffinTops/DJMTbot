# Multi-stage build for DJMTbot Discord bot

# Stage 1: Build stage
FROM node:24.13.1-alpine AS builder

# Install FFmpeg, build tools, and opus development libraries for native modules
RUN apk add --no-cache ffmpeg python3 make g++

# Install pnpm
RUN corepack enable pnpm

# Set working directory
WORKDIR /app

# Copy package files, config, and tsconfig (needed for prepare script)
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Copy source code (needed for prepare script compilation)
COPY json ./json
COPY src ./src

# Install dependencies and build native modules.
# Needs to run run install in @discordjs/opus to trigger node-gyp build of native bindings,
# due to a 404 error when pnpm tries to fetch prebuilt binaries for the current platform.
RUN pnpm install --frozen-lockfile && \
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
    chown -R djmtbot:djmtbot /app

# Switch to non-root user
USER djmtbot

# Set environment variables
ENV NODE_ENV=production

# Expose port for Express (if used)
EXPOSE 3000

# Start the bot
CMD ["node", "--trace-warnings", "dist/app.js"]
