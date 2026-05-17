import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WorkshopDetailPage } from '../pages/WorkshopDetailPage';
import * as clientModule from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof clientModule>();
  return {
    ...actual,
    getWorkshop: vi.fn(),
    api: {
      ...actual.api,
      registerWorkshop: vi.fn(),
      getQueueToken: vi.fn(),
    },
  };
});

vi.mock('../hooks/useSeatStream', () => ({
  useSeatStream: vi.fn(() => ({ seatData: null, connected: false })),
}));

const mockGetWorkshop = () => (clientModule.getWorkshop as ReturnType<typeof vi.fn>);
const mockRegister = () => (clientModule.api.registerWorkshop as ReturnType<typeof vi.fn>);
const mockQueueToken = () => (clientModule.api.getQueueToken as ReturnType<typeof vi.fn>);

const workshop = {
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
  summaryStatus: 'DONE',
  aiSummary: 'Nội dung hữu ích',
};

describe('WorkshopDetailPage', () => {
  const onBack = vi.fn();
  const onPaymentRequired = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders workshop detail after loading', async () => {
    mockGetWorkshop().mockResolvedValue(workshop);

    render(<WorkshopDetailPage workshopId="w1" onBack={onBack} onPaymentRequired={onPaymentRequired} />);

    expect(screen.getByText(/đang tải/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Workshop Kỹ năng mềm')).toBeInTheDocument();
    });

    expect(screen.getByText(/Nguyễn Văn A/)).toBeInTheDocument();
    expect(screen.getByText(/Nội dung hữu ích/)).toBeInTheDocument();
  });

  it('register CTA fires POST /registrations on click', async () => {
    mockGetWorkshop().mockResolvedValue(workshop);
    mockQueueToken().mockResolvedValue({ queueToken: 'qt1' });
    mockRegister().mockResolvedValue({ id: 'reg1', status: 'CONFIRMED' });

    render(<WorkshopDetailPage workshopId="w1" onBack={onBack} onPaymentRequired={onPaymentRequired} />);

    await waitFor(() => screen.getByText('Workshop Kỹ năng mềm'));

    await userEvent.click(screen.getByRole('button', { name: /đăng ký/i }));

    await waitFor(() => {
      expect(clientModule.api.getQueueToken).toHaveBeenCalledWith('w1');
      expect(clientModule.api.registerWorkshop).toHaveBeenCalledWith('w1', expect.any(String));
    });

    await waitFor(() => {
      expect(screen.getByText(/đăng ký thành công/i)).toBeInTheDocument();
    });
  });

  it('shows error message when registration fails', async () => {
    mockGetWorkshop().mockResolvedValue(workshop);
    mockQueueToken().mockResolvedValue({ queueToken: 'qt1' });
    mockRegister().mockRejectedValue(new Error('Hết chỗ trống'));

    render(<WorkshopDetailPage workshopId="w1" onBack={onBack} onPaymentRequired={onPaymentRequired} />);

    await waitFor(() => screen.getByText('Workshop Kỹ năng mềm'));

    await userEvent.click(screen.getByRole('button', { name: /đăng ký/i }));

    await waitFor(() => {
      expect(screen.getByText(/hết chỗ trống/i)).toBeInTheDocument();
    });
  });
});
