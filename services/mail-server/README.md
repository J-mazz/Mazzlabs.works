# MazzLabs Mail Server

A complete, self-hosted email server solution for `@mazzlabs.works` with a modern web interface.

## Features

- **Full Email Server**: SMTP + IMAP support
- **Modern Web UI**: React-based email client
- **User Management**: Multi-user support with authentication
- **Secure**: SSL/TLS support, JWT authentication
- **Email Features**:
  - Send and receive emails
  - Multiple mailboxes (Inbox, Sent, Drafts, Trash, Spam)
  - Email search
  - Attachments support
  - Flag/unflag emails
  - Mark as read/unread
- **Storage**: SQLite database for easy management
- **Domain**: Configured for `@mazzlabs.works` email addresses
- **Deployment Ready**: Optimized for Azure VM deployment

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Internet                              │
│  (Gmail, Yahoo, etc.)                                       │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴───────┐
        │  Cloudflare  │ (DNS Management)
        │  DNS Records │ MX: mail.mazzlabs.works (Priority 10)
        └──────┬───────┘ A: 172.206.209.246
               │
        ┌──────┴──────────────────────────────────────────────┐
        │         Azure VM (mail.mazzlabs.works)              │
        │         IP: 172.206.209.246                         │
        │  ┌──────────────────────────────────────────────┐   │
        │  │  SMTP Incoming Server (Port 25)              │   │
        │  │  - Accepts mail from ANYWHERE                │   │
        │  │  - NO authentication required                │   │
        │  │  - Validates recipients are @mazzlabs.works  │   │
        │  │  - MX record delivery                        │   │
        │  └──────────────────────────────────────────────┘   │
        │  ┌──────────────────────────────────────────────┐   │
        │  │  SMTP Outgoing Server (Port 465/587)         │   │
        │  │  - Requires authentication                   │   │
        │  │  - Validates sender matches auth user        │   │
        │  │  - For client email submission               │   │
        │  │  - TLS/SSL secured                           │   │
        │  └──────────────────────────────────────────────┘   │
        │  ┌──────────────────────────────────────────────┐   │
        │  │  IMAP Server (Port 993)                      │   │
        │  │  - Email retrieval (planned)                 │   │
        │  └──────────────────────────────────────────────┘   │
        │  ┌──────────────────────────────────────────────┐   │
        │  │  Web API (Port 3000)                         │   │
        │  │  - REST API                                  │   │
        │  │  - JWT Authentication                        │   │
        │  │  - Email management                          │   │
        │  └──────────────────────────────────────────────┘   │
        │  ┌──────────────────────────────────────────────┐   │
        │  │  React Web UI                                │   │
        │  │  - Modern email client interface             │   │
        │  │  - Served via Express                        │   │
        │  └──────────────────────────────────────────────┘   │
        │  ┌──────────────────────────────────────────────┐   │
        │  │  SQLite Database                             │   │
        │  │  - Users (email, password hash)              │   │
        │  │  - Emails (metadata + content)               │   │
        │  │  - Mailboxes (INBOX, Sent, Drafts, etc.)    │   │
        │  └──────────────────────────────────────────────┘   │
        └─────────────────────────────────────────────────────┘
