import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import { randomUUID } from 'crypto';

export class MailSMTPServer {
  constructor(emailManager, userManager, config) {
    this.emailManager = emailManager;
    this.userManager = userManager;
    this.config = config;
    this.incomingServer = null;
    this.outgoingServer = null;
  }

  start() {
    this.startIncomingServer();
    this.startOutgoingServer();
  }

  startIncomingServer() {
    // Incoming server (port 25) - accepts mail from anywhere, no auth required
    const incomingOptions = {
      name: this.config.hostname,
      banner: `${this.config.hostname} ESMTP`,
      size: 25 * 1024 * 1024, // 25MB max message size
      authOptional: true, // Allow unauthenticated connections for incoming mail
      disabledCommands: ['STARTTLS'], // We'll handle TLS separately

      onData: this.handleIncomingData.bind(this),

      onRcptTo: (address, session, callback) => {
        // Only accept mail for valid @mazzlabs.works recipients
        if (!address.address.endsWith('@mazzlabs.works')) {
          return callback(new Error('Relay access denied'));
        }

        // Check if recipient exists
        const user = this.userManager.getUserByEmail(address.address);
        if (!user) {
          return callback(new Error('User not found'));
        }

        callback();
      },

      logger: false
    };

    this.incomingServer = new SMTPServer(incomingOptions);

    this.incomingServer.listen(this.config.smtpPort, () => {
      console.log(`SMTP incoming server (MX) listening on port ${this.config.smtpPort}`);
    });

    this.incomingServer.on('error', (err) => {
      console.error('SMTP Incoming Server error:', err);
    });
  }

  startOutgoingServer() {
    // Outgoing server (port 587/465) - requires auth, validates sender
    const outgoingOptions = {
      name: this.config.hostname,
      banner: `${this.config.hostname} ESMTP`,
      size: 25 * 1024 * 1024, // 25MB max message size
      authOptional: false, // Require authentication for outgoing mail
      disabledCommands: ['STARTTLS'], // We'll handle TLS separately

      onAuth: this.handleAuth.bind(this),
      onData: this.handleOutgoingData.bind(this),

      onMailFrom: (address, session, callback) => {
        // Validate sender matches authenticated user
        if (session.user && session.user.email !== address.address) {
          return callback(new Error('Sender must match authenticated user'));
        }
        callback();
      },

      logger: false
    };

    // Add TLS if certificates are available
    if (this.config.tlsKey && this.config.tlsCert) {
      try {
        outgoingOptions.secure = true;
        outgoingOptions.key = fs.readFileSync(this.config.tlsKey);
        outgoingOptions.cert = fs.readFileSync(this.config.tlsCert);
        // Relaxed TLS options for better client compatibility
        outgoingOptions.minVersion = 'TLSv1.2';
        outgoingOptions.ciphers = 'HIGH:!aNULL:!MD5';
      } catch (err) {
        console.warn('TLS certificates not found, running without TLS on outgoing server');
      }
    }

    this.outgoingServer = new SMTPServer(outgoingOptions);

    this.outgoingServer.listen(this.config.smtpPortSecure, () => {
      console.log(`SMTP outgoing server (submission) listening on port ${this.config.smtpPortSecure}`);
    });

    this.outgoingServer.on('error', (err) => {
      console.error('SMTP Outgoing Server error:', err);
    });
  }

  async handleAuth(auth, session, callback) {
    try {
      const email = auth.username;

      // Ensure email ends with @mazzlabs.works
      if (!email.endsWith('@mazzlabs.works')) {
        return callback(new Error('Invalid email domain'));
      }

      const isValid = await this.userManager.verifyPassword(email, auth.password);

      if (isValid) {
        const user = this.userManager.getUserByEmail(email);
        session.user = user;
        callback(null, { user: user.id });
      } else {
        callback(new Error('Invalid username or password'));
      }
    } catch (err) {
      callback(err);
    }
  }

