const API_BASE = '/api';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API error');
  }
  return res.json();
}

export async function apiFetchText(path: string, options?: RequestInit): Promise<string> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API error');
  }
  return res.text();
}

export interface WorkshopSummary {
  id: string;
  title: string;
  speakerName: string;
  roomName: string;
  capacity: number;
  confirmedCount: number;
  heldCount: number;
  feeType: string;
  price?: number;
  startsAt: string;
  endsAt: string;
  status: string;
}

export interface WorkshopDetail extends WorkshopSummary {
  roomMapUrl?: string;
  summaryStatus: string;
  aiSummary?: string;
}

export interface MyRegistration {
  id: string;
  status: string;
  createdAt: string;
  holdExpiresAt?: string;
  workshop: {
    id: string;
    title: string;
    speakerName: string;
    roomName: string;
    startsAt: string;
    endsAt: string;
    feeType: string;
  };
}

export function getWorkshops(page = 1, limit = 20) {
  return apiFetch<{ data: WorkshopSummary[]; total: number; page: number; limit: number }>(
    `/workshops?page=${page}&limit=${limit}`,
  );
}

export function getWorkshop(id: string) {
  return apiFetch<WorkshopDetail>(`/workshops/${id}`);
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  registerWorkshop: (workshopId: string, idempotencyKey: string) =>
    apiFetch<{ id: string; status: string; qrTokenHash?: string }>('/registrations', {
      method: 'POST',
      body: JSON.stringify({ workshopId, idempotencyKey }),
    }),
  getMyRegistrations: () =>
    apiFetch<MyRegistration[]>('/me/registrations'),
  getQrCode: (registrationId: string) =>
    apiFetchText(`/me/registrations/${registrationId}/qr`),
};
