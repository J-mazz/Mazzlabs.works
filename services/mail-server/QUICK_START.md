# Quick Start Guide - MazzLabs Mail Server

## For Azure VM Deployment

### 1. Create Azure VM

```bash
# Using Azure CLI
az vm create \
  --resource-group mazzlabs-mail-rg \
  --name mazzlabs-mail-server \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard
```

**Or use Azure Portal:**
- Image: Ubuntu 22.04 LTS
- Size: Standard_B2s (2 vCPUs, 4 GB RAM)
- Open ports: 22, 25, 80, 443, 465, 587, 993, 3000

### 2. Get Your VM IP

```bash
az vm show -d -g mazzlabs-mail-rg -n mazzlabs-mail-server --query publicIps -o tsv
```

**Example:** `20.123.456.789`

### 3. Configure DNS in Cloudflare

Go to Cloudflare Dashboard → mazzlabs.works → DNS

Add these records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | mail | `20.123.456.789` | DNS only ☁️ |
| MX | @ | mail.mazzlabs.works (Priority: 10) | - |
| TXT | @ | `v=spf1 ip4:20.123.456.789 mx ~all` | - |

**Important:** Disable Cloudflare proxy (gray cloud) for mail!

### 4. Upload Code to VM

```bash
# From your local machine
scp -r mail-server azureuser@20.123.456.789:/home/azureuser/

# Or use git
ssh azureuser@20.123.456.789
git clone <your-repo-url> mail-server
```

### 5. Run Deployment Script

```bash
# SSH into VM
ssh azureuser@20.123.456.789

# Navigate to project
cd mail-server

# Run automated deployment
bash deploy-to-azure.sh
```

The script will:
- ✅ Install Node.js and dependencies
- ✅ Setup SSL certificates
- ✅ Configure systemd service
- ✅ Setup firewall
- ✅ Setup automatic backups
- ✅ Start the mail server

### 6. Access Web UI

Open browser: `http://20.123.456.789:3000`

Or wait for DNS: `http://mail.mazzlabs.works`

**Login:**
- Email: `admin@mazzlabs.works`
- Password: (set during deployment)

---

## Manual Deployment (Alternative)

If you prefer manual setup:

```bash
# 1. SSH into VM
ssh azureuser@<YOUR_VM_IP>

# 2. Upload/clone code
cd /opt
sudo mkdir mazzlabs-mail
sudo chown $USER:$USER mazzlabs-mail
cd mazzlabs-mail

# 3. Run install script
bash install.sh

# 4. Edit configuration
nano .env
# Update ADMIN_PASSWORD and other settings

# 5. Build client
npm run build:client

# 6. Setup SSL
sudo certbot certonly --standalone -d mail.mazzlabs.works

# 7. Update .env with SSL paths
nano .env
# TLS_KEY_PATH=/etc/letsencrypt/live/mail.mazzlabs.works/privkey.pem
# TLS_CERT_PATH=/etc/letsencrypt/live/mail.mazzlabs.works/fullchain.pem

# 8. Setup service
sudo cp mazzlabs-mail.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mazzlabs-mail
sudo systemctl start mazzlabs-mail

# 9. Check status
sudo systemctl status mazzlabs-mail
```

---

## Common Commands

### Service Management
```bash
# Start
sudo systemctl start mazzlabs-mail

# Stop
sudo systemctl stop mazzlabs-mail

# Restart
sudo systemctl restart mazzlabs-mail

# Status
sudo systemctl status mazzlabs-mail

# Logs
sudo journalctl -u mazzlabs-mail -f
```

### Testing
```bash
# Test SMTP
telnet mail.mazzlabs.works 25

# Test DNS
dig MX mazzlabs.works
dig A mail.mazzlabs.works

# Test SSL
openssl s_client -connect mail.mazzlabs.works:465
```

### Troubleshooting
```bash
# View recent logs
sudo journalctl -u mazzlabs-mail -n 100

# Check if ports are open
sudo netstat -tlnp | grep node

# Test locally
curl http://localhost:3000/health
```

---

