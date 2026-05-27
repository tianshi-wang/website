const { db, initDatabase } = require('../database');

async function addConditionalFields() {
  try {
    await initDatabase();

    console.log('Adding conditional question fields...');

    // Add show_if_question_id field
    try {
      await db.prepare('SELECT show_if_question_id FROM questions LIMIT 1').get();
      console.log('show_if_question_id already exists');
    } catch (e) {
      await db.pool.query('ALTER TABLE questions ADD COLUMN show_if_question_id INTEGER REFERENCES questions(id)');
      console.log('Added show_if_question_id column');
    }

    // Add show_if_answer field
    try {
      await db.prepare('SELECT show_if_answer FROM questions LIMIT 1').get();
      console.log('show_if_answer already exists');
    } catch (e) {
      await db.pool.query('ALTER TABLE questions ADD COLUMN show_if_answer TEXT');
      console.log('Added show_if_answer column');
    }

    console.log('\nMigration completed!');
    await db.close();
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

addConditionalFields();
