import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import type { AuthState } from '../App';
import OfflineIndicator from '../components/OfflineIndicator';
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
      PENDING_SYNC: { status: 'ACCEPTED', message: '✓ Check-in thành công (chờ đồng bộ)' },
      NEEDS_REVIEW: { status: 'NEEDS_REVIEW', message: '⚠ Cần xem xét (danh sách có thể lỗi thời)' },
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

  const feedbackOverlay: Record<string, { bg: string; icon: string }> = {
    success: { bg: 'rgba(52,168,83,0.15)', icon: '✓' },
    error:   { bg: 'rgba(234,67,53,0.15)', icon: '✗' },
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16, position: 'relative' }}>
      {/* Feedback flash overlay */}
      {feedbackKind !== 'idle' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: feedbackOverlay[feedbackKind].bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 80, pointerEvents: 'none',
          transition: 'opacity 0.3s',
          color: feedbackKind === 'success' ? '#34a853' : '#ea4335',
        }}>
          {feedbackOverlay[feedbackKind].icon}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/workshops')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', fontSize: 14, padding: 0 }}
        >
          ← Quay lại
        </button>
        <h2 style={{ margin: 0, fontSize: 18, flex: 1 }}>Scan QR Check-in</h2>
        <button
          onClick={() => onLogout()}
          style={{ background: 'none', border: '1px solid #ea4335', color: '#ea4335', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          Đăng xuất
        </button>
      </div>

      {/* Offline indicator */}
      <div style={{ marginBottom: 12 }}>
        <OfflineIndicator isOnline={isOnline} pendingCount={pendingCount} syncing={syncing} />
      </div>

      {/* Roster status */}
      {roster ? (
        <div style={{ background: '#f0faf4', border: '1px solid #34a853', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
          ✓ Đã tải {roster.roster.length} đăng ký lúc {new Date(roster.preloadedAt).toLocaleTimeString('vi-VN')}
        </div>
      ) : (
        <div style={{ background: '#fff8e1', border: '1px solid #f9ab00', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
          ⚠ Chưa tải danh sách — các lần scan sẽ được lưu để xem xét (NEEDS_REVIEW)
        </div>
      )}

      {/* QR Scanner */}
      <div id="qr-reader" style={{ width: '100%', marginBottom: 12 }} />

      {/* Scan result message */}
      {scanResult && (
        <div style={{
          background: resultColor[scanResult.status] + '22',
          border: `1px solid ${resultColor[scanResult.status]}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 12,
          fontWeight: 600, color: resultColor[scanResult.status],
        }}>
          {scanResult.message}
        </div>
      )}

      {/* Sync panel */}
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, flex: 1 }}>
          {pendingCount > 0 ? `${pendingCount} sự kiện chờ đồng bộ` : 'Không có sự kiện chờ'}
        </span>
        <button
          onClick={doSync}
          disabled={syncing || pendingCount === 0}
          style={{
            padding: '6px 14px', borderRadius: 6,
            background: syncing || pendingCount === 0 ? '#ccc' : '#1a73e8',
            color: '#fff', border: 'none',
            cursor: syncing || pendingCount === 0 ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          {syncing ? 'Đang đồng bộ...' : 'Đồng bộ'}
        </button>
      </div>
      {syncMsg && <p style={{ fontSize: 12, color: '#666', marginTop: 4, marginBottom: 0 }}>{syncMsg}</p>}
    </div>
  );
}
