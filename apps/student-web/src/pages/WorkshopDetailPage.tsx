import { useState, useEffect } from 'react';
import { getWorkshop, WorkshopDetail, api } from '../api/client';
import { useSeatStream } from '../hooks/useSeatStream';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'long', timeStyle: 'short' });
}

export function WorkshopDetailPage({
  workshopId,
  onBack,
}: {
  workshopId: string;
  onBack: () => void;
}) {
  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [msg, setMsg] = useState('');
  const { seatData } = useSeatStream(workshopId);

  useEffect(() => {
    getWorkshop(workshopId)
      .then(setWorkshop)
      .finally(() => setLoading(false));
  }, [workshopId]);

  const handleRegister = async () => {
    setRegistering(true);
    setMsg('');
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await api.registerWorkshop(workshopId, idempotencyKey);
      if (res.status === 'CONFIRMED') {
        setMsg('✅ Đăng ký thành công!');
      } else if (res.status === 'PENDING_PAYMENT') {
        setMsg('⏳ Vui lòng thanh toán trong 10 phút!');
      }
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <div style={styles.loading}>Đang tải...</div>;
  if (!workshop) return <div style={styles.loading}>Không tìm thấy workshop</div>;

  const remaining = seatData
    ? seatData.remainingSeats
    : workshop.capacity - workshop.confirmedCount - workshop.heldCount;

  return (
    <div style={styles.page}>
      <button onClick={onBack} style={styles.back}>← Quay lại</button>

      <div style={styles.card}>
        <h1 style={styles.title}>{workshop.title}</h1>
        <div style={styles.meta}>
          <div style={styles.metaItem}><span>👤</span> {workshop.speakerName}</div>
          <div style={styles.metaItem}><span>🏛️</span> {workshop.roomName}</div>
          <div style={styles.metaItem}><span>🕐</span> {formatDate(workshop.startsAt)} – {formatDate(workshop.endsAt)}</div>
          <div style={styles.metaItem}>
            <span>💺</span>
            <strong style={{ color: remaining > 0 ? '#22c55e' : '#ef4444' }}>
              {remaining > 0 ? `Còn ${remaining} / ${workshop.capacity} chỗ` : 'Đã hết chỗ'}
            </strong>
          </div>
          <div style={styles.metaItem}>
            <span>💰</span>
            {workshop.feeType === 'FREE'
              ? 'Miễn phí'
              : `${Number(workshop.price).toLocaleString('vi-VN')} đ`}
          </div>
        </div>

        {workshop.aiSummary && (
          <div style={styles.summary}>
            <h3>📋 Tóm tắt nội dung</h3>
            <p>{workshop.aiSummary}</p>
          </div>
        )}

        {workshop.roomMapUrl && (
          <div style={styles.map}>
            <h3>🗺️ Sơ đồ phòng</h3>
            <img src={workshop.roomMapUrl} alt="Room map" style={{ maxWidth: '100%', borderRadius: 8 }} />
          </div>
        )}

        {msg && (
          <div style={{ padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center', background: msg.startsWith('❌') ? '#fee2e2' : '#dcfce7', color: msg.startsWith('❌') ? '#ef4444' : '#166534', fontWeight: 600 }}>
            {msg}
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={remaining === 0 || registering}
          style={{ ...styles.registerBtn, opacity: (remaining === 0 || registering) ? 0.5 : 1 }}
        >
          {registering ? 'Đang xử lý...' : (remaining > 0 ? 'Đăng ký tham dự' : 'Hết chỗ')}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 720, margin: '0 auto', padding: '32px 16px' },
  back: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 15, marginBottom: 20, padding: 0 },
  card: { background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 20, color: '#1e293b' },
  meta: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 },
  metaItem: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 15, color: '#475569' },
  summary: { background: '#f8fafc', borderRadius: 10, padding: 20, marginBottom: 24 },
  map: { marginBottom: 24 },
  registerBtn: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', border: 'none', borderRadius: 10,
    padding: '14px 32px', fontSize: 16, fontWeight: 600, cursor: 'pointer', width: '100%',
  },
  loading: { textAlign: 'center', padding: 80, color: '#64748b' },
};
