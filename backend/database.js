const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'questionnaire.db');

let db = null;
let SQL = null;

// Wrapper to provide better-sqlite3 compatible API
function createStatement(database, sql) {
  return {
    get(...params) {
      const stmt = database.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result;
      }
      stmt.free();
      return undefined;
    },
    all(...params) {
      const results = [];
      const stmt = database.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    },
    run(...params) {
      const stmt = database.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      stmt.step();
      stmt.free();
      return {
        lastInsertRowid: database.exec("SELECT last_insert_rowid()")[0]?.values[0][0],
        changes: database.getRowsModified()
      };
    }
  };
}

// Database wrapper with better-sqlite3 compatible API
function createDbWrapper(database) {
  return {
    prepare(sql) {
      return createStatement(database, sql);
    },
    exec(sql) {
      database.exec(sql);
    },
    pragma(pragma) {
      database.exec(`PRAGMA ${pragma}`);
    },
    transaction(fn) {
      return (...args) => {
        database.exec('BEGIN TRANSACTION');
        try {
          const result = fn(...args);
          database.exec('COMMIT');
          return result;
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        }
      };
    },
    close() {
      const data = database.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
      database.close();
    },
    save() {
      const data = database.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    },
    _raw: database
  };
}

async function initDatabase() {
  if (db) return db;

  SQL = await initSqlJs();

  // Load existing database or create new one
  let database;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }

  db = createDbWrapper(database);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questionnaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      language TEXT DEFAULT 'zh',
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      questionnaire_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'single_choice', 'multiple_choice')),
      page_number INTEGER NOT NULL DEFAULT 1,
      order_num INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      order_num INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      questionnaire_id INTEGER NOT NULL,
      completed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id)
    );

    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      response_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answer_text TEXT,
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );
  `);

  // Migration: Add image_url column if it doesn't exist
  try {
    db.prepare('SELECT image_url FROM questionnaires LIMIT 1').get();
  } catch (e) {
    db.exec('ALTER TABLE questionnaires ADD COLUMN image_url TEXT');
  }

  // Migration: Add language column if it doesn't exist
  try {
    db.prepare('SELECT language FROM questionnaires LIMIT 1').get();
  } catch (e) {
    db.exec("ALTER TABLE questionnaires ADD COLUMN language TEXT DEFAULT 'zh'");
  }

  // Migration: Add alias column to users if it doesn't exist
  try {
    db.prepare('SELECT alias FROM users LIMIT 1').get();
  } catch (e) {
    db.exec("ALTER TABLE users ADD COLUMN alias TEXT");
  }

  // Migration: Add age_verified column to users if it doesn't exist
  try {
    db.prepare('SELECT age_verified FROM users LIMIT 1').get();
  } catch (e) {
    db.exec("ALTER TABLE users ADD COLUMN age_verified INTEGER DEFAULT 0");
  }

  // Save after creating tables
  db.save();

  return db;
}

// Seed admin user if not exists
async function seedAdmin() {
  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@example.com');
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    db.prepare('INSERT INTO users (email, password_hash, is_admin) VALUES (?, ?, 1)')
      .run('admin@example.com', hash);
    db.save();
    console.log('Admin user created: admin@example.com / admin123');
  }
}

// Proxy that ensures db is initialized before use
const dbProxy = new Proxy({}, {
  get(target, prop) {
    if (!db) {
      throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db[prop];
  }
});

module.exports = { db: dbProxy, initDatabase, seedAdmin };
