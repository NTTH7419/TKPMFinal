import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode, faEnvelope, faLock, faRightToBracket, faSpinner, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
      fontFamily: 'Inter, system-ui, sans-serif', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: '#fff', borderRadius: 20,
        boxShadow: '0 8px 40px rgba(26,115,232,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        padding: '40px 36px 32px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
            color: '#fff', fontSize: 26, marginBottom: 14,
            boxShadow: '0 4px 16px rgba(26,115,232,0.35)',
          }}>
            <FontAwesomeIcon icon={faQrcode} />
          </span>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
            UniHub Check-in
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Dành cho nhân viên check-in workshop
          </p>
        </div>

        {/* Session expired warning */}
        {sessionReason && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            background: '#fffbeb', border: '1px solid #fcd34d',
            color: '#92400e', padding: '10px 14px', borderRadius: 10,
            marginBottom: 16, fontSize: 13,
          }}>
            <FontAwesomeIcon icon={faTriangleExclamation} style={{ flexShrink: 0, marginTop: 1 }} />
            {sessionReason}
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#dc2626', padding: '10px 14px', borderRadius: 10,
            marginBottom: 16, fontSize: 13,
          }}>
            <FontAwesomeIcon icon={faTriangleExclamation} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faEnvelope} style={{
                position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8', fontSize: 13,
              }} />
              <input
                type="email" placeholder="Email của bạn" value={email}
                onChange={e => setEmail(e.target.value)} required
                style={{
                  width: '100%', padding: '11px 12px 11px 34px',
                  border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15,
                  boxSizing: 'border-box', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#1a73e8'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faLock} style={{
                position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8', fontSize: 13,
              }} />
              <input
                type="password" placeholder="Mật khẩu" value={password}
                onChange={e => setPassword(e.target.value)} required
                style={{
                  width: '100%', padding: '11px 12px 11px 34px',
                  border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15,
                  boxSizing: 'border-box', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#1a73e8'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1a73e8, #1565c0)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 4px 14px rgba(26,115,232,0.4)',
            }}
          >
            {loading
              ? <><FontAwesomeIcon icon={faSpinner} spin />Đang đăng nhập...</>
              : <><FontAwesomeIcon icon={faRightToBracket} />Đăng nhập</>}
          </button>
        </form>
      </div>
    </div>
  );
}
