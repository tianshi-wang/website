const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Use DATABASE_URL from environment, or local connection
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/questionnaire';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Helper to convert ? placeholders to $1, $2, etc.
function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// Helper to convert SQLite datetime('now') to PostgreSQL
function convertSqlSyntax(sql) {
  return sql
    .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/AUTOINCREMENT/gi, '')
    .replace(/INTEGER DEFAULT 0/gi, 'INTEGER DEFAULT 0')
    .replace(/INTEGER DEFAULT 1/gi, 'INTEGER DEFAULT 1');
}

// Create a statement-like object that mimics the SQLite API
function createStatement(sql) {
  const pgSql = convertPlaceholders(convertSqlSyntax(sql));

  return {
    async get(...params) {
      const result = await pool.query(pgSql, params);
      return result.rows[0];
    },
    async all(...params) {
      const result = await pool.query(pgSql, params);
      return result.rows;
    },
    async run(...params) {
      // For INSERT statements, try to get the returning id
      let modifiedSql = pgSql;
      const isInsert = /^\s*INSERT/i.test(sql);

      if (isInsert && !/RETURNING/i.test(pgSql)) {
        modifiedSql = pgSql + ' RETURNING id';
      }

      const result = await pool.query(modifiedSql, params);
      return {
        lastInsertRowid: result.rows[0]?.id,
        changes: result.rowCount
      };
    }
  };
}

// Database wrapper with SQLite-compatible API (but async)
const db = {
  prepare(sql) {
    return createStatement(sql);
  },

  async exec(sql) {
    const pgSql = convertSqlSyntax(sql);
    await pool.query(pgSql);
  },

  async pragma(pragma) {
    // PostgreSQL doesn't use pragmas, ignore silently
  },

  transaction(fn) {
    // Return an async function that wraps the transaction
    return async (...args) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create a transaction-specific db object
        const txDb = {
          prepare(sql) {
            const pgSql = convertPlaceholders(convertSqlSyntax(sql));
            return {
              async get(...params) {
                const result = await client.query(pgSql, params);
                return result.rows[0];
              },
              async all(...params) {
                const result = await client.query(pgSql, params);
                return result.rows;
              },
              async run(...params) {
                let modifiedSql = pgSql;
                const isInsert = /^\s*INSERT/i.test(sql);

                if (isInsert && !/RETURNING/i.test(pgSql)) {
                  modifiedSql = pgSql + ' RETURNING id';
                }

                const result = await client.query(modifiedSql, params);
                return {
                  lastInsertRowid: result.rows[0]?.id,
                  changes: result.rowCount
                };
              }
            };
          }
        };

        const result = await fn(txDb, ...args);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    };
  },

  async close() {
    await pool.end();
  },

  save() {
    // No-op for PostgreSQL (auto-persisted)
  },

  // Expose pool for advanced usage
  pool
};

async function initDatabase() {
  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      alias TEXT,
      is_admin INTEGER DEFAULT 0,
      age_verified INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS questionnaires (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      language TEXT DEFAULT 'zh',
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'single_choice', 'multiple_choice')),
      page_number INTEGER NOT NULL DEFAULT 1,
      order_num INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS options (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      order_num INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS responses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id),
      guest_alias TEXT,
      share_token TEXT UNIQUE,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS answers (
      id SERIAL PRIMARY KEY,
      response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id),
      answer_text TEXT
    );
  `);

  // Migration: Add share_token and guest_alias columns if they don't exist
  try {
    await pool.query('SELECT share_token FROM responses LIMIT 1');
  } catch (e) {
    await pool.query('ALTER TABLE responses ADD COLUMN share_token TEXT UNIQUE');
    console.log('Added share_token column to responses');
  }

  try {
    await pool.query('SELECT guest_alias FROM responses LIMIT 1');
  } catch (e) {
    await pool.query('ALTER TABLE responses ADD COLUMN guest_alias TEXT');
    console.log('Added guest_alias column to responses');
  }

  // Make user_id nullable if it's not already
  try {
    await pool.query('ALTER TABLE responses ALTER COLUMN user_id DROP NOT NULL');
  } catch (e) {
    // Column is already nullable or doesn't exist
  }

  console.log('PostgreSQL database initialized');
  return db;
}

// Seed admin user if not exists
async function seedAdmin() {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@example.com']);
  if (result.rows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, is_admin) VALUES ($1, $2, 1)',
      ['admin@example.com', hash]
    );
    console.log('Admin user created: admin@example.com / admin123');
  }
}

module.exports = { db, initDatabase, seedAdmin };
