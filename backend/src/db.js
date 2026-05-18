const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'investor_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financial_profiles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      gross_salary NUMERIC(12, 2) NOT NULL CHECK (gross_salary > 0),
      bank_net NUMERIC(12, 2) NOT NULL CHECK (bank_net > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spending_plans (
      id SERIAL PRIMARY KEY,
      profile_id INTEGER NOT NULL REFERENCES financial_profiles(id) ON DELETE CASCADE,
      fixed_costs NUMERIC(12, 2) NOT NULL,
      savings_goals NUMERIC(12, 2) NOT NULL,
      active_investments NUMERIC(12, 2) NOT NULL,
      guilt_free_spending NUMERIC(12, 2) NOT NULL,
      wealth_projection JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS spending_plans_profile_id_created_at_idx
      ON spending_plans(profile_id, created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS financial_profiles_name_lower_unique_idx
      ON financial_profiles(LOWER(name));
  `);
}

module.exports = pool;
module.exports.ensureSchema = ensureSchema;
