const router = require('express').Router();
const { calculate } = require('../calculator');
const pool = require('../db');

function parsePositiveNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { error: `${fieldName} must be a positive number` };
  }
  return { value: parsed };
}

function parseYears(value) {
  if (value === undefined || value === null || value === '') {
    return { value: 15 };
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 15) {
    return { error: 'years must be an integer between 1 and 15' };
  }
  return { value: parsed };
}

function parseAllocation(allocation) {
  if (allocation === undefined || allocation === null) {
    return { value: {} };
  }

  const keys = ['fixedCosts', 'savingsGoals', 'activeInvestments', 'guiltFreeSpending'];
  const rates = {};
  let totalPercent = 0;

  for (const key of keys) {
    const parsed = Number(allocation[key]);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      return { error: `${key} percentage must be between 0 and 100` };
    }
    rates[key] = parsed / 100;
    totalPercent += parsed;
  }

  if (totalPercent > 100) {
    return { error: 'allocation percentages cannot add up to more than 100' };
  }

  if (rates.activeInvestments <= 0) {
    return { error: 'activeInvestments percentage must be greater than 0' };
  }

  return { value: rates };
}

function validateSalaryRelationship(grossSalary, bankNet) {
  if (bankNet !== null && bankNet !== undefined && bankNet > grossSalary) {
    return { error: 'bankNet cannot be higher than grossSalary' };
  }

  if (grossSalary > 1000000) {
    return { error: 'grossSalary looks too high for a monthly salary' };
  }

  if (bankNet > 1000000) {
    return { error: 'bankNet looks too high for a monthly salary' };
  }

  return {};
}

function mapPlan(row) {
  if (!row || row.fixed_costs === null || row.fixed_costs === undefined) {
    return null;
  }

  return {
    id: row.spending_plan_id || row.plan_id || row.id,
    profileId: row.profile_id,
    fixedCosts: Number(row.fixed_costs),
    savingsGoals: Number(row.savings_goals),
    activeInvestments: Number(row.active_investments),
    guiltFreeSpending: Number(row.guilt_free_spending),
    wealthProjection: row.wealth_projection,
    createdAt: row.plan_created_at || row.created_at,
  };
}

function mapProfile(row) {
  return {
    id: row.id,
    name: row.name,
    grossSalary: Number(row.gross_salary),
    bankNet: Number(row.bank_net),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    spendingPlan: mapPlan(row),
  };
}

router.post('/', async (req, res) => {
  const { grossSalary, bankNet, years, allocation } = req.body;
  const grossResult = parsePositiveNumber(grossSalary, 'grossSalary');
  if (grossResult.error) {
    return res.status(400).json({ error: grossResult.error });
  }

  let bankNetValue = null;
  if (bankNet !== undefined && bankNet !== null && bankNet !== '') {
    const bankNetResult = parsePositiveNumber(bankNet, 'bankNet');
    if (bankNetResult.error) {
      return res.status(400).json({ error: bankNetResult.error });
    }
    bankNetValue = bankNetResult.value;
  }

  const yearsResult = parseYears(years);
  if (yearsResult.error) {
    return res.status(400).json({ error: yearsResult.error });
  }

  const allocationResult = parseAllocation(allocation);
  if (allocationResult.error) {
    return res.status(400).json({ error: allocationResult.error });
  }

  const salaryResult = validateSalaryRelationship(grossResult.value, bankNetValue);
  if (salaryResult.error) {
    return res.status(400).json({ error: salaryResult.error });
  }

  const result = calculate(grossResult.value, bankNetValue, yearsResult.value, allocationResult.value);
  return res.status(200).json(result);
});

