const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Submit questionnaire response
router.post('/', authenticateToken, (req, res) => {
  try {
    const { questionnaire_id, answers } = req.body;

    if (!questionnaire_id) {
      return res.status(400).json({ error: 'Questionnaire ID is required' });
    }

    if (!answers || !Object.keys(answers).length) {
      return res.status(400).json({ error: 'Answers are required' });
    }

    // Check if questionnaire exists
    const questionnaire = db.prepare('SELECT id FROM questionnaires WHERE id = ?')
      .get(questionnaire_id);

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Check if user already responded
    const existing = db.prepare(`
      SELECT id FROM responses
      WHERE user_id = ? AND questionnaire_id = ?
    `).get(req.user.id, questionnaire_id);

    if (existing) {
      return res.status(400).json({ error: 'You have already completed this questionnaire' });
    }

    // Create response and answers in transaction
    const submitResponse = db.transaction(() => {
      const responseResult = db.prepare(`
        INSERT INTO responses (user_id, questionnaire_id)
        VALUES (?, ?)
      `).run(req.user.id, questionnaire_id);

      const responseId = responseResult.lastInsertRowid;

      // Insert answers
      // answers is an object { questionId: answerText }
      // For multiple choice, answerText can be JSON array
      Object.entries(answers).forEach(([questionId, answerText]) => {
        const answer = typeof answerText === 'object'
          ? JSON.stringify(answerText)
          : answerText;

        db.prepare(`
          INSERT INTO answers (response_id, question_id, answer_text)
          VALUES (?, ?, ?)
        `).run(responseId, questionId, answer);
      });

      return responseId;
    });

    const responseId = submitResponse();

    res.status(201).json({
      message: 'Response submitted',
      responseId
    });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's response to a questionnaire (for summary page)
router.get('/questionnaire/:questionnaireId', authenticateToken, (req, res) => {
  try {
    const { questionnaireId } = req.params;

    // Get the response
    const response = db.prepare(`
      SELECT * FROM responses
      WHERE user_id = ? AND questionnaire_id = ?
    `).get(req.user.id, questionnaireId);

    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Get questionnaire info
    const questionnaire = db.prepare(`
      SELECT * FROM questionnaires WHERE id = ?
    `).get(questionnaireId);

    // Get questions with answers
    const questions = db.prepare(`
      SELECT q.*, a.answer_text
      FROM questions q
      LEFT JOIN answers a ON a.question_id = q.id AND a.response_id = ?
      WHERE q.questionnaire_id = ?
      ORDER BY q.page_number, q.order_num
    `).all(response.id, questionnaireId);

    // Get options for choice questions
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

    res.json({
      response: {
        ...response,
        questionnaire,
        questions: questionsWithOptions
      }
    });
  } catch (error) {
    console.error('Get response error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all responses for a questionnaire (admin only)
router.get('/admin/questionnaire/:questionnaireId', authenticateToken, (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { questionnaireId } = req.params;

    const responses = db.prepare(`
      SELECT r.*, u.email as user_email
      FROM responses r
      JOIN users u ON r.user_id = u.id
      WHERE r.questionnaire_id = ?
      ORDER BY r.completed_at DESC
    `).all(questionnaireId);

    // Get answers for each response
    const responsesWithAnswers = responses.map(r => {
      const answers = db.prepare(`
        SELECT a.*, q.text as question_text, q.type as question_type
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        WHERE a.response_id = ?
        ORDER BY q.page_number, q.order_num
      `).all(r.id);
      return { ...r, answers };
    });

    res.json({ responses: responsesWithAnswers });
  } catch (error) {
    console.error('Get admin responses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
