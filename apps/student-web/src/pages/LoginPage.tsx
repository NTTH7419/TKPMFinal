import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap, faEnvelope, faLock, faRightToBracket, faSpinner, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client';

export function LoginPage() {
  const [email, setEmail] = useState('student@unihub.edu.vn');
  const [password, setPassword] = useState('Student@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email, password);
      localStorage.setItem('access_token', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      navigate('/workshops', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: 'Inter, system-ui, sans-serif',
      background: 'linear-gradient(135deg, #f0f0ff 0%, #faf5ff 50%, #eff6ff 100%)',
    }}>
      {/* Left panel — decorative */}
      <div style={{
        display: 'none',
        flex: 1,
        background: 'linear-gradient(155deg, #6366f1 0%, #8b5cf6 60%, #a78bfa 100%)',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        padding: 48, color: '#fff',
      }} className="login-left">
        <FontAwesomeIcon icon={faGraduationCap} style={{ fontSize: 64, marginBottom: 24, opacity: 0.9 }} />
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
          UniHub Student
        </h2>
        <p style={{ fontSize: 15, opacity: 0.85, textAlign: 'center', lineHeight: 1.6, maxWidth: 300 }}>
          Đăng ký workshop, nâng cao kỹ năng mềm và phát triển nghề nghiệp cùng UniHub.
        </p>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: '#fff', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '40px 40px 32px',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 26, marginBottom: 16,
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}>
              <FontAwesomeIcon icon={faGraduationCap} />
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
              Chào mừng trở lại
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              Đăng nhập vào UniHub Student
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', padding: '10px 14px', borderRadius: 10,
              marginBottom: 20, fontSize: 13,
            }}>
              <FontAwesomeIcon icon={faTriangleExclamation} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Email sinh viên
              </label>
              <div style={{ position: 'relative' }}>
                <FontAwesomeIcon icon={faEnvelope} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#94a3b8', fontSize: 14,
                }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{
                    width: '100%', padding: '11px 12px 11px 36px',
                    border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14,
                    boxSizing: 'border-box', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <FontAwesomeIcon icon={faLock} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#94a3b8', fontSize: 14,
                }} />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  style={{
                    width: '100%', padding: '11px 12px 11px 36px',
                    border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14,
                    boxSizing: 'border-box', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.4)',
                transition: 'all 0.15s',
              }}
            >
              {loading
                ? <><FontAwesomeIcon icon={faSpinner} spin />Đang đăng nhập...</>
                : <><FontAwesomeIcon icon={faRightToBracket} />Đăng nhập</>}
            </button>
          </form>

          {/* Demo hint */}
          <div style={{
            marginTop: 24, padding: '12px 14px',
            background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
            fontSize: 12, color: '#64748b', lineHeight: 1.7,
          }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Tài khoản mẫu:</span><br />
            student@unihub.edu.vn / Student@123
          </div>
        </div>
      </div>
    </div>
  );
}
