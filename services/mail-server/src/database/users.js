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
}
