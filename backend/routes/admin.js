const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get database stats (admin only)
router.get('/backup/info', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get counts from each table
    const users = await db.prepare('SELECT COUNT(*) as count FROM users').get();
    const questionnaires = await db.prepare('SELECT COUNT(*) as count FROM questionnaires').get();
    const questions = await db.prepare('SELECT COUNT(*) as count FROM questions').get();
    const responses = await db.prepare('SELECT COUNT(*) as count FROM responses').get();
    const answers = await db.prepare('SELECT COUNT(*) as count FROM answers').get();

    res.json({
      type: 'PostgreSQL',
      tables: {
        users: parseInt(users.count),
        questionnaires: parseInt(questionnaires.count),
        questions: parseInt(questions.count),
        responses: parseInt(responses.count),
        answers: parseInt(answers.count)
      },
      note: 'Use pg_dump with DATABASE_URL to create backups'
    });
  } catch (error) {
    console.error('Backup info error:', error);
    res.status(500).json({ error: 'Failed to get backup info' });
  }
});

// Export data as JSON (admin only)
router.get('/backup/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.prepare('SELECT id, email, alias, is_admin, age_verified, created_at FROM users').all();
    const questionnaires = await db.prepare('SELECT * FROM questionnaires').all();
    const questions = await db.prepare('SELECT * FROM questions').all();
    const options = await db.prepare('SELECT * FROM options').all();
    const responses = await db.prepare('SELECT * FROM responses').all();
    const answers = await db.prepare('SELECT * FROM answers').all();

    const data = {
      exportedAt: new Date().toISOString(),
      users,
      questionnaires,
      questions,
      options,
      responses,
      answers
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="tiaojiao-backup-${timestamp}.json"`);
    res.json(data);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router;
