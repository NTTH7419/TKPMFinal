import { useState, useEffect } from 'react';
import { api, ImportBatch, ImportBatchDetail } from '../api/client';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#94a3b8',
  PROCESSING: '#3b82f6',
  PROMOTED: '#22c55e',
  REJECTED: '#ef4444',
  FAILED: '#f97316',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Đang chờ',
  PROCESSING: 'Đang xử lý',
  PROMOTED: 'Đã import',
  REJECTED: 'Bị từ chối',
  FAILED: 'Thất bại',
};

const ROW_STATUS_COLOR: Record<string, string> = {
  VALID: '#22c55e',
  ERROR: '#ef4444',
  DUPLICATE: '#f97316',
};

function BatchDetail({ batchId, onBack }: { batchId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<ImportBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorFilter, setErrorFilter] = useState(false);

  useEffect(() => {
    api.getImportBatchDetail(batchId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>;
  if (!detail) return <div style={{ padding: 40, color: '#ef4444' }}>Không tìm thấy batch.</div>;

  const displayRows = errorFilter ? detail.rows.filter(r => r.rowStatus !== 'VALID') : detail.rows;

  function downloadErrorCsv() {
    const errorRows = detail!.rows.filter(r => r.rowStatus !== 'VALID');
    const headers = 'row_number,student_code,email,full_name,faculty,row_status,error_message\n';
    const csv = headers + errorRows.map(r =>
      [r.rowNumber, r.studentCode, r.email, r.fullName, r.faculty, r.rowStatus, r.errorMessage ?? ''].join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${batchId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <button style={s.back} onClick={onBack}>← Danh sách import</button>
      <h2 style={s.heading}>Chi tiết batch import</h2>

      <div style={s.infoCard}>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>File</span>
          <span style={s.infoVal}>{detail.filePath}</span>
        </div>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>Trạng thái</span>
          <span style={{ color: STATUS_COLOR[detail.status] ?? '#94a3b8', fontWeight: 600 }}>
            {STATUS_LABEL[detail.status] ?? detail.status}
          </span>
        </div>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>Tổng dòng</span>
          <span style={s.infoVal}>{detail.totalRows}</span>
        </div>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>Hợp lệ</span>
          <span style={{ color: '#22c55e', fontWeight: 600 }}>{detail.validRows}</span>
        </div>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>Lỗi</span>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{detail.errorRows}</span>
        </div>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>Hoàn thành lúc</span>
          <span style={s.infoVal}>{detail.completedAt ? new Date(detail.completedAt).toLocaleString('vi-VN') : '—'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={errorFilter} onChange={e => setErrorFilter(e.target.checked)} />
          Chỉ hiện dòng lỗi ({detail.errorRows})
        </label>
        {detail.errorRows > 0 && (
          <button style={s.downloadBtn} onClick={downloadErrorCsv}>
            ↓ Tải CSV lỗi
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              {['#', 'Mã SV', 'Email', 'Họ tên', 'Khoa', 'Trạng thái', 'Lỗi'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map(row => (
              <tr key={row.id} style={{ background: row.rowStatus !== 'VALID' ? '#fff5f5' : '#fff' }}>
                <td style={s.td}>{row.rowNumber}</td>
                <td style={s.td}>{row.studentCode}</td>
                <td style={s.td}>{row.email}</td>
                <td style={s.td}>{row.fullName}</td>
                <td style={s.td}>{row.faculty}</td>
                <td style={s.td}>
                  <span style={{ color: ROW_STATUS_COLOR[row.rowStatus] ?? '#94a3b8', fontWeight: 600, fontSize: 12 }}>
                    {row.rowStatus}
                  </span>
                </td>
                <td style={{ ...s.td, color: '#ef4444', fontSize: 13 }}>{row.errorMessage ?? '—'}</td>
              </tr>
            ))}
            {displayRows.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Không có dòng nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ImportHistoryPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getImportBatches(page)
      .then(r => { setBatches(r.data); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [page]);

  if (selectedBatchId) {
    return <BatchDetail batchId={selectedBatchId} onBack={() => setSelectedBatchId(null)} />;
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h2 style={s.heading}>Lịch sử import sinh viên</h2>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
        File CSV được import tự động lúc 2:00 AM mỗi ngày từ bucket <code>student-imports</code>.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>
      ) : batches.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chưa có batch nào.</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <table style={{ ...s.table, marginBottom: 0 }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                {['File', 'Trạng thái', 'Tổng', 'Hợp lệ', 'Lỗi', 'Hoàn thành', ''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={s.td}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{b.filePath}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, background: (STATUS_COLOR[b.status] ?? '#94a3b8') + '20', color: STATUS_COLOR[b.status] ?? '#94a3b8', fontWeight: 600, fontSize: 12 }}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </td>
                  <td style={s.td}>{b.totalRows}</td>
                  <td style={{ ...s.td, color: '#22c55e', fontWeight: 600 }}>{b.validRows}</td>
                  <td style={{ ...s.td, color: b.errorRows > 0 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>{b.errorRows}</td>
                  <td style={{ ...s.td, fontSize: 13, color: '#64748b' }}>
                    {b.completedAt ? new Date(b.completedAt).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td style={s.td}>
                    <button style={s.detailBtn} onClick={() => setSelectedBatchId(b.id)}>Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button style={s.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
          <span style={{ lineHeight: '32px', fontSize: 14 }}>{page} / {totalPages}</span>
          <button style={s.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</button>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  back: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0 },
  heading: { fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 20 },
  infoCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 },
  infoRow: { display: 'flex', flexDirection: 'column', gap: 2 },
  infoLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 600 },
  infoVal: { fontSize: 14, color: '#1e293b' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 12 },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', fontSize: 14, color: '#1e293b', verticalAlign: 'middle' },
  detailBtn: { background: 'none', border: '1px solid #6366f1', color: '#6366f1', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' },
  downloadBtn: { background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#334155', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: 13 },
  pageBtn: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 14 },
};
