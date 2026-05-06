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

export function getWorkshops(page = 1, limit = 20) {
  return apiFetch<{ data: WorkshopSummary[]; total: number; page: number; limit: number }>(
    `/workshops?page=${page}&limit=${limit}`,
  );
}

export function getWorkshop(id: string) {
  return apiFetch<WorkshopDetail>(`/workshops/${id}`);
}
