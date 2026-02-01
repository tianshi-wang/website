import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useLanguage } from '../context/LanguageContext';

export default function SharedSummary() {
  const { shareToken } = useParams();
  const { t, language } = useLanguage();

  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);
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
    fetchSharedResponse();
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [shareToken]);

  const fetchSharedResponse = async () => {
    try {
      const res = await fetch(`/api/responses/shared/${shareToken}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(language === 'zh' ? '找不到此分享链接' : 'Shared response not found');
        }
        throw new Error(t('errors.failedToFetch'));
      }
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

  const handleCopyLink = async () => {
    const shareUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: response?.questionnaire?.title || 'My Questionnaire Response',
      text: language === 'zh' ? '来看看我的答案吧！' : 'Check out my answers!',
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) return <div className="loading">{t('feed.loading')}</div>;
  if (error) return (
    <div className="container">
      <div className="error-message">{error}</div>
      <div className="text-center mt-20">
        <Link to="/feed" className="btn btn-primary">
          {language === 'zh' ? '浏览问卷' : 'Browse Questionnaires'}
        </Link>
      </div>
    </div>
  );
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
          <p className="shared-by">
            {language === 'zh' ? `回答者: ${response.displayName}` : `By: ${response.displayName}`}
          </p>
        </div>

        {/* Share Section */}
        <div className="share-section">
          <p className="share-label">
            {language === 'zh' ? '分享这个链接给朋友' : 'Share this link with friends'}
          </p>
          <div className="share-buttons">
            <button className="btn btn-primary" onClick={handleShare}>
              {language === 'zh' ? '分享' : 'Share'}
            </button>
            <button className="btn btn-secondary" onClick={handleCopyLink}>
              {copied
                ? (language === 'zh' ? '已复制!' : 'Copied!')
                : (language === 'zh' ? '复制链接' : 'Copy Link')}
            </button>
          </div>
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

        {/* CTA to take the same questionnaire */}
        <div className="cta-section">
          <p className="cta-text">
            {language === 'zh' ? '想要回答同样的问卷吗？' : 'Want to answer the same questionnaire?'}
          </p>
          <Link to={`/questionnaire/${response.questionnaire.id}`} className="btn btn-primary">
            {language === 'zh' ? '开始答题' : 'Take This Questionnaire'}
          </Link>
        </div>

        <div className="text-center mt-20">
          <Link to="/feed" className="btn btn-secondary">
            {language === 'zh' ? '浏览更多问卷' : 'Browse More Questionnaires'}
          </Link>
        </div>
      </div>
    </>
  );
}
