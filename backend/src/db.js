// db.js — PostgreSQL connection pool
const { Pool } = require('pg');
const pool = new Pool({
 host: process.env.DB_HOST || 'db', // 'db' = Compose service name
 port: parseInt(process.env.DB_PORT || '5432', 10),
 database: process.env.DB_NAME || 'investor_db',
 user: process.env.DB_USER || 'postgres',
 password: process.env.DB_PASSWORD || 'postgres',
});
module.exports = pool;