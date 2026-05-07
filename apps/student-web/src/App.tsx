import React, { useState } from 'react';
import { WorkshopListPage } from './pages/WorkshopListPage';
import { WorkshopDetailPage } from './pages/WorkshopDetailPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setSelectedId(null);
  };

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{ background: '#3b82f6', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <span
          style={{ color: '#fff', fontWeight: 700, fontSize: 20, cursor: 'pointer' }}
          onClick={() => setSelectedId(null)}
        >
          🎓 UniHub Student
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#eff6ff', fontSize: 14 }}>{user.fullName}</span>
          <button onClick={logout} style={{ background: 'none', border: '1px solid #93c5fd', color: '#fff', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Đăng xuất</button>
        </div>
      </nav>
      <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
        {selectedId ? (
          <WorkshopDetailPage workshopId={selectedId} onBack={() => setSelectedId(null)} />
        ) : (
          <WorkshopListPage onSelect={setSelectedId} />
        )}
      </div>
    </div>
  );
}
