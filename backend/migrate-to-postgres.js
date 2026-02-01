/**
 * Migration script: SQLite to PostgreSQL
 *
 * Usage:
 *   1. Set DATABASE_URL environment variable to your PostgreSQL connection string
 *   2. Run: node migrate-to-postgres.js
 *
 * Example:
 *   DATABASE_URL="postgres://user:pass@host/dbname" node migrate-to-postgres.js
 */

const initSqlJs = require('sql.js');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'questionnaire.db');

// Accept DATABASE_URL from command line argument or environment variable
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

async function migrate() {
  // Check if SQLite database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error('Error: questionnaire.db not found');
    process.exit(1);
  }

  // Check if DATABASE_URL is set
  if (!DATABASE_URL) {
    console.error('Error: DATABASE_URL not provided');
    console.error('Usage: node migrate-to-postgres.js "postgres://..."');
    process.exit(1);
  }

  console.log('Starting migration from SQLite to PostgreSQL...\n');

  // Initialize SQLite
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const sqliteDb = new SQL.Database(fileBuffer);

  // Initialize PostgreSQL
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Create tables in PostgreSQL
    console.log('Creating tables in PostgreSQL...');
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
        user_id INTEGER NOT NULL REFERENCES users(id),
        questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id),
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES questions(id),
        answer_text TEXT
      );
    `);
    console.log('Tables created.\n');

    // Helper to read all rows from SQLite
    function readAll(sql) {
      const results = [];
      const stmt = sqliteDb.prepare(sql);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    }

    // Migrate users
    console.log('Migrating users...');
    const users = readAll('SELECT * FROM users ORDER BY id');
    for (const user of users) {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, alias, is_admin, age_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.email, user.password_hash, user.alias, user.is_admin || 0, user.age_verified || 0, user.created_at]
      );
    }
    console.log(`  Migrated ${users.length} users`);

    // Update sequence for users
    if (users.length > 0) {
      const maxUserId = Math.max(...users.map(u => u.id));
      await pool.query(`SELECT setval('users_id_seq', $1, true)`, [maxUserId]);
    }

    // Migrate questionnaires
    console.log('Migrating questionnaires...');
    const questionnaires = readAll('SELECT * FROM questionnaires ORDER BY id');
    for (const q of questionnaires) {
      await pool.query(
        `INSERT INTO questionnaires (id, title, description, image_url, language, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [q.id, q.title, q.description, q.image_url, q.language || 'zh', q.created_by, q.created_at]
      );
    }
    console.log(`  Migrated ${questionnaires.length} questionnaires`);

    // Update sequence
    if (questionnaires.length > 0) {
      const maxId = Math.max(...questionnaires.map(q => q.id));
      await pool.query(`SELECT setval('questionnaires_id_seq', $1, true)`, [maxId]);
    }

    // Migrate questions
    console.log('Migrating questions...');
    const questions = readAll('SELECT * FROM questions ORDER BY id');
    for (const q of questions) {
      await pool.query(
        `INSERT INTO questions (id, questionnaire_id, text, type, page_number, order_num)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [q.id, q.questionnaire_id, q.text, q.type, q.page_number, q.order_num]
      );
    }
    console.log(`  Migrated ${questions.length} questions`);

    if (questions.length > 0) {
      const maxId = Math.max(...questions.map(q => q.id));
      await pool.query(`SELECT setval('questions_id_seq', $1, true)`, [maxId]);
    }

    // Migrate options
    console.log('Migrating options...');
    const options = readAll('SELECT * FROM options ORDER BY id');
    for (const o of options) {
      await pool.query(
        `INSERT INTO options (id, question_id, text, order_num)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [o.id, o.question_id, o.text, o.order_num]
      );
    }
    console.log(`  Migrated ${options.length} options`);

    if (options.length > 0) {
      const maxId = Math.max(...options.map(o => o.id));
      await pool.query(`SELECT setval('options_id_seq', $1, true)`, [maxId]);
    }

    // Migrate responses
    console.log('Migrating responses...');
    const responses = readAll('SELECT * FROM responses ORDER BY id');
    for (const r of responses) {
      await pool.query(
        `INSERT INTO responses (id, user_id, questionnaire_id, completed_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.user_id, r.questionnaire_id, r.completed_at]
      );
    }
    console.log(`  Migrated ${responses.length} responses`);

    if (responses.length > 0) {
      const maxId = Math.max(...responses.map(r => r.id));
      await pool.query(`SELECT setval('responses_id_seq', $1, true)`, [maxId]);
    }

    // Migrate answers
    console.log('Migrating answers...');
    const answers = readAll('SELECT * FROM answers ORDER BY id');
    for (const a of answers) {
      await pool.query(
        `INSERT INTO answers (id, response_id, question_id, answer_text)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.response_id, a.question_id, a.answer_text]
      );
    }
    console.log(`  Migrated ${answers.length} answers`);

    if (answers.length > 0) {
      const maxId = Math.max(...answers.map(a => a.id));
      await pool.query(`SELECT setval('answers_id_seq', $1, true)`, [maxId]);
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`  Users: ${users.length}`);
    console.log(`  Questionnaires: ${questionnaires.length}`);
    console.log(`  Questions: ${questions.length}`);
    console.log(`  Options: ${options.length}`);
    console.log(`  Responses: ${responses.length}`);
    console.log(`  Answers: ${answers.length}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pool.end();
  }
}

migrate();
