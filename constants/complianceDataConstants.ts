export type DisciplinaryType = 'verbal_warning' | 'written_warning' | 'final_warning' | 'suspension' | 'termination';
export type DisciplinaryStatus = 'active' | 'resolved' | 'appealed' | 'overturned' | 'archived';
export type DisciplinaryCategory = 'attendance' | 'performance' | 'conduct' | 'policy_violation' | 'safety' | 'other';

export interface DisciplinaryAction {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: DisciplinaryType;
  category: DisciplinaryCategory;
  description: string;
  correctiveAction: string;
  incidentDate: string;
  issuedDate: string;
  issuedBy: string;
  status: DisciplinaryStatus;
  employeeAcknowledged: boolean;
  acknowledgmentDate?: string;
  expirationDate?: string;
  followUpDate?: string;
  priorIncidents: number;
  employeeResponse?: string;
  witnesses?: string[];
  notes?: string;
  attachments?: string[];
}

export const DISCIPLINARY_TYPE_LABELS: Record<DisciplinaryType, string> = {
  verbal_warning: 'Verbal Warning',
  written_warning: 'Written Warning',
  final_warning: 'Final Warning',
  suspension: 'Suspension',
  termination: 'Termination',
};

export const DISCIPLINARY_TYPE_COLORS: Record<DisciplinaryType, string> = {
  verbal_warning: '#F59E0B',
  written_warning: '#F97316',
  final_warning: '#EF4444',
  suspension: '#DC2626',
  termination: '#7F1D1D',
};

export const DISCIPLINARY_CATEGORY_LABELS: Record<DisciplinaryCategory, string> = {
  attendance: 'Attendance',
  performance: 'Performance',
  conduct: 'Conduct',
  policy_violation: 'Policy Violation',
  safety: 'Safety',
  other: 'Other',
};

export const MOCK_DISCIPLINARY_ACTIONS: DisciplinaryAction[] = [
  {
    id: 'da-001',
    employeeId: 'emp-101',
    employeeName: 'John Smith',
    department: 'Production',
    type: 'written_warning',
    category: 'attendance',
    description: 'Excessive tardiness - 5 instances in the past 30 days',
    correctiveAction: 'Employee must arrive on time for all scheduled shifts. Any additional tardiness within the next 90 days may result in further disciplinary action.',
    incidentDate: '2024-01-10',
    issuedDate: '2024-01-12',
    issuedBy: 'Jane Manager',
    status: 'active',
    employeeAcknowledged: true,
    acknowledgmentDate: '2024-01-12',
    expirationDate: '2024-07-12',
    followUpDate: '2024-02-12',
    priorIncidents: 1,
    employeeResponse: 'I acknowledge the warning and will improve my attendance.',
  },
  {
    id: 'da-002',
    employeeId: 'emp-102',
    employeeName: 'Sarah Johnson',
    department: 'Quality',
    type: 'verbal_warning',
    category: 'performance',
    description: 'Failure to meet production quota for 2 consecutive weeks',
    correctiveAction: 'Employee to receive additional training and meet with supervisor weekly to review performance metrics.',
    incidentDate: '2024-01-08',
    issuedDate: '2024-01-09',
    issuedBy: 'Mike Supervisor',
    status: 'resolved',
    employeeAcknowledged: true,
    acknowledgmentDate: '2024-01-09',
    expirationDate: '2024-04-09',
    priorIncidents: 0,
  },
  {
    id: 'da-003',
    employeeId: 'emp-103',
    employeeName: 'Robert Chen',
    department: 'Maintenance',
    type: 'final_warning',
    category: 'safety',
    description: 'Failure to wear required PPE in designated area',
    correctiveAction: 'Immediate compliance with all safety protocols required. Any further violations will result in termination.',
    incidentDate: '2024-01-15',
    issuedDate: '2024-01-16',
    issuedBy: 'Safety Manager',
    status: 'active',
    employeeAcknowledged: false,
    priorIncidents: 2,
    witnesses: ['Tom Wilson', 'Lisa Park'],
  },
];

export type JobCategory = 'executive' | 'manager' | 'professional' | 'technician' | 'sales' | 'administrative' | 'craft' | 'operative' | 'laborer' | 'service';

