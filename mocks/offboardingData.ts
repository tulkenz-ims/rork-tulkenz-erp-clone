export type OffboardingStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type SeparationType = 'resignation' | 'termination' | 'retirement' | 'layoff' | 'end_of_contract' | 'transfer';
export type OffboardingStage = 'notice' | 'documentation' | 'knowledge_transfer' | 'equipment_return' | 'exit_interview' | 'final_processing' | 'completed';
export type OffboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface OffboardingTask {
  id: string;
  title: string;
  description: string;
  category: string;
  stage: OffboardingStage;
  assignedTo: string;
  assignedToName: string;
  status: OffboardingTaskStatus;
  dueDate: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  isRequired: boolean;
  order: number;
}

export interface OffboardingMilestone {
  id: string;
  name: string;
  stage: OffboardingStage;
  status: MilestoneStatus;
  dueDate: string;
  completedAt?: string;
  tasksTotal: number;
  tasksCompleted: number;
}

export interface OffboardingNote {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  isPrivate: boolean;
}

export interface EquipmentItem {
  id: string;
  name: string;
  assetTag: string;
  serialNumber?: string;
  status: 'assigned' | 'returned' | 'pending_return' | 'lost';
  returnedAt?: string;
  returnedTo?: string;
  condition?: string;
  notes?: string;
}

export interface ExitInterview {
  id: string;
  scheduledDate: string;
  conductedBy: string;
  conductedByName: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  completedAt?: string;
  feedback?: string;
  rating?: number;
  reasonForLeaving?: string;
  wouldRecommend?: boolean;
  suggestions?: string;
}

export interface EmployeeOffboarding {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone?: string;
  employeeCode: string;
  position: string;
  department: string;
  facilityId: string;
  facilityName: string;
  hireDate: string;
  separationDate: string;
  lastWorkingDay: string;
  noticeDate: string;
  separationType: SeparationType;
  separationReason?: string;
  status: OffboardingStatus;
  progress: number;
  currentStage: OffboardingStage;
  supervisorId?: string;
  supervisorName?: string;
  hrContactId?: string;
  hrContactName?: string;
  tasks: OffboardingTask[];
  milestones: OffboardingMilestone[];
  notes: OffboardingNote[];
  equipment: EquipmentItem[];
  exitInterview?: ExitInterview;
  finalPayDate?: string;
  benefitsEndDate?: string;
  accessRevokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const OFFBOARDING_STAGES: Record<OffboardingStage, { label: string; order: number; color: string }> = {
  notice: { label: 'Notice Period', order: 1, color: '#3B82F6' },
  documentation: { label: 'Documentation', order: 2, color: '#8B5CF6' },
  knowledge_transfer: { label: 'Knowledge Transfer', order: 3, color: '#F59E0B' },
  equipment_return: { label: 'Equipment Return', order: 4, color: '#EF4444' },
  exit_interview: { label: 'Exit Interview', order: 5, color: '#10B981' },
  final_processing: { label: 'Final Processing', order: 6, color: '#6366F1' },
  completed: { label: 'Completed', order: 7, color: '#22C55E' },
};

export const SEPARATION_TYPE_CONFIG: Record<SeparationType, { label: string; color: string }> = {
  resignation: { label: 'Resignation', color: '#3B82F6' },
  termination: { label: 'Termination', color: '#EF4444' },
  retirement: { label: 'Retirement', color: '#10B981' },
  layoff: { label: 'Layoff', color: '#F59E0B' },
  end_of_contract: { label: 'End of Contract', color: '#8B5CF6' },
  transfer: { label: 'Transfer', color: '#6366F1' },
};

export const OFFBOARDING_STATUS_CONFIG: Record<OffboardingStatus, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: '#6B7280' },
  in_progress: { label: 'In Progress', color: '#3B82F6' },
  on_hold: { label: 'On Hold', color: '#F59E0B' },
  completed: { label: 'Completed', color: '#10B981' },
  cancelled: { label: 'Cancelled', color: '#EF4444' },
};

export const TASK_CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  hr: { label: 'HR', icon: 'users' },
  it: { label: 'IT', icon: 'monitor' },
  finance: { label: 'Finance', icon: 'dollar-sign' },
  facilities: { label: 'Facilities', icon: 'building' },
  security: { label: 'Security', icon: 'shield' },
  manager: { label: 'Manager', icon: 'briefcase' },
};

