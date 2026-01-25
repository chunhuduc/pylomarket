#!/bin/bash
# Setup Docker and Docker Compose on VPS
# This script checks if Docker/Docker Compose are installed and installs them if missing

set -e

echo "🐳 Checking Docker installation..."

# Check and install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "📦 Docker not found. Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh ./get-docker.sh
  rm get-docker.sh
  
  # Add user to docker group if not already added
  if ! groups | grep -q docker; then
    sudo usermod -aG docker $USER
    echo "⚠️  User added to docker group. You may need to log out and back in for this to take effect."
  fi
  
  # Start Docker service
  sudo systemctl start docker
  sudo systemctl enable docker
  
  echo "✅ Docker installed successfully"
else
  echo "✅ Docker is already installed"
  docker --version
fi

# Check and install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
  echo "📦 Docker Compose not found. Installing Docker Compose..."
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  echo "✅ Docker Compose installed successfully"
else
  echo "✅ Docker Compose is already installed"
  docker-compose --version
fi
