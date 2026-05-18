const request = require('supertest');

jest.mock('../../src/db', () => ({
  query: jest.fn(),
  ensureSchema: jest.fn(),
}));

const pool = require('../../src/db');
const app = require('../../src/app');

describe('API integration', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('GET /health returns 200 when database is connected', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ok: 1 }] });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('connected');
  });

  test('GET /health returns 503 when database is disconnected', async () => {
    pool.query.mockRejectedValueOnce(new Error('connection refused'));

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('error');
  });

  test('POST /calculate returns the four buckets and projection', async () => {
    const response = await request(app)
      .post('/calculate')
      .send({ grossSalary: 10000, bankNet: 7000, years: 3 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      grossSalary: 10000,
      bankNet: 7000,
      fixedCosts: 3850,
      savingsGoals: 700,
      activeInvestments: 700,
      guiltFreeSpending: 1925,
    });
    expect(response.body.wealthProjection).toHaveLength(3);
  });

  test('POST /calculate validates salary input', async () => {
    const response = await request(app)
      .post('/calculate')
      .send({ grossSalary: -1 });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('grossSalary');
  });

  test('POST /calculate rejects bank net higher than gross salary', async () => {
    const response = await request(app)
      .post('/calculate')
      .send({ grossSalary: 10000, bankNet: 12000, years: 3 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('bankNet cannot be higher than grossSalary');
  });

  test('POST /calculate/profiles persists a financial profile and spending plan', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: 42,
          name: 'Roi',
          gross_salary: '10000.00',
          bank_net: '7000.00',
          created_at: '2026-05-18T10:00:00.000Z',
          updated_at: '2026-05-18T10:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 99,
          profile_id: 42,
          fixed_costs: '3850.00',
          savings_goals: '700.00',
          active_investments: '700.00',
          guilt_free_spending: '1925.00',
          wealth_projection: [{ year: 1, value: 749 }],
          created_at: '2026-05-18T10:00:00.000Z',
        }],
      });

    const response = await request(app)
      .post('/calculate/profiles')
      .send({ name: 'Roi', grossSalary: 10000, bankNet: 7000, years: 1 });

    expect(response.status).toBe(201);
    expect(response.body.profile.id).toBe(42);
    expect(response.body.calculation.activeInvestments).toBe(700);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test('POST /calculate/profiles rejects duplicate profile names', async () => {
    pool.query.mockRejectedValueOnce({ code: '23505' });

    const response = await request(app)
      .post('/calculate/profiles')
      .send({ name: 'Roi', grossSalary: 10000, bankNet: 7000, years: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('profile name already exists');
  });

  test('GET /calculate/profiles/:id loads a profile with its latest plan', async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 42,
        name: 'Roi',
        gross_salary: '10000.00',
        bank_net: '7000.00',
        created_at: '2026-05-18T10:00:00.000Z',
        updated_at: '2026-05-18T10:00:00.000Z',
        spending_plan_id: 99,
        profile_id: 42,
        fixed_costs: '3850.00',
        savings_goals: '700.00',
        active_investments: '700.00',
        guilt_free_spending: '1925.00',
        wealth_projection: [{ year: 1, value: 749 }],
        plan_created_at: '2026-05-18T10:01:00.000Z',
      }],
    });

    const response = await request(app).get('/calculate/profiles/42');

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Roi');
    expect(response.body.spendingPlan.fixedCosts).toBe(3850);
  });

});
