import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LoginPage } from '../pages/LoginPage';
import * as clientModule from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof clientModule>();
  return {
    ...actual,
    api: {
      ...actual.api,
      login: vi.fn(),
    },
  };
});

const mockLogin = () => (clientModule.api.login as ReturnType<typeof vi.fn>);

describe('LoginPage', () => {
  const onLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('golden path: successful login stores token and calls onLogin', async () => {
    const user = { id: '1', fullName: 'Test Student', email: 'student@test.edu', role: 'STUDENT' };
    mockLogin().mockResolvedValue({ accessToken: 'tok123', user });

    render(<LoginPage onLogin={onLogin} />);

    const emailInput = screen.getByDisplayValue('student@unihub.edu.vn');
    const passwordInput = screen.getByDisplayValue('Student@123');

    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'student@test.edu');
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, 'pass123');

    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(clientModule.api.login).toHaveBeenCalledWith('student@test.edu', 'pass123');
      expect(onLogin).toHaveBeenCalledWith(user);
    });

    expect(localStorage.getItem('access_token')).toBe('tok123');
  });

  it('shows error message on invalid credentials', async () => {
    mockLogin().mockRejectedValue(new Error('Sai email hoặc mật khẩu'));

    render(<LoginPage onLogin={onLogin} />);

    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(screen.getByText('Sai email hoặc mật khẩu')).toBeInTheDocument();
    });

    expect(onLogin).not.toHaveBeenCalled();
  });

  it('disables button and shows loading text while submitting', async () => {
    let resolveLogin!: (v: any) => void;
    mockLogin().mockImplementation(
      () => new Promise((resolve) => { resolveLogin = resolve; }),
    );

    render(<LoginPage onLogin={onLogin} />);

    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    const loadingBtn = await screen.findByRole('button', { name: /đang đăng nhập/i });
    expect(loadingBtn).toBeDisabled();

    resolveLogin({ accessToken: 'tok', user: { id: '1' } });
  });
});
