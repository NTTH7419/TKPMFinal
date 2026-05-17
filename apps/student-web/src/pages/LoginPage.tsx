import { useState } from 'react';
import { Button } from '@unihub/ui/components';
import { TextInput } from '@unihub/ui/components';
import { Card } from '@unihub/ui/components';
import { api } from '../api/client';

export function LoginPage({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('student@unihub.edu.vn');
  const [password, setPassword] = useState('Student@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email, password);
      localStorage.setItem('access_token', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      onLogin(res.user);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Card variant="base" className="w-full max-w-sm">
        <form onSubmit={handleLogin} className="flex flex-col gap-xl">
          <div className="text-center">
            <h1 className="text-heading-4 text-ink font-semibold">UniHub Student</h1>
            <p className="text-body-sm text-slate mt-xs">Cổng đăng ký kỹ năng mềm</p>
          </div>

          {error && (
            <div
              role="alert"
              className="bg-card-tint-rose text-semantic-error text-body-sm text-center rounded-md px-md py-sm"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-xs">
            <label htmlFor="login-email" className="text-caption-bold text-slate">
              Email sinh viên
            </label>
            <TextInput
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label htmlFor="login-password" className="text-caption-bold text-slate">
              Mật khẩu
            </label>
            <TextInput
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button variant="primary" type="submit" disabled={loading} className="w-full justify-center">
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>

          <div className="bg-surface rounded-md px-md py-sm text-caption text-slate leading-relaxed">
            Sử dụng tài khoản mẫu:<br />
            <b>student@unihub.edu.vn / Student@123</b>
          </div>
        </form>
      </Card>
    </div>
  );
}
