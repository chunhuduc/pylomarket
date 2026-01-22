# PyloMarket Deployment Guide

Complete guide for deploying PyloMarket to a VPS (DigitalOcean, AWS, etc.)

## Prerequisites

- VPS with Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Domain name (optional, can use IP address)
- GitHub repository with code

## Initial VPS Setup

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (replace 'user' with your username)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 3. Install Git

```bash
sudo apt install git -y
```

### 4. Setup Firewall

```bash
# Install UFW if not already installed
sudo apt install ufw -y

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow HarperDB ports (if accessing from outside)
sudo ufw allow 9925/tcp  # HarperDB API
sudo ufw allow 9926/tcp  # HarperDB Studio

# Allow Next.js port
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 5. Setup SSH Key for GitHub Actions

```bash
# Create directory for deployment
sudo mkdir -p /opt/pylomarket
sudo chown $USER:$USER /opt/pylomarket

# Clone repository
cd /opt/pylomarket
git clone https://github.com/your-username/pylomarket.git .

# Or if using SSH:
# git clone git@github.com:your-username/pylomarket.git .
```

### 6. Setup Environment Variables

```bash
cd /opt/pylomarket

# Copy example file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

**Required variables**:
- `HARPERDB_USERNAME` - Admin username for HarperDB
- `HARPERDB_PASSWORD` - Strong password for HarperDB
- `JWT_SECRET` - Strong random string for JWT tokens
- `NEXT_PUBLIC_HARPERDB_URL` - Public URL to HarperDB (use your domain or IP)

### 7. Initialize HarperDB Schema

After first deployment, access HarperDB Studio:
- URL: `http://your-vps-ip:9926`
- Login with credentials from `.env.production`
- Create schema `pylomarket` and all tables
- See `HARPERDB_SETUP.md` for detailed instructions

## GitHub Actions Setup

### 1. Generate SSH Key for GitHub Actions

On your **local machine**:

```bash
# Generate key pair
ssh-keygen -t ed25519 -C "github-actions-pylomarket" -f ~/.ssh/github_actions_deploy

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-vps-ip

# Display private key (you'll add this to GitHub Secrets)
cat ~/.ssh/github_actions_deploy
```

### 2. Add GitHub Secrets

Go to your GitHub repository:
1. Settings → Secrets and variables → Actions
2. Add the following secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `VPS_SSH_PRIVATE_KEY` | Content of private key | SSH private key for VPS access |
| `VPS_HOST` | `123.456.789.0` or `your-domain.com` | VPS IP or domain |
| `VPS_USER` | `root` or `ubuntu` | SSH username |
| `VPS_DEPLOY_PATH` | `/opt/pylomarket` | Deployment directory path |

See `.github/SECRETS_SETUP.md` for detailed instructions.

## First Deployment

### Manual Deployment (First Time)

```bash
# SSH into VPS
ssh user@your-vps-ip

# Navigate to deployment directory
cd /opt/pylomarket

# Pull latest code
git pull origin main

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Automated Deployment

After setting up GitHub Secrets, every push to `main` branch will automatically:
1. Build Docker images
2. SSH to VPS
3. Pull latest code
4. Restart containers

## Post-Deployment

### 1. Verify Services

```bash
# Check running containers
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs

# Test health endpoint
curl http://localhost:3000/api/health
```

### 2. Setup Reverse Proxy (Optional but Recommended)

Using Nginx:

```bash
# Install Nginx
sudo apt install nginx -y

# Create config
sudo nano /etc/nginx/sites-available/pylomarket
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pylomarket /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 3. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

## Maintenance

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f harperdb
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart web
```

### Update Application

```bash
# Pull latest code
cd /opt/pylomarket
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup HarperDB Data

```bash
# Backup volume
docker run --rm -v pylomarket_harperdb_data:/data -v $(pwd):/backup alpine tar czf /backup/harperdb-backup-$(date +%Y%m%d).tar.gz /data
```

### Rollback Deployment

```bash
# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Checkout previous commit
cd /opt/pylomarket
git checkout <previous-commit-hash>

# Restart
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

### Check Resource Usage

```bash
# Docker stats
docker stats

# Disk usage
df -h
docker system df
```

### Health Checks

The application includes health check endpoint:
- `http://your-domain.com/api/health`

You can set up monitoring to check this endpoint periodically.

## Troubleshooting

### Containers Won't Start

1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verify environment variables: `cat .env.production`
3. Check disk space: `df -h`
4. Check Docker: `docker ps -a`

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :3000
sudo lsof -i :9925

# Kill process if needed
sudo kill -9 <PID>
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/pylomarket

# Fix Docker permissions
sudo usermod -aG docker $USER
# Log out and back in
```

### GitHub Actions Deployment Fails

1. Check Actions tab in GitHub for error logs
2. Verify all secrets are set correctly
3. Test SSH connection manually
4. Check VPS disk space and Docker status

## Security Checklist

- [ ] Strong passwords for all services
- [ ] SSH key authentication (disable password auth)
- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Regular backups configured
- [ ] Environment variables secured
- [ ] HarperDB Studio not exposed publicly (or use strong password)
- [ ] Regular system updates

## Support

For issues or questions:
- Check logs: `docker-compose -f docker-compose.prod.yml logs`
- Review GitHub Actions logs
- See `HARPERDB_SETUP.md` for database setup
- See `.github/SECRETS_SETUP.md` for CI/CD setup
