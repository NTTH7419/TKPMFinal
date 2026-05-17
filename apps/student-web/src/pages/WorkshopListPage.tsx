import { useState, useEffect } from 'react';
import { Badge, Card } from '@unihub/ui/components';
import { getWorkshops, WorkshopSummary } from '../api/client';
import { useSeatStream } from '../hooks/useSeatStream';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function SeatBadge({ workshopId, initialRemaining }: { workshopId: string; initialRemaining: number }) {
  const { seatData, connected } = useSeatStream(workshopId);
  const remaining = seatData ? seatData.remainingSeats : initialRemaining;

  return (
    <span className="flex items-center gap-xs">
      <Badge variant={remaining > 0 ? 'tag-green' : 'tag-orange'}>
        {remaining > 0 ? `Còn ${remaining} chỗ` : 'Hết chỗ'}
      </Badge>
      {connected && <span className="text-stone text-micro">●</span>}
    </span>
  );
}

export function WorkshopListPage({ onSelect }: { onSelect: (id: string) => void }) {
  const [workshops, setWorkshops] = useState<WorkshopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWorkshops()
      .then((res) => setWorkshops(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="text-center py-section text-slate text-body-md">
        Đang tải danh sách workshop...
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-center py-section text-semantic-error text-body-md">
        Lỗi: {error}
      </p>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-md py-xxl">
      <h1 className="text-heading-2 text-ink mb-xxl">
        Workshop Tuần lễ Kỹ năng &amp; Nghề nghiệp
      </h1>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-lg">
        {workshops.map((w) => {
          const remaining = w.capacity - w.confirmedCount - w.heldCount;
          return (
            <Card
              key={w.id}
              variant="base"
              className="cursor-pointer"
              onClick={() => onSelect(w.id)}
            >
              <div className="flex justify-between items-start gap-xs mb-xs">
                <h2 className="text-body-md-medium text-ink flex-1">{w.title}</h2>
                <SeatBadge workshopId={w.id} initialRemaining={remaining} />
              </div>
              <p className="text-body-sm text-slate my-xxs">👤 {w.speakerName}</p>
              <p className="text-caption text-steel my-xxs">🏛️ {w.roomName}</p>
              <p className="text-caption text-steel my-xxs">🕐 {formatDate(w.startsAt)}</p>
              <p className="text-body-sm-medium text-ink mt-xs">
                {w.feeType === 'FREE'
                  ? '🆓 Miễn phí'
                  : `💰 ${Number(w.price).toLocaleString('vi-VN')} đ`}
              </p>
            </Card>
          );
        })}
        {workshops.length === 0 && (
          <p className="text-stone col-span-full text-center py-section text-body-sm">
            Hiện chưa có workshop nào đang mở đăng ký.
          </p>
        )}
      </div>
    </div>
  );
}
