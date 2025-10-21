# MazzLabs Mail Server - Deployment Checklist

Use this checklist to ensure successful deployment of your mail server on Azure.

## Pre-Deployment

### Azure Resources
- [ ] Azure subscription active
- [ ] Resource group created: `mazzlabs-mail-rg`
- [ ] VM created: Ubuntu 22.04 LTS, Standard_B2s
- [ ] Static public IP assigned
- [ ] SSH key pair generated and added to VM
- [ ] VM public IP noted: `___________________`

### Network Security Group (NSG)
- [ ] Port 22 (SSH) - Your IP only
- [ ] Port 25 (SMTP)
- [ ] Port 80 (HTTP) - for Let's Encrypt
- [ ] Port 443 (HTTPS)
- [ ] Port 465 (SMTP SSL)
- [ ] Port 587 (SMTP Submission)
- [ ] Port 993 (IMAP SSL)
- [ ] Port 3000 (Web UI)

### DNS Configuration (Cloudflare)
- [ ] A record: `mail.mazzlabs.works` → `<VM_IP>`
- [ ] MX record: `@` → `mail.mazzlabs.works` (Priority: 10)
- [ ] SPF TXT record: `v=spf1 ip4:<VM_IP> mx ~all`
- [ ] Cloudflare proxy DISABLED (gray cloud)
- [ ] DNS propagation verified: `dig mail.mazzlabs.works`

## Deployment

### Initial Setup
- [ ] SSH into VM successful
- [ ] Code uploaded/cloned to VM
- [ ] `deploy-to-azure.sh` executed successfully
- [ ] Node.js installed: `node --version`
- [ ] Dependencies installed: `npm install` completed

### Configuration
- [ ] `.env` file created and configured
- [ ] Admin password set (strong password)
- [ ] JWT_SECRET generated (random)
- [ ] Domain configured: `mail.mazzlabs.works`
- [ ] Database path set: `/opt/mazzlabs-mail/data/mail.db`

### SSL Certificates
- [ ] Let's Encrypt certificates generated
- [ ] Certificates located: `/etc/letsencrypt/live/mail.mazzlabs.works/`
- [ ] Certificate permissions set correctly
- [ ] TLS paths updated in `.env`
- [ ] Auto-renewal tested: `sudo certbot renew --dry-run`

### Application
- [ ] Client built: `npm run build:client`
- [ ] Data directory created: `/opt/mazzlabs-mail/data/`
- [ ] Systemd service installed
- [ ] Service enabled: `sudo systemctl enable mazzlabs-mail`
- [ ] Service started: `sudo systemctl start mazzlabs-mail`
- [ ] Service running: `sudo systemctl status mazzlabs-mail`

### Security
- [ ] Firewall configured (UFW)
- [ ] Firewall enabled
- [ ] Default admin password changed
- [ ] Fail2ban installed (optional)
- [ ] Automatic updates configured

### Backups
- [ ] Backup script created
- [ ] Backup directory: `/opt/backups/mail/`
- [ ] Cron job configured (daily 2 AM)
- [ ] Test backup run successfully

## Testing

### Web UI
- [ ] Web UI accessible: `http://<VM_IP>:3000`
- [ ] Web UI accessible: `http://mail.mazzlabs.works`
- [ ] Login successful with admin credentials
- [ ] Dashboard loads correctly
- [ ] Mailboxes visible (Inbox, Sent, etc.)

### Email Functionality
- [ ] New user registration works
- [ ] User can login
- [ ] Compose email works
- [ ] Send email successful (to external email)
- [ ] Receive email successful (from external email)
- [ ] Email appears in inbox
- [ ] Mark as read/unread works
- [ ] Delete email works
- [ ] Move to folder works

### SMTP Server
- [ ] SMTP connection test: `telnet mail.mazzlabs.works 25`
- [ ] SMTP SSL test: `openssl s_client -connect mail.mazzlabs.works:465`
- [ ] Can send via SMTP port 465
- [ ] Can send via SMTP port 587

### DNS & Deliverability
- [ ] MX record check: `dig MX mazzlabs.works`
- [ ] A record check: `dig A mail.mazzlabs.works`
- [ ] SPF check: `dig TXT mazzlabs.works`
- [ ] MXToolbox check: https://mxtoolbox.com/
- [ ] Mail-tester score >7/10: https://www.mail-tester.com/

### Email Client Configuration
- [ ] Thunderbird configured successfully
- [ ] Can send email from client
- [ ] Can receive email in client
- [ ] SSL/TLS connection verified

## Post-Deployment

### Monitoring
- [ ] Service logs reviewed: `sudo journalctl -u mazzlabs-mail`
- [ ] No errors in logs
- [ ] Disk usage checked: `df -h`
- [ ] Email storage checked: `du -sh /opt/mazzlabs-mail/data/`

### Documentation
- [ ] Admin credentials documented securely
- [ ] VM IP and SSH key stored safely
- [ ] DNS records documented
- [ ] Backup procedure documented
- [ ] Recovery procedure tested

### Optional Enhancements
- [ ] DKIM configured
- [ ] DMARC record added
- [ ] Reverse DNS (PTR) configured via Azure
- [ ] Email filtering/spam detection
- [ ] Additional user accounts created
- [ ] Nginx reverse proxy (optional)
- [ ] Azure Blob Storage backups

## Maintenance Schedule

### Daily
- [ ] Check service status
- [ ] Review logs for errors
- [ ] Automated backup runs

### Weekly
- [ ] Check disk usage
- [ ] Review email deliverability
- [ ] Check for system updates

### Monthly
- [ ] Review security logs
- [ ] Test backup restoration
- [ ] Update dependencies if needed
- [ ] Review user accounts

### Quarterly
- [ ] SSL certificate renewal (automatic)
- [ ] Security audit
- [ ] Performance review
- [ ] Cost optimization review

## Troubleshooting

### If service won't start:
1. Check logs: `sudo journalctl -u mazzlabs-mail -n 100`
2. Verify .env file
3. Check permissions on data directory
4. Verify SSL certificate permissions

### If can't receive email:
1. Verify MX record: `dig MX mazzlabs.works`
2. Check NSG allows port 25
3. Test SMTP: `telnet mail.mazzlabs.works 25`
4. Check service logs

### If can't send email:
1. Verify credentials
2. Check SMTP ports (465/587) in NSG
3. Verify SSL certificates
4. Check email client settings

### If emails go to spam:
1. Verify SPF record
2. Configure DKIM
3. Add DMARC record
4. Check reverse DNS
5. Test at mail-tester.com

## Success Criteria

Your deployment is successful when:
- ✅ Service running without errors
- ✅ Web UI accessible
- ✅ Can send email to external addresses
- ✅ Can receive email from external addresses
- ✅ SSL/TLS working
- ✅ DNS configured correctly
- ✅ Backups running
- ✅ Mail-tester score >7/10

## Support Resources

- **Documentation**: See README.md, AZURE_DEPLOYMENT.md
- **Quick Start**: See QUICK_START.md
- **DNS Guide**: See CLOUDFLARE_DNS.md
- **SSL Guide**: See SSL_SETUP.md
- **Logs**: `sudo journalctl -u mazzlabs-mail -f`

## Notes

Document any issues or customizations here:

```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Server IP**: _______________  
**Initial Admin**: admin@mazzlabs.works
