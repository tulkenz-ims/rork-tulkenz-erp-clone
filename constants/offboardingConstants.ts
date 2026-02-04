export type OffboardingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TerminationType = 'voluntary' | 'involuntary' | 'retirement' | 'layoff' | 'contract_end' | 'death';

export interface OffboardingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  hireDate: string;
  lastDay: string;
  terminationType: TerminationType;
  reason?: string;
  status: OffboardingStatus;
  tasks: OffboardingTask[];
  exitInterviewScheduled: boolean;
  exitInterviewCompleted: boolean;
  finalPayProcessed: boolean;
  equipmentReturned: boolean;
  accessRevoked: boolean;
}

export interface OffboardingTask {
  id: string;
  name: string;
  assignedTo: string;
  dueDate: string;
  completedDate?: string;
  status: 'pending' | 'completed' | 'skipped';
  notes?: string;
}

export const TERMINATION_TYPE_LABELS: Record<TerminationType, string> = {
  voluntary: 'Voluntary Resignation',
  involuntary: 'Involuntary Termination',
  retirement: 'Retirement',
  layoff: 'Layoff',
  contract_end: 'Contract End',
  death: 'Death',
};

export const TERMINATION_TYPE_COLORS: Record<TerminationType, string> = {
  voluntary: '#3B82F6',
  involuntary: '#EF4444',
  retirement: '#10B981',
  layoff: '#F59E0B',
  contract_end: '#8B5CF6',
  death: '#6B7280',
};

export const OFFBOARDING_STATUS_COLORS: Record<OffboardingStatus, string> = {
  pending: '#F59E0B',
  in_progress: '#3B82F6',
  completed: '#10B981',
  cancelled: '#6B7280',
};

export const MOCK_OFFBOARDING_RECORDS: OffboardingRecord[] = [];
