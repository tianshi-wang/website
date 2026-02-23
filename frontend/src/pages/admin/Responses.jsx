import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Responses() {
  const { id } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetch(`/api/responses/admin/questionnaire/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  const getShareUrl = (r) => {
    const path = data?.questionnaire?.type === 'chat'
      ? `/shared-chat/${r.share_token}`
      : `/shared/${r.share_token}`;
    return `${window.location.origin}${path}`;
  };

  const handleCopy = async (r) => {
    const url = getShareUrl(r);
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(r.id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="container"><div className="error-message">{error}</div></div>;

  const responses = data?.responses || [];
  const title = responses[0]?.questionnaire_id ? `Questionnaire #${id}` : `Questionnaire #${id}`;

  return (
    <div className="container">
      <div className="admin-section">
        <div className="flex justify-between">
          <h2>Responses — {title}</h2>
          <Link to="/admin" className="btn btn-secondary">← Back</Link>
        </div>
      </div>

      <div className="admin-section">
        {responses.length === 0 ? (
          <div className="card"><p className="text-center">No responses yet.</p></div>
        ) : (
          responses.map(r => {
            const name = r.user_alias || r.user_email || r.guest_alias || 'Anonymous';
            const shareUrl = getShareUrl(r);
            const date = new Date(r.completed_at).toLocaleString();
            return (
              <div key={r.id} className="card" style={{ marginBottom: '12px' }}>
                <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <strong>{name}</strong>
                    <p className="card-meta">{date}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-all', marginTop: '4px' }}>
                      {shareUrl}
                    </p>
                  </div>
                  <div className="flex gap-10" style={{ flexShrink: 0, marginLeft: '12px' }}>
                    <a href={shareUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                      View
                    </a>
                    <button onClick={() => handleCopy(r)} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                      {copied === r.id ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
                {r.answers?.length > 0 && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                    {r.answers.map(a => (
                      <div key={a.id} style={{ marginBottom: '6px', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{a.question_text}: </span>
                        <span>{a.answer_text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
