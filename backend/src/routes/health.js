// routes/health.js — GET /health
const router = require('express').Router();
const pool = require('../db');
router.get('/', async (req, res) => {
 try {
 await pool.query('SELECT 1'); // if DB is down, this throws
 res.status(200).json({
 status: 'ok',
 uptime: Math.floor(process.uptime()) + ' seconds',
 database: 'connected',
 });
 } catch (err) {
 res.status(503).json({
 status: 'error',
 database: 'disconnected',
 message: err.message,
 });
 }
});
module.exports = router;