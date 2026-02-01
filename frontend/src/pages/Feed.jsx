import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Feed() {
  const [questionnaires, setQuestionnaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const { token, user } = useAuth();
  const { t, language } = useLanguage();

  const isAuthenticated = !!user;

  useEffect(() => {
    fetchQuestionnaires();
  }, [token, language]);

  const fetchQuestionnaires = async () => {
    try {
      const endpoint = isAuthenticated
        ? `/api/questionnaires?language=${language}`
        : `/api/questionnaires/public?language=${language}`;
      const headers = isAuthenticated ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error(t('errors.failedToFetch'));
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

  // Get first questionnaire for hero section
  const featuredItem = filteredQuestionnaires[0];
  const remainingItems = filteredQuestionnaires.slice(1);

  // Recent 4 questionnaires (by index in the sorted list) are accessible without login
  const isRecentQuestionnaire = (index) => index < 4;

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>{t('feed.loading')}</p>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Hero/Featured Section - First questionnaire is always accessible */}
      {featuredItem && (
        <Link
          to={`/questionnaire/${featuredItem.id}`}
          className="hero-link"
        >
          <div
            className="hero"
            style={featuredItem.image_url ? {
              backgroundImage: `linear-gradient(180deg, transparent 0%, rgba(26, 31, 61, 0.7) 50%, var(--bg-primary) 100%), url(${featuredItem.image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
          >
            <h1>{featuredItem.title}</h1>
            <p>{featuredItem.description || featuredItem.creator_email}</p>
            {!isAuthenticated && (
              <div className="hero-buttons">
                <span className="btn btn-primary">{t('feed.startNow')}</span>
              </div>
            )}
          </div>
        </Link>
      )}

      {/* Section Header */}
      <h2 className="section-header">
        {isAuthenticated ? t('feed.yourQuestionnaires') : t('feed.latest')}
      </h2>

      {/* Filter (for authenticated users) */}
      {isAuthenticated && (
        <div className="mb-10">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('feed.filterAll')}</option>
            <option value="pending">{t('feed.filterPending')}</option>
            <option value="completed">{t('feed.filterCompleted')}</option>
          </select>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {/* Tiles Grid */}
      {remainingItems.length === 0 && !featuredItem ? (
        <div className="card text-center">
          <p>{t('feed.noQuestionnaires')}</p>
        </div>
      ) : (
        <div className="tiles-grid">
          {remainingItems.map((q, index) => {
            // index + 1 because featuredItem is index 0
            const canAccessWithoutLogin = isRecentQuestionnaire(index + 1);
            const targetUrl = isAuthenticated
              ? (q.completed > 0 ? `/summary/${q.id}` : `/questionnaire/${q.id}`)
              : (canAccessWithoutLogin ? `/questionnaire/${q.id}` : `/login?redirect=/questionnaire/${q.id}`);

            return (
            <Link
              key={q.id}
              to={targetUrl}
              className="tile"
            >
              <div className="tile-image">
                {q.image_url ? (
                  <img src={q.image_url} alt={q.title} />
                ) : (
                  <div className="tile-placeholder">
                    {q.title.charAt(0).toUpperCase()}
                  </div>
                )}
                {isAuthenticated && (
                  <span className={`tile-badge ${q.completed > 0 ? 'completed' : ''}`}>
                    {q.completed > 0 ? t('feed.done') : t('feed.new')}
                  </span>
                )}
              </div>
              <div className="tile-content">
                <h3 className="tile-title">{q.title}</h3>
                <p className="tile-description">
                  {q.description || `${q.question_count || 0} ${t('feed.questions')}`}
                </p>
              </div>
            </Link>
            );
          })}
        </div>
      )}

      {/* Promo Banner (for non-authenticated users) */}
      {!isAuthenticated && (
        <div className="promo-banner">
          <div className="promo-content">
            <div className="promo-icon">👋</div>
            <div className="promo-text">
              <div className="promo-banner-title">{t('promo.joinUs')}</div>
              <div className="promo-banner-subtitle">{t('promo.trackProgress')}</div>
            </div>
          </div>
          <div className="promo-buttons">
            <Link to="/login" className="btn btn-outline">{t('auth.login')}</Link>
            <Link to="/register" className="btn btn-primary">{t('auth.register')}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
