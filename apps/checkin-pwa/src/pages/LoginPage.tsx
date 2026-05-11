import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AuthState } from '../App';

interface Props {
  onLogin: (auth: AuthState) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const sessionReason = (location.state as { reason?: string } | null)?.reason;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Đăng nhập thất bại');
      }
      const data = await res.json();
      const roles: string[] = data.user?.roles ?? [];
      if (!roles.includes('CHECKIN_STAFF') && !roles.includes('ADMIN')) {
        throw new Error('Tài khoản không có quyền check-in');
      }
      onLogin({ token: data.accessToken, userId: data.user.id });
      navigate('/workshops', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 32 }}>UniHub Check-in</h1>
      {sessionReason && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#856404' }}>
          {sessionReason}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px 12px', fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px 12px', fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
        />
        {error && <p style={{ color: 'red', margin: 0, fontSize: 14 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px',
            fontSize: 16,
            borderRadius: 6,
            background: '#1a73e8',
            color: '#fff',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
