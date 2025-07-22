export interface User {
  id: number;
  name: string;
  email: string;
  role?: 'STANDARD' | 'POWER' | 'ADMIN';
  isActive?: boolean;
  lastLogin?: string | null;
  passwordChangedAt?: string | null;
  loginAttempts?: number;
  lockedUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    tasks: number;
    timeLogs: number;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Client {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  haloTicketId?: string;
  clientId?: number;
  categoryId?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  category?: Category;
  timeLogs?: TimeLog[];
  _count?: {
    timeLogs: number;
  };
}

export interface TimeLog {
  id: number;
  taskId: number;
  userId: number;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  task?: Task;
  user?: User;
}

export interface DailyReport {
  date: string;
  totalHours: number;
  totalMinutes: number;
  entriesCount: number;
  byCategory: Record<string, { minutes: number; hours: number; count: number }>;
  byClient: Record<string, { minutes: number; hours: number; count: number }>;
  byTask: Record<string, { minutes: number; hours: number; count: number; haloTicketId?: string }>;
}

export interface HaloExportEntry {
  ticket_id: string;
  task_title: string;
  client: string;
  category: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  duration_hours: number;
  description: string;
}

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TimerState {
  isRunning: boolean;
  activeTimeLog: TimeLog | null;
  elapsedTime: number;
  startTime: Date | null;
}