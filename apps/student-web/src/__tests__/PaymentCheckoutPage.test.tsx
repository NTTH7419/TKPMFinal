import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as clientModule from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof clientModule>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getMyRegistrations: vi.fn(),
      createPaymentIntent: vi.fn(),
    },
  };
});

const mockGetRegistrations = () =>
  (clientModule.api.getMyRegistrations as ReturnType<typeof vi.fn>);
const mockCreateIntent = () =>
  (clientModule.api.createPaymentIntent as ReturnType<typeof vi.fn>);

const registration = {
  id: 'reg1',
  status: 'PENDING_PAYMENT',
  createdAt: '2026-05-01T00:00:00Z',
  workshop: {
    id: 'w1',
    title: 'Workshop Kỹ năng mềm',
    speakerName: 'Nguyễn Văn A',
    roomName: 'Phòng 101',
    startsAt: '2026-06-01T08:00:00Z',
    endsAt: '2026-06-01T10:00:00Z',
    feeType: 'PAID',
  },
};

async function renderCheckout(registrationId = 'reg1') {
  const { PaymentCheckoutPage } = await import('../pages/PaymentCheckoutPage');
  return render(<PaymentCheckoutPage registrationId={registrationId} onSuccess={vi.fn()} />);
}

describe('PaymentCheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('renders workshop details after loading', async () => {
    mockGetRegistrations().mockResolvedValue([registration]);

    await renderCheckout();

    await waitFor(() => {
      expect(screen.getByText('Workshop Kỹ năng mềm')).toBeInTheDocument();
    });
  });

  it('fires POST /payments/intent with correct registrationId on submit', async () => {
    mockGetRegistrations().mockResolvedValue([registration]);
    mockCreateIntent().mockResolvedValue({ paymentIntentId: 'pi1', paymentUrl: '' });

    await renderCheckout();

    await waitFor(() => screen.getByText('Workshop Kỹ năng mềm'));

    await userEvent.click(
      screen.getByRole('button', { name: /tạo yêu cầu thanh toán/i }),
    );

    await waitFor(() => {
      expect(clientModule.api.createPaymentIntent).toHaveBeenCalledWith(
        'reg1',
        expect.any(String),
      );
    });
  });

  it('shows error message when payment intent creation fails', async () => {
    mockGetRegistrations().mockResolvedValue([registration]);
    mockCreateIntent().mockRejectedValue(new Error('Thẻ bị từ chối'));

    await renderCheckout();

    await waitFor(() => screen.getByText('Workshop Kỹ năng mềm'));

    await userEvent.click(
      screen.getByRole('button', { name: /tạo yêu cầu thanh toán/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/thẻ bị từ chối/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while payment is processing', async () => {
    mockGetRegistrations().mockResolvedValue([registration]);
    let resolveFn!: (v: any) => void;
    mockCreateIntent().mockImplementation(
      () => new Promise((resolve) => { resolveFn = resolve; }),
    );

    await renderCheckout();

    await waitFor(() => screen.getByText('Workshop Kỹ năng mềm'));

    await userEvent.click(
      screen.getByRole('button', { name: /tạo yêu cầu thanh toán/i }),
    );

    expect(screen.getByRole('button', { name: /đang xử lý/i })).toBeDisabled();

    resolveFn({ paymentIntentId: 'pi1', paymentUrl: '' });
  });
});