export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  executive: 'Executive/Senior Officials',
  manager: 'First/Mid-Level Managers',
  professional: 'Professionals',
  technician: 'Technicians',
  sales: 'Sales Workers',
  administrative: 'Administrative Support',
  craft: 'Craft Workers',
  operative: 'Operatives',
  laborer: 'Laborers & Helpers',
  service: 'Service Workers',
};

export type EEOCReportType = 'eeo-1' | 'vets-4212' | 'aap';
export type EEOCReportStatus = 'draft' | 'pending-review' | 'submitted' | 'accepted' | 'rejected';

export interface EEOCReportSummary {
  totalHeadcount: number;
  diversityScore: number;
  veteranCount: number;
  disabilityCount: number;
  genderDiversity: {
    male: number;
    female: number;
    other: number;
    notDisclosed: number;
  };
  ethnicityDiversity: {
    white: number;
    black: number;
    asian: number;
    'native-american': number;
    'pacific-islander': number;
    'two-or-more': number;
    'not-disclosed': number;
  };
  ageDistribution: {
    under40: number;
    over40: number;
  };
}

export interface EEOCDepartmentData {
  department: string;
  totalCount: number;
  genderRatio: {
    male: number;
    female: number;
  };
  diversityIndex: number;
}

export interface EEOCJobCategoryData {
  category: JobCategory;
  totalCount: number;
  maleCount: number;
  femaleCount: number;
  hispanicCount: number;
  whiteCount: number;
  blackCount: number;
  asianCount: number;
}

export interface EEOCReport {
  id: string;
  reportType: EEOCReportType;
  reportingPeriod: string;
  status: EEOCReportStatus;
  dueDate: string;
  submittedDate?: string;
  totalEmployees: number;
  data: {
    summary: EEOCReportSummary;
    byDepartment: EEOCDepartmentData[];
    byJobCategory: EEOCJobCategoryData[];
  };
}

export const MOCK_EEOC_REPORTS: EEOCReport[] = [
  {
    id: 'eeoc-001',
    reportType: 'eeo-1',
    reportingPeriod: '2025',
    status: 'submitted',
    dueDate: '2025-03-31',
    submittedDate: '2025-03-15',
    totalEmployees: 245,
    data: {
      summary: {
        totalHeadcount: 245,
        diversityScore: 72,
        veteranCount: 18,
        disabilityCount: 12,
        genderDiversity: {
          male: 142,
          female: 98,
          other: 3,
          notDisclosed: 2,
        },
        ethnicityDiversity: {
          white: 128,
          black: 42,
          asian: 35,
          'native-american': 8,
          'pacific-islander': 5,
          'two-or-more': 18,
          'not-disclosed': 9,
        },
        ageDistribution: {
          under40: 156,
          over40: 89,
        },
      },
      byDepartment: [
        { department: 'Production', totalCount: 85, genderRatio: { male: 62, female: 23 }, diversityIndex: 0.68 },
        { department: 'Quality', totalCount: 32, genderRatio: { male: 18, female: 14 }, diversityIndex: 0.75 },
        { department: 'Maintenance', totalCount: 28, genderRatio: { male: 24, female: 4 }, diversityIndex: 0.58 },
        { department: 'Administration', totalCount: 45, genderRatio: { male: 15, female: 30 }, diversityIndex: 0.82 },
        { department: 'Warehouse', totalCount: 55, genderRatio: { male: 23, female: 32 }, diversityIndex: 0.71 },
      ],
      byJobCategory: [
        { category: 'executive', totalCount: 8, maleCount: 6, femaleCount: 2, hispanicCount: 1, whiteCount: 5, blackCount: 1, asianCount: 1 },
        { category: 'manager', totalCount: 22, maleCount: 14, femaleCount: 8, hispanicCount: 3, whiteCount: 12, blackCount: 4, asianCount: 3 },
        { category: 'professional', totalCount: 35, maleCount: 18, femaleCount: 17, hispanicCount: 5, whiteCount: 18, blackCount: 6, asianCount: 6 },
        { category: 'operative', totalCount: 120, maleCount: 78, femaleCount: 42, hispanicCount: 28, whiteCount: 52, blackCount: 22, asianCount: 18 },
        { category: 'laborer', totalCount: 60, maleCount: 26, femaleCount: 34, hispanicCount: 15, whiteCount: 25, blackCount: 12, asianCount: 8 },
      ],
    },
  },
  {
    id: 'eeoc-002',
    reportType: 'vets-4212',
    reportingPeriod: '2024',
    status: 'accepted',
    dueDate: '2024-09-30',
    submittedDate: '2024-09-20',
    totalEmployees: 238,
    data: {
      summary: {
        totalHeadcount: 238,
        diversityScore: 70,
        veteranCount: 16,
        disabilityCount: 10,
        genderDiversity: {
          male: 138,
          female: 95,
          other: 3,
          notDisclosed: 2,
        },
        ethnicityDiversity: {
          white: 125,
          black: 40,
          asian: 33,
          'native-american': 7,
          'pacific-islander': 5,
          'two-or-more': 17,
          'not-disclosed': 11,
        },
        ageDistribution: {
          under40: 148,
          over40: 90,
        },
      },
      byDepartment: [
        { department: 'Production', totalCount: 82, genderRatio: { male: 60, female: 22 }, diversityIndex: 0.66 },
        { department: 'Quality', totalCount: 30, genderRatio: { male: 17, female: 13 }, diversityIndex: 0.73 },
      ],
      byJobCategory: [
        { category: 'executive', totalCount: 7, maleCount: 5, femaleCount: 2, hispanicCount: 1, whiteCount: 4, blackCount: 1, asianCount: 1 },
        { category: 'operative', totalCount: 115, maleCount: 75, femaleCount: 40, hispanicCount: 26, whiteCount: 50, blackCount: 21, asianCount: 18 },
      ],
    },
  },
];

