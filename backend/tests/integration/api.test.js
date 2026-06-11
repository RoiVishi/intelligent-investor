const request = require('supertest');

jest.mock('../../src/db', () => {
  const mockClient = { query: jest.fn(), release: jest.fn() };
  return {
    query: jest.fn(),
    connect: jest.fn(async () => mockClient),
    ensureSchema: jest.fn(),
    __mockClient: mockClient,
  };
});

const pool = require('../../src/db');
const app = require('../../src/app');

describe('API integration', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.__mockClient.query.mockReset();
    pool.__mockClient.release.mockClear();
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
      guiltFreeSpending: 1750,
    });
    expect(response.body.wealthProjection).toHaveLength(3);
  });

  test('POST /calculate accepts custom allocation percentages', async () => {
    const response = await request(app)
      .post('/calculate')
      .send({
        grossSalary: 10000,
        bankNet: 7000,
        years: 1,
        allocation: {
          fixedCosts: 50,
          savingsGoals: 15,
          activeInvestments: 20,
          guiltFreeSpending: 15,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.fixedCosts).toBe(3500);
    expect(response.body.savingsGoals).toBe(1050);
    expect(response.body.activeInvestments).toBe(1400);
    expect(response.body.guiltFreeSpending).toBe(1050);
    // 1400/month * 12 = 16800 deposited in year 1, grown by 7% -> 17976.
    expect(response.body.wealthProjection[0].value).toBe(17976);
  });

  test('POST /calculate rejects allocation percentages above 100 total', async () => {
    const response = await request(app)
      .post('/calculate')
      .send({
        grossSalary: 10000,
        bankNet: 7000,
        years: 1,
        allocation: {
          fixedCosts: 80,
          savingsGoals: 20,
          activeInvestments: 10,
          guiltFreeSpending: 5,
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('allocation percentages cannot add up to more than 100');
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

  test('POST /calculate/profiles persists a financial profile and spending plan in one transaction', async () => {
    pool.__mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
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
          guilt_free_spending: '1750.00',
          wealth_projection: [{ year: 1, value: 8988 }],
          created_at: '2026-05-18T10:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app)
      .post('/calculate/profiles')
      .send({ name: 'Roi', grossSalary: 10000, bankNet: 7000, years: 1 });

    expect(response.status).toBe(201);
    expect(response.body.profile.id).toBe(42);
    expect(response.body.calculation.activeInvestments).toBe(700);
    expect(pool.__mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(pool.__mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(pool.__mockClient.release).toHaveBeenCalled();
  });

  test('POST /calculate/profiles rejects duplicate profile names and rolls back', async () => {
    pool.__mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce({ code: '23505' })
      .mockResolvedValueOnce({}); // ROLLBACK

    const response = await request(app)
      .post('/calculate/profiles')
      .send({ name: 'Roi', grossSalary: 10000, bankNet: 7000, years: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('profile name already exists');
    expect(pool.__mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(pool.__mockClient.release).toHaveBeenCalled();
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
        guilt_free_spending: '1750.00',
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
