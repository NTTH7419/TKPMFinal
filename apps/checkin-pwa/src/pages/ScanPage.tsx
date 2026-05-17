import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheck, faTimes, faTriangleExclamation, faQrcode, faRightFromBracket, faRotate, faClockRotateLeft, faSignal, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { Html5QrcodeScanner } from 'html5-qrcode';
import type { AuthState } from '../App';
import {
  getRoster,
  saveCheckinEvent,
  getPendingEvents,
  updateEventSynced,
  getOrCreateDeviceId,
  generateUUID,
  type RosterRecord,
  type CheckinEventRecord,
} from '../db';

interface Props {
  auth: AuthState;
  onLogout: (reason?: string) => void;
}

type ScanResult = {
  status: 'ACCEPTED' | 'DUPLICATE' | 'INVALID' | 'NEEDS_REVIEW' | 'EXPIRED';
  message: string;
};

interface QrPayload {
  registrationId: string;
  workshopId: string;
  studentId: string;
  expiresAt: string;
  hash: string;
}

// Task 8.7: HMAC-SHA256 verification using Web Crypto API
async function verifyHmac(
  secret: string,
  payload: { registrationId: string; workshopId: string; studentId: string; expiresAt: string },
  expectedHash: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const data = encoder.encode(
      JSON.stringify({
        registrationId: payload.registrationId,
        workshopId: payload.workshopId,
        studentId: payload.studentId,
        expiresAt: payload.expiresAt,
      }),
    );
    const signature = await crypto.subtle.sign('HMAC', key, data);
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex === expectedHash;
  } catch {
    return false;
  }
}

// Task 8.9: Sync pending events to the server
async function syncPendingEvents(
  workshopId: string,
  token: string,
  deviceId: string,
): Promise<{ synced: number; errors: number; unauthorized?: boolean }> {
  const pending = await getPendingEvents(workshopId);
  if (pending.length === 0) return { synced: 0, errors: 0 };

  const events = pending.map((e) => ({
    eventId: e.eventId,
    registrationId: e.registrationId,
    workshopId: e.workshopId,
    deviceId,
    scannedAt: e.scannedAt,
  }));

  try {
    const res = await fetch('/api/checkin/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ events }),
    });

    if (res.status === 401) return { synced: 0, errors: pending.length, unauthorized: true };
    if (!res.ok) return { synced: 0, errors: pending.length };

    const results: { eventId: string; status: string }[] = await res.json();
    let synced = 0;
    let errors = 0;
    for (const result of results) {
      if (result.status !== 'INVALID') {
        await updateEventSynced(result.eventId, result.status);
        synced++;
      } else {
        errors++;
      }
    }
    return { synced, errors };
  } catch {
    return { synced: 0, errors: pending.length };
  }
}

