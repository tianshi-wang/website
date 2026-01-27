const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get public questionnaires (no auth required)
router.get('/public', (req, res) => {
  try {
    const questionnaires = db.prepare(`
      SELECT q.*, u.email as creator_email,
        (SELECT COUNT(*) FROM questions WHERE questionnaire_id = q.id) as question_count
      FROM questionnaires q
      JOIN users u ON q.created_by = u.id
      ORDER BY q.created_at DESC
    `).all();

    res.json({ questionnaires });
  } catch (error) {
    console.error('Get public questionnaires error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all questionnaires (with completion status for current user)
router.get('/', authenticateToken, (req, res) => {
  try {
    const questionnaires = db.prepare(`
      SELECT q.*, u.email as creator_email,
        (SELECT COUNT(*) FROM responses r WHERE r.questionnaire_id = q.id AND r.user_id = ?) as completed
      FROM questionnaires q
      JOIN users u ON q.created_by = u.id
      ORDER BY q.created_at DESC
    `).all(req.user.id);

    res.json({ questionnaires });
  } catch (error) {
    console.error('Get questionnaires error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single questionnaire with questions and options
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const questionnaire = db.prepare(`
      SELECT q.*, u.email as creator_email
      FROM questionnaires q
      JOIN users u ON q.created_by = u.id
      WHERE q.id = ?
    `).get(req.params.id);

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Get questions
    const questions = db.prepare(`
      SELECT * FROM questions
      WHERE questionnaire_id = ?
      ORDER BY page_number, order_num
    `).all(req.params.id);

    // Get options for each question
    const questionsWithOptions = questions.map(q => {
      if (q.type !== 'text') {
        const options = db.prepare(`
          SELECT * FROM options
          WHERE question_id = ?
          ORDER BY order_num
        `).all(q.id);
        return { ...q, options };
      }
      return { ...q, options: [] };
    });

    // Get max page number
    const maxPage = questions.reduce((max, q) => Math.max(max, q.page_number), 1);

    res.json({
      questionnaire: {
        ...questionnaire,
        questions: questionsWithOptions,
        totalPages: maxPage
      }
    });
  } catch (error) {
    console.error('Get questionnaire error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create questionnaire (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, description, questions } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!questions || !questions.length) {
      return res.status(400).json({ error: 'At least one question is required' });
    }

    // Start transaction
    const createQuestionnaire = db.transaction(() => {
      // Create questionnaire
      const qResult = db.prepare(`
        INSERT INTO questionnaires (title, description, created_by)
        VALUES (?, ?, ?)
      `).run(title, description || null, req.user.id);

      const questionnaireId = qResult.lastInsertRowid;

      // Create questions and options
      questions.forEach((question, idx) => {
        const questionResult = db.prepare(`
          INSERT INTO questions (questionnaire_id, text, type, page_number, order_num)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          questionnaireId,
          question.text,
          question.type,
          question.page_number || 1,
          question.order_num || idx
        );

        const questionId = questionResult.lastInsertRowid;

        // Create options if choice question
        if (question.type !== 'text' && question.options) {
          question.options.forEach((option, optIdx) => {
            db.prepare(`
              INSERT INTO options (question_id, text, order_num)
              VALUES (?, ?, ?)
            `).run(questionId, option.text, option.order_num || optIdx);
          });
        }
      });

      return questionnaireId;
    });

    const questionnaireId = createQuestionnaire();

    res.status(201).json({
      message: 'Questionnaire created',
      questionnaireId
    });
  } catch (error) {
    console.error('Create questionnaire error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete questionnaire (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM questionnaires WHERE id = ?')
      .run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    res.json({ message: 'Questionnaire deleted' });
  } catch (error) {
    console.error('Delete questionnaire error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
