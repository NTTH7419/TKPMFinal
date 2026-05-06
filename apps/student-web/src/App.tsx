import React, { useState } from 'react';
import { WorkshopListPage } from './pages/WorkshopListPage';
import { WorkshopDetailPage } from './pages/WorkshopDetailPage';

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: 60,
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>🎓 UniHub</span>
      </nav>

      {selectedId ? (
        <WorkshopDetailPage workshopId={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <WorkshopListPage onSelect={setSelectedId} />
      )}
    </div>
  );
}
