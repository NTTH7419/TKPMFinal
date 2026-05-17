import { useState, useEffect } from 'react';
import { Button, Card } from '@unihub/ui/components';
import { getWorkshop, WorkshopDetail, api } from '../api/client';
import { useSeatStream } from '../hooks/useSeatStream';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'long', timeStyle: 'short' });
}

export function WorkshopDetailPage({
  workshopId,
  onBack,
  onPaymentRequired,
}: {
  workshopId: string;
  onBack: () => void;
  onPaymentRequired?: (registrationId: string) => void;
}) {
  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [msg, setMsg] = useState('');
  const { seatData } = useSeatStream(workshopId);

  useEffect(() => {
    getWorkshop(workshopId)
      .then(setWorkshop)
      .finally(() => setLoading(false));
  }, [workshopId]);

  const handleRegister = async () => {
    setRegistering(true);
    setMsg('');
    try {
      try {
        await api.getQueueToken(workshopId);
      } catch (e) {
        throw new Error('Unable to get queue token: ' + (e as any).message);
      }

      const idempotencyKey = crypto.randomUUID();
      const res = await api.registerWorkshop(workshopId, idempotencyKey);
      if (res.status === 'CONFIRMED') {
        setMsg('✅ Đăng ký thành công!');
      } else if (res.status === 'PENDING_PAYMENT') {
        setMsg('⏳ Vui lòng thanh toán trong 10 phút!');
        setTimeout(() => {
          if (onPaymentRequired) {
            onPaymentRequired(res.id);
          }
        }, 500);
      }
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return <p className="text-center py-section text-slate text-body-md">Đang tải...</p>;
  }
  if (!workshop) {
    return <p className="text-center py-section text-slate text-body-md">Không tìm thấy workshop</p>;
  }

  const remaining = seatData
    ? seatData.remainingSeats
    : workshop.capacity - workshop.confirmedCount - workshop.heldCount;

  const isError = msg.startsWith('❌');

  return (
    <div className="max-w-[720px] mx-auto px-md py-xxl">
      <Button variant="ghost" onClick={onBack} className="mb-lg text-primary px-0">
        ← Quay lại
      </Button>

      <Card variant="base">
        <h1 className="text-heading-3 text-ink mb-lg">{workshop.title}</h1>

        <div className="flex flex-col gap-sm mb-xxl">
          <div className="flex gap-xs items-center text-body-sm text-slate">
            <span>👤</span>
            <span>{workshop.speakerName}</span>
          </div>
          <div className="flex gap-xs items-center text-body-sm text-slate">
            <span>🏛️</span>
            <span>{workshop.roomName}</span>
          </div>
          <div className="flex gap-xs items-center text-body-sm text-slate">
            <span>🕐</span>
            <span>{formatDate(workshop.startsAt)} – {formatDate(workshop.endsAt)}</span>
          </div>
          <div className="flex gap-xs items-center text-body-sm">
            <span>💺</span>
            <strong className={remaining > 0 ? 'text-brand-green' : 'text-semantic-error'}>
              {remaining > 0 ? `Còn ${remaining} / ${workshop.capacity} chỗ` : 'Đã hết chỗ'}
            </strong>
          </div>
          <div className="flex gap-xs items-center text-body-sm text-slate">
            <span>💰</span>
            <span>
              {workshop.feeType === 'FREE'
                ? 'Miễn phí'
                : `${Number(workshop.price).toLocaleString('vi-VN')} đ`}
            </span>
          </div>
        </div>

        {workshop.aiSummary && (
          <div className="bg-surface rounded-md p-lg mb-xxl">
            <h3 className="text-body-md-medium text-ink mb-xs">📋 Tóm tắt nội dung</h3>
            <p className="text-body-sm text-slate">{workshop.aiSummary}</p>
          </div>
        )}

        {workshop.roomMapUrl && (
          <div className="mb-xxl">
            <h3 className="text-body-md-medium text-ink mb-xs">🗺️ Sơ đồ phòng</h3>
            <img src={workshop.roomMapUrl} alt="Room map" className="max-w-full rounded-md" />
          </div>
        )}

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

        <Button
          variant="primary"
          onClick={handleRegister}
          disabled={remaining === 0 || registering}
          className="w-full justify-center"
        >
          {registering ? 'Đang xử lý...' : remaining > 0 ? 'Đăng ký tham dự' : 'Hết chỗ'}
        </Button>
      </Card>
    </div>
  );
}
