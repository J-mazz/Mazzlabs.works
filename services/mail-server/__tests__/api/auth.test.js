import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { APIServer } from '../../src/api/server.js';
import { setupTestDatabase, cleanupTestDatabase, createTestUser } from '../helpers/testDb.js';

describe('Authentication API', () => {
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

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully with @mazzlabs.works domain', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@mazzlabs.works',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'newuser@mazzlabs.works');
    });

    test('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'short',
          username: 'newuser'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject non-mazzlabs.works domains', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@external.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('@mazzlabs.works');
    });

    test('should reject duplicate email registration', async () => {
      await createTestUser(userManager, 'existing@mazzlabs.works', 'password123');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@mazzlabs.works',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createTestUser(userManager, 'testuser@test.com', 'password123');
    });

    test('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'testuser@test.com');
    });

    test('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@test.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
