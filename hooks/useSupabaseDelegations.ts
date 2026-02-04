import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type {
  DelegationRule,
  DelegationAuditEntry,
  DelegationStats,
  DelegationType,
  DelegationStatus,
  WorkflowCategory,
  DelegationLimits,
  ProxyApprovalRecord,
  DelegationHistoryEntry,
} from '@/types/approvalWorkflows';
import { mockDelegationRules } from '@/mocks/workflowsData';

let localDelegations = [...mockDelegationRules];
let localAuditEntries: DelegationAuditEntry[] = [];
let localProxyApprovals: ProxyApprovalRecord[] = [
  {
    id: 'proxy-001',
    approvalId: 'apr-2024-001',
    approvalReference: 'PR-2024-0892',
    approvalType: 'purchase',
    originalApproverId: 'user-sw-001',
    originalApproverName: 'Sarah Williams',
    originalApproverRole: 'Finance Manager',
    proxyApproverId: 'user-jw-001',
    proxyApproverName: 'James Wilson',
    proxyApproverRole: 'Finance Director',
    delegationId: 'del-001',
    delegationType: 'specific',
    action: 'approved',
    actionAt: '2024-01-21T10:30:00Z',
    comments: 'Approved on behalf of Sarah Williams during conference attendance',
    amount: 4500,
  },
  {
    id: 'proxy-002',
    approvalId: 'apr-2024-002',
    approvalReference: 'PTO-2024-0156',
    approvalType: 'time_off',
    originalApproverId: 'user-sw-001',
    originalApproverName: 'Sarah Williams',
    originalApproverRole: 'Finance Manager',
    proxyApproverId: 'user-jw-001',
    proxyApproverName: 'James Wilson',
    proxyApproverRole: 'Finance Director',
    delegationId: 'del-001',
    delegationType: 'specific',
    action: 'approved',
    actionAt: '2024-01-22T14:15:00Z',
    comments: 'Time off request approved via delegation',
  },
  {
    id: 'proxy-003',
    approvalId: 'apr-2024-003',
    approvalReference: 'PR-2024-0901',
    approvalType: 'purchase',
    originalApproverId: 'user-so-001',
    originalApproverName: 'David Brown',
    originalApproverRole: 'Safety Officer',
    proxyApproverId: 'user-so-002',
    proxyApproverName: 'Jennifer Lee',
    proxyApproverRole: 'Safety Coordinator',
    delegationId: 'del-003',
    delegationType: 'full',
    action: 'rejected',
    actionAt: '2024-01-18T16:45:00Z',
    comments: 'Safety requirements not met - please revise',
    amount: 2800,
  },
  {
    id: 'proxy-004',
    approvalId: 'apr-2024-004',
    approvalReference: 'LOTO-2024-0078',
    approvalType: 'permit',
    originalApproverId: 'user-so-001',
    originalApproverName: 'David Brown',
    originalApproverRole: 'Safety Officer',
    proxyApproverId: 'user-so-002',
    proxyApproverName: 'Jennifer Lee',
    proxyApproverRole: 'Safety Coordinator',
    delegationId: 'del-003',
    delegationType: 'full',
    action: 'approved',
    actionAt: '2024-01-19T08:20:00Z',
    comments: 'LOTO permit approved - all safety checks verified',
  },
];
let localDelegationHistory: DelegationHistoryEntry[] = [
  {
    id: 'hist-del-001',
    delegationId: 'del-004',
    fromUserId: 'user-hr-001',
    fromUserName: 'Amanda Foster',
    fromUserRole: 'HR Manager',
    toUserId: 'user-hr-002',
    toUserName: 'Robert Kim',
    toUserRole: 'HR Coordinator',
    delegationType: 'temporary',
    startDate: '2024-01-10',
    endDate: '2024-01-12',
    actualEndDate: '2024-01-12',
    status: 'expired',
    reason: 'Medical appointment',
    approvalsProcessed: 3,
    totalApprovalAmount: 0,
    createdAt: '2024-01-09T16:00:00Z',
    endedAt: '2024-01-12T23:59:59Z',
  },
  {
    id: 'hist-del-002',
    delegationId: 'del-005',
    fromUserId: 'user-pm-001',
    fromUserName: 'Thomas Wright',
    fromUserRole: 'Plant Manager',
    toUserId: 'user-om-001',
    toUserName: 'Lisa Martinez',
    toUserRole: 'Operations Manager',
    delegationType: 'full',
    startDate: '2024-01-05',
    endDate: '2024-01-08',
    actualEndDate: '2024-01-06',
    status: 'revoked',
    reason: 'Vacation',
    revokeReason: 'Returned early from vacation',
    approvalsProcessed: 5,
    totalApprovalAmount: 15600,
    createdAt: '2024-01-03T09:00:00Z',
    endedAt: '2024-01-06T14:00:00Z',
  },
];

