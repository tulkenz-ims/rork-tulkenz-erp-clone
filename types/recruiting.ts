export type JobStatus = 'draft' | 'open' | 'on_hold' | 'filled' | 'cancelled';
export type ApplicationStatus = 'new' | 'screening' | 'phone_screen' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
export type InterviewType = 'phone' | 'video' | 'in_person' | 'panel' | 'technical';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
export type JobType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern';
export type EmploymentType = 'exempt' | 'non_exempt';
export type RequisitionPriority = 'low' | 'medium' | 'high' | 'urgent';
export type CandidateSource = 'job_board' | 'referral' | 'career_site' | 'linkedin' | 'agency' | 'direct' | 'other';

export interface JobRequisition {
  id: string;
  jobTitle: string;
  department: string;
  location: string;
  jobType: JobType;
  employmentType: EmploymentType;
  openPositions: number;
  filledPositions: number;
  status: JobStatus;
  hiringManager: string;
  recruiter?: string;
  priority: RequisitionPriority;
  salaryMin?: number;
  salaryMax?: number;
  jobDescription: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  postedDate: string;
  targetStartDate?: string;
  closingDate?: string;
  isRemote: boolean;
  experienceYears: number;
  educationRequired: string;
  skillsRequired: string[];
  createdAt: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  currentTitle?: string;
  currentCompany?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  yearsOfExperience: number;
  education: CandidateEducation[];
  skills: string[];
  source: CandidateSource;
  referredBy?: string;
  desiredSalary?: number;
  availableStartDate?: string;
  isWillingToRelocate: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  rating?: number;
  notes?: string;
}

export interface CandidateEducation {
  degree: string;
  field: string;
  institution: string;
  graduationYear: number;
}

export interface Application {
  id: string;
  candidateId: string;
  jobRequisitionId: string;
  status: ApplicationStatus;
  appliedDate: string;
  currentStage: string;
  overallScore?: number;
  screeningScore?: number;
  interviewScore?: number;
  technicalScore?: number;
  cultureFitScore?: number;
  assignedRecruiter?: string;
  lastActivityDate: string;
  disqualificationReason?: string;
  withdrawalReason?: string;
  isStarred: boolean;
  rejectionEmailSent: boolean;
  sourceDetail?: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  jobRequisitionId: string;
  jobTitle: string;
  interviewType: InterviewType;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  location?: string;
  meetingLink?: string;
  interviewers: string[];
  status: InterviewStatus;
  feedback?: InterviewFeedback;
  notes?: string;
  createdAt: string;
}

export interface InterviewFeedback {
  overallRating: number;
  technicalRating?: number;
  communicationRating?: number;
  cultureFitRating?: number;
  strengths: string[];
  concerns: string[];
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  comments: string;
  submittedBy: string;
  submittedAt: string;
}

export interface JobOffer {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  jobRequisitionId: string;
  jobTitle: string;
  status: OfferStatus;
  salary: number;
  bonus?: number;
  startDate: string;
  expirationDate: string;
  benefits: string[];
  additionalTerms?: string;
  createdBy: string;
  createdAt: string;
  sentAt?: string;
  respondedAt?: string;
  declineReason?: string;
}
