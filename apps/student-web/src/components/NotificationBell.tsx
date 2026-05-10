import { useState, useEffect, useRef } from 'react';
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
    const timer = setInterval(fetchNotifications, 30_000); // poll every 30s
    return () => clearInterval(timer);
  }, []);

  // Close on outside click
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
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        aria-label="Thông báo"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '4px 8px',
          fontSize: 22,
          color: '#fff',
          lineHeight: 1,
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              fontSize: 10,
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              padding: '0 3px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 340,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1000,
            maxHeight: 480,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f3f4f6',
              fontWeight: 700,
              fontSize: 14,
              color: '#111827',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
                {unreadCount} chưa đọc
              </span>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 14 }}>
              Đang tải...
            </p>
          ) : notifications.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 14 }}>
              Chưa có thông báo
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f9fafb',
                    cursor: n.isRead ? 'default' : 'pointer',
                    background: n.isRead ? '#fff' : '#eff6ff',
                    transition: 'background 0.15s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    {!n.isRead && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#3b82f6',
                          flexShrink: 0,
                          marginTop: 5,
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: n.isRead ? 400 : 600, fontSize: 13, color: '#111827' }}>
                        {EVENT_LABELS[n.eventType] ?? n.eventType}
                      </p>
                      {(n.payload as any).workshopTitle && (
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                          {(n.payload as any).workshopTitle}
                        </p>
                      )}
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
                        {new Date(n.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