export interface EligibleApprover {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  canReceiveDelegation: boolean;
}

const mockEligibleApprovers: EligibleApprover[] = [
  { id: 'user-jw-001', name: 'James Wilson', email: 'james.wilson@company.com', role: 'Finance Director', canReceiveDelegation: true },
  { id: 'user-fd-001', name: 'Patricia Davis', email: 'patricia.davis@company.com', role: 'Finance Director', canReceiveDelegation: true },
  { id: 'user-so-002', name: 'Jennifer Lee', email: 'jennifer.lee@company.com', role: 'Safety Coordinator', canReceiveDelegation: true },
  { id: 'user-hr-002', name: 'Robert Kim', email: 'robert.kim@company.com', role: 'HR Coordinator', canReceiveDelegation: true },
  { id: 'user-om-001', name: 'Lisa Martinez', email: 'lisa.martinez@company.com', role: 'Operations Manager', canReceiveDelegation: true },
  { id: 'user-mm-001', name: 'Carlos Rodriguez', email: 'carlos.rodriguez@company.com', role: 'Maintenance Manager', canReceiveDelegation: true },
  { id: 'user-qa-001', name: 'Michelle Thompson', email: 'michelle.thompson@company.com', role: 'QA Manager', canReceiveDelegation: true },
  { id: 'user-pm-002', name: 'Brian Anderson', email: 'brian.anderson@company.com', role: 'Production Manager', canReceiveDelegation: true },
  { id: 'user-ac-001', name: 'Susan Clark', email: 'susan.clark@company.com', role: 'Accounting Manager', canReceiveDelegation: true },
  { id: 'user-it-001', name: 'Kevin Patel', email: 'kevin.patel@company.com', role: 'IT Manager', canReceiveDelegation: true },
];

function computeDelegationStatus(delegation: DelegationRule): DelegationStatus {
  if (delegation.revokedAt) return 'revoked';
  
  const now = new Date();
  const startDate = new Date(delegation.startDate);
  const endDate = new Date(delegation.endDate);
  endDate.setHours(23, 59, 59, 999);
  
  if (now < startDate) return 'scheduled';
  if (now > endDate) return 'expired';
  return 'active';
}

