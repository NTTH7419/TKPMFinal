import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle } from '@fortawesome/free-solid-svg-icons';

interface Props {
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
}

export default function OfflineIndicator({ isOnline, pendingCount, syncing }: Props) {
  const bg = isOnline ? '#f0faf4' : '#fff8e1';
  const border = isOnline ? '#34a853' : '#f9ab00';
  const dotColor = isOnline ? '#34a853' : '#f9ab00';

  let statusText = isOnline ? 'Online' : 'Offline';
  if (syncing) statusText = 'Đang đồng bộ...';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 8, padding: '6px 12px', fontSize: 13,
    }}>
      <FontAwesomeIcon icon={faCircle} style={{ color: dotColor, fontSize: 10 }} />
      <span style={{ fontWeight: 600, color: '#333' }}>{statusText}</span>
      {pendingCount > 0 && !syncing && (
        <span style={{
          background: '#f9ab00', color: '#fff',
          borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
        }}>
          {pendingCount} chờ sync
        </span>
      )}
    </div>
  );
}
