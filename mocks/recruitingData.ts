export type RequisitionStatus = 'draft' | 'pending_approval' | 'approved' | 'open' | 'on_hold' | 'filled' | 'cancelled';
export type ApplicationStatus = 'new' | 'screening' | 'phone_screen' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type OfferStatus = 'draft' | 'pending_approval' | 'extended' | 'accepted' | 'declined' | 'expired' | 'rescinded';

export interface JobRequisition {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern';
  status: RequisitionStatus;
  hiringManagerId: string;
  hiringManagerName: string;
  recruiterId?: string;
  recruiterName?: string;
  minSalary?: number;
  maxSalary?: number;
  description: string;
  requirements: string[];
  preferredQualifications?: string[];
  openPositions: number;
  filledPositions: number;
  targetStartDate?: string;
  closingDate?: string;
  createdAt: string;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedInUrl?: string;
  resumeUrl?: string;
  currentCompany?: string;
  currentTitle?: string;
  yearsExperience?: number;
  skills: string[];
  source: 'job_board' | 'referral' | 'linkedin' | 'website' | 'agency' | 'other';
  referredBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  candidateId: string;
  candidateName: string;
  requisitionId: string;
  requisitionTitle: string;
  status: ApplicationStatus;
  stage: number;
  rating?: number;
  appliedDate: string;
  lastActivityDate: string;
  rejectionReason?: string;
  notes?: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  requisitionId: string;
  interviewerIds: string[];
  interviewerNames: string[];
  type: 'phone' | 'video' | 'onsite' | 'panel' | 'technical';
  status: InterviewStatus;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  location?: string;
  meetingLink?: string;
  feedback?: InterviewFeedback[];
  overallRating?: number;
  recommendation?: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  notes?: string;
  createdAt: string;
}

export interface InterviewFeedback {
  interviewerId: string;
  interviewerName: string;
  rating: number;
  strengths: string;
  concerns: string;
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  submittedAt: string;
}

export interface Offer {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  requisitionId: string;
  requisitionTitle: string;
  status: OfferStatus;
  salary: number;
  salaryType: 'annual' | 'hourly';
  bonus?: number;
  startDate: string;
  expirationDate: string;
  benefits?: string[];
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  createdAt: string;
}

export interface CandidateNote {
  id: string;
  candidateId: string;
  applicationId?: string;
  authorId: string;
  authorName: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
}
