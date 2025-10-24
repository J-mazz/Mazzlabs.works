#!/bin/bash
# Setup NGINX with TLS for MazzLabs Mail Server

set -e

echo "================================="
echo "NGINX Setup for Mail Server"
echo "================================="

# Install NGINX
echo "Installing NGINX..."
apt-get update
apt-get install -y nginx

# Stop NGINX temporarily
systemctl stop nginx

# Create certbot webroot directory
mkdir -p /var/www/certbot

# Copy NGINX configuration
echo "Configuring NGINX..."
cp /opt/mazzlabs-mail/services/mail-server/nginx-mail.conf /etc/nginx/sites-available/mail

# Remove default site and enable mail site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/mail /etc/nginx/sites-enabled/mail

# Test NGINX configuration
echo "Testing NGINX configuration..."
nginx -t

# Start NGINX
echo "Starting NGINX..."
systemctl enable nginx
systemctl start nginx

# Update certbot renewal hook to reload NGINX
echo "Setting up certificate renewal hook..."
mkdir -p /etc/letsencrypt/renewal-hooks/post
cat > /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
systemctl restart mazzlabs-mail
EOF
chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh

# Show status
echo ""
echo "================================="
echo "NGINX Setup Complete!"
echo "================================="
echo ""
echo "Services status:"
systemctl status nginx --no-pager -l
echo ""
echo "Listening ports:"
ss -tuln | grep -E ':(80|443|25|465|587|3000)'
echo ""
echo "Test HTTPS access:"
echo "https://mail.mazzlabs.works"
echo ""
