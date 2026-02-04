export type GoalStatus = 'not-started' | 'on-track' | 'at-risk' | 'behind' | 'completed' | 'cancelled';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

export const GOAL_STATUS_COLORS: Record<GoalStatus, string> = {
  'not-started': '#6B7280',
  'on-track': '#10B981',
  'at-risk': '#F59E0B',
  'behind': '#EF4444',
  'completed': '#3B82F6',
  'cancelled': '#9CA3AF',
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  'not-started': 'Not Started',
  'on-track': 'On Track',
  'at-risk': 'At Risk',
  'behind': 'Behind',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
};

export const GOAL_PRIORITY_COLORS: Record<GoalPriority, string> = {
  low: '#10B981',
  medium: '#3B82F6',
  high: '#F59E0B',
  critical: '#EF4444',
};

export const GOAL_CATEGORIES = [
  'Professional Development',
  'Performance Improvement',
  'Leadership',
  'Technical Skills',
  'Communication',
  'Team Collaboration',
  'Customer Service',
  'Safety & Compliance',
  'Quality',
  'Productivity',
  'Innovation',
  'Other',
] as const;

export type GoalCategory = typeof GOAL_CATEGORIES[number];

export type ReviewStatus = 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  draft: '#6B7280',
  pending: '#F59E0B',
  in_progress: '#3B82F6',
  completed: '#10B981',
  cancelled: '#9CA3AF',
};

export interface Goal {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  category: GoalCategory;
  status: GoalStatus;
  priority: GoalPriority;
  progress: number;
  startDate: string;
  dueDate: string;
  completedDate?: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  reviewPeriod: string;
  status: ReviewStatus;
  overallRating?: number;
  createdAt: string;
  completedAt?: string;
}

export interface Feedback360 {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewers: string[];
  status: ReviewStatus;
  createdAt: string;
}

export interface SuccessionPlan {
  id: string;
  positionId: string;
  positionTitle: string;
  incumbentId: string;
  incumbentName: string;
  successors: Array<{
    employeeId: string;
    employeeName: string;
    readiness: 'ready_now' | 'ready_1_year' | 'ready_2_years' | 'developing';
  }>;
}

export interface TalentProfile {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  potentialRating: 'high' | 'medium' | 'low';
  performanceRating: 'exceeds' | 'meets' | 'below';
  flightRisk: 'high' | 'medium' | 'low';
  skills: string[];
}
