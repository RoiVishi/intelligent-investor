// app.js — Entry point. Creates Express app + connects routes.
const express = require('express');
const cors = require('cors');
const app = express();
// ── Middleware ─────────────────────────────────────────────
// Runs on EVERY request before it reaches a route handler
app.use(cors()); // allow browser cross-origin requests
app.use(express.json()); // parse incoming JSON body into req.body
// ── Routes ────────────────────────────────────────────────
app.use('/health', require('./routes/health')); // GET /health
app.use('/calculate', require('./routes/calculate')); // POST /calculate
module.exports = app; // exported so supertest can import it for tests
// Start the server ONLY when run directly (not when imported by tests)
if (require.main === module) {
 const PORT = process.env.PORT || 5000;
 app.listen(PORT, () => {
 console.log(`🚀 Server running on http://localhost:${PORT}`);
 });
}