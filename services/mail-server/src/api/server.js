import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import xss from 'xss';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class APIServer {
  constructor(emailManager, userManager, config) {
    this.app = express();
    this.emailManager = emailManager;
    this.userManager = userManager;
    this.config = config;

    // Rate limiters for sensitive endpoints
    this.authLimiter = new RateLimiterMemory({
      points: 5, // 5 attempts
      duration: 60 * 15, // per 15 minutes
      blockDuration: 60 * 15 // block for 15 minutes
    });

    this.emailLimiter = new RateLimiterMemory({
      points: 20, // 20 emails
      duration: 60 * 60, // per hour
      blockDuration: 60 * 5 // block for 5 minutes
    });

    this.passwordChangeLimiter = new RateLimiterMemory({
      points: 3, // 3 attempts
      duration: 60 * 60, // per hour
      blockDuration: 60 * 30 // block for 30 minutes
    });

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      }
    }));
    this.app.use(cors());
    this.app.use(express.json());

    // Serve static files from client/dist
    const clientPath = path.join(__dirname, '../../client/dist');
    this.app.use(express.static(clientPath));
  }

  setupRoutes() {
    // Auth routes with rate limiting
    this.app.post('/api/auth/login', this.rateLimit(this.authLimiter), this.login.bind(this));
    this.app.post('/api/auth/register', this.rateLimit(this.authLimiter), this.register.bind(this));
    this.app.post('/api/auth/verify-mfa', this.rateLimit(this.authLimiter), this.verifyMFALogin.bind(this));

    // Password reset routes (public)
    this.app.post('/api/auth/forgot-password', this.rateLimit(this.authLimiter), this.requestPasswordReset.bind(this));
    this.app.post('/api/auth/reset-password', this.rateLimit(this.authLimiter), this.resetPassword.bind(this));

    // Protected routes
    this.app.use('/api/*', this.authenticate.bind(this));

    // User routes
    this.app.get('/api/users/me', this.getCurrentUser.bind(this));
    this.app.post('/api/users/change-password', this.rateLimit(this.passwordChangeLimiter), this.changePassword.bind(this));
    this.app.get('/api/users', this.getUsers.bind(this));

    // MFA routes
    this.app.post('/api/users/mfa/setup', this.setupMFA.bind(this));
    this.app.post('/api/users/mfa/verify-setup', this.verifyMFASetup.bind(this));
    this.app.post('/api/users/mfa/disable', this.disableMFA.bind(this));

    // Recovery options routes
    this.app.post('/api/users/recovery-email', this.setRecoveryEmail.bind(this));
    this.app.post('/api/users/phone-number', this.setPhoneNumber.bind(this));

    // Admin routes (admin only)
    this.app.get('/api/admin/users', this.requireAdmin.bind(this), this.getAllUsersAdmin.bind(this));
    this.app.post('/api/admin/users/:userId/reset-password', this.requireAdmin.bind(this), this.adminResetPassword.bind(this));

    // Mailbox routes
    this.app.get('/api/mailboxes', this.getMailboxes.bind(this));

    // Email routes
    this.app.get('/api/emails', this.getEmails.bind(this));
    this.app.get('/api/emails/:id', this.getEmail.bind(this));
    this.app.post('/api/emails/send', this.rateLimit(this.emailLimiter), this.sendEmail.bind(this));
    this.app.put('/api/emails/:id/read', this.markAsRead.bind(this));
    this.app.put('/api/emails/:id/unread', this.markAsUnread.bind(this));
    this.app.put('/api/emails/:id/flag', this.flagEmail.bind(this));
    this.app.put('/api/emails/:id/unflag', this.unflagEmail.bind(this));
    this.app.put('/api/emails/:id/move', this.moveEmail.bind(this));
    this.app.delete('/api/emails/:id', this.deleteEmail.bind(this));
    this.app.get('/api/emails/search', this.searchEmails.bind(this));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'mazzlabs-mail-server' });
    });

    // Serve React app for all non-API routes
    this.app.get('*', (req, res) => {
      const clientPath = path.join(__dirname, '../../client/dist/index.html');
      res.sendFile(clientPath);
    });
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const isValid = await this.userManager.verifyPassword(email, password);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = this.userManager.getUserByEmail(email);

      // Check if MFA is enabled
      if (user.mfa_enabled) {
        // Create a temporary token for MFA verification
        const mfaToken = jwt.sign(
          { userId: user.id, email: user.email, mfaPending: true },
          this.config.jwtSecret,
          { expiresIn: '5m' }
        );

        return res.json({
          mfaRequired: true,
          mfaToken,
          message: 'MFA verification required'
        });
      }

      // No MFA required, issue regular token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        this.config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isAdmin: user.is_admin,
          mfaEnabled: user.mfa_enabled || false
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async register(req, res) {
    try {
      const { email, password, recoveryEmail, phoneNumber } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      if (!email.endsWith('@mazzlabs.works')) {
        return res.status(400).json({ error: 'Only @mazzlabs.works emails allowed' });
      }

      const existing = this.userManager.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const userId = await this.userManager.createUser(email, password);

      // Set recovery options if provided
      if (recoveryEmail) {
        this.userManager.setRecoveryEmail(userId, recoveryEmail);
      }
      if (phoneNumber) {
        this.userManager.setPhoneNumber(userId, phoneNumber);
      }

      const user = this.userManager.getUserById(userId);

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        this.config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isAdmin: user.is_admin
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  rateLimit(limiter) {
    return async (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress;
      try {
        await limiter.consume(key);
        next();
      } catch (rateLimiterRes) {
        const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter
        });
      }
    };
  }

  authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, this.config.jwtSecret);

      req.user = this.userManager.getUserById(decoded.userId);

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  getCurrentUser(req, res) {
    res.json({
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      isAdmin: req.user.is_admin,
      storageUsed: req.user.storage_used,
      storageQuota: req.user.storage_quota,
      mfaEnabled: req.user.mfa_enabled || false,
      recoveryEmail: req.user.recovery_email || null,
      phoneNumber: req.user.phone_number || null
    });
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // Verify current password
      const isValid = await this.userManager.verifyPassword(req.user.email, currentPassword);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Update password
      await this.userManager.updatePassword(req.user.id, newPassword);

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }

  getUsers(req, res) {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = this.userManager.getAllUsers();
    res.json(users);
  }

  getMailboxes(req, res) {
    const mailboxes = this.emailManager.getMailboxes(req.user.id);
    res.json(mailboxes);
  }

  getEmails(req, res) {
    const mailbox = req.query.mailbox || 'INBOX';
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const emails = this.emailManager.getEmailsByMailbox(req.user.id, mailbox, limit, offset);
    res.json(emails);
  }

  getEmail(req, res) {
    const email = this.emailManager.getEmailById(req.params.id, req.user.id);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Sanitize HTML content to prevent XSS
    if (email.body_html) {
      email.body_html = xss(email.body_html);
    }

    res.json(email);
  }

  async sendEmail(req, res) {
    try {
      const { to, subject, text } = req.body;
      let { html } = req.body;

      if (!to || (!text && !html)) {
        return res.status(400).json({ error: 'To and content required' });
      }

      // Sanitize HTML content to prevent XSS
      if (html) {
        html = xss(html);
      }

      // Store email in Sent folder
      const emailData = {
        user_id: req.user.id,
        from_address: req.user.email,
        to_address: to,
        subject: subject || '(No Subject)',
        body_text: text || '',
        body_html: html || '',
        mailbox: 'Sent',
        size: (text || html || '').length,
        received_at: new Date().toISOString()
      };

      this.emailManager.saveEmail(req.user.id, emailData);

      // Create nodemailer transport using our SMTP outgoing server
      // Note: For now, we'll send without SMTP auth since it's the same server
      // In production, you'd want proper auth or use a service account
      const transporter = nodemailer.createTransport({
        host: 'localhost',
        port: this.config.smtpPort, // Use incoming port for local delivery
        secure: false,
        tls: {
          rejectUnauthorized: false
        }
      });

      const info = await transporter.sendMail({
        from: req.user.email,
        to,
        subject,
        text,
        html
      });

      res.json({ success: true, messageId: info.messageId });
    } catch (err) {
      console.error('Send email error:', err);
      res.status(500).json({ error: 'Failed to send email' });
    }
  }

  markAsRead(req, res) {
    this.emailManager.markAsRead(req.params.id, req.user.id);
    res.json({ success: true });
  }

  markAsUnread(req, res) {
    this.emailManager.markAsUnread(req.params.id, req.user.id);
    res.json({ success: true });
  }

  flagEmail(req, res) {
    this.emailManager.flagEmail(req.params.id, req.user.id);
    res.json({ success: true });
  }

  unflagEmail(req, res) {
    this.emailManager.unflagEmail(req.params.id, req.user.id);
    res.json({ success: true });
  }

  moveEmail(req, res) {
    const { mailbox } = req.body;

    if (!mailbox) {
      return res.status(400).json({ error: 'Mailbox required' });
    }

    this.emailManager.moveEmail(req.params.id, req.user.id, mailbox);
    res.json({ success: true });
  }

  deleteEmail(req, res) {
    this.emailManager.deleteEmail(req.params.id, req.user.id);
    res.json({ success: true });
  }

  searchEmails(req, res) {
    const { q, mailbox } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const emails = this.emailManager.searchEmails(req.user.id, q, mailbox);
    res.json(emails);
  }

  // Password Reset Methods
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const user = this.userManager.getUserByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
      }

      // Check if user has a recovery email configured
      if (!user.recovery_email) {
        return res.status(400).json({
          error: 'No recovery email configured. Please contact an administrator for password reset assistance.',
          noRecoveryEmail: true
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      this.userManager.createPasswordResetToken(user.id, resetToken, expiresAt);

      // Send reset email to recovery email address
      const resetLink = `https://${this.config.domain}/reset-password?token=${resetToken}`;
      const transporter = nodemailer.createTransport({
        host: 'localhost',
        port: this.config.smtpPort,
        secure: false,
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.sendMail({
        from: `noreply@${this.config.domain}`,
        to: user.recovery_email, // Send to recovery email
        subject: 'Password Reset Request - MazzLabs Mail',
        text: `You requested a password reset for ${email}.\n\nClick the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email and contact an administrator.`,
        html: `<p>You requested a password reset for <strong>${email}</strong>.</p><p><a href="${resetLink}">Reset Password</a></p><p>This link expires in 1 hour.</p><p>If you didn't request this, please ignore this email and contact an administrator.</p>`
      });

      res.json({ success: true, message: 'A reset link has been sent to your recovery email address' });
    } catch (err) {
      console.error('Password reset request error:', err);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const resetToken = this.userManager.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Update password
      await this.userManager.updatePassword(resetToken.user_id, newPassword);

      // Mark token as used
      this.userManager.markPasswordResetTokenAsUsed(token);

      res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
      console.error('Password reset error:', err);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  // MFA Methods
  async verifyMFALogin(req, res) {
    try {
      const { mfaToken, code, backupCode } = req.body;

      if (!mfaToken || (!code && !backupCode)) {
        return res.status(400).json({ error: 'MFA token and code required' });
      }

      // Verify MFA token
      let decoded;
      try {
        decoded = jwt.verify(mfaToken, this.config.jwtSecret);
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired MFA token' });
      }

      if (!decoded.mfaPending) {
        return res.status(401).json({ error: 'Invalid MFA token' });
      }

      const user = this.userManager.getUserById(decoded.userId);

      if (!user || !user.mfa_enabled) {
        return res.status(401).json({ error: 'MFA not enabled for this account' });
      }

      let verified = false;

      // Try backup code first if provided
      if (backupCode) {
        verified = this.userManager.useBackupCode(user.id, backupCode);
      } else if (code) {
        // Verify TOTP code
        verified = speakeasy.totp.verify({
          secret: user.mfa_secret,
          encoding: 'base32',
          token: code,
          window: 2
        });
      }

      if (!verified) {
        return res.status(401).json({ error: 'Invalid verification code' });
      }

      // Issue regular token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        this.config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isAdmin: user.is_admin,
          mfaEnabled: true
        }
      });
    } catch (err) {
      console.error('MFA verification error:', err);
      res.status(500).json({ error: 'Failed to verify MFA' });
    }
  }

  async setupMFA(req, res) {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `MazzLabs Mail (${req.user.email})`,
        issuer: 'MazzLabs Mail'
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);

      // Store secret temporarily in session (in production, use session store)
      // For now, return it to client to send back on verification
      res.json({
        secret: secret.base32,
        qrCode
      });
    } catch (err) {
      console.error('MFA setup error:', err);
      res.status(500).json({ error: 'Failed to setup MFA' });
    }
  }

  async verifyMFASetup(req, res) {
    try {
      const { secret, code } = req.body;

      if (!secret || !code) {
        return res.status(400).json({ error: 'Secret and code required' });
      }

      // Verify the code
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!verified) {
        return res.status(401).json({ error: 'Invalid verification code' });
      }

      // Generate backup codes
      const backupCodes = [];
      for (let i = 0; i < 10; i++) {
        backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
      }

      // Enable MFA for user
      this.userManager.enableMFA(req.user.id, secret);
      this.userManager.setBackupCodes(req.user.id, backupCodes);

      res.json({
        success: true,
        message: 'MFA enabled successfully',
        backupCodes
      });
    } catch (err) {
      console.error('MFA verification error:', err);
      res.status(500).json({ error: 'Failed to verify MFA setup' });
    }
  }

  async disableMFA(req, res) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Password required to disable MFA' });
      }

      // Verify password
      const isValid = await this.userManager.verifyPassword(req.user.email, password);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      this.userManager.disableMFA(req.user.id);

      res.json({ success: true, message: 'MFA disabled successfully' });
    } catch (err) {
      console.error('MFA disable error:', err);
      res.status(500).json({ error: 'Failed to disable MFA' });
    }
  }

  // Recovery Options Methods
  async setRecoveryEmail(req, res) {
    try {
      const { recoveryEmail, password } = req.body;

      if (!recoveryEmail) {
        return res.status(400).json({ error: 'Recovery email required' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Password required to set recovery email' });
      }

      // Verify password
      const isValid = await this.userManager.verifyPassword(req.user.email, password);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recoveryEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      this.userManager.setRecoveryEmail(req.user.id, recoveryEmail);

      res.json({ success: true, message: 'Recovery email set successfully' });
    } catch (err) {
      console.error('Set recovery email error:', err);
      res.status(500).json({ error: 'Failed to set recovery email' });
    }
  }

  async setPhoneNumber(req, res) {
    try {
      const { phoneNumber, password } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number required' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Password required to set phone number' });
      }

      // Verify password
      const isValid = await this.userManager.verifyPassword(req.user.email, password);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      this.userManager.setPhoneNumber(req.user.id, phoneNumber);

      res.json({ success: true, message: 'Phone number set successfully' });
    } catch (err) {
      console.error('Set phone number error:', err);
      res.status(500).json({ error: 'Failed to set phone number' });
    }
  }

  // Admin Methods
  requireAdmin(req, res, next) {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  }

  async getAllUsersAdmin(req, res) {
    try {
      const users = this.userManager.getAllUsers();

      // Add recovery email and phone number to response
      const usersWithDetails = users.map(user => {
        const fullUser = this.userManager.getUserById(user.id);
        return {
          ...user,
          recoveryEmail: fullUser.recovery_email || null,
          phoneNumber: fullUser.phone_number || null,
          mfaEnabled: fullUser.mfa_enabled || false
        };
      });

      res.json({ users: usersWithDetails });
    } catch (err) {
      console.error('Get all users error:', err);
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  }

  async adminResetPassword(req, res) {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ error: 'New password required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const user = this.userManager.getUserById(parseInt(userId));

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await this.userManager.adminResetPassword(parseInt(userId), newPassword);

      res.json({
        success: true,
        message: `Password reset successfully for ${user.email}`
      });
    } catch (err) {
      console.error('Admin password reset error:', err);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  start() {
    this.app.listen(this.config.port, () => {
      console.log(`API server listening on port ${this.config.port}`);
    });
  }
}