```

### SMTP Server Architecture (Critical Fix Applied)

The mail server now runs **two separate SMTP servers** to properly handle both incoming and outgoing mail:

#### 1. Incoming SMTP Server (Port 25)
**Purpose:** Receive emails from external mail servers (Gmail, Yahoo, etc.)

**Configuration:**
- `authOptional: true` - Allows unauthenticated connections
- No sender domain restrictions
- Validates recipients are `@mazzlabs.works`
- Checks recipient user exists in database
- Saves emails to recipient's INBOX

**Flow:**
```
External Server → Port 25 → No Auth → Validate Recipient → Save to INBOX
```

#### 2. Outgoing SMTP Server (Port 465/587)
**Purpose:** Allow authenticated users to send emails

**Configuration:**
- `authOptional: false` - Requires authentication
- Validates sender matches authenticated user
- Delivers to external domains via relay
- Saves copy to sender's Sent folder
- Also delivers to local `@mazzlabs.works` recipients

**Flow:**
```
Email Client → Port 465/587 → Authenticate → Validate Sender → Send & Save to Sent
```

### Why Two Servers Are Required

**The Problem (Fixed):**
The original implementation had a single SMTP server with:
1. `authOptional: false` - Blocked external mail servers from delivering mail
2. Sender validation checking `@mazzlabs.works` - Rejected mail from Gmail, Yahoo, etc.

This made it impossible to receive emails from external domains.

**The Solution:**
Separating incoming (MX) and outgoing (submission) SMTP servers follows RFC 5321 standards:
- Port 25: Public MX receiver (no auth, accepts from anywhere)
- Port 587: Authenticated submission (requires auth, validates sender)
- Port 465: Legacy SMTP over SSL (authenticated)

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo>
cd mail-server

# Install dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..

# Create .env file
cp .env.example .env

# Edit .env with your settings
nano .env

# Start the server
npm start

# In another terminal, start the client
npm run client
```

Access the web UI at: http://localhost:5173

Default admin credentials:
- Email: admin@mazzlabs.works
- Password: changeme123 (change this immediately!)

## Production Deployment

### Azure VM Deployment

**Current Status:**
- VM: `mazzlabs-mail-server` (IP: 172.206.209.246)
- Resource Group: `mazzlabs-mail-rg`
- Location: East US
- Size: Standard_B2s (2 vCPUs, 4 GB RAM)

**Quick summary:**
1. ✅ Create Azure VM (Ubuntu 22.04, Standard_B2s)
2. ✅ Configure Network Security Group (NSG) for mail ports
3. ✅ Set up DNS records in Cloudflare
4. 🔄 Install Node.js and dependencies
5. 🔄 Deploy application
6. 🔄 Configure SSL with Let's Encrypt
7. 🔄 Set up systemd service

### Deployment Steps

#### 1. Connect to Azure VM

```bash
# SSH into the mail server
ssh azureuser@172.206.209.246

# Or use the safe SSH script if available
./safe-ssh.sh
```

#### 2. Install Node.js 18+

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

#### 3. Deploy Application

```bash
# Create application directory
sudo mkdir -p /opt/mazzlabs-mail
sudo chown azureuser:azureuser /opt/mazzlabs-mail

# Clone or copy repository
cd /opt/mazzlabs-mail
git clone <your-repo> .

# Or copy from local machine
# rsync -avz --exclude node_modules --exclude client/node_modules \
#   /path/to/mail-server/ azureuser@172.206.209.246:/opt/mazzlabs-mail/

# Install server dependencies
npm install --production

# Build client
cd client
npm install
npm run build
cd ..

# Create data directory
mkdir -p data

# Configure environment
cp .env.example .env
nano .env
```

#### 4. Configure Environment Variables

Edit `/opt/mazzlabs-mail/.env`:

```bash
PORT=3000
SMTP_PORT=25
SMTP_PORT_SECURE=465
SMTP_PORT_SUBMISSION=587

DOMAIN=mazzlabs.works
HOSTNAME=mail.mazzlabs.works

# Will configure SSL after Let's Encrypt setup
TLS_KEY_PATH=/etc/letsencrypt/live/mail.mazzlabs.works/privkey.pem
TLS_CERT_PATH=/etc/letsencrypt/live/mail.mazzlabs.works/fullchain.pem

JWT_SECRET=$(openssl rand -hex 32)
DB_PATH=/opt/mazzlabs-mail/data/mail.db

ADMIN_EMAIL=admin@mazzlabs.works
ADMIN_PASSWORD=$(openssl rand -base64 16)
```

#### 5. Set Up SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot

# Stop the mail server if running
sudo systemctl stop mazzlabs-mail

# Obtain certificate (standalone mode)
sudo certbot certonly --standalone -d mail.mazzlabs.works

