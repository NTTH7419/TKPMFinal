import { useState, useEffect, useRef } from 'react';
import { api, Workshop, WorkshopStats, SummaryStatus } from '../api/client';

// Convert ISO UTC string → "yyyy-MM-ddThh:mm" for datetime-local input
function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function WorkshopDetailPage({ workshopId, onBack }: { workshopId: string; onBack: () => void }) {
  const isNew = workshopId === '__new__';
  const [workshop, setWorkshop] = useState<Partial<Workshop>>({
    feeType: 'FREE', status: 'DRAFT',
  });
  const [stats, setStats] = useState<WorkshopStats | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [summary, setSummary] = useState<SummaryStatus | null>(null);
  const [editedSummary, setEditedSummary] = useState('');
  const [summaryMsg, setSummaryMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isNew) {
      Promise.all([
        api.getWorkshops().then(r => r.data.find(w => w.id === workshopId)),
        api.getStats(workshopId).catch(() => null),
        api.getSummaryStatus(workshopId).catch(() => null),
      ]).then(([w, s, sum]) => {
        if (w) setWorkshop(w);
        setStats(s);
        if (sum) { setSummary(sum); setEditedSummary(sum.aiSummary ?? ''); }
      }).finally(() => setLoading(false));
    }
  }, [workshopId, isNew]);

  // Poll summary status every 3s while PROCESSING
  useEffect(() => {
    if (isNew || summary?.summaryStatus !== 'PROCESSING') return;
    const id = setInterval(async () => {
      const refreshed = await api.getSummaryStatus(workshopId).catch(() => null);
      if (!refreshed) return;
      setSummary(refreshed);
      if (refreshed.aiSummary) setEditedSummary(refreshed.aiSummary);
    }, 3000);
    return () => clearInterval(id);
  }, [workshopId, isNew, summary?.summaryStatus]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setSummaryMsg('');
    try {
      await api.uploadDocument(workshopId, file);
      setSummaryMsg('✅ Tải lên thành công! AI đang xử lý...');
      const refreshed = await api.getSummaryStatus(workshopId).catch(() => null);
      if (refreshed) { setSummary(refreshed); setEditedSummary(refreshed.aiSummary ?? ''); }
    } catch (err: any) {
      setSummaryMsg(`❌ ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveSummary = async () => {
    setSavingSummary(true); setSummaryMsg('');
    try {
      const res = await api.updateSummary(workshopId, editedSummary);
      setSummary(s => s ? { ...s, summaryStatus: res.summaryStatus, aiSummary: res.aiSummary } : s);
      setSummaryMsg('✅ Đã lưu tóm tắt!');
    } catch (err: any) {
      setSummaryMsg(`❌ ${err.message}`);
    } finally { setSavingSummary(false); }
  };

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

  const field = (label: string, key: keyof Workshop, type = 'text') => {
    const raw = workshop[key] as string | undefined;
    const displayValue = type === 'datetime-local' ? toDatetimeLocal(raw) : (raw ?? '');
    return (
      <div style={s.field} key={key}>
        <label style={s.label}>{label}</label>
        <input
          style={s.input}
          type={type}
          value={displayValue}
          onChange={e => {
            let val: string | number = e.target.value;
            if (type === 'number') {
              val = Number(val);
            } else if (type === 'datetime-local' && e.target.value) {
              const [datePart, timePart] = e.target.value.split('T');
              const [y, mo, d] = datePart.split('-').map(Number);
              const [h, mi] = timePart.split(':').map(Number);
              val = new Date(y, mo - 1, d, h, mi).toISOString();
            }
            setWorkshop(p => ({ ...p, [key]: val }));
          }}
        />
      </div>
    );
  };

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

      {!isNew && (
        <div style={{ ...s.form, marginTop: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
            Tóm tắt AI
          </h3>

          {/* Status badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={summaryBadge(summary?.summaryStatus)}>
              {summary?.summaryStatus ?? 'PENDING'}
            </span>
            {summary?.latestDocument && (
              <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 10 }}>
                {summary.latestDocument.originalFilename}
              </span>
            )}
            {summary?.summaryStatus === 'SUMMARY_FAILED' && summary.latestDocument?.errorReason && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>
                Lỗi: {summary.latestDocument.errorReason}
              </div>
            )}
          </div>

          {/* PDF upload */}
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Tải lên tài liệu PDF (≤ 20 MB)</label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={handleUpload}
              disabled={uploading}
              style={{ fontSize: 13 }}
            />
            {uploading && <div style={{ fontSize: 12, color: '#6366f1', marginTop: 4 }}>Đang tải lên...</div>}
          </div>

          {/* Summary display / edit */}
          {['AI_GENERATED', 'ADMIN_EDITED'].includes(summary?.summaryStatus ?? '') && (
            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Nội dung tóm tắt</label>
              <textarea
                style={{ ...s.input, height: 200, resize: 'vertical', fontFamily: 'inherit' }}
                value={editedSummary}
                onChange={e => setEditedSummary(e.target.value)}
              />
              <button style={{ ...s.saveBtn, marginTop: 8 }} onClick={saveSummary} disabled={savingSummary}>
                {savingSummary ? 'Đang lưu...' : 'Lưu tóm tắt'}
              </button>
            </div>
          )}

          {summaryMsg && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: summaryMsg.startsWith('✅') ? '#dcfce7' : '#fee2e2' }}>
              {summaryMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#94a3b8', PROCESSING: '#f59e0b', AI_GENERATED: '#22c55e',
  ADMIN_EDITED: '#6366f1', SUMMARY_FAILED: '#ef4444',
};
function summaryBadge(status?: string): React.CSSProperties {
  return {
    display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 12,
    fontWeight: 600, background: STATUS_COLORS[status ?? ''] ?? '#94a3b8', color: '#fff',
  };
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
