const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const TASK_SELECT = `
  SELECT t.id, t.title, t.description, t.priority, t.status, t.due_date,
    t.project_id, t.assigned_to, t.created_by, t.created_at, t.updated_at,
    u1.name as assigned_name, u1.email as assigned_email,
    u2.name as creator_name,
    p.name as project_name, p.color as project_color,
    pm.role as user_role
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
  LEFT JOIN users u1 ON u1.id = t.assigned_to
  LEFT JOIN users u2 ON u2.id = t.created_by
`;

router.get('/', authenticate, (req, res) => {
  const { project_id, status, priority } = req.query;
  const db = getDB();
  let q = TASK_SELECT + ' WHERE 1=1';
  const params = [req.user.id];
  if (project_id) { q += ' AND t.project_id = ?'; params.push(Number(project_id)); }
  if (status)     { q += ' AND t.status = ?';     params.push(status); }
  if (priority)   { q += ' AND t.priority = ?';   params.push(priority); }
  q += ' ORDER BY t.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', authenticate, (req, res) => {
  const { title, description, priority, due_date, project_id, assigned_to } = req.body;
  if (!title || !project_id) return res.status(400).json({ error: 'Title and project_id required' });
  const db = getDB();
  const pid = Number(project_id);
  const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(pid, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a project member' });
  if (member.role !== 'admin') return res.status(403).json({ error: 'Only admins can create tasks' });
  const r = db.prepare('INSERT INTO tasks (title, description, priority, due_date, project_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    title.trim(), description || '', priority || 'medium',
    due_date || null, pid, assigned_to ? Number(assigned_to) : null, req.user.id
  );
  const task = db.prepare(TASK_SELECT + ' WHERE t.id = ?').get(req.user.id, r.lastInsertRowid);
  res.status(201).json(task);
});

router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  const task = db.prepare(TASK_SELECT + ' WHERE t.id = ?').get(req.user.id, Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

router.put('/:id', authenticate, (req, res) => {
  const db = getDB();
  const tid = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(tid);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(Number(task.project_id), req.user.id);
  if (!member) return res.status(403).json({ error: 'Access denied' });

  if (member.role === 'member') {
    if (Number(task.assigned_to) !== req.user.id) return res.status(403).json({ error: 'You can only update your own tasks' });
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Members can only update status' });
    db.prepare("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, tid);
  } else {
    const { title, description, priority, status, due_date, assigned_to } = req.body;
    db.prepare(`UPDATE tasks SET
      title = COALESCE(?, title), description = COALESCE(?, description),
      priority = COALESCE(?, priority), status = COALESCE(?, status),
      due_date = ?, assigned_to = ?, updated_at = datetime('now')
      WHERE id = ?`).run(
      title || null, description || null, priority || null, status || null,
      due_date !== undefined ? (due_date || null) : task.due_date,
      assigned_to !== undefined ? (assigned_to ? Number(assigned_to) : null) : task.assigned_to,
      tid
    );
  }
  const updated = db.prepare(TASK_SELECT + ' WHERE t.id = ?').get(req.user.id, tid);
  res.json(updated);
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDB();
  const tid = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(tid);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(Number(task.project_id), req.user.id);
  if (!member || member.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(tid);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
