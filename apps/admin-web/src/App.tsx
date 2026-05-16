import { useState } from 'react';
import { WorkshopListPage } from './pages/WorkshopListPage';
import { WorkshopDetailPage } from './pages/WorkshopDetailPage';
import { ImportHistoryPage } from './pages/ImportHistoryPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [section, setSection] = useState<'workshops' | 'imports'>('workshops');
  const [page, setPage] = useState<string | null>(null);

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setPage(null);
  };

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{ background: '#1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 20, cursor: 'pointer' }} onClick={() => { setSection('workshops'); setPage(null); }}>
            🎓 UniHub Admin
          </span>
          <button
            onClick={() => { setSection('workshops'); setPage(null); }}
            style={{ background: 'none', border: 'none', color: section === 'workshops' ? '#fff' : '#94a3b8', fontSize: 14, cursor: 'pointer', fontWeight: section === 'workshops' ? 700 : 400, borderBottom: section === 'workshops' ? '2px solid #6366f1' : 'none', paddingBottom: 2 }}
          >
            Workshops
          </button>
          <button
            onClick={() => { setSection('imports'); setPage(null); }}
            style={{ background: 'none', border: 'none', color: section === 'imports' ? '#fff' : '#94a3b8', fontSize: 14, cursor: 'pointer', fontWeight: section === 'imports' ? 700 : 400, borderBottom: section === 'imports' ? '2px solid #6366f1' : 'none', paddingBottom: 2 }}
          >
            Import SV
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>Chào, {user.fullName}</span>
          <button onClick={logout} style={{ background: 'none', border: '1px solid #475569', color: '#fff', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Đăng xuất</button>
        </div>
      </nav>
      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {section === 'imports' ? (
          <ImportHistoryPage />
        ) : page !== null ? (
          <WorkshopDetailPage workshopId={page} onBack={() => setPage(null)} />
        ) : (
          <WorkshopListPage onSelect={setPage} />
        )}
      </div>
    </div>
  );
}
