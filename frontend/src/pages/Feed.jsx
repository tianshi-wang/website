import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Feed() {
  const [questionnaires, setQuestionnaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const { token, user } = useAuth();

  const isAuthenticated = !!user;

  useEffect(() => {
    fetchQuestionnaires();
  }, [token]);

  const fetchQuestionnaires = async () => {
    try {
      const endpoint = isAuthenticated ? '/api/questionnaires' : '/api/questionnaires/public';
      const headers = isAuthenticated ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error('Failed to fetch questionnaires');
      const data = await res.json();
      setQuestionnaires(data.questionnaires);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestionnaires = questionnaires.filter(q => {
    if (!isAuthenticated) return true;
    if (filter === 'completed') return q.completed > 0;
    if (filter === 'pending') return q.completed === 0;
    return true;
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading questionnaires...</p>
      </div>
    );
  }

  return (
    <div className="container">
      {!isAuthenticated && (
        <div className="hero">
          <h1>Welcome to Questionnaire App</h1>
          <p>Discover and complete questionnaires on various topics. Sign up to track your progress and save your responses.</p>
          <div className="hero-buttons">
            <Link to="/register" className="btn btn-primary">Get Started</Link>
            <Link to="/login" className="btn btn-outline">Sign In</Link>
          </div>
        </div>
      )}

      <div className="questionnaire-header">
        <h1>{isAuthenticated ? 'Your Questionnaires' : 'Browse Questionnaires'}</h1>
        <p>{isAuthenticated ? 'Select a questionnaire to fill out' : 'Login to start taking questionnaires'}</p>
      </div>

      {isAuthenticated && (
        <div className="mb-10">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="all">All Questionnaires</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {filteredQuestionnaires.length === 0 ? (
        <div className="card">
          <p className="text-center">No questionnaires found.</p>
        </div>
      ) : (
        filteredQuestionnaires.map(q => (
          <div key={q.id} className="card">
            <div className="flex justify-between">
              <div>
                <h3 className="card-title">{q.title}</h3>
                {q.description && <p className="card-description">{q.description}</p>}
                <p className="card-meta">Created by {q.creator_email}</p>
                {q.question_count !== undefined && (
                  <p className="question-count">{q.question_count} question{q.question_count !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div>
                {isAuthenticated ? (
                  q.completed > 0 ? (
                    <>
                      <span className="badge badge-success">Completed</span>
                      <div className="mt-20">
                        <Link to={`/summary/${q.id}`} className="btn btn-secondary">
                          View Summary
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="badge badge-pending">Pending</span>
                      <div className="mt-20">
                        <Link to={`/questionnaire/${q.id}`} className="btn btn-primary">
                          Start
                        </Link>
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <span className="badge badge-info">Preview</span>
                    <div className="mt-20">
                      <Link
                        to={`/login?redirect=/questionnaire/${q.id}`}
                        className="btn btn-primary"
                      >
                        Login to Start
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
