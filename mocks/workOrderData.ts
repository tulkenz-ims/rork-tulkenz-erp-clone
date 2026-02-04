export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderStatus = 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'overdue';

export const PRIORITY_COLORS: Record<WorkOrderPriority, string> = {
  low: '#10B981',
  medium: '#3B82F6',
  high: '#F59E0B',
  critical: '#EF4444',
};

export const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  open: '#3B82F6',
  in_progress: '#F59E0B',
  on_hold: '#6B7280',
  completed: '#10B981',
  cancelled: '#EF4444',
  overdue: '#DC2626',
};

export type LockType = 'electrical' | 'mechanical' | 'pneumatic' | 'hydraulic' | 'chemical' | 'thermal' | 'gravity';

export const LOCK_COLORS: Record<LockType, string> = {
  electrical: '#EF4444',
  mechanical: '#3B82F6',
  pneumatic: '#F59E0B',
  hydraulic: '#8B5CF6',
  chemical: '#10B981',
  thermal: '#F97316',
  gravity: '#6366F1',
};

export interface LOTOStep {
  id: string;
  order: number;
  lockType: LockType;
  location: string;
  description: string;
  isolationPoint: string;
  verificationMethod: string;
}

export const DEFAULT_LOTO_STEPS: LOTOStep[] = [
  {
    id: 'loto-1',
    order: 1,
    lockType: 'electrical',
    location: 'Main Panel',
    description: 'Disconnect main power supply',
    isolationPoint: 'Panel A - Breaker 15',
    verificationMethod: 'Test with multimeter',
  },
  {
    id: 'loto-2',
    order: 2,
    lockType: 'pneumatic',
    location: 'Air Supply',
    description: 'Close air supply valve',
    isolationPoint: 'Valve V-101',
    verificationMethod: 'Check pressure gauge reads zero',
  },
];

export type DepartmentType = 'maintenance' | 'production' | 'quality' | 'safety' | 'warehouse' | 'engineering';

export interface DepartmentWorkflow {
  id: string;
  department: DepartmentType;
  name: string;
  sections: string[];
  required: boolean;
  order: number;
}

export interface CompletedDocumentationSection {
  sectionId: string;
  sectionName: string;
  completedBy: string;
  completedAt: string;
  data: Record<string, unknown>;
  notes?: string;
}

export type PermitType = 'hot_work' | 'confined_space' | 'electrical' | 'excavation' | 'line_break' | 'roof_access';

export interface PermitSubmission {
  id: string;
  permitType: PermitType;
  workOrderId: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvedBy?: string;
  approvedAt?: string;
  expiresAt?: string;
  location: string;
  description: string;
  hazards: string[];
  precautions: string[];
}

export function generatePermitId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PRM-${timestamp}-${random}`;
}
