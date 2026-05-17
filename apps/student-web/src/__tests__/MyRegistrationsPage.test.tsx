import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MyRegistrationsPage } from '../pages/MyRegistrationsPage';
import * as clientModule from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof clientModule>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getMyRegistrations: vi.fn(),
      getQrCode: vi.fn(),
    },
  };
});

const mockGetRegistrations = () =>
  (clientModule.api.getMyRegistrations as ReturnType<typeof vi.fn>);

const baseWorkshop = {
  id: 'w1',
  title: 'Workshop Kỹ năng mềm',
  speakerName: 'Nguyễn Văn A',
  roomName: 'Phòng 101',
  startsAt: '2026-06-01T08:00:00Z',
  endsAt: '2026-06-01T10:00:00Z',
  feeType: 'FREE',
};

describe('MyRegistrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CONFIRMED registration with correct status label', async () => {
    mockGetRegistrations().mockResolvedValue([
      { id: 'r1', status: 'CONFIRMED', createdAt: '2026-05-01T00:00:00Z', workshop: baseWorkshop },
    ]);

    render(<MyRegistrationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Workshop Kỹ năng mềm')).toBeInTheDocument();
      expect(screen.getByText('Đã xác nhận')).toBeInTheDocument();
    });
  });

  it('renders PENDING_PAYMENT registration with correct status label', async () => {
    mockGetRegistrations().mockResolvedValue([
      {
        id: 'r2',
        status: 'PENDING_PAYMENT',
        createdAt: '2026-05-01T00:00:00Z',
        holdExpiresAt: '2026-05-01T00:10:00Z',
        workshop: baseWorkshop,
      },
    ]);

    render(<MyRegistrationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument();
    });
  });

  it('renders CANCELLED registration with correct status label', async () => {
    mockGetRegistrations().mockResolvedValue([
      { id: 'r3', status: 'CANCELLED', createdAt: '2026-05-01T00:00:00Z', workshop: baseWorkshop },
    ]);

    render(<MyRegistrationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Đã huỷ')).toBeInTheDocument();
    });
  });

  it('shows empty state when no registrations', async () => {
    mockGetRegistrations().mockResolvedValue([]);

    render(<MyRegistrationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/chưa đăng ký workshop nào/i)).toBeInTheDocument();
    });
  });
});