# Set permissions for Node.js to read certificates
sudo chmod 755 /etc/letsencrypt/live
sudo chmod 755 /etc/letsencrypt/archive
sudo chmod 644 /etc/letsencrypt/live/mail.mazzlabs.works/privkey.pem
sudo chmod 644 /etc/letsencrypt/live/mail.mazzlabs.works/fullchain.pem

# Auto-renewal
sudo certbot renew --dry-run
```

#### 6. Create Systemd Service

Create `/etc/systemd/system/mazzlabs-mail.service`:

```ini
[Unit]
Description=MazzLabs Mail Server
After=network.target

[Service]
Type=simple
User=azureuser
WorkingDirectory=/opt/mazzlabs-mail
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/mazzlabs-mail/src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mazzlabs-mail

# Security settings
NoNewPrivileges=true
PrivateTmp=true

# Allow binding to privileged ports (25, 465, 587)
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

#### 7. Start the Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable mazzlabs-mail

# Start the service
sudo systemctl start mazzlabs-mail

# Check status
sudo systemctl status mazzlabs-mail

# View logs
sudo journalctl -u mazzlabs-mail -f
```

### DNS Configuration

**Current Configuration (✅ Verified):**
```
mail.mazzlabs.works    A      172.206.209.246
mazzlabs.works         MX     10 mail.mazzlabs.works.
```

**Required SPF/DKIM Records (Recommended):**
```
mazzlabs.works         TXT    "v=spf1 ip4:172.206.209.246 mx ~all"
mazzlabs.works         TXT    "v=DMARC1; p=quarantine; rua=mailto:postmaster@mazzlabs.works"
```

**Verify DNS Propagation:**
```bash
# Check MX record
dig MX mazzlabs.works +short

# Check A record
dig A mail.mazzlabs.works +short

# Check from external DNS
dig @8.8.8.8 MX mazzlabs.works +short
```

### SSL/TLS Setup

See [SSL_SETUP.md](./SSL_SETUP.md) for certificate configuration.

**Recommended: Let's Encrypt**
```bash
sudo certbot certonly --standalone -d mail.mazzlabs.works
```

## Project Structure

```
mail-server/
├── src/
│   ├── index.js              # Application entry point
│   ├── database/
│   │   ├── schema.js         # Database initialization
│   │   ├── users.js          # User management
│   │   └── emails.js         # Email management
│   ├── smtp/
│   │   └── server.js         # SMTP server implementation
│   └── api/
│       └── server.js         # REST API server
├── client/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── utils/            # API utilities
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   └── package.json
├── data/                     # Database and email storage (created at runtime)
├── .env.example             # Environment variables template
├── package.json
├── AZURE_DEPLOYMENT.md      # Azure deployment guide
├── CLOUDFLARE_DNS.md        # DNS configuration guide
├── SSL_SETUP.md             # SSL certificate setup
└── README.md                # This file
```

## Environment Variables

Key environment variables in `.env`:

```bash
# Server ports
PORT=3000                    # Web API port
SMTP_PORT=25                # SMTP port (incoming mail)
SMTP_PORT_SECURE=465        # SMTP SSL port
IMAP_PORT=993               # IMAP SSL port

# Domain
DOMAIN=mazzlabs.works
HOSTNAME=mail.mazzlabs.works

# SSL/TLS (production)
TLS_KEY_PATH=/etc/letsencrypt/live/mail.mazzlabs.works/privkey.pem
TLS_CERT_PATH=/etc/letsencrypt/live/mail.mazzlabs.works/fullchain.pem

# Security
JWT_SECRET=<generate-random-secret>

# Database
DB_PATH=./data/mail.db

# Admin account
ADMIN_EMAIL=admin@mazzlabs.works
ADMIN_PASSWORD=<strong-password>
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (requires @mazzlabs.works email)

### Users
- `GET /api/users/me` - Get current user info

### Mailboxes
- `GET /api/mailboxes` - Get all mailboxes with counts

