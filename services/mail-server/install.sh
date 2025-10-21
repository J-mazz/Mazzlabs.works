#!/bin/bash

# MazzLabs Mail Server Installation Script
# For Azure VM Ubuntu 22.04

set -e

echo "=================================="
echo "MazzLabs Mail Server Installation"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo "Please do not run as root. Run as regular user with sudo privileges."
   exit 1
fi

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js
echo "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools
echo "Installing build tools..."
sudo apt install -y build-essential python3-dev git

# Install PM2
echo "Installing PM2 process manager..."
sudo npm install -g pm2

# Install Certbot
echo "Installing Certbot for SSL..."
sudo apt install -y certbot

# Verify installations
echo ""
echo "Verifying installations..."
node --version
npm --version
pm2 --version
certbot --version

# Install project dependencies
echo ""
echo "Installing mail server dependencies..."
npm install

# Install client dependencies
echo "Installing client dependencies..."
cd client
npm install
cd ..

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env

    # Generate random JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s/your-super-secret-jwt-key-change-this/$JWT_SECRET/" .env

    echo "✓ .env file created with random JWT secret"
    echo "  Please edit .env and update ADMIN_PASSWORD and other settings"
else
    echo "✓ .env file already exists"
fi

# Create data directory
mkdir -p data

echo ""
echo "=================================="
echo "Installation Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file: nano .env"
echo "2. Configure DNS in Cloudflare (see CLOUDFLARE_DNS.md)"
echo "3. Setup SSL: sudo certbot certonly --standalone -d mail.mazzlabs.works"
echo "4. Build client: npm run build:client"
echo "5. Start server: npm start"
echo ""
echo "For production deployment on Azure VM, see AZURE_DEPLOYMENT.md"
echo ""
