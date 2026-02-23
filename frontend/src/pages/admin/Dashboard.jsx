import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const [questionnaires, setQuestionnaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  const fetchQuestionnaires = async () => {
    try {
      const res = await fetch('/api/questionnaires', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch questionnaires');
      const data = await res.json();
      setQuestionnaires(data.questionnaires);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/backup/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this questionnaire?')) return;

    try {
      const res = await fetch(`/api/questionnaires/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      setQuestionnaires(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <div className="admin-section">
        <div className="flex justify-between">
          <h2>Admin Dashboard</h2>
          <div className="flex gap-10">
            <button onClick={handleExport} className="btn btn-secondary">
              Export Data
            </button>
            <Link to="/admin/create" className="btn btn-primary">
              Create Questionnaire
            </Link>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-section">
        <h2>All Questionnaires</h2>
        {questionnaires.length === 0 ? (
          <div className="card">
            <p className="text-center">No questionnaires yet. Create your first one!</p>
          </div>
        ) : (
          questionnaires.map(q => (
            <div key={q.id} className="card">
              <div className="flex justify-between">
                <div>
                  <h3 className="card-title">{q.title}</h3>
                  {q.description && <p className="card-description">{q.description}</p>}
                  <p className="card-meta">Created {new Date(q.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-10">
                  <Link to={q.type === 'chat' ? `/chat/${q.id}` : `/questionnaire/${q.id}`} className="btn btn-secondary">
                    Preview
                  </Link>
                  <Link to={`/admin/responses/${q.id}`} className="btn btn-secondary">
                    Responses{q.response_count > 0 ? ` (${q.response_count}` : ''}
                    {q.new_response_count > 0 && <span style={{ color: '#4ade80', fontWeight: 700 }}> +{q.new_response_count}</span>}
                    {q.response_count > 0 ? ')' : ''}
                  </Link>
                  <Link to={`/admin/edit/${q.id}`} className="btn btn-primary">
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
