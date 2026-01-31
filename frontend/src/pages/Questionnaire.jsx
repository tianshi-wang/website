import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Questionnaire() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t, tf } = useLanguage();

  const [questionnaire, setQuestionnaire] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuestionnaire();
  }, [id]);

  const fetchQuestionnaire = async () => {
    try {
      const res = await fetch(`/api/questionnaires/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(t('errors.failedToFetch'));
      const data = await res.json();
      setQuestionnaire(data.questionnaire);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPageQuestions = () => {
    if (!questionnaire) return [];
    return questionnaire.questions.filter(q => q.page_number === currentPage);
  };

  const handleTextAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSingleChoice = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultipleChoice = (questionId, value, checked) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, value] };
      } else {
        return { ...prev, [questionId]: current.filter(v => v !== value) };
      }
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionnaire_id: id,
          answers
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      navigate(`/summary/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">{t('feed.loading')}</div>;
  if (error && !questionnaire) return <div className="container"><div className="error-message">{error}</div></div>;
  if (!questionnaire) return null;

  const pageQuestions = getCurrentPageQuestions();
  const totalPages = questionnaire.totalPages;
  const isLastPage = currentPage === totalPages;

  return (
    <div className="container">
      <div className="detail-header">
        {questionnaire.image_url && (
          <img
            src={questionnaire.image_url}
            alt={questionnaire.title}
            className="detail-header-image"
          />
        )}
        <h1>{questionnaire.title}</h1>
        {questionnaire.description && (
          <p className="detail-header-tags">{questionnaire.description}</p>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {pageQuestions.map((question, idx) => (
        <div key={question.id} className="question-card">
          <p className="question-text">
            <span className="question-number">Q{question.order_num + 1}.</span> {question.text}
          </p>

          {question.type === 'text' && (
            <textarea
              className="form-group"
              rows={3}
              value={answers[question.id] || ''}
              onChange={(e) => handleTextAnswer(question.id, e.target.value)}
              placeholder={t('questionnaire.typeAnswer')}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          )}

          {question.type === 'single_choice' && (
            <ul className="options-list">
              {question.options.map(option => (
                <li key={option.id} className="option-item">
                  <label>
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option.text}
                      checked={answers[question.id] === option.text}
                      onChange={(e) => handleSingleChoice(question.id, e.target.value)}
                    />
                    {option.text}
                  </label>
                </li>
              ))}
            </ul>
          )}

          {question.type === 'multiple_choice' && (
            <ul className="options-list">
              {question.options.map(option => (
                <li key={option.id} className="option-item">
                  <label>
                    <input
                      type="checkbox"
                      value={option.text}
                      checked={(answers[question.id] || []).includes(option.text)}
                      onChange={(e) => handleMultipleChoice(question.id, e.target.value, e.target.checked)}
                    />
                    {option.text}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <div className="pagination">
        <button
          className="btn btn-secondary"
          onClick={() => setCurrentPage(p => p - 1)}
          disabled={currentPage === 1}
        >
          {t('questionnaire.previous')}
        </button>

        <span className="page-indicator">
          {tf('questionnaire.pageOf', { current: currentPage, total: totalPages })}
        </span>

        {isLastPage ? (
          <button
            className="btn btn-success"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? t('questionnaire.submitting') : t('questionnaire.submit')}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => setCurrentPage(p => p + 1)}
          >
            {t('questionnaire.next')}
          </button>
        )}
      </div>
    </div>
  );
}
