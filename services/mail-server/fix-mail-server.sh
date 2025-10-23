#!/bin/bash

# Mail Server Diagnostic and Fix Script
# This script diagnoses and fixes common mail server issues

set -e

echo "==========================================="
echo "Mail Server Diagnostic and Fix Script"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if service exists
echo "1. Checking if mazzlabs-mail service exists..."
if systemctl list-unit-files | grep -q mazzlabs-mail; then
    echo -e "${GREEN}✓${NC} Service file exists"
else
    echo -e "${RED}✗${NC} Service file does not exist"
    exit 1
fi

# 2. Check service status
echo ""
echo "2. Checking service status..."
systemctl status mazzlabs-mail --no-pager || true

# 3. Check if application files exist
echo ""
echo "3. Checking application files..."
if [ -d "/opt/mazzlabs-mail" ]; then
    echo -e "${GREEN}✓${NC} Application directory exists"
    ls -la /opt/mazzlabs-mail/ | head -20
else
    echo -e "${RED}✗${NC} Application directory missing"
    exit 1
fi

# 4. Check environment file
echo ""
echo "4. Checking environment configuration..."
if [ -f "/opt/mazzlabs-mail/.env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    echo "Environment variables (sensitive values hidden):"
    cat /opt/mazzlabs-mail/.env | sed 's/=.*/=***/' | head -20
else
    echo -e "${YELLOW}!${NC} .env file missing"
fi

# 5. Check Node.js and dependencies
echo ""
echo "5. Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not installed"
    exit 1
fi

echo ""
echo "6. Checking node_modules..."
if [ -d "/opt/mazzlabs-mail/node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
else
    echo -e "${YELLOW}!${NC} node_modules missing - installing..."
    cd /opt/mazzlabs-mail
    npm install
fi

# 7. Check listening ports
echo ""
echo "7. Checking listening ports..."
echo "Ports that should be listening: 25, 465, 587, 993, 3000"
sudo ss -tlnp | grep -E ':(25|465|587|993|3000)' || echo -e "${YELLOW}!${NC} No mail ports listening"

# 8. Check recent logs
echo ""
echo "8. Recent service logs (last 30 lines)..."
sudo journalctl -u mazzlabs-mail -n 30 --no-pager || true

# 9. Try to start the service
echo ""
echo "9. Attempting to start service..."
sudo systemctl stop mazzlabs-mail || true
sleep 2
sudo systemctl start mazzlabs-mail
sleep 3

# 10. Final status check
echo ""
echo "10. Final status check..."
systemctl status mazzlabs-mail --no-pager || true

echo ""
echo "11. Final port check..."
sudo ss -tlnp | grep -E ':(25|465|587|993|3000)' || echo -e "${RED}✗${NC} Ports still not listening"

echo ""
echo "==========================================="
echo "Diagnostic Complete"
echo "==========================================="
