# GitHub Secrets Setup Guide

This guide explains how to configure GitHub Secrets for CI/CD deployment.

## Required GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

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

### 2. VPS_HOST

**Description**: IP address or domain name of your VPS

**Example values**:
- `123.456.789.0` (IP address)
- `pylomarket.com` (domain name)
- `vps.example.com` (subdomain)

### 3. VPS_USER

**Description**: SSH username for VPS access

**Common values**:
- `root`
- `ubuntu` (for Ubuntu servers)
- `debian` (for Debian servers)
- Custom user you created

### 4. VPS_DEPLOY_PATH

**Description**: Path on VPS where the application will be deployed

**Example values**:
- `/opt/pylomarket`
- `/home/user/pylomarket`
- `/var/www/pylomarket`

**Note**: This directory should:
- Be owned by the VPS_USER
- Have git repository initialized
- Have write permissions

## Optional Secrets (for advanced setup)

### VPS_SSH_PORT

**Description**: Custom SSH port (if not using default port 22)

**Default**: 22

## Setup Steps

1. **Generate SSH Key Pair** (if you haven't already):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-pylomarket"
   ```

2. **Add Public Key to VPS**:
   ```bash
   ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-vps-ip
   ```

3. **Test SSH Connection**:
   ```bash
   ssh -i ~/.ssh/github_actions_deploy user@your-vps-ip
   ```

4. **Add Secrets to GitHub**:
   - Go to repository Settings → Secrets and variables → Actions
   - Add each secret one by one
   - Use descriptive names exactly as listed above

5. **Verify Setup**:
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
