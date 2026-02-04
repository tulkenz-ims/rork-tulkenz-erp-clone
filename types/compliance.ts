export type EEOCCategory = 'race' | 'ethnicity' | 'gender' | 'age' | 'disability' | 'veteran';
export type EEOCRace = 'white' | 'black' | 'asian' | 'native-american' | 'pacific-islander' | 'two-or-more' | 'not-disclosed';
export type EEOCEthnicity = 'hispanic' | 'non-hispanic' | 'not-disclosed';
export type EEOCGender = 'male' | 'female' | 'non-binary' | 'not-disclosed';
export type JobCategory = 'executive' | 'manager' | 'professional' | 'technician' | 'sales' | 'admin' | 'craft' | 'operative' | 'laborer' | 'service';

export type I9Status = 'pending' | 'section1-complete' | 'section2-complete' | 'verified' | 'reverification-needed' | 'expired';
export type EVerifyStatus = 'not-submitted' | 'pending' | 'case-created' | 'authorized' | 'tentative-nonconfirmation' | 'final-nonconfirmation' | 'closed';
export type DocumentTypeList = 'list-a' | 'list-b' | 'list-c';

export type DisciplinaryType = 'verbal-warning' | 'written-warning' | 'final-warning' | 'suspension' | 'termination' | 'performance-improvement';
export type DisciplinaryStatus = 'active' | 'resolved' | 'appealed' | 'overturned' | 'archived';
export type DisciplinaryCategory = 'attendance' | 'performance' | 'conduct' | 'policy-violation' | 'safety' | 'harassment' | 'insubordination' | 'other';

export type GrievanceType = 'formal' | 'informal' | 'union' | 'discrimination' | 'harassment' | 'retaliation' | 'safety' | 'other';
export type GrievanceStatus = 'submitted' | 'under-review' | 'investigation' | 'mediation' | 'resolved' | 'escalated' | 'closed' | 'withdrawn';
export type GrievancePriority = 'low' | 'medium' | 'high' | 'critical';

export type ExitInterviewStatus = 'scheduled' | 'completed' | 'declined' | 'no-show' | 'pending';
export type ComplianceSeparationType = 'voluntary' | 'involuntary' | 'retirement' | 'layoff' | 'contract-end' | 'mutual';

export type EEOCReportType = 'eeo-1' | 'vets-4212' | 'aap';
export type EEOCReportStatus = 'draft' | 'pending-review' | 'submitted' | 'accepted' | 'rejected';

export interface EEOCJobCategoryData {
  category: JobCategory;
  totalCount: number;
  maleCount: number;
  femaleCount: number;
  hispanicCount: number;
  whiteCount: number;
  blackCount: number;
  asianCount: number;
  nativeAmericanCount: number;
  pacificIslanderCount: number;
  twoOrMoreCount: number;
}

export interface EEOCDepartmentData {
  department: string;
  totalCount: number;
  diversityIndex: number;
  genderRatio: { male: number; female: number; other: number };
  ethnicityBreakdown: Record<EEOCRace, number>;
}

export interface EEOCSummary {
  totalHeadcount: number;
  genderDiversity: { male: number; female: number; other: number; notDisclosed: number };
  ethnicityDiversity: Record<EEOCRace, number>;
  ageDistribution: { under40: number; over40: number };
  veteranCount: number;
  disabilityCount: number;
  diversityScore: number;
}

export interface EEOCReportData {
  byJobCategory: EEOCJobCategoryData[];
  byDepartment: EEOCDepartmentData[];
  summary: EEOCSummary;
}

export interface EEOCReport {
  id: string;
  reportType: EEOCReportType;
  reportingPeriod: string;
  dueDate: string;
  submittedDate?: string;
  status: EEOCReportStatus;
  totalEmployees: number;
  data: EEOCReportData;
  lastUpdated: string;
}

export interface I9Record {
  id: string;
  employeeId: string;
  employeeName: string;
  hireDate: string;
  section1CompletedDate?: string;
  section2CompletedDate?: string;
  section3CompletedDate?: string;
  i9Status: I9Status;
  everifyStatus: EVerifyStatus;
  everifyCaseNumber?: string;
  documentType: DocumentTypeList;
  documentTitle?: string;
  documentNumber?: string;
  expirationDate?: string;
  reverificationDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisciplinaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentCode: string;
  departmentName: string;
  type: DisciplinaryType;
  category: DisciplinaryCategory;
  status: DisciplinaryStatus;
  incidentDate: string;
  reportedDate: string;
  description: string;
  witnesses?: string[];
  investigation?: string;
  outcome?: string;
  followUpDate?: string;
  issuedBy: string;
  issuedByName: string;
  acknowledgedAt?: string;
  appealedAt?: string;
  appealReason?: string;
  appealOutcome?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrievanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentCode: string;
  departmentName: string;
  type: GrievanceType;
  status: GrievanceStatus;
  priority: GrievancePriority;
  submittedDate: string;
  description: string;
  desiredResolution?: string;
  assignedTo?: string;
  assignedToName?: string;
  investigationNotes?: string;
  resolution?: string;
  resolvedDate?: string;
  resolvedBy?: string;
  escalatedTo?: string;
  escalatedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExitInterviewRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentCode: string;
  departmentName: string;
  position: string;
  separationType: ComplianceSeparationType;
  lastWorkingDay: string;
  interviewDate?: string;
  status: ExitInterviewStatus;
  conductedBy?: string;
  conductedByName?: string;
  overallSatisfaction?: number;
  wouldRecommend?: boolean;
  reasonForLeaving?: string;
  feedback?: string;
  suggestions?: string;
  rehireEligible?: boolean;
  rehireNotes?: string;
  createdAt: string;
  updatedAt: string;
}
