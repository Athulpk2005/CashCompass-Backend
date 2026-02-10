const request = require('supertest');
const app = require('../server');

describe('API Routes', () => {
  describe('Health Check', () => {
    it('GET /api/health should return health status', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('message', 'CashCompass API is running');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Authentication Routes', () => {
    it('POST /api/auth/register should reject empty body', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
    });

    it('POST /api/auth/login should reject empty body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });

    it('POST /api/auth/register should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'not-an-email',
          password: 'Password123'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('POST /api/auth/register should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
    });

    it('POST /api/auth/register should accept valid registration data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: `test${Date.now()}@example.com`,
          password: 'Test@123'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('email');
    });
  });

  describe('Protected Routes Without Auth', () => {
    it('GET /api/transactions should require authentication', async () => {
      const res = await request(app).get('/api/transactions');

      expect(res.status).toBe(401);
    });

    it('GET /api/goals should require authentication', async () => {
      const res = await request(app).get('/api/goals');

      expect(res.status).toBe(401);
    });

    it('GET /api/investments should require authentication', async () => {
      const res = await request(app).get('/api/investments');

      expect(res.status).toBe(401);
    });

    it('GET /api/reports/summary should require authentication', async () => {
      const res = await request(app).get('/api/reports/summary');

      expect(res.status).toBe(401);
    });
  });

  describe('Transaction Routes Validation', () => {
    let authToken;

    beforeAll(async () => {
      // Register and get token
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Transaction Test User',
          email: `transactiontest${Date.now()}@example.com`,
          password: 'Test@123'
        });
      authToken = res.body.token;
    });

    it('POST /api/transactions should validate transaction type', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid_type',
          amount: 100,
          category: 'Test'
        });

      expect(res.status).toBe(400);
    });

    it('POST /api/transactions should validate amount is positive', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'income',
          amount: -100,
          category: 'Test'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Goal Routes Validation', () => {
    let authToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Goal Test User',
          email: `goaltest${Date.now()}@example.com`,
          password: 'Test@123'
        });
      authToken = res.body.token;
    });

    it('POST /api/goals should require name', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetAmount: 10000,
          deadline: '2025-12-31'
        });

      expect(res.status).toBe(400);
    });

    it('POST /api/goals should validate target amount', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Goal',
          targetAmount: -1000,
          deadline: '2025-12-31'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Investment Routes Validation', () => {
    let authToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Investment Test User',
          email: `investmenttest${Date.now()}@example.com`,
          password: 'Test@123'
        });
      authToken = res.body.token;
    });

    it('POST /api/investments should validate investment type', async () => {
      const res = await request(app)
        .post('/api/investments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Investment',
          type: 'invalid_type',
          investedAmount: 1000
        });

      expect(res.status).toBe(400);
    });

    it('POST /api/investments should validate amount is positive', async () => {
      const res = await request(app)
        .post('/api/investments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Investment',
          type: 'stock',
          investedAmount: -1000
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Password Change Validation', () => {
    let authToken;
    let testUserEmail;

    beforeAll(async () => {
      const timestamp = Date.now();
      testUserEmail = `passwordtest${timestamp}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Password Test User',
          email: testUserEmail,
          password: 'OldPassword@123'
        });
      authToken = res.body.token;
    });

    it('PUT /api/auth/password should require current password', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: '',
          newPassword: 'NewPassword@123'
        });

      expect(res.status).toBe(400);
    });

    it('PUT /api/auth/password should require new password to be at least 6 characters', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'OldPassword@123',
          newPassword: '123'
        });

      expect(res.status).toBe(400);
    });

    it('PUT /api/auth/password should reject same password', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'OldPassword@123',
          newPassword: 'OldPassword@123'
        });

      expect(res.status).toBe(400);
    });

    it('PUT /api/auth/password should reject incorrect current password', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword@123',
          newPassword: 'NewPassword@456'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Current password is incorrect');
    });
  });

  describe('Report Routes Validation', () => {
    let authToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Report Test User',
          email: `reporttest${Date.now()}@example.com`,
          password: 'Test@123'
        });
      authToken = res.body.token;
    });

    it('GET /api/reports/summary should validate date format', async () => {
      const res = await request(app)
        .get('/api/reports/summary?startDate=invalid-date')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });

    it('GET /api/reports/summary should accept valid date format', async () => {
      const res = await request(app)
        .get('/api/reports/summary?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });
});
