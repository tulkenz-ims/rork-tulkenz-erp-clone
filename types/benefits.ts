export type BenefitPlanType = 'medical' | 'dental' | 'vision' | 'life' | 'disability' | 'fsa' | 'hsa' | '401k';
export type BenefitTier = 'employee' | 'employee_spouse' | 'employee_children' | 'family';
export type NetworkType = 'HMO' | 'PPO' | 'EPO' | 'HDHP';
export type EnrollmentStatus = 'active' | 'pending' | 'terminated' | 'waived';
export type OpenEnrollmentStatus = 'upcoming' | 'active' | 'closed' | 'completed';
export type QualifyingEventType = 'termination' | 'reduction_hours' | 'death' | 'divorce' | 'medicare' | 'dependent_aging_out';
export type COBRAStatus = 'pending' | 'elected' | 'declined' | 'active' | 'terminated' | 'expired';

export interface PrescriptionCopay {
  generic?: number;
  brandPreferred?: number;
  brandNonPreferred?: number;
  specialty?: number;
}

export interface BenefitCopay {
  primaryCare?: number;
  specialist?: number;
  urgentCare?: number;
  emergency?: number;
  prescription?: PrescriptionCopay;
}

export interface BenefitPlan {
  id: string;
  name: string;
  type: BenefitPlanType;
  carrier: string;
  planCode: string;
  tier: BenefitTier;
  employeeCost: number;
  employerCost: number;
  totalCost: number;
  coverage: string;
  deductible?: number;
  outOfPocketMax?: number;
  coinsurance?: number;
  copay?: BenefitCopay;
  features: string[];
  networkType?: NetworkType;
  isActive: boolean;
}

export interface EmployeePlanEnrollment {
  planId: string;
  planName: string;
  planType: string;
  tier: string;
  employeeCost: number;
  dependents: string[];
}

export interface LifeEvent {
  date: string;
  type: string;
  description: string;
}

export interface EmployeeEnrollment {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  enrollmentDate: string;
  effectiveDate: string;
  status: EnrollmentStatus;
  plans: EmployeePlanEnrollment[];
  totalMonthlyDeduction: number;
  annualElection: number;
  lifeEvents: LifeEvent[];
}

export interface OpenEnrollmentPeriod {
  id: string;
  year: number;
  name: string;
  startDate: string;
  endDate: string;
  effectiveDate: string;
  status: OpenEnrollmentStatus;
  eligibleEmployees: number;
  enrolled: number;
  pending: number;
  waived: number;
  changesAllowed: boolean;
  remindersSent: number;
}

export interface COBRAElectedPlan {
  planId: string;
  planName: string;
  planType: string;
  monthlyPremium: number;
}

export interface COBRAParticipant {
  id: string;
  formerEmployeeId: string;
  formerEmployeeName: string;
  qualifyingEvent: QualifyingEventType;
  qualifyingEventDate: string;
  notificationDate: string;
  electionDeadline: string;
  electedDate?: string;
  status: COBRAStatus | 'pending_election';
  coveredPlans: string[];
  monthlyPremium: number;
  totalMonthlyPremium: number;
  remainingMonths: number;
  electedPlans: COBRAElectedPlan[];
  coveredDependents: string[];
  paidThrough?: string;
  terminationDate?: string;
  terminationReason?: string;
}

export type BenefitsAlertType = 'enrollment' | 'cobra' | '401k' | 'compliance' | 'deadline' | 'payment';
export type BenefitsAlertPriority = 'high' | 'medium' | 'low';

export interface BenefitsAlert {
  id: string;
  type: BenefitsAlertType;
  priority: BenefitsAlertPriority;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  actionRequired: boolean;
}

export interface BenefitsSummary {
  totalEligible: number;
  totalEnrolled: number;
  totalWaived: number;
  participationRate: number;
  totalMonthlyPremiums: number;
  employerContribution: number;
  cobraParticipants: number;
  totalRetirementAssets: number;
  averageContributionRate: number;
}

export interface RetirementLoan {
  id: string;
  originalAmount: number;
  remainingBalance: number;
  monthlyPayment: number;
  startDate: string;
  endDate: string;
}

export interface RetirementAccount {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  accountType: '401k' | '401k_roth';
  totalBalance: number;
  contributionPercent: number;
  vestedPercent: number;
  ytdContributions: number;
  ytdEmployerMatch: number;
  isAutoEscalate: boolean;
  loans: RetirementLoan[];
}
