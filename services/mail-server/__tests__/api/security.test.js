import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { APIServer } from '../../src/api/server.js';
import { setupTestDatabase, cleanupTestDatabase, createTestUser } from '../helpers/testDb.js';

describe('Security Headers and Configuration', () => {
  let server;
  let app;
  let db;
  let userManager;
  let emailManager;
  let testDbPath;
  let authToken;

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

    await createTestUser(userManager, 'testuser@test.com', 'password123');

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

  describe('Helmet security headers', () => {
    test('should set Content-Security-Policy header', async () => {
      const response = await request(app)
        .get('/api/mailboxes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    test('should set X-Content-Type-Options header', async () => {
      const response = await request(app)
        .get('/api/mailboxes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    });

    test('should set X-Frame-Options header', async () => {
      const response = await request(app)
        .get('/api/mailboxes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers).toHaveProperty('x-frame-options');
    });

    test('should set Strict-Transport-Security header', async () => {
      const response = await request(app)
        .get('/api/mailboxes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers).toHaveProperty('strict-transport-security');
    });
  });

  describe('Authentication and Authorization', () => {
    test('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/mailboxes');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/mailboxes')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    test('should reject requests with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/mailboxes')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    test('should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/api/mailboxes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Admin-only routes', () => {
    let adminToken;

    beforeEach(async () => {
      await createTestUser(userManager, 'admin@test.com', 'password123', true);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        });

      adminToken = loginResponse.body.token;
    });

    test('should allow admin to access user list', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should deny non-admin access to user list', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Forbidden');
    });
  });

  describe('Password change security', () => {
    test('should require current password for password change', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(400);
    });

    test('should verify current password before allowing change', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('incorrect');
    });

    test('should enforce minimum password length', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 characters');
    });

    test('should successfully change password with valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@test.com',
          password: 'newpassword123'
        });

      expect(loginResponse.status).toBe(200);
    });
  });

  describe('CORS configuration', () => {
    test('should set CORS headers', async () => {
      const response = await request(app)
        .get('/api/mailboxes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});
