export type RequisitionStatus = 'draft' | 'open' | 'on_hold' | 'filled' | 'cancelled';
export type CandidateStatus = 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
export type InterviewType = 'phone' | 'video' | 'in_person' | 'panel' | 'technical';

export interface JobRequisition {
  id: string;
  requisitionNumber: string;
  title: string;
  department: string;
  location: string;
  hiringManager: string;
  status: RequisitionStatus;
  positionType: 'full_time' | 'part_time' | 'temporary' | 'contractor';
  salaryMin?: number;
  salaryMax?: number;
  openDate: string;
  targetFillDate?: string;
  filledDate?: string;
  applicantCount: number;
  description?: string;
  requirements?: string[];
}

export interface Candidate {
  id: string;
  requisitionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source: string;
  status: CandidateStatus;
  appliedDate: string;
  currentStage: string;
  rating?: number;
  resumeUrl?: string;
  notes?: string;
}

export const REQUISITION_STATUS_COLORS: Record<RequisitionStatus, string> = {
  draft: '#6B7280',
  open: '#10B981',
  on_hold: '#F59E0B',
  filled: '#3B82F6',
  cancelled: '#EF4444',
};

export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  on_hold: 'On Hold',
  filled: 'Filled',
  cancelled: 'Cancelled',
};

export const CANDIDATE_STATUS_COLORS: Record<CandidateStatus, string> = {
  new: '#3B82F6',
  screening: '#8B5CF6',
  interview: '#F59E0B',
  offer: '#10B981',
  hired: '#059669',
  rejected: '#EF4444',
  withdrawn: '#6B7280',
};

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  new: 'New',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const CANDIDATE_SOURCES = [
  'Job Board',
  'Company Website',
  'Employee Referral',
  'LinkedIn',
  'Indeed',
  'Recruiter',
  'Career Fair',
  'Internal',
  'Other',
] as const;

export const MOCK_REQUISITIONS: JobRequisition[] = [];
export const MOCK_CANDIDATES: Candidate[] = [];
