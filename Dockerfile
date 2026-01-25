# Integrated Dockerfile: HarperDB + Next.js App
# Based on HarperDB official image with Next.js app built-in

# Stage 1: Build Next.js app
FROM node:20-alpine AS nextjs-builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Copy Next.js app source and config files
COPY app ./app
COPY public ./public
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY patches ./patches

# Build Next.js app
RUN npm run build

# Stage 2: Integrated HarperDB + Next.js
FROM harperdb/harperdb:latest

# Copy built Next.js app to HarperDB's app directory (if using builtin hosting)
COPY --from=nextjs-builder /app /opt/harperdb/app

# Copy HarperDB Application files (schema, resources, config)
COPY schema.graphql config.yaml /opt/harperdb/applications/pylomarket/
# resources.js is optional (commented out in config.yaml) - can be provided via volume mount
COPY seed /opt/harperdb/applications/pylomarket/seed/

# Expose ports
# 9925: HarperDB HTTP Operations API and Studio UI
# 9926: HarperDB HTTPS (where Next.js app will be served)
EXPOSE 9925 9926

# HarperDB will automatically start and serve the app from /opt/harperdb/app
# No custom startup script needed - using HarperDB's native capabilities
