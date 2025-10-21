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
┌─────────────────────────────────────────────┐
│                 Internet                    │
└──────────────┬──────────────────────────────┘
               │
        ┌──────┴───────┐
        │  Cloudflare  │ (DNS Management)
        │  DNS Records │
        └──────┬───────┘
               │
        ┌──────┴───────────────────────────┐
        │  Azure VM (mail.mazzlabs.works)  │
        │  ┌────────────────────────────┐  │
        │  │   SMTP Server (Port 25)    │  │
        │  │   - Receive emails         │  │
        │  │   - Send emails            │  │
        │  └────────────────────────────┘  │
        │  ┌────────────────────────────┐  │
        │  │   IMAP Server (Port 993)   │  │
        │  │   - Email retrieval        │  │
        │  └────────────────────────────┘  │
        │  ┌────────────────────────────┐  │
        │  │   Web API (Port 3000)      │  │
        │  │   - REST API               │  │
        │  │   - Authentication         │  │
        │  └────────────────────────────┘  │
        │  ┌────────────────────────────┐  │
        │  │   React Web UI             │  │
        │  │   - Email management       │  │
        │  └────────────────────────────┘  │
        │  ┌────────────────────────────┐  │
        │  │   SQLite Database          │  │
        │  │   - Users                  │  │
        │  │   - Emails                 │  │
        │  └────────────────────────────┘  │
        └──────────────────────────────────┘
```

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

See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) for complete deployment guide.

**Quick summary:**
1. Create Azure VM (Ubuntu 22.04, Standard_B2s)
2. Configure Network Security Group (NSG) for mail ports
3. Set up DNS records in Cloudflare
4. Install Node.js and dependencies
5. Deploy application
6. Configure SSL with Let's Encrypt
7. Set up systemd service

### DNS Configuration

See [CLOUDFLARE_DNS.md](./CLOUDFLARE_DNS.md) for complete DNS setup.

**Required records:**
```
mail.mazzlabs.works    A      <YOUR_VM_IP>
@                      MX     10 mail.mazzlabs.works
@                      TXT    "v=spf1 ip4:<YOUR_VM_IP> mx ~all"
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

## Troubleshooting

### Can't receive emails
- Check MX record: `dig MX mazzlabs.works`
- Verify A record: `dig A mail.mazzlabs.works`
- Test SMTP: `telnet mail.mazzlabs.works 25`
- Check NSG/firewall allows port 25

### Can't send emails
- Verify credentials are correct
- Check SMTP port is open (465 or 587)
- Ensure TLS certificates are valid
- Check Azure NSG allows outbound on SMTP ports

### Web UI not loading
- Verify port 3000 is accessible
- Check if service is running: `sudo systemctl status mazzlabs-mail`
- View logs: `sudo journalctl -u mazzlabs-mail -f`

### Port 25 blocked
Some cloud providers block port 25. Solutions:
1. Contact Azure support to unblock
2. Use port 587 for submission
3. Use email relay service

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

- [ ] DKIM signing support
- [ ] Email filtering/rules
- [ ] Spam detection
- [ ] Calendar integration
- [ ] Mobile app
- [ ] Multi-domain support
- [ ] Admin dashboard
- [ ] Email templates
- [ ] Automated backups to Azure Blob Storage

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
