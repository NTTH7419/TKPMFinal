import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap, faChevronDown, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
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

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64, padding: '0 32px',
      }}>
        {/* Left: brand + nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/workshops" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 16 }}>
            <span style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 10, width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 16, flexShrink: 0,
            }}>
              <FontAwesomeIcon icon={faGraduationCap} />
            </span>
            <span style={{ fontWeight: 700, fontSize: 17, color: '#1e293b', letterSpacing: '-0.3px' }}>
              UniHub <span style={{ color: '#6366f1' }}>Student</span>
            </span>
          </Link>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: '#e2e8f0', marginRight: 8 }} />

          {[
            { to: '/workshops', label: 'Workshop', active: isWorkshops },
            { to: '/my-registrations', label: 'Đăng ký của tôi', active: isMyReg },
          ].map(({ to, label, active }) => (
            <Link
              key={to}
              to={to}
              style={{
                position: 'relative',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? '#6366f1' : '#64748b',
                padding: '4px 12px',
                borderRadius: 8,
                background: active ? '#f0f0ff' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right: bell + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotificationBell />
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid #e2e8f0', cursor: 'pointer',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {user.fullName?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#334155', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.fullName}
              </span>
              <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 10, color: '#94a3b8' }} />
            </div>
          )}
          <button
            onClick={logout}
            title="Đăng xuất"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid #e2e8f0',
              color: '#64748b', padding: '6px 12px', borderRadius: 8,
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
            Đăng xuất
          </button>
        </div>
      </nav>
      <div className="layout-content" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
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
