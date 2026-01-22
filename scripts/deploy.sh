#!/bin/bash

# PyloMarket Deployment Script
# This script is run on the VPS server

set -e  # Exit on error

DEPLOY_PATH="${VPS_DEPLOY_PATH:-/opt/pylomarket}"
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Starting deployment..."

# Navigate to deployment directory
cd "$DEPLOY_PATH" || {
  echo "❌ Error: Cannot access deployment directory: $DEPLOY_PATH"
  exit 1
}

# Pull latest code
echo "📥 Pulling latest code..."
git fetch origin main
git reset --hard origin/main

# Check if .env.production exists
if [ ! -f .env.production ]; then
  echo "⚠️  Warning: .env.production not found!"
  echo "   Please create it with required environment variables."
  exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Backup current deployment (optional)
if [ -d ".backup" ]; then
  echo "💾 Creating backup..."
  mkdir -p .backup
  cp docker-compose.prod.yml .backup/ 2>/dev/null || true
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down || true

# Build new images
echo "🔨 Building Docker images..."
docker-compose -f "$COMPOSE_FILE" build --no-cache

# Start containers
echo "▶️  Starting containers..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Health check
echo "🏥 Performing health check..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Health check passed!"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "⏳ Health check failed, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
  else
    echo "❌ Health check failed after $MAX_RETRIES attempts"
    echo "🔄 Rolling back..."
    docker-compose -f "$COMPOSE_FILE" down
    exit 1
  fi
done

# Clean up old images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

# Show running containers
echo "📊 Running containers:"
docker-compose -f "$COMPOSE_FILE" ps

echo "✅ Deployment completed successfully!"
echo "🌐 Application should be available at: http://$(hostname -I | awk '{print $1}'):3000"
