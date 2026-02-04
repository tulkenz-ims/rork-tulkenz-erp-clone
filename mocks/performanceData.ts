export type ReviewStatus = 'draft' | 'in_progress' | 'pending_review' | 'completed' | 'cancelled';
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  reviewPeriod: string;
  reviewType: 'annual' | 'mid_year' | 'quarterly' | 'probationary';
  status: ReviewStatus;
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  goals?: string[];
  comments?: string;
  employeeComments?: string;
  createdAt: string;
  completedAt?: string;
  nextReviewDate?: string;
}

export interface Goal {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  description: string;
  category: string;
  priority: GoalPriority;
  status: GoalStatus;
  progress: number;
  startDate: string;
  targetDate: string;
  completedDate?: string;
  metrics?: string;
  milestones?: GoalMilestone[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GoalMilestone {
  id: string;
  title: string;
  targetDate: string;
  completed: boolean;
  completedDate?: string;
}

export interface Feedback360 {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewCycleId: string;
  reviewCycleName: string;
  status: 'pending' | 'in_progress' | 'completed';
  selfAssessment?: FeedbackResponse;
  managerFeedback?: FeedbackResponse;
  peerFeedback: FeedbackResponse[];
  directReportFeedback: FeedbackResponse[];
  overallScore?: number;
  createdAt: string;
  completedAt?: string;
}

export interface FeedbackResponse {
  responderId: string;
  responderName: string;
  responderRole: 'self' | 'manager' | 'peer' | 'direct_report';
  ratings: { category: string; rating: number; comment?: string }[];
  overallRating: number;
  strengths: string;
  areasForImprovement: string;
  additionalComments?: string;
  submittedAt: string;
}

export interface SuccessionPlan {
  id: string;
  positionId: string;
  positionTitle: string;
  department: string;
  currentIncumbentId?: string;
  currentIncumbentName?: string;
  readyNowCandidates: SuccessionCandidate[];
  readyIn1To2Years: SuccessionCandidate[];
  readyIn3To5Years: SuccessionCandidate[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SuccessionCandidate {
  employeeId: string;
  employeeName: string;
  currentPosition: string;
  readinessLevel: 'ready_now' | '1_2_years' | '3_5_years';
  developmentNeeds: string[];
  strengthAreas: string[];
  overallAssessment?: string;
}

export interface TalentProfile {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  performanceRating: number;
  potentialRating: number;
  talentCategory: 'star' | 'high_performer' | 'solid_performer' | 'inconsistent' | 'low_performer';
  flightRisk: 'low' | 'medium' | 'high';
  careerAspirations?: string;
  developmentPlan?: string;
  keyStrengths: string[];
  developmentAreas: string[];
  certifications: string[];
  skills: string[];
  updatedAt: string;
}
