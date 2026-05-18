const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', require('./routes/health'));
app.use('/calculate', require('./routes/calculate'));

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  pool.ensureSchema()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Database schema initialization failed:', err.message);
      process.exit(1);
    });
}
