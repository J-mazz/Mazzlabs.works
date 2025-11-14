#!/bin/bash
# Script to deploy mail server fixes to Azure
# Run this on the Azure VM via Bastion AFTER running reset-mail-passwords.sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}MazzLabs Mail Server - Deploy Bug Fixes${NC}"
echo "=================================================="
echo ""

APP_DIR="/opt/mazzlabs-mail"
BACKUP_DIR="/opt/mazzlabs-mail-backup-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}Step 1: Creating backup...${NC}"
sudo cp -r "$APP_DIR" "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup created at: $BACKUP_DIR${NC}"
echo ""

echo -e "${BLUE}Step 2: Stopping mail service...${NC}"
sudo systemctl stop mazzlabs-mail
echo -e "${GREEN}✓ Service stopped${NC}"
echo ""

echo -e "${BLUE}Step 3: Fixing storeEmail bug in api/server.js...${NC}"
API_FILE="$APP_DIR/src/api/server.js"

# Check if bug exists
if grep -q "this.emailManager.storeEmail(emailData)" "$API_FILE"; then
    echo -e "${YELLOW}Found the bug - fixing now...${NC}"

    # Create a backup of the file
    cp "$API_FILE" "$API_FILE.bak"

    # Fix the bug
    sed -i 's/this\.emailManager\.storeEmail(emailData);/this.emailManager.saveEmail(req.user.id, emailData);/' "$API_FILE"

    # Verify the fix
    if grep -q "this.emailManager.saveEmail(req.user.id, emailData);" "$API_FILE"; then
        echo -e "${GREEN}✓ Bug fixed successfully!${NC}"
        echo "Changed: this.emailManager.storeEmail(emailData)"
        echo "To:      this.emailManager.saveEmail(req.user.id, emailData)"
    else
        echo -e "${RED}✗ Fix failed - restoring backup${NC}"
        mv "$API_FILE.bak" "$API_FILE"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Bug not found (may already be fixed)${NC}"
fi
echo ""

echo -e "${BLUE}Step 4: Checking for other potential issues...${NC}"

# Check if database file exists and has proper permissions
DB_FILE="$APP_DIR/data/mail.db"
if [ -f "$DB_FILE" ]; then
    echo -e "${GREEN}✓ Database file exists${NC}"
    echo "  Permissions: $(ls -l $DB_FILE | awk '{print $1, $3, $4}')"

    # Check if WAL files exist (indication of WAL mode)
    if [ -f "$DB_FILE-wal" ]; then
        echo -e "${GREEN}✓ WAL file exists (database using WAL mode)${NC}"
    fi
else
    echo -e "${RED}✗ Database file not found!${NC}"
fi
echo ""

echo -e "${BLUE}Step 5: Starting mail service...${NC}"
sudo systemctl start mazzlabs-mail
sleep 3
echo ""

echo -e "${BLUE}Step 6: Checking service status...${NC}"
if sudo systemctl is-active --quiet mazzlabs-mail; then
    echo -e "${GREEN}✓ Mail service is running${NC}"
    sudo systemctl status mazzlabs-mail --no-pager -l
else
    echo -e "${RED}✗ Mail service failed to start!${NC}"
    echo ""
    echo "Last 20 log lines:"
    sudo journalctl -u mazzlabs-mail -n 20 --no-pager
    echo ""
    echo -e "${YELLOW}Restoring from backup...${NC}"
    sudo systemctl stop mazzlabs-mail
    sudo rm -rf "$APP_DIR"
    sudo mv "$BACKUP_DIR" "$APP_DIR"
    sudo systemctl start mazzlabs-mail
    exit 1
fi
echo ""

echo "=================================================="
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Summary of changes:"
echo "✓ Fixed storeEmail() bug → saveEmail() in api/server.js"
echo "✓ Service restarted and running"
echo ""
echo "Next steps:"
echo "1. Test login at http://mail.mazzlabs.works:3000"
echo "   - Email: admin@mazzlabs.works or joseph@mazzlabs.works"
echo "   - Password: D3Kry97!D"
echo ""
echo "2. Send a test email to verify the fix"
echo ""
echo "3. Monitor logs: sudo journalctl -u mazzlabs-mail -f"
echo ""
echo "If issues occur, restore backup with:"
echo "  sudo systemctl stop mazzlabs-mail"
echo "  sudo rm -rf $APP_DIR"
echo "  sudo mv $BACKUP_DIR $APP_DIR"
echo "  sudo systemctl start mazzlabs-mail"
echo ""
