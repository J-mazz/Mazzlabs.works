import bcrypt from 'bcrypt';

export class UserManager {
  constructor(db) {
    this.db = db;
  }

  async createUser(email, password, isAdmin = false) {
    const username = email.split('@')[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = this.db.prepare(`
      INSERT INTO users (email, username, password, is_admin)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(email, username, hashedPassword, isAdmin ? 1 : 0);

    // Create default mailboxes
    this.createDefaultMailboxes(result.lastInsertRowid);

    return result.lastInsertRowid;
  }

  createDefaultMailboxes(userId) {
    const mailboxes = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam'];
    const stmt = this.db.prepare(`
      INSERT INTO mailboxes (user_id, name) VALUES (?, ?)
    `);

    for (const mailbox of mailboxes) {
      stmt.run(userId, mailbox);
    }
  }

  async verifyPassword(email, password) {
    const user = this.getUserByEmail(email);
    if (!user) return false;

    return await bcrypt.compare(password, user.password);
  }

  async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const stmt = this.db.prepare('UPDATE users SET password = ? WHERE id = ?');
    return stmt.run(hashedPassword, userId);
  }

  getUserByEmail(email) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  getUserById(id) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  getAllUsers() {
    const stmt = this.db.prepare('SELECT id, email, username, created_at, is_admin, storage_quota, storage_used FROM users');
    return stmt.all();
  }

  updateStorageUsed(userId, size) {
    const stmt = this.db.prepare(`
      UPDATE users SET storage_used = storage_used + ? WHERE id = ?
    `);
    stmt.run(size, userId);
  }

  deleteUser(userId) {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(userId);
  }

  // Password Reset Methods
  createPasswordResetToken(userId, token, expiresAt) {
    const stmt = this.db.prepare(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `);
    return stmt.run(userId, token, expiresAt);
  }

  getPasswordResetToken(token) {
    const stmt = this.db.prepare(`
      SELECT * FROM password_reset_tokens
      WHERE token = ? AND used = 0 AND expires_at > datetime('now')
    `);
    return stmt.get(token);
  }

  markPasswordResetTokenAsUsed(token) {
    const stmt = this.db.prepare(`
      UPDATE password_reset_tokens SET used = 1 WHERE token = ?
    `);
    return stmt.run(token);
  }

  // MFA Methods
  enableMFA(userId, secret) {
    const stmt = this.db.prepare(`
      UPDATE users SET mfa_enabled = 1, mfa_secret = ? WHERE id = ?
    `);
    return stmt.run(secret, userId);
  }

  disableMFA(userId) {
    const stmt = this.db.prepare(`
      UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, backup_codes = NULL WHERE id = ?
    `);
    return stmt.run(userId);
  }

  setBackupCodes(userId, codes) {
    const stmt = this.db.prepare(`
      UPDATE users SET backup_codes = ? WHERE id = ?
    `);
    return stmt.run(JSON.stringify(codes), userId);
  }

  getBackupCodes(userId) {
    const user = this.getUserById(userId);
    if (!user || !user.backup_codes) return [];
    return JSON.parse(user.backup_codes);
  }

  useBackupCode(userId, code) {
    const codes = this.getBackupCodes(userId);
    const index = codes.indexOf(code);
    if (index === -1) return false;

    codes.splice(index, 1);
    this.setBackupCodes(userId, codes);
    return true;
  }

  // Recovery Methods
  setRecoveryEmail(userId, recoveryEmail) {
    const stmt = this.db.prepare(`
      UPDATE users SET recovery_email = ? WHERE id = ?
    `);
    return stmt.run(recoveryEmail, userId);
  }

  setPhoneNumber(userId, phoneNumber) {
    const stmt = this.db.prepare(`
      UPDATE users SET phone_number = ? WHERE id = ?
    `);
    return stmt.run(phoneNumber, userId);
  }

  getUserByRecoveryEmail(recoveryEmail) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE recovery_email = ?');
    return stmt.get(recoveryEmail);
  }

  // Admin Methods
  async adminResetPassword(userId, newPassword) {
    return await this.updatePassword(userId, newPassword);
  }
}
