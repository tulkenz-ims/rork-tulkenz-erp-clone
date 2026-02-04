export type OnboardingTaskCategory = 
  | 'documents'
  | 'equipment'
  | 'training'
  | 'access'
  | 'orientation'
  | 'compliance';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

export type OnboardingNoteType = 'general' | 'status_change' | 'task_update' | 'document_update';

export interface OnboardingNote {
  id: string;
  onboardingId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  isPrivate: boolean;
  noteType: OnboardingNoteType;
}

export interface OnboardingStatusHistory {
  id: string;
  onboardingId: string;
  fromStatus: OnboardingStatus;
  toStatus: OnboardingStatus;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export type WorkflowStage = 
  | 'pre_boarding'
  | 'first_day'
  | 'first_week'
  | 'first_month'
  | 'probation_end';

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface WorkflowMilestone {
  id: string;
  name: string;
  description: string;
  stage: WorkflowStage;
  daysFromStart: number;
  isRequired: boolean;
  status: MilestoneStatus;
  completedAt?: string;
  completedBy?: string;
  order: number;
}

export interface WorkflowStageConfig {
  id: WorkflowStage;
  name: string;
  description: string;
  daysRange: [number, number];
  color: string;
  icon: string;
}

export type OnboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

export interface OnboardingTask {
  id: string;
  onboardingId: string;
  category: OnboardingTaskCategory;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  status: OnboardingTaskStatus;
  dueDate: string;
  completedAt?: string;
  completedBy?: string;
  order: number;
  isRequired: boolean;
  notes?: string;
  dependsOn?: string[];
}

export interface OnboardingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentCode: string;
  departmentName: string;
  position: string;
  hireDate: string;
  startDate: string;
  status: OnboardingStatus;
  currentStage: WorkflowStage;
  tasks: OnboardingTask[];
  milestones: WorkflowMilestone[];
  notes: OnboardingNote[];
  statusHistory: OnboardingStatusHistory[];
  completionPercent: number;
  buddy?: string;
  buddyName?: string;
  manager: string;
  managerName: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export const WORKFLOW_STAGES: WorkflowStageConfig[] = [
  {
    id: 'pre_boarding',
    name: 'Pre-Boarding',
    description: 'Before first day - paperwork and preparations',
    daysRange: [-14, -1],
    color: '#8B5CF6',
    icon: 'FileCheck',
  },
  {
    id: 'first_day',
    name: 'First Day',
    description: 'Day 1 - orientation and setup',
    daysRange: [0, 0],
    color: '#3B82F6',
    icon: 'Sunrise',
  },
  {
    id: 'first_week',
    name: 'First Week',
    description: 'Days 1-7 - initial training and integration',
    daysRange: [1, 7],
    color: '#10B981',
    icon: 'Calendar',
  },
  {
    id: 'first_month',
    name: 'First Month',
    description: 'Days 8-30 - role-specific training',
    daysRange: [8, 30],
    color: '#F59E0B',
    icon: 'Target',
  },
  {
    id: 'probation_end',
    name: 'Probation End',
    description: 'Days 31-90 - performance review',
    daysRange: [31, 90],
    color: '#EF4444',
    icon: 'Award',
  },
];