export function useDelegationsQuery(options?: {
  filters?: { 
    status?: DelegationStatus; 
    fromUserId?: string; 
    toUserId?: string;
    delegationType?: DelegationType;
  };
  enabled?: boolean;
}) {
  const enabled = options?.enabled;
  const filters = options?.filters;

  return useQuery({
    queryKey: ['delegations', filters],
    queryFn: async () => {
      console.log('[useDelegationsQuery] Fetching delegations with filters:', filters);
      
      let result = localDelegations.map(d => ({
        ...d,
        status: computeDelegationStatus(d),
        isActive: computeDelegationStatus(d) === 'active',
      }));

      if (filters?.status) {
        result = result.filter(d => d.status === filters.status);
      }
      if (filters?.fromUserId) {
        result = result.filter(d => d.fromUserId === filters.fromUserId);
      }
      if (filters?.toUserId) {
        result = result.filter(d => d.toUserId === filters.toUserId);
      }
      if (filters?.delegationType) {
        result = result.filter(d => d.delegationType === filters.delegationType);
      }

      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      console.log('[useDelegationsQuery] Fetched delegations:', result.length);
      return result;
    },
    enabled: enabled !== false,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDelegationById(id: string | undefined | null) {
  return useQuery({
    queryKey: ['delegations', 'byId', id],
    queryFn: async () => {
      if (!id) return null;
      const delegation = localDelegations.find(d => d.id === id);
      if (!delegation) return null;
      
      const result = {
        ...delegation,
        status: computeDelegationStatus(delegation),
        isActive: computeDelegationStatus(delegation) === 'active',
      };
      
      console.log('[useDelegationById] Fetched delegation:', result.id);
      return result;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useActiveDelegationsForUser(userId: string | undefined | null) {
  return useQuery({
    queryKey: ['delegations', 'activeForUser', userId],
    queryFn: async () => {
      if (!userId) return { delegatedFrom: [], delegatedTo: [] };
      
      const allWithStatus = localDelegations.map(d => ({
        ...d,
        status: computeDelegationStatus(d),
        isActive: computeDelegationStatus(d) === 'active',
      }));
      
      const delegatedFrom = allWithStatus.filter(d => d.fromUserId === userId && d.status === 'active');
      const delegatedTo = allWithStatus.filter(d => d.toUserId === userId && d.status === 'active');
      
      console.log('[useActiveDelegationsForUser] Found delegations for user:', userId, {
        delegatedFrom: delegatedFrom.length,
        delegatedTo: delegatedTo.length,
      });
      
      return { delegatedFrom, delegatedTo };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useEligibleDelegates(options?: {
  excludeUserId?: string;
  searchQuery?: string;
}) {
  const excludeUserId = options?.excludeUserId;
  const searchQuery = options?.searchQuery;

  return useQuery({
    queryKey: ['eligible_delegates', excludeUserId, searchQuery],
    queryFn: async () => {
      let result = [...mockEligibleApprovers];
      
      if (excludeUserId) {
        result = result.filter(a => a.id !== excludeUserId);
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(a =>
          a.name.toLowerCase().includes(query) ||
          a.email.toLowerCase().includes(query) ||
          a.role.toLowerCase().includes(query)
        );
      }
      
      result = result.filter(a => a.canReceiveDelegation);
      
      console.log('[useEligibleDelegates] Found eligible delegates:', result.length);
      return result;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useDelegationStats() {
  return useQuery({
    queryKey: ['delegation_stats'],
    queryFn: async (): Promise<DelegationStats> => {
      const allWithStatus = localDelegations.map(d => ({
        ...d,
        status: computeDelegationStatus(d),
      }));
      
      const totalDelegations = allWithStatus.length;
      const activeDelegations = allWithStatus.filter(d => d.status === 'active').length;
      const scheduledDelegations = allWithStatus.filter(d => d.status === 'scheduled').length;
      const expiredDelegations = allWithStatus.filter(d => d.status === 'expired').length;
      
      const delegatorCounts: Record<string, { userId: string; userName: string; count: number }> = {};
      const delegateCounts: Record<string, { userId: string; userName: string; count: number }> = {};
      
      allWithStatus.forEach(d => {
        if (!delegatorCounts[d.fromUserId]) {
          delegatorCounts[d.fromUserId] = { userId: d.fromUserId, userName: d.fromUserName, count: 0 };
        }
        delegatorCounts[d.fromUserId].count++;
        
        if (!delegateCounts[d.toUserId]) {
          delegateCounts[d.toUserId] = { userId: d.toUserId, userName: d.toUserName, count: 0 };
        }
        delegateCounts[d.toUserId].count++;
      });
      
      const mostFrequentDelegators = Object.values(delegatorCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
        
      const mostFrequentDelegates = Object.values(delegateCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      const approvalsViaDelegation = localAuditEntries.filter(e => e.action === 'approval_used').length;
      
      console.log('[useDelegationStats] Computed stats:', { totalDelegations, activeDelegations });
      
      return {
        totalDelegations,
        activeDelegations,
        scheduledDelegations,
        expiredDelegations,
        approvalsViaDelegation,
        mostFrequentDelegators,
        mostFrequentDelegates,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export interface CreateDelegationInput {
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
  reason?: string;
}

export function useCreateDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDelegationInput) => {
      const newDelegation: DelegationRule = {
        id: `del-${Date.now()}`,
        ...input,
        isActive: false,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        createdBy: input.fromUserName,
      };
      
      newDelegation.status = computeDelegationStatus(newDelegation);
      newDelegation.isActive = newDelegation.status === 'active';
      
      localDelegations.push(newDelegation);
      
      const auditEntry: DelegationAuditEntry = {
        id: `audit-${Date.now()}`,
        delegationId: newDelegation.id,
        action: 'created',
        actionBy: input.fromUserName,
        actionById: input.fromUserId,
        actionAt: new Date().toISOString(),
        details: `Delegation created from ${input.fromUserName} to ${input.toUserName}`,
      };
      localAuditEntries.push(auditEntry);
      
      console.log('[useCreateDelegation] Created delegation:', newDelegation.id);
      return newDelegation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegation_stats'] });
    },
  });
}

export interface UpdateDelegationInput {
  delegationType?: DelegationType;
  startDate?: string;
  endDate?: string;
  workflowIds?: string[];
  workflowCategories?: WorkflowCategory[];
  limits?: DelegationLimits;
  reason?: string;
}

export function useUpdateDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates, updatedBy }: { id: string; updates: UpdateDelegationInput; updatedBy: string }) => {
      const index = localDelegations.findIndex(d => d.id === id);
      if (index === -1) throw new Error('Delegation not found');
      
      localDelegations[index] = {
        ...localDelegations[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      localDelegations[index].status = computeDelegationStatus(localDelegations[index]);
      localDelegations[index].isActive = localDelegations[index].status === 'active';
      
      const auditEntry: DelegationAuditEntry = {
        id: `audit-${Date.now()}`,
        delegationId: id,
        action: 'modified',
        actionBy: updatedBy,
        actionById: localDelegations[index].fromUserId,
        actionAt: new Date().toISOString(),
        details: `Delegation updated: ${Object.keys(updates).join(', ')}`,
      };
      localAuditEntries.push(auditEntry);
      
      console.log('[useUpdateDelegation] Updated delegation:', id);
      return localDelegations[index];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegations', 'byId', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['delegation_stats'] });
    },
  });
}

export function useRevokeDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, revokedBy, revokeReason }: { id: string; revokedBy: string; revokeReason?: string }) => {
      const index = localDelegations.findIndex(d => d.id === id);
      if (index === -1) throw new Error('Delegation not found');
      
      localDelegations[index] = {
        ...localDelegations[index],
        isActive: false,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revokedBy,
        revokeReason,
      };
      
      const auditEntry: DelegationAuditEntry = {
        id: `audit-${Date.now()}`,
        delegationId: id,
        action: 'revoked',
        actionBy: revokedBy,
        actionById: localDelegations[index].fromUserId,
        actionAt: new Date().toISOString(),
        details: revokeReason ? `Revoked: ${revokeReason}` : 'Delegation revoked',
      };
      localAuditEntries.push(auditEntry);
      
      console.log('[useRevokeDelegation] Revoked delegation:', id);
      return localDelegations[index];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegations', 'byId', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['delegation_stats'] });
    },
  });
}

export function useDeleteDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const index = localDelegations.findIndex(d => d.id === id);
      if (index === -1) throw new Error('Delegation not found');
      
      localDelegations.splice(index, 1);
      localAuditEntries = localAuditEntries.filter(e => e.delegationId !== id);
      
      console.log('[useDeleteDelegation] Deleted delegation:', id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegation_stats'] });
    },
  });
}

export function useDelegationAuditTrail(delegationId: string | undefined | null) {
  return useQuery({
    queryKey: ['delegation_audit', delegationId],
    queryFn: async () => {
      if (!delegationId) return [];
      
      const entries = localAuditEntries
        .filter(e => e.delegationId === delegationId)
        .sort((a, b) => new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime());
      
      console.log('[useDelegationAuditTrail] Found entries:', entries.length);
      return entries;
    },
    enabled: !!delegationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProxyApprovalsQuery(options?: {
  filters?: {
    delegationId?: string;
    originalApproverId?: string;
    proxyApproverId?: string;
    approvalType?: WorkflowCategory;
    action?: 'approved' | 'rejected' | 'returned';
    dateFrom?: string;
    dateTo?: string;
  };
  enabled?: boolean;
}) {
  const enabled = options?.enabled;
  const filters = options?.filters;

  return useQuery({
    queryKey: ['proxy_approvals', filters],
    queryFn: async () => {
      console.log('[useProxyApprovalsQuery] Fetching with filters:', filters);
      
      let result = [...localProxyApprovals];

      if (filters?.delegationId) {
        result = result.filter(p => p.delegationId === filters.delegationId);
      }
      if (filters?.originalApproverId) {
        result = result.filter(p => p.originalApproverId === filters.originalApproverId);
      }
      if (filters?.proxyApproverId) {
        result = result.filter(p => p.proxyApproverId === filters.proxyApproverId);
      }
      if (filters?.approvalType) {
        result = result.filter(p => p.approvalType === filters.approvalType);
      }
      if (filters?.action) {
        result = result.filter(p => p.action === filters.action);
      }
      if (filters?.dateFrom) {
        const from = new Date(filters.dateFrom);
        result = result.filter(p => new Date(p.actionAt) >= from);
      }
      if (filters?.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        result = result.filter(p => new Date(p.actionAt) <= to);
      }

      result.sort((a, b) => new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime());
      console.log('[useProxyApprovalsQuery] Found records:', result.length);
      return result;
    },
    enabled: enabled !== false,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProxyApprovalsByDelegation(delegationId: string | undefined | null) {
  return useQuery({
    queryKey: ['proxy_approvals', 'byDelegation', delegationId],
    queryFn: async () => {
      if (!delegationId) return [];
      
      const approvals = localProxyApprovals
        .filter(p => p.delegationId === delegationId)
        .sort((a, b) => new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime());
      
      console.log('[useProxyApprovalsByDelegation] Found approvals:', approvals.length);
      return approvals;
    },
    enabled: !!delegationId,
    staleTime: 1000 * 60 * 5,
  });
}

export interface RecordProxyApprovalInput {
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
  comments?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}

export function useRecordProxyApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordProxyApprovalInput) => {
      const newRecord: ProxyApprovalRecord = {
        id: `proxy-${Date.now()}`,
        ...input,
        actionAt: new Date().toISOString(),
      };

      localProxyApprovals.push(newRecord);

      const auditEntry: DelegationAuditEntry = {
        id: `audit-${Date.now()}`,
        delegationId: input.delegationId,
        action: 'approval_used',
        actionBy: input.proxyApproverName,
        actionById: input.proxyApproverId,
        actionAt: newRecord.actionAt,
        details: `${input.action.charAt(0).toUpperCase() + input.action.slice(1)} ${input.approvalReference} on behalf of ${input.originalApproverName}`,
        approvalId: input.approvalId,
        approvalReference: input.approvalReference,
      };
      localAuditEntries.push(auditEntry);

      console.log('[useRecordProxyApproval] Recorded proxy approval:', newRecord.id);
      return newRecord;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proxy_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['delegation_audit', variables.delegationId] });
      queryClient.invalidateQueries({ queryKey: ['delegation_stats'] });
    },
  });
}

export function useDelegationHistoryQuery(options?: {
  filters?: {
    fromUserId?: string;
    toUserId?: string;
    status?: DelegationStatus;
    delegationType?: DelegationType;
    dateFrom?: string;
    dateTo?: string;
  };
  enabled?: boolean;
}) {
  const enabled = options?.enabled;
  const filters = options?.filters;

  return useQuery({
    queryKey: ['delegation_history', filters],
    queryFn: async () => {
      console.log('[useDelegationHistoryQuery] Fetching with filters:', filters);

      const completedDelegations = localDelegations
        .filter(d => d.status === 'expired' || d.status === 'revoked')
        .map(d => {
          const proxyApprovals = localProxyApprovals.filter(p => p.delegationId === d.id);
          const historyEntry: DelegationHistoryEntry = {
            id: `hist-${d.id}`,
            delegationId: d.id,
            fromUserId: d.fromUserId,
            fromUserName: d.fromUserName,
            fromUserRole: d.fromUserRole,
            toUserId: d.toUserId,
            toUserName: d.toUserName,
            toUserRole: d.toUserRole,
            delegationType: d.delegationType,
            startDate: d.startDate,
            endDate: d.endDate,
            actualEndDate: d.revokedAt ? d.revokedAt.split('T')[0] : d.endDate,
            status: d.status,
            reason: d.reason,
            revokeReason: d.revokeReason,
            approvalsProcessed: proxyApprovals.length,
            totalApprovalAmount: proxyApprovals.reduce((sum, p) => sum + (p.amount || 0), 0),
            createdAt: d.createdAt,
            endedAt: d.revokedAt || new Date(d.endDate + 'T23:59:59Z').toISOString(),
          };
          return historyEntry;
        });

      let result = [...localDelegationHistory, ...completedDelegations];
      
      const uniqueIds = new Set<string>();
      result = result.filter(entry => {
        if (uniqueIds.has(entry.delegationId)) return false;
        uniqueIds.add(entry.delegationId);
        return true;
      });

      if (filters?.fromUserId) {
        result = result.filter(h => h.fromUserId === filters.fromUserId);
      }
      if (filters?.toUserId) {
        result = result.filter(h => h.toUserId === filters.toUserId);
      }
      if (filters?.status) {
        result = result.filter(h => h.status === filters.status);
      }
      if (filters?.delegationType) {
        result = result.filter(h => h.delegationType === filters.delegationType);
      }
      if (filters?.dateFrom) {
        const from = new Date(filters.dateFrom);
        result = result.filter(h => new Date(h.createdAt) >= from);
      }
      if (filters?.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        result = result.filter(h => new Date(h.createdAt) <= to);
      }

      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      console.log('[useDelegationHistoryQuery] Found entries:', result.length);
      return result;
    },
    enabled: enabled !== false,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProxyApprovalStats() {
  return useQuery({
    queryKey: ['proxy_approval_stats'],
    queryFn: async () => {
      const total = localProxyApprovals.length;
      const approved = localProxyApprovals.filter(p => p.action === 'approved').length;
      const rejected = localProxyApprovals.filter(p => p.action === 'rejected').length;
      const returned = localProxyApprovals.filter(p => p.action === 'returned').length;
      const totalAmount = localProxyApprovals.reduce((sum, p) => sum + (p.amount || 0), 0);

      const byType: Record<string, number> = {};
      localProxyApprovals.forEach(p => {
        byType[p.approvalType] = (byType[p.approvalType] || 0) + 1;
      });

      const byProxy: Record<string, { name: string; count: number; amount: number }> = {};
      localProxyApprovals.forEach(p => {
        if (!byProxy[p.proxyApproverId]) {
          byProxy[p.proxyApproverId] = { name: p.proxyApproverName, count: 0, amount: 0 };
        }
        byProxy[p.proxyApproverId].count++;
        byProxy[p.proxyApproverId].amount += p.amount || 0;
      });

      console.log('[useProxyApprovalStats] Computed stats:', { total, approved, rejected });
      return {
        total,
        approved,
        rejected,
        returned,
        totalAmount,
        byType,
        topProxyApprovers: Object.entries(byProxy)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCheckDelegationConflicts() {
  return useMutation({
    mutationFn: async ({ 
      fromUserId, 
      startDate, 
      endDate, 
      excludeDelegationId 
    }: { 
      fromUserId: string; 
      startDate: string; 
      endDate: string;
      excludeDelegationId?: string;
    }) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const conflicts = localDelegations.filter(d => {
        if (d.id === excludeDelegationId) return false;
        if (d.fromUserId !== fromUserId) return false;
        if (d.status === 'revoked' || d.status === 'expired') return false;
        
        const dStart = new Date(d.startDate);
        const dEnd = new Date(d.endDate);
        
        return (start <= dEnd && end >= dStart);
      });
      
      console.log('[useCheckDelegationConflicts] Found conflicts:', conflicts.length);
      return conflicts;
    },
  });
}

export interface DelegationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ReDelegationCheckResult {
  canReceiveDelegation: boolean;
  hasActiveDelegation: boolean;
  existingDelegation?: DelegationRule;
  reason?: string;
}

const categoryLabels: Record<WorkflowCategory, string> = {
  purchase: 'Purchase Orders',
  time_off: 'Time Off',
  permit: 'Permits',
  expense: 'Expenses',
  contract: 'Contracts',
  custom: 'Custom',
};

export function useCheckReDelegation() {
  return useMutation({
    mutationFn: async (toUserId: string): Promise<ReDelegationCheckResult> => {
      const allWithStatus = localDelegations.map(d => ({
        ...d,
        status: computeDelegationStatus(d),
        isActive: computeDelegationStatus(d) === 'active',
      }));
      
      const activeDelegationToUser = allWithStatus.find(
        d => d.toUserId === toUserId && d.status === 'active'
      );
      
      if (activeDelegationToUser) {
        const delegationFromUser = allWithStatus.find(
          d => d.fromUserId === toUserId && d.status === 'active'
        );
        
        if (delegationFromUser && activeDelegationToUser.limits?.allowReDelegation === false) {
          console.log('[useCheckReDelegation] Re-delegation blocked for user:', toUserId);
          return {
            canReceiveDelegation: false,
            hasActiveDelegation: true,
            existingDelegation: activeDelegationToUser,
            reason: `${activeDelegationToUser.toUserName} already has an active delegation from ${activeDelegationToUser.fromUserName} that does not allow re-delegation`,
          };
        }
      }
      
      const userHasOutgoingDelegation = allWithStatus.find(
        d => d.fromUserId === toUserId && d.status === 'active'
      );
      
      if (userHasOutgoingDelegation) {
        console.log('[useCheckReDelegation] User has outgoing delegation:', toUserId);
        return {
          canReceiveDelegation: true,
          hasActiveDelegation: true,
          existingDelegation: userHasOutgoingDelegation,
          reason: `Warning: ${userHasOutgoingDelegation.fromUserName} currently has their own delegation active to ${userHasOutgoingDelegation.toUserName}`,
        };
      }
      
      console.log('[useCheckReDelegation] User can receive delegation:', toUserId);
      return {
        canReceiveDelegation: true,
        hasActiveDelegation: false,
      };
    },
  });
}

export function useValidateDelegationLimits() {
  return useMutation({
    mutationFn: async ({
      delegation,
      approvalAmount,
      approvalCategory,
      tierLevel,
    }: {
      delegation: DelegationRule;
      approvalAmount?: number;
      approvalCategory?: WorkflowCategory;
      tierLevel?: number;
    }): Promise<DelegationValidationResult> => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const limits = delegation.limits;
      
      if (!limits) {
        return { isValid: true, errors: [], warnings: [] };
      }
      
      if (limits.maxApprovalAmount && approvalAmount !== undefined) {
        if (approvalAmount > limits.maxApprovalAmount) {
          errors.push(`Amount ${approvalAmount.toLocaleString()} exceeds delegation limit of ${limits.maxApprovalAmount.toLocaleString()}`);
        } else if (approvalAmount > limits.maxApprovalAmount * 0.9) {
          warnings.push(`Amount is approaching the delegation limit of ${limits.maxApprovalAmount.toLocaleString()}`);
        }
      }
      
      if (limits.requireJustificationAbove && approvalAmount !== undefined) {
        if (approvalAmount > limits.requireJustificationAbove) {
          warnings.push(`Amounts over ${limits.requireJustificationAbove.toLocaleString()} require justification`);
        }
      }
      
      if (limits.excludeCategories && approvalCategory) {
        if (limits.excludeCategories.includes(approvalCategory)) {
          errors.push(`Category "${categoryLabels[approvalCategory]}" is excluded from this delegation`);
        }
      }
      
      if (limits.maxTierLevel && tierLevel !== undefined) {
        if (tierLevel > limits.maxTierLevel) {
          errors.push(`Tier ${tierLevel} exceeds the maximum allowed tier level (${limits.maxTierLevel})`);
        }
      }
      
      if (limits.excludeHighPriority) {
        warnings.push('High priority requests require direct approval from the original approver');
      }
      
      console.log('[useValidateDelegationLimits] Validation result:', { 
        isValid: errors.length === 0, 
        errors, 
        warnings 
      });
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    },
  });
}

export function useGetDelegationLimitsSummary() {
  return useCallback((delegation: DelegationRule | null | undefined): string[] => {
    if (!delegation?.limits) return [];
    
    const limits = delegation.limits;
    const summary: string[] = [];
    
    if (limits.maxApprovalAmount) {
      summary.push(`Max amount: ${limits.maxApprovalAmount.toLocaleString()}`);
    }
    if (limits.maxApprovalsPerDay) {
      summary.push(`Max ${limits.maxApprovalsPerDay} approvals/day`);
    }
    if (limits.maxTierLevel) {
      summary.push(`Max tier level: ${limits.maxTierLevel}`);
    }
    if (limits.excludeCategories && limits.excludeCategories.length > 0) {
      const excluded = limits.excludeCategories.map(c => categoryLabels[c]).join(', ');
      summary.push(`Excludes: ${excluded}`);
    }
    if (limits.excludeHighPriority) {
      summary.push('Excludes high priority');
    }
    if (limits.allowReDelegation === false) {
      summary.push('No re-delegation');
    }
    if (limits.restrictToSameDepartment) {
      summary.push('Same department only');
    }
    if (limits.requireJustificationAbove) {
      summary.push(`Justification required above ${limits.requireJustificationAbove.toLocaleString()}`);
    }
    
    return summary;
  }, []);
}

export function useResetDelegationData() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    localDelegations = [...mockDelegationRules];
    localAuditEntries = [];
    queryClient.invalidateQueries({ queryKey: ['delegations'] });
    queryClient.invalidateQueries({ queryKey: ['delegation_stats'] });
    queryClient.invalidateQueries({ queryKey: ['delegation_audit'] });
    console.log('[useResetDelegationData] Reset delegation data to defaults');
  }, [queryClient]);
}

export function useUserOOOStatus(userId: string | undefined | null) {
  return useQuery({
    queryKey: ['user_ooo_status', userId],
    queryFn: async () => {
      if (!userId) return { isOOO: false, activeDelegation: null };
      
      const allWithStatus = localDelegations.map(d => ({
        ...d,
        status: computeDelegationStatus(d),
        isActive: computeDelegationStatus(d) === 'active',
      }));
      
      const activeDelegation = allWithStatus.find(
        d => d.fromUserId === userId && d.status === 'active'
      );
      
      console.log('[useUserOOOStatus] User OOO status:', userId, { isOOO: !!activeDelegation });
      
      return {
        isOOO: !!activeDelegation,
        activeDelegation: activeDelegation || null,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useExpiringDelegations(userId: string | undefined | null, daysThreshold: number = 3) {
  return useQuery({
    queryKey: ['expiring_delegations', userId, daysThreshold],
    queryFn: async () => {
      if (!userId) return [];
      
      const now = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
      
      const allWithStatus = localDelegations.map(d => ({
        ...d,
        status: computeDelegationStatus(d),
        isActive: computeDelegationStatus(d) === 'active',
      }));
      
      const expiring = allWithStatus.filter(d => {
        if (d.fromUserId !== userId && d.toUserId !== userId) return false;
        if (d.status !== 'active') return false;
        
        const endDate = new Date(d.endDate);
        return endDate <= thresholdDate && endDate >= now;
      });
      
      console.log('[useExpiringDelegations] Found expiring delegations:', expiring.length);
      return expiring;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAutoExpireDelegations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const now = new Date();
      let expiredCount = 0;
      
      localDelegations.forEach((d, index) => {
        const currentStatus = computeDelegationStatus(d);
        if (currentStatus === 'expired' && d.status !== 'expired') {
          localDelegations[index] = {
            ...d,
            status: 'expired',
            isActive: false,
          };
          
          const auditEntry: DelegationAuditEntry = {
            id: `audit-${Date.now()}-${index}`,
            delegationId: d.id,
            action: 'expired',
            actionBy: 'System',
            actionById: 'system',
            actionAt: now.toISOString(),
            details: 'Delegation auto-expired based on end date',
          };
          localAuditEntries.push(auditEntry);
          expiredCount++;
        }
      });
      
      console.log('[useAutoExpireDelegations] Auto-expired delegations:', expiredCount);
      return { expiredCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegation_stats'] });
      queryClient.invalidateQueries({ queryKey: ['user_ooo_status'] });
    },
  });
}

export function useDelegatedApprovalsForUser(userId: string | undefined | null) {
  return useQuery({
    queryKey: ['delegated_approvals_for_user', userId],
    queryFn: async () => {
      if (!userId) return { canApproveFor: [], receivingFrom: [] };
      
      const allWithStatus = localDelegations.map(d => ({
        ...d,
        status: computeDelegationStatus(d),
        isActive: computeDelegationStatus(d) === 'active',
      }));
      
      const canApproveFor = allWithStatus.filter(
        d => d.toUserId === userId && d.status === 'active'
      );
      
      const receivingFrom = allWithStatus.filter(
        d => d.fromUserId === userId && d.status === 'active'
      );
      
      console.log('[useDelegatedApprovalsForUser] Delegated approvals:', {
        canApproveFor: canApproveFor.length,
        receivingFrom: receivingFrom.length,
      });
      
      return { canApproveFor, receivingFrom };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export const delegationTypeLabels: Record<DelegationType, string> = {
  full: 'Full Delegation',
  specific: 'Specific Workflows',
  temporary: 'Temporary',
};

export const delegationTypeDescriptions: Record<DelegationType, string> = {
  full: 'Delegate all approval authority',
  specific: 'Delegate only selected workflow types',
  temporary: 'Short-term delegation with auto-expiry',
};

export const delegationStatusLabels: Record<DelegationStatus, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  expired: 'Expired',
  revoked: 'Revoked',
};

export const delegationStatusColors: Record<DelegationStatus, string> = {
  active: '#10B981',
  scheduled: '#3B82F6',
  expired: '#6B7280',
  revoked: '#EF4444',
};
