import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Workshop, WorkshopStats, SummaryStatus, Attendee } from '../api/client';
import { Skeleton } from '@unihub/ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

const pad = (n: number) => String(n).padStart(2, '0');

function parseISOToLocal(iso?: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function DateTimeInput({ label, value, onChange }: {
  label: string;
  value?: string;
  onChange: (iso: string) => void;
}) {
  const [localDate, setLocalDate] = useState(() => parseISOToLocal(value).date);
  const [localTime, setLocalTime] = useState(() => parseISOToLocal(value).time);
  const initialised = useRef(!!value);

  // Sync once when value first arrives (async load of existing workshop)
  useEffect(() => {
    if (value && !initialised.current) {
      const { date, time } = parseISOToLocal(value);
      setLocalDate(date);
      setLocalTime(time);
      initialised.current = true;
    }
  }, [value]);

  const commit = (d: string, t: string) => {
    if (!d || !t) return;
    const [y, mo, day] = d.split('-').map(Number);
    const [h, mi] = t.split(':').map(Number);
    onChange(new Date(y, mo - 1, day, h, mi).toISOString());
  };

  const preview = localDate && localTime
    ? new Date(localDate + 'T' + localTime).toLocaleString('vi-VN', { dateStyle: 'long', timeStyle: 'short' })
    : null;

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="date"
          style={{ flex: 2, padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' as const }}
          value={localDate}
          onChange={e => { setLocalDate(e.target.value); commit(e.target.value, localTime); }}
        />
        <input
          type="time"
          style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' as const }}
          value={localTime}
          onChange={e => { setLocalTime(e.target.value); commit(localDate, e.target.value); }}
        />
      </div>
      {preview
        ? <div style={{ fontSize: 12, color: '#6366f1', marginTop: 4 }}><FontAwesomeIcon icon={faCheck} style={{ marginRight: 4 }} />{preview}</div>
        : <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Chọn ngày rồi chọn giờ (định dạng 24h)</div>
      }
    </div>
  );
}

export function WorkshopDetailPage() {
  const { id: workshopId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = workshopId === 'new';

  const [workshop, setWorkshop] = useState<Partial<Workshop>>({
    feeType: 'FREE', status: 'DRAFT',
  });
  const [stats, setStats] = useState<WorkshopStats | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<SummaryStatus | null>(null);
  const [editedSummary, setEditedSummary] = useState('');
  const { toasts, addToast, removeToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');

  const filteredAttendees = useMemo(() => {
    const q = attendeeSearch.trim().toLowerCase();
    if (!q) return attendees;
    return attendees.filter(a =>
      a.student.fullName.toLowerCase().includes(q) ||
      a.student.email.toLowerCase().includes(q)
    );
  }, [attendees, attendeeSearch]);

  useEffect(() => {
    if (!isNew && workshopId) {
      api.getAttendees(workshopId).then(r => setAttendees(r.data)).catch(() => {});
    }
  }, [workshopId, isNew]);

  useEffect(() => {
    if (!isNew && workshopId) {
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
    if (isNew || !workshopId || summary?.summaryStatus !== 'PROCESSING') return;
    const id = setInterval(async () => {
      const refreshed = await api.getSummaryStatus(workshopId).catch(() => null);
      if (!refreshed) return;
      setSummary(refreshed);
      if (refreshed.aiSummary) setEditedSummary(refreshed.aiSummary);
    }, 3000);
    return () => clearInterval(id);
  }, [workshopId, isNew, summary?.summaryStatus]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!workshopId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadDocument(workshopId, file);
      addToast('Tải lên thành công! AI đang xử lý...', 'success');
      const refreshed = await api.getSummaryStatus(workshopId).catch(() => null);
      if (refreshed) { setSummary(refreshed); setEditedSummary(refreshed.aiSummary ?? ''); }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveSummary = async () => {
    if (!workshopId) return;
    setSavingSummary(true);
    try {
      const res = await api.updateSummary(workshopId, editedSummary);
      setSummary(s => s ? { ...s, summaryStatus: res.summaryStatus, aiSummary: res.aiSummary } : s);
      addToast('Đã lưu tóm tắt!', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally { setSavingSummary(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { status, id, confirmedCount, heldCount, summaryStatus, ...data } = workshop;
      if (isNew) {
        await api.createWorkshop(data);
        addToast('Tạo workshop thành công!', 'success');
        setTimeout(() => navigate('/workshops'), 1500);
      } else if (workshopId) {
        await api.updateWorkshop(workshopId, data);
        addToast('Đã lưu thay đổi!', 'success');
      }
    } catch (e: any) { addToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const field = (label: string, key: keyof Workshop, type = 'text') => {
    const raw = workshop[key] as string | undefined;
    return (
      <div style={s.field} key={key}>
        <label style={s.label}>{label}</label>
        <input
          style={s.input}
          type={type}
          value={raw ?? ''}
          onChange={e => {
            const val: string | number = type === 'number' ? Number(e.target.value) : e.target.value;
            setWorkshop(p => ({ ...p, [key]: val }));
          }}
        />
      </div>
    );
  };


  if (loading) return (
    <div>
      <div style={{ marginBottom: 16 }}><Skeleton width={80} height={14} /></div>
      <div style={{ marginBottom: 20 }}><Skeleton width={300} height={28} /></div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' as const }}>
        {[1,2,3,4,5].map(i => <Skeleton key={i} width={120} height={72} borderRadius={10} />)}
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 6 }}><Skeleton width={100} height={13} /></div>
            <Skeleton height={38} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
    <div>
      <button style={s.back} onClick={() => navigate('/workshops')}><FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />Danh sách</button>
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
        <DateTimeInput label="Giờ bắt đầu" value={workshop.startsAt} onChange={v => setWorkshop(p => ({ ...p, startsAt: v }))} />
        <DateTimeInput label="Giờ kết thúc" value={workshop.endsAt} onChange={v => setWorkshop(p => ({ ...p, endsAt: v }))} />

        <button style={s.saveBtn} onClick={save} disabled={saving}>
          {saving ? 'Đang lưu...' : isNew ? 'Tạo workshop' : 'Lưu thay đổi'}
        </button>
      </div>

      {!isNew && workshopId && (
        <div style={{ ...s.form, marginTop: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
            Tóm tắt AI
          </h3>

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
            {uploading && <div style={{ fontSize: 12, color: '#6366f1', marginTop: 4 }}><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} />Đang tải lên...</div>}
          </div>

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

        </div>
      )}

      {!isNew && (
        <div style={{ ...s.form, marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Danh sách tham dự {attendees.length > 0 ? `(${attendees.length})` : ''}
            </h3>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...s.input, width: 240, paddingRight: attendeeSearch ? 32 : 12 }}
                placeholder="Tìm theo tên, email..."
                value={attendeeSearch}
                onChange={e => setAttendeeSearch(e.target.value)}
              />
              {attendeeSearch && (
                <button
                  onClick={() => setAttendeeSearch('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Họ tên', 'Email', 'Mã SV', 'Trạng thái', 'Check-in'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: 14 }}>{a.student.fullName}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#64748b' }}>{a.student.email}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#64748b' }}>{a.student.studentCode}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: a.status === 'CONFIRMED' ? '#dcfce7' : '#fef3c7', color: a.status === 'CONFIRMED' ? '#166534' : '#92400e' }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{a.checkedIn ? <FontAwesomeIcon icon={faCheck} style={{ color: '#22c55e' }} /> : '—'}</td>
                  </tr>
                ))}
                {filteredAttendees.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Không tìm thấy kết quả.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
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
