#!/bin/bash

# Health check script for PyloMarket services

set -e

WEB_URL="${WEB_URL:-http://localhost:3000}"
HARPERDB_URL="${HARPERDB_URL:-http://localhost:9925}"
MAX_RETRIES=5
RETRY_DELAY=5

check_service() {
  local service_name=$1
  local url=$2
  local retries=0
  
  echo "Checking $service_name at $url..."
  
  while [ $retries -lt $MAX_RETRIES ]; do
    if curl -f -s "$url" > /dev/null 2>&1; then
      echo "✅ $service_name is healthy"
      return 0
    fi
    
    retries=$((retries + 1))
    if [ $retries -lt $MAX_RETRIES ]; then
      echo "⏳ $service_name not ready, retrying... ($retries/$MAX_RETRIES)"
      sleep $RETRY_DELAY
    fi
  done
  
  echo "❌ $service_name health check failed after $MAX_RETRIES attempts"
  return 1
}

# Check HarperDB
check_service "HarperDB" "$HARPERDB_URL" || exit 1

# Check Web Application
check_service "Web Application" "$WEB_URL/api/health" || exit 1

echo "✅ All services are healthy!"