export type GrievanceType = 'workplace' | 'safety' | 'discrimination' | 'harassment' | 'compensation' | 'management' | 'policy' | 'other';
export type GrievanceStatus = 'submitted' | 'under-review' | 'investigation' | 'mediation' | 'resolved' | 'closed' | 'withdrawn';
export type GrievancePriority = 'low' | 'medium' | 'high' | 'critical';

export interface GrievanceTimeline {
  id: string;
  date: string;
  action: string;
  performedBy: string;
  notes?: string;
}

export interface Grievance {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: GrievanceType;
  priority: GrievancePriority;
  status: GrievanceStatus;
  description: string;
  desiredResolution: string;
  submittedDate: string;
  incidentDate: string;
  assignedTo?: string;
  assignedToName?: string;
  resolution?: string;
  resolutionDate?: string;
  anonymous: boolean;
  confidential: boolean;
  timeline: GrievanceTimeline[];
}

export const GRIEVANCE_TYPE_LABELS: Record<GrievanceType, string> = {
  workplace: 'Workplace Conditions',
  safety: 'Safety Concerns',
  discrimination: 'Discrimination',
  harassment: 'Harassment',
  compensation: 'Compensation',
  management: 'Management Issues',
  policy: 'Policy Dispute',
  other: 'Other',
};

export const GRIEVANCE_STATUS_LABELS: Record<GrievanceStatus, string> = {
  submitted: 'Submitted',
  'under-review': 'Under Review',
  investigation: 'Investigation',
  mediation: 'Mediation',
  resolved: 'Resolved',
  closed: 'Closed',
  withdrawn: 'Withdrawn',
};

export const GRIEVANCE_STATUS_COLORS: Record<GrievanceStatus, string> = {
  submitted: '#3B82F6',
  'under-review': '#F59E0B',
  investigation: '#8B5CF6',
  mediation: '#06B6D4',
  resolved: '#10B981',
  closed: '#6B7280',
  withdrawn: '#9CA3AF',
};

