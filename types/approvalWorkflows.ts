export type WorkflowCategory = 'purchase' | 'time_off' | 'permit' | 'expense' | 'contract' | 'custom';

export type ApprovalTierLevel = 1 | 2 | 3 | 4 | 5;

export type TierTriggerType = 'amount' | 'urgency' | 'category' | 'department' | 'vendor_type' | 'custom';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TierThreshold {
  id: string;
  triggerType: TierTriggerType;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in_list';
  value: string | number | string[];
  valueEnd?: number;
  label?: string;
}

export interface ApproverLimit {
  maxApprovalAmount?: number;
  minApprovalAmount?: number;
  maxApprovalsPerDay?: number;
  maxApprovalsPerMonth?: number;
  requiresJustificationAbove?: number;
  canApproveOwnRequests: boolean;
  canApproveDirectReports: boolean;
  canDelegateApproval: boolean;
}

export interface TierApprover {
  id: string;
  type: 'role' | 'user' | 'manager' | 'department_head' | 'executive';
  roleId?: string;
  roleName?: string;
  userId?: string;
  userName?: string;
  isRequired: boolean;
  order: number;
  limits?: ApproverLimit;
  backupApproverId?: string;
  backupApproverName?: string;
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

export interface ApprovalTier {
  id: string;
  name: string;
  description: string;
  level: ApprovalTierLevel;
  category: WorkflowCategory;
  isActive: boolean;
  thresholds: TierThreshold[];
  approvers: TierApprover[];
  requireAllApprovers: boolean;
  autoEscalateHours?: number;
  autoApproveOnTimeout: boolean;
  notifyOnEscalation: boolean;
  maxApprovalDays: number;
  color: string;
  icon?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TierConfiguration {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  isDefault: boolean;
  isActive: boolean;
  tiers: ApprovalTier[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TierStats {
  totalConfigurations: number;
  activeConfigurations: number;
  totalTiers: number;
  tiersByLevel: { level: ApprovalTierLevel; count: number }[];
  tiersByCategory: { category: WorkflowCategory; count: number }[];
  avgApprovalTime: { level: ApprovalTierLevel; hours: number }[];
}

export type WorkflowStepType = 'approval' | 'review' | 'notification' | 'condition' | 'parallel';

export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in_list';

export type EscalationAction = 'notify' | 'reassign' | 'auto_approve' | 'auto_reject';

export interface WorkflowCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string | number | string[];
  valueEnd?: number;
}

export interface WorkflowApprover {
  id: string;
  type: 'role' | 'user' | 'manager' | 'department_head' | 'dynamic';
  roleId?: string;
  roleName?: string;
  userId?: string;
  userName?: string;
  dynamicField?: string;
}

export interface EscalationRule {
  id: string;
  timeoutHours: number;
  action: EscalationAction;
  escalateTo?: WorkflowApprover;
  notifyUsers?: string[];
  reminderIntervalHours?: number;
}

export type DelegationType = 'full' | 'specific' | 'temporary';

export type DelegationStatus = 'active' | 'scheduled' | 'expired' | 'revoked';

export interface DelegationLimits {
  maxApprovalAmount?: number;
  maxApprovalsPerDay?: number;
  excludeCategories?: WorkflowCategory[];
  excludeHighPriority?: boolean;
  requireNotification?: boolean;
  maxTierLevel?: ApprovalTierLevel;
  allowReDelegation?: boolean;
  restrictToSameDepartment?: boolean;
  requireJustificationAbove?: number;
}

export interface DelegationRule {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail?: string;
  fromUserRole?: string;
  toUserId: string;
  toUserName: string;
  toUserEmail?: string;
  toUserRole?: string;
  delegationType: DelegationType;
  startDate: string;
  endDate: string;
  workflowIds?: string[];
  workflowCategories?: WorkflowCategory[];
  limits?: DelegationLimits;
  isActive: boolean;
  status: DelegationStatus;
  reason?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
}

export interface DelegationAuditEntry {
  id: string;
  delegationId: string;
  action: 'created' | 'activated' | 'expired' | 'revoked' | 'modified' | 'approval_used';
  actionBy: string;
  actionById: string;
  actionAt: string;
  details?: string;
  approvalId?: string;
  approvalReference?: string;
}

export interface ProxyApprovalRecord {
  id: string;
  approvalId: string;
  approvalReference: string;
  approvalType: WorkflowCategory;
  originalApproverId: string;
  originalApproverName: string;
  originalApproverRole?: string;
  proxyApproverId: string;
  proxyApproverName: string;
  proxyApproverRole?: string;
  delegationId: string;
  delegationType: DelegationType;
  action: 'approved' | 'rejected' | 'returned';
  actionAt: string;
  comments?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}

export interface DelegationHistoryEntry {
  id: string;
  delegationId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserRole?: string;
  toUserId: string;
  toUserName: string;
  toUserRole?: string;
  delegationType: DelegationType;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  status: DelegationStatus;
  reason?: string;
  revokeReason?: string;
  approvalsProcessed: number;
  totalApprovalAmount: number;
  createdAt: string;
  endedAt?: string;
}

export interface DelegationStats {
  totalDelegations: number;
  activeDelegations: number;
  scheduledDelegations: number;
  expiredDelegations: number;
  approvalsViaDelegation: number;
  mostFrequentDelegators: { userId: string; userName: string; count: number }[];
  mostFrequentDelegates: { userId: string; userName: string; count: number }[];
}

export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  type: WorkflowStepType;
  description?: string;
  approvers: WorkflowApprover[];
  requiredApprovals: number;
  conditions?: WorkflowCondition[];
  escalation?: EscalationRule;
  parallelSteps?: string[];
  skipConditions?: WorkflowCondition[];
  allowDelegation: boolean;
  allowReassign: boolean;
  timeoutDays?: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  usageCount: number;
  tags?: string[];
}

export type WorkflowInstanceStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'returned' | 'cancelled' | 'escalated';

export interface RejectionHistoryEntry {
  id: string;
  tierLevel: ApprovalTierLevel;
  rejectedBy: string;
  rejectedById: string;
  rejectedAt: string;
  reason: string;
  returnedToTier?: ApprovalTierLevel;
  returnedToRequestor: boolean;
  previousStatus: WorkflowInstanceStatus;
  stepId?: string;
  stepName?: string;
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  templateName: string;
  category: WorkflowCategory;
  referenceId: string;
  referenceType: string;
  referenceTitle: string;
  currentStepId: string;
  currentStepOrder: number;
  status: WorkflowInstanceStatus;
  startedAt: string;
  startedBy: string;
  startedByName?: string;
  completedAt?: string;
  stepHistory: WorkflowStepHistory[];
  metadata?: Record<string, unknown>;
  rejectionReason?: string;
  returnedFromTier?: ApprovalTierLevel;
  returnedAt?: string;
  returnedBy?: string;
  returnedByName?: string;
  rejectionHistory: RejectionHistoryEntry[];
}

export type WorkflowStepAction = 'approved' | 'rejected' | 'returned' | 'skipped' | 'escalated' | 'delegated' | 'reassigned' | 'resubmitted' | 'cancelled';

export interface WorkflowStepHistory {
  id: string;
  stepId: string;
  stepName: string;
  stepOrder: number;
  tierLevel?: ApprovalTierLevel;
  action: WorkflowStepAction;
  actionBy: string;
  actionById: string;
  actionAt: string;
  comments?: string;
  rejectionReason?: string;
  delegatedFrom?: string;
  escalatedFrom?: string;
  returnedToTier?: ApprovalTierLevel;
  isProxyApproval?: boolean;
  originalApproverId?: string;
  originalApproverName?: string;
  delegationId?: string;
}

export interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  pendingInstances: number;
  avgCompletionTimeHours: number;
  approvalRate: number;
  escalationRate: number;
  byCategory: {
    category: WorkflowCategory;
    count: number;
    pending: number;
  }[];
}

export const tierLevelLabels: Record<ApprovalTierLevel, string> = {
  1: 'Tier 1 - Basic',
  2: 'Tier 2 - Standard',
  3: 'Tier 3 - Elevated',
  4: 'Tier 4 - Executive',
  5: 'Tier 5 - Board Level',
};

export const tierLevelColors: Record<ApprovalTierLevel, string> = {
  1: '#10B981',
  2: '#3B82F6',
  3: '#F59E0B',
  4: '#EF4444',
  5: '#7C3AED',
};

export const triggerTypeLabels: Record<TierTriggerType, string> = {
  amount: 'Dollar Amount',
  urgency: 'Urgency Level',
  category: 'Category',
  department: 'Department',
  vendor_type: 'Vendor Type',
  custom: 'Custom Field',
};

export const urgencyLevelLabels: Record<UrgencyLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const urgencyLevelColors: Record<UrgencyLevel, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#7C3AED',
};

