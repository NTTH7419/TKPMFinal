import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthState } from '../App';
import { saveRoster, getRoster, getCheckinCount } from '../db';

interface Workshop {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  roomName: string;
  status: string;
}

interface Props {
  auth: AuthState;
  onLogout: (reason?: string) => void;
}

// Show workshops starting within 24h or already started but not ended more than 2h ago
function isRelevant(w: Workshop): boolean {
  const now = Date.now();
  const starts = new Date(w.startsAt).getTime();
  const ends = new Date(w.endsAt).getTime();
  const effectiveEnd = ends > starts ? ends : starts + 4 * 60 * 60 * 1000; // fallback 4h after start if endsAt invalid
  return effectiveEnd > now - 2 * 60 * 60 * 1000 && starts <= now + 24 * 60 * 60 * 1000;
}

export default function WorkshopSelectPage({ auth, onLogout }: Props) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [preloading, setPreloading] = useState<string | null>(null);
  const [preloadedIds, setPreloadedIds] = useState<Set<string>>(new Set());
  const [checkinCounts, setCheckinCounts] = useState<Record<string, number>>({});
  const [rosterSizes, setRosterSizes] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/workshops?limit=100&status=OPEN', {
      headers: { Authorization: `Bearer ${auth?.token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          onLogout('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const all: Workshop[] = data.data ?? [];
        setWorkshops(all.filter(isRelevant));
      })
      .catch(() => setWorkshops([]))
      .finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => {
    workshops.forEach(async (w) => {
      const roster = await getRoster(w.id);
      if (roster) {
        setPreloadedIds((prev) => new Set(prev).add(w.id));
        setRosterSizes((prev) => ({ ...prev, [w.id]: roster.roster.length }));
      }
      const count = await getCheckinCount(w.id);
      setCheckinCounts((prev) => ({ ...prev, [w.id]: count }));
    });
  }, [workshops]);

  async function handleSelect(workshopId: string) {
    if (!auth) return;
    setPreloading(workshopId);
    try {
      const res = await fetch(`/api/checkin/preload/${workshopId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.status === 401) {
        onLogout('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      if (!res.ok) throw new Error('Không thể tải danh sách đăng ký');
      const data = await res.json();
      await saveRoster({
        workshopId: data.workshopId,
        hmacSecret: data.hmacSecret,
        roster: data.roster,
        preloadedAt: new Date().toISOString(),
      });
      setPreloadedIds((prev) => new Set(prev).add(workshopId));
    } catch (err) {
      console.warn('Preload failed, continuing offline with cached data:', err);
    } finally {
      setPreloading(null);
      navigate(`/scan/${workshopId}`);
    }
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: 60 }}>Đang tải...</p>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Chọn workshop để check-in</h2>
        <button
          onClick={() => onLogout()}
          style={{ background: 'none', border: '1px solid #ea4335', color: '#ea4335', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          Đăng xuất
        </button>
      </div>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
        Hiển thị workshop đang diễn ra hoặc bắt đầu trong 2 giờ tới
      </p>
      {workshops.length === 0 && (
        <p style={{ color: '#666' }}>Không có workshop nào phù hợp.</p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {workshops.map((w) => {
          const isPreviewed = preloadedIds.has(w.id);
          const isPreloading = preloading === w.id;
          return (
            <li
              key={w.id}
              onClick={() => !isPreloading && handleSelect(w.id)}
              style={{
                border: `1px solid ${isPreviewed ? '#34a853' : '#ddd'}`,
                borderRadius: 8,
                padding: '12px 16px',
                cursor: isPreloading ? 'wait' : 'pointer',
                background: isPreviewed ? '#f0faf4' : '#fafafa',
                position: 'relative',
              }}
            >
              <strong>{w.title}</strong>
              <br />
              <small style={{ color: '#666' }}>
                {w.roomName} &nbsp;|&nbsp; {new Date(w.startsAt).toLocaleString('vi-VN')}
              </small>
              {rosterSizes[w.id] != null && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#555' }}>
                  <span style={{ fontWeight: 600, color: '#34a853' }}>{checkinCounts[w.id] ?? 0}</span>
                  {' / '}{rosterSizes[w.id]} đã check-in
                </div>
              )}
              {isPreviewed && (
                <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 11, color: '#34a853', fontWeight: 600 }}>
                  ✓ Offline
                </span>
              )}
              {isPreloading && (
                <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 11, color: '#1a73e8' }}>
                  Đang tải...
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
