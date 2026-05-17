import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Workshop } from '../api/client';
import { Skeleton } from '@unihub/ui';

const statusColor: Record<string, string> = {
  DRAFT: '#f59e0b', OPEN: '#22c55e', CLOSED: '#64748b', CANCELLED: '#ef4444',
};

export function WorkshopListPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => api.getWorkshops().then(r => setWorkshops(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  if (loading) return (
    <div>
      <div style={s.toolbar}>
        <Skeleton width={200} height={28} />
        <Skeleton width={100} height={36} borderRadius={8} />
      </div>
      <table style={s.table}>
        <thead><tr style={s.thead}>{['Tên workshop', 'Diễn giả', 'Phòng', 'Sức chứa', 'Đã xác nhận', 'Trạng thái', 'Thao tác'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>
          {[1, 2, 3, 4].map(i => (
            <tr key={i} style={s.tr}>
              {[180, 120, 80, 60, 60, 70, 90].map((w, j) => (
                <td key={j} style={s.td}><Skeleton width={w} height={14} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div style={s.toolbar}>
        <h2 style={s.title}>Danh sách Workshop</h2>
        <button style={s.btn} onClick={() => navigate('/workshops/new')}>+ Tạo mới</button>
      </div>
      <table style={s.table}>
        <thead>
          <tr style={s.thead}>
            {['Tên workshop', 'Diễn giả', 'Phòng', 'Sức chứa', 'Đã xác nhận', 'Trạng thái', 'Thao tác'].map(h =>
              <th key={h} style={s.th}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {workshops.map(w => (
            <tr key={w.id} style={s.tr}>
              <td style={s.td}><button style={s.link} onClick={() => navigate(`/workshops/${w.id}`)}>{w.title}</button></td>
              <td style={s.td}>{w.speakerName}</td>
              <td style={s.td}>{w.roomName}</td>
              <td style={s.td}>{w.capacity}</td>
              <td style={s.td}>{w.confirmedCount}</td>
              <td style={s.td}>
                <span style={{ ...s.badge, background: statusColor[w.status] || '#94a3b8' }}>{w.status}</span>
              </td>
              <td style={s.td}>
                {w.status === 'DRAFT' && (
                  <button style={s.actionBtn} onClick={() => api.openWorkshop(w.id).then(load)}>Mở đăng ký</button>
                )}
                {w.status !== 'CANCELLED' && (
                  <button style={{ ...s.actionBtn, background: '#fee2e2', color: '#ef4444' }}
                    onClick={() => { if (confirm('Huỷ workshop?')) api.cancelWorkshop(w.id).then(load); }}>
                    Huỷ
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' },
  btn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 14px', fontSize: 14, color: '#334155' },
  link: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: 14 },
  badge: { borderRadius: 20, padding: '2px 10px', color: '#fff', fontSize: 12, fontWeight: 600 },
  actionBtn: { background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginRight: 4, fontSize: 13 },
  loading: { padding: 60, textAlign: 'center', color: '#94a3b8' },
};
