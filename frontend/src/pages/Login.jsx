import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'alias'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect URL from query params or default to /feed
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '/feed';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(identifier, password, loginMethod);
      navigate(redirectTo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLoginMethod = () => {
    setLoginMethod(prev => prev === 'email' ? 'alias' : 'email');
    setIdentifier('');
  };

  return (
    <div className="container">
      <div className="form-container">
        <h2>{t('auth.login')}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="identifier">
              {loginMethod === 'email' ? t('auth.email') : t('auth.alias')}
            </label>
            <input
              type={loginMethod === 'email' ? 'email' : 'text'}
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={loginMethod === 'email' ? t('auth.emailPlaceholder') : t('auth.aliasPlaceholder')}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>
        <button
          type="button"
          className="login-toggle-btn"
          onClick={toggleLoginMethod}
        >
          {loginMethod === 'email' ? t('auth.loginWithAlias') : t('auth.loginWithEmail')}
        </button>
        <p className="text-center mt-20">
          {t('auth.noAccount')} <Link to="/register" className="link">{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  );
}
