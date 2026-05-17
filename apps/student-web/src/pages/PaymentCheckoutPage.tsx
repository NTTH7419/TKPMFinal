import { useState, useEffect } from 'react';
import { Button, Card } from '@unihub/ui/components';
import { api, MyRegistration } from '../api/client';

export function PaymentCheckoutPage({
  registrationId,
  onSuccess,
}: {
  registrationId: string;
  onSuccess: () => void;
}) {
  const [registration, setRegistration] = useState<MyRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api
      .getMyRegistrations()
      .then((regs) => {
        const found = regs.find((r) => r.id === registrationId);
        setRegistration(found || null);
      })
      .catch((e) => {
        setMsg(`❌ Không thể tải thông tin: ${e.message}`);
      })
      .finally(() => setLoading(false));
  }, [registrationId]);

  const handlePay = async () => {
    setPaying(true);
    setMsg('');
    try {
      const idempotencyKey = crypto.randomUUID();
      const intent = await api.createPaymentIntent(registrationId, idempotencyKey);
      setPaymentIntentId(intent.paymentIntentId);
      setMsg('✅ Thanh toán được khởi tạo. Vui lòng xác nhận thanh toán dưới đây.');
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setPaying(false);
    }
  };

  const handleMockPayment = async () => {
    if (!paymentIntentId) return;
    setPaying(true);
    setMsg('');
    try {
      const response = await fetch(`/api/payments/mock-payment/pay/${paymentIntentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'success' }),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Payment failed');
      }
      setMsg('✅ Thanh toán thành công!');
      setTimeout(() => onSuccess(), 1500);
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <p className="text-center py-section text-slate text-body-md">Đang tải...</p>;
  }
  if (!registration) {
    return (
      <p className="text-center py-section text-slate text-body-md">
        Không tìm thấy đơn đăng ký
      </p>
    );
  }

  const isError = msg.startsWith('❌');

  return (
    <div className="max-w-[500px] mx-auto px-md py-xxl">
      <Card variant="base">
        <h2 className="text-heading-4 text-ink mb-lg">Thanh toán</h2>

        <div className="mb-lg">
          <h3 className="text-body-md-medium text-ink mb-sm">Chi tiết workshop</h3>
          <div className="flex justify-between py-xs border-b border-hairline-soft text-body-sm">
            <span className="text-slate">Workshop:</span>
            <span className="text-ink">{registration.workshop.title}</span>
          </div>
          <div className="flex justify-between py-xs border-b border-hairline-soft text-body-sm">
            <span className="text-slate">Ngày giờ:</span>
            <span className="text-ink">
              {new Date(registration.workshop.startsAt).toLocaleString('vi-VN', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </span>
          </div>
          <div className="flex justify-between py-xs text-body-sm">
            <span className="text-slate">Giá:</span>
            <span className="text-semantic-error font-semibold">
              {registration.workshop.feeType === 'FREE' ? 'Miễn phí' : 'Tính phí (mock)'}
            </span>
          </div>
        </div>

        {msg && (
          <div
            role="status"
            className={`rounded-md px-md py-sm mb-lg text-center text-body-sm-medium ${
              isError
                ? 'bg-card-tint-rose text-semantic-error'
                : 'bg-card-tint-mint text-brand-green'
            }`}
          >
            {msg}
          </div>
        )}

        {!paymentIntentId ? (
          <Button
            variant="primary"
            onClick={handlePay}
            disabled={paying}
            className="w-full justify-center"
          >
            {paying ? 'Đang xử lý...' : 'Tạo yêu cầu thanh toán'}
          </Button>
        ) : (
          <div className="flex flex-col gap-sm">
            <p className="text-body-sm text-slate">
              ℹ️ Đây là thanh toán mock. Nhấp "Xác nhận thanh toán" để hoàn tất.
            </p>
            <Button
              variant="primary"
              onClick={handleMockPayment}
              disabled={paying}
              className="w-full justify-center"
            >
              {paying ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
