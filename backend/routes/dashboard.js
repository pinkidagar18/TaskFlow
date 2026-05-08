const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const uid = req.user.id;

  const totalTasks = db.prepare(`
    SELECT COUNT(DISTINCT t.id) as c FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
  `).get(uid).c || 0;

  const byStatus = db.prepare(`
    SELECT t.status, COUNT(DISTINCT t.id) as count FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    GROUP BY t.status
  `).all(uid);

  const byPriority = db.prepare(`
    SELECT t.priority, COUNT(DISTINCT t.id) as count FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    GROUP BY t.priority
  `).all(uid);

  // Overdue = due date is in the PAST and not done
  const overdueTasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color, u.name as assigned_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.due_date IS NOT NULL AND t.due_date < date('now') AND t.status != 'done'
    ORDER BY t.due_date ASC LIMIT 10
  `).all(uid);

  const tasksPerUser = db.prepare(`
    SELECT u.name, u.email, COUNT(t.id) as task_count,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count
    FROM tasks t
    JOIN users u ON u.id = t.assigned_to
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    GROUP BY u.id ORDER BY task_count DESC LIMIT 10
  `).all(uid);

  // Recent tasks — includes ALL tasks with due dates (past and future) for upcoming section
  const recentTasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color, u.name as assigned_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    LEFT JOIN users u ON u.id = t.assigned_to
    ORDER BY t.created_at DESC LIMIT 50
  `).all(uid);

  res.json({ totalTasks, byStatus, byPriority, overdueTasks, tasksPerUser, recentTasks });
});

module.exports = router;
