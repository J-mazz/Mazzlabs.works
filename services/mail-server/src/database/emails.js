export class EmailManager {
  constructor(db) {
    this.db = db;
  }

  saveEmail(userId, emailData) {
    const stmt = this.db.prepare(`
      INSERT INTO emails (
        message_id, user_id, mailbox, from_address, to_address,
        cc, bcc, subject, body_text, body_html, headers, attachments, size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      emailData.messageId,
      userId,
      emailData.mailbox || 'INBOX',
      emailData.from,
      emailData.to,
      emailData.cc || null,
      emailData.bcc || null,
      emailData.subject || '',
      emailData.text || '',
      emailData.html || '',
      JSON.stringify(emailData.headers || {}),
      JSON.stringify(emailData.attachments || []),
      emailData.size || 0
    );

    return result.lastInsertRowid;
  }

  getEmailsByMailbox(userId, mailbox = 'INBOX', limit = 50, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT * FROM emails
      WHERE user_id = ? AND mailbox = ? AND is_deleted = 0
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(userId, mailbox, limit, offset);
  }

  getEmailById(emailId, userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM emails WHERE id = ? AND user_id = ?
    `);

    return stmt.get(emailId, userId);
  }

  markAsRead(emailId, userId) {
    const stmt = this.db.prepare(`
      UPDATE emails SET is_read = 1 WHERE id = ? AND user_id = ?
    `);

    return stmt.run(emailId, userId);
  }

  markAsUnread(emailId, userId) {
    const stmt = this.db.prepare(`
      UPDATE emails SET is_read = 0 WHERE id = ? AND user_id = ?
    `);

    return stmt.run(emailId, userId);
  }

  flagEmail(emailId, userId) {
    const stmt = this.db.prepare(`
      UPDATE emails SET is_flagged = 1 WHERE id = ? AND user_id = ?
    `);

    return stmt.run(emailId, userId);
  }

  unflagEmail(emailId, userId) {
    const stmt = this.db.prepare(`
      UPDATE emails SET is_flagged = 0 WHERE id = ? AND user_id = ?
    `);

    return stmt.run(emailId, userId);
  }

  moveEmail(emailId, userId, toMailbox) {
    const stmt = this.db.prepare(`
      UPDATE emails SET mailbox = ? WHERE id = ? AND user_id = ?
    `);

    return stmt.run(toMailbox, emailId, userId);
  }

  deleteEmail(emailId, userId) {
    const stmt = this.db.prepare(`
      UPDATE emails SET is_deleted = 1, mailbox = 'Trash' WHERE id = ? AND user_id = ?
    `);

    return stmt.run(emailId, userId);
  }

  permanentlyDeleteEmail(emailId, userId) {
    const stmt = this.db.prepare(`
      DELETE FROM emails WHERE id = ? AND user_id = ?
    `);

    return stmt.run(emailId, userId);
  }

  searchEmails(userId, query, mailbox = null) {
    let sql = `
      SELECT * FROM emails
      WHERE user_id = ? AND is_deleted = 0
      AND (subject LIKE ? OR body_text LIKE ? OR from_address LIKE ? OR to_address LIKE ?)
    `;

    const searchTerm = `%${query}%`;
    const params = [userId, searchTerm, searchTerm, searchTerm, searchTerm];

    if (mailbox) {
      sql += ' AND mailbox = ?';
      params.push(mailbox);
    }

    sql += ' ORDER BY received_at DESC LIMIT 100';

    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  getMailboxes(userId) {
    const stmt = this.db.prepare(`
      SELECT m.name, COUNT(e.id) as count,
             SUM(CASE WHEN e.is_read = 0 THEN 1 ELSE 0 END) as unread
      FROM mailboxes m
      LEFT JOIN emails e ON m.user_id = e.user_id AND m.name = e.mailbox AND e.is_deleted = 0
      WHERE m.user_id = ?
      GROUP BY m.name
      ORDER BY m.id
    `);

    return stmt.all(userId);
  }
}