export const workflowCategoryLabels: Record<WorkflowCategory, string> = {
  purchase: 'Purchase Orders',
  time_off: 'Time Off Requests',
  permit: 'Permits',
  expense: 'Expense Reports',
  contract: 'Contracts',
  custom: 'Custom Workflows',
};

export const workflowCategoryColors: Record<WorkflowCategory, string> = {
  purchase: '#3B82F6',
  time_off: '#10B981',
  permit: '#F59E0B',
  expense: '#8B5CF6',
  contract: '#EC4899',
  custom: '#6B7280',
};

export type ApprovalTierConfig = 'none' | 'single' | 'double' | 'triple';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'partially_approved' | 'returned_to_requestor';

export interface TierEntry {
  tier: 1 | 2 | 3;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  approverRole: string;
  approverName?: string;
  approverId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  returnedToRequestor?: boolean;
}

export interface PurchaseApproval {
  id: string;
  type: 'purchase';
  title: string;
  description: string;
  amount: number;
  requisitionNumber: string;
  poNumber?: string;
  migoNumber?: string;
  requested_by: string;
  requesterId: string;
  department?: string;
  vendorName?: string;
  status: ApprovalStatus;
  approvalChain: TierEntry[];
  created_at: string;
  urgency?: UrgencyLevel;
}

export interface ManagerApproval {
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  managerName?: string;
  managerId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  returnedToRequestor?: boolean;
}

export interface HRApproval {
  required: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  hrAdminName?: string;
  hrAdminId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  returnedToRequestor?: boolean;
}

export interface TimeApproval {
  id: string;
  type: 'time_off' | 'overtime' | 'schedule_change';
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  hoursRequested?: number;
  requested_by: string;
  requesterId: string;
  status: ApprovalStatus;
  managerApproval: ManagerApproval;
  hrApproval?: HRApproval;
  created_at: string;
  urgency?: UrgencyLevel;
}

export interface PermitApproval {
  id: string;
  type: 'permit';
  title: string;
  description?: string;
  permitCode: string;
  permitTypeName: string;
  location: string;
  equipment?: string;
  workOrderNumber?: string;
  approverRole: string;
  status: ApprovalStatus;
  expiresAt?: string;
  rejectionReason?: string;
  approvedByName?: string;
  approvedById?: string;
  approvedAt?: string;
  requested_by: string;
  requesterId: string;
  created_at: string;
  urgency?: UrgencyLevel;
}
