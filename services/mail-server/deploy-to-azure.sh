#!/bin/bash

# Azure VM Deployment Script for MazzLabs Mail Server
# Run this after SSH'ing into your Azure VM

set -e

echo "============================================"
echo "MazzLabs Mail Server - Azure VM Deployment"
echo "============================================"
echo ""

# Configuration
APP_DIR="/opt/mazzlabs-mail"
SERVICE_NAME="mazzlabs-mail"
DOMAIN="mail.mazzlabs.works"

# Check if running on Ubuntu
if [ ! -f /etc/lsb-release ]; then
    echo "Error: This script is designed for Ubuntu. Please install manually."
    exit 1
fi

# Create application directory
echo "Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy files (assumes you're running from the project directory)
echo "Copying application files..."
cp -r * $APP_DIR/
cd $APP_DIR

# Run installation script
echo "Running installation..."
bash install.sh

# Build client
echo "Building client..."
npm run build:client

# Prompt for admin password
echo ""
read -sp "Enter admin password for admin@mazzlabs.works: " ADMIN_PASSWORD
echo ""

# Update .env with admin password
sed -i "s/ADMIN_PASSWORD=changeme123/ADMIN_PASSWORD=$ADMIN_PASSWORD/" .env

# Prompt for domain (in case user wants to change)
echo ""
read -p "Enter your domain [mail.mazzlabs.works]: " USER_DOMAIN
DOMAIN=${USER_DOMAIN:-$DOMAIN}

# Setup SSL certificates
echo ""
read -p "Do you want to setup SSL certificates now? (y/n): " SETUP_SSL

if [ "$SETUP_SSL" = "y" ]; then
    echo "Setting up Let's Encrypt SSL certificates..."
    sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@mazzlabs.works || {
        echo "Warning: SSL setup failed. You may need to configure DNS first."
        echo "Run: sudo certbot certonly --standalone -d $DOMAIN"
    }

    # Set certificate paths in .env
    if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
        sed -i "s|TLS_KEY_PATH=.*|TLS_KEY_PATH=/etc/letsencrypt/live/$DOMAIN/privkey.pem|" .env
        sed -i "s|TLS_CERT_PATH=.*|TLS_CERT_PATH=/etc/letsencrypt/live/$DOMAIN/fullchain.pem|" .env

        # Fix permissions
        sudo chmod 755 /etc/letsencrypt/live
        sudo chmod 755 /etc/letsencrypt/archive
        sudo chmod 644 /etc/letsencrypt/live/$DOMAIN/fullchain.pem
        sudo chmod 644 /etc/letsencrypt/live/$DOMAIN/privkey.pem

        echo "✓ SSL certificates configured"
    fi
fi

# Setup systemd service
echo ""
echo "Setting up systemd service..."

# Update service file with correct user
CURRENT_USER=$(whoami)
sed -i "s/User=azureuser/User=$CURRENT_USER/" mazzlabs-mail.service
sed -i "s/Group=azureuser/Group=$CURRENT_USER/" mazzlabs-mail.service

# Install service
sudo cp mazzlabs-mail.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME

# Setup certificate renewal hook
echo "Setting up SSL auto-renewal..."
sudo mkdir -p /etc/letsencrypt/renewal-hooks/post
sudo tee /etc/letsencrypt/renewal-hooks/post/restart-mail.sh > /dev/null <<EOF
#!/bin/bash
systemctl restart $SERVICE_NAME
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/restart-mail.sh

# Setup firewall
echo ""
read -p "Do you want to setup UFW firewall? (y/n): " SETUP_FIREWALL

if [ "$SETUP_FIREWALL" = "y" ]; then
    echo "Configuring firewall..."
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    sudo ufw allow 25/tcp   # SMTP
    sudo ufw allow 465/tcp  # SMTP SSL
    sudo ufw allow 587/tcp  # SMTP Submission
    sudo ufw allow 993/tcp  # IMAP SSL
    sudo ufw allow 3000/tcp # Web UI
    sudo ufw --force enable
    echo "✓ Firewall configured"
fi

# Setup backup cron job
echo ""
read -p "Do you want to setup automatic backups? (y/n): " SETUP_BACKUP

if [ "$SETUP_BACKUP" = "y" ]; then
    echo "Setting up backup script..."
    BACKUP_DIR="/opt/backups/mail"
    sudo mkdir -p $BACKUP_DIR
    sudo chown $USER:$USER $BACKUP_DIR

    cat > ~/backup-mail.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/mail"
DATE=$(date +%Y%m%d_%H%M%S)
cp /opt/mazzlabs-mail/data/mail.db $BACKUP_DIR/mail_$DATE.db
# Keep only last 30 days
find $BACKUP_DIR -name "mail_*.db" -mtime +30 -delete
EOF

    chmod +x ~/backup-mail.sh

    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * $HOME/backup-mail.sh") | crontab -
    echo "✓ Daily backup configured (runs at 2 AM)"
fi

# Start the service
echo ""
echo "Starting mail server..."
sudo systemctl start $SERVICE_NAME

# Wait a moment for service to start
sleep 3

# Check status
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo "✓ Mail server is running!"
else
    echo "✗ Mail server failed to start. Check logs:"
    echo "  sudo journalctl -u $SERVICE_NAME -n 50"
    exit 1
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

echo ""
echo "============================================"
echo "Deployment Complete!"
echo "============================================"
echo ""
echo "Your mail server is now running!"
echo ""
echo "Server IP: $SERVER_IP"
echo "Domain: $DOMAIN"
echo ""
echo "Next steps:"
echo "1. Configure DNS in Cloudflare (see CLOUDFLARE_DNS.md)"
echo "   - Add A record: mail.mazzlabs.works → $SERVER_IP"
echo "   - Add MX record: @ → mail.mazzlabs.works"
echo "   - Add SPF record"
echo ""
echo "2. Access Web UI:"
echo "   http://$SERVER_IP:3000"
echo "   or http://$DOMAIN (after DNS propagates)"
echo ""
echo "3. Login with:"
echo "   Email: admin@mazzlabs.works"
echo "   Password: (the one you just set)"
echo ""
echo "4. Check service status:"
echo "   sudo systemctl status $SERVICE_NAME"
echo ""
echo "5. View logs:"
echo "   sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "Troubleshooting:"
echo "- Check logs: sudo journalctl -u $SERVICE_NAME -n 50"
echo "- Restart: sudo systemctl restart $SERVICE_NAME"
echo "- DNS check: dig MX mazzlabs.works"
echo ""
