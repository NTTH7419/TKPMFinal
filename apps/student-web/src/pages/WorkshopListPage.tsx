import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkshops, WorkshopSummary } from '../api/client';
import { useSeatStream } from '../hooks/useSeatStream';
import { Skeleton } from '@unihub/ui';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function SeatBadge({ workshopId, initialRemaining }: { workshopId: string; initialRemaining: number }) {
  const { seatData, connected } = useSeatStream(workshopId);
  const remaining = seatData ? seatData.remainingSeats : initialRemaining;

  return (
    <span
      style={{
        background: remaining > 0 ? '#22c55e' : '#ef4444',
        color: '#fff',
        borderRadius: 12,
        padding: '2px 10px',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {remaining > 0 ? `Còn ${remaining} chỗ` : 'Hết chỗ'}
      {connected && <span style={{ marginLeft: 6, opacity: 0.7 }}>●</span>}
    </span>
  );
}

export function WorkshopListPage() {
  const [workshops, setWorkshops] = useState<WorkshopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getWorkshops()
      .then((res) => setWorkshops(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={styles.page}>
      <div style={{ marginBottom: 24 }}><Skeleton width={400} height={32} /></div>
      <div className="ws-grid" style={styles.grid}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Skeleton width="60%" height={18} />
              <Skeleton width={80} height={22} borderRadius={12} />
            </div>
            <div style={{ marginBottom: 4 }}><Skeleton width="50%" height={14} /></div>
            <div style={{ marginBottom: 4 }}><Skeleton width="40%" height={13} /></div>
            <div style={{ marginBottom: 4 }}><Skeleton width="45%" height={13} /></div>
            <div style={{ marginTop: 10 }}><Skeleton width={80} height={14} /></div>
          </div>
        ))}
      </div>
    </div>
  );
  if (error) return <div style={styles.error}>Lỗi: {error}</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>🎓 Workshop Tuần lễ Kỹ năng & Nghề nghiệp</h1>
      <div className="ws-grid" style={styles.grid}>
        {workshops.map((w) => {
          const remaining = w.capacity - w.confirmedCount - w.heldCount;
          return (
            <div key={w.id} style={styles.card} onClick={() => navigate(`/workshops/${w.id}`)}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>{w.title}</h2>
                <SeatBadge workshopId={w.id} initialRemaining={remaining} />
              </div>
              <p style={styles.speaker}>👤 {w.speakerName}</p>
              <p style={styles.info}>🏛️ {w.roomName}</p>
              <p style={styles.info}>🕐 {formatDate(w.startsAt)}</p>
              <p style={styles.fee}>
                {w.feeType === 'FREE'
                  ? '🆓 Miễn phí'
                  : `💰 ${Number(w.price).toLocaleString('vi-VN')} đ`}
              </p>
            </div>
          );
        })}
        {workshops.length === 0 && (
          <p style={styles.empty}>Hiện chưa có workshop nào đang mở đăng ký.</p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '32px 16px' },
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 24, color: '#1e293b' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 },
  card: {
    background: '#fff', borderRadius: 12, padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer',
    transition: 'transform .15s, box-shadow .15s',
    border: '1px solid #e2e8f0',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: 0, color: '#1e293b', flex: 1 },
  speaker: { color: '#475569', margin: '4px 0', fontSize: 14 },
  info: { color: '#64748b', margin: '2px 0', fontSize: 13 },
  fee: { marginTop: 10, fontWeight: 600, color: '#0f172a', fontSize: 14 },
  loading: { textAlign: 'center', padding: 60, color: '#64748b' },
  error: { textAlign: 'center', padding: 60, color: '#ef4444' },
  empty: { color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: 40 },
};
