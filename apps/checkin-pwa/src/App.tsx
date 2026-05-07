import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import WorkshopSelectPage from './pages/WorkshopSelectPage';
import ScanPage from './pages/ScanPage';

export type AuthState = { token: string; userId: string } | null;

export default function App() {
  const [auth, setAuth] = useState<AuthState>(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={setAuth} />} />
        <Route
          path="/workshops"
          element={auth ? <WorkshopSelectPage auth={auth} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/scan/:workshopId"
          element={auth ? <ScanPage auth={auth} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={auth ? '/workshops' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
