# Azure VM Deployment Guide for MazzLabs Mail Server

## Prerequisites

- Azure account with active subscription
- Domain `mazzlabs.works` with DNS managed by Cloudflare
- Azure CLI installed (optional, for command-line deployment)

## Step 1: Create Azure VM

### Option A: Azure Portal

1. **Go to Azure Portal** (https://portal.azure.com)

2. **Create Virtual Machine**
   - Click "Create a resource" → "Virtual Machine"
   - **Basics:**
     - Subscription: Your subscription
     - Resource Group: Create new → `mazzlabs-mail-rg`
     - VM Name: `mazzlabs-mail-server`
     - Region: Choose closest to your users (e.g., East US, West Europe)
     - Image: **Ubuntu Server 22.04 LTS**
     - Size: **Standard_B2s** (2 vCPUs, 4 GB RAM) - minimum recommended
     - Authentication: SSH public key
     - Username: `azureuser`

   - **Disks:**
     - OS disk type: Standard SSD (30 GB minimum)
     - Create and attach data disk: 64 GB for email storage (optional)

   - **Networking:**
     - Virtual network: Create new or use existing
     - Public IP: Create new (Static)
     - NIC network security group: Advanced
     - Configure NSG (see Step 2)

   - **Management:**
     - Enable auto-shutdown: Optional (recommended for dev)

3. **Review + Create** → Create

### Option B: Azure CLI

```bash
# Login
az login

# Create resource group
az group create --name mazzlabs-mail-rg --location eastus

# Create VM
az vm create \
  --resource-group mazzlabs-mail-rg \
  --name mazzlabs-mail-server \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --public-ip-address-allocation static

# Get public IP
az vm show -d -g mazzlabs-mail-rg -n mazzlabs-mail-server --query publicIps -o tsv
```

## Step 2: Configure Network Security Group (NSG)

Add these **Inbound Port Rules**:

| Priority | Name | Port | Protocol | Source | Description |
|----------|------|------|----------|--------|-------------|
| 100 | SSH | 22 | TCP | Your IP | SSH access |
| 200 | HTTP | 80 | TCP | Any | Let's Encrypt verification |
| 210 | HTTPS | 443 | TCP | Any | Web UI (optional) |
| 300 | SMTP | 25 | TCP | Any | Incoming email |
| 310 | SMTP-Submission | 587 | TCP | Any | Email submission |
| 320 | SMTP-SSL | 465 | TCP | Any | SMTP over SSL |
| 400 | IMAP | 143 | TCP | Any | IMAP access |
| 410 | IMAP-SSL | 993 | TCP | Any | IMAP over SSL |
| 500 | WebUI | 3000 | TCP | Any | Mail web interface |

### Via Portal:
1. Go to VM → Networking → Add inbound port rule
2. Add each rule above

### Via CLI:
```bash
NSG_NAME="mazzlabs-mail-serverNSG"
RG="mazzlabs-mail-rg"

az network nsg rule create --resource-group $RG --nsg-name $NSG_NAME \
  --name Allow-SMTP --priority 300 --destination-port-ranges 25 --protocol Tcp

az network nsg rule create --resource-group $RG --nsg-name $NSG_NAME \
  --name Allow-SMTP-Submission --priority 310 --destination-port-ranges 587 --protocol Tcp

az network nsg rule create --resource-group $RG --nsg-name $NSG_NAME \
  --name Allow-SMTP-SSL --priority 320 --destination-port-ranges 465 --protocol Tcp

az network nsg rule create --resource-group $RG --nsg-name $NSG_NAME \
  --name Allow-IMAP --priority 400 --destination-port-ranges 143 --protocol Tcp

az network nsg rule create --resource-group $RG --nsg-name $NSG_NAME \
  --name Allow-IMAP-SSL --priority 410 --destination-port-ranges 993 --protocol Tcp

az network nsg rule create --resource-group $RG --nsg-name $NSG_NAME \
  --name Allow-WebUI --priority 500 --destination-port-ranges 3000 --protocol Tcp

az network nsg rule create --resource-group $RG --nsg-name $NSG_NAME \
  --name Allow-HTTP --priority 200 --destination-port-ranges 80 --protocol Tcp
```

## Step 3: Configure DNS in Cloudflare

1. **Get your VM's public IP:**
   - Azure Portal: VM → Overview → Public IP address
   - Or: `az vm show -d -g mazzlabs-mail-rg -n mazzlabs-mail-server --query publicIps -o tsv`

2. **Configure DNS records** - See `CLOUDFLARE_DNS.md` for complete guide

   Essential records:
   ```
   mail.mazzlabs.works    A      <AZURE_VM_PUBLIC_IP>
   @                      MX     10 mail.mazzlabs.works
   @                      TXT    "v=spf1 ip4:<AZURE_VM_PUBLIC_IP> mx ~all"
   ```

## Step 4: Connect to VM and Install Dependencies

```bash
# SSH into VM (replace with your public IP)
ssh azureuser@<YOUR_VM_PUBLIC_IP>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools
sudo apt install -y build-essential python3-dev git

# Install PM2 (process manager)
sudo npm install -g pm2

# Install certbot for SSL
sudo apt install -y certbot

# Verify installations
node --version
npm --version
pm2 --version
```

## Step 5: Deploy Mail Server Application

```bash
# Create application directory
sudo mkdir -p /opt/mazzlabs-mail
sudo chown $USER:$USER /opt/mazzlabs-mail
cd /opt/mazzlabs-mail

# Clone or upload your code
# Option 1: Git (if using Git)
git clone <your-repo-url> .

# Option 2: Manual upload using SCP from your local machine
# scp -r /path/to/mail-server/* azureuser@<VM_IP>:/opt/mazzlabs-mail/

# Install dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..

# Build client
npm run build:client

# Create .env file
cp .env.example .env
nano .env
```

Edit `.env` file:
```bash
PORT=3000
SMTP_PORT=25
SMTP_PORT_SECURE=465
IMAP_PORT=993

DOMAIN=mazzlabs.works
HOSTNAME=mail.mazzlabs.works

# Will be added after SSL setup
TLS_KEY_PATH=/etc/letsencrypt/live/mail.mazzlabs.works/privkey.pem
TLS_CERT_PATH=/etc/letsencrypt/live/mail.mazzlabs.works/fullchain.pem

JWT_SECRET=$(openssl rand -hex 32)

DB_PATH=/opt/mazzlabs-mail/data/mail.db
MAIL_STORAGE_PATH=/opt/mazzlabs-mail/data/emails

ADMIN_EMAIL=admin@mazzlabs.works
ADMIN_PASSWORD=<CHOOSE_STRONG_PASSWORD>
```

## Step 6: Setup SSL Certificates with Let's Encrypt

```bash
# Stop any running services on port 80
sudo systemctl stop apache2 nginx 2>/dev/null || true

# Generate certificate
sudo certbot certonly --standalone -d mail.mazzlabs.works --non-interactive --agree-tos --email admin@mazzlabs.works

# Set permissions for certificates
sudo chmod 755 /etc/letsencrypt/live
sudo chmod 755 /etc/letsencrypt/archive
sudo chmod 644 /etc/letsencrypt/live/mail.mazzlabs.works/fullchain.pem
sudo chmod 644 /etc/letsencrypt/live/mail.mazzlabs.works/privkey.pem

# Test certificate renewal
sudo certbot renew --dry-run
```

## Step 7: Configure Systemd Service (Recommended)

Create a systemd service for automatic startup:

```bash
sudo nano /etc/systemd/system/mazzlabs-mail.service
```

Add this content:
```ini
[Unit]
Description=MazzLabs Mail Server
After=network.target

[Service]
Type=simple
User=azureuser
WorkingDirectory=/opt/mazzlabs-mail
ExecStart=/usr/bin/node /opt/mazzlabs-mail/src/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=mazzlabs-mail
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable mazzlabs-mail

# Start service
sudo systemctl start mazzlabs-mail

# Check status
sudo systemctl status mazzlabs-mail

# View logs
sudo journalctl -u mazzlabs-mail -f
```

## Step 8: Setup Auto-Renewal for SSL Certificates

```bash
# Create renewal hook
sudo mkdir -p /etc/letsencrypt/renewal-hooks/post
sudo nano /etc/letsencrypt/renewal-hooks/post/restart-mail.sh
```

Add:
```bash
#!/bin/bash
systemctl restart mazzlabs-mail
```

Make executable:
```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/restart-mail.sh
```

Test renewal:
```bash
sudo certbot renew --dry-run
```

## Step 9: Configure Reverse Proxy with Nginx (Optional)

For better web UI access with SSL:

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/mazzlabs-mail
```

Add:
```nginx
server {
    listen 80;
    server_name mail.mazzlabs.works;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/mazzlabs-mail /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL for nginx
sudo certbot --nginx -d mail.mazzlabs.works
```

## Step 10: Monitoring and Maintenance

### View Logs
```bash
# Application logs
sudo journalctl -u mazzlabs-mail -f

# System logs
sudo tail -f /var/log/syslog

# Nginx logs (if using)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Database
```bash
# Create backup script
nano ~/backup-mail.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/mail"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
cp /opt/mazzlabs-mail/data/mail.db $BACKUP_DIR/mail_$DATE.db
# Keep only last 30 days
find $BACKUP_DIR -name "mail_*.db" -mtime +30 -delete
```

Make executable and add to crontab:
```bash
chmod +x ~/backup-mail.sh
crontab -e
# Add: 0 2 * * * /home/azureuser/backup-mail.sh
```

### Monitor Disk Space
```bash
df -h
du -sh /opt/mazzlabs-mail/data/*
```

### Update Application
```bash
cd /opt/mazzlabs-mail
git pull  # or upload new files
npm install
cd client && npm install && npm run build && cd ..
sudo systemctl restart mazzlabs-mail
```

## Step 11: Testing

### Test Web UI
Open browser: `http://mail.mazzlabs.works` or `http://<VM_IP>:3000`

### Test SMTP
```bash
telnet mail.mazzlabs.works 25
```

### Send Test Email
Use the web UI or configure an email client:
- Server: mail.mazzlabs.works
- SMTP Port: 465 (SSL) or 587 (STARTTLS)
- IMAP Port: 993 (SSL)

## Troubleshooting

### Port 25 Blocked by Azure
Some Azure regions block port 25. Solutions:
1. Request removal: https://learn.microsoft.com/en-us/azure/virtual-network/troubleshoot-outbound-smtp-connectivity
2. Use port 587 instead
3. Use SendGrid or similar service for outbound

### Service won't start
```bash
# Check logs
sudo journalctl -u mazzlabs-mail -n 50

# Check permissions
ls -la /opt/mazzlabs-mail
ls -la /etc/letsencrypt/live/mail.mazzlabs.works/

# Manually test
cd /opt/mazzlabs-mail
node src/index.js
```

### Cannot receive emails
- Verify MX record: `dig MX mazzlabs.works`
- Check NSG allows port 25
- Test connection: `telnet mail.mazzlabs.works 25`

## Security Hardening

### Enable Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 25/tcp
sudo ufw allow 465/tcp
sudo ufw allow 587/tcp
sudo ufw allow 993/tcp
sudo ufw enable
```

### Install Fail2Ban
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Regular Updates
```bash
sudo apt update && sudo apt upgrade -y
```

## Cost Optimization

- **B2s VM**: ~$30-40/month
- **Static IP**: ~$3.50/month
- **Storage**: ~$5/month for 64GB
- **Total**: ~$40-50/month

### Reduce costs:
- Use auto-shutdown for dev environments
- Use B1s VM ($10/month) for testing
- Use Azure Reserved Instances for 1-3 year commitment (up to 72% savings)

## Next Steps

1. Create user accounts via web UI
2. Configure email clients
3. Set up DKIM keys (see DKIM_SETUP.md)
4. Monitor email deliverability
5. Set up backups to Azure Blob Storage