export const MOCK_GRIEVANCES: Grievance[] = [
  {
    id: 'GRV-001',
    employeeId: 'emp-105',
    employeeName: 'Maria Garcia',
    department: 'Production',
    type: 'workplace',
    priority: 'medium',
    status: 'under-review',
    description: 'Inadequate ventilation in the packaging area causing discomfort and potential health concerns during warm weather.',
    desiredResolution: 'Installation of additional cooling or ventilation systems in the packaging area.',
    submittedDate: '2024-01-18',
    incidentDate: '2024-01-15',
    assignedTo: 'hr-002',
    assignedToName: 'Jennifer HR',
    anonymous: false,
    confidential: false,
    timeline: [
      { id: 't1', date: '2024-01-18', action: 'Grievance submitted', performedBy: 'Maria Garcia' },
      { id: 't2', date: '2024-01-19', action: 'Assigned for review', performedBy: 'HR System', notes: 'Assigned to Jennifer HR' },
    ],
  },
  {
    id: 'GRV-002',
    employeeId: 'emp-anon',
    employeeName: 'Anonymous',
    department: 'Quality',
    type: 'management',
    priority: 'high',
    status: 'investigation',
    description: 'Supervisor consistently showing favoritism in shift assignments and overtime opportunities.',
    desiredResolution: 'Fair and transparent process for shift assignments and overtime distribution.',
    submittedDate: '2024-01-10',
    incidentDate: '2024-01-05',
    assignedTo: 'hr-001',
    assignedToName: 'HR Director',
    anonymous: true,
    confidential: true,
    timeline: [
      { id: 't1', date: '2024-01-10', action: 'Anonymous grievance submitted', performedBy: 'System' },
      { id: 't2', date: '2024-01-11', action: 'Escalated to HR Director', performedBy: 'HR System' },
      { id: 't3', date: '2024-01-12', action: 'Investigation initiated', performedBy: 'HR Director' },
    ],
  },
  {
    id: 'GRV-003',
    employeeId: 'emp-108',
    employeeName: 'David Williams',
    department: 'Maintenance',
    type: 'safety',
    priority: 'critical',
    status: 'resolved',
    description: 'Missing safety guards on machinery in maintenance workshop creating hazardous conditions.',
    desiredResolution: 'Immediate installation of proper safety guards on all machinery.',
    submittedDate: '2024-01-05',
    incidentDate: '2024-01-04',
    resolution: 'Safety guards installed on all affected machinery. Additional safety inspection conducted.',
    resolutionDate: '2024-01-08',
    anonymous: false,
    confidential: false,
    timeline: [
      { id: 't1', date: '2024-01-05', action: 'Grievance submitted', performedBy: 'David Williams' },
      { id: 't2', date: '2024-01-05', action: 'Marked as critical priority', performedBy: 'Safety Manager' },
      { id: 't3', date: '2024-01-06', action: 'Maintenance team dispatched', performedBy: 'Safety Manager' },
      { id: 't4', date: '2024-01-08', action: 'Resolution completed', performedBy: 'Safety Manager', notes: 'All guards installed and verified' },
    ],
  },
];

export type I9Status = 'pending' | 'section1-complete' | 'section2-complete' | 'verified' | 'reverification-needed' | 'expired';
export type EVerifyStatus = 'not-submitted' | 'pending' | 'employment-authorized' | 'tentative-nonconfirmation' | 'final-nonconfirmation' | 'case-closed';

export interface I9Document {
  id: string;
  listType: 'a' | 'b' | 'c';
  documentTitle: string;
  documentNumber: string;
  issuingAuthority: string;
  expirationDate?: string;
}

export interface I9Record {
  id: string;
  employeeId: string;
  employeeName: string;
  hireDate: string;
  i9Status: I9Status;
  everifyStatus: EVerifyStatus;
  everifyCaseNumber?: string;
  section1CompletedDate?: string;
  section2CompletedDate?: string;
  verificationDate?: string;
  reverificationDate?: string;
  documents: I9Document[];
  notes?: string;
}

export const I9_STATUS_LABELS: Record<I9Status, string> = {
  pending: 'Pending',
  'section1-complete': 'Section 1 Complete',
  'section2-complete': 'Section 2 Complete',
  verified: 'Verified',
  'reverification-needed': 'Reverification Needed',
  expired: 'Expired',
};

