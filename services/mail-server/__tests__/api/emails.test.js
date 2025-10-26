import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { APIServer } from '../../src/api/server.js';
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestEmail } from '../helpers/testDb.js';

describe('Email Operations', () => {
  let server;
  let app;
  let db;
  let userManager;
  let emailManager;
  let testDbPath;
  let authToken;
  let userId;

  beforeEach(async () => {
    const setup = setupTestDatabase();
    db = setup.db;
    userManager = setup.userManager;
    emailManager = setup.emailManager;
    testDbPath = setup.testDbPath;

    const config = {
      port: 3001,
      smtpPort: 25,
      jwtSecret: 'test-secret',
      domain: 'test.local',
      hostname: 'mail.test.local'
    };

    server = new APIServer(emailManager, userManager, config);
    app = server.app;

    const user = await createTestUser(userManager, 'testuser@test.com', 'password123');
    userId = user.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@test.com',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(() => {
    cleanupTestDatabase(testDbPath);
  });

  describe('GET /api/mailboxes', () => {
    test('should return user mailboxes', async () => {
      const response = await request(app)
        .get('/api/mailboxes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/mailboxes');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/emails', () => {
    beforeEach(() => {
      // Add some test emails
      for (let i = 0; i < 3; i++) {
        emailManager.storeEmail({
          user_id: userId,
          from_address: `sender${i}@test.com`,
          to_address: 'testuser@test.com',
          subject: `Test Email ${i}`,
          body_text: `Body ${i}`,
          body_html: `<p>Body ${i}</p>`,
          mailbox: 'INBOX',
          size: 100,
          received_at: new Date().toISOString()
        });
      }
    });

    test('should return emails from INBOX', async () => {
      const response = await request(app)
        .get('/api/emails?mailbox=INBOX')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
    });

    test('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/api/emails?mailbox=INBOX&limit=2&offset=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/emails/:id', () => {
    let emailId;

    beforeEach(() => {
      emailManager.storeEmail({
        user_id: userId,
        from_address: 'sender@test.com',
        to_address: 'testuser@test.com',
        subject: 'Test Email',
        body_text: 'Test body',
        body_html: '<p>Test body</p>',
        mailbox: 'INBOX',
        size: 100,
        received_at: new Date().toISOString()
      });

      const emails = emailManager.getEmailsByMailbox(userId, 'INBOX', 1, 0);
      emailId = emails[0].id;
    });

    test('should return specific email by id', async () => {
      const response = await request(app)
        .get(`/api/emails/${emailId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subject', 'Test Email');
      expect(response.body).toHaveProperty('body_text', 'Test body');
    });

    test('should return 404 for non-existent email', async () => {
      const response = await request(app)
        .get('/api/emails/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    test('should not allow accessing other users emails', async () => {
      // Create another user
      const otherUser = await createTestUser(userManager, 'other@test.com', 'password123');

      // Create email for other user
      emailManager.storeEmail({
        user_id: otherUser.id,
        from_address: 'sender@test.com',
        to_address: 'other@test.com',
        subject: 'Private Email',
        body_text: 'Private content',
        body_html: '<p>Private content</p>',
        mailbox: 'INBOX',
        size: 100,
        received_at: new Date().toISOString()
      });

      const otherEmails = emailManager.getEmailsByMailbox(otherUser.id, 'INBOX', 1, 0);
      const otherEmailId = otherEmails[0].id;

      // Try to access with first user's token
      const response = await request(app)
        .get(`/api/emails/${otherEmailId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/emails/:id/read', () => {
    let emailId;

    beforeEach(() => {
      emailManager.storeEmail({
        user_id: userId,
        from_address: 'sender@test.com',
        to_address: 'testuser@test.com',
        subject: 'Test Email',
        body_text: 'Test body',
        body_html: '<p>Test body</p>',
        mailbox: 'INBOX',
        size: 100,
        received_at: new Date().toISOString()
      });

      const emails = emailManager.getEmailsByMailbox(userId, 'INBOX', 1, 0);
      emailId = emails[0].id;
    });

    test('should mark email as read', async () => {
      const response = await request(app)
        .put(`/api/emails/${emailId}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('PUT /api/emails/:id/flag', () => {
    let emailId;

    beforeEach(() => {
      emailManager.storeEmail({
        user_id: userId,
        from_address: 'sender@test.com',
        to_address: 'testuser@test.com',
        subject: 'Test Email',
        body_text: 'Test body',
        body_html: '<p>Test body</p>',
        mailbox: 'INBOX',
        size: 100,
        received_at: new Date().toISOString()
      });

      const emails = emailManager.getEmailsByMailbox(userId, 'INBOX', 1, 0);
      emailId = emails[0].id;
    });

    test('should flag email', async () => {
      const response = await request(app)
        .put(`/api/emails/${emailId}/flag`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('PUT /api/emails/:id/move', () => {
    let emailId;

    beforeEach(() => {
      emailManager.storeEmail({
        user_id: userId,
        from_address: 'sender@test.com',
        to_address: 'testuser@test.com',
        subject: 'Test Email',
        body_text: 'Test body',
        body_html: '<p>Test body</p>',
        mailbox: 'INBOX',
        size: 100,
        received_at: new Date().toISOString()
      });

      const emails = emailManager.getEmailsByMailbox(userId, 'INBOX', 1, 0);
      emailId = emails[0].id;
    });

    test('should move email to different mailbox', async () => {
      const response = await request(app)
        .put(`/api/emails/${emailId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mailbox: 'Archive' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should reject move without mailbox parameter', async () => {
      const response = await request(app)
        .put(`/api/emails/${emailId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/emails/:id', () => {
    let emailId;

    beforeEach(() => {
      emailManager.storeEmail({
        user_id: userId,
        from_address: 'sender@test.com',
        to_address: 'testuser@test.com',
        subject: 'Test Email',
        body_text: 'Test body',
        body_html: '<p>Test body</p>',
        mailbox: 'INBOX',
        size: 100,
        received_at: new Date().toISOString()
      });

      const emails = emailManager.getEmailsByMailbox(userId, 'INBOX', 1, 0);
      emailId = emails[0].id;
    });

    test('should delete email', async () => {
      const response = await request(app)
        .delete(`/api/emails/${emailId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/emails/search', () => {
    beforeEach(() => {
      emailManager.storeEmail({
        user_id: userId,
        from_address: 'sender@test.com',
        to_address: 'testuser@test.com',
        subject: 'Important Meeting',
        body_text: 'Meeting at 3pm',
        body_html: '<p>Meeting at 3pm</p>',
        mailbox: 'INBOX',
        size: 100,
        received_at: new Date().toISOString()
      });

      emailManager.storeEmail({
        user_id: userId,
        from_address: 'other@test.com',
        to_address: 'testuser@test.com',
        subject: 'Lunch Plans',
        body_text: 'Lunch tomorrow',
        body_html: '<p>Lunch tomorrow</p>',
        mailbox: 'INBOX',
        size: 100,
        received_at: new Date().toISOString()
      });
    });

    test('should search emails by query', async () => {
      const response = await request(app)
        .get('/api/emails/search?q=Meeting')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should require search query parameter', async () => {
      const response = await request(app)
        .get('/api/emails/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });
});
