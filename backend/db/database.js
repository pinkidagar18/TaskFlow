const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'taskflow.db');
let db = null;

function saveDB() {
  const data = db.export();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function makePrepared(sql) {
  return {
    get(...args) {
      const params = args.flat();
      const stmt = db.prepare(sql);
      stmt.bind(params);
      let row = undefined;
      if (stmt.step()) row = stmt.getAsObject();
      stmt.free();
      return row;
    },
    all(...args) {
      const params = args.flat();
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
    run(...args) {
      const params = args.flat();
      db.run(sql, params);
      const res = db.exec('SELECT last_insert_rowid() as id');
      const lastInsertRowid = res[0] ? Number(res[0].values[0][0]) : 0;
      saveDB();
      return { lastInsertRowid };
    }
  };
}

function getDB() {
  return { prepare: (sql) => makePrepared(sql) };
}

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#6366f1',
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(project_id, user_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'todo',
    due_date TEXT,
    project_id INTEGER NOT NULL,
    assigned_to INTEGER,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  saveDB();
  console.log('✅ Database initialized');
}

module.exports = { getDB, initDB };
