const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const db = getDB();
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase()))
    return res.status(409).json({ error: 'Email already registered' });
  const hashed = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name.trim(), email.toLowerCase().trim(), hashed);
  const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email.toLowerCase());
  const token = jwt.sign({ userId: Number(user.id) }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: Number(user.id), name: user.name, email: user.email } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ userId: Number(user.id) }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: Number(user.id), name: user.name, email: user.email } });
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

router.get('/users', authenticate, (req, res) => {
  const { email } = req.query;
  const db = getDB();
  const users = email
    ? db.prepare('SELECT id, name, email FROM users WHERE email LIKE ? AND id != ? LIMIT 10').all(`%${email.toLowerCase()}%`, req.user.id)
    : db.prepare('SELECT id, name, email FROM users WHERE id != ? LIMIT 50').all(req.user.id);
  res.json(users);
});

module.exports = router;
