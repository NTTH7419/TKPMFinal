import { useState, useEffect, useRef } from 'react';
import { api, MyRegistration } from '../api/client';
import { Skeleton } from '@unihub/ui';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    CONFIRMED: { label: 'Đã xác nhận', color: '#22c55e' },
    PENDING_PAYMENT: { label: 'Chờ thanh toán', color: '#f59e0b' },
    EXPIRED: { label: 'Đã hết hạn', color: '#94a3b8' },
    CANCELLED: { label: 'Đã huỷ', color: '#ef4444' },
    NEEDS_REVIEW: { label: 'Cần xem xét', color: '#8b5cf6' },
  };
  return map[status] ?? { label: status, color: '#64748b' };
}

function QrModal({ registrationId, workshopTitle, onClose }: { registrationId: string; workshopTitle: string; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    api.getQrCode(registrationId)
      .then(setQrDataUrl)
      .catch((e) => setError(e.message));
  }, [registrationId]);

  const handleFullscreen = () => {
    const el = imgRef.current;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => setIsFullscreen(true));
    } else {
      setIsFullscreen(true);
    }
  };

  const handleExitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setIsFullscreen(false);
  };

  const handleSave = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${workshopTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  return (
    <>
      {isFullscreen && (
        <div
          style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}
          onClick={handleExitFullscreen}
        >
          {qrDataUrl && <img src={qrDataUrl} alt="QR Code" style={{ width: '90vmin', height: '90vmin', objectFit: 'contain' }} />}
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Nhấn bất kỳ để đóng</p>
        </div>
      )}
      <div style={s.overlay} onClick={onClose}>
        <div style={s.modal} onClick={(e) => e.stopPropagation()}>
          <h3 style={s.modalTitle}>Mã QR tham dự</h3>
          {error && <p style={{ color: '#ef4444', textAlign: 'center' }}>{error}</p>}
          {!error && !qrDataUrl && <p style={{ color: '#64748b', textAlign: 'center' }}>Đang tải...</p>}
          {qrDataUrl && (
            <img ref={imgRef} src={qrDataUrl} alt="QR Code" className="qr-img" style={{ display: 'block', margin: '0 auto', borderRadius: 8, cursor: 'pointer' }} onClick={handleFullscreen} />
          )}
          {qrDataUrl && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={{ ...s.closeBtn, flex: 1, background: '#6366f1', color: '#fff' }} onClick={handleFullscreen}>⛶ Toàn màn hình</button>
              <button style={{ ...s.closeBtn, flex: 1 }} onClick={handleSave}>↓ Lưu QR</button>
            </div>
          )}
          <button style={s.closeBtn} onClick={onClose}>Đóng</button>
        </div>
      </div>
    </>
  );
}

export function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrForId, setQrForId] = useState<string | null>(null);

  useEffect(() => {
    api.getMyRegistrations()
      .then(setRegistrations)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <div style={{ marginBottom: 20 }}><Skeleton width={180} height={24} /></div>
      <div style={s.list}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Skeleton width="55%" height={18} />
              <Skeleton width={90} height={22} borderRadius={20} />
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' as const }}>
              {[140, 120, 160, 80].map((w, j) => <Skeleton key={j} width={w} height={13} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (error) return <div style={{ ...s.center, color: '#ef4444' }}>{error}</div>;
  if (registrations.length === 0) {
    return <div style={s.center}>Bạn chưa đăng ký workshop nào.</div>;
  }

  return (
    <div>
      <h2 style={s.heading}>Đăng ký của tôi</h2>
      <div style={s.list}>
        {registrations.map((reg) => {
          const st = statusLabel(reg.status);
          return (
            <div key={reg.id} style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.title}>{reg.workshop.title}</span>
                <span style={{ ...s.badge, background: st.color }}>{st.label}</span>
              </div>
              <div style={s.meta}>
                <span>👤 {reg.workshop.speakerName}</span>
                <span>🏛️ {reg.workshop.roomName}</span>
                <span>🕐 {formatDate(reg.workshop.startsAt)}</span>
                <span>💰 {reg.workshop.feeType === 'FREE' ? 'Miễn phí' : 'Có phí'}</span>
              </div>
              {reg.status === 'PENDING_PAYMENT' && reg.holdExpiresAt && (
                <p style={s.warning}>
                  Hết hạn giữ chỗ lúc: {formatDate(reg.holdExpiresAt)}
                </p>
              )}
              {reg.status === 'CONFIRMED' && (
                <button style={s.qrBtn} onClick={() => setQrForId(reg.id)}>
                  Xem mã QR tham dự
                </button>
              )}
            </div>
          );
        })}
      </div>

      {qrForId && (
        <QrModal
          registrationId={qrForId}
          workshopTitle={registrations.find(r => r.id === qrForId)?.workshop.title ?? ''}
          onClose={() => setQrForId(null)}
        />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  center: { textAlign: 'center', padding: 60, color: '#64748b', fontSize: 15 },
  heading: { fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 20 },
  list: { display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' },
  title: { fontSize: 17, fontWeight: 600, color: '#1e293b' },
  badge: { fontSize: 12, fontWeight: 600, color: '#fff', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' },
  meta: { display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: 14, color: '#475569' },
  warning: { marginTop: 12, fontSize: 13, color: '#d97706', background: '#fef3c7', padding: '8px 12px', borderRadius: 8 },
  qrBtn: { marginTop: 14, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 16, padding: 32, maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 },
  closeBtn: { display: 'block', width: '100%', marginTop: 20, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#475569' },
};
