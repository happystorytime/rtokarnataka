import {
  Client,
  Showroom,
  Vehicle,
  RTOCase,
  VehicleExchange,
  DocumentItem,
  Payment,
  Reminder,
  DashboardStats
} from './types';

const TOKEN_KEY = 'ka_rto_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Do not set Content-Type for FormData (multipart)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearStoredToken();
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Session expired or unauthorized. Please log in.');
  }

  if (!response.ok) {
    let errorMsg = `Request to ${path} failed (${response.status})`;
    try {
      const data = await response.json();
      if (data && data.error) {
        errorMsg = data.error;
      }
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Authentication
  getAuthStatus: () => request<{ initialized: boolean; authenticated: boolean; username?: string }>('/api/auth/status'),
  setupAdmin: (username: string, password: string) =>
    request<{ success: boolean; token: string }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  loginAdmin: (username: string, password: string) =>
    request<{ success: boolean; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  logoutAdmin: () =>
    request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST'
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/api/dashboard/stats'),

  // Showrooms
  getShowrooms: (query = '') => request<Showroom[]>(`/api/showrooms?q=${encodeURIComponent(query)}`),
  createShowroom: (data: Partial<Showroom>) =>
    request<{ id: string; message: string }>('/api/showrooms', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateShowroom: (id: string, data: Partial<Showroom>) =>
    request<{ message: string }>(`/api/showrooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteShowroom: (id: string) =>
    request<{ message: string }>(`/api/showrooms/${id}`, {
      method: 'DELETE'
    }),

  // Clients
  getClients: (query = '', status = 'active') =>
    request<Client[]>(`/api/clients?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`),
  getClient: (id: string) => request<Client & { vehicles: Vehicle[]; cases: RTOCase[]; payments: Payment[]; documents: DocumentItem[]; exchanges: VehicleExchange[] }>(`/api/clients/${id}`),
  checkClientDuplicate: (mobile: string, excludeId?: string) =>
    request<{ duplicate: boolean; client?: { id: string; full_name: string; mobile: string } }>(
      `/api/clients/check-duplicate?mobile=${encodeURIComponent(mobile)}${excludeId ? `&excludeId=${excludeId}` : ''}`
    ),
  createClient: (data: Partial<Client>) =>
    request<{ id: string; message: string }>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateClient: (id: string, data: Partial<Client>) =>
    request<{ message: string }>(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteClient: (id: string) =>
    request<{ message: string }>(`/api/clients/${id}`, {
      method: 'DELETE'
    }),

  // Vehicles
  getVehicles: (query = '', category = 'all', showroomId = 'all') =>
    request<Vehicle[]>(
      `/api/vehicles?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&showroomId=${encodeURIComponent(showroomId)}`
    ),
  getVehicle: (id: string) => request<Vehicle & { cases: RTOCase[]; documents: DocumentItem[] }>(`/api/vehicles/${id}`),
  checkVehicleDuplicate: (chassis: string, reg: string, excludeId?: string) =>
    request<{ duplicate: boolean; field?: string; vehicle?: Vehicle }>(
      `/api/vehicles/check-duplicate?chassis=${encodeURIComponent(chassis)}&reg=${encodeURIComponent(reg)}${excludeId ? `&excludeId=${excludeId}` : ''}`
    ),
  createVehicle: (data: Partial<Vehicle>) =>
    request<{ id: string; message: string }>('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateVehicle: (id: string, data: Partial<Vehicle>) =>
    request<{ message: string }>(`/api/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteVehicle: (id: string) =>
    request<{ message: string }>(`/api/vehicles/${id}`, {
      method: 'DELETE'
    }),

  // RTO Cases
  getCases: (query = '', status = 'all', serviceType = 'all', clientId = '') =>
    request<RTOCase[]>(
      `/api/cases?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&serviceType=${encodeURIComponent(serviceType)}&clientId=${encodeURIComponent(clientId)}`
    ),
  getCase: (id: string) =>
    request<RTOCase & { payments: Payment[]; documents: DocumentItem[] }>(`/api/cases/${id}`),
  createCase: (data: Partial<RTOCase>) =>
    request<{ id: string; case_number: string; message: string }>('/api/cases', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateCase: (id: string, data: Partial<RTOCase>) =>
    request<{ message: string }>(`/api/cases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteCase: (id: string) =>
    request<{ message: string }>(`/api/cases/${id}`, {
      method: 'DELETE'
    }),

  // Vehicle Exchanges
  getExchanges: () => request<VehicleExchange[]>('/api/exchanges'),
  createExchange: (data: Partial<VehicleExchange>) =>
    request<{ id: string; exchange_number: string; message: string }>('/api/exchanges', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deleteExchange: (id: string) =>
    request<{ message: string }>(`/api/exchanges/${id}`, {
      method: 'DELETE'
    }),

  // Documents
  getDocuments: (query = '', category = 'all', clientId = '', vehicleId = '', caseId = '') =>
    request<DocumentItem[]>(
      `/api/documents?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&clientId=${encodeURIComponent(clientId)}&vehicleId=${encodeURIComponent(vehicleId)}&caseId=${encodeURIComponent(caseId)}`
    ),
  uploadDocument: (formData: FormData) =>
    request<{ id: string; message: string }>('/api/documents/upload', {
      method: 'POST',
      body: formData
    }),
  deleteDocument: (id: string) =>
    request<{ message: string }>(`/api/documents/${id}`, {
      method: 'DELETE'
    }),
  getDocumentFileUrl: (id: string, download = false) => {
    const token = getStoredToken();
    return `/api/documents/${id}/file?download=${download ? 'true' : 'false'}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  },

  // Payments
  getPayments: (query = '', category = 'all', paymentMethod = 'all', clientId = '') =>
    request<Payment[]>(
      `/api/payments?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&paymentMethod=${encodeURIComponent(paymentMethod)}&clientId=${encodeURIComponent(clientId)}`
    ),
  getPaymentsSummary: () =>
    request<{
      totalBilled: number;
      totalServiceCharges: number;
      totalGovernmentFees: number;
      totalClientPayments: number;
      totalRefunds: number;
      outstanding: number;
    }>('/api/payments/summary'),
  recordPayment: (data: Partial<Payment>) =>
    request<{ id: string; payment_number: string; message: string }>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deletePayment: (id: string) =>
    request<{ message: string }>(`/api/payments/${id}`, {
      method: 'DELETE'
    }),
  exportPaymentsCsv: async () => {
    const token = getStoredToken();
    const res = await fetch('/api/payments/export-csv', {
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
      }
    });
    if (!res.ok) throw new Error('Failed to export CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rto_payments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  // Reminders
  getReminders: () =>
    request<{
      savedReminders: Reminder[];
      expiringVehicles: any[];
      dueCases: any[];
      dueFollowups: any[];
    }>('/api/reminders'),
  createReminder: (data: Partial<Reminder>) =>
    request<{ id: string; message: string }>('/api/reminders', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateReminderStatus: (id: string, status: string, snooze_days?: number, custom_snooze_date?: string) =>
    request<{ message: string }>(`/api/reminders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, snooze_days, custom_snooze_date })
    }),

  // Backups
  exportBackup: async () => {
    const token = getStoredToken();
    const res = await fetch('/api/backup/export', {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
      }
    });
    if (!res.ok) throw new Error('Failed to download backup');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rto_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
  listBackups: () =>
    request<{ fileName: string; sizeBytes: number; createdAt: string }[]>('/api/backup/list')
};
