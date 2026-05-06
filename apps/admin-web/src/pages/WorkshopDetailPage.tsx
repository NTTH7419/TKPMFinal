import { useState, useEffect } from 'react';
import { api, Workshop, WorkshopStats } from '../api/client';

export function WorkshopDetailPage({ workshopId, onBack }: { workshopId: string; onBack: () => void }) {
  const isNew = workshopId === '__new__';
  const [workshop, setWorkshop] = useState<Partial<Workshop>>({
    feeType: 'FREE', status: 'DRAFT',
  });
  const [stats, setStats] = useState<WorkshopStats | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isNew) {
      Promise.all([
        api.getWorkshops().then(r => r.data.find(w => w.id === workshopId)),
        api.getStats(workshopId).catch(() => null),
      ]).then(([w, s]) => {
        if (w) setWorkshop(w);
        setStats(s);
      }).finally(() => setLoading(false));
    }
  }, [workshopId, isNew]);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      // Loại bỏ các trường không được phép gửi trực tiếp
      const { status, id, confirmedCount, heldCount, summaryStatus, ...data } = workshop;
      
      if (isNew) {
        await api.createWorkshop(data);
        setMsg('✅ Tạo workshop thành công!');
        setTimeout(onBack, 1500);
      } else {
        await api.updateWorkshop(workshopId, data);
        setMsg('✅ Đã lưu thay đổi!');
      }
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    finally { setSaving(false); }
  };

  const field = (label: string, key: keyof Workshop, type = 'text') => (
    <div style={s.field} key={key}>
      <label style={s.label}>{label}</label>
      <input
        style={s.input} type={type} value={(workshop[key] as string) ?? ''}
        onChange={e => setWorkshop(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
      />
    </div>
  );

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>;

  return (
    <div>
      <button style={s.back} onClick={onBack}>← Danh sách</button>
      <h2 style={s.heading}>{isNew ? 'Tạo Workshop mới' : workshop.title}</h2>

      {stats && (
        <div style={s.statsRow}>
          {[
            ['Tổng đăng ký', stats.totalRegistrations],
            ['Đã xác nhận', stats.confirmedCount],
            ['Chờ thanh toán', stats.pendingPaymentCount],
            ['Check-in', stats.checkinCount],
            ['Tỉ lệ lấp đầy', `${stats.utilizationPct}%`],
          ].map(([label, val]) => (
            <div key={label as string} style={s.statCard}>
              <div style={s.statVal}>{val}</div>
              <div style={s.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={s.form}>
        {field('Tên workshop', 'title')}
        {field('Diễn giả', 'speakerName')}
        {field('Phòng', 'roomName')}
        {field('URL sơ đồ phòng', 'roomMapUrl')}
        {field('Sức chứa', 'capacity', 'number')}
        <div style={s.field}>
          <label style={s.label}>Loại phí</label>
          <select style={s.input} value={workshop.feeType}
            onChange={e => setWorkshop(p => ({ ...p, feeType: e.target.value }))}>
            <option value="FREE">Miễn phí</option>
            <option value="PAID">Có phí</option>
          </select>
        </div>
        {workshop.feeType === 'PAID' && field('Học phí (VNĐ)', 'price', 'number')}
        {field('Giờ bắt đầu', 'startsAt', 'datetime-local')}
        {field('Giờ kết thúc', 'endsAt', 'datetime-local')}

        {msg && <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.startsWith('✅') ? '#dcfce7' : '#fee2e2', marginBottom: 12 }}>{msg}</div>}

        <button style={s.saveBtn} onClick={save} disabled={saving}>
          {saving ? 'Đang lưu...' : isNew ? 'Tạo workshop' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  back: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0 },
  heading: { fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 20 },
  statsRow: { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  statCard: { background: '#fff', borderRadius: 10, padding: '16px 20px', minWidth: 120, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  statVal: { fontSize: 28, fontWeight: 700, color: '#6366f1' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  form: { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 },
  input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' },
  saveBtn: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 8 },
};
