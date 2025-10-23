#!/bin/bash

# Comprehensive Azure Mail Server Setup Script
# This script runs remotely on the Azure VM using az vm run-command

set -e

echo "=========================================="
echo "MazzLabs Mail Server - Remote Setup"
echo "=========================================="

# Update system
echo "1. Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "2. Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install build tools and dependencies
echo "3. Installing build tools..."
sudo apt install -y build-essential python3-dev git certbot

# Install PM2
echo "4. Installing PM2..."
sudo npm install -g pm2

# Create application directory
echo "5. Creating application directory..."
sudo mkdir -p /opt/mazzlabs-mail
sudo chown azureuser:azureuser /opt/mazzlabs-mail
cd /opt/mazzlabs-mail

# Create directory structure
mkdir -p data/emails
mkdir -p logs

echo "6. Application directory ready at /opt/mazzlabs-mail"
echo "Next: Upload application files using SCP or Azure CLI"

# Verify installations
echo ""
echo "Installed versions:"
node --version
npm --version
pm2 --version
certbot --version

echo ""
echo "=========================================="
echo "Setup Phase 1 Complete!"
echo "=========================================="
echo ""
echo "Server IP: 172.206.209.246"
echo "Next steps:"
echo "1. Upload application files to /opt/mazzlabs-mail"
echo "2. Run setup-application.sh for phase 2"
