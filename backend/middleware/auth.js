const jwt = require('jsonwebtoken');
const { getDB } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_2024';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const db = getDB();
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(Number(decoded.userId));
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = { id: Number(user.id), name: user.name, email: user.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  const db = getDB();
  const pid = Number(req.params.projectId || req.body.project_id);
  const m = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(pid, req.user.id);
  if (!m || m.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  req.userRole = 'admin';
  next();
}

function requireMember(req, res, next) {
  const db = getDB();
  const pid = Number(req.params.projectId || req.body.project_id);
  const m = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(pid, req.user.id);
  if (!m) return res.status(403).json({ error: 'Not a project member' });
  req.userRole = m.role;
  next();
}

module.exports = { authenticate, requireAdmin, requireMember, JWT_SECRET };
