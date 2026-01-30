# GitHub Secrets & Variables Setup Guide

This guide explains how to configure GitHub Secrets and Variables for CI/CD deployment using GitHub Environments.

## GitHub Environments

The project uses **GitHub Environments** to manage environment-specific secrets and variables. This allows for better organization and protection rules.

### Setting Up Production Environment

1. Go to your GitHub repository → **Settings** → **Environments**
2. Click **New environment** → Name it `production`
3. Configure **Secrets** (sensitive data) and **Variables** (non-sensitive configuration)

**Note**: Repository-level secrets can still be used, but environment secrets take precedence when an environment is specified in the workflow.

## Secrets vs Variables

- **Secrets**: Sensitive data (passwords, private keys, tokens) - values are hidden
- **Variables**: Non-sensitive configuration (URLs, ports, network names) - values are visible

The workflow automatically uses:
- `secrets.SECRET_NAME` for secrets (prioritizes environment secrets)
- `vars.VARIABLE_NAME` for environment variables

## Required Secrets

These secrets must be set for the deployment to work.

### 1. VPS_SSH_PRIVATE_KEY

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

**Security**: Keep this key secure and never commit it to the repository

### 2. DOCR_REGISTRY_NAME

**Description**: Name of your Digital Ocean Container Registry

**How to get**:
1. Go to Digital Ocean → Container Registry
2. Create a new registry (if you haven't already)
3. The registry name is shown in the registry URL: `registry.digitalocean.com/<registry-name>`

**Example values**:
- `pylomarket`
- `my-registry`
- `production-registry`

### 3. DOCR_USERNAME

**Description**: Digital Ocean API token username (usually your DO username or token name)

**How to get**:
1. Go to Digital Ocean → API → Tokens/Keys
2. Generate a new Personal Access Token with read/write permissions for Container Registry
3. The username is usually your Digital Ocean account username

**Example values**:
- Your DO username
- Token name you created

### 4. DOCR_PASSWORD

**Description**: Digital Ocean API token (Personal Access Token)

**How to generate**:
1. Go to Digital Ocean → API → Tokens/Keys
2. Click "Generate New Token"
3. Give it a name (e.g., "github-actions-docr")
4. Select "Write" scope for Container Registry
5. Copy the token immediately (you won't see it again)

**Value**: The generated token (long string)

**Security**: Keep this token secure and never commit it to the repository

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

**Description**: Secret key for JWT token generation and HttpOnly cookie authentication

**How to generate**:
```bash
# Generate a random secret (32+ characters recommended)
openssl rand -base64 32
```

**Security**: Use a strong, random secret. Keep this secure and never commit it to the repository.

**Note**: This secret is also used as a fallback for `ENCRYPTION_KEY` if not set separately.

### 8. HOT_WALLET_PRIVATE_KEY

**Description**: Private key of the system hot wallet for Solana transactions (withdrawals, payouts)

**Format**: Base64 encoded private key or JSON array format

**How to generate**:
```bash
# Option 1: Generate new wallet and encode private key
node -e "const { Keypair } = require('@solana/web3.js'); const kp = Keypair.generate(); console.log('Private Key (base64):', Buffer.from(kp.secretKey).toString('base64')); console.log('Public Key:', kp.publicKey.toBase58());"

# Option 2: Export existing wallet
# If you have an existing wallet, export its private key in base64 format
```

**Security**: 
- ⚠️ **CRITICAL**: This is the private key for your system's hot wallet
- Never commit this to the repository
- Store securely and rotate periodically
- Only use this wallet for system operations (withdrawals, payouts)
- Keep sufficient SOL balance for transaction fees

**Example values**:
- Base64: `AbCdEf123...` (long base64 string)
- JSON array: `[123,45,67,...]` (array of numbers)

## Optional Secrets

These secrets have default values and are only needed if you want to override the defaults.

### 9. ENCRYPTION_KEY (Optional)

**Description**: Secret key for encrypting sensitive data (e.g., user wallet private keys)

**Default**: Falls back to `JWT_SECRET` if not set

**How to generate**:
```bash
# Generate a random secret (32+ characters recommended)
openssl rand -base64 32
```

**Security**: Use a strong, random secret. If not set, `JWT_SECRET` will be used as fallback.

**Note**: This is used to encrypt user wallet private keys stored in the database. If you change this after deployment, existing encrypted data cannot be decrypted.

### 10. SOLANA_RPC_URL (Optional)

**Description**: Solana RPC endpoint URL

**Default**: `https://api.devnet.solana.com` (if not set)

**Example values**:
- `https://api.devnet.solana.com` (default - devnet)
- `https://api.mainnet-beta.solana.com` (mainnet)
- `https://solana-api.projectserum.com` (custom RPC)
- Custom RPC endpoint URL

**Note**: For production, consider using a dedicated RPC provider (e.g., QuickNode, Alchemy) for better performance and reliability.

### 11. NEXT_PUBLIC_SOLANA_NETWORK (Optional)

**Description**: Solana network identifier for client-side operations

**Default**: `devnet` (if not set)

**Example values**:
- `devnet` (default)
- `mainnet-beta`
- `testnet`

### 12. APP_PORT (Optional)

**Description**: External port to map to container's port 9926 (where Next.js app is served)

**Type**: Environment Variable (non-sensitive)

**Default**: `443` (if not set)

**Example values**:
- `443` (default - HTTPS)
- `80` (HTTP)
- `3000` (development)
- `8080` (custom)

**Note**: This allows you to expose the Next.js app on a different port than the default 9926. The container always runs on port 9926 internally, but you can map it to any external port.

**Where to set**: GitHub Environment → Variables (not Secrets)

### 13. VPS_USER (Optional - Repository Secret)

**Description**: SSH username for VPS access (shared across all nodes)

**Type**: Repository Secret (can be set at repository level)

**Default**: `root` (if not set)

**Common values**:
- `root` (default)
- `ubuntu` (for Ubuntu servers)
- `debian` (for Debian servers)
- Custom user you created

**Note**: 
- This username is used for all nodes. All nodes should have the same SSH user.
- If you're using the default `root` user, you don't need to set this secret.
- Can be set at repository level (not environment-specific)

### 14. GOOGLE_CLIENT_ID (Optional - Environment Variable)

**Description**: Google OAuth 2.0 Client ID for Google Sign-In

**Type**: Environment Variable (non-sensitive, but should be protected)

**How to get**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure OAuth consent screen
6. Add authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
7. Copy the Client ID

**Note**: Required only if you want to enable Google OAuth authentication.

**Where to set**: GitHub Environment → Variables (not Secrets)

### 15. GOOGLE_CLIENT_SECRET (Optional - Environment Secret)

**Description**: Google OAuth 2.0 Client Secret for Google Sign-In

**Type**: Environment Secret (sensitive)

**How to get**:
1. Same as above, copy the Client Secret from Google Cloud Console
2. Keep this secret secure

**Note**: Required only if you want to enable Google OAuth authentication. Must be set together with `GOOGLE_CLIENT_ID`.

**Where to set**: GitHub Environment → Secrets

### 16. SMTP_HOST (Optional - Environment Variable)

**Description**: SMTP server hostname for sending emails (OTP codes, notifications)

**Example values**:
- `smtp.gmail.com` (Gmail)
- `smtp.sendgrid.net` (SendGrid)
- `smtp.mailgun.org` (Mailgun)
- Custom SMTP server

**Note**: Required only if you want to send emails. If not set, emails will be logged to console in development.

### 17. SMTP_PORT (Optional)

**Description**: SMTP server port

**Default**: `587` (if not set)

**Common values**:
- `587` (default - STARTTLS)
- `465` (SSL/TLS)
- `25` (unencrypted, not recommended)

### 18. SMTP_SECURE (Optional)

**Description**: Whether to use SSL/TLS for SMTP connection

**Default**: `false` (if not set)

**Values**:
- `true` - Use SSL/TLS (for port 465)
- `false` - Use STARTTLS (for port 587)

### 19. SMTP_USER (Optional)

**Description**: SMTP authentication username

**Example values**:
- Your email address (for Gmail)
- SMTP username from your email provider

**Note**: Required if `SMTP_HOST` is set.

### 20. SMTP_PASS (Optional)

**Description**: SMTP authentication password or app-specific password

**Note**: 
- For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833)
- Required if `SMTP_HOST` is set.
- Keep this secure and never commit it to the repository.

### 21. SMTP_FROM (Optional)

**Description**: Email address to use as sender

**Type**: Environment Variable (non-sensitive)

**Default**: Uses `SMTP_USER` if not set

**Example values**:
- `noreply@pylomarket.com`
- `support@pylomarket.com`

**Where to set**: GitHub Environment → Variables (not Secrets)

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

## Authentication System

The application uses **HttpOnly Cookies** for authentication:

- **Security**: HttpOnly cookies prevent XSS attacks
- **Scalability**: Stateless JWT tokens work perfectly for horizontal scaling
- **Implementation**: Server Actions automatically read authentication from cookies
- **Session Duration**: 7 days (configurable in `app/lib/auth.ts`)

**No client-side token storage needed** - cookies are automatically sent with requests.

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

5. **Create Production Environment**:
   - Go to repository Settings → Environments → New environment
   - Name it `production`
   - Configure protection rules if needed (optional)

6. **Add Environment Secrets** (sensitive data):
   - In the `production` environment, go to **Secrets** section
   - Add the following **required secrets**:
     - `HARPERDB_USERNAME`
     - `HARPERDB_PASSWORD`
     - `JWT_SECRET`
     - `ENCRYPTION_KEY` (recommended for production)
     - `HOT_WALLET_PRIVATE_KEY` ⚠️ **CRITICAL**
     - `GOOGLE_CLIENT_SECRET` (if using Google OAuth)
     - `SMTP_PASS` (if using email)

7. **Add Environment Variables** (non-sensitive configuration):
   - In the `production` environment, go to **Variables** section
   - Add the following variables:
     - `SOLANA_RPC_URL` (default: `https://api.devnet.solana.com`)
     - `NEXT_PUBLIC_SOLANA_NETWORK` (default: `devnet`)
     - `GOOGLE_CLIENT_ID` (if using Google OAuth)
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_FROM` (if using email)
     - `APP_PORT` (default: `443`)

8. **Add Repository Secrets** (deployment-related, not environment-specific):
   - Go to repository Settings → Secrets and variables → Actions → New repository secret
   - Add the following secrets:
     - `VPS_SSH_PRIVATE_KEY` (SSH key for VPS access)
     - `DOCR_REGISTRY_NAME` (Digital Ocean Container Registry name)
     - `DOCR_USERNAME` (Digital Ocean username)
     - `DOCR_PASSWORD` (Digital Ocean token)
     - `VPS_USER` (optional, default: `root`)

7. **Verify Setup**:
   - Push a commit to `main` branch
   - Check Actions tab in GitHub to see if deployment runs
   - Monitor deployment logs for any errors

## Environment Variables Summary

### Required Environment Secrets (Production Environment)

These must be set in **GitHub Environment → Secrets** for the `production` environment:

```env
HARPERDB_USERNAME=<your-harperdb-username>
HARPERDB_PASSWORD=<your-harperdb-password>
JWT_SECRET=<your-jwt-secret>
ENCRYPTION_KEY=<your-encryption-key>  # Recommended, falls back to JWT_SECRET if not set
HOT_WALLET_PRIVATE_KEY=<your-hot-wallet-private-key>  # ⚠️ CRITICAL
GOOGLE_CLIENT_SECRET=<your-google-client-secret>  # If using Google OAuth
SMTP_PASS=<your-smtp-password>  # If using email
```

### Required Repository Secrets

These must be set at **Repository level** (Settings → Secrets and variables → Actions):

```env
VPS_SSH_PRIVATE_KEY=<your-ssh-private-key>
DOCR_REGISTRY_NAME=<your-registry-name>
DOCR_USERNAME=<your-docr-username>
DOCR_PASSWORD=<your-docr-token>
VPS_USER=root  # Optional, defaults to 'root'
```

### Optional Environment Variables (Production Environment)

These should be set in **GitHub Environment → Variables** for the `production` environment:

```env
# Solana Configuration (with defaults)
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Deployment
APP_PORT=443

# Google OAuth (optional)
GOOGLE_CLIENT_ID=<your-google-client-id>

# Email/SMTP (optional)
SMTP_HOST=<your-smtp-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-smtp-username>
SMTP_FROM=noreply@pylomarket.com
```

**Note**: The workflow uses `vars.VARIABLE_NAME` for environment variables and `secrets.SECRET_NAME` for secrets (which automatically prioritizes environment secrets when an environment is specified).

## Security Best Practices

- ✅ Never commit private keys to repository
- ✅ Use separate SSH key for GitHub Actions (not your personal key)
- ✅ Rotate keys periodically
- ✅ Use strong passwords for VPS user accounts
- ✅ Limit SSH access to specific IPs if possible
- ✅ Use SSH key authentication instead of password authentication
- ✅ Keep `HOT_WALLET_PRIVATE_KEY` secure - this controls system funds
- ✅ Use dedicated RPC endpoint for production (not public endpoints)
- ✅ Enable 2FA on GitHub account
- ✅ Regularly review GitHub Actions logs for suspicious activity

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

1. Ensure VPS_USER has write access to deployment directory:
   ```bash
   sudo chown -R $VPS_USER:$VPS_USER /opt/pylomarket
   ```

2. Check file permissions:
   ```bash
   ls -la /opt/pylomarket
   ```

### Deployment Fails

1. Check GitHub Actions logs for specific errors
2. Verify all required secrets are set correctly
3. Test SSH connection manually from your local machine
4. Check VPS disk space: `df -h`
5. Verify Docker is installed and running on VPS: `docker ps`
6. Check container logs: `docker logs pylomarket-app-prod`

### Hot Wallet Issues

1. Verify `HOT_WALLET_PRIVATE_KEY` is correctly formatted (base64 or JSON array)
2. Check hot wallet balance on Solana explorer
3. Ensure sufficient SOL for transaction fees
4. Verify `SOLANA_RPC_URL` is accessible and correct

### Email Not Sending

1. Verify SMTP credentials are correct
2. Check SMTP server allows connections from your VPS IP
3. For Gmail, ensure App Password is used (not regular password)
4. Check application logs for SMTP errors
5. If SMTP not configured, emails will be logged to console (development only)

## Additional Notes

- **Deployment Method**: The workflow builds Docker image in GitHub Actions, pushes to Digital Ocean Container Registry, then pulls and runs on VPS
- **Data Persistence**: HarperDB data is stored in Docker volume `pylomarket_harperdb_data`
- **Ports**: 
  - `9925` - HarperDB API (internal)
  - `9926` - Next.js application (mapped to `APP_PORT` externally)
- **Authentication**: HttpOnly cookies are used - no client-side token storage needed
- **Wallet Management**: System automatically creates encrypted wallets for users on login
