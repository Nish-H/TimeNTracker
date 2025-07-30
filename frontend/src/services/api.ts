import axios from 'axios';
import { AuthResponse, Task, TimeLog, Client, Category, DailyReport, HaloExportEntry, User } from '@/types';

const API_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { name, email, password }),
  
  verify: () => api.get<{ user: any }>('/auth/verify'),
  
  updateProfile: (data: { name?: string; email?: string }) =>
    api.put<{ user: any; message: string }>('/auth/profile', data),
  
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<{ message: string }>('/auth/password', data),
};

// Tasks API
export const tasksApi = {
  getAll: (params?: any) => api.get<{ tasks: Task[] }>('/tasks', { params }),
  getById: (id: number) => api.get<{ task: Task }>(`/tasks/${id}`),
  create: (data: Partial<Task>) => api.post<{ task: Task }>('/tasks', data),
  update: (id: number, data: Partial<Task>) => api.put<{ task: Task }>(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
  getByHaloTicket: (ticketId: string) => api.get<{ tasks: Task[] }>(`/tasks/halo/${ticketId}`),
};

// Time Logs API
export const timeLogsApi = {
  getAll: (params?: any) => api.get<{ timeLogs: TimeLog[] }>('/time-logs', { params }),
  getActive: () => api.get<{ activeTimeLog: TimeLog | null }>('/time-logs/active'),
  start: (taskId: number, description?: string) =>
    api.post<{ timeLog: TimeLog }>('/time-logs/start', { taskId, description }),
  stop: (id: number, endTime: string, description?: string) =>
    api.post<{ timeLog: TimeLog }>('/time-logs/stop', { id, endTime, description }),
  createManual: (data: { taskId: number; startTime: string; endTime: string; description?: string }) =>
    api.post<{ timeLog: TimeLog }>('/time-logs/manual', data),
  update: (id: number, data: Partial<TimeLog>) =>
    api.put<{ timeLog: TimeLog }>(`/time-logs/${id}`, data),
  delete: (id: number) => api.delete(`/time-logs/${id}`),
  getByDateRange: (startDate: string, endDate: string) =>
    api.get<{ timeLogs: TimeLog[] }>('/time-logs/range', { params: { startDate, endDate } }),
};

// Clients API
export const clientsApi = {
  getAll: () => api.get<{ clients: Client[] }>('/clients'),
  getById: (id: number) => api.get<{ client: Client }>(`/clients/${id}`),
  create: (data: Partial<Client>) => api.post<{ client: Client }>('/clients', data),
  update: (id: number, data: Partial<Client>) => api.put<{ client: Client }>(`/clients/${id}`, data),
  delete: (id: number) => api.delete(`/clients/${id}`),
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get<{ categories: Category[] }>('/categories'),
  getById: (id: number) => api.get<{ category: Category }>(`/categories/${id}`),
  create: (data: Partial<Category>) => api.post<{ category: Category }>('/categories', data),
  update: (id: number, data: Partial<Category>) => api.put<{ category: Category }>(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

// Users API
export const usersApi = {
  getAll: () => api.get<User[]>('/users'),
  getProfile: () => api.get<User>('/users/profile'),
  updateProfile: (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) =>
    api.put<User>('/users/profile', data),
  create: (data: { email: string; name: string; password: string; role?: string }) =>
    api.post<User>('/users', data),
  update: (id: number, data: { name?: string; email?: string; role?: string; isActive?: boolean; password?: string }) =>
    api.put<User>(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  unlock: (id: number) => api.post(`/users/${id}/unlock`),
  resetPassword: (id: number, newPassword: string) => 
    api.post(`/users/${id}/reset-password`, { newPassword }),
  toggleStatus: (id: number) => api.post(`/users/${id}/toggle-status`),
};

// Reports API
export const reportsApi = {
  getDaily: (date?: string, userId?: number) => api.get<{ summary: DailyReport; timeLogs: TimeLog[] }>('/reports/daily', { params: { date, userId } }),
  getWeekly: (startDate?: string, userId?: number) => api.get('/reports/weekly', { params: { startDate, userId } }),
  getRange: (startDate: string, endDate: string, clientId?: number, categoryId?: number, userId?: number) =>
    api.get('/reports/range', { params: { startDate, endDate, clientId, categoryId, userId } }),
  getHaloExport: (startDate: string, endDate: string, userId?: number) =>
    api.get<{ export: HaloExportEntry[]; summary: any }>('/reports/halo-export', { params: { startDate, endDate, userId } }),
};

// Backup API
export const backupApi = {
  runBackup: () => api.post('/backup/run'),
  getHistory: () => api.get('/backup/history'),
  getStatus: () => api.get('/backup/status'),
};

// Export/Import API
export const exportApi = {
  exportData: () => api.get('/export/data'),
  exportClients: () => api.get('/export/clients'),
  exportCategories: () => api.get('/export/categories'),
  importData: (data: any, options?: { overwrite?: boolean; skipDuplicates?: boolean }) =>
    api.post('/export/import', { data, options }),
};

export default api;
