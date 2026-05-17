import { useState, useEffect, useRef } from 'react';
import { Badge, Button, Card } from '@unihub/ui/components';
import { api, Notification } from '../api/client';

const EVENT_LABELS: Record<string, string> = {
  RegistrationConfirmed: 'Đăng ký thành công',
  PaymentSucceeded: 'Thanh toán thành công',
  RegistrationExpired: 'Đăng ký hết hạn',
  WorkshopCancelled: 'Workshop bị hủy',
  WorkshopUpdated: 'Workshop có thay đổi',
  PaymentFailed: 'Thanh toán thất bại',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch {
      // silently fail — bell stays with last count
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
    );
    try {
      await api.markNotificationRead(id);
    } catch {
      // optimistic update; ignore error
    }
  };

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) fetchNotifications();
  };

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        variant="ghost"
        onClick={handleOpen}
        aria-label="Thông báo"
        className="relative text-on-dark text-[22px] leading-none px-xs py-xxs"
      >
        🔔
        {unreadCount > 0 && (
          <Badge
            variant="purple"
            className="absolute -top-xxs -right-xxs text-[10px] min-w-[16px] h-[16px] px-[3px] py-0 leading-none"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <Card
          variant="base"
          className="absolute right-0 top-[calc(100%+8px)] w-[340px] p-0 max-h-[480px] overflow-y-auto z-[1000]"
        >
          <div className="px-md py-sm border-b border-hairline flex justify-between items-center">
            <span className="text-body-sm-medium text-ink">Thông báo</span>
            {unreadCount > 0 && (
              <span className="text-caption text-steel">{unreadCount} chưa đọc</span>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <p className="text-center py-lg text-stone text-body-sm">Đang tải...</p>
          ) : notifications.length === 0 ? (
            <p className="text-center py-lg text-stone text-body-sm">Chưa có thông báo</p>
          ) : (
            <ul className="list-none m-0 p-0">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`px-md py-sm border-b border-hairline-soft flex gap-xs ${
                    n.isRead ? 'bg-canvas cursor-default' : 'bg-card-tint-sky cursor-pointer'
                  }`}
                >
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-[5px]" />
                  )}
                  <div className="flex-1">
                    <p className={`m-0 text-caption text-ink ${n.isRead ? 'font-normal' : 'font-semibold'}`}>
                      {EVENT_LABELS[n.eventType] ?? n.eventType}
                    </p>
                    {(n.payload as any).workshopTitle && (
                      <p className="m-0 mt-xxs text-caption text-steel">
                        {(n.payload as any).workshopTitle}
                      </p>
                    )}
                    <p className="m-0 mt-xxs text-micro text-stone">
                      {new Date(n.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
