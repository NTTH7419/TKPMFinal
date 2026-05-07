import { useParams, useNavigate } from 'react-router-dom';
import type { AuthState } from '../App';

interface Props {
  auth: AuthState;
}

export default function ScanPage({ auth: _auth }: Props) {
  const { workshopId } = useParams<{ workshopId: string }>();
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <button onClick={() => navigate('/workshops')} style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8' }}>
        ← Quay lại
      </button>
      <h2>Scan QR — Workshop {workshopId}</h2>
      <p style={{ color: '#888' }}>
        Tính năng scan QR sẽ được triển khai trong Task 8.6–8.9.
        <br />
        Module này đã được cấu hình PWA và sẵn sàng để tích hợp{' '}
        <code>html5-qrcode</code> và IndexedDB.
      </p>
    </div>
  );
}
