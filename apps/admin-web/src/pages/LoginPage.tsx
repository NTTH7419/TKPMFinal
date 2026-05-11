import { useState } from 'react';
import { api } from '../api/client';

export function LoginPage({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('admin@unihub.edu.vn');
  const [password, setPassword] = useState('Admin@123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email, password);
      console.log('Login response:', res); // Debug
      localStorage.setItem('access_token', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      console.log('Saved token:', localStorage.getItem('access_token')); // Debug
      onLogin(res.user);
    } catch (err: any) {
      console.error('Login error:', err); // Debug
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <form style={s.form} onSubmit={handleLogin}>
        <h1 style={s.title}>UniHub Admin</h1>
        <p style={s.subtitle}>Đăng nhập để quản lý Workshop</p>
        
        {error && <div style={s.error}>{error}</div>}
        
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input 
            style={s.input} type="email" value={email} 
            onChange={e => setEmail(e.target.value)} required 
          />
        </div>
        
        <div style={s.field}>
          <label style={s.label}>Mật khẩu</label>
          <input 
            style={s.input} type="password" value={password} 
            onChange={e => setPassword(e.target.value)} required 
          />
        </div>
        
        <button style={s.btn} disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
        
        <div style={s.hint}>
          Sử dụng tài khoản mặc định:<br/>
          <b>admin@unihub.edu.vn / Admin@123456</b>
        </div>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' },
  form: { background: '#fff', padding: 40, borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: 400 },
  title: { fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '0 0 8px 0', color: '#1e293b' },
  subtitle: { textAlign: 'center', color: '#64748b', marginBottom: 32, fontSize: 14 },
  error: { background: '#fee2e2', color: '#ef4444', padding: '12px', borderRadius: 8, marginBottom: 20, fontSize: 13, textAlign: 'center' },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 },
  input: { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 10 },
  hint: { marginTop: 24, padding: 16, background: '#f1f5f9', borderRadius: 8, fontSize: 12, color: '#64748b', lineHeight: 1.6 }
};
