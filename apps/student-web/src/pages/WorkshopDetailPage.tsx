import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkshop, WorkshopDetail, api } from '../api/client';
import { useSeatStream } from '../hooks/useSeatStream';
import { Skeleton } from '@unihub/ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUser, faBuilding, faClock, faChair, faMoneyBillWave, faTag, faClipboardList, faMap, faSpinner, faBan, faCalendarCheck, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
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
  const [isRegistered, setIsRegistered] = useState(false);
  const { seatData } = useSeatStream(workshopId ?? null);
  const { toasts, addToast, removeToast } = useToast();
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') ?? 'null'); } catch { return null; }
  })();

  useEffect(() => {
    if (!workshopId) return;
    setLoading(true);
    getWorkshop(workshopId)
      .then((data) => {
        setWorkshop(data);
        setIsRegistered(data.isRegistered);
      })
      .finally(() => setLoading(false));
  }, [workshopId, user?.id]);

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
        setIsRegistered(true);
      } else if (res.status === 'PENDING_PAYMENT') {
        addToast('Vui lòng thanh toán trong 10 phút!', 'info');
        setIsRegistered(true);
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

        {/* Seat availability banner */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: remaining > 0 ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${remaining > 0 ? '#86efac' : '#fca5a5'}`,
          borderRadius: 10, padding: '10px 16px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FontAwesomeIcon icon={faChair} style={{ color: remaining > 0 ? '#16a34a' : '#dc2626', fontSize: 15 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: remaining > 0 ? '#16a34a' : '#dc2626' }}>
              {remaining > 0 ? `Còn ${remaining} / ${workshop.capacity} chỗ trống` : 'Đã hết chỗ'}
            </span>
          </div>
          {remaining > 0 && (
            <div style={{ height: 6, width: 100, background: '#dcfce7', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (remaining / workshop.capacity) * 100)}%`, background: '#22c55e', borderRadius: 99 }} />
            </div>
          )}
        </div>

        <div style={styles.meta}>
          <div style={styles.metaItem}><FontAwesomeIcon icon={faUser} style={{ width: 16, color: '#6366f1' }} /> {workshop.speakerName}</div>
          <div style={styles.metaItem}><FontAwesomeIcon icon={faBuilding} style={{ width: 16, color: '#6366f1' }} /> {workshop.roomName}</div>
          <div style={styles.metaItem}><FontAwesomeIcon icon={faClock} style={{ width: 16, color: '#6366f1' }} /> {formatDate(workshop.startsAt)} – {formatDate(workshop.endsAt)}</div>
          <div style={styles.metaItem}>
            <FontAwesomeIcon icon={workshop.feeType === 'FREE' ? faTag : faMoneyBillWave} style={{ width: 16, color: '#6366f1' }} />
            {workshop.feeType === 'FREE'
              ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Miễn phí</span>
              : <span style={{ fontWeight: 600 }}>{Number(workshop.price).toLocaleString('vi-VN')} đ</span>}
          </div>
        </div>

        {workshop.aiSummary && (
          <div style={styles.summary}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: 8, color: '#6366f1' }} />Tóm tắt nội dung
            </h3>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>{workshop.aiSummary}</p>
          </div>
        )}

        {workshop.roomMapUrl && (
          <div style={styles.map}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              <FontAwesomeIcon icon={faMap} style={{ marginRight: 8, color: '#6366f1' }} />Sơ đồ phòng
            </h3>
            <img src={workshop.roomMapUrl} alt="Room map" style={{ maxWidth: '100%', borderRadius: 8 }} />
          </div>
        )}

        {isRegistered ? (
          <div style={styles.registeredBadge}>
            <FontAwesomeIcon icon={faCircleCheck} style={{ marginRight: 8 }} />
            Đã đăng ký workshop này
          </div>
        ) : (
          <button
            onClick={handleRegister}
            disabled={remaining === 0 || registering}
            style={{
            ...styles.registerBtn,
            opacity: 1,
            background: remaining === 0
              ? '#e2e8f0'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: remaining === 0 ? '#94a3b8' : '#fff',
            cursor: remaining === 0 ? 'not-allowed' : registering ? 'wait' : 'pointer',
          }}
          >
            {registering ? (
            <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />Đang xử lý...</>
          ) : remaining === 0 ? (
            <><FontAwesomeIcon icon={faBan} style={{ marginRight: 8 }} />Đã hết chỗ</>
          ) : (
            <><FontAwesomeIcon icon={faCalendarCheck} style={{ marginRight: 8 }} />Đăng ký tham dự</>
          )}
          </button>
        )}
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
  registeredBadge: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
    padding: '14px 32px', fontSize: 16, fontWeight: 600,
    color: '#16a34a', width: '100%', boxSizing: 'border-box' as const,
  },
  loading: { textAlign: 'center', padding: 80, color: '#64748b' },
};
