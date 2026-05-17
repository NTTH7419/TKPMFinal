import { useState, useEffect } from 'react';
import { Badge, Button, Card } from '@unihub/ui/components';
import type { BadgeVariant } from '@unihub/ui/components';
import { api, MyRegistration } from '../api/client';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

type StatusInfo = { label: string; variant: BadgeVariant | null };

function statusInfo(status: string): StatusInfo {
  const map: Record<string, StatusInfo> = {
    CONFIRMED: { label: 'Đã xác nhận', variant: 'tag-green' },
    PENDING_PAYMENT: { label: 'Chờ thanh toán', variant: 'tag-orange' },
    EXPIRED: { label: 'Đã hết hạn', variant: 'tag-purple' },
    CANCELLED: { label: 'Đã huỷ', variant: null },
    NEEDS_REVIEW: { label: 'Cần xem xét', variant: 'tag-purple' },
  };
  return map[status] ?? { label: status, variant: null };
}

function QrModal({ registrationId, onClose }: { registrationId: string; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getQrCode(registrationId)
      .then(setQrDataUrl)
      .catch((e) => setError(e.message));
  }, [registrationId]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <Card variant="base" className="max-w-[380px] w-[90%]" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-heading-5 text-ink text-center mb-lg">Mã QR tham dự</h3>
        {error && <p className="text-semantic-error text-center text-body-sm">{error}</p>}
        {!error && !qrDataUrl && (
          <p className="text-slate text-center text-body-sm">Đang tải...</p>
        )}
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR Code" className="block mx-auto rounded-md" />
        )}
        <Button variant="secondary" onClick={onClose} className="w-full justify-center mt-lg">
          Đóng
        </Button>
      </Card>
    </div>
  );
}

export function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrForId, setQrForId] = useState<string | null>(null);

  useEffect(() => {
    api.getMyRegistrations()
      .then(setRegistrations)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-center py-section text-slate text-body-md">Đang tải...</p>;
  }
  if (error) {
    return <p className="text-center py-section text-semantic-error text-body-md">{error}</p>;
  }
  if (registrations.length === 0) {
    return (
      <p className="text-center py-section text-slate text-body-md">
        Bạn chưa đăng ký workshop nào.
      </p>
    );
  }

  return (
    <div>
      <h2 className="text-heading-4 text-ink mb-lg">Đăng ký của tôi</h2>
      <div className="flex flex-col gap-lg">
        {registrations.map((reg) => {
          const st = statusInfo(reg.status);
          return (
            <Card key={reg.id} variant="base">
              <div className="flex justify-between items-center mb-sm gap-sm flex-wrap">
                <span className="text-body-md-medium text-ink">{reg.workshop.title}</span>
                {st.variant ? (
                  <Badge variant={st.variant}>{st.label}</Badge>
                ) : (
                  <span className="text-caption-bold text-stone bg-surface rounded-sm px-xs py-xxs">
                    {st.label}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-lg gap-y-xs text-body-sm text-slate">
                <span>👤 {reg.workshop.speakerName}</span>
                <span>🏛️ {reg.workshop.roomName}</span>
                <span>🕐 {formatDate(reg.workshop.startsAt)}</span>
                <span>💰 {reg.workshop.feeType === 'FREE' ? 'Miễn phí' : 'Có phí'}</span>
              </div>
              {reg.status === 'PENDING_PAYMENT' && reg.holdExpiresAt && (
                <p className="mt-sm text-caption text-brand-orange bg-card-tint-peach rounded-md px-sm py-xs">
                  Hết hạn giữ chỗ lúc: {formatDate(reg.holdExpiresAt)}
                </p>
              )}
              {reg.status === 'CONFIRMED' && (
                <Button
                  variant="primary"
                  onClick={() => setQrForId(reg.id)}
                  className="mt-sm"
                >
                  Xem mã QR tham dự
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {qrForId && (
        <QrModal registrationId={qrForId} onClose={() => setQrForId(null)} />
      )}
    </div>
  );
}
