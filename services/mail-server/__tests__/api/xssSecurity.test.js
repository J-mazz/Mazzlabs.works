import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { APIServer } from '../../src/api/server.js';
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestEmail } from '../helpers/testDb.js';

describe('XSS Security', () => {
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

    // Create test user and get auth token
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

  describe('Email HTML sanitization', () => {
    test('should sanitize malicious script tags in email HTML', async () => {
      const maliciousHtml = '<p>Hello</p><script>alert("XSS")</script>';

      const sendResponse = await request(app)
        .post('/api/emails/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'recipient@test.com',
          subject: 'Test Email',
          html: maliciousHtml
        });

      expect(sendResponse.status).toBe(200);

      // Get the sent email
      const emailsResponse = await request(app)
        .get('/api/emails?mailbox=Sent')
        .set('Authorization', `Bearer ${authToken}`);

      const sentEmail = emailsResponse.body[0];

      // Retrieve the full email
      const emailResponse = await request(app)
        .get(`/api/emails/${sentEmail.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Script tag should be removed
      expect(emailResponse.body.body_html).not.toContain('<script>');
      expect(emailResponse.body.body_html).toContain('<p>Hello</p>');
    });

    test('should sanitize onclick event handlers', async () => {
      const maliciousHtml = '<a href="#" onclick="alert(\'XSS\')">Click me</a>';

      await request(app)
        .post('/api/emails/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'recipient@test.com',
          subject: 'Test Email',
          html: maliciousHtml
        });

      const emailsResponse = await request(app)
        .get('/api/emails?mailbox=Sent')
        .set('Authorization', `Bearer ${authToken}`);

      const sentEmail = emailsResponse.body[0];

      const emailResponse = await request(app)
        .get(`/api/emails/${sentEmail.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // onclick should be removed
      expect(emailResponse.body.body_html).not.toContain('onclick');
    });

    test('should sanitize iframe tags', async () => {
      const maliciousHtml = '<p>Content</p><iframe src="https://evil.com"></iframe>';

      await request(app)
        .post('/api/emails/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'recipient@test.com',
          subject: 'Test Email',
          html: maliciousHtml
        });

      const emailsResponse = await request(app)
        .get('/api/emails?mailbox=Sent')
        .set('Authorization', `Bearer ${authToken}`);

      const sentEmail = emailsResponse.body[0];

      const emailResponse = await request(app)
        .get(`/api/emails/${sentEmail.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // iframe should be removed
      expect(emailResponse.body.body_html).not.toContain('<iframe');
    });

    test('should allow safe HTML tags', async () => {
      const safeHtml = '<p>Hello <strong>world</strong></p><a href="https://example.com">Link</a>';

      await request(app)
        .post('/api/emails/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'recipient@test.com',
          subject: 'Test Email',
          html: safeHtml
        });

      const emailsResponse = await request(app)
        .get('/api/emails?mailbox=Sent')
        .set('Authorization', `Bearer ${authToken}`);

      const sentEmail = emailsResponse.body[0];

      const emailResponse = await request(app)
        .get(`/api/emails/${sentEmail.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Safe tags should remain
      expect(emailResponse.body.body_html).toContain('<p>');
      expect(emailResponse.body.body_html).toContain('<strong>');
      expect(emailResponse.body.body_html).toContain('<a');
    });

    test('should handle email retrieval with malicious content stored before sanitization', async () => {
      // Directly insert email with malicious content
      createTestEmail(emailManager, userId, {
        from: 'sender@test.com',
        to: 'testuser@test.com',
        subject: 'Malicious Email',
        text: 'Text content',
        html: '<script>alert("XSS")</script><p>Content</p>',
        mailbox: 'INBOX'
      });

      const emailsResponse = await request(app)
        .get('/api/emails?mailbox=INBOX')
        .set('Authorization', `Bearer ${authToken}`);

      const email = emailsResponse.body[0];

      const emailResponse = await request(app)
        .get(`/api/emails/${email.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Script should be sanitized on retrieval
      expect(emailResponse.body.body_html).not.toContain('<script>');
    });
  });
});
