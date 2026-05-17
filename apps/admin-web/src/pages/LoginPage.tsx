import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap, faEnvelope, faLock, faRightToBracket, faSpinner, faTriangleExclamation, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client';

export function LoginPage() {
  const [email, setEmail] = useState('admin@unihub.edu.vn');
  const [password, setPassword] = useState('Admin@123456');
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
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    }}>
      {/* Left panel — decorative */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(155deg, #1e293b 0%, #334155 60%, #475569 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', padding: 48, color: '#fff',
        minWidth: 0,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, marginBottom: 24,
          backdropFilter: 'blur(8px)',
        }}>
          <FontAwesomeIcon icon={faGraduationCap} />
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.5px' }}>
          UniHub Admin
        </h2>
        <p style={{ fontSize: 14, opacity: 0.65, textAlign: 'center', lineHeight: 1.7, maxWidth: 280, margin: 0 }}>
          Cổng quản trị workshop — quản lý đăng ký, theo dõi check-in và tóm tắt AI.
        </p>
        <div style={{
          marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280,
        }}>
          {['Quản lý Workshop', 'Theo dõi Check-in', 'Tóm tắt AI', 'Import Sinh viên'].map(feat => (
            <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, opacity: 0.8 }}>
              <span style={{
                width: 20, height: 20, borderRadius: 6,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, flexShrink: 0,
              }}>✓</span>
              {feat}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: '#fff', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '40px 40px 32px',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #1e293b, #475569)',
              color: '#fff', fontSize: 26, marginBottom: 16,
              boxShadow: '0 4px 16px rgba(30,41,59,0.3)',
            }}>
              <FontAwesomeIcon icon={faGraduationCap} />
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.4px' }}>
                Admin Portal
              </h1>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#7c3aed',
                background: '#f5f3ff', border: '1px solid #ddd6fe',
                borderRadius: 6, padding: '2px 7px',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <FontAwesomeIcon icon={faShieldHalved} />SECURE
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              Đăng nhập để quản lý Workshop
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
                Email
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
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1e293b, #334155)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 14px rgba(30,41,59,0.35)',
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
            <span style={{ fontWeight: 600, color: '#475569' }}>Tài khoản mặc định:</span><br />
            admin@unihub.edu.vn / Admin@123456
          </div>
        </div>
      </div>
    </div>
  );
}
