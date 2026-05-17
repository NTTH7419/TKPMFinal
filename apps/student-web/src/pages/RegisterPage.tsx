import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap, faEnvelope, faLock, faUser,
  faSpinner, faTriangleExclamation, faCheckCircle,
  faUserPlus, faEye, faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client';

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: 'Ít nhất 6 ký tự', ok: password.length >= 6 },
    { label: 'Có chữ hoa', ok: /[A-Z]/.test(password) },
    { label: 'Có chữ số', ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#ef4444', '#f59e0b', '#22c55e'];
  const labels = ['Yếu', 'Trung bình', 'Mạnh'];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < score ? colors[score - 1] : '#e2e8f0', transition: 'background 0.2s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
          {checks.map(c => (
            <span key={c.label} style={{ fontSize: 11, color: c.ok ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
              <FontAwesomeIcon icon={faCheckCircle} style={{ opacity: c.ok ? 1 : 0.3 }} />
              {c.label}
            </span>
          ))}
        </div>
        {score > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: colors[score - 1] }}>{labels[score - 1]}</span>}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px 11px 36px',
  border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14,
  boxSizing: 'border-box', outline: 'none',
  transition: 'border-color 0.15s',
};

const iconStyle = {
  position: 'absolute' as const, left: 12, top: '50%', transform: 'translateY(-50%)',
  color: '#94a3b8', fontSize: 14,
};

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const confirmMismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.register(email.trim(), password, fullName.trim());
      localStorage.clear();
      localStorage.setItem('access_token', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      setSuccess(true);
      setTimeout(() => navigate('/workshops', { replace: true }), 1500);
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
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
      {/* Left decorative panel — hidden on mobile, shown on wide screens */}
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
          Tạo tài khoản để đăng ký workshop, nâng cao kỹ năng và phát triển nghề nghiệp.
        </p>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: '#fff', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '40px 40px 32px',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
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
              Tạo tài khoản
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              Đăng ký UniHub Student miễn phí
            </p>
          </div>

          {/* Success state */}
          {success && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 12, padding: '24px 0', textAlign: 'center',
            }}>
              <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 48, color: '#22c55e' }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>Đăng ký thành công!</p>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Đang chuyển hướng...</p>
            </div>
          )}

          {!success && (
            <>
              {/* Error banner */}
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

              <form onSubmit={handleSubmit}>
                {/* Full name */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Họ và tên
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FontAwesomeIcon icon={faUser} style={iconStyle} />
                    <input
                      type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      required placeholder="Nguyễn Văn A"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#6366f1'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                </div>

                {/* Email */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Email sinh viên
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FontAwesomeIcon icon={faEnvelope} style={iconStyle} />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      required placeholder="sv@unihub.edu.vn"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#6366f1'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Mật khẩu
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FontAwesomeIcon icon={faLock} style={iconStyle} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      required placeholder="Tối thiểu 6 ký tự"
                      style={{ ...inputStyle, paddingRight: 40 }}
                      onFocus={e => e.target.style.borderColor = '#6366f1'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} style={{ fontSize: 14 }} />
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                {/* Confirm password */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Xác nhận mật khẩu
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FontAwesomeIcon icon={faLock} style={{ ...iconStyle, color: confirmMismatch ? '#ef4444' : '#94a3b8' }} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      required placeholder="Nhập lại mật khẩu"
                      style={{ ...inputStyle, paddingRight: 40, borderColor: confirmMismatch ? '#fca5a5' : '#e2e8f0' }}
                      onFocus={e => { if (!confirmMismatch) e.target.style.borderColor = '#6366f1'; }}
                      onBlur={e => { e.target.style.borderColor = confirmMismatch ? '#fca5a5' : '#e2e8f0'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}
                    >
                      <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} style={{ fontSize: 14 }} />
                    </button>
                  </div>
                  {confirmMismatch && (
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444' }}>Mật khẩu không khớp</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || confirmMismatch}
                  style={{
                    width: '100%', padding: '12px',
                    background: (loading || confirmMismatch) ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', border: 'none', borderRadius: 10,
                    fontSize: 15, fontWeight: 600,
                    cursor: (loading || confirmMismatch) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: (loading || confirmMismatch) ? 'none' : '0 4px 14px rgba(99,102,241,0.4)',
                    transition: 'all 0.15s',
                  }}
                >
                  {loading
                    ? <><FontAwesomeIcon icon={faSpinner} spin />Đang tạo tài khoản...</>
                    : <><FontAwesomeIcon icon={faUserPlus} />Tạo tài khoản</>}
                </button>
              </form>

              {/* Link to login */}
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' }}>
                Đã có tài khoản?{' '}
                <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                  Đăng nhập
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
