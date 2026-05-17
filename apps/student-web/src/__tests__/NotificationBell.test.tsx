import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NotificationBell from '../components/NotificationBell';
import * as clientModule from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof clientModule>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getNotifications: vi.fn(),
      markNotificationRead: vi.fn(),
    },
  };
});

const mockGetNotifications = () =>
  (clientModule.api.getNotifications as ReturnType<typeof vi.fn>);
const mockMarkRead = () =>
  (clientModule.api.markNotificationRead as ReturnType<typeof vi.fn>);

const unreadNotification = {
  id: 'n1',
  eventType: 'RegistrationConfirmed',
  payload: { workshopTitle: 'Workshop Kỹ năng mềm' },
  isRead: false,
  createdAt: '2026-05-01T00:00:00Z',
  deliveries: [],
};

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders unread count badge when there are unread notifications', async () => {
    mockGetNotifications().mockResolvedValue([unreadNotification]);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('fires PATCH /notifications/:id when clicking an unread notification', async () => {
    mockGetNotifications().mockResolvedValue([unreadNotification]);
    mockMarkRead().mockResolvedValue({ ok: true });

    render(<NotificationBell />);

    await userEvent.click(screen.getByRole('button', { name: /thông báo/i }));

    await waitFor(() => {
      expect(screen.getByText('Đăng ký thành công')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Đăng ký thành công'));

    await waitFor(() => {
      expect(clientModule.api.markNotificationRead).toHaveBeenCalledWith('n1');
    });
  });

  it('shows no badge when there are zero unread notifications', async () => {
    mockGetNotifications().mockResolvedValue([
      { ...unreadNotification, isRead: true, readAt: '2026-05-01T00:01:00Z' },
    ]);

    render(<NotificationBell />);

    await waitFor(() => expect(clientModule.api.getNotifications).toHaveBeenCalled());

    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});
