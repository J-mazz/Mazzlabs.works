# MazzLabs Mail Server - Deployment Complete

## Deployment Summary

The mail server has been comprehensively deployed to Azure using Azure CLI automation.

### Infrastructure Details

**VM Information:**
- Name: `mazzlabs-mail-server`
- Resource Group: `mazzlabs-mail-rg`
- Location: `eastus`
- Size: `Standard_B2s` (2 vCPUs, 4 GB RAM)
- OS: Ubuntu 22.04 LTS
- Public IP: **172.206.209.246**
- Private IP: 10.0.0.4

**Network Security Group Rules Configured:**
| Port | Protocol | Service | Status |
|------|----------|---------|--------|
| 22 | TCP | SSH | ✓ Open |
| 80 | TCP | HTTP (Let's Encrypt) | ✓ Open |
| 443 | TCP | HTTPS | ✓ Open |
| 25 | TCP | SMTP | ✓ Open |
| 465 | TCP | SMTP SSL | ✓ Open |
| 587 | TCP | SMTP Submission | ✓ Open |
| 143 | TCP | IMAP | ✓ Open |
| 993 | TCP | IMAP SSL | ✓ Open |
| 3000 | TCP | Web UI | ✓ Open |

### Software Installed

- Node.js 20.x
- npm (latest)
- PM2 process manager
- Certbot for SSL certificates
- Build tools (gcc, g++, python3-dev)
- Git

### Application Deployed

**Location:** `/opt/mazzlabs-mail`

**Components:**
- Mail server backend (Node.js, Express, SMTP, IMAP)
- Web UI client (React, built and ready)
- SQLite database for user and email storage
- Systemd service for auto-start

**Configuration:**
- Environment file: `/opt/mazzlabs-mail/.env`
- Data directory: `/opt/mazzlabs-mail/data`
- Email storage: `/opt/mazzlabs-mail/data/emails`
- Service name: `mazzlabs-mail.service`

**Default Admin Account:**
- Email: `admin@mazzlabs.works`
- Password: `MazzLabs2025!Secure`

**IMPORTANT:** Change the admin password after first login!

### Services Configured

**Systemd Service:**
- Service file: `/etc/systemd/system/mazzlabs-mail.service`
- Auto-start: Enabled
- Auto-restart: Enabled (RestartSec=10)
- User: azureuser
- Logs: `sudo journalctl -u mazzlabs-mail`

**SSL Certificates:**
- Domain: mail.mazzlabs.works
- Let's Encrypt certificates will be configured when DNS is ready
- Auto-renewal hook configured
- Location: `/etc/letsencrypt/live/mail.mazzlabs.works/`

**UFW Firewall:**
- Status: Enabled
- Rules: All required ports open

## Verification Steps

### 1. SSH into the VM

```bash
ssh azureuser@172.206.209.246
```

### 2. Check Service Status

```bash
sudo systemctl status mazzlabs-mail
```

### 3. View Logs

```bash
# Real-time logs
sudo journalctl -u mazzlabs-mail -f

# Last 50 lines
sudo journalctl -u mazzlabs-mail -n 50
```

### 4. Check Listening Ports

```bash
sudo ss -tlnp | grep -E ':(25|465|587|993|3000)'
```

### 5. Test Web UI

Open in browser:
- By IP: `http://172.206.209.246:3000`
- By domain (after DNS): `http://mail.mazzlabs.works:3000`

### 6. Verify Application Files

```bash
ls -la /opt/mazzlabs-mail/
cat /opt/mazzlabs-mail/.env  # Check configuration
```

## Next Steps - REQUIRED

### 1. Configure DNS in Cloudflare

**CRITICAL:** The mail server won't work without proper DNS configuration.

Add these records in Cloudflare for `mazzlabs.works`:

```
Type    Name    Content                 TTL     Proxy
A       mail    172.206.209.246         Auto    DNS only (gray cloud)
MX      @       mail.mazzlabs.works     Auto    -
        Priority: 10

TXT     @       "v=spf1 ip4:172.206.209.246 mx ~all"    Auto    -
```

**Important:** Make sure the A record for `mail` has the proxy OFF (gray cloud) in Cloudflare!

### 2. Wait for DNS Propagation

Check DNS propagation:
```bash
# Check from local machine
dig mail.mazzlabs.works
dig MX mazzlabs.works
dig TXT mazzlabs.works
```

Expected results:
```
mail.mazzlabs.works.    IN  A       172.206.209.246
mazzlabs.works.         IN  MX  10  mail.mazzlabs.works.
mazzlabs.works.         IN  TXT     "v=spf1 ip4:172.206.209.246 mx ~all"
```

### 3. Setup SSL Certificates

After DNS is configured and propagated, SSH into the VM and run:

```bash
sudo certbot certonly --standalone -d mail.mazzlabs.works --non-interactive --agree-tos --email admin@mazzlabs.works

# Fix permissions
sudo chmod 755 /etc/letsencrypt/live /etc/letsencrypt/archive
sudo chmod 644 /etc/letsencrypt/live/mail.mazzlabs.works/*.pem

# Restart service
sudo systemctl restart mazzlabs-mail
```

### 4. Test SSL Auto-Renewal

```bash
sudo certbot renew --dry-run
```

### 5. Configure DKIM (Optional but Recommended)

For better email deliverability, set up DKIM signing. See `DKIM_SETUP.md` if it exists, or follow standard OpenDKIM setup.

### 6. Test Email Sending and Receiving

**Using Web UI:**
1. Access http://172.206.209.246:3000
2. Login with admin@mazzlabs.works
3. Compose and send test email
4. Check inbox for received emails

**Using Email Client:**
Configure Thunderbird, Outlook, or similar:
- SMTP Server: mail.mazzlabs.works
- SMTP Port: 465 (SSL) or 587 (STARTTLS)
- IMAP Server: mail.mazzlabs.works
- IMAP Port: 993 (SSL)

**Command Line Test:**
```bash
# Test SMTP connection
telnet mail.mazzlabs.works 25
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u mazzlabs-mail -n 100

# Check if node_modules installed
ls /opt/mazzlabs-mail/node_modules

# Manually test
cd /opt/mazzlabs-mail
node src/index.js
```

### Can't Receive Emails

1. Verify MX record: `dig MX mazzlabs.works`
2. Check port 25 is open: `telnet mail.mazzlabs.works 25`
3. Check service logs
4. Azure sometimes blocks port 25 - request unblock if needed

### SSL Certificate Fails

1. Ensure DNS is properly configured
2. Ensure port 80 is accessible
3. Check if any service is using port 80: `sudo ss -tlnp | grep :80`

### Web UI Not Accessible

```bash
# Check if service is running
sudo systemctl status mazzlabs-mail

# Check if port 3000 is listening
sudo ss -tlnp | grep :3000

# Check UFW
sudo ufw status

# Check NSG rules
az network nsg rule list --resource-group mazzlabs-mail-rg --nsg-name mazzlabs-mail-serverNSG -o table
```

## Management Commands

### Start/Stop/Restart Service

```bash
sudo systemctl start mazzlabs-mail
sudo systemctl stop mazzlabs-mail
sudo systemctl restart mazzlabs-mail
```

### View Logs

```bash
# Follow logs
sudo journalctl -u mazzlabs-mail -f

# Last N lines
sudo journalctl -u mazzlabs-mail -n 100

# Since specific time
sudo journalctl -u mazzlabs-mail --since "1 hour ago"
```

### Update Application

```bash
cd /opt/mazzlabs-mail
# Upload new files via SCP or git pull
npm install
cd client && npm install && npm run build && cd ..
sudo systemctl restart mazzlabs-mail
```

### Backup Database

```bash
# Manual backup
cp /opt/mazzlabs-mail/data/mail.db /opt/mazzlabs-mail/data/mail_backup_$(date +%Y%m%d).db

# Automated backups are configured via cron (if setup script completed)
```

## Security Recommendations

### 1. Change Default Admin Password

Login to Web UI and change the password immediately!

### 2. Setup Additional Firewall Rules

Consider restricting SSH access to your IP:
```bash
sudo ufw delete allow 22/tcp
sudo ufw allow from YOUR_IP_ADDRESS to any port 22 proto tcp
```

### 3. Enable Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Regular Updates

```bash
sudo apt update && sudo apt upgrade -y
```

### 5. Monitor Logs Regularly

Check for suspicious activity:
```bash
sudo journalctl -u mazzlabs-mail | grep -i "error\|failed\|unauthorized"
```

## Cost Information

Estimated monthly costs:
- Standard_B2s VM: ~$35-40
- Static Public IP: ~$3.50
- Storage: ~$2-5
- **Total: ~$40-50/month**

## Support and Documentation

- Full deployment guide: `AZURE_DEPLOYMENT.md`
- DNS configuration: `CLOUDFLARE_DNS.md`
- SSL setup: `SSL_SETUP.md`
- Quick start: `QUICK_START.md`

## Deployment Script Used

All setup was automated using Azure CLI commands:

1. NSG rules configuration
2. VM run-command for software installation
3. Application package upload to Azure Storage
4. Remote deployment and configuration
5. Systemd service setup
6. Firewall configuration

## Status

- Infrastructure: ✓ Complete
- Network: ✓ Complete
- Software: ✓ Complete
- Application: ✓ Complete
- Service: ✓ Complete
- **Awaiting:** DNS configuration
- **Awaiting:** SSL certificate setup
- **Awaiting:** Testing and verification

## Quick Access Information

| Item | Value |
|------|-------|
| VM Name | mazzlabs-mail-server |
| Public IP | 172.206.209.246 |
| Domain | mail.mazzlabs.works |
| Web UI | http://172.206.209.246:3000 |
| Admin Email | admin@mazzlabs.works |
| Admin Password | MazzLabs2025!Secure (CHANGE THIS!) |
| SSH Command | `ssh azureuser@172.206.209.246` |
| Service Name | mazzlabs-mail |
| Log Command | `sudo journalctl -u mazzlabs-mail -f` |

---

**Deployment Date:** 2025-10-22
**Deployed By:** Azure CLI Automation
**Status:** Ready for DNS configuration and final testing
