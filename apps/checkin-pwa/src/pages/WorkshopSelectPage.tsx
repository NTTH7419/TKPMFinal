import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthState } from '../App';

interface Workshop {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  roomName: string;
}

interface Props {
  auth: AuthState;
}

export default function WorkshopSelectPage({ auth }: Props) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/workshops?limit=50', {
      headers: { Authorization: `Bearer ${auth?.token}` },
    })
      .then((r) => r.json())
      .then((data) => setWorkshops(data.data ?? []))
      .catch(() => setWorkshops([]))
      .finally(() => setLoading(false));
  }, [auth]);

  if (loading) return <p style={{ textAlign: 'center', marginTop: 60 }}>Đang tải...</p>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h2 style={{ marginBottom: 16 }}>Chọn workshop để check-in</h2>
      {workshops.length === 0 && <p>Không có workshop nào đang mở.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {workshops.map((w) => (
          <li
            key={w.id}
            onClick={() => navigate(`/scan/${w.id}`)}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '12px 16px',
              cursor: 'pointer',
              background: '#fafafa',
            }}
          >
            <strong>{w.title}</strong>
            <br />
            <small style={{ color: '#666' }}>
              {w.roomName} &nbsp;|&nbsp; {new Date(w.startsAt).toLocaleString('vi-VN')}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}
