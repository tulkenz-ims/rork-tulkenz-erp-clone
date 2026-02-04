export type ReadinessLevel = 'ready-now' | 'ready-1-year' | 'ready-2-years' | 'developing' | 'not-ready';
export type SuccessionRisk = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type PositionCriticality = 'essential' | 'important' | 'standard' | 'optional';
export type BenchStrength = 'strong' | 'adequate' | 'weak' | 'none';
export type PoolCategory = 'high-potential' | 'emerging-leader' | 'technical-expert' | 'future-executive';

export interface SuccessionPlan {
  id: string;
  positionId: string;
  positionTitle: string;
  department: string;
  currentIncumbent: string;
  incumbentId: string;
  riskLevel: SuccessionRisk;
  successors: Successor[];
  lastReviewDate: string;
  nextReviewDate: string;
  notes?: string;
}

export interface Successor {
  id: string;
  employeeId: string;
  employeeName: string;
  currentPosition: string;
  readiness: ReadinessLevel;
  developmentPlan?: string;
  strengthAreas?: string[];
  developmentAreas?: string[];
  mentorId?: string;
  mentorName?: string;
}

export const READINESS_COLORS: Record<ReadinessLevel, string> = {
  'ready-now': '#10B981',
  'ready-1-year': '#3B82F6',
  'ready-2-years': '#8B5CF6',
  'developing': '#F59E0B',
  'not-ready': '#EF4444',
};

export const READINESS_LABELS: Record<ReadinessLevel, string> = {
  'ready-now': 'Ready Now',
  'ready-1-year': 'Ready 1 Year',
  'ready-2-years': 'Ready 2 Years',
  'developing': 'Developing',
  'not-ready': 'Not Ready',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

export const CRITICALITY_COLORS: Record<PositionCriticality, string> = {
  essential: '#DC2626',
  important: '#F59E0B',
  standard: '#3B82F6',
  optional: '#6B7280',
};

export const BENCH_STRENGTH_COLORS: Record<BenchStrength, string> = {
  strong: '#10B981',
  adequate: '#3B82F6',
  weak: '#F59E0B',
  none: '#EF4444',
};

export const POOL_CATEGORY_LABELS: Record<PoolCategory, string> = {
  'high-potential': 'High Potential',
  'emerging-leader': 'Emerging Leader',
  'technical-expert': 'Technical Expert',
  'future-executive': 'Future Executive',
};

export const POOL_CATEGORY_COLORS: Record<PoolCategory, string> = {
  'high-potential': '#8B5CF6',
  'emerging-leader': '#3B82F6',
  'technical-expert': '#10B981',
  'future-executive': '#F59E0B',
};

export const SUCCESSION_RISK_COLORS: Record<SuccessionRisk, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

export const SUCCESSION_RISK_LABELS: Record<SuccessionRisk, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical Risk',
};

export const MOCK_SUCCESSION_PLANS: SuccessionPlan[] = [];

export interface KeyPosition {
  id: string;
  title: string;
  department: string;
  departmentCode: string;
  level: string;
  incumbentId?: string;
  incumbentName?: string;
  incumbentTenure?: number;
  criticality: PositionCriticality;
  vacancyRisk: RiskLevel;
  retirementRisk: boolean;
  flightRisk: RiskLevel;
  successorCount: number;
  readyNowCount: number;
  benchStrength: BenchStrength;
  lastReviewed: string;
  nextReview: string;
}

export interface SuccessorCandidate {
  id: string;
  employeeId: string;
  employeeName: string;
  currentPosition: string;
  department: string;
  positionId: string;
  positionTitle: string;
  readiness: ReadinessLevel;
  performanceRating: number;
  potentialRating: number;
  yearsInRole: number;
  strengths: string[];
  developmentNeeds: string[];
  developmentPlan: { id: string; action: string; status: 'pending' | 'in_progress' | 'completed' }[];
  careerAspirations: string[];
  willingToRelocate: boolean;
  targetDate?: string;
  lastAssessment: string;
}

export interface TalentPoolMember {
  id: string;
  employeeId: string;
  employeeName: string;
  currentPosition: string;
  department: string;
  poolCategory: PoolCategory;
  performanceRating: number;
  potentialRating: number;
  readyForPromotion: boolean;
  flightRisk: RiskLevel;
  engagementScore: number;
  successorFor: string[];
  keyStrengths: string[];
  developmentFocus: string[];
  lastReviewDate: string;
  careerPath?: string;
}

export const MOCK_KEY_POSITIONS: KeyPosition[] = [];
export const MOCK_SUCCESSOR_CANDIDATES: SuccessorCandidate[] = [];
export const MOCK_TALENT_POOL: TalentPoolMember[] = [];
