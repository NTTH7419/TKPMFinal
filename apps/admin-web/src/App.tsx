import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { WorkshopListPage } from './pages/WorkshopListPage';
import { WorkshopDetailPage } from './pages/WorkshopDetailPage';
import { ImportHistoryPage } from './pages/ImportHistoryPage';
import { LoginPage } from './pages/LoginPage';

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
  const isImports = location.pathname === '/import-history';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{ background: '#1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/workshops" style={{ color: '#fff', fontWeight: 700, fontSize: 20, textDecoration: 'none' }}>
            <FontAwesomeIcon icon={faGraduationCap} style={{ marginRight: 8 }} />UniHub Admin
          </Link>
          <Link
            to="/workshops"
            style={{ color: isWorkshops ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: isWorkshops ? 700 : 400, textDecoration: 'none', borderBottom: isWorkshops ? '2px solid #6366f1' : 'none', paddingBottom: 2 }}
          >
            Workshops
          </Link>
          <Link
            to="/import-history"
            style={{ color: isImports ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: isImports ? 700 : 400, textDecoration: 'none', borderBottom: isImports ? '2px solid #6366f1' : 'none', paddingBottom: 2 }}
          >
            Import SV
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user && <span style={{ color: '#94a3b8', fontSize: 14 }}>Chào, {user.fullName}</span>}
          <button onClick={logout} style={{ background: 'none', border: '1px solid #475569', color: '#fff', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            Đăng xuất
          </button>
        </div>
      </nav>
      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <Routes>
          <Route path="/workshops" element={<WorkshopListPage />} />
          <Route path="/workshops/:id" element={<WorkshopDetailPage />} />
          <Route path="/import-history" element={<ImportHistoryPage />} />
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
