import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import Navbar from './components/Navbar';
import LanguageSwitcher from './components/LanguageSwitcher';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Questionnaire from './pages/Questionnaire';
import Summary from './pages/Summary';
import SharedSummary from './pages/SharedSummary';
import Dashboard from './pages/admin/Dashboard';
import CreateQuestionnaire from './pages/admin/CreateQuestionnaire';

export default function App() {
  const { loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return <div className="loading">{t('feed.loading')}</div>;
  }

  return (
    <>
      <header className="top-header">
        <LanguageSwitcher />
      </header>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/questionnaire/:id" element={<Questionnaire />} />
        <Route path="/shared/:shareToken" element={<SharedSummary />} />
        <Route
          path="/summary/:id"
          element={
            <ProtectedRoute>
              <Summary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/create"
          element={
            <ProtectedRoute adminOnly>
              <CreateQuestionnaire />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/feed" replace />} />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </>
  );
}