router.post('/profiles', async (req, res) => {
  const { name, grossSalary, bankNet, years, allocation } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedName) {
    return res.status(400).json({ error: 'name is required' });
  }

  const grossResult = parsePositiveNumber(grossSalary, 'grossSalary');
  if (grossResult.error) {
    return res.status(400).json({ error: grossResult.error });
  }

  const bankNetResult = parsePositiveNumber(bankNet, 'bankNet');
  if (bankNetResult.error) {
    return res.status(400).json({ error: bankNetResult.error });
  }

  const yearsResult = parseYears(years);
  if (yearsResult.error) {
    return res.status(400).json({ error: yearsResult.error });
  }

  const allocationResult = parseAllocation(allocation);
  if (allocationResult.error) {
    return res.status(400).json({ error: allocationResult.error });
  }

  const salaryResult = validateSalaryRelationship(grossResult.value, bankNetResult.value);
  if (salaryResult.error) {
    return res.status(400).json({ error: salaryResult.error });
  }

  const plan = calculate(grossResult.value, bankNetResult.value, yearsResult.value, allocationResult.value);

  try {
    const profileResult = await pool.query(
      `INSERT INTO financial_profiles (name, gross_salary, bank_net)
       VALUES ($1, $2, $3)
       RETURNING id, name, gross_salary, bank_net, created_at, updated_at`,
      [trimmedName, plan.grossSalary, plan.bankNet],
    );

    const profile = profileResult.rows[0];
    const spendingPlanResult = await pool.query(
      `INSERT INTO spending_plans (
         profile_id,
         fixed_costs,
         savings_goals,
         active_investments,
         guilt_free_spending,
         wealth_projection
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, profile_id, fixed_costs, savings_goals, active_investments,
         guilt_free_spending, wealth_projection, created_at`,
      [
        profile.id,
        plan.fixedCosts,
        plan.savingsGoals,
        plan.activeInvestments,
        plan.guiltFreeSpending,
        JSON.stringify(plan.wealthProjection),
      ],
    );

    const savedPlan = spendingPlanResult.rows[0];

    return res.status(201).json({
      profile: {
        id: profile.id,
        name: profile.name,
        grossSalary: Number(profile.gross_salary),
        bankNet: Number(profile.bank_net),
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
      spendingPlan: mapPlan(savedPlan),
      calculation: plan,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'profile name already exists' });
    }

    return res.status(500).json({ error: 'failed to save profile' });
  }
});

router.get('/profiles', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         fp.id,
         fp.name,
         fp.gross_salary,
         fp.bank_net,
         fp.created_at,
         fp.updated_at,
         sp.id AS spending_plan_id,
         sp.profile_id,
         sp.fixed_costs,
         sp.savings_goals,
         sp.active_investments,
         sp.guilt_free_spending,
         sp.wealth_projection,
         sp.created_at AS plan_created_at
       FROM financial_profiles fp
       LEFT JOIN LATERAL (
         SELECT *
         FROM spending_plans
         WHERE profile_id = fp.id
         ORDER BY created_at DESC
         LIMIT 1
       ) sp ON true
       ORDER BY fp.updated_at DESC, fp.created_at DESC`,
    );

    return res.status(200).json(result.rows.map(mapProfile));
  } catch (err) {
    return res.status(500).json({ error: 'failed to load profiles' });
  }
});

router.get('/profiles/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'profile id must be a positive integer' });
  }

  try {
    const result = await pool.query(
      `SELECT
         fp.id,
         fp.name,
         fp.gross_salary,
         fp.bank_net,
         fp.created_at,
         fp.updated_at,
         sp.id AS spending_plan_id,
         sp.profile_id,
         sp.fixed_costs,
         sp.savings_goals,
         sp.active_investments,
         sp.guilt_free_spending,
         sp.wealth_projection,
         sp.created_at AS plan_created_at
       FROM financial_profiles fp
       LEFT JOIN LATERAL (
         SELECT *
         FROM spending_plans
         WHERE profile_id = fp.id
         ORDER BY created_at DESC
         LIMIT 1
       ) sp ON true
       WHERE fp.id = $1`,
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'profile not found' });
    }

    const row = result.rows[0];
    return res.status(200).json({
      ...mapProfile(row),
    });
  } catch (err) {
    return res.status(500).json({ error: 'failed to load profile' });
  }
});

router.patch('/profiles/:id', async (req, res) => {
  const id = Number(req.params.id);
  const trimmedName = typeof req.body.name === 'string' ? req.body.name.trim() : '';

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'profile id must be a positive integer' });
  }

  if (!trimmedName) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const result = await pool.query(
      `UPDATE financial_profiles
       SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, gross_salary, bank_net, created_at, updated_at`,
      [trimmedName, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'profile not found' });
    }

    return res.status(200).json(mapProfile(result.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'profile name already exists' });
    }

    return res.status(500).json({ error: 'failed to rename profile' });
  }
});

router.delete('/profiles/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'profile id must be a positive integer' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM financial_profiles WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'profile not found' });
    }

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'failed to delete profile' });
  }
});

module.exports = router;
