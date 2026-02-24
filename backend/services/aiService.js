const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

/**
 * Generate AI summary using Grok API
 * @param {Object} params
 * @param {string} params.prompt - Custom prompt from questionnaire
 * @param {Array} params.qaHistory - Array of {question, answer} objects
 * @param {string} params.questionnaireTitle - Title of the questionnaire
 * @returns {Promise<string>} - Generated summary
 */
async function generateSummary({ prompt, qaHistory, questionnaireTitle }) {
  if (!GROK_API_KEY) {
    throw new Error('GROK_API_KEY is not configured');
  }

  // Build the conversation history for the AI
  let conversationText = `Questionnaire: ${questionnaireTitle}\n\n`;
  conversationText += 'User Responses:\n';
  qaHistory.forEach(({ question, answer }, index) => {
    conversationText += `\nQ${index + 1}: ${question}\n`;
    conversationText += `A${index + 1}: ${answer}\n`;
  });

  // Combine custom prompt with conversation
  const systemPrompt = prompt || 'Please provide a thoughtful summary and analysis of the user\'s questionnaire responses.';

  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: conversationText
    }
  ];

  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Grok API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to generate summary.';
  } catch (error) {
    console.error('AI summary generation error:', error);
    throw new Error(`Failed to generate AI summary: ${error.message}`);
  }
}

module.exports = { generateSummary };
