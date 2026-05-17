import React, { useState } from 'react';
import { Button } from '@unihub/ui/components';
import { WorkshopListPage } from './pages/WorkshopListPage';
import { WorkshopDetailPage } from './pages/WorkshopDetailPage';
import { MyRegistrationsPage } from './pages/MyRegistrationsPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentCheckoutPage } from './pages/PaymentCheckoutPage';
import NotificationBell from './components/NotificationBell';

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

  return (
    <div className="min-h-screen bg-surface font-sans">
      <nav className="bg-brand-navy px-xl flex items-center justify-between h-[60px]">
        <div className="flex items-center gap-xl">
          <span
            className="text-on-dark font-semibold text-body-md-medium cursor-pointer"
            onClick={() => { setTab('workshops'); setSelectedId(null); }}
          >
            UniHub Student
          </span>
          <button
            className={`text-body-sm pb-xxs border-b-2 bg-transparent border-0 cursor-pointer transition-colors ${
              tab === 'workshops' && !selectedId
                ? 'text-on-dark border-on-dark font-semibold'
                : 'text-on-dark-muted border-transparent'
            }`}
            onClick={() => { setTab('workshops'); setSelectedId(null); }}
          >
            Workshop
          </button>
          <button
            className={`text-body-sm pb-xxs border-b-2 bg-transparent border-0 cursor-pointer transition-colors ${
              tab === 'my-registrations'
                ? 'text-on-dark border-on-dark font-semibold'
                : 'text-on-dark-muted border-transparent'
            }`}
            onClick={() => { setTab('my-registrations'); setSelectedId(null); }}
          >
            Đăng ký của tôi
          </button>
        </div>
        <div className="flex items-center gap-lg">
          <NotificationBell />
          <span className="text-on-dark-muted text-body-sm">{user.fullName}</span>
          <Button variant="secondary-on-dark" onClick={logout}>
            Đăng xuất
          </Button>
        </div>
      </nav>
      <div className="px-xxl py-xl max-w-[1000px] mx-auto">
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
