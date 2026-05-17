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
  if (res.status === 401 && path !== '/auth/login') {
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Phiên đăng nhập hết hạn');
  }
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

export interface Attendee {
  id: string;
  status: string;
  student: { id: string; fullName: string; email: string; studentCode: string };
  checkedIn: boolean;
  createdAt: string;
}

export interface SummaryStatus {
  summaryStatus: string;
  aiSummary?: string;
  latestDocument?: {
    id: string; originalFilename: string; uploadStatus: string;
    errorReason?: string; createdAt: string;
  };
}

export interface ImportBatch {
  id: string; filePath: string; status: string;
  totalRows: number; validRows: number; errorRows: number;
  startedAt?: string; completedAt?: string; createdAt: string;
}

export interface ImportBatchDetail extends ImportBatch {
  rows: {
    id: string; rowNumber: number; studentCode: string;
    email: string; fullName: string; faculty: string;
    rowStatus: string; errorMessage?: string;
  }[];
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

  getSummaryStatus: (workshopId: string) =>
    apiFetch<SummaryStatus>(`/admin/workshops/${workshopId}/summary-status`),

  uploadDocument: (workshopId: string, file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    return fetch(`${API_BASE}/admin/workshops/${workshopId}/documents`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form,
      credentials: 'include',
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Upload failed');
      }
      return res.json() as Promise<{ documentId: string; status: string }>;
    });
  },

  updateSummary: (workshopId: string, aiSummary: string) =>
    apiFetch<{ id: string; summaryStatus: string; aiSummary: string }>(
      `/admin/workshops/${workshopId}/summary`,
      { method: 'PATCH', body: JSON.stringify({ aiSummary }) },
    ),

  getAttendees: (workshopId: string) =>
    apiFetch<{ data: Attendee[] }>(`/admin/workshops/${workshopId}/registrations`),

  getImportBatches: (page = 1) =>
    apiFetch<{ data: ImportBatch[]; total: number; page: number; limit: number }>(
      `/admin/imports/students?page=${page}`
    ),

  getImportBatchDetail: (batchId: string) =>
    apiFetch<ImportBatchDetail>(`/admin/imports/students/${batchId}`),
};
