import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class APIServer {
  constructor(emailManager, userManager, config) {
    this.app = express();
    this.emailManager = emailManager;
    this.userManager = userManager;
    this.config = config;

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(helmet({
      contentSecurityPolicy: false
    }));
    this.app.use(cors());
    this.app.use(express.json());

    // Serve static files from client/dist
    const clientPath = path.join(__dirname, '../../client/dist');
    this.app.use(express.static(clientPath));
  }

  setupRoutes() {
    // Auth routes
    this.app.post('/api/auth/login', this.login.bind(this));
    this.app.post('/api/auth/register', this.register.bind(this));

    // Protected routes
    this.app.use('/api/*', this.authenticate.bind(this));

    // User routes
    this.app.get('/api/users/me', this.getCurrentUser.bind(this));
    this.app.get('/api/users', this.getUsers.bind(this));

    // Mailbox routes
    this.app.get('/api/mailboxes', this.getMailboxes.bind(this));

    // Email routes
    this.app.get('/api/emails', this.getEmails.bind(this));
    this.app.get('/api/emails/:id', this.getEmail.bind(this));
    this.app.post('/api/emails/send', this.sendEmail.bind(this));
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
          isAdmin: user.is_admin
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async register(req, res) {
    try {
      const { email, password } = req.body;

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
      storageQuota: req.user.storage_quota
    });
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

    res.json(email);
  }

  async sendEmail(req, res) {
    try {
      const { to, subject, text, html } = req.body;

      if (!to || (!text && !html)) {
        return res.status(400).json({ error: 'To and content required' });
      }

      // Create nodemailer transport using our SMTP server
      const transporter = nodemailer.createTransport({
        host: 'localhost',
        port: this.config.smtpPort,
        secure: false,
        auth: {
          user: req.user.email,
          pass: req.body.password // User needs to provide password for sending
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

  start() {
    this.app.listen(this.config.port, () => {
      console.log(`API server listening on port ${this.config.port}`);
    });
  }
}