### Emails
- `GET /api/emails` - List emails (query: mailbox, limit, offset)
- `GET /api/emails/:id` - Get email details
- `POST /api/emails/send` - Send email
- `PUT /api/emails/:id/read` - Mark as read
- `PUT /api/emails/:id/unread` - Mark as unread
- `PUT /api/emails/:id/flag` - Flag email
- `PUT /api/emails/:id/unflag` - Unflag email
- `PUT /api/emails/:id/move` - Move to mailbox
- `DELETE /api/emails/:id` - Delete email
- `GET /api/emails/search` - Search emails

## Email Client Configuration

### SMTP (Outgoing)
- Server: mail.mazzlabs.works
- Port: 465 (SSL) or 587 (STARTTLS)
- Username: your@mazzlabs.works
- Password: your password
- Security: SSL/TLS

### IMAP (Incoming)
- Server: mail.mazzlabs.works
- Port: 993
- Username: your@mazzlabs.works
- Password: your password
- Security: SSL/TLS

## Testing

### 1. Test SMTP Incoming Server (Port 25)

**Test with telnet:**
```bash
telnet mail.mazzlabs.works 25

# Expected response:
# 220 mail.mazzlabs.works ESMTP

# Send test commands:
EHLO test.example.com
MAIL FROM:<test@gmail.com>
RCPT TO:<admin@mazzlabs.works>
DATA
Subject: Test Email
From: test@gmail.com
To: admin@mazzlabs.works

This is a test email.
.
QUIT
```

**Test with swaks (better tool):**
```bash
# Install swaks
sudo apt install swaks

# Send test email
swaks --to admin@mazzlabs.works \
      --from test@gmail.com \
      --server mail.mazzlabs.works \
      --port 25 \
      --header "Subject: Test from swaks" \
      --body "This is a test email"
```

### 2. Test SMTP Outgoing Server (Port 465/587)

**Test authentication and sending:**
```bash
# Test port 587 with authentication
swaks --to recipient@example.com \
      --from admin@mazzlabs.works \
      --server mail.mazzlabs.works \
      --port 587 \
      --auth LOGIN \
      --auth-user admin@mazzlabs.works \
      --auth-password 'your-password' \
      --header "Subject: Test outgoing" \
      --body "Testing authenticated sending"

# Test port 465 (SSL)
swaks --to recipient@example.com \
      --from admin@mazzlabs.works \
      --server mail.mazzlabs.works \
      --port 465 \
      --tls \
      --auth LOGIN \
      --auth-user admin@mazzlabs.works \
      --auth-password 'your-password' \
      --header "Subject: Test SSL" \
      --body "Testing SSL sending"
```

### 3. Test Port Connectivity

```bash
# Test all SMTP ports
nc -zv mail.mazzlabs.works 25
nc -zv mail.mazzlabs.works 465
nc -zv mail.mazzlabs.works 587

# Test web interface
curl -I http://mail.mazzlabs.works:3000
```

### 4. Test External Mail Delivery

**Send from Gmail to your server:**
1. Log into Gmail
2. Compose email to `admin@mazzlabs.works`
3. Send
4. Check logs: `sudo journalctl -u mazzlabs-mail -f`
5. Verify email in database or web UI

**Send from your server to Gmail:**
1. Use web UI or API to send email
2. Check Gmail inbox (and spam folder)
3. Verify SPF/DKIM headers in received email

### 5. Test Web API

```bash
# Health check
curl http://mail.mazzlabs.works:3000/health

# Login
curl -X POST http://mail.mazzlabs.works:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mazzlabs.works","password":"your-password"}'

# Get emails (with auth token)
curl http://mail.mazzlabs.works:3000/api/emails \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Azure NSG Rules (✅ Verified)

Current NSG configuration is correct:
- ✅ Port 22 (SSH) - Open
- ✅ Port 25 (SMTP incoming) - Open
- ✅ Port 80 (HTTP) - Open
- ✅ Port 443 (HTTPS) - Open
- ✅ Port 465 (SMTP SSL) - Open
- ✅ Port 587 (SMTP submission) - Open
- ✅ Port 3000 (Web UI) - Open

### Can't Receive Emails from External Domains

**Symptoms:**
- Emails from Gmail/Yahoo/etc. don't arrive
- Port 25 connection refused or timeout

**Diagnosis:**
```bash
# 1. Check if port 25 is listening
sudo netstat -tlnp | grep :25

