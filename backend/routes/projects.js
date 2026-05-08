const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { authenticate, requireAdmin, requireMember } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const rows = db.prepare(`
    SELECT p.id, p.name, p.description, p.color, p.created_by, p.created_at,
      pm.role,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status='done') as done_count,
      (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json(rows);
});

router.post('/', authenticate, (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  const db = getDB();
  const r = db.prepare('INSERT INTO projects (name, description, color, created_by) VALUES (?, ?, ?, ?)').run(name.trim(), description || '', color || '#6366f1', req.user.id);
  const pid = r.lastInsertRowid;
  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(pid, req.user.id, 'admin');
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
  res.status(201).json({ ...project, role: 'admin', task_count: 0, done_count: 0, member_count: 1 });
});

router.get('/:projectId', authenticate, requireMember, (req, res) => {
  const db = getDB();
  const pid = Number(req.params.projectId);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const members = db.prepare(`
    SELECT u.id, u.name, u.email, pm.role, pm.joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `).all(pid);
  res.json({ ...project, members, userRole: req.userRole });
});

router.delete('/:projectId', authenticate, requireAdmin, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM tasks WHERE project_id = ?').run(Number(req.params.projectId));
  db.prepare('DELETE FROM project_members WHERE project_id = ?').run(Number(req.params.projectId));
  db.prepare('DELETE FROM projects WHERE id = ?').run(Number(req.params.projectId));
  res.json({ message: 'Project deleted' });
});

// Add member by email or user_id
router.post('/:projectId/members', authenticate, requireAdmin, (req, res) => {
  const { user_id, email, role } = req.body;
  const db = getDB();
  const pid = Number(req.params.projectId);
  let target = null;
  if (user_id) {
    target = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(Number(user_id));
  } else if (email) {
    target = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email.toLowerCase().trim());
  }
  if (!target) return res.status(404).json({ error: 'User not found. They must sign up first.' });
  if (db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(pid, Number(target.id)))
    return res.status(409).json({ error: 'User is already a member' });
  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(pid, Number(target.id), role || 'member');
  res.status(201).json({ id: Number(target.id), name: target.name, email: target.email, role: role || 'member' });
});

router.delete('/:projectId/members/:userId', authenticate, requireAdmin, (req, res) => {
  if (Number(req.params.userId) === req.user.id)
    return res.status(400).json({ error: 'Cannot remove yourself' });
  const db = getDB();
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(Number(req.params.projectId), Number(req.params.userId));
  res.json({ message: 'Member removed' });
});

module.exports = router;
