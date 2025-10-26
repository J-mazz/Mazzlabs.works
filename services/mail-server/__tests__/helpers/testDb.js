import { initDatabase } from '../../src/database/schema.js';
import { UserManager } from '../../src/database/users.js';
import { EmailManager } from '../../src/database/emails.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export function setupTestDatabase() {
  const randomId = crypto.randomBytes(8).toString('hex');
  const testDbPath = path.join(process.cwd(), `test-mail-${randomId}.db`);

  // Remove existing test database if it exists
  try {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch (err) {
    // Ignore errors during cleanup
  }

  const db = initDatabase(testDbPath);
  const userManager = new UserManager(db);
  const emailManager = new EmailManager(db);

  return { db, userManager, emailManager, testDbPath };
}

export function cleanupTestDatabase(testDbPath) {
  try {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Also cleanup WAL files
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

export async function createTestUser(userManager, email = 'test@example.com', password = 'testpass123', isAdmin = false) {
  await userManager.createUser(email, password, isAdmin);
  return userManager.getUserByEmail(email);
}

export function createTestEmail(emailManager, userId, options = {}) {
  const emailData = {
    messageId: options.messageId || `test-${Date.now()}@test.local`,
    from: options.from || 'sender@test.com',
    to: options.to || 'recipient@test.com',
    subject: options.subject || 'Test Subject',
    text: options.text || 'Test body',
    html: options.html || '<p>Test body</p>',
    mailbox: options.mailbox || 'INBOX',
    size: options.size || 100,
    headers: options.headers || {},
    attachments: options.attachments || []
  };

  return emailManager.saveEmail(userId, emailData);
}
