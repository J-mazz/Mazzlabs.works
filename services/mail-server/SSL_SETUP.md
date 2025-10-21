# SSL/TLS Setup for MazzLabs Mail Server

## Option 1: Let's Encrypt (Recommended for Production)

### Install Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### Generate Certificates

```bash
# Stop the mail server if running
sudo certbot certonly --standalone -d mail.mazzlabs.works

# Or if you have a web server running:
sudo certbot certonly --webroot -w /var/www/html -d mail.mazzlabs.works
```

### Update .env File

After certificate generation, update your `.env` file:

```bash
TLS_KEY_PATH=/etc/letsencrypt/live/mail.mazzlabs.works/privkey.pem
TLS_CERT_PATH=/etc/letsencrypt/live/mail.mazzlabs.works/fullchain.pem
```

### Auto-Renewal

Let's Encrypt certificates expire after 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
sudo crontab -e

# Add this line to renew twice daily
0 0,12 * * * certbot renew --quiet --post-hook "systemctl restart mazzlabs-mail"
```

## Option 2: Self-Signed Certificate (Development Only)

```bash
# Create certificates directory
mkdir -p certs

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=MazzLabs/CN=mail.mazzlabs.works"

# Update .env
TLS_KEY_PATH=./certs/key.pem
TLS_CERT_PATH=./certs/cert.pem
```

**Warning:** Self-signed certificates will cause trust warnings in email clients and should only be used for development.

## Option 3: Azure Key Vault (Production on Azure)

If deploying on Azure, you can store certificates in Azure Key Vault:

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Create Key Vault
az keyvault create --name mazzlabs-mail-kv --resource-group your-rg --location eastus

# Import certificate
az keyvault certificate import --vault-name mazzlabs-mail-kv \
  --name mail-cert --file /path/to/cert.pfx

# Grant access to your app
az keyvault set-policy --name mazzlabs-mail-kv \
  --object-id <your-app-id> --certificate-permissions get list
```

## Testing TLS

### Test SMTP TLS

```bash
openssl s_client -connect mail.mazzlabs.works:465 -starttls smtp
```

### Test with Email Client

Configure your email client with these settings:

**Incoming (IMAP):**
- Server: mail.mazzlabs.works
- Port: 993
- Security: SSL/TLS

**Outgoing (SMTP):**
- Server: mail.mazzlabs.works
- Port: 465
- Security: SSL/TLS

## Troubleshooting

### Permission Issues

```bash
# Give Node.js permission to read certificates
sudo chmod 644 /etc/letsencrypt/live/mail.mazzlabs.works/fullchain.pem
sudo chmod 644 /etc/letsencrypt/live/mail.mazzlabs.works/privkey.pem

# Or run as root (not recommended)
sudo node src/index.js
```

### Certificate Chain Issues

Make sure to use `fullchain.pem` not `cert.pem` to include intermediate certificates.

### Port 25 Issues

Some cloud providers block port 25. Use alternative ports:
- Port 587 for submission (with STARTTLS)
- Port 465 for submissions (with SSL/TLS)
