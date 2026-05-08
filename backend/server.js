require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/projects',  require('./routes/projects'));
app.use('/api/tasks',     require('./routes/tasks'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Server error' });
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 TaskFlow running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
