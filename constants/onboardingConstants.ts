export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';

export interface OnboardingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  hireDate: string;
  startDate: string;
  manager: string;
  buddy?: string;
  status: OnboardingStatus;
  progress: number;
  tasks: OnboardingTask[];
  documentsCompleted: boolean;
  trainingCompleted: boolean;
  equipmentAssigned: boolean;
  accessProvisioned: boolean;
}

export interface OnboardingTask {
  id: string;
  name: string;
  description?: string;
  category: 'documentation' | 'training' | 'equipment' | 'access' | 'orientation' | 'other';
  assignedTo: string;
  dueDate: string;
  completedDate?: string;
  status: TaskStatus;
  isRequired: boolean;
  order: number;
  notes?: string;
}

export const ONBOARDING_STATUS_COLORS: Record<OnboardingStatus, string> = {
  pending: '#F59E0B',
  in_progress: '#3B82F6',
  completed: '#10B981',
  on_hold: '#8B5CF6',
  cancelled: '#6B7280',
};

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#6B7280',
  in_progress: '#3B82F6',
  completed: '#10B981',
  skipped: '#F59E0B',
  blocked: '#EF4444',
};

export const TASK_CATEGORY_LABELS = {
  documentation: 'Documentation',
  training: 'Training',
  equipment: 'Equipment',
  access: 'System Access',
  orientation: 'Orientation',
  other: 'Other',
} as const;

export const MOCK_ONBOARDING_RECORDS: OnboardingRecord[] = [];