## Creating New Email Accounts

### Option 1: Web UI (Recommended)
1. Access web UI
2. Click "Register"
3. Enter email: `user@mazzlabs.works`
4. Set password
5. Done!

### Option 2: API
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@mazzlabs.works","password":"SecurePass123"}'
```

---

## Configuring Email Clients

### Thunderbird / Outlook / Apple Mail

**Incoming (IMAP):**
- Server: `mail.mazzlabs.works`
- Port: `993`
- Security: `SSL/TLS`
- Username: `your@mazzlabs.works`
- Password: `your password`

**Outgoing (SMTP):**
- Server: `mail.mazzlabs.works`
- Port: `465`
- Security: `SSL/TLS`
- Username: `your@mazzlabs.works`
- Password: `your password`

---

## Sending Test Email

### Using Web UI
1. Login
2. Click "Compose"
3. Enter recipient
4. Write message
5. Enter your password (required for SMTP auth)
6. Click "Send"

### Using Email Client
Configure client with settings above and send normally.

### Using Command Line
```bash
# Install swaks (Swiss Army Knife SMTP)
sudo apt install swaks

# Send test email
swaks --to recipient@example.com \
  --from admin@mazzlabs.works \
  --server mail.mazzlabs.works \
  --port 465 \
  --tls \
  --auth LOGIN \
  --auth-user admin@mazzlabs.works \
  --auth-password 'YourPassword'
```

---

## Monitoring

### Check Email Deliverability
- https://mxtoolbox.com/SuperTool.aspx
- https://www.mail-tester.com/

### Monitor Server Health
```bash
# Disk usage
df -h

# Database size
du -sh /opt/mazzlabs-mail/data/

# Memory usage
free -h

# Active connections
sudo netstat -an | grep :25 | wc -l
```

---

## Backup & Recovery

### Manual Backup
```bash
cp /opt/mazzlabs-mail/data/mail.db ~/backup_$(date +%Y%m%d).db
```

### Restore
```bash
sudo systemctl stop mazzlabs-mail
cp ~/backup_20240101.db /opt/mazzlabs-mail/data/mail.db
sudo systemctl start mazzlabs-mail
```

### Automated Backups
Already configured if you ran `deploy-to-azure.sh` with backup option.

Location: `/opt/backups/mail/`

---

## Security Checklist

- ✅ Changed default admin password
- ✅ SSL/TLS certificates installed
- ✅ Firewall enabled and configured
- ✅ SPF record configured
- ✅ Regular backups enabled
- ✅ System updates automated
- ⬜ DKIM configured (see DKIM_SETUP.md)
- ⬜ DMARC configured
- ⬜ Fail2ban installed

---

## Getting Help

**Check Documentation:**
- `README.md` - Full documentation
- `AZURE_DEPLOYMENT.md` - Detailed deployment guide
- `CLOUDFLARE_DNS.md` - DNS configuration
- `SSL_SETUP.md` - SSL certificate setup

**View Logs:**
```bash
sudo journalctl -u mazzlabs-mail -f
```

**Common Issues:**
1. **Can't receive email** → Check MX record and port 25
2. **Can't send email** → Check credentials and port 465/587
3. **SSL errors** → Verify certificates and permissions
4. **Web UI not loading** → Check service status and port 3000

---

## Cost Estimate (Azure)

| Resource | Size | Monthly Cost |
|----------|------|--------------|
| VM | Standard_B2s | ~$35 |
| Static IP | - | ~$3 |
| Disk | 64 GB | ~$5 |
| **Total** | | **~$43/month** |

**Save money:**
- Use B1s for testing ($10/month)
- Enable auto-shutdown for dev
- Use reserved instances (save up to 72%)

---

## Next Steps

1. ✅ Server deployed
2. ✅ DNS configured
3. ✅ SSL installed
4. ⬜ Test sending/receiving emails
5. ⬜ Create user accounts
6. ⬜ Configure email clients
7. ⬜ Setup DKIM (optional)
8. ⬜ Monitor deliverability

**You're ready to go! 🚀**
