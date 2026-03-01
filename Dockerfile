# Multi-stage build for DJMTbot Discord bot

# Stage 1: Build stage
FROM node:24.13.1-alpine AS builder

# Install pnpm
RUN corepack enable pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code and configuration
COPY tsconfig.json ./
COPY json ./json
COPY src ./src

# Build TypeScript code
RUN pnpm build

# Stage 2: Production stage
FROM node:24.13.1-alpine

# Install pnpm
RUN corepack enable pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

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