export const DEFAULT_OFFBOARDING_TASKS: Omit<OffboardingTask, 'id' | 'assignedTo' | 'assignedToName' | 'status' | 'dueDate'>[] = [
  { title: 'Submit resignation letter', description: 'Formal resignation letter on file', category: 'hr', stage: 'notice', isRequired: true, order: 1 },
  { title: 'Notify direct reports', description: 'Inform team members of departure', category: 'manager', stage: 'notice', isRequired: false, order: 2 },
  { title: 'Document current projects', description: 'Create handover documentation', category: 'manager', stage: 'knowledge_transfer', isRequired: true, order: 3 },
  { title: 'Return laptop', description: 'Return company laptop to IT', category: 'it', stage: 'equipment_return', isRequired: true, order: 4 },
  { title: 'Return access badges', description: 'Return all security badges', category: 'security', stage: 'equipment_return', isRequired: true, order: 5 },
  { title: 'Complete exit interview', description: 'Schedule and complete exit interview with HR', category: 'hr', stage: 'exit_interview', isRequired: true, order: 6 },
  { title: 'Process final paycheck', description: 'Calculate and process final payment', category: 'finance', stage: 'final_processing', isRequired: true, order: 7 },
];

export const DEFAULT_OFFBOARDING_MILESTONES: Omit<OffboardingMilestone, 'id' | 'status' | 'dueDate' | 'tasksTotal' | 'tasksCompleted'>[] = [
  { name: 'Notice Period Started', stage: 'notice' },
  { name: 'Documentation Complete', stage: 'documentation' },
  { name: 'Knowledge Transfer Complete', stage: 'knowledge_transfer' },
  { name: 'Equipment Returned', stage: 'equipment_return' },
  { name: 'Exit Interview Complete', stage: 'exit_interview' },
  { name: 'Final Processing Complete', stage: 'final_processing' },
];

export const DEPARTMENTS = [
  { id: 'dept-1', name: 'Engineering' },
  { id: 'dept-2', name: 'Operations' },
  { id: 'dept-3', name: 'Human Resources' },
  { id: 'dept-4', name: 'Finance' },
  { id: 'dept-5', name: 'Sales' },
];

export const FACILITIES = [
  { id: 'fac-1', name: 'Main Plant' },
  { id: 'fac-2', name: 'Distribution Center' },
  { id: 'fac-3', name: 'Corporate Office' },
];

export const HR_CONTACTS = [
  { id: 'hr-1', name: 'Sarah Johnson', email: 'sarah.johnson@company.com' },
  { id: 'hr-2', name: 'Michael Chen', email: 'michael.chen@company.com' },
];

export const MOCK_EMPLOYEE_OFFBOARDINGS: EmployeeOffboarding[] = [
  {
    id: 'offboard-1',
    employeeId: 'emp-101',
    employeeName: 'John Smith',
    employeeEmail: 'john.smith@company.com',
    employeePhone: '555-0101',
    employeeCode: 'EMP-101',
    position: 'Senior Engineer',
    department: 'Engineering',
    facilityId: 'fac-1',
    facilityName: 'Main Plant',
    hireDate: '2019-03-15',
    separationDate: '2024-02-28',
    lastWorkingDay: '2024-02-28',
    noticeDate: '2024-02-01',
    separationType: 'resignation',
    separationReason: 'Career advancement opportunity',
    status: 'in_progress',
    progress: 45,
    currentStage: 'knowledge_transfer',
    supervisorId: 'emp-50',
    supervisorName: 'Jane Doe',
    hrContactId: 'hr-1',
    hrContactName: 'Sarah Johnson',
    tasks: [],
    milestones: [],
    notes: [],
    equipment: [
      { id: 'equip-1', name: 'MacBook Pro 16"', assetTag: 'LAP-001', serialNumber: 'SN12345', status: 'assigned' },
      { id: 'equip-2', name: 'Security Badge', assetTag: 'BDG-101', status: 'assigned' },
    ],
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-10T14:00:00Z',
  },
  {
    id: 'offboard-2',
    employeeId: 'emp-102',
    employeeName: 'Emily Davis',
    employeeEmail: 'emily.davis@company.com',
    employeeCode: 'EMP-102',
    position: 'Operations Manager',
    department: 'Operations',
    facilityId: 'fac-2',
    facilityName: 'Distribution Center',
    hireDate: '2015-06-01',
    separationDate: '2024-03-31',
    lastWorkingDay: '2024-03-31',
    noticeDate: '2024-03-01',
    separationType: 'retirement',
    status: 'in_progress',
    progress: 20,
    currentStage: 'documentation',
    supervisorId: 'emp-25',
    supervisorName: 'Robert Wilson',
    hrContactId: 'hr-2',
    hrContactName: 'Michael Chen',
    tasks: [],
    milestones: [],
    notes: [],
    equipment: [],
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-05T11:00:00Z',
  },
];