export const I9_STATUS_COLORS: Record<I9Status, string> = {
  pending: '#F59E0B',
  'section1-complete': '#3B82F6',
  'section2-complete': '#8B5CF6',
  verified: '#10B981',
  'reverification-needed': '#EF4444',
  expired: '#DC2626',
};

export const EVERIFY_STATUS_LABELS: Record<EVerifyStatus, string> = {
  'not-submitted': 'Not Submitted',
  pending: 'Pending',
  'employment-authorized': 'Employment Authorized',
  'tentative-nonconfirmation': 'TNC',
  'final-nonconfirmation': 'Final NC',
  'case-closed': 'Case Closed',
};

export const EVERIFY_STATUS_COLORS: Record<EVerifyStatus, string> = {
  'not-submitted': '#6B7280',
  pending: '#F59E0B',
  'employment-authorized': '#10B981',
  'tentative-nonconfirmation': '#EF4444',
  'final-nonconfirmation': '#DC2626',
  'case-closed': '#6B7280',
};

export const MOCK_I9_RECORDS: I9Record[] = [
  {
    id: 'i9-001',
    employeeId: 'emp-201',
    employeeName: 'Michael Brown',
    hireDate: '2024-01-15',
    i9Status: 'verified',
    everifyStatus: 'employment-authorized',
    everifyCaseNumber: 'EV-2024-001234',
    section1CompletedDate: '2024-01-15',
    section2CompletedDate: '2024-01-16',
    verificationDate: '2024-01-16',
    documents: [
      { id: 'd1', listType: 'a', documentTitle: 'U.S. Passport', documentNumber: '123456789', issuingAuthority: 'U.S. Department of State', expirationDate: '2029-05-15' },
    ],
  },
  {
    id: 'i9-002',
    employeeId: 'emp-202',
    employeeName: 'Emily Davis',
    hireDate: '2024-01-18',
    i9Status: 'section1-complete',
    everifyStatus: 'not-submitted',
    section1CompletedDate: '2024-01-18',
    documents: [],
    notes: 'Employee needs to provide List B and C documents.',
  },
  {
    id: 'i9-003',
    employeeId: 'emp-150',
    employeeName: 'Carlos Martinez',
    hireDate: '2022-06-01',
    i9Status: 'reverification-needed',
    everifyStatus: 'case-closed',
    everifyCaseNumber: 'EV-2022-005678',
    section1CompletedDate: '2022-06-01',
    section2CompletedDate: '2022-06-02',
    verificationDate: '2022-06-02',
    reverificationDate: '2024-06-01',
    documents: [
      { id: 'd1', listType: 'b', documentTitle: 'Driver License', documentNumber: 'DL12345678', issuingAuthority: 'State DMV', expirationDate: '2026-08-15' },
      { id: 'd2', listType: 'c', documentTitle: 'Employment Authorization Document', documentNumber: 'EAD98765', issuingAuthority: 'USCIS', expirationDate: '2024-06-01' },
    ],
    notes: 'EAD expiring soon - reverification required.',
  },
  {
    id: 'i9-004',
    employeeId: 'emp-203',
    employeeName: 'Jennifer Lee',
    hireDate: '2024-01-20',
    i9Status: 'pending',
    everifyStatus: 'not-submitted',
    documents: [],
  },
];

export type ExitInterviewStatus = 'pending' | 'scheduled' | 'completed' | 'declined' | 'no-show';
export type SeparationType = 'voluntary' | 'involuntary' | 'retirement' | 'layoff' | 'contract-end' | 'other';

export interface ExitInterviewResponses {
  jobSatisfaction: number;
  managementSatisfaction: number;
  workEnvironmentSatisfaction: number;
  compensationSatisfaction: number;
  benefitsSatisfaction: number;
  careerGrowthSatisfaction: number;
  workLifeBalanceSatisfaction: number;
  wouldRecommendCompany: boolean;
  wouldReturnToCompany: boolean;
  whatLikedMost: string;
  whatLikedLeast: string;
  improvementSuggestions: string;
  additionalComments?: string;
}

