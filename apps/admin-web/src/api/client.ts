const API_BASE = '/api';

function getToken() { return localStorage.getItem('access_token'); }

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
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

export interface Workshop {
  id: string; title: string; speakerName: string; roomName: string;
  capacity: number; confirmedCount: number; heldCount: number;
  feeType: string; price?: number; startsAt: string; endsAt: string;
  status: string; summaryStatus: string; aiSummary?: string; roomMapUrl?: string;
}

export interface WorkshopStats {
  totalRegistrations: number; confirmedCount: number;
  pendingPaymentCount: number; checkinCount: number; utilizationPct: number;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; user: { id: string; email: string; fullName: string; roles: string[] } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  getWorkshops: (page = 1) =>
    apiFetch<{ data: Workshop[]; total: number }>(`/admin/workshops?page=${page}`).catch(
      () => apiFetch<{ data: Workshop[]; total: number }>(`/workshops?page=${page}`)
    ),

  createWorkshop: (data: Partial<Workshop>) =>
    apiFetch<Workshop>('/admin/workshops', { method: 'POST', body: JSON.stringify(data) }),

  updateWorkshop: (id: string, data: Partial<Workshop>) =>
    apiFetch<Workshop>(`/admin/workshops/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  openWorkshop: (id: string) =>
    apiFetch<Workshop>(`/admin/workshops/${id}/open`, { method: 'POST' }),

  cancelWorkshop: (id: string) =>
    apiFetch<Workshop>(`/admin/workshops/${id}/cancel`, { method: 'POST' }),

  getStats: (id: string) =>
    apiFetch<WorkshopStats>(`/admin/workshops/${id}/stats`),
};
