import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/feed') {
      return location.pathname === '/' || location.pathname === '/feed';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav">
      <Link to="/feed" className={`nav-item ${isActive('/feed') ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </Link>

      <Link to="/feed" className="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </Link>

      {isAdmin && (
        <Link to="/admin" className={`nav-item ${isActive('/admin') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </Link>
      )}

      <Link
        to={user ? "/profile" : "/login"}
        className={`nav-item ${isActive('/login') || isActive('/register') || isActive('/profile') ? 'active' : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </Link>
    </nav>
  );
}
