import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { APIServer } from '../../src/api/server.js';
import { setupTestDatabase, cleanupTestDatabase, createTestUser } from '../helpers/testDb.js';

describe('Rate Limiting', () => {
  let server;
  let app;
  let db;
  let userManager;
  let emailManager;
  let testDbPath;

  beforeEach(() => {
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
  });

  afterEach(() => {
    cleanupTestDatabase(testDbPath);
  });

  describe('Login rate limiting', () => {
    test('should allow initial login attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });

    test('should enforce rate limit after multiple failed attempts', async () => {
      // Make 5 failed login attempts (the limit)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@test.com',
            password: 'wrongpassword'
          });
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error', 'Too many requests');
      expect(response.body).toHaveProperty('retryAfter');
    });
  });

  describe('Registration rate limiting', () => {
    test('should enforce rate limit on registration', async () => {
      // Make 5 registration attempts (the limit)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({
            email: `user${i}@test.com`,
            password: 'password123',
            username: `user${i}`
          });
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user6@test.com',
          password: 'password123',
          username: 'user6'
        });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error', 'Too many requests');
    });
  });

  describe('Password change rate limiting', () => {
    let authToken;

    beforeEach(async () => {
      await createTestUser(userManager, 'testuser@test.com', 'password123');

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@test.com',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    test('should enforce rate limit on password changes', async () => {
      // Make 3 password change attempts (the limit)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/users/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: 'wrongpassword',
            newPassword: 'newpassword123'
          });
      }

      // 4th attempt should be rate limited
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error', 'Too many requests');
    });
  });
});
