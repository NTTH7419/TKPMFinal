import React, { useState } from 'react';
import { WorkshopListPage } from './pages/WorkshopListPage';
import { WorkshopDetailPage } from './pages/WorkshopDetailPage';
import { MyRegistrationsPage } from './pages/MyRegistrationsPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentCheckoutPage } from './pages/PaymentCheckoutPage';

type Tab = 'workshops' | 'my-registrations';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paymentRegistrationId, setPaymentRegistrationId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('workshops');

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setSelectedId(null);
    setTab('workshops');
  };

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    color: active ? '#fff' : '#bfdbfe',
    fontWeight: active ? 700 : 400,
    fontSize: 14,
    cursor: 'pointer',
    padding: '4px 2px',
    borderBottom: active ? '2px solid #fff' : '2px solid transparent',
    background: 'none',
    border: 'none',
    borderBottomColor: active ? '#fff' : 'transparent',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{ background: '#3b82f6', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span
            style={{ color: '#fff', fontWeight: 700, fontSize: 20, cursor: 'pointer' }}
            onClick={() => { setTab('workshops'); setSelectedId(null); }}
          >
            UniHub Student
          </span>
          <button
            style={navLinkStyle(tab === 'workshops' && !selectedId)}
            onClick={() => { setTab('workshops'); setSelectedId(null); }}
          >
            Workshop
          </button>
          <button
            style={navLinkStyle(tab === 'my-registrations')}
            onClick={() => { setTab('my-registrations'); setSelectedId(null); }}
          >
            Đăng ký của tôi
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#eff6ff', fontSize: 14 }}>{user.fullName}</span>
          <button onClick={logout} style={{ background: 'none', border: '1px solid #93c5fd', color: '#fff', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Đăng xuất</button>
        </div>
      </nav>
      <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
        {paymentRegistrationId ? (
          <PaymentCheckoutPage
            registrationId={paymentRegistrationId}
            onSuccess={() => {
              setPaymentRegistrationId(null);
              setTab('my-registrations');
            }}
          />
        ) : selectedId ? (
          <WorkshopDetailPage
            workshopId={selectedId}
            onBack={() => setSelectedId(null)}
            onPaymentRequired={setPaymentRegistrationId}
          />
        ) : tab === 'my-registrations' ? (
          <MyRegistrationsPage />
        ) : (
          <WorkshopListPage onSelect={setSelectedId} />
        )}
      </div>
    </div>
  );
}
