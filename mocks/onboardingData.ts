export type OnboardingStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type WorkflowStage = 'pre_boarding' | 'day_one' | 'week_one' | 'month_one' | 'ongoing' | 'completed';
export type DocumentStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'expired';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: string;
  stage: WorkflowStage;
  assignedTo: string;
  assignedToName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';
  dueDate: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  isRequired: boolean;
  order: number;
}

export interface OnboardingDocument {
  id: string;
  name: string;
  type: string;
  status: DocumentStatus;
  dueDate: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  fileUrl?: string;
  isRequired: boolean;
}

export interface OnboardingNote {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  isPrivate: boolean;
}

export interface WorkflowMilestone {
  id: string;
  name: string;
  stage: WorkflowStage;
  status: MilestoneStatus;
  dueDate: string;
  completedAt?: string;
  tasksTotal: number;
  tasksCompleted: number;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  department?: string;
  position?: string;
  tasks: Omit<OnboardingTask, 'id' | 'assignedTo' | 'assignedToName' | 'status' | 'dueDate'>[];
  documents: Omit<OnboardingDocument, 'id' | 'status' | 'dueDate'>[];
  milestones: Omit<WorkflowMilestone, 'id' | 'status' | 'dueDate' | 'tasksTotal' | 'tasksCompleted'>[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewHireOnboarding {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone?: string;
  position: string;
  department: string;
  facilityId: string;
  facilityName: string;
  hireDate: string;
  startDate: string;
  templateId: string;
  templateName: string;
  status: OnboardingStatus;
  progress: number;
  currentStage: WorkflowStage;
  supervisorId?: string;
  supervisorName?: string;
  buddyId?: string;
  buddyName?: string;
  employmentType: 'full_time' | 'part_time' | 'contractor' | 'intern';
  workLocation?: string;
  salary?: number;
  tasks: OnboardingTask[];
  documents: OnboardingDocument[];
  milestones: WorkflowMilestone[];
  notes: OnboardingNote[];
  orientationDate?: string;
  trainingStartDate?: string;
  probationEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const WORKFLOW_STAGES: Record<WorkflowStage, { label: string; order: number; color: string }> = {
  pre_boarding: { label: 'Pre-boarding', order: 1, color: '#8B5CF6' },
  day_one: { label: 'Day One', order: 2, color: '#3B82F6' },
  week_one: { label: 'Week One', order: 3, color: '#10B981' },
  month_one: { label: 'Month One', order: 4, color: '#F59E0B' },
  ongoing: { label: 'Ongoing', order: 5, color: '#6366F1' },
  completed: { label: 'Completed', order: 6, color: '#22C55E' },
};

export const DEFAULT_MILESTONES: Omit<WorkflowMilestone, 'id' | 'status' | 'dueDate' | 'tasksTotal' | 'tasksCompleted'>[] = [
  { name: 'Pre-boarding Complete', stage: 'pre_boarding' },
  { name: 'First Day Complete', stage: 'day_one' },
  { name: 'First Week Complete', stage: 'week_one' },
  { name: 'First Month Complete', stage: 'month_one' },
  { name: 'Onboarding Complete', stage: 'completed' },
];

export const DOCUMENT_TYPES = [
  { id: 'w4', name: 'W-4 Form', category: 'tax' },
  { id: 'i9', name: 'I-9 Form', category: 'compliance' },
  { id: 'direct_deposit', name: 'Direct Deposit Form', category: 'payroll' },
  { id: 'emergency_contact', name: 'Emergency Contact Form', category: 'hr' },
  { id: 'handbook_ack', name: 'Employee Handbook Acknowledgment', category: 'policy' },
  { id: 'nda', name: 'Non-Disclosure Agreement', category: 'legal' },
  { id: 'benefits_enrollment', name: 'Benefits Enrollment', category: 'benefits' },
];

export const DEPARTMENTS = [
  { id: 'dept-1', name: 'Engineering' },
  { id: 'dept-2', name: 'Operations' },
  { id: 'dept-3', name: 'Human Resources' },
  { id: 'dept-4', name: 'Finance' },
  { id: 'dept-5', name: 'Sales' },
  { id: 'dept-6', name: 'Marketing' },
];

export const FACILITIES = [
  { id: 'fac-1', name: 'Main Plant' },
  { id: 'fac-2', name: 'Distribution Center' },
  { id: 'fac-3', name: 'Corporate Office' },
];

export const SUPERVISORS = [
  { id: 'sup-1', name: 'Jane Doe', department: 'Engineering' },
  { id: 'sup-2', name: 'Robert Wilson', department: 'Operations' },
  { id: 'sup-3', name: 'Sarah Johnson', department: 'Human Resources' },
];

export const BUDDIES = [
  { id: 'buddy-1', name: 'Alex Chen', department: 'Engineering' },
  { id: 'buddy-2', name: 'Maria Garcia', department: 'Operations' },
  { id: 'buddy-3', name: 'James Brown', department: 'Finance' },
];

export const MOCK_ONBOARDING_TEMPLATES: OnboardingTemplate[] = [
  {
    id: 'template-1',
    name: 'Standard Employee Onboarding',
    description: 'Default onboarding template for full-time employees',
    isActive: true,
    isDefault: true,
    tasks: [
      { title: 'Complete W-4 form', description: 'Fill out federal tax withholding form', category: 'hr', stage: 'pre_boarding', isRequired: true, order: 1 },
      { title: 'Complete I-9 form', description: 'Employment eligibility verification', category: 'compliance', stage: 'pre_boarding', isRequired: true, order: 2 },
      { title: 'Set up direct deposit', description: 'Configure payroll direct deposit', category: 'payroll', stage: 'pre_boarding', isRequired: true, order: 3 },
      { title: 'Attend orientation', description: 'Company orientation session', category: 'training', stage: 'day_one', isRequired: true, order: 4 },
      { title: 'Meet with supervisor', description: 'Initial meeting with direct supervisor', category: 'manager', stage: 'day_one', isRequired: true, order: 5 },
      { title: 'Complete safety training', description: 'Mandatory safety training course', category: 'training', stage: 'week_one', isRequired: true, order: 6 },
      { title: 'Set up workstation', description: 'Configure computer and tools', category: 'it', stage: 'day_one', isRequired: true, order: 7 },
    ],
    documents: [
      { name: 'W-4 Form', type: 'w4', isRequired: true },
      { name: 'I-9 Form', type: 'i9', isRequired: true },
      { name: 'Direct Deposit Form', type: 'direct_deposit', isRequired: true },
      { name: 'Employee Handbook Acknowledgment', type: 'handbook_ack', isRequired: true },
    ],
    milestones: [
      { name: 'Pre-boarding Complete', stage: 'pre_boarding' },
      { name: 'First Day Complete', stage: 'day_one' },
      { name: 'First Week Complete', stage: 'week_one' },
    ],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'template-2',
    name: 'Contractor Onboarding',
    description: 'Streamlined onboarding for contractors',
    isActive: true,
    isDefault: false,
    tasks: [
      { title: 'Sign NDA', description: 'Sign non-disclosure agreement', category: 'legal', stage: 'pre_boarding', isRequired: true, order: 1 },
      { title: 'Set up access', description: 'Configure system access', category: 'it', stage: 'day_one', isRequired: true, order: 2 },
      { title: 'Project briefing', description: 'Initial project briefing', category: 'manager', stage: 'day_one', isRequired: true, order: 3 },
    ],
    documents: [
      { name: 'Non-Disclosure Agreement', type: 'nda', isRequired: true },
      { name: 'W-9 Form', type: 'w9', isRequired: true },
    ],
    milestones: [
      { name: 'Pre-boarding Complete', stage: 'pre_boarding' },
      { name: 'First Day Complete', stage: 'day_one' },
    ],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

export const MOCK_NEW_HIRE_ONBOARDINGS: NewHireOnboarding[] = [
  {
    id: 'onboard-1',
    employeeId: 'emp-201',
    employeeName: 'Alice Johnson',
    employeeEmail: 'alice.johnson@company.com',
    employeePhone: '555-0201',
    position: 'Software Engineer',
    department: 'Engineering',
    facilityId: 'fac-3',
    facilityName: 'Corporate Office',
    hireDate: '2024-02-15',
    startDate: '2024-02-15',
    templateId: 'template-1',
    templateName: 'Standard Employee Onboarding',
    status: 'in_progress',
    progress: 60,
    currentStage: 'week_one',
    supervisorId: 'sup-1',
    supervisorName: 'Jane Doe',
    buddyId: 'buddy-1',
    buddyName: 'Alex Chen',
    employmentType: 'full_time',
    workLocation: 'Hybrid',
    tasks: [],
    documents: [],
    milestones: [],
    notes: [],
    orientationDate: '2024-02-15',
    trainingStartDate: '2024-02-16',
    probationEndDate: '2024-05-15',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-20T14:00:00Z',
  },
  {
    id: 'onboard-2',
    employeeId: 'emp-202',
    employeeName: 'Bob Martinez',
    employeeEmail: 'bob.martinez@company.com',
    position: 'Operations Analyst',
    department: 'Operations',
    facilityId: 'fac-2',
    facilityName: 'Distribution Center',
    hireDate: '2024-03-01',
    startDate: '2024-03-01',
    templateId: 'template-1',
    templateName: 'Standard Employee Onboarding',
    status: 'not_started',
    progress: 0,
    currentStage: 'pre_boarding',
    supervisorId: 'sup-2',
    supervisorName: 'Robert Wilson',
    employmentType: 'full_time',
    workLocation: 'On-site',
    tasks: [],
    documents: [],
    milestones: [],
    notes: [],
    createdAt: '2024-02-15T10:00:00Z',
    updatedAt: '2024-02-15T10:00:00Z',
  },
];
