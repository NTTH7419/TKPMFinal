import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { WorkshopListPage } from './pages/WorkshopListPage';
import { WorkshopDetailPage } from './pages/WorkshopDetailPage';
import { MyRegistrationsPage } from './pages/MyRegistrationsPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentCheckoutPage } from './pages/PaymentCheckoutPage';
import NotificationBell from './components/NotificationBell';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') ?? 'null'); } catch { return null; }
  })();

  const logout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const isWorkshops = location.pathname.startsWith('/workshops');
  const isMyReg = location.pathname === '/my-registrations';

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    color: active ? '#fff' : '#bfdbfe',
    fontWeight: active ? 700 : 400,
    fontSize: 14,
    cursor: 'pointer',
    padding: '4px 2px',
    borderBottom: active ? '2px solid #fff' : '2px solid transparent',
    textDecoration: 'none',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav className="nav-bar" style={{ background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, flexWrap: 'wrap', gap: 8 }}>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link className="nav-brand" to="/workshops" style={{ color: '#fff', fontWeight: 700, fontSize: 20, textDecoration: 'none' }}>
            UniHub Student
          </Link>
          <Link to="/workshops" style={navLinkStyle(isWorkshops)}>Workshop</Link>
          <Link to="/my-registrations" style={navLinkStyle(isMyReg)}>Đăng ký của tôi</Link>
        </div>
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NotificationBell />
          {user && <span style={{ color: '#eff6ff', fontSize: 14 }}>{user.fullName}</span>}
          <button onClick={logout} style={{ background: 'none', border: '1px solid #93c5fd', color: '#fff', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            Đăng xuất
          </button>
        </div>
      </nav>
      <div className="layout-content" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Routes>
          <Route path="/workshops" element={<WorkshopListPage />} />
          <Route path="/workshops/:id" element={<WorkshopDetailPage />} />
          <Route path="/my-registrations" element={<MyRegistrationsPage />} />
          <Route path="/payment/:registrationId" element={<PaymentCheckoutPage />} />
          <Route path="*" element={<Navigate to="/workshops" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