  async handleIncomingData(stream, session, callback) {
    // Handle incoming mail from external servers
    try {
      const chunks = [];

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', async () => {
        try {
          const emailBuffer = Buffer.concat(chunks);
          const parsed = await simpleParser(emailBuffer);

          // Determine recipient(s) - only process @mazzlabs.works addresses
          const recipients = this.extractRecipients(parsed);

          // Save email for each recipient
          for (const recipient of recipients) {
            const user = this.userManager.getUserByEmail(recipient);

            if (user) {
              const emailData = {
                messageId: parsed.messageId || `<${randomUUID()}@mazzlabs.works>`,
                from: parsed.from?.text || session.envelope.mailFrom.address,
                to: recipient,
                cc: parsed.cc?.text || '',
                bcc: parsed.bcc?.text || '',
                subject: parsed.subject || '(No Subject)',
                text: parsed.text || '',
                html: parsed.html || '',
                headers: parsed.headers,
                attachments: parsed.attachments?.map(att => ({
                  filename: att.filename,
                  contentType: att.contentType,
                  size: att.size
                })) || [],
                size: emailBuffer.length,
                mailbox: 'INBOX'
              };

              this.emailManager.saveEmail(user.id, emailData);
              this.userManager.updateStorageUsed(user.id, emailBuffer.length);
            }
          }

          callback();
        } catch (err) {
          console.error('Error processing incoming email:', err);
          callback(err);
        }
      });
    } catch (err) {
      callback(err);
    }
  }

  async handleOutgoingData(stream, session, callback) {
    // Handle outgoing mail from authenticated users
    try {
      const chunks = [];

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', async () => {
        try {
          const emailBuffer = Buffer.concat(chunks);
          const parsed = await simpleParser(emailBuffer);

          // Save to sender's Sent folder
          if (session.user) {
            const emailData = {
              messageId: parsed.messageId || `<${randomUUID()}@mazzlabs.works>`,
              from: session.envelope.mailFrom.address,
              to: parsed.to?.text || '',
              cc: parsed.cc?.text || '',
              bcc: parsed.bcc?.text || '',
              subject: parsed.subject || '(No Subject)',
              text: parsed.text || '',
              html: parsed.html || '',
              headers: parsed.headers,
              attachments: parsed.attachments?.map(att => ({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size
              })) || [],
              size: emailBuffer.length,
              mailbox: 'Sent'
            };

            this.emailManager.saveEmail(session.user.id, emailData);
          }

          // Also save to local recipients' INBOX if they're @mazzlabs.works
          const recipients = this.extractRecipients(parsed);
          for (const recipient of recipients) {
            const user = this.userManager.getUserByEmail(recipient);

            if (user) {
              const emailData = {
                messageId: parsed.messageId || `<${randomUUID()}@mazzlabs.works>`,
                from: parsed.from?.text || session.envelope.mailFrom.address,
                to: recipient,
                cc: parsed.cc?.text || '',
                bcc: parsed.bcc?.text || '',
                subject: parsed.subject || '(No Subject)',
                text: parsed.text || '',
                html: parsed.html || '',
                headers: parsed.headers,
                attachments: parsed.attachments?.map(att => ({
                  filename: att.filename,
                  contentType: att.contentType,
                  size: att.size
                })) || [],
                size: emailBuffer.length,
                mailbox: 'INBOX'
              };

              this.emailManager.saveEmail(user.id, emailData);
              this.userManager.updateStorageUsed(user.id, emailBuffer.length);
            }
          }

          callback();
        } catch (err) {
          console.error('Error processing outgoing email:', err);
          callback(err);
        }
      });
    } catch (err) {
      callback(err);
    }
  }

  extractRecipients(parsed) {
    const recipients = [];

    if (parsed.to) {
      const toAddresses = Array.isArray(parsed.to.value)
        ? parsed.to.value
        : [parsed.to.value];
      recipients.push(...toAddresses.map(addr => addr.address));
    }

    if (parsed.cc) {
      const ccAddresses = Array.isArray(parsed.cc.value)
        ? parsed.cc.value
        : [parsed.cc.value];
      recipients.push(...ccAddresses.map(addr => addr.address));
    }

    // Filter only @mazzlabs.works addresses
    return recipients.filter(addr => addr.endsWith('@mazzlabs.works'));
  }

  stop() {
    if (this.incomingServer) {
      this.incomingServer.close();
    }
    if (this.outgoingServer) {
      this.outgoingServer.close();
    }
  }
}
