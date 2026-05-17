import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkshop, WorkshopDetail, api } from '../api/client';
import { useSeatStream } from '../hooks/useSeatStream';
import { Skeleton } from '@unihub/ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUser, faBuilding, faClock, faChair, faMoneyBillWave, faTag, faClipboardList, faMap } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'long', timeStyle: 'short' });
}

export function WorkshopDetailPage() {
  const { id: workshopId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const { seatData } = useSeatStream(workshopId ?? null);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    if (!workshopId) return;
    getWorkshop(workshopId)
      .then(setWorkshop)
      .finally(() => setLoading(false));
  }, [workshopId]);

  const handleRegister = async () => {
    if (!workshopId) return;
    setRegistering(true);
    try {
      try {
        await api.getQueueToken(workshopId);
      } catch (e) {
        throw new Error('Unable to get queue token: ' + (e as any).message);
      }

      const idempotencyKey = crypto.randomUUID();
      const res = await api.registerWorkshop(workshopId, idempotencyKey);
      if (res.status === 'CONFIRMED') {
        addToast('Đăng ký thành công!', 'success');
      } else if (res.status === 'PENDING_PAYMENT') {
        addToast('Vui lòng thanh toán trong 10 phút!', 'info');
        setTimeout(() => navigate(`/payment/${res.id}`), 500);
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return (
    <div style={styles.page}>
      <div style={{ marginBottom: 20 }}><Skeleton width={80} height={15} /></div>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ marginBottom: 20 }}><Skeleton width="70%" height={28} /></div>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ marginBottom: 10 }}><Skeleton width="50%" height={15} /></div>
        ))}
        <div style={{ marginTop: 24 }}><Skeleton height={48} borderRadius={10} /></div>
      </div>
    </div>
  );
  if (!workshop) return <div style={styles.loading}>Không tìm thấy workshop</div>;

  const remaining = seatData
    ? seatData.remainingSeats
    : workshop.capacity - workshop.confirmedCount - workshop.heldCount;

  return (
    <>
    <div style={styles.page}>
      <button onClick={() => navigate('/workshops')} style={styles.back}><FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />Quay lại</button>

      <div className="detail-card" style={styles.card}>
        <h1 style={styles.title}>{workshop.title}</h1>
        <div style={styles.meta}>
          <div style={styles.metaItem}><FontAwesomeIcon icon={faUser} style={{ width: 16 }} /> {workshop.speakerName}</div>
          <div style={styles.metaItem}><FontAwesomeIcon icon={faBuilding} style={{ width: 16 }} /> {workshop.roomName}</div>
          <div style={styles.metaItem}><FontAwesomeIcon icon={faClock} style={{ width: 16 }} /> {formatDate(workshop.startsAt)} – {formatDate(workshop.endsAt)}</div>
          <div style={styles.metaItem}>
            <FontAwesomeIcon icon={faChair} style={{ width: 16 }} />
            <strong style={{ color: remaining > 0 ? '#22c55e' : '#ef4444' }}>
              {remaining > 0 ? `Còn ${remaining} / ${workshop.capacity} chỗ` : 'Đã hết chỗ'}
            </strong>
          </div>
          <div style={styles.metaItem}>
            <FontAwesomeIcon icon={workshop.feeType === 'FREE' ? faTag : faMoneyBillWave} style={{ width: 16 }} />
            {workshop.feeType === 'FREE'
              ? 'Miễn phí'
              : `${Number(workshop.price).toLocaleString('vi-VN')} đ`}
          </div>
        </div>

        {workshop.aiSummary && (
          <div style={styles.summary}>
            <h3><FontAwesomeIcon icon={faClipboardList} style={{ marginRight: 8 }} />Tóm tắt nội dung</h3>
            <p>{workshop.aiSummary}</p>
          </div>
        )}

        {workshop.roomMapUrl && (
          <div style={styles.map}>
            <h3><FontAwesomeIcon icon={faMap} style={{ marginRight: 8 }} />Sơ đồ phòng</h3>
            <img src={workshop.roomMapUrl} alt="Room map" style={{ maxWidth: '100%', borderRadius: 8 }} />
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
    <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
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
