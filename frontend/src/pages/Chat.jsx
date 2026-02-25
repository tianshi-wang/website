import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const isGuest = !user;

  const [questionnaire, setQuestionnaire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // currentQuestionIndex: which question is awaiting an answer (-1 = not started)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [answers, setAnswers] = useState({});
  // history: [{type:'q'|'a', text, name?, questionId?}]
  const [history, setHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [userName, setUserName] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { fetchQuestionnaire(); }, [id]);

  // Auto-show Q1 once loaded
  useEffect(() => {
    if (questionnaire?.questions?.length > 0) {
      setHistory([{ type: 'q', text: questionnaire.questions[0].text }]);
      setCurrentQuestionIndex(0);
    }
  }, [questionnaire]);

  // Scroll to bottom when history changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input after each new question
  useEffect(() => {
    if (currentQuestionIndex >= 0) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentQuestionIndex]);

  const fetchQuestionnaire = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/questionnaires/${id}`, { headers });
      if (!res.ok) {
        if (res.status === 401) { navigate(`/login?redirect=/chat/${id}`); return; }
        throw new Error('Failed to load');
      }
      const data = await res.json();
      setQuestionnaire(data.questionnaire);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = (answerText) => {
    const trimmed = answerText.trim();
    if (!trimmed) return;

    const questions = questionnaire.questions;
    const question = questions[currentQuestionIndex];

    const newAnswers = { ...answers, [question.id]: trimmed };
    setAnswers(newAnswers);

    const isFirstQuestion = currentQuestionIndex === 0;
    const displayName = isFirstQuestion ? trimmed : userName;
    if (isFirstQuestion) setUserName(trimmed);

    const newHistory = [
      ...history,
      { type: 'a', text: trimmed, name: displayName, questionId: question.id }
    ];

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      newHistory.push({ type: 'q', text: questions[nextIndex].text });
      setCurrentQuestionIndex(nextIndex);
    } else {
      setCurrentQuestionIndex(questions.length); // marks done
    }

    setHistory(newHistory);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitAnswer(inputValue);
    }
  };

  const startEditing = (idx, currentText) => {
    setEditingIndex(idx);
    setEditValue(currentText);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const saveEdit = (idx) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;

    const item = history[idx];
    if (item.type !== 'a') return;

    // Update answers
    const newAnswers = { ...answers, [item.questionId]: trimmed };
    setAnswers(newAnswers);

    // Update history
    const newHistory = [...history];
    newHistory[idx] = { ...item, text: trimmed };
    setHistory(newHistory);

    // Clear editing state
    setEditingIndex(null);
    setEditValue('');
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/responses', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          questionnaire_id: id,
          answers,
          guest_alias: isGuest ? (userName || 'Anonymous') : undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      const data = await res.json();
      navigate(isGuest ? `/shared-chat/${data.shareToken}` : `/chat-summary/${id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (error && !questionnaire) return <div className="container"><div className="error-message">{error}</div></div>;
  if (!questionnaire) return null;

  const questions = questionnaire.questions;
  const isDone = currentQuestionIndex >= questions.length;
  const currentQuestion = !isDone ? questions[currentQuestionIndex] : null;
  const hasOptions = currentQuestion?.type === 'single_choice' && currentQuestion?.options?.length > 0;

  return (
    <div className="chat-page">
      {/* Title link in top-right (matches screenshot) */}
      <div className="chat-page-topbar">
        <Link to="/feed" className="chat-page-title-link">{questionnaire.title}</Link>
      </div>

      {/* Scrollable main area */}
      <div className="chat-scroll">
        {/* Narrative block */}
        {questionnaire.narrative && (
          <div className="chat-narrative-block">
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(questionnaire.narrative) }}
            />
          </div>
        )}

        {/* AI Summary Notice */}
        {!!questionnaire.ai_summary_enabled && (
          <div className="ai-notice-banner" style={{ margin: '0 16px 16px 16px' }}>
            <span className="ai-notice-icon">✨</span>
            <div className="ai-notice-text">
              完成对话后，AI 将为你生成个性化总结
            </div>
          </div>
        )}

        {/* Chat message list */}
        <div className="chat-msg-list">
          {history.map((item, idx) => {
            if (item.type === 'q') {
              return (
                <div key={idx} className="chat-row-left">
                  <div className="chat-avatar-circle">👤</div>
                  <div className="chat-q-bubble">
                    <span>{item.text}</span>
                  </div>
                </div>
              );
            }
            if (item.type === 'a') {
              const isEditing = editingIndex === idx;
              return (
                <div key={idx} className="chat-row-right">
                  <div className="chat-a-block">
                    <div className="chat-a-name">{item.name}</div>
                    {isEditing ? (
                      <div className="chat-edit-container">
                        <input
                          type="text"
                          className="chat-edit-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(idx);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          autoFocus
                        />
                        <div className="chat-edit-buttons">
                          <button className="chat-edit-save" onClick={() => saveEdit(idx)}>✓</button>
                          <button className="chat-edit-cancel" onClick={cancelEditing}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <div className="chat-a-text-wrapper">
                        <div className="chat-a-text">{item.text}</div>
                        <button
                          className="chat-edit-btn"
                          onClick={() => startEditing(idx, item.text)}
                          title="编辑"
                        >
                          ✎
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="chat-avatar-circle chat-avatar-dog">🐶</div>
                </div>
              );
            }
            return null;
          })}

          {/* Option buttons for current question — appear inline below the question */}
          {hasOptions && (
            <div className="chat-options-row">
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt.id}
                  className="chat-opt"
                  onClick={() => submitAnswer(opt.text)}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Fixed input bar at bottom */}
      <div className="chat-bar">
        {error && <div className="chat-bar-error">{error}</div>}
        {isDone ? (
          <button
            className="chat-final-btn"
            onClick={handleFinalSubmit}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '提交答案'}
          </button>
        ) : (
          <div className="chat-bar-row">
            <input
              ref={inputRef}
              type="text"
              className="chat-bar-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入答案..."
            />
            <button
              className="chat-bar-send"
              onClick={() => submitAnswer(inputValue)}
              disabled={!inputValue.trim()}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
