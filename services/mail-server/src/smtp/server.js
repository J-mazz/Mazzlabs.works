import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import { randomUUID } from 'crypto';

export class MailSMTPServer {
  constructor(emailManager, userManager, config) {
    this.emailManager = emailManager;
    this.userManager = userManager;
    this.config = config;
    this.server = null;
  }

  start() {
    const serverOptions = {
      name: this.config.hostname,
      banner: `${this.config.hostname} ESMTP`,
      size: 25 * 1024 * 1024, // 25MB max message size
      authOptional: false,
      disabledCommands: ['STARTTLS'], // We'll handle TLS separately

      onAuth: this.handleAuth.bind(this),
      onData: this.handleData.bind(this),

      onMailFrom: (address, session, callback) => {
        // Validate sender domain
        if (!address.address.endsWith('@mazzlabs.works')) {
          return callback(new Error('Only @mazzlabs.works addresses are allowed'));
        }
        callback();
      },

      logger: false
    };

    // Add TLS if certificates are available
    if (this.config.tlsKey && this.config.tlsCert) {
      try {
        serverOptions.secure = true;
        serverOptions.key = fs.readFileSync(this.config.tlsKey);
        serverOptions.cert = fs.readFileSync(this.config.tlsCert);
      } catch (err) {
        console.warn('TLS certificates not found, running without TLS');
      }
    }

    this.server = new SMTPServer(serverOptions);

    // Start on both ports
    this.server.listen(this.config.smtpPort, () => {
      console.log(`SMTP server listening on port ${this.config.smtpPort}`);
    });

    this.server.on('error', (err) => {
      console.error('SMTP Server error:', err);
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

  async handleData(stream, session, callback) {
    try {
      const chunks = [];

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', async () => {
        try {
          const emailBuffer = Buffer.concat(chunks);
          const parsed = await simpleParser(emailBuffer);

          // Determine recipient(s)
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

          // If email is being sent (not just received), save to sender's Sent folder
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

          callback();
        } catch (err) {
          console.error('Error processing email:', err);
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
    if (this.server) {
      this.server.close();
    }
  }
}
