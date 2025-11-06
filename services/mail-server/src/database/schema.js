import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initDatabase(dbPath) {
  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_admin BOOLEAN DEFAULT 0,
      storage_quota INTEGER DEFAULT 1073741824,
      storage_used INTEGER DEFAULT 0
    )
  `);

  // Emails table
  db.exec(`
    CREATE TABLE IF NOT EXISTS emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      mailbox TEXT DEFAULT 'INBOX',
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      cc TEXT,
      bcc TEXT,
      subject TEXT,
      body_text TEXT,
      body_html TEXT,
      headers TEXT,
      attachments TEXT,
      size INTEGER DEFAULT 0,
      is_read BOOLEAN DEFAULT 0,
      is_flagged BOOLEAN DEFAULT 0,
      is_deleted BOOLEAN DEFAULT 0,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Mailboxes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mailboxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Password reset tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Add MFA columns to users table if they don't exist
  try {
    db.exec('ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT 0');
  } catch (err) {
    // Column already exists, ignore
  }

  try {
    db.exec('ALTER TABLE users ADD COLUMN mfa_secret TEXT');
  } catch (err) {
    // Column already exists, ignore
  }

  try {
    db.exec('ALTER TABLE users ADD COLUMN backup_codes TEXT');
  } catch (err) {
    // Column already exists, ignore
  }

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
    CREATE INDEX IF NOT EXISTS idx_emails_mailbox ON emails(mailbox);
    CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);
    CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
  `);

  return db;
}
