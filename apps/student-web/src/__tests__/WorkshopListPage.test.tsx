import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WorkshopListPage } from '../pages/WorkshopListPage';
import * as clientModule from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof clientModule>();
  return {
    ...actual,
    getWorkshops: vi.fn(),
  };
});

vi.mock('../hooks/useSeatStream', () => ({
  useSeatStream: vi.fn(() => ({ seatData: null, connected: false })),
}));

const mockGetWorkshops = () => (clientModule.getWorkshops as ReturnType<typeof vi.fn>);

const baseWorkshop = {
  id: 'w1',
  title: 'Workshop Kỹ năng mềm',
  speakerName: 'Nguyễn Văn A',
  roomName: 'Phòng 101',
  capacity: 30,
  confirmedCount: 10,
  heldCount: 2,
  feeType: 'FREE',
  startsAt: '2026-06-01T08:00:00Z',
  endsAt: '2026-06-01T10:00:00Z',
  status: 'OPEN',
};

describe('WorkshopListPage', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders workshops from the API', async () => {
    mockGetWorkshops().mockResolvedValue({ data: [baseWorkshop], total: 1, page: 1, limit: 20 });

    render(<WorkshopListPage onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Workshop Kỹ năng mềm')).toBeInTheDocument();
    });

    expect(screen.getByText(/Nguyễn Văn A/)).toBeInTheDocument();
  });

  it('shows available seat badge when seats remain', async () => {
    mockGetWorkshops().mockResolvedValue({
      data: [{ ...baseWorkshop, confirmedCount: 10, heldCount: 2, capacity: 30 }],
      total: 1, page: 1, limit: 20,
    });

    render(<WorkshopListPage onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText(/còn 18 chỗ/i)).toBeInTheDocument();
    });
  });

  it('shows full badge when no seats remain', async () => {
    mockGetWorkshops().mockResolvedValue({
      data: [{ ...baseWorkshop, confirmedCount: 28, heldCount: 2, capacity: 30 }],
      total: 1, page: 1, limit: 20,
    });

    render(<WorkshopListPage onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText(/hết chỗ/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no workshops', async () => {
    mockGetWorkshops().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

    render(<WorkshopListPage onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText(/chưa có workshop/i)).toBeInTheDocument();
    });
  });

  it('calls onSelect with workshop id when clicking a card', async () => {
    mockGetWorkshops().mockResolvedValue({ data: [baseWorkshop], total: 1, page: 1, limit: 20 });

    render(<WorkshopListPage onSelect={onSelect} />);

    await waitFor(() => screen.getByText('Workshop Kỹ năng mềm'));
    await userEvent.click(screen.getByText('Workshop Kỹ năng mềm'));

    expect(onSelect).toHaveBeenCalledWith('w1');
  });
});