export interface ExitInterview {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  manager: string;
  separationType: SeparationType;
  lastWorkDay: string;
  interviewDate?: string;
  interviewerName?: string;
  status: ExitInterviewStatus;
  primaryReason?: string;
  overallSatisfaction?: number;
  wouldRecommend?: boolean;
  responses?: ExitInterviewResponses;
}

export const EXIT_INTERVIEW_STATUS_LABELS: Record<ExitInterviewStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  completed: 'Completed',
  declined: 'Declined',
  'no-show': 'No Show',
};

export const EXIT_INTERVIEW_STATUS_COLORS: Record<ExitInterviewStatus, string> = {
  pending: '#6B7280',
  scheduled: '#3B82F6',
  completed: '#10B981',
  declined: '#EF4444',
  'no-show': '#F59E0B',
};

export const SEPARATION_TYPE_LABELS: Record<SeparationType, string> = {
  voluntary: 'Voluntary Resignation',
  involuntary: 'Involuntary Termination',
  retirement: 'Retirement',
  layoff: 'Layoff',
  'contract-end': 'Contract End',
  other: 'Other',
};

export const MOCK_EXIT_INTERVIEWS: ExitInterview[] = [
  {
    id: 'exit-001',
    employeeId: 'emp-301',
    employeeName: 'Amanda Foster',
    department: 'Quality',
    position: 'Quality Technician',
    manager: 'Steve Quality Manager',
    separationType: 'voluntary',
    lastWorkDay: '2024-02-15',
    interviewDate: '2024-02-14',
    interviewerName: 'HR Specialist',
    status: 'completed',
    primaryReason: 'Career advancement opportunity',
    overallSatisfaction: 4,
    wouldRecommend: true,
    responses: {
      jobSatisfaction: 4,
      managementSatisfaction: 4,
      workEnvironmentSatisfaction: 3,
      compensationSatisfaction: 3,
      benefitsSatisfaction: 4,
      careerGrowthSatisfaction: 2,
      workLifeBalanceSatisfaction: 4,
      wouldRecommendCompany: true,
      wouldReturnToCompany: true,
      whatLikedMost: 'Great team atmosphere and supportive coworkers.',
      whatLikedLeast: 'Limited opportunities for advancement within the department.',
      improvementSuggestions: 'Create clearer career paths and more internal promotion opportunities.',
      additionalComments: 'Overall positive experience. Would consider returning if the right opportunity arose.',
    },
  },
  {
    id: 'exit-002',
    employeeId: 'emp-302',
    employeeName: 'Brian Thompson',
    department: 'Production',
    position: 'Production Supervisor',
    manager: 'Plant Manager',
    separationType: 'retirement',
    lastWorkDay: '2024-02-28',
    interviewDate: '2024-02-26',
    interviewerName: 'HR Director',
    status: 'scheduled',
  },
  {
    id: 'exit-003',
    employeeId: 'emp-303',
    employeeName: 'Kelly Morrison',
    department: 'Administration',
    position: 'Administrative Assistant',
    manager: 'Office Manager',
    separationType: 'voluntary',
    lastWorkDay: '2024-02-10',
    status: 'pending',
  },
  {
    id: 'exit-004',
    employeeId: 'emp-304',
    employeeName: 'James Wilson',
    department: 'Warehouse',
    position: 'Warehouse Associate',
    manager: 'Warehouse Supervisor',
    separationType: 'voluntary',
    lastWorkDay: '2024-01-31',
    interviewDate: '2024-01-30',
    interviewerName: 'HR Specialist',
    status: 'completed',
    primaryReason: 'Relocation',
    overallSatisfaction: 3,
    wouldRecommend: false,
    responses: {
      jobSatisfaction: 3,
      managementSatisfaction: 2,
      workEnvironmentSatisfaction: 3,
      compensationSatisfaction: 2,
      benefitsSatisfaction: 3,
      careerGrowthSatisfaction: 2,
      workLifeBalanceSatisfaction: 2,
      wouldRecommendCompany: false,
      wouldReturnToCompany: false,
      whatLikedMost: 'Good coworkers and stable work schedule.',
      whatLikedLeast: 'Management communication and low pay compared to industry standards.',
      improvementSuggestions: 'Improve communication from management and review compensation to be more competitive.',
    },
  },
];
