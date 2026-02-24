import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useAuth } from '../context/AuthContext';

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

function formatAnswer(answer) {
  if (!answer) return '-';
  try {
    const parsed = JSON.parse(answer);
    if (Array.isArray(parsed)) return parsed.join(', ');
    return answer;
  } catch {
    return answer;
  }
}

export default function ChatSummary() {
  const { id } = useParams();
  const { token } = useAuth();

  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchResponse();
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [id]);

  const fetchResponse = async () => {
    try {
      const res = await fetch(`/api/responses/questionnaire/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setResponse(data.response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getShareUrl = () => response?.share_token
    ? `${window.location.origin}/shared-chat/${response.share_token}`
    : null;

  const handleCopyLink = async () => {
    const url = getShareUrl();
    if (!url) return;
    try { await navigator.clipboard.writeText(url); }
    catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = getShareUrl();
    if (!url) return;
    if (navigator.share) { try { await navigator.share({ title: response?.questionnaire?.title, url }); return; } catch {} }
    handleCopyLink();
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="container"><div className="error-message">{error}</div></div>;
  if (!response) return null;

  const questions = response.questions;
  const userName = formatAnswer(questions[0]?.answer_text) || '你';
  const shareUrl = getShareUrl();

  return (
    <>
      {showConfetti && (
        <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={300}
          colors={['#e87f7f', '#f5a3a3', '#4ade80', '#fbbf24', '#60a5fa', '#a78bfa']} />
      )}
      <div className="chat-summary-page">
        <div className="chat-page-topbar">
          <Link to="/feed" className="chat-page-title-link">{response.questionnaire.title}</Link>
        </div>

        {response.questionnaire.narrative && (
          <div className="chat-scroll" style={{ padding: '0 16px' }}>
            <div className="chat-narrative-block"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(response.questionnaire.narrative) }} />
          </div>
        )}

        <div style={{ padding: '0 16px' }}>
          <div className="chat-msg-list">
            {questions.map((question) => (
              <div key={question.id}>
                <div className="chat-row-left">
                  <div className="chat-avatar-circle">👤</div>
                  <div className="chat-q-bubble">{question.text}</div>
                </div>
                {question.answer_text && (
                  <div className="chat-row-right" style={{ marginTop: '8px' }}>
                    <div className="chat-a-block">
                      <div className="chat-a-name">{userName}</div>
                      <div className="chat-a-text">{formatAnswer(question.answer_text)}</div>
                    </div>
                    <div className="chat-avatar-circle chat-avatar-dog">🐶</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI Summary Section */}
          {response.ai_summary && response.questionnaire?.ai_summary_enabled && (
            <div className="ai-summary-section">
              <div className="ai-summary-header">
                <span className="ai-badge">🤖 AI</span>
                <h2>AI 总结</h2>
              </div>
              <div className="ai-summary-content">
                {response.ai_summary}
              </div>
            </div>
          )}

          {shareUrl && (
            <div className="chat-share-section">
              <p className="share-label">分享你的答案</p>
              <div className="share-buttons">
                <button className="btn btn-primary" onClick={handleShare}>分享</button>
                <button className="btn btn-secondary" onClick={handleCopyLink}>
                  {copied ? '已复制!' : '复制链接'}
                </button>
              </div>
            </div>
          )}

          <div className="text-center mt-20">
            <Link to="/feed" className="btn btn-primary">浏览更多</Link>
          </div>
        </div>
      </div>
    </>
  );
}