# 2. Test external connectivity
nc -zv mail.mazzlabs.works 25

# 3. Check mail server logs
sudo journalctl -u mazzlabs-mail -f | grep "SMTP Incoming"

# 4. Verify MX record
dig MX mazzlabs.works +short

# 5. Check DNS resolution
dig A mail.mazzlabs.works +short
```

**Solutions:**
1. **Port 25 not listening:** Deploy the updated code with dual SMTP servers
2. **Connection refused:** Ensure service is running (`sudo systemctl status mazzlabs-mail`)
3. **Firewall blocking:** Verify Azure NSG and local firewall rules
4. **Azure blocking port 25:** Contact Azure support to unblock (common issue)
5. **DNS issues:** Verify MX record points to correct IP

### Can't Send Emails (Outgoing)

**Symptoms:**
- Authentication fails
- "Sender must match authenticated user" error
- Connection refused to port 465/587

**Diagnosis:**
```bash
# 1. Check if ports are listening
sudo netstat -tlnp | grep -E ':(465|587)'

# 2. Test authentication
swaks --to test@gmail.com \
      --from admin@mazzlabs.works \
      --server localhost \
      --port 465 \
      --auth LOGIN \
      --auth-user admin@mazzlabs.works \
      --auth-password 'test'

# 3. Check TLS certificates
openssl s_client -connect mail.mazzlabs.works:465 -showcerts
```

**Solutions:**
1. **Ports not listening:** Deploy updated code (outgoing server on 465/587)
2. **Auth failed:** Verify user credentials in database
3. **Sender mismatch:** Ensure sender email matches authenticated user
4. **TLS errors:** Check certificate paths in .env file
5. **Certificate expired:** Renew with `sudo certbot renew`

### Web UI Not Loading

**Symptoms:**
- Can't access http://mail.mazzlabs.works:3000
- 502 Bad Gateway
- Connection timeout

**Diagnosis:**
```bash
# 1. Check service status
sudo systemctl status mazzlabs-mail

# 2. Check if port 3000 is listening
sudo netstat -tlnp | grep :3000

# 3. View application logs
sudo journalctl -u mazzlabs-mail -n 100

# 4. Test locally on server
curl http://localhost:3000/health

# 5. Check client build
ls -la /opt/mazzlabs-mail/client/dist/
```

**Solutions:**
1. **Service not running:** `sudo systemctl start mazzlabs-mail`
2. **Port not listening:** Check for errors in logs
3. **Client not built:** Run `cd client && npm run build`
4. **Permission issues:** Verify ownership of /opt/mazzlabs-mail
5. **Port 3000 blocked:** Add NSG rule or use reverse proxy

### Database Errors

**Symptoms:**
- "SQLITE_CANTOPEN" errors
- "database is locked" errors
- Users/emails not saving

**Diagnosis:**
```bash
# Check database file
ls -la /opt/mazzlabs-mail/data/mail.db

# Check SQLite version
sqlite3 --version

# Open database
sqlite3 /opt/mazzlabs-mail/data/mail.db
.tables
.schema users
.quit
```

**Solutions:**
1. **File not found:** Create data directory (`mkdir -p data`)
2. **Permission denied:** Fix ownership (`sudo chown azureuser:azureuser data/`)
3. **Database locked:** Only one process should access (check for multiple instances)
4. **Corrupted database:** Restore from backup or recreate

### Port 25 Blocked by Azure

**Symptoms:**
- Can't connect to port 25 from external sources
- Works locally but not from internet

**Azure blocks port 25 by default** for new VMs to prevent spam.

**Solutions:**
1. **Request unblock:** Contact Azure support with justification
2. **Use relay service:** Route through SendGrid/Mailgun/Amazon SES
3. **Alternative receiving:** Use port 2525 with custom MX
4. **Workaround:** External relay for incoming mail

### Email Goes to Spam

**Symptoms:**
- Emails arrive but in spam folder
- SPF/DKIM failures in headers

**Solutions:**
1. **Configure SPF:** Add TXT record `v=spf1 ip4:172.206.209.246 mx ~all`
2. **Configure DKIM:** Implement DKIM signing (see roadmap)
3. **Configure DMARC:** Add TXT record `v=DMARC1; p=quarantine`
4. **Reverse DNS:** Ensure PTR record points to mail.mazzlabs.works
5. **Content:** Avoid spam trigger words
6. **Reputation:** Takes time to build sender reputation

### SSL Certificate Issues

**Symptoms:**
- TLS handshake errors
- Certificate expired
- Certificate not found

**Diagnosis:**
```bash
# Check certificate validity
sudo certbot certificates

