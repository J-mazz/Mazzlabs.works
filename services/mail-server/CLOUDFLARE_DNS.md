# Cloudflare DNS Configuration for MazzLabs Mail

## Required DNS Records

Configure these records in your Cloudflare dashboard for `mazzlabs.works`:

### 1. A Record for Mail Server

```
Type: A
Name: mail
Content: <YOUR_AZURE_VM_PUBLIC_IP>
TTL: Auto
Proxy status: DNS only (gray cloud)
```

**Important:** The proxy MUST be disabled (DNS only) for mail servers!

### 2. MX Record

```
Type: MX
Name: @
Mail server: mail.mazzlabs.works
Priority: 10
TTL: Auto
```

This tells other mail servers to deliver emails for `@mazzlabs.works` to your server.

### 3. SPF Record (TXT)

```
Type: TXT
Name: @
Content: v=spf1 ip4:<YOUR_AZURE_VM_PUBLIC_IP> mx ~all
TTL: Auto
```

SPF (Sender Policy Framework) helps prevent email spoofing by specifying which servers can send email for your domain.

### 4. DKIM Record (TXT) - Optional but Recommended

DKIM will be configured after server setup. You'll add:

```
Type: TXT
Name: default._domainkey
Content: <DKIM_PUBLIC_KEY>
TTL: Auto
```

### 5. DMARC Record (TXT) - Optional but Recommended

```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=quarantine; rua=mailto:admin@mazzlabs.works
TTL: Auto
```

DMARC helps protect against email spoofing and phishing.

### 6. Reverse DNS (PTR) - Configure in Azure

In Azure Portal:
1. Go to your VM's Public IP resource
2. Configuration → DNS name label
3. Set to: `mail`
4. Save

This creates: `mail.<region>.cloudapp.azure.com`

Then contact Azure support or configure in your subscription to set PTR record:
```
<YOUR_IP> → mail.mazzlabs.works
```

## Complete DNS Configuration Example

```
# Main domain
mazzlabs.works                A       <WEBSITE_IP_IF_ANY>

# Mail server
mail.mazzlabs.works          A       <AZURE_VM_PUBLIC_IP>

# MX record
mazzlabs.works               MX      10 mail.mazzlabs.works

# SPF
mazzlabs.works               TXT     "v=spf1 ip4:<AZURE_VM_PUBLIC_IP> mx ~all"

# DMARC
_dmarc.mazzlabs.works        TXT     "v=DMARC1; p=quarantine; rua=mailto:admin@mazzlabs.works"

# DKIM (add after generating keys)
default._domainkey.mazzlabs.works  TXT  "v=DKIM1; k=rsa; p=<PUBLIC_KEY>"
```

## Cloudflare Settings

### Email Routing
1. Go to Email → Email Routing in Cloudflare
2. **Disable** Email Routing if enabled (conflicts with custom mail server)

### SSL/TLS Settings
1. Go to SSL/TLS → Overview
2. Set to: **Full (strict)** if you have valid certificates
3. Set to: **Full** if using self-signed certificates

### Firewall Rules
Add firewall rule to allow email traffic:

```
Field: IP Address
Operator: equals
Value: <YOUR_AZURE_VM_PUBLIC_IP>
Action: Allow
```

## Verification

### Check DNS Propagation

```bash
# Check MX record
dig MX mazzlabs.works

# Check A record
dig A mail.mazzlabs.works

# Check SPF
dig TXT mazzlabs.works

# Check DMARC
dig TXT _dmarc.mazzlabs.works
```

Or use online tools:
- https://mxtoolbox.com/SuperTool.aspx
- https://toolbox.googleapps.com/apps/checkmx/

### Test Mail Server

```bash
# Test SMTP connection
telnet mail.mazzlabs.works 25

# Test DNS resolution
nslookup mail.mazzlabs.works
```

## Common Issues

### Issue: Mail not being received

**Solution:**
- Verify MX record is set correctly
- Ensure A record points to correct IP
- Check Azure NSG allows port 25 inbound

### Issue: Sent mail goes to spam

**Solution:**
- Configure SPF, DKIM, and DMARC
- Ensure reverse DNS is set
- Warm up your IP by sending gradually

### Issue: DNS changes not visible

**Solution:**
- DNS propagation can take up to 48 hours
- Clear your local DNS cache: `sudo systemd-resolve --flush-caches`
- Use `dig @1.1.1.1 mail.mazzlabs.works` to query Cloudflare directly

## Security Notes

1. **Never** enable Cloudflare proxy (orange cloud) for mail records
2. Keep TTL at Auto or 300 for faster updates during setup
3. Enable DNSSEC in Cloudflare for additional security
4. Monitor your DNS records for unauthorized changes

## Next Steps

After DNS is configured:
1. Wait for propagation (check with `dig` commands)
2. Set up SSL certificates on Azure VM
3. Start the mail server
4. Test sending/receiving emails
5. Configure DKIM and update DNS
