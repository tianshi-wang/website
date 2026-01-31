import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Profile() {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/feed');
  };

  return (
    <div className="container">
      {/* Profile Section */}
      <div className="settings-section">
        <div className="settings-section-title">{t('profile.title')}</div>
        <div className="settings-list">
          {user ? (
            <>
              <div className="settings-item">
                <span>{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="settings-item"
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span>{t('auth.logout')}</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="settings-item">
              <span>{t('auth.login')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <div className="settings-section">
          <div className="settings-section-title">Admin</div>
          <div className="settings-list">
            <Link to="/admin" className="settings-item">
              <span>{t('admin.dashboard')}</span>
            </Link>
            <Link to="/admin/create" className="settings-item">
              <span>{t('admin.createQuestionnaire')}</span>
            </Link>
          </div>
        </div>
      )}

      {/* General Section */}
      <div className="settings-section">
        <div className="settings-section-title">{t('profile.general')}</div>
        <div className="settings-list">
          <div className="settings-item">
            <span>{t('profile.helpSupport')}</span>
          </div>
          <div className="settings-item">
            <span>{t('profile.privacyPolicy')}</span>
          </div>
          <div className="settings-item">
            <span>{t('profile.termsConditions')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
