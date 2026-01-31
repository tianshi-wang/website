import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Register() {
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!alias.trim()) {
      setError(t('errors.aliasRequired'));
      return;
    }

    if (alias.length < 2 || alias.length > 30) {
      setError(t('errors.aliasLength'));
      return;
    }

    if (!ageVerified) {
      setError(t('errors.ageVerificationRequired'));
      return;
    }

    if (password.length < 6) {
      setError(t('errors.passwordLength'));
      return;
    }

    setLoading(true);

    try {
      await register({
        alias: alias.trim(),
        password,
        email: email.trim() || null,
        age_verified: ageVerified
      });
      navigate('/feed');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="form-container">
        <h2>{t('auth.register')}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="alias">{t('auth.alias')} *</label>
            <input
              type="text"
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder={t('auth.aliasPlaceholder')}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">
              {t('auth.email')} <span className="optional-label">({t('auth.optional')})</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
            />
            <small className="form-hint">{t('auth.emailHint')}</small>
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('auth.password')} *</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <small className="form-hint">{t('auth.passwordHint')}</small>
          </div>
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={ageVerified}
                onChange={(e) => setAgeVerified(e.target.checked)}
              />
              <span>{t('auth.ageVerification')} *</span>
            </label>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('auth.registering') : t('auth.register')}
          </button>
        </form>
        <p className="text-center mt-20">
          {t('auth.haveAccount')} <Link to="/login" className="link">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
}
