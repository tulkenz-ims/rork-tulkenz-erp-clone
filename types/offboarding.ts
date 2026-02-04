export type SeparationType = 
  | 'resignation'
  | 'termination'
  | 'retirement'
  | 'layoff'
  | 'contract_end'
  | 'mutual_agreement'
  | 'death'
  | 'abandonment';

export type OffboardingStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'on_hold';

export type OffboardingTaskCategory = 
  | 'documentation'
  | 'equipment_return'
  | 'access_revocation'
  | 'knowledge_transfer'
  | 'exit_interview'
  | 'final_pay'
  | 'benefits'
  | 'compliance';

export type OffboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

export type OffboardingStage = 
  | 'notification'
  | 'transition'
  | 'final_week'
  | 'last_day'
  | 'post_departure';

export type OffboardingMilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'skipped';

export interface OffboardingStageConfig {
  id: OffboardingStage;
  name: string;
  description: string;
  daysRange: [number, number];
  color: string;
  icon: string;
}

export interface OffboardingTask {
  id: string;
  offboardingId: string;
  category: OffboardingTaskCategory;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  status: OffboardingTaskStatus;
  dueDate: string;
  completedAt?: string;
  completedBy?: string;
  order: number;
  isRequired: boolean;
  notes?: string;
  dependsOn?: string[];
}

export interface OffboardingMilestone {
  id: string;
  name: string;
  description: string;
  stage: OffboardingStage;
  daysFromEnd: number;
  isRequired: boolean;
  status: OffboardingMilestoneStatus;
  completedAt?: string;
  completedBy?: string;
  order: number;
}

export interface OffboardingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentCode: string;
  departmentName: string;
  position: string;
  hireDate: string;
  separationType: SeparationType;
  notificationDate: string;
  lastWorkingDay: string;
  status: OffboardingStatus;
  currentStage: OffboardingStage;
  tasks: OffboardingTask[];
  milestones: OffboardingMilestone[];
  completionPercent: number;
  manager: string;
  managerName: string;
  hrRepresentative?: string;
  hrRepresentativeName?: string;
  exitInterviewScheduled?: string;
  exitInterviewCompleted?: string;
  rehireEligible?: boolean;
  rehireNotes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export const OFFBOARDING_STAGES: OffboardingStageConfig[] = [
  {
    id: 'notification',
    name: 'Notification',
    description: 'Initial notice and documentation',
    daysRange: [-14, -8],
    color: '#EF4444',
    icon: 'Bell',
  },
  {
    id: 'transition',
    name: 'Transition',
    description: 'Knowledge transfer and handover',
    daysRange: [-7, -3],
    color: '#F59E0B',
    icon: 'ArrowRightLeft',
  },
  {
    id: 'final_week',
    name: 'Final Week',
    description: 'Wrapping up and final tasks',
    daysRange: [-2, -1],
    color: '#8B5CF6',
    icon: 'Calendar',
  },
  {
    id: 'last_day',
    name: 'Last Day',
    description: 'Final checkout and farewells',
    daysRange: [0, 0],
    color: '#3B82F6',
    icon: 'LogOut',
  },
  {
    id: 'post_departure',
    name: 'Post Departure',
    description: 'Final administrative tasks',
    daysRange: [1, 30],
    color: '#6B7280',
    icon: 'Archive',
  },
];
