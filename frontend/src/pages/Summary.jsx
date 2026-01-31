import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Summary() {
  const { id } = useParams();
  const { token } = useAuth();
  const { t } = useLanguage();

  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchResponse();
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [id]);

  const fetchResponse = async () => {
    try {
      const res = await fetch(`/api/responses/questionnaire/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(t('errors.failedToFetch'));
      const data = await res.json();
      setResponse(data.response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatAnswer = (answer) => {
    if (!answer) return '-';
    try {
      const parsed = JSON.parse(answer);
      if (Array.isArray(parsed)) {
        return parsed.join(', ');
      }
      return answer;
    } catch {
      return answer;
    }
  };

  if (loading) return <div className="loading">{t('feed.loading')}</div>;
  if (error) return <div className="container"><div className="error-message">{error}</div></div>;
  if (!response) return null;

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          colors={['#e87f7f', '#f5a3a3', '#4ade80', '#fbbf24', '#60a5fa', '#a78bfa']}
        />
      )}
      <div className="container">
        <div className="celebration-header">
          <div className="celebration-emoji">🎉</div>
          <h1 className="celebration-title">{t('summary.completed')}</h1>
          <p className="celebration-subtitle">{response.questionnaire.title}</p>
        </div>

        <div className="questionnaire-header">
          <h2>{t('summary.yourAnswers')}</h2>
          <p className="card-meta">{new Date(response.completed_at).toLocaleString()}</p>
        </div>

        {response.questions.map((question, idx) => (
          <div key={question.id} className="summary-item">
            <p className="summary-question">
              Q{question.order_num + 1}. {question.text}
            </p>
            <p className="summary-answer">
              {formatAnswer(question.answer_text)}
            </p>
          </div>
        ))}

        <div className="text-center mt-20">
          <Link to="/feed" className="btn btn-primary">
            {t('summary.backToFeed')}
          </Link>
        </div>
      </div>
    </>
  );
}