export default function ScanPage({ auth, onLogout }: Props) {
  const { workshopId } = useParams<{ workshopId: string }>();
  const navigate = useNavigate();

  const [roster, setRoster] = useState<RosterRecord | null>(null);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [feedbackKind, setFeedbackKind] = useState<'idle' | 'success' | 'error'>('idle');
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rosterRef = useRef<RosterRecord | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scanCooldown = useRef(false);

  const deviceId = getOrCreateDeviceId();

  function triggerFeedback(kind: 'success' | 'error') {
    setFeedbackKind(kind);
    if (navigator.vibrate) {
      navigator.vibrate(kind === 'success' ? 200 : [100, 50, 100]);
    }
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedbackKind('idle'), 2000);
  }

  // Load roster from IndexedDB on mount
  useEffect(() => {
    if (!workshopId) return;
    getRoster(workshopId).then((r) => {
      setRoster(r ?? null);
      rosterRef.current = r ?? null;
      setRosterLoaded(true); // scanner can start regardless of whether roster exists
    });
    refreshPendingCount();
  }, [workshopId]);

  async function refreshPendingCount() {
    if (!workshopId) return;
    const pending = await getPendingEvents(workshopId);
    setPendingCount(pending.length);
  }

  // Task 8.7: Process a scanned QR string
  const handleScan = useCallback(async (rawText: string) => {
    if (scanCooldown.current) return;
    scanCooldown.current = true;
    setTimeout(() => { scanCooldown.current = false; }, 3000);

    const current = rosterRef.current;
    let qr: QrPayload;
    try {
      qr = JSON.parse(rawText);
      if (!qr.registrationId || !qr.workshopId || !qr.hash || !qr.expiresAt) throw new Error('bad');
    } catch {
      setScanResult({ status: 'INVALID', message: 'QR code không hợp lệ' });
      triggerFeedback('error');
      return;
    }

    // Verify workshop matches
    if (qr.workshopId !== workshopId) {
      setScanResult({ status: 'INVALID', message: 'QR thuộc workshop khác' });
      triggerFeedback('error');
      return;
    }

    // Check expiry
    if (new Date(qr.expiresAt).getTime() < Date.now()) {
      setScanResult({ status: 'EXPIRED', message: 'QR code đã hết hạn' });
      triggerFeedback('error');
      return;
    }

    // Task 8.8: Determine status and write to IndexedDB
    let eventStatus: CheckinEventRecord['status'];

    if (!current) {
      // No roster loaded — save as NEEDS_REVIEW
      eventStatus = 'NEEDS_REVIEW';
    } else {
      // Verify HMAC signature
      const valid = await verifyHmac(
        current.hmacSecret,
        { registrationId: qr.registrationId, workshopId: qr.workshopId, studentId: qr.studentId, expiresAt: qr.expiresAt },
        qr.hash,
      );
      if (!valid) {
        setScanResult({ status: 'INVALID', message: 'Chữ ký QR không hợp lệ' });
        return;
      }

      // Look up in roster
      const inRoster = current.roster.find((r) => r.registrationId === qr.registrationId);
      if (inRoster) {
        eventStatus = 'PENDING_SYNC';
      } else {
        // Valid HMAC but not in roster — might be a late registration
        eventStatus = 'NEEDS_REVIEW';
      }
    }

    const event: CheckinEventRecord = {
      eventId: generateUUID(),
      registrationId: qr.registrationId,
      workshopId: qr.workshopId,
      deviceId,
      scannedAt: new Date().toISOString(),
      status: eventStatus,
    };

    await saveCheckinEvent(event);
    await refreshPendingCount();

    const resultMap: Record<string, ScanResult> = {
      PENDING_SYNC: { status: 'ACCEPTED', message: 'Check-in thành công (chờ đồng bộ)' },
      NEEDS_REVIEW: { status: 'NEEDS_REVIEW', message: 'Cần xem xét (danh sách có thể lỗi thời)' },
    };
    const result = resultMap[eventStatus] ?? { status: 'INVALID', message: 'Lỗi không xác định' };
    setScanResult(result);

    // Visual + haptic feedback
    triggerFeedback(result.status === 'ACCEPTED' ? 'success' : 'error');

    // Auto-sync if online
    if (navigator.onLine && auth?.token) {
      doSync();
    }
  }, [workshopId, auth, deviceId]);

  // Task 8.6: Initialize QR scanner — starts as soon as roster check is done (even if no roster)
  useEffect(() => {
    if (!rosterLoaded) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
      false,
    );
    scanner.render(
      (text) => handleScan(text),
      () => {},
    );
    scannerRef.current = scanner;

    return () => {
      console.log('[ScanPage] Cleaning up scanner');
      scannerRef.current?.clear().catch(() => {});
      scannerRef.current = null;
    };
  }, [rosterLoaded, handleScan]);

  // Task 8.9: React to online/offline events
  useEffect(() => {
    function onOnline() {
      setIsOnline(true);
      if (auth?.token) doSync();
    }
    function onOffline() { setIsOnline(false); }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [auth]);

  async function doSync() {
    if (!workshopId || !auth?.token || syncing) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const { synced, errors, unauthorized } = await syncPendingEvents(workshopId, auth.token, deviceId);
      if (unauthorized) {
        onLogout('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      setSyncMsg(`Đã đồng bộ ${synced} sự kiện${errors > 0 ? `, ${errors} lỗi` : ''}`);
      await refreshPendingCount();
    } finally {
      setSyncing(false);
    }
  }

  const resultColor: Record<string, string> = {
    ACCEPTED: '#34a853',
    NEEDS_REVIEW: '#f9ab00',
    INVALID: '#ea4335',
    EXPIRED: '#ea4335',
    DUPLICATE: '#ff8c00',
  };

  const feedbackOverlay: Record<string, { bg: string; icon: typeof faCheck; color: string }> = {
    success: { bg: 'rgba(52,168,83,0.18)', icon: faCheck, color: '#34a853' },
    error:   { bg: 'rgba(234,67,53,0.18)', icon: faTimes, color: '#ea4335' },
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Feedback flash overlay */}
      {feedbackKind !== 'idle' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: feedbackOverlay[feedbackKind].bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          color: feedbackOverlay[feedbackKind].color,
        }}>
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            background: feedbackKind === 'success' ? '#34a853' : '#ea4335',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 52, color: '#fff',
            boxShadow: `0 0 48px ${feedbackKind === 'success' ? 'rgba(52,168,83,0.4)' : 'rgba(234,67,53,0.4)'}`,
          }}>
            <FontAwesomeIcon icon={feedbackOverlay[feedbackKind].icon} />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '0 16px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => navigate('/workshops')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#1a73e8', fontSize: 14, fontWeight: 500, padding: 0,
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} />Quay lại
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #1a73e8, #1565c0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13,
          }}>
            <FontAwesomeIcon icon={faQrcode} />
          </span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Scan QR Check-in</span>
        </div>
        <button
          onClick={() => onLogout()}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: '1px solid #e2e8f0',
            color: '#64748b', borderRadius: 7, padding: '5px 10px',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}
        >
          <FontAwesomeIcon icon={faRightFromBracket} />Đăng xuất
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 24px' }}>

        {/* Status row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {/* Online/offline pill */}
          <div style={{
            flex: 1,
            display: 'flex', alignItems: 'center', gap: 7,
            background: '#fff',
            border: `1.5px solid ${isOnline ? '#34a853' : '#f9ab00'}`,
            borderRadius: 10, padding: '8px 12px', fontSize: 13,
          }}>
            <FontAwesomeIcon
              icon={syncing ? faSpinner : faSignal}
              spin={syncing}
              style={{ color: isOnline ? '#34a853' : '#f9ab00', fontSize: 13 }}
            />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>
              {syncing ? 'Đang đồng bộ...' : isOnline ? 'Online' : 'Offline'}
            </span>
            {pendingCount > 0 && !syncing && (
              <span style={{
                marginLeft: 'auto',
                background: '#f9ab00', color: '#fff',
                borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700,
              }}>
                {pendingCount} chờ
              </span>
            )}
          </div>

          {/* Roster status pill */}
          {roster ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#f0fdf4', border: '1.5px solid #34a853',
              borderRadius: 10, padding: '8px 12px', fontSize: 12,
              color: '#16a34a', fontWeight: 500, whiteSpace: 'nowrap',
            }}>
              <FontAwesomeIcon icon={faCheck} style={{ fontSize: 11 }} />
              {roster.roster.length} đăng ký
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fffbeb', border: '1.5px solid #f9ab00',
              borderRadius: 10, padding: '8px 12px', fontSize: 12,
              color: '#92400e', fontWeight: 500, whiteSpace: 'nowrap',
            }}>
              <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: 11 }} />
              Chưa tải
            </div>
          )}
        </div>

        {/* Roster warning banner (only if not loaded) */}
        {!roster && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fcd34d',
            borderRadius: 10, padding: '10px 14px', marginBottom: 12,
            fontSize: 13, color: '#78350f',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: '#f59e0b', marginTop: 1, flexShrink: 0 }} />
            Chưa tải danh sách đăng ký — các lần scan sẽ được lưu để xem xét
          </div>
        )}

        {/* Roster preloaded time */}
        {roster && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 10, padding: '8px 12px', marginBottom: 12,
            fontSize: 12, color: '#15803d',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <FontAwesomeIcon icon={faClockRotateLeft} style={{ fontSize: 11 }} />
            Đã tải lúc {new Date(roster.preloadedAt).toLocaleTimeString('vi-VN')}
          </div>
        )}

        {/* QR Scanner */}
        <div style={{
          background: '#fff', borderRadius: 14,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden', marginBottom: 12,
        }}>
          <div id="qr-reader" style={{ width: '100%' }} />
        </div>

        {/* Scan result message */}
        {scanResult && (
          <div style={{
            background: resultColor[scanResult.status] + '18',
            border: `1.5px solid ${resultColor[scanResult.status]}`,
            borderRadius: 12, padding: '12px 16px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: resultColor[scanResult.status],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 14, flexShrink: 0,
            }}>
              <FontAwesomeIcon
                icon={scanResult.status === 'ACCEPTED' ? faCheck : scanResult.status === 'NEEDS_REVIEW' ? faTriangleExclamation : faTimes}
              />
            </div>
            <span style={{ fontWeight: 600, fontSize: 14, color: resultColor[scanResult.status] }}>
              {scanResult.message}
            </span>
          </div>
        )}

        {/* Sync panel */}
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <FontAwesomeIcon
            icon={syncing ? faSpinner : faRotate}
            spin={syncing}
            style={{ color: pendingCount > 0 ? '#1a73e8' : '#94a3b8', fontSize: 15 }}
          />
          <span style={{ fontSize: 13, flex: 1, color: pendingCount > 0 ? '#1e293b' : '#94a3b8' }}>
            {pendingCount > 0 ? `${pendingCount} sự kiện chờ đồng bộ` : 'Không có sự kiện chờ'}
          </span>
          <button
            onClick={doSync}
            disabled={syncing || pendingCount === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 8,
              background: syncing || pendingCount === 0 ? '#f1f5f9' : 'linear-gradient(135deg, #1a73e8, #1565c0)',
              color: syncing || pendingCount === 0 ? '#94a3b8' : '#fff',
              border: 'none',
              cursor: syncing || pendingCount === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
              boxShadow: syncing || pendingCount === 0 ? 'none' : '0 2px 8px rgba(26,115,232,0.3)',
            }}
          >
            {syncing
              ? <><FontAwesomeIcon icon={faSpinner} spin />Đang đồng bộ</>
              : <><FontAwesomeIcon icon={faRotate} />Đồng bộ</>}
          </button>
        </div>
        {syncMsg && (
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 6, marginBottom: 0, textAlign: 'center' }}>
            {syncMsg}
          </p>
        )}
      </div>
    </div>
  );
}