# Test TLS connection
openssl s_client -connect mail.mazzlabs.works:465

# Check file permissions
ls -la /etc/letsencrypt/live/mail.mazzlabs.works/
```

**Solutions:**
1. **Certificate expired:** `sudo certbot renew --force-renewal`
2. **Permission denied:** Fix permissions (see SSL setup section)
3. **File not found:** Obtain certificate with `sudo certbot certonly`
4. **Wrong paths:** Update .env file with correct paths

## Security Considerations

1. **Change default admin password immediately**
2. **Use strong JWT secret** - generate with `openssl rand -hex 32`
3. **Enable firewall** - only allow necessary ports
4. **Keep system updated** - `sudo apt update && sudo apt upgrade`
5. **Use SSL/TLS** - Let's Encrypt certificates
6. **Configure SPF, DKIM, DMARC** - prevent spoofing
7. **Monitor logs** - watch for suspicious activity
8. **Regular backups** - backup database daily

## Monitoring

### View Logs
```bash
# Application logs
sudo journalctl -u mazzlabs-mail -f

# System logs
sudo tail -f /var/log/syslog
```

### Check Disk Usage
```bash
df -h
du -sh /opt/mazzlabs-mail/data/*
```

### Monitor Email Queue
Check database for pending emails or delivery issues.

## Backup & Recovery

### Backup Database
```bash
cp /opt/mazzlabs-mail/data/mail.db /backup/location/mail_$(date +%Y%m%d).db
```

### Restore Database
```bash
sudo systemctl stop mazzlabs-mail
cp /backup/location/mail_20240101.db /opt/mazzlabs-mail/data/mail.db
sudo systemctl start mazzlabs-mail
```

## Performance Tuning

For high-volume mail servers:
- Upgrade VM size (more CPU/RAM)
- Use PostgreSQL instead of SQLite
- Implement email queue
- Add caching layer
- Use separate storage for attachments

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License

## Support

For issues and questions:
- Check documentation first
- Review logs for errors
- Open GitHub issue with details

## Roadmap

### Completed ✅
- [x] Dual SMTP server architecture (incoming/outgoing separation)
- [x] Fix external email reception
- [x] Sender validation for authenticated users
- [x] Azure NSG configuration
- [x] DNS MX record setup

### High Priority 🔥
- [ ] Deploy updated code to production
- [ ] Test external email delivery (Gmail → mazzlabs.works)
- [ ] Configure SPF/DKIM/DMARC records
- [ ] Set up SSL/TLS with Let's Encrypt
- [ ] Implement proper email relay for outbound mail to external domains

### Medium Priority 📋
- [ ] IMAP server implementation (currently planned, not active)
- [ ] Email filtering/rules
- [ ] Spam detection (SpamAssassin integration)
- [ ] Admin dashboard
- [ ] User management UI
- [ ] Email templates
- [ ] Automated backups to Azure Blob Storage

### Future Enhancements 🚀
- [ ] Calendar integration (CalDAV)
- [ ] Mobile app (React Native)
- [ ] Multi-domain support
- [ ] Email aliases
- [ ] Mailing lists
- [ ] Attachment file storage (Azure Blob)
- [ ] Full-text search
- [ ] Email archiving

## Credits

Built with:
- Node.js
- Express
- React
- smtp-server
- better-sqlite3
- And many other great open-source libraries

---

**MazzLabs Mail Server** - Self-hosted email for `mazzlabs.works`
