import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { usePendingWorkflowInstances, useWorkflowStats } from './useSupabaseWorkflows';

export type ApprovalType = 'purchase' | 'time_off' | 'overtime' | 'schedule_change' | 'permit' | 'shift_swap';
export type ApprovalUrgency = 'low' | 'medium' | 'high' | 'critical';

export interface AggregatedApproval {
  id: string;
  type: ApprovalType;
  category: string;
  title: string;
  description: string;
  amount?: number;
  requestedBy: string;
  requesterId: string;
  status: string;
  createdAt: string;
  urgency: ApprovalUrgency;
  source: 'workflow' | 'time_off' | 'purchase_request' | 'po_approval' | 'shift_swap';
  sourceId: string;
  metadata: Record<string, unknown>;
  currentStep?: number;
  totalSteps?: number;
}

export interface ApprovalCounts {
  purchase: number;
  timeOff: number;
  permits: number;
  total: number;
}

export function useAggregatedPurchaseApprovals() {
  const { organizationId } = useOrganization();
  const { data: workflowInstances } = usePendingWorkflowInstances();

  return useQuery({
    queryKey: ['aggregated_purchase_approvals', organizationId, workflowInstances],
    queryFn: async (): Promise<AggregatedApproval[]> => {
      if (!organizationId) return [];
      const results: AggregatedApproval[] = [];

      const workflowPurchase = (workflowInstances || [])
        .filter(i => i.category === 'purchase' || i.category === 'expense')
        .map((instance): AggregatedApproval => {
          const metadata = (instance.metadata || {}) as Record<string, unknown>;
          return {
            id: instance.id,
            type: 'purchase',
            category: instance.category,
            title: instance.reference_title || instance.template_name || 'Purchase Approval',
            description: (metadata.description as string) || (metadata.notes as string) || '',
            amount: typeof metadata.amount === 'number' ? metadata.amount : 
                   typeof metadata.total === 'number' ? metadata.total : undefined,
            requestedBy: instance.started_by || 'Unknown',
            requesterId: instance.started_by_id || '',
            status: instance.status,
            createdAt: instance.created_at,
            urgency: (metadata.urgency as ApprovalUrgency) || 'medium',
            source: 'workflow',
            sourceId: instance.id,
            metadata,
            currentStep: instance.current_step_order,
            totalSteps: (metadata.totalSteps as number) || 3,
          };
        });
      results.push(...workflowPurchase);

      const { data: purchaseRequests, error: prError } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      if (!prError && purchaseRequests) {
        const prApprovals = purchaseRequests.map((pr): AggregatedApproval => ({
          id: `pr-${pr.id}`,
          type: 'purchase',
          category: 'purchase_request',
          title: pr.request_number || 'Purchase Request',
          description: pr.notes || `${pr.line_items?.length || 0} items requested`,
          amount: pr.total_estimated,
          requestedBy: pr.requester_name || 'Unknown',
          requesterId: pr.requester_id || '',
          status: 'pending',
          createdAt: pr.created_at,
          urgency: pr.priority === 'urgent' ? 'high' : pr.priority === 'critical' ? 'critical' : 'medium',
          source: 'purchase_request',
          sourceId: pr.id,
          metadata: {
            requestNumber: pr.request_number,
            department: pr.department_name,
            neededBy: pr.needed_by_date,
            lineItems: pr.line_items,
          },
        }));
        results.push(...prApprovals);
      }

      const { data: poApprovals, error: poError } = await supabase
        .from('po_approvals')
        .select('*, procurement_purchase_orders(*)')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!poError && poApprovals) {
        const poItems = poApprovals.map((poa): AggregatedApproval => {
          const po = poa.procurement_purchase_orders as Record<string, unknown> | null;
          return {
            id: `poa-${poa.id}`,
            type: 'purchase',
            category: 'po_approval',
            title: (po?.po_number as string) || `PO Approval Tier ${poa.tier_level}`,
            description: `Tier ${poa.tier_level} approval for ${(po?.vendor_name as string) || 'vendor'}`,
            amount: (po?.total as number) || poa.amount_at_tier,
            requestedBy: (po?.created_by_name as string) || 'Unknown',
            requesterId: (po?.created_by_id as string) || '',
            status: 'pending',
            createdAt: poa.created_at,
            urgency: poa.tier_level >= 3 ? 'high' : 'medium',
            source: 'po_approval',
            sourceId: poa.id,
            metadata: {
              poId: poa.po_id,
              tierLevel: poa.tier_level,
              approverRole: poa.approver_role,
              vendorName: po?.vendor_name,
            },
            currentStep: poa.tier_level,
            totalSteps: 3,
          };
        });
        results.push(...poItems);
      }

      console.log('[useAggregatedPurchaseApprovals] Total purchase approvals:', results.length);
      return results;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAggregatedTimeApprovals() {
  const { organizationId } = useOrganization();
  const { data: workflowInstances } = usePendingWorkflowInstances();

  return useQuery({
    queryKey: ['aggregated_time_approvals', organizationId, workflowInstances],
    queryFn: async (): Promise<AggregatedApproval[]> => {
      if (!organizationId) return [];
      const results: AggregatedApproval[] = [];

      const workflowTimeOff = (workflowInstances || [])
        .filter(i => i.category === 'time_off')
        .map((instance): AggregatedApproval => {
          const metadata = (instance.metadata || {}) as Record<string, unknown>;
          return {
            id: instance.id,
            type: 'time_off',
            category: 'time_off',
            title: instance.reference_title || 'Time Off Request',
            description: (metadata.reason as string) || '',
            requestedBy: instance.started_by || 'Unknown',
            requesterId: instance.started_by_id || '',
            status: instance.status,
            createdAt: instance.created_at,
            urgency: (metadata.urgency as ApprovalUrgency) || 'medium',
            source: 'workflow',
            sourceId: instance.id,
            metadata: {
              ...metadata,
              startDate: metadata.start_date,
              endDate: metadata.end_date,
              totalDays: metadata.total_days,
              type: metadata.request_type,
            },
            currentStep: instance.current_step_order,
            totalSteps: 2,
          };
        });
      results.push(...workflowTimeOff);

      const { data: timeOffRequests, error: toError } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!toError && timeOffRequests) {
        const toApprovals = timeOffRequests.map((to): AggregatedApproval => ({
          id: `to-${to.id}`,
          type: 'time_off',
          category: 'time_off_request',
          title: `${to.type.charAt(0).toUpperCase() + to.type.slice(1)} Request`,
          description: to.reason || `${to.total_days} day(s) requested`,
          requestedBy: to.employee_name || 'Unknown',
          requesterId: to.employee_id || '',
          status: 'pending',
          createdAt: to.created_at,
          urgency: to.total_days >= 5 ? 'high' : 'medium',
          source: 'time_off',
          sourceId: to.id,
          metadata: {
            type: to.type,
            startDate: to.start_date,
            endDate: to.end_date,
            totalDays: to.total_days,
            reason: to.reason,
          },
        }));
        results.push(...toApprovals);
      }

      const { data: shiftSwaps, error: ssError } = await supabase
        .from('shift_swaps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'manager_pending')
        .order('created_at', { ascending: false });

      if (!ssError && shiftSwaps) {
        const ssApprovals = shiftSwaps.map((ss): AggregatedApproval => ({
          id: `ss-${ss.id}`,
          type: 'schedule_change',
          category: 'shift_swap',
          title: `Shift ${ss.swap_type === 'swap' ? 'Swap' : ss.swap_type === 'giveaway' ? 'Giveaway' : 'Pickup'}`,
          description: `${ss.requester_name} - ${ss.requester_date}`,
          requestedBy: ss.requester_name || 'Unknown',
          requesterId: ss.requester_id || '',
          status: 'pending',
          createdAt: ss.created_at,
          urgency: 'medium',
          source: 'shift_swap',
          sourceId: ss.id,
          metadata: {
            swapType: ss.swap_type,
            requesterDate: ss.requester_date,
            requesterStartTime: ss.requester_start_time,
            requesterEndTime: ss.requester_end_time,
            targetEmployeeName: ss.target_employee_name,
            targetDate: ss.target_date,
            reason: ss.reason,
          },
        }));
        results.push(...ssApprovals);
      }

      console.log('[useAggregatedTimeApprovals] Total time approvals:', results.length);
      return results;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAggregatedPermitApprovals() {
  const { organizationId } = useOrganization();
  const { data: workflowInstances } = usePendingWorkflowInstances();

  return useQuery({
    queryKey: ['aggregated_permit_approvals', organizationId, workflowInstances],
    queryFn: async (): Promise<AggregatedApproval[]> => {
      if (!organizationId) return [];

      const workflowPermits = (workflowInstances || [])
        .filter(i => i.category === 'permit')
        .map((instance): AggregatedApproval => {
          const metadata = (instance.metadata || {}) as Record<string, unknown>;
          return {
            id: instance.id,
            type: 'permit',
            category: 'permit',
            title: instance.reference_title || (metadata.permit_type as string) || 'Permit Request',
            description: (metadata.description as string) || '',
            requestedBy: instance.started_by || 'Unknown',
            requesterId: instance.started_by_id || '',
            status: instance.status,
            createdAt: instance.created_at,
            urgency: (metadata.urgency as ApprovalUrgency) || 'high',
            source: 'workflow',
            sourceId: instance.id,
            metadata: {
              ...metadata,
              location: metadata.location,
              equipment: metadata.equipment,
              workOrderNumber: metadata.work_order_number,
              permitType: metadata.permit_type,
            },
            currentStep: instance.current_step_order,
            totalSteps: 1,
          };
        });

      console.log('[useAggregatedPermitApprovals] Total permit approvals:', workflowPermits.length);
      return workflowPermits;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAllAggregatedApprovals() {
  const { data: purchaseApprovals, isLoading: purchaseLoading } = useAggregatedPurchaseApprovals();
  const { data: timeApprovals, isLoading: timeLoading } = useAggregatedTimeApprovals();
  const { data: permitApprovals, isLoading: permitLoading } = useAggregatedPermitApprovals();
  const { data: workflowStats } = useWorkflowStats();

  const isLoading = purchaseLoading || timeLoading || permitLoading;

  const counts: ApprovalCounts = {
    purchase: purchaseApprovals?.length || 0,
    timeOff: timeApprovals?.length || 0,
    permits: permitApprovals?.length || 0,
    total: (purchaseApprovals?.length || 0) + (timeApprovals?.length || 0) + (permitApprovals?.length || 0),
  };

  return {
    purchaseApprovals: purchaseApprovals || [],
    timeApprovals: timeApprovals || [],
    permitApprovals: permitApprovals || [],
    counts,
    isLoading,
    stats: workflowStats,
  };
}

export function useApprovalCounts() {
  const { counts, isLoading } = useAllAggregatedApprovals();
  return { counts, isLoading };
}
