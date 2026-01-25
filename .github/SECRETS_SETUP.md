# GitHub Secrets Setup Guide

This guide explains how to configure GitHub Secrets for CI/CD deployment.

## GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### Required Secrets

These secrets must be set for the deployment to work.

### 1. DOCR_REGISTRY_NAME

**Description**: Name of your Digital Ocean Container Registry

**How to get**:
1. Go to Digital Ocean → Container Registry
2. Create a new registry (if you haven't already)
3. The registry name is shown in the registry URL: `registry.digitalocean.com/<registry-name>`

**Example values**:
- `pylomarket`
- `my-registry`
- `production-registry`

### 2. DOCR_USERNAME

**Description**: Digital Ocean API token username (usually your DO username or token name)

**How to get**:
1. Go to Digital Ocean → API → Tokens/Keys
2. Generate a new Personal Access Token with read/write permissions for Container Registry
3. The username is usually your Digital Ocean account username

**Example values**:
- Your DO username
- Token name you created

### 3. DOCR_PASSWORD

**Description**: Digital Ocean API token (Personal Access Token)

**How to generate**:
1. Go to Digital Ocean → API → Tokens/Keys
2. Click "Generate New Token"
3. Give it a name (e.g., "github-actions-docr")
4. Select "Write" scope for Container Registry
5. Copy the token immediately (you won't see it again)

**Value**: The generated token (long string)

**Security**: Keep this token secure and never commit it to the repository

### 4. VPS_SSH_PRIVATE_KEY

**Description**: Private SSH key to access your VPS server

**How to generate**:
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy

# Copy the private key content
cat ~/.ssh/github_actions_deploy

# Add the public key to VPS
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-vps-ip
```

**Value**: Content of the private key file (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`)

### 5. HARPERDB_USERNAME

**Description**: HarperDB admin username

**Example values**:
- `HDB_ADMIN`
- `admin`
- Custom username

### 6. HARPERDB_PASSWORD

**Description**: HarperDB admin password

**Security**: Use a strong password. Keep this secure and never commit it to the repository.

### 7. JWT_SECRET

**Description**: Secret key for JWT token generation

**How to generate**:
```bash
# Generate a random secret (32+ characters recommended)
openssl rand -base64 32
```

**Security**: Use a strong, random secret. Keep this secure and never commit it to the repository.

## Optional Secrets

These secrets have default values and are only needed if you want to override the defaults.

### 8. SOLANA_RPC_URL (Optional)

**Description**: Solana RPC endpoint URL

**Default**: `https://api.devnet.solana.com` (if not set)

**Example values**:
- `https://api.devnet.solana.com` (default - devnet)
- `https://api.mainnet-beta.solana.com` (mainnet)
- Custom RPC endpoint

### 9. NEXT_PUBLIC_SOLANA_NETWORK (Optional)

**Description**: Solana network identifier

**Default**: `devnet` (if not set)

**Example values**:
- `devnet` (default)
- `mainnet-beta`
- `testnet`

### 10. VPS_HOST (Optional - for backward compatibility)

**Description**: IP address or domain name of your VPS (legacy, nodes are now defined in workflow file)

**Note**: Node IPs are now defined directly in `.github/workflows/deploy.yml`. This secret is kept for backward compatibility.

### 11. VPS_USER (Optional)

**Description**: SSH username for VPS access (shared across all nodes)

**Default**: `root` (if not set)

**Common values**:
- `root` (default)
- `ubuntu` (for Ubuntu servers)
- `debian` (for Debian servers)
- Custom user you created

**Note**: 
- This username is used for all nodes. All nodes should have the same SSH user.
- If you're using the default `root` user, you don't need to set this secret.

### 12. VPS_DEPLOY_PATH (Optional - No longer needed)

**Description**: ~~Path on VPS where the application will be deployed~~ (Deprecated)

**Note**: This secret is no longer needed as we use `docker run` directly without requiring a deployment directory. Kept for backward compatibility only.

**Description**: Path on VPS where the application will be deployed

**Default**: `/opt/pylomarket` (if not set)

**Example values**:
- `/opt/pylomarket` (default)
- `/home/user/pylomarket`
- `/var/www/pylomarket`

**Note**: 
- This directory should:
  - Be owned by the VPS_USER
  - Have git repository initialized
  - Have write permissions
- If you're using the default path `/opt/pylomarket`, you don't need to set this secret.

## Node Configuration

**Node IPs are defined directly in `.github/workflows/deploy.yml`:**

- **Primary Node**: `68.183.184.199` (defined in workflow)
- **Replica Nodes**: To add, uncomment the `deploy-replicas` job and add nodes to the matrix

**To add more nodes:**
1. Edit `.github/workflows/deploy.yml`
2. Uncomment `deploy-replicas` job
3. Add nodes to the matrix:
   ```yaml
   strategy:
     matrix:
       node:
         - { host: "REPLICA_IP_1", role: "replica" }
         - { host: "REPLICA_IP_2", role: "replica" }
   ```

## Optional Secrets (for advanced setup)

### VPS_SSH_PORT

**Description**: Custom SSH port (if not using default port 22)

**Default**: 22

## VPS Setup

### Install Docker on VPS

Before deploying, ensure Docker and Docker Compose are installed on your VPS:

```bash
# Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# Review the script (dry-run to see what will be installed)
sudo sh ./get-docker.sh --dry-run

# Install Docker (remove --dry-run to actually install)
sudo sh ./get-docker.sh

# Add your user to docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Install Docker Compose (if not included)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Log out and back in for group changes to take effect
```

**Note**: After adding user to docker group, you need to log out and log back in for the changes to take effect.

### Install Git on VPS

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install git -y

# CentOS/RHEL
sudo yum install git -y
```

### Create .env.production (Optional - if not using GitHub Secrets)

**Note**: If you prefer to store environment variables on the VPS instead of GitHub Secrets, you can create a `.env.production` file. However, it's recommended to use GitHub Secrets for better security.

If you choose to use `.env.production`:
```bash
# Create .env.production file (optional)
sudo mkdir -p /opt/pylomarket
cd /opt/pylomarket
nano .env.production

# Add required variables:
# HARPERDB_USERNAME=your_username
# HARPERDB_PASSWORD=your_password
# JWT_SECRET=your_jwt_secret
# SOLANA_RPC_URL=https://api.devnet.solana.com
# NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

**However**, the current workflow passes environment variables directly from GitHub Secrets, so `.env.production` is **not required**.

## Setup Steps

1. **Install Docker on VPS** (see VPS Setup section above)

2. **Generate SSH Key Pair** (if you haven't already):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-pylomarket"
   ```

3. **Add Public Key to VPS**:
   ```bash
   ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-vps-ip
   ```

4. **Test SSH Connection**:
   ```bash
   ssh -i ~/.ssh/github_actions_deploy user@your-vps-ip
   ```

5. **Add Secrets to GitHub**:
   - Go to repository Settings → Secrets and variables → Actions
   - Add each secret one by one
   - Use descriptive names exactly as listed above
   - **Required secrets**: `DOCR_REGISTRY_NAME`, `DOCR_USERNAME`, `DOCR_PASSWORD`, `VPS_SSH_PRIVATE_KEY`, `HARPERDB_USERNAME`, `HARPERDB_PASSWORD`, `JWT_SECRET`

6. **Verify Setup**:
   - Push a commit to `main` branch
   - Check Actions tab in GitHub to see if deployment runs

## Security Best Practices

- ✅ Never commit private keys to repository
- ✅ Use separate SSH key for GitHub Actions (not your personal key)
- ✅ Rotate keys periodically
- ✅ Use strong passwords for VPS user accounts
- ✅ Limit SSH access to specific IPs if possible
- ✅ Use SSH key authentication instead of password authentication

## Troubleshooting

### SSH Connection Fails

1. Check if public key is added to VPS:
   ```bash
   cat ~/.ssh/authorized_keys
   ```

2. Verify SSH service is running:
   ```bash
   sudo systemctl status ssh
   ```

3. Check firewall settings:
   ```bash
   sudo ufw status
   ```

### Permission Denied

1. Ensure VPS_USER has write access to VPS_DEPLOY_PATH:
   ```bash
   sudo chown -R $VPS_USER:$VPS_USER /opt/pylomarket
   ```

2. Check file permissions:
   ```bash
   ls -la /opt/pylomarket
   ```

### Deployment Fails

1. Check GitHub Actions logs for specific errors
2. Verify all secrets are set correctly
3. Test SSH connection manually from your local machine
4. Check VPS disk space: `df -h`
5. Verify Docker is installed and running on VPS
