import { openDB, type IDBPDatabase } from 'idb';

export interface RosterItem {
  registrationId: string;
  studentId: string;
  qrTokenHash: string;
}

export interface RosterRecord {
  workshopId: string;
  hmacSecret: string;
  roster: RosterItem[];
  preloadedAt: string;
}

export type LocalCheckinStatus = 'PENDING_SYNC' | 'NEEDS_REVIEW' | 'SYNCED';

export interface CheckinEventRecord {
  eventId: string;
  registrationId: string;
  workshopId: string;
  deviceId: string;
  scannedAt: string;
  status: LocalCheckinStatus;
  syncResult?: 'ACCEPTED' | 'DUPLICATE' | 'INVALID';
}

let _db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (!_db) {
    _db = await openDB('unihub-checkin', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('rosters')) {
          db.createObjectStore('rosters', { keyPath: 'workshopId' });
        }
        if (!db.objectStoreNames.contains('checkin-events')) {
          db.createObjectStore('checkin-events', { keyPath: 'eventId' });
        }
      },
    });
  }
  return _db;
}

export async function saveRoster(record: RosterRecord): Promise<void> {
  const db = await getDb();
  await db.put('rosters', record);
}

export async function getRoster(workshopId: string): Promise<RosterRecord | undefined> {
  const db = await getDb();
  return db.get('rosters', workshopId);
}

export async function saveCheckinEvent(event: CheckinEventRecord): Promise<void> {
  const db = await getDb();
  await db.put('checkin-events', event);
}

export async function getPendingEvents(workshopId: string): Promise<CheckinEventRecord[]> {
  const db = await getDb();
  const all: CheckinEventRecord[] = await db.getAll('checkin-events');
  return all.filter((e) => e.workshopId === workshopId && e.status !== 'SYNCED');
}

export async function getCheckinCount(workshopId: string): Promise<number> {
  const db = await getDb();
  const all: CheckinEventRecord[] = await db.getAll('checkin-events');
  return all.filter((e) => e.workshopId === workshopId && e.status === 'SYNCED').length;
}

export async function updateEventSynced(eventId: string, syncResult: string): Promise<void> {
  const db = await getDb();
  const event: CheckinEventRecord | undefined = await db.get('checkin-events', eventId);
  if (event) {
    await db.put('checkin-events', { ...event, status: 'SYNCED', syncResult });
  }
}

export function generateUUID(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers (Safari on iOS)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('unihub-device-id');
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem('unihub-device-id', deviceId);
  }
  return deviceId;
}
