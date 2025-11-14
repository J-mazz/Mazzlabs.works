#!/bin/bash
# Script to reset mail server passwords and fix bugs
# Run this on the Azure VM via Bastion

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}MazzLabs Mail Server - Password Reset & Bug Fix${NC}"
echo "=================================================="
echo ""

# Database path
DB_PATH="/opt/mazzlabs-mail/data/mail.db"

# New password hash for: D3Kry97!D
PASSWORD_HASH='$2b$10$EYwM1l88Wy.wfJIqj3G5aOMu85vWkGlCD9iNq72WQ.yLUenYtNDbe'

echo -e "${BLUE}Step 1: Checking database...${NC}"
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}ERROR: Database not found at $DB_PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database found${NC}"
echo ""

echo -e "${BLUE}Step 2: Listing current users...${NC}"
sqlite3 "$DB_PATH" "SELECT id, email, created_at FROM users;"
echo ""

echo -e "${BLUE}Step 3: Resetting password for admin@mazzlabs.works...${NC}"
sqlite3 "$DB_PATH" "UPDATE users SET password = '$PASSWORD_HASH' WHERE email = 'admin@mazzlabs.works';"
ROWS_UPDATED=$(sqlite3 "$DB_PATH" "SELECT changes();")
if [ "$ROWS_UPDATED" -eq "1" ]; then
    echo -e "${GREEN}✓ admin@mazzlabs.works password updated${NC}"
else
    echo -e "${RED}✗ Failed to update admin@mazzlabs.works (user may not exist)${NC}"
fi
echo ""

echo -e "${BLUE}Step 4: Resetting password for joseph@mazzlabs.works...${NC}"
sqlite3 "$DB_PATH" "UPDATE users SET password = '$PASSWORD_HASH' WHERE email = 'joseph@mazzlabs.works';"
ROWS_UPDATED=$(sqlite3 "$DB_PATH" "SELECT changes();")
if [ "$ROWS_UPDATED" -eq "1" ]; then
    echo -e "${GREEN}✓ joseph@mazzlabs.works password updated${NC}"
else
    echo -e "${RED}✗ Failed to update joseph@mazzlabs.works (user may not exist)${NC}"
fi
echo ""

echo -e "${BLUE}Step 5: Verifying password hashes...${NC}"
echo "admin@mazzlabs.works:"
sqlite3 "$DB_PATH" "SELECT substr(password, 1, 20) || '...' FROM users WHERE email = 'admin@mazzlabs.works';"
echo "joseph@mazzlabs.works:"
sqlite3 "$DB_PATH" "SELECT substr(password, 1, 20) || '...' FROM users WHERE email = 'joseph@mazzlabs.works';"
echo ""

echo -e "${BLUE}Step 6: Checking for storeEmail bug in api/server.js...${NC}"
API_SERVER="/opt/mazzlabs-mail/src/api/server.js"
if grep -q "this.emailManager.storeEmail(emailData)" "$API_SERVER"; then
    echo -e "${RED}⚠ Bug found! The API uses storeEmail() which doesn't exist${NC}"
    echo "Location: src/api/server.js around line 381"
    echo "This needs to be fixed manually - see below"
else
    echo -e "${GREEN}✓ No storeEmail bug detected (may already be fixed)${NC}"
fi
echo ""

echo -e "${BLUE}Step 7: Checking database integrity...${NC}"
INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;")
if [ "$INTEGRITY" == "ok" ]; then
    echo -e "${GREEN}✓ Database integrity OK${NC}"
else
    echo -e "${RED}✗ Database integrity issues detected:${NC}"
    echo "$INTEGRITY"
fi
echo ""

echo -e "${BLUE}Step 8: Checking WAL mode...${NC}"
WAL_MODE=$(sqlite3 "$DB_PATH" "PRAGMA journal_mode;")
echo "Journal mode: $WAL_MODE"
if [ "$WAL_MODE" == "wal" ]; then
    echo -e "${GREEN}✓ WAL mode is enabled (good for concurrent access)${NC}"
fi
echo ""

echo "=================================================="
echo -e "${GREEN}Password reset complete!${NC}"
echo ""
echo "New password for both accounts: D3Kry97!D"
echo ""
echo "Next steps:"
echo "1. Test login at http://mail.mazzlabs.works:3000"
echo "2. If storeEmail bug was found, we need to deploy the fix"
echo "3. Consider restarting the mail service: sudo systemctl restart mazzlabs-mail"
echo ""
