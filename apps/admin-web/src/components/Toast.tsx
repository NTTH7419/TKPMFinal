import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faInfoCircle, faXmark } from '@fortawesome/free-solid-svg-icons';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: typeof faCheckCircle }> = {
  success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534', icon: faCheckCircle },
  error:   { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: faTimesCircle },
  info:    { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: faInfoCircle },
};

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  const c = COLORS[toast.type];

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => setVisible(false), 3200);
    const remove = setTimeout(() => onRemove(toast.id), 3600);
    return () => { clearTimeout(show); clearTimeout(hide); clearTimeout(remove); };
  }, [toast.id, onRemove]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 10, padding: '12px 16px', minWidth: 280, maxWidth: 380,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 14, fontWeight: 500,
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.3s ease, opacity 0.3s ease',
    }}>
      <FontAwesomeIcon icon={c.icon} style={{ flexShrink: 0, fontSize: 16 }} />
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, opacity: 0.6, padding: 0, lineHeight: 1 }}
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: number) => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10,
      alignItems: 'flex-end',
    }}>
      {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={onRemove} />)}
    </div>
  );
}
