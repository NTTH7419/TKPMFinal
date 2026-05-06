import React, { useState } from 'react';
import { WorkshopListPage } from './pages/WorkshopListPage';
import { WorkshopDetailPage } from './pages/WorkshopDetailPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
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
        <span
          style={{ color: '#fff', fontWeight: 700, fontSize: 20, cursor: 'pointer' }}
          onClick={() => setPage(null)}
        >
          🎓 UniHub Admin
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>Chào, {user.fullName}</span>
          <button onClick={logout} style={{ background: 'none', border: '1px solid #475569', color: '#fff', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Đăng xuất</button>
        </div>
      </nav>
      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {page !== null ? (
          <WorkshopDetailPage workshopId={page} onBack={() => setPage(null)} />
        ) : (
          <WorkshopListPage onSelect={setPage} />
        )}
      </div>
    </div>
  );
}
