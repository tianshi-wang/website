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
  const { t, language } = useLanguage();
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
    <div
      className="register-page"
      style={{
        backgroundImage: 'linear-gradient(180deg, rgba(26, 31, 61, 0.85) 0%, rgba(26, 31, 61, 0.95) 100%), url(/images/register_bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
        paddingTop: '20px'
      }}
    >
      <div className="container">
        {/* Marketing Copy */}
        <div className="register-promo">
          <div className="promo-tagline">
            <p>爱需要想象</p>
            <p>性需要创意</p>
          </div>
          <div className="promo-description">
            <p>在这里点燃欲火</p>
            <p>在这里拓展禁忌</p>
            <p>在这里赤裸地了解自己</p>
          </div>
          <div className="promo-highlight">
            <p>最淫荡的性爱</p>
            <p>最让人腿软的满足</p>
          </div>
        </div>

        <div className="form-container register-form-container">
          <h2>{language === 'zh' ? '免费注册' : t('auth.register')}</h2>
          <p className="register-cta">{language === 'zh' ? '现在就来玩' : 'Start playing now'}</p>

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
              <label htmlFor="password">{t('auth.password')} *</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <small className="form-hint">
                {language === 'zh' ? '长度6位以上' : 'At least 6 characters'}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="email">
                {t('auth.email')} <span className="optional-label">({language === 'zh' ? '可不填' : 'optional'})</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
              />
              <small className="form-hint">
                {language === 'zh'
                  ? '选填，用于找回密码'
                  : 'Optional, for password recovery'}
              </small>
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
              {loading ? t('auth.registering') : (language === 'zh' ? '免费注册' : t('auth.register'))}
            </button>
          </form>

          <p className="text-center mt-20">
            {t('auth.haveAccount')} <Link to="/login" className="link">{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
