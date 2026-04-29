// routes/calculate.js — POST /calculate
const router = require('express').Router();
const { calculate } = require('../calculator');
const pool = require('../db');
router.post('/', async (req, res) => {
 const { grossSalary, bankNet, years } = req.body;
 // ── Input validation ──────────────────────────────────
 if (!grossSalary || isNaN(grossSalary) || Number(grossSalary) <= 0) {
 return res.status(400).json({ error: 'grossSalary must be a positive number' });
 }
 const parsedYears = (years === undefined || years === null || years === '')
 ? 15
 : parseInt(years, 10);
 if (isNaN(parsedYears) || parsedYears < 1 || parsedYears > 15) {
 return res.status(400).json({ error: 'years must be between 1 and 15' });
 }
 // ── Calculate ─────────────────────────────────────────
 const result = calculate(
 parseFloat(grossSalary),
 bankNet ? parseFloat(bankNet) : null,
 parsedYears
 );
 // ── Persist (non-critical — failure does not break the response) ──
 try {
 await pool.query('INSERT INTO last_calculation (result) VALUES ($1)', [result]);
 } catch (err) {
 console.log('⚠️ Could not persist:', err.message);
 }
 return res.status(200).json(result);
});
module.exports = router;