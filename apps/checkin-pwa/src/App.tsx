import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import WorkshopSelectPage from './pages/WorkshopSelectPage';
import ScanPage from './pages/ScanPage';

export type AuthState = { token: string; userId: string } | null;

const AUTH_KEY = 'checkin-auth';

function AppRoutes() {
  const navigate = useNavigate();
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const saved = sessionStorage.getItem(AUTH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  function handleLogin(newAuth: AuthState) {
    setAuth(newAuth);
    if (newAuth) sessionStorage.setItem(AUTH_KEY, JSON.stringify(newAuth));
    else sessionStorage.removeItem(AUTH_KEY);
  }

  function handleLogout(reason?: string) {
    setAuth(null);
    sessionStorage.removeItem(AUTH_KEY);
    navigate('/login', { replace: true, state: { reason } });
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route
        path="/workshops"
        element={auth ? <WorkshopSelectPage auth={auth} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/scan/:workshopId"
        element={auth ? <ScanPage auth={auth} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={auth ? '/workshops' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
