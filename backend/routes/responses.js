const express = require('express');
const crypto = require('crypto');
const { db } = require('../database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Helper to get recent 4 questionnaire IDs
async function getRecentQuestionnaireIds() {
  const recent = await db.prepare(`
    SELECT id FROM questionnaires ORDER BY created_at DESC LIMIT 4
  `).all();
  return recent.map(q => q.id);
}

// Generate a unique share token
function generateShareToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Submit questionnaire response (supports both authenticated and guest users for recent questionnaires)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { questionnaire_id, answers, guest_alias } = req.body;

    if (!questionnaire_id) {
      return res.status(400).json({ error: 'Questionnaire ID is required' });
    }

    if (!answers || !Object.keys(answers).length) {
      return res.status(400).json({ error: 'Answers are required' });
    }

    // Check if questionnaire exists
    const questionnaire = await db.prepare('SELECT id FROM questionnaires WHERE id = ?')
      .get(questionnaire_id);

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Check if this is a recent questionnaire (guest-accessible)
    const recentIds = await getRecentQuestionnaireIds();
    const isRecent = recentIds.includes(parseInt(questionnaire_id));

    // If not logged in and not a recent questionnaire, require auth
    if (!req.user && !isRecent) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // For authenticated users, check if they already responded
    if (req.user) {
      const existing = await db.prepare(`
        SELECT id FROM responses
        WHERE user_id = ? AND questionnaire_id = ?
      `).get(req.user.id, questionnaire_id);

      if (existing) {
        return res.status(400).json({ error: 'You have already completed this questionnaire' });
      }
    }

    // Generate share token
    const shareToken = generateShareToken();

    // Create response and answers in transaction
    const submitResponse = db.transaction(async (txDb) => {
      const responseResult = await txDb.prepare(`
        INSERT INTO responses (user_id, questionnaire_id, guest_alias, share_token)
        VALUES (?, ?, ?, ?)
      `).run(
        req.user ? req.user.id : null,
        questionnaire_id,
        req.user ? null : (guest_alias || 'Anonymous'),
        shareToken
      );

      const responseId = responseResult.lastInsertRowid;

      // Insert answers
      const entries = Object.entries(answers);
      for (const [questionId, answerText] of entries) {
        const answer = typeof answerText === 'object'
          ? JSON.stringify(answerText)
          : answerText;

        await txDb.prepare(`
          INSERT INTO answers (response_id, question_id, answer_text)
          VALUES (?, ?, ?)
        `).run(responseId, questionId, answer);
      }

      return { responseId, shareToken };
    });

    const { responseId, shareToken: token } = await submitResponse();

    res.status(201).json({
      message: 'Response submitted',
      responseId,
      shareToken: token
    });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's response to a questionnaire (for summary page)
router.get('/questionnaire/:questionnaireId', authenticateToken, async (req, res) => {
  try {
    const { questionnaireId } = req.params;

    // Get the response
    const response = await db.prepare(`
      SELECT * FROM responses
      WHERE user_id = ? AND questionnaire_id = ?
    `).get(req.user.id, questionnaireId);

    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Get questionnaire info
    const questionnaire = await db.prepare(`
      SELECT * FROM questionnaires WHERE id = ?
    `).get(questionnaireId);

    // Get questions with answers
    const questions = await db.prepare(`
      SELECT q.*, a.answer_text
      FROM questions q
      LEFT JOIN answers a ON a.question_id = q.id AND a.response_id = ?
      WHERE q.questionnaire_id = ?
      ORDER BY q.page_number, q.order_num
    `).all(response.id, questionnaireId);

    // Get options for choice questions
    const questionsWithOptions = await Promise.all(questions.map(async (q) => {
      if (q.type !== 'text') {
        const options = await db.prepare(`
          SELECT * FROM options
          WHERE question_id = ?
          ORDER BY order_num
        `).all(q.id);
        return { ...q, options };
      }
      return { ...q, options: [] };
    }));

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

// Get shared response by token (public - no auth required)
router.get('/shared/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;

    // Get the response by share token
    const response = await db.prepare(`
      SELECT r.*, u.alias as user_alias
      FROM responses r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.share_token = ?
    `).get(shareToken);

    if (!response) {
      return res.status(404).json({ error: 'Shared response not found' });
    }

    // Get questionnaire info
    const questionnaire = await db.prepare(`
      SELECT * FROM questionnaires WHERE id = ?
    `).get(response.questionnaire_id);

    // Get questions with answers
    const questions = await db.prepare(`
      SELECT q.*, a.answer_text
      FROM questions q
      LEFT JOIN answers a ON a.question_id = q.id AND a.response_id = ?
      WHERE q.questionnaire_id = ?
      ORDER BY q.page_number, q.order_num
    `).all(response.id, response.questionnaire_id);

    // Get options for choice questions
    const questionsWithOptions = await Promise.all(questions.map(async (q) => {
      if (q.type !== 'text') {
        const options = await db.prepare(`
          SELECT * FROM options
          WHERE question_id = ?
          ORDER BY order_num
        `).all(q.id);
        return { ...q, options };
      }
      return { ...q, options: [] };
    }));

    // Determine display name
    const displayName = response.user_alias || response.guest_alias || 'Anonymous';

    res.json({
      response: {
        id: response.id,
        displayName,
        completed_at: response.completed_at,
        questionnaire,
        questions: questionsWithOptions
      }
    });
  } catch (error) {
    console.error('Get shared response error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all responses for a questionnaire (admin only)
router.get('/admin/questionnaire/:questionnaireId', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { questionnaireId } = req.params;

    const responses = await db.prepare(`
      SELECT r.*, u.email as user_email, u.alias as user_alias
      FROM responses r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.questionnaire_id = ?
      ORDER BY r.completed_at DESC
    `).all(questionnaireId);

    // Get answers for each response
    const responsesWithAnswers = await Promise.all(responses.map(async (r) => {
      const answers = await db.prepare(`
        SELECT a.*, q.text as question_text, q.type as question_type
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        WHERE a.response_id = ?
        ORDER BY q.page_number, q.order_num
      `).all(r.id);
      return { ...r, answers };
    }));

    res.json({ responses: responsesWithAnswers });
  } catch (error) {
    console.error('Get admin responses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
