import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthState } from '../App';
import { saveRoster, getRoster, getCheckinCount } from '../db';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheck, faQrcode, faBuilding, faClock, faUsers, faRightFromBracket, faChevronRight, faCalendarXmark } from '@fortawesome/free-solid-svg-icons';

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

function isRelevant(w: Workshop): boolean {
  const now = Date.now();
  const starts = new Date(w.startsAt).getTime();
  const ends = new Date(w.endsAt).getTime();
  const effectiveEnd = ends > starts ? ends : starts + 4 * 60 * 60 * 1000;
  return effectiveEnd > now - 2 * 60 * 60 * 1000 && starts <= now + 24 * 60 * 60 * 1000;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { timeStyle: 'short', dateStyle: 'short' });
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
      .then(r => {
        if (r.status === 401) {
          onLogout('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        const all: Workshop[] = data.data ?? [];
        setWorkshops(all.filter(isRelevant));
      })
      .catch(() => setWorkshops([]))
      .finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => {
    workshops.forEach(async w => {
      const roster = await getRoster(w.id);
      if (roster) {
        setPreloadedIds(prev => new Set(prev).add(w.id));
        setRosterSizes(prev => ({ ...prev, [w.id]: roster.roster.length }));
      }
      const count = await getCheckinCount(w.id);
      setCheckinCounts(prev => ({ ...prev, [w.id]: count }));
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
      setPreloadedIds(prev => new Set(prev).add(workshopId));
    } catch (err) {
      console.warn('Preload failed, continuing offline with cached data:', err);
    } finally {
      setPreloading(null);
      navigate(`/scan/${workshopId}`);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '0 20px',
        height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #1a73e8, #1565c0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 15,
          }}>
            <FontAwesomeIcon icon={faQrcode} />
          </span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>
            UniHub <span style={{ color: '#1a73e8' }}>Check-in</span>
          </span>
        </div>
        <button
          onClick={() => onLogout()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid #e2e8f0',
            color: '#64748b', borderRadius: 8, padding: '6px 12px',
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          Đăng xuất
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
            Chọn Workshop
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Hiển thị workshop đang diễn ra hoặc bắt đầu trong 24 giờ tới
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 28, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14 }}>Đang tải danh sách workshop...</p>
          </div>
        ) : workshops.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <FontAwesomeIcon icon={faCalendarXmark} style={{ fontSize: 48, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#475569' }}>
              Không có workshop nào
            </p>
            <p style={{ margin: 0, fontSize: 13 }}>Hiện chưa có workshop nào phù hợp để check-in.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {workshops.map(w => {
              const isPreviewed = preloadedIds.has(w.id);
              const isPreloading = preloading === w.id;
              const checkin = checkinCounts[w.id] ?? 0;
              const total = rosterSizes[w.id];
              const pct = total ? Math.round((checkin / total) * 100) : null;

              return (
                <div
                  key={w.id}
                  onClick={() => !isPreloading && handleSelect(w.id)}
                  style={{
                    background: '#fff',
                    border: `1.5px solid ${isPreviewed ? '#34a853' : '#e2e8f0'}`,
                    borderRadius: 14,
                    padding: '16px 18px',
                    cursor: isPreloading ? 'wait' : 'pointer',
                    position: 'relative',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                  }}
                >
                  {/* Offline badge */}
                  {isPreviewed && !isPreloading && (
                    <span style={{
                      position: 'absolute', top: 12, right: 14,
                      fontSize: 11, fontWeight: 600, color: '#16a34a',
                      background: '#f0fdf4', border: '1px solid #bbf7d0',
                      borderRadius: 6, padding: '2px 8px',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <FontAwesomeIcon icon={faCheck} />Offline
                    </span>
                  )}

                  {/* Loading badge */}
                  {isPreloading && (
                    <span style={{
                      position: 'absolute', top: 12, right: 14,
                      fontSize: 11, color: '#1a73e8',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <FontAwesomeIcon icon={faSpinner} spin />Đang tải...
                    </span>
                  )}

                  <div style={{ paddingRight: isPreviewed || isPreloading ? 80 : 24 }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 15, color: '#1e293b', lineHeight: 1.4 }}>
                      {w.title}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FontAwesomeIcon icon={faBuilding} style={{ color: '#94a3b8' }} />{w.roomName}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FontAwesomeIcon icon={faClock} style={{ color: '#94a3b8' }} />{formatTime(w.startsAt)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {total != null && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FontAwesomeIcon icon={faUsers} style={{ color: '#94a3b8' }} />
                          {checkin} / {total} đã check-in
                        </span>
                        {pct !== null && <span style={{ fontWeight: 600, color: pct >= 80 ? '#16a34a' : '#1a73e8' }}>{pct}%</span>}
                      </div>
                      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct ?? 0}%`,
                          background: pct !== null && pct >= 80 ? '#22c55e' : '#1a73e8',
                          borderRadius: 4,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Arrow */}
                  {!isPreloading && (
                    <FontAwesomeIcon icon={faChevronRight} style={{
                      position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                      color: '#cbd5e1', fontSize: 12,
                      ...(isPreviewed ? { top: '60%' } : {}),
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
