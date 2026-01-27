import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/feed');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Questionnaire App</Link>
      <div className="navbar-links">
        <Link to="/feed">Browse</Link>
        {user ? (
          <>
            {isAdmin && <Link to="/admin">Admin</Link>}
            <span className="navbar-user">{user.email}</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
