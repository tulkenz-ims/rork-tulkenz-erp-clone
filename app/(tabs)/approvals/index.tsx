import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Calendar,
  DollarSign,
  X,
  AlertTriangle,
  FileText,
  Hash,
  Briefcase,
  Users,
  Settings,
  ChevronRight,
  ShieldAlert,
  MapPin,
  Wrench,
  Timer,
  RefreshCw,
  GitBranch,
  Database,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useERP } from '@/contexts/ERPContext';
import {
  type ApprovalTierConfig,
  type TierEntry,
} from '@/types/approvalWorkflows';
import {
  type Approval,
  type PurchaseApproval,
  type TimeApproval,
  type PermitApproval,
} from '@/mocks/dashboardData';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import RequestorActionPanel from '@/components/RequestorActionPanel';
import {
  RejectedBadge,
  CardStatusIndicator,
} from '@/components/ApprovalStatusBadges';
import { useUser } from '@/contexts/UserContext';
import {
  usePendingWorkflowInstances,
  useWorkflowStats,
  useApproveWorkflowStep,
  useRejectWorkflowStep,
} from '@/hooks/useSupabaseWorkflows';
import {
  useAllAggregatedApprovals,
  type AggregatedApproval,
} from '@/hooks/useAggregatedApprovals';
import { useApproveTimeOff, useRejectTimeOff } from '@/hooks/useSupabaseTimeOff';
import { useProcessApprovalAndUpdateStatus } from '@/hooks/useSupabaseProcurement';
import { useManagerApproveSwap, useRejectShiftSwap } from '@/hooks/useSupabaseShiftSwaps';
import { useQueryClient } from '@tanstack/react-query';

type TabType = 'purchase' | 'time' | 'permits';
type FilterType = 'all' | 'pending' | 'approved' | 'rejected' | 'expired' | 'returned';

interface MappedApproval {
  id: string;
  type: 'purchase' | 'time_off' | 'overtime' | 'schedule_change' | 'permit';
  title: string;
  description: string;
  amount?: number;
  requested_by: string;
  requesterId: string;
  status: string;
  created_at: string;
  urgency: 'low' | 'medium' | 'high';
  category: string;
  templateName: string;
  currentStepOrder: number;
  referenceId: string;
  referenceType: string;
  metadata: Record<string, unknown>;
  instanceId: string;
  currentStepId: string | null;
  source?: string;
}

export default function ApprovalsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const currentUserId = user?.id || 'current-user';
  const queryClient = useQueryClient();
  
  const {
    approvals: mockApprovals,
    approvalSettings,
    approvePurchaseTier,
    rejectPurchaseTier,
    approveTimeManager,
    approveTimeHR,
    rejectTimeApproval,
    updateApprovalSettings,
    approvePermit,
    rejectPermit,
    resubmitPermit,
  } = useERP();

  const { data: pendingInstances, isLoading: isLoadingInstances, refetch: refetchInstances } = usePendingWorkflowInstances();
  const { data: workflowStats } = useWorkflowStats();
  const approveStepMutation = useApproveWorkflowStep();
  const rejectStepMutation = useRejectWorkflowStep();
  
  const {
    purchaseApprovals: aggregatedPurchase,
    timeApprovals: aggregatedTime,
    permitApprovals: aggregatedPermits,
    counts: aggregatedCounts,
    isLoading: isLoadingAggregated,
  } = useAllAggregatedApprovals();
  
  const approveTimeOffMutation = useApproveTimeOff();
  const rejectTimeOffMutation = useRejectTimeOff();
  const processApprovalMutation = useProcessApprovalAndUpdateStatus();
  const managerApproveSwapMutation = useManagerApproveSwap();
  const rejectShiftSwapMutation = useRejectShiftSwap();
  
  const isTimeOffMutating = approveTimeOffMutation.isPending || rejectTimeOffMutation.isPending;
  const isProcurementMutating = processApprovalMutation.isPending;
  const isShiftSwapMutating = managerApproveSwapMutation.isPending || rejectShiftSwapMutation.isPending;

  const [activeTab, setActiveTab] = useState<TabType>('purchase');
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectIsHR, setRejectIsHR] = useState(false);
  const [useSupabaseData, setUseSupabaseData] = useState(true);

  const mappedSupabaseApprovals = useMemo((): MappedApproval[] => {
    if (!pendingInstances || pendingInstances.length === 0) return [];
    
    return pendingInstances.map((instance): MappedApproval => {
      const metadata = (instance.metadata || {}) as Record<string, unknown>;
      const amount = typeof metadata.amount === 'number' ? metadata.amount : 
                     typeof metadata.total === 'number' ? metadata.total : undefined;
      
      let type: MappedApproval['type'] = 'purchase';
      if (instance.category === 'time_off') type = 'time_off';
      else if (instance.category === 'permit') type = 'permit';
      else if (instance.category === 'expense') type = 'purchase';
      
      return {
        id: instance.id,
        type,
        title: instance.reference_title || instance.template_name,
        description: (metadata.description as string) || (metadata.notes as string) || '',
        amount,
        requested_by: instance.started_by,
        requesterId: instance.started_by_id || '',
        status: instance.status,
        created_at: instance.created_at,
        urgency: (metadata.urgency as 'low' | 'medium' | 'high') || 'medium',
        category: instance.category,
        templateName: instance.template_name,
        currentStepOrder: instance.current_step_order,
        referenceId: instance.reference_id,
        referenceType: instance.reference_type,
        metadata,
        instanceId: instance.id,
        currentStepId: instance.current_step_id,
      };
    });
  }, [pendingInstances]);

  const mapAggregatedToMapped = useCallback((approval: AggregatedApproval): MappedApproval => ({
    id: approval.id,
    type: approval.type as MappedApproval['type'],
    title: approval.title,
    description: approval.description,
    amount: approval.amount,
    requested_by: approval.requestedBy,
    requesterId: approval.requesterId,
    status: approval.status,
    created_at: approval.createdAt,
    urgency: approval.urgency as 'low' | 'medium' | 'high',
    category: approval.category,
    templateName: approval.source === 'workflow' ? 'Workflow' : 
                  approval.source === 'po_approval' ? 'PO Approval' :
                  approval.source === 'purchase_request' ? 'Purchase Request' :
                  approval.source === 'time_off' ? 'Time Off' :
                  approval.source === 'shift_swap' ? 'Shift Swap' :
                  approval.category,
    currentStepOrder: approval.currentStep || 1,
    referenceId: approval.sourceId,
    referenceType: approval.source,
    metadata: approval.metadata,
    instanceId: approval.id,
    currentStepId: null,
    source: approval.source,
  }), []);

  const filterAggregatedApprovals = useCallback((approvals: AggregatedApproval[], filterType: FilterType): AggregatedApproval[] => {
    if (filterType === 'all') return approvals;
    if (filterType === 'pending') {
      return approvals.filter(a => a.status === 'pending' || a.status === 'in_progress');
    }
    if (filterType === 'approved') {
      return approvals.filter(a => a.status === 'approved' || a.status === 'completed');
    }
    if (filterType === 'rejected') {
      return approvals.filter(a => a.status === 'rejected');
    }
    if (filterType === 'returned') {
      return approvals.filter(a => a.status === 'returned_to_requestor' && a.requesterId === currentUserId);
    }
    return approvals;
  }, [currentUserId]);

  const filteredAggregatedPurchase = useMemo(() => 
    filterAggregatedApprovals(aggregatedPurchase, filter), 
    [aggregatedPurchase, filter, filterAggregatedApprovals]
  );

  const filteredAggregatedTime = useMemo(() => 
    filterAggregatedApprovals(aggregatedTime, filter), 
    [aggregatedTime, filter, filterAggregatedApprovals]
  );

  const filteredAggregatedPermits = useMemo(() => 
    filterAggregatedApprovals(aggregatedPermits, filter), 
    [aggregatedPermits, filter, filterAggregatedApprovals]
  );

  const approvals = mockApprovals;

  const purchaseApprovals = useMemo(() =>
    approvals.filter(a => a.type === 'purchase') as PurchaseApproval[],
  [approvals]);

  const timeApprovals = useMemo(() =>
    approvals.filter(a => a.type === 'time_off' || a.type === 'overtime') as TimeApproval[],
  [approvals]);

  const permitApprovals = useMemo(() =>
    approvals.filter(a => a.type === 'permit') as PermitApproval[],
  [approvals]);

  const isReturnedToMe = useCallback((approval: Approval) => {
    const isRequestor = (approval as PurchaseApproval).requestedBy === currentUserId || 
                        (approval as PermitApproval).requesterId === currentUserId;
    
    if (approval.type === 'purchase') {
      const pa = approval as PurchaseApproval;
      return isRequestor && (
        pa.status === 'rejected' && pa.approvalChain.some((t) => t.status === 'rejected')
      );
    } else if (approval.type === 'permit') {
      return isRequestor && approval.status === 'rejected';
    } else {
      const ta = approval as TimeApproval;
      return isRequestor && (
        ta.status === 'rejected' && (ta.managerApproval.status === 'rejected' || ta.hrApproval?.status === 'rejected')
      );
    }
  }, [currentUserId]);

  const filteredApprovals = useMemo(() => {
    const list = activeTab === 'purchase' ? purchaseApprovals : activeTab === 'time' ? timeApprovals : permitApprovals;
    if (filter === 'all') return list;
    if (filter === 'pending') return list.filter(a => a.status === 'pending' || a.status === 'partially_approved');
    if (filter === 'returned') {
      return list.filter(a => isReturnedToMe(a));
    }
    if (filter === 'expired') {
      return list.filter(a => {
        if (a.type !== 'permit') return false;
        const permit = a as PermitApproval;
        return permit.status === 'approved' && permit.expiresAt && new Date(permit.expiresAt) < new Date();
      });
    }
    return list.filter(a => a.status === filter);
  }, [activeTab, purchaseApprovals, timeApprovals, permitApprovals, filter, isReturnedToMe]);

  const pendingPurchaseCount = useSupabaseData 
    ? aggregatedCounts.purchase 
    : purchaseApprovals.filter(a => a.status === 'pending' || a.status === 'partially_approved').length;
  const pendingTimeCount = useSupabaseData 
    ? aggregatedCounts.timeOff 
    : timeApprovals.filter(a => a.status === 'pending' || a.status === 'partially_approved').length;
  const pendingPermitCount = useSupabaseData 
    ? aggregatedCounts.permits 
    : permitApprovals.filter(a => a.status === 'pending').length;

  const returnedToMeCount = useMemo(() => {
    const allApprovals = [...purchaseApprovals, ...timeApprovals, ...permitApprovals];
    return allApprovals.filter(a => isReturnedToMe(a)).length;
  }, [purchaseApprovals, timeApprovals, permitApprovals, isReturnedToMe]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[ApprovalsScreen] Refreshing all approval data...');
    try {
      await refetchInstances();
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
      queryClient.invalidateQueries({ queryKey: ['aggregated_purchase_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['aggregated_time_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['aggregated_permit_approvals'] });
      console.log('[ApprovalsScreen] Refresh completed');
    } catch (error) {
      console.log('[ApprovalsScreen] Refresh error:', error);
    } finally {
      setTimeout(() => setRefreshing(false), 300);
    }
  }, [refetchInstances, queryClient]);

  const handleApproveSupabaseStep = useCallback(async (approval: MappedApproval) => {
    Alert.alert(
      'Approve Request',
      `Are you sure you want to approve "${approval.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              const userName = user?.first_name ? `${user.first_name} ${user.last_name}` : 'Current User';
              
              if (approval.referenceType === 'time_off' || approval.source === 'time_off') {
                await approveTimeOffMutation.mutateAsync({
                  requestId: approval.referenceId,
                  managerId: currentUserId,
                  managerName: userName,
                });
                console.log('[ApprovalsScreen] Approved time off request:', approval.referenceId);
              } else if (approval.source === 'po_approval') {
                const approvalId = approval.referenceId.startsWith('poa-') 
                  ? approval.referenceId.slice(4) 
                  : approval.referenceId;
                await processApprovalMutation.mutateAsync({
                  approvalId,
                  decision: 'approved',
                  comments: `Approved by ${userName}`,
                });
                console.log('[ApprovalsScreen] Approved PO tier:', approvalId);
              } else if (approval.source === 'shift_swap') {
                const swapId = approval.referenceId.startsWith('ss-') 
                  ? approval.referenceId.slice(3) 
                  : approval.referenceId;
                await managerApproveSwapMutation.mutateAsync({
                  swapId,
                  managerId: currentUserId,
                  managerName: userName,
                });
                console.log('[ApprovalsScreen] Approved shift swap:', swapId);
              } else if (approval.source === 'purchase_request') {
                console.log('[ApprovalsScreen] Purchase request approval - needs workflow instance');
                Alert.alert('Info', 'Purchase requests require workflow approval configuration.');
                return;
              } else {
                await approveStepMutation.mutateAsync({
                  instanceId: approval.instanceId,
                  stepId: approval.currentStepId || 'step-1',
                  stepName: `Step ${approval.currentStepOrder}`,
                  stepOrder: approval.currentStepOrder,
                  actionById: currentUserId,
                  actionByName: userName,
                  isLastStep: approval.currentStepOrder >= 3,
                  nextStepId: undefined,
                });
                console.log('[ApprovalsScreen] Approved workflow step:', approval.instanceId);
              }
              
              queryClient.invalidateQueries({ queryKey: ['aggregated_purchase_approvals'] });
              queryClient.invalidateQueries({ queryKey: ['aggregated_time_approvals'] });
              queryClient.invalidateQueries({ queryKey: ['aggregated_permit_approvals'] });
            } catch (error) {
              console.error('[ApprovalsScreen] Error approving step:', error);
              Alert.alert('Error', 'Failed to approve request. Please try again.');
            }
          },
        },
      ]
    );
  }, [approveStepMutation, approveTimeOffMutation, processApprovalMutation, managerApproveSwapMutation, currentUserId, user, queryClient]);

  const handleRejectSupabaseStep = useCallback((approval: MappedApproval) => {
    setRejectingId(approval.instanceId);
    setRejectReason('');
    setRejectIsHR(false);
  }, []);

  const handleApprovePurchaseTier = useCallback((approval: PurchaseApproval, tier: 1 | 2 | 3) => {
    Alert.alert(
      'Approve Tier ' + tier,
      `Are you sure you want to approve tier ${tier} for "${approval.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            approvePurchaseTier(approval.id, tier, 'Current User', 'user-1');
          },
        },
      ]
    );
  }, [approvePurchaseTier]);

  const handleRejectPurchaseTier = useCallback((approval: PurchaseApproval, tier: 1 | 2 | 3) => {
    setRejectingId(approval.id);
    setRejectReason('');
    setRejectIsHR(false);
  }, []);

  const handleApproveTimeManager = useCallback((approval: TimeApproval) => {
    Alert.alert(
      'Manager Approval',
      `Approve "${approval.title}" as direct manager?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            approveTimeManager(approval.id, 'Current User', 'user-1');
          },
        },
      ]
    );
  }, [approveTimeManager]);

  const handleApproveTimeHR = useCallback((approval: TimeApproval) => {
    Alert.alert(
      'HR Approval',
      `Approve "${approval.title}" as HR Admin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            approveTimeHR(approval.id, 'HR Admin', 'hr-1');
          },
        },
      ]
    );
  }, [approveTimeHR]);

  const handleRejectTime = useCallback((approval: TimeApproval, isHR: boolean) => {
    setRejectingId(approval.id);
    setRejectReason('');
    setRejectIsHR(isHR);
  }, []);

  const handleApprovePermit = useCallback((approval: PermitApproval) => {
    Alert.alert(
      'Approve Permit',
      `Approve "${approval.permitTypeName}" for ${approval.requested_by}?\n\nLocation: ${approval.location}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve (8hr)',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            approvePermit(approval.id, 'Current User', 'user-1', 8);
          },
        },
      ]
    );
  }, [approvePermit]);

  const handleRejectPermit = useCallback((approval: PermitApproval) => {
    setRejectingId(approval.id);
    setRejectReason('');
    setRejectIsHR(false);
  }, []);

  const handleResubmitPermit = useCallback((approval: PermitApproval) => {
    Alert.alert(
      'Resubmit Permit',
      `Create a new permit request based on this expired "${approval.permitTypeName}" permit?\n\nThe original permit will be kept in history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resubmit',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const newPermit = resubmitPermit(approval.id, 'user-1', 'Current User');
            if (newPermit) {
              Alert.alert('Success', 'New permit request created and sent for approval.');
            }
          },
        },
      ]
    );
  }, [resubmitPermit]);

  const confirmReject = useCallback(async () => {
    if (!rejectingId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    const supabaseApproval = mappedSupabaseApprovals.find(a => a.instanceId === rejectingId);
    const aggregatedApproval = [...aggregatedPurchase, ...aggregatedTime, ...aggregatedPermits].find(a => a.id === rejectingId);
    
    const userName = user?.first_name ? `${user.first_name} ${user.last_name}` : 'Current User';
    
    if (aggregatedApproval && useSupabaseData) {
      try {
        if (aggregatedApproval.source === 'time_off') {
          await rejectTimeOffMutation.mutateAsync({
            requestId: aggregatedApproval.sourceId,
            managerId: currentUserId,
            managerName: userName,
          });
          console.log('[ApprovalsScreen] Rejected time off request:', aggregatedApproval.sourceId);
        } else if (aggregatedApproval.source === 'po_approval') {
          const approvalId = aggregatedApproval.sourceId.startsWith('poa-') 
            ? aggregatedApproval.sourceId.slice(4) 
            : aggregatedApproval.sourceId;
          await processApprovalMutation.mutateAsync({
            approvalId,
            decision: 'rejected',
            comments: rejectReason || `Rejected by ${userName}`,
          });
          console.log('[ApprovalsScreen] Rejected PO tier:', approvalId);
        } else if (aggregatedApproval.source === 'shift_swap') {
          const swapId = aggregatedApproval.sourceId.startsWith('ss-') 
            ? aggregatedApproval.sourceId.slice(3) 
            : aggregatedApproval.sourceId;
          await rejectShiftSwapMutation.mutateAsync({
            swapId,
            rejecterId: currentUserId,
            rejecterName: userName,
            reason: rejectReason || undefined,
          });
          console.log('[ApprovalsScreen] Rejected shift swap:', swapId);
        } else {
          await rejectStepMutation.mutateAsync({
            instanceId: aggregatedApproval.id,
            stepId: 'step-1',
            stepName: 'Approval Step',
            stepOrder: aggregatedApproval.currentStep || 1,
            actionById: currentUserId,
            actionByName: userName,
            comments: rejectReason || undefined,
          });
          console.log('[ApprovalsScreen] Rejected workflow instance:', aggregatedApproval.id);
        }
        
        queryClient.invalidateQueries({ queryKey: ['aggregated_purchase_approvals'] });
        queryClient.invalidateQueries({ queryKey: ['aggregated_time_approvals'] });
        queryClient.invalidateQueries({ queryKey: ['aggregated_permit_approvals'] });
      } catch (error) {
        console.error('[ApprovalsScreen] Error rejecting:', error);
        Alert.alert('Error', 'Failed to reject request. Please try again.');
      }
      setRejectingId(null);
      setRejectReason('');
      return;
    }
    
    if (supabaseApproval && useSupabaseData) {
      try {
        await rejectStepMutation.mutateAsync({
          instanceId: supabaseApproval.instanceId,
          stepId: supabaseApproval.currentStepId || 'step-1',
          stepName: `Step ${supabaseApproval.currentStepOrder}`,
          stepOrder: supabaseApproval.currentStepOrder,
          actionById: currentUserId,
          actionByName: userName,
          comments: rejectReason || undefined,
        });
        console.log('[ApprovalsScreen] Rejected workflow step:', supabaseApproval.instanceId);
        
        queryClient.invalidateQueries({ queryKey: ['aggregated_purchase_approvals'] });
        queryClient.invalidateQueries({ queryKey: ['aggregated_time_approvals'] });
        queryClient.invalidateQueries({ queryKey: ['aggregated_permit_approvals'] });
      } catch (error) {
        console.error('[ApprovalsScreen] Error rejecting step:', error);
        Alert.alert('Error', 'Failed to reject request. Please try again.');
      }
      setRejectingId(null);
      setRejectReason('');
      return;
    }
    
    const approval = approvals.find(a => a.id === rejectingId);
    if (!approval) return;

    if (approval.type === 'purchase') {
      const purchaseApproval = approval as PurchaseApproval;
      const pendingTier = purchaseApproval.approvalChain.find((e: TierEntry) => e.status === 'pending')?.tier || 1;
      rejectPurchaseTier(rejectingId, pendingTier, 'Current User', 'user-1', rejectReason || undefined);
    } else if (approval.type === 'permit') {
      rejectPermit(rejectingId, 'Current User', 'user-1', rejectReason || undefined);
    } else {
      rejectTimeApproval(rejectingId, 'Current User', 'user-1', rejectIsHR, rejectReason || undefined);
    }

    setRejectingId(null);
    setRejectReason('');
  }, [rejectingId, rejectReason, rejectIsHR, approvals, rejectPurchaseTier, rejectTimeApproval, rejectPermit, mappedSupabaseApprovals, useSupabaseData, rejectStepMutation, rejectTimeOffMutation, processApprovalMutation, rejectShiftSwapMutation, currentUserId, user, aggregatedPurchase, aggregatedTime, aggregatedPermits, queryClient]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const getTierStatusColor = (status: 'pending' | 'approved' | 'rejected' | 'returned') => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'returned': return '#F59E0B';
      default: return '#F59E0B';
    }
  };

  const getTimeTypeLabel = (type: TimeApproval['type']) => {
    switch (type) {
      case 'time_off': return 'Time Off';
      case 'overtime': return 'Overtime';
      case 'schedule_change': return 'Schedule Change';
      default: return type;
    }
  };

  const getTierLabel = (tierConfig: ApprovalTierConfig) => {
    switch (tierConfig) {
      case 'none': return 'No Approvals';
      case 'single': return 'Single Tier';
      case 'double': return 'Double Tier';
      case 'triple': return 'Triple Tier';
      default: return tierConfig;
    }
  };

  const renderTierIndicator = (approval: PurchaseApproval) => {
    const tiers = approval.approvalChain;
    return (
      <View style={styles.tierIndicatorRow}>
        {tiers.map((tier: TierEntry, index: number) => (
          <View key={tier.tier} style={styles.tierBadgeContainer}>
            <View style={[styles.tierBadge, { backgroundColor: getTierStatusColor(tier.status) }]}>
              <Text style={styles.tierBadgeText}>{tier.tier}</Text>
            </View>
            {index < tiers.length - 1 && (
              <View style={[styles.tierConnector, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderTimeApprovalIndicator = (approval: TimeApproval) => {
    const managerStatus = approval.managerApproval.status;
    const hrRequired = approval.hrApproval?.required;
    const hrStatus = approval.hrApproval?.status || 'pending';

    return (
      <View style={styles.tierIndicatorRow}>
        <View style={styles.tierBadgeContainer}>
          <View style={[styles.tierBadge, { backgroundColor: getTierStatusColor(managerStatus) }]}>
            <Users size={12} color="#FFF" />
          </View>
          <Text style={[styles.tierLabel, { color: colors.textSecondary }]}>Mgr</Text>
        </View>
        {hrRequired && (
          <>
            <View style={[styles.tierConnector, { backgroundColor: colors.border }]} />
            <View style={styles.tierBadgeContainer}>
              <View style={[styles.tierBadge, { backgroundColor: getTierStatusColor(hrStatus) }]}>
                <Briefcase size={12} color="#FFF" />
              </View>
              <Text style={[styles.tierLabel, { color: colors.textSecondary }]}>HR</Text>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderSupabaseApprovalCard = (approval: MappedApproval) => {
    const isPending = approval.status === 'pending' || approval.status === 'in_progress';
    const source = approval.source || approval.referenceType;
    
    const iconColor = approval.category === 'purchase' || approval.category === 'expense' || 
                      approval.category === 'po_approval' || approval.category === 'purchase_request' ? '#F59E0B' :
                      approval.category === 'time_off' || approval.category === 'time_off_request' || 
                      approval.category === 'shift_swap' ? '#8B5CF6' : '#EF4444';
    const IconComponent = approval.category === 'purchase' || approval.category === 'expense' || 
                          approval.category === 'po_approval' || approval.category === 'purchase_request' ? ShoppingCart :
                          approval.category === 'time_off' || approval.category === 'time_off_request' || 
                          approval.category === 'shift_swap' ? Calendar : ShieldAlert;

    return (
      <View key={approval.id} style={[styles.approvalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: `${iconColor}20` }]}>
            <IconComponent size={20} color={iconColor} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.reqNumber, { color: colors.primary }]}>{approval.templateName}</Text>
            <Text style={[styles.approvalTitle, { color: colors.text }]} numberOfLines={1}>{approval.title}</Text>
          </View>
          {approval.amount !== undefined && (
            <Text style={[styles.amountText, { color: colors.text }]}>{formatCurrency(approval.amount)}</Text>
          )}
        </View>

        {approval.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {approval.description}
          </Text>
        )}

        <View style={styles.docNumbers}>
          <View style={[styles.docBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Database size={12} color={colors.textSecondary} />
            <Text style={[styles.docText, { color: colors.textSecondary }]}>
              {source === 'po_approval' ? `Tier ${(approval.metadata?.tierLevel as number) || approval.currentStepOrder}` :
               source === 'shift_swap' ? (approval.metadata?.swapType as string || 'Swap') :
               source === 'time_off' ? (approval.metadata?.type as string || 'Time Off') :
               `Step ${approval.currentStepOrder}`}
            </Text>
          </View>
          <View style={[styles.docBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Hash size={12} color={colors.textSecondary} />
            <Text style={[styles.docText, { color: colors.textSecondary }]}>
              {source === 'po_approval' ? `PO: ${(approval.metadata?.vendorName as string)?.slice(0, 12) || approval.referenceId.slice(0, 8)}` :
               source === 'shift_swap' ? `${(approval.metadata?.requesterDate as string) || 'Shift'}` :
               source === 'time_off' ? `${(approval.metadata?.startDate as string) || ''} - ${(approval.metadata?.endDate as string) || ''}` :
               `${approval.referenceType}: ${approval.referenceId.slice(0, 8)}`}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            By: {approval.requested_by}
          </Text>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {new Date(approval.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={[styles.tierSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.tierSectionTitle, { color: colors.textSecondary }]}>
            {source === 'po_approval' ? 'Approval Tier' :
             source === 'shift_swap' ? 'Swap Status' :
             source === 'time_off' ? 'Request Status' :
             'Workflow Status'}
          </Text>
          <View style={styles.tierIndicatorRow}>
            <View style={[styles.tierBadge, { backgroundColor: isPending ? '#F59E0B' : approval.status === 'approved' ? '#10B981' : '#EF4444' }]}>
              {source === 'po_approval' ? (
                <Text style={styles.tierBadgeText}>{(approval.metadata?.tierLevel as number) || approval.currentStepOrder}</Text>
              ) : source === 'shift_swap' ? (
                <RefreshCw size={14} color="#FFFFFF" />
              ) : source === 'time_off' ? (
                <Calendar size={14} color="#FFFFFF" />
              ) : (
                <Text style={styles.tierBadgeText}>{approval.currentStepOrder}</Text>
              )}
            </View>
            <Text style={[styles.tierLabel, { color: colors.textSecondary, marginLeft: 8 }]}>
              {source === 'po_approval' ? `${(approval.metadata?.approverRole as string) || 'Approver'} Review` :
               source === 'shift_swap' ? 'Manager Approval Required' :
               source === 'time_off' ? `${(approval.metadata?.totalDays as number) || 0} day(s) requested` :
               approval.status === 'pending' ? 'Awaiting Approval' : 
               approval.status === 'in_progress' ? 'In Progress' :
               approval.status === 'escalated' ? 'Escalated' : approval.status}
            </Text>
          </View>
        </View>

        {isPending && (
          <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.rejectButton, { borderColor: colors.error }]}
              onPress={() => handleRejectSupabaseStep(approval)}
              disabled={rejectStepMutation.isPending}
            >
              <XCircle size={18} color={colors.error} />
              <Text style={[styles.rejectText, { color: colors.error }]}>Reject</Text>
            </Pressable>
            <Pressable
              style={[styles.approveButton, { backgroundColor: colors.success }]}
              onPress={() => handleApproveSupabaseStep(approval)}
              disabled={approveStepMutation.isPending || isTimeOffMutating || isProcurementMutating || isShiftSwapMutating}
            >
              {approveStepMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" />
                  <Text style={styles.approveText}>Approve</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
        
        <CardStatusIndicator status={approval.status as 'pending' | 'approved' | 'rejected' | 'partially_approved'} position="top-right" />
      </View>
    );
  };

  const renderPurchaseCard = (approval: PurchaseApproval) => {
    const pendingTierEntry = approval.approvalChain.find((e: TierEntry) => e.status === 'pending');
    const canApprove = !!pendingTierEntry;

    return (
      <View key={approval.id} style={[styles.approvalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: '#F59E0B20' }]}>
            <ShoppingCart size={20} color="#F59E0B" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.reqNumber, { color: colors.primary }]}>{approval.requisitionNumber}</Text>
            <Text style={[styles.approvalTitle, { color: colors.text }]} numberOfLines={1}>{approval.title}</Text>
          </View>
          <Text style={[styles.amountText, { color: colors.text }]}>{formatCurrency(approval.amount)}</Text>
        </View>

        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {approval.description}
        </Text>

        <View style={styles.docNumbers}>
          {approval.poNumber && (
            <View style={[styles.docBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Hash size={12} color={colors.textSecondary} />
              <Text style={[styles.docText, { color: colors.textSecondary }]}>PO: {approval.poNumber}</Text>
            </View>
          )}
          {approval.migoNumber && (
            <View style={[styles.docBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <FileText size={12} color={colors.textSecondary} />
              <Text style={[styles.docText, { color: colors.textSecondary }]}>MIGO: {approval.migoNumber}</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            By: {approval.requested_by} {approval.department && `• ${approval.department}`}
          </Text>
          {approval.vendorName && (
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>Vendor: {approval.vendorName}</Text>
          )}
        </View>

        <View style={[styles.tierSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.tierSectionTitle, { color: colors.textSecondary }]}>Approval Status</Text>
          {renderTierIndicator(approval)}
          <View style={styles.tierDetails}>
            {approval.approvalChain.map((tier: TierEntry) => (
              <View key={tier.tier} style={styles.tierDetailRow}>
                <Text style={[styles.tierRole, { color: colors.text }]}>Tier {tier.tier}: {tier.approverRole}</Text>
                {tier.approverName && (
                  <Text style={[styles.tierApprover, { color: colors.textSecondary }]}>
                    {tier.approverName} • {tier.status === 'approved' ? '✓' : tier.status === 'rejected' ? '✗' : '...'}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {canApprove && pendingTierEntry && (
          <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.rejectButton, { borderColor: colors.error }]}
              onPress={() => handleRejectPurchaseTier(approval, pendingTierEntry.tier)}
            >
              <XCircle size={18} color={colors.error} />
              <Text style={[styles.rejectText, { color: colors.error }]}>Reject</Text>
            </Pressable>
            <Pressable
              style={[styles.approveButton, { backgroundColor: colors.success }]}
              onPress={() => handleApprovePurchaseTier(approval, pendingTierEntry.tier)}
            >
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.approveText}>Approve Tier {pendingTierEntry.tier}</Text>
            </Pressable>
          </View>
        )}

        {approval.status === 'approved' && (
          <View style={[styles.statusRow, { borderTopColor: colors.border }]}>
            <View style={[styles.statusBadge, { backgroundColor: '#10B98115' }]}>
              <CheckCircle2 size={14} color="#10B981" />
              <Text style={[styles.statusText, { color: '#10B981' }]}>Fully Approved</Text>
            </View>
          </View>
        )}

        {approval.status === 'rejected' && (
          <View style={[styles.statusRow, { borderTopColor: colors.border }]}>
            <RejectedBadge 
              reason={approval.approvalChain.find((t: TierEntry) => t.status === 'rejected')?.rejectionReason}
              tierLevel={approval.approvalChain.find((t: TierEntry) => t.status === 'rejected')?.tier}
              showReason={true}
              size="medium"
            />
          </View>
        )}
        
        <CardStatusIndicator status={approval.status} position="top-right" />
      </View>
    );
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  const renderPermitCard = (approval: PermitApproval) => {
    const canApprove = approval.status === 'pending';
    const isExpired = approval.expiresAt && new Date(approval.expiresAt) < new Date();

    return (
      <View key={approval.id} style={[styles.approvalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: '#EF444420' }]}>
            <ShieldAlert size={20} color="#EF4444" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.typeLabel, { color: '#EF4444' }]}>{approval.permitCode}</Text>
            <Text style={[styles.approvalTitle, { color: colors.text }]} numberOfLines={1}>{approval.permitTypeName}</Text>
          </View>
          {approval.status === 'approved' && approval.expiresAt && (
            <View style={[styles.timerBadge, { backgroundColor: isExpired ? '#EF444420' : '#10B98120' }]}>
              <Timer size={12} color={isExpired ? '#EF4444' : '#10B981'} />
              <Text style={[styles.timerText, { color: isExpired ? '#EF4444' : '#10B981' }]}>
                {isExpired ? 'Expired' : formatTimeRemaining(approval.expiresAt)}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {approval.description || approval.title}
        </Text>

        <View style={styles.permitDetails}>
          <View style={[styles.permitDetailRow, { backgroundColor: colors.backgroundSecondary }]}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.permitDetailText, { color: colors.text }]}>{approval.location}</Text>
          </View>
          {approval.equipment && (
            <View style={[styles.permitDetailRow, { backgroundColor: colors.backgroundSecondary }]}>
              <Wrench size={14} color={colors.textSecondary} />
              <Text style={[styles.permitDetailText, { color: colors.text }]}>{approval.equipment}</Text>
            </View>
          )}
          {approval.workOrderNumber && (
            <View style={[styles.permitDetailRow, { backgroundColor: colors.backgroundSecondary }]}>
              <FileText size={14} color={colors.textSecondary} />
              <Text style={[styles.permitDetailText, { color: colors.text }]}>WO: {approval.workOrderNumber}</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            By: {approval.requested_by}
          </Text>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            Approver: {approval.approverRole}
          </Text>
        </View>

        {canApprove && (
          <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.rejectButton, { borderColor: colors.error }]}
              onPress={() => handleRejectPermit(approval)}
            >
              <XCircle size={18} color={colors.error} />
              <Text style={[styles.rejectText, { color: colors.error }]}>Reject</Text>
            </Pressable>
            <Pressable
              style={[styles.approveButton, { backgroundColor: colors.success }]}
              onPress={() => handleApprovePermit(approval)}
            >
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.approveText}>Approve Permit</Text>
            </Pressable>
          </View>
        )}

        {approval.status === 'approved' && (
          <View style={[styles.statusRow, { borderTopColor: colors.border }]}>
            <View style={[styles.statusBadge, { backgroundColor: isExpired ? '#EF444415' : '#10B98115' }]}>
              {isExpired ? (
                <><XCircle size={14} color="#EF4444" />
                <Text style={[styles.statusText, { color: '#EF4444' }]}>Expired</Text></>
              ) : (
                <><CheckCircle2 size={14} color="#10B981" />
                <Text style={[styles.statusText, { color: '#10B981' }]}>Active - {approval.approvedByName}</Text></>
              )}
            </View>
            {isExpired && (
              <Pressable
                style={[styles.resubmitButton, { backgroundColor: colors.primary }]}
                onPress={() => handleResubmitPermit(approval)}
              >
                <RefreshCw size={14} color="#FFFFFF" />
                <Text style={styles.resubmitText}>Resubmit</Text>
              </Pressable>
            )}
          </View>
        )}

        {approval.status === 'rejected' && (
          <View style={[styles.statusRow, { borderTopColor: colors.border }]}>
            <RejectedBadge 
              reason={approval.rejectionReason}
              showReason={true}
              size="medium"
            />
          </View>
        )}
        
        <CardStatusIndicator status={approval.status} position="top-right" />
      </View>
    );
  };

  const renderTimeCard = (approval: TimeApproval) => {
    const managerPending = approval.managerApproval.status === 'pending';
    const hrPending = approval.hrApproval?.required && approval.hrApproval.status === 'pending';
    const canApproveManager = managerPending;
    const canApproveHR = !managerPending && !!hrPending && approval.managerApproval.status === 'approved';

    return (
      <View key={approval.id} style={[styles.approvalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: '#8B5CF620' }]}>
            <Calendar size={20} color="#8B5CF6" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.typeLabel, { color: '#8B5CF6' }]}>{getTimeTypeLabel(approval.type)}</Text>
            <Text style={[styles.approvalTitle, { color: colors.text }]} numberOfLines={1}>{approval.title}</Text>
          </View>
          {approval.hoursRequested && (
            <Text style={[styles.hoursText, { color: colors.text }]}>{approval.hoursRequested}h</Text>
          )}
        </View>

        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {approval.description}
        </Text>

        <View style={styles.dateRange}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {approval.startDate} → {approval.endDate}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            By: {approval.requested_by}
          </Text>
        </View>

        <View style={[styles.tierSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.tierSectionTitle, { color: colors.textSecondary }]}>Approval Status</Text>
          {renderTimeApprovalIndicator(approval)}
          <View style={styles.tierDetails}>
            <View style={styles.tierDetailRow}>
              <Text style={[styles.tierRole, { color: colors.text }]}>Manager</Text>
              <Text style={[styles.tierApprover, { color: colors.textSecondary }]}>
                {approval.managerApproval.managerName || 'Pending'} • {approval.managerApproval.status === 'approved' ? '✓' : approval.managerApproval.status === 'rejected' ? '✗' : '...'}
              </Text>
            </View>
            {approval.hrApproval?.required && (
              <View style={styles.tierDetailRow}>
                <Text style={[styles.tierRole, { color: colors.text }]}>HR Admin</Text>
                <Text style={[styles.tierApprover, { color: colors.textSecondary }]}>
                  {approval.hrApproval.hrAdminName || 'Pending'} • {approval.hrApproval.status === 'approved' ? '✓' : approval.hrApproval.status === 'rejected' ? '✗' : '...'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {(canApproveManager || canApproveHR) && (
          <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.rejectButton, { borderColor: colors.error }]}
              onPress={() => handleRejectTime(approval, canApproveHR)}
            >
              <XCircle size={18} color={colors.error} />
              <Text style={[styles.rejectText, { color: colors.error }]}>Reject</Text>
            </Pressable>
            {canApproveManager && (
              <Pressable
                style={[styles.approveButton, { backgroundColor: colors.success }]}
                onPress={() => handleApproveTimeManager(approval)}
              >
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={styles.approveText}>Manager Approve</Text>
              </Pressable>
            )}
            {canApproveHR && (
              <Pressable
                style={[styles.approveButton, { backgroundColor: colors.success }]}
                onPress={() => handleApproveTimeHR(approval)}
              >
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={styles.approveText}>HR Approve</Text>
              </Pressable>
            )}
          </View>
        )}

        {approval.status === 'approved' && (
          <View style={[styles.statusRow, { borderTopColor: colors.border }]}>
            <View style={[styles.statusBadge, { backgroundColor: '#10B98115' }]}>
              <CheckCircle2 size={14} color="#10B981" />
              <Text style={[styles.statusText, { color: '#10B981' }]}>Approved</Text>
            </View>
          </View>
        )}

        {approval.status === 'rejected' && (
          <View style={[styles.statusRow, { borderTopColor: colors.border }]}>
            <RejectedBadge 
              reason={approval.managerApproval.rejectionReason || approval.hrApproval?.rejectionReason}
              showReason={true}
              size="medium"
            />
          </View>
        )}
        
        <CardStatusIndicator status={approval.status} position="top-right" />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabRow}>
          <Pressable
            style={[
              styles.tab,
              { backgroundColor: activeTab === 'purchase' ? colors.primary : colors.surface, borderColor: colors.border },
            ]}
            onPress={() => { Haptics.selectionAsync(); setActiveTab('purchase'); }}
          >
            <ShoppingCart size={18} color={activeTab === 'purchase' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'purchase' ? '#FFF' : colors.textSecondary }]}>
              Purchase
            </Text>
            {pendingPurchaseCount > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === 'purchase' ? '#FFF' : colors.warning }]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === 'purchase' ? colors.primary : '#FFF' }]}>
                  {pendingPurchaseCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              { backgroundColor: activeTab === 'time' ? colors.primary : colors.surface, borderColor: colors.border },
            ]}
            onPress={() => { Haptics.selectionAsync(); setActiveTab('time'); }}
          >
            <Clock size={18} color={activeTab === 'time' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'time' ? '#FFF' : colors.textSecondary }]}>
              Time
            </Text>
            {pendingTimeCount > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === 'time' ? '#FFF' : colors.warning }]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === 'time' ? colors.primary : '#FFF' }]}>
                  {pendingTimeCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              { backgroundColor: activeTab === 'permits' ? colors.primary : colors.surface, borderColor: colors.border },
            ]}
            onPress={() => { Haptics.selectionAsync(); setActiveTab('permits'); }}
          >
            <ShieldAlert size={18} color={activeTab === 'permits' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'permits' ? '#FFF' : colors.textSecondary }]}>
              Permits
            </Text>
            {pendingPermitCount > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === 'permits' ? '#FFF' : colors.warning }]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === 'permits' ? colors.primary : '#FFF' }]}>
                  {pendingPermitCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.settingsButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowSettingsModal(true)}
          >
            <Settings size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <RequestorActionPanel />

        {/* Data Source Toggle */}
        <Pressable
          style={[styles.dataSourceBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setUseSupabaseData(!useSupabaseData)}
        >
          <View style={[styles.dataSourceIcon, { backgroundColor: useSupabaseData ? '#10B98115' : '#F59E0B15' }]}>
            <Database size={18} color={useSupabaseData ? '#10B981' : '#F59E0B'} />
          </View>
          <View style={styles.dataSourceContent}>
            <Text style={[styles.dataSourceTitle, { color: colors.text }]}>
              {useSupabaseData ? 'Live Data' : 'Demo Data'}
            </Text>
            <Text style={[styles.dataSourceSubtitle, { color: colors.textSecondary }]}>
              {useSupabaseData 
                ? `${aggregatedCounts.total} total (${aggregatedCounts.purchase} purchase, ${aggregatedCounts.timeOff} time, ${aggregatedCounts.permits} permits)` 
                : 'Using mock data for demo'}
            </Text>
          </View>
          {isLoadingInstances && useSupabaseData && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </Pressable>

        {/* Workflow Stats Summary */}
        {useSupabaseData && workflowStats && (
          <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{workflowStats.pendingInstances}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{workflowStats.approvalRate.toFixed(0)}%</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approval Rate</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{workflowStats.avgCompletionTimeHours.toFixed(0)}h</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Time</Text>
            </View>
          </View>
        )}

        <View style={styles.quickLinksRow}>
          <Pressable
            style={[styles.quickLinkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/approvals/workflows')}
          >
            <View style={[styles.quickLinkIcon, { backgroundColor: `${colors.primary}15` }]}>
              <GitBranch size={18} color={colors.primary} />
            </View>
            <Text style={[styles.quickLinkTitle, { color: colors.text }]}>Workflows</Text>
            <Text style={[styles.quickLinkSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              Configure & manage
            </Text>
          </Pressable>
          <Pressable
            style={[styles.quickLinkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/approvals/history')}
          >
            <View style={[styles.quickLinkIcon, { backgroundColor: '#10B98115' }]}>
              <Clock size={18} color="#10B981" />
            </View>
            <Text style={[styles.quickLinkTitle, { color: colors.text }]}>History</Text>
            <Text style={[styles.quickLinkSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              View all actions
            </Text>
          </Pressable>
        </View>

        {activeTab === 'purchase' && (
          <Pressable
            style={[styles.tierConfigBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowSettingsModal(true)}
          >
            <View style={[styles.tierConfigIcon, { backgroundColor: `${colors.primary}15` }]}>
              <DollarSign size={20} color={colors.primary} />
            </View>
            <View style={styles.tierConfigContent}>
              <Text style={[styles.tierConfigTitle, { color: colors.text }]}>
                {getTierLabel(approvalSettings.purchaseApprovalTier)}
              </Text>
              <Text style={[styles.tierConfigSubtitle, { color: colors.textSecondary }]}>
                T1: ≤${approvalSettings.tierThresholds.tier1Limit.toLocaleString()}${approvalSettings.purchaseApprovalTier !== 'single' && approvalSettings.purchaseApprovalTier !== 'none' ? ` • T2: ≤${approvalSettings.tierThresholds.tier2Limit.toLocaleString()}` : ''}${approvalSettings.purchaseApprovalTier === 'triple' ? ` • T3: ≤${approvalSettings.tierThresholds.tier3Limit.toLocaleString()}` : ''}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </Pressable>
        )}

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(activeTab === 'permits' 
              ? ['all', 'pending', 'returned', 'approved', 'expired', 'rejected'] as FilterType[] 
              : ['all', 'pending', 'returned', 'approved', 'rejected'] as FilterType[]
            ).map((f) => (
              <Pressable
                key={f}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: filter === f ? (f === 'returned' ? '#F59E0B' : colors.primary) : colors.surface, 
                    borderColor: filter === f ? (f === 'returned' ? '#F59E0B' : colors.primary) : colors.border 
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
              >
                {f === 'returned' && returnedToMeCount > 0 && filter !== 'returned' && (
                  <View style={[styles.filterBadge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.filterBadgeText}>{returnedToMeCount}</Text>
                  </View>
                )}
                <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : colors.textSecondary }]}>
                  {f === 'all' ? 'All' : f === 'returned' ? 'Returned to Me' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          {useSupabaseData ? (
            // Render Supabase workflow instances
            <>
              {isLoadingInstances || isLoadingAggregated ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 16 }]}>Loading approvals...</Text>
                </View>
              ) : (
                <>
                  {activeTab === 'purchase' && filteredAggregatedPurchase.length === 0 && (
                    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <ShoppingCart size={40} color={colors.textTertiary} />
                      <Text style={[styles.emptyTitle, { color: colors.text }]}>No purchase approvals</Text>
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {filter === 'all' ? 'No purchase requests found' : `No ${filter} purchase requests`}
                      </Text>
                    </View>
                  )}
                  {activeTab === 'purchase' && filteredAggregatedPurchase.map(a => renderSupabaseApprovalCard(mapAggregatedToMapped(a)))}
                  
                  {activeTab === 'time' && filteredAggregatedTime.length === 0 && (
                    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Calendar size={40} color={colors.textTertiary} />
                      <Text style={[styles.emptyTitle, { color: colors.text }]}>No time approvals</Text>
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {filter === 'all' ? 'No time-off or shift swap requests found' : `No ${filter} time requests`}
                      </Text>
                    </View>
                  )}
                  {activeTab === 'time' && filteredAggregatedTime.map(a => renderSupabaseApprovalCard(mapAggregatedToMapped(a)))}
                  
                  {activeTab === 'permits' && filteredAggregatedPermits.length === 0 && (
                    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <ShieldAlert size={40} color={colors.textTertiary} />
                      <Text style={[styles.emptyTitle, { color: colors.text }]}>No permit approvals</Text>
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {filter === 'all' ? 'No permit requests found' : `No ${filter} permit requests`}
                      </Text>
                    </View>
                  )}
                  {activeTab === 'permits' && filteredAggregatedPermits.map(a => renderSupabaseApprovalCard(mapAggregatedToMapped(a)))}
                </>
              )}
            </>
          ) : (
            // Render mock/demo data
            <>
              {filteredApprovals.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <FileText size={40} color={colors.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No approvals found</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {filter === 'all' ? `No ${activeTab} approvals yet` : `No ${filter} ${activeTab} approvals`}
                  </Text>
                </View>
              ) : (
                activeTab === 'purchase'
                  ? (filteredApprovals as PurchaseApproval[]).map(renderPurchaseCard)
                  : activeTab === 'time'
                  ? (filteredApprovals as TimeApproval[]).map(renderTimeCard)
                  : (filteredApprovals as PermitApproval[]).map(renderPermitCard)
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Approval Settings</Text>
            <Pressable onPress={() => setShowSettingsModal(false)} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.settingsSectionTitle, { color: colors.text }]}>Purchase Approval Tiers</Text>
            <View style={styles.tierOptions}>
              {(['none', 'single', 'double', 'triple'] as ApprovalTierConfig[]).map((tier) => (
                <Pressable
                  key={tier}
                  style={[
                    styles.tierOption,
                    {
                      backgroundColor: approvalSettings.purchaseApprovalTier === tier ? colors.primary : colors.surface,
                      borderColor: approvalSettings.purchaseApprovalTier === tier ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => updateApprovalSettings({ purchaseApprovalTier: tier })}
                >
                  <Text style={[styles.tierOptionText, { color: approvalSettings.purchaseApprovalTier === tier ? '#FFF' : colors.text }]}>
                    {getTierLabel(tier)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.settingsSectionTitle, { color: colors.text, marginTop: 24 }]}>Tier Thresholds</Text>
            <View style={styles.thresholdInputs}>
              <View style={styles.thresholdRow}>
                <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Tier 1 Limit ($)</Text>
                <TextInput
                  style={[styles.thresholdInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={approvalSettings.tierThresholds.tier1Limit.toString()}
                  onChangeText={(t) => updateApprovalSettings({
                    tierThresholds: { ...approvalSettings.tierThresholds, tier1Limit: parseFloat(t) || 0 }
                  })}
                  keyboardType="decimal-pad"
                />
              </View>
              {(approvalSettings.purchaseApprovalTier === 'double' || approvalSettings.purchaseApprovalTier === 'triple') && (
                <View style={styles.thresholdRow}>
                  <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Tier 2 Limit ($)</Text>
                  <TextInput
                    style={[styles.thresholdInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    value={approvalSettings.tierThresholds.tier2Limit.toString()}
                    onChangeText={(t) => updateApprovalSettings({
                      tierThresholds: { ...approvalSettings.tierThresholds, tier2Limit: parseFloat(t) || 0 }
                    })}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}
              {approvalSettings.purchaseApprovalTier === 'triple' && (
                <View style={styles.thresholdRow}>
                  <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Tier 3 Limit ($)</Text>
                  <TextInput
                    style={[styles.thresholdInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    value={approvalSettings.tierThresholds.tier3Limit.toString()}
                    onChangeText={(t) => updateApprovalSettings({
                      tierThresholds: { ...approvalSettings.tierThresholds, tier3Limit: parseFloat(t) || 0 }
                    })}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}
            </View>

            <Text style={[styles.settingsSectionTitle, { color: colors.text, marginTop: 24 }]}>Approver Roles</Text>
            <View style={styles.thresholdInputs}>
              <View style={styles.thresholdRow}>
                <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Tier 1 Role</Text>
                <TextInput
                  style={[styles.thresholdInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={approvalSettings.tier1ApproverRole}
                  onChangeText={(t) => updateApprovalSettings({ tier1ApproverRole: t })}
                />
              </View>
              <View style={styles.thresholdRow}>
                <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Tier 2 Role</Text>
                <TextInput
                  style={[styles.thresholdInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={approvalSettings.tier2ApproverRole}
                  onChangeText={(t) => updateApprovalSettings({ tier2ApproverRole: t })}
                />
              </View>
              <View style={styles.thresholdRow}>
                <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Tier 3 Role</Text>
                <TextInput
                  style={[styles.thresholdInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={approvalSettings.tier3ApproverRole}
                  onChangeText={(t) => updateApprovalSettings({ tier3ApproverRole: t })}
                />
              </View>
            </View>

            <Text style={[styles.settingsSectionTitle, { color: colors.text, marginTop: 24 }]}>Time Approval Settings</Text>
            <Pressable
              style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => updateApprovalSettings({ timeApprovalRequiresHR: !approvalSettings.timeApprovalRequiresHR })}
            >
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Require HR Approval</Text>
              <View style={[styles.toggle, { backgroundColor: approvalSettings.timeApprovalRequiresHR ? colors.success : colors.border }]}>
                <View style={[styles.toggleKnob, { transform: [{ translateX: approvalSettings.timeApprovalRequiresHR ? 20 : 0 }] }]} />
              </View>
            </Pressable>

            <Pressable
              style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => updateApprovalSettings({ emailNotificationsEnabled: !approvalSettings.emailNotificationsEnabled })}
            >
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Email Notifications</Text>
              <View style={[styles.toggle, { backgroundColor: approvalSettings.emailNotificationsEnabled ? colors.success : colors.border }]}>
                <View style={[styles.toggleKnob, { transform: [{ translateX: approvalSettings.emailNotificationsEnabled ? 20 : 0 }] }]} />
              </View>
            </Pressable>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!rejectingId}
        animationType="fade"
        transparent
        onRequestClose={() => setRejectingId(null)}
      >
        <View style={styles.rejectModalOverlay}>
          <View style={[styles.rejectModalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.rejectModalIcon, { backgroundColor: `${colors.error}15` }]}>
              <AlertTriangle size={32} color={colors.error} />
            </View>
            <Text style={[styles.rejectModalTitle, { color: colors.text }]}>Reject Request</Text>
            <Text style={[styles.rejectModalSubtitle, { color: colors.textSecondary }]}>
              Are you sure you want to reject this request?
            </Text>
            <TextInput
              style={[styles.rejectReasonInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Reason for rejection (optional)"
              placeholderTextColor={colors.textTertiary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.rejectModalActions}>
              <Pressable
                style={[styles.rejectModalCancel, { borderColor: colors.border }]}
                onPress={() => setRejectingId(null)}
              >
                <Text style={[styles.rejectModalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.rejectModalConfirm, { backgroundColor: colors.error }]}
                onPress={confirmReject}
              >
                <Text style={styles.rejectModalConfirmText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierConfigBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  tierConfigIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierConfigContent: {
    flex: 1,
  },
  tierConfigTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  tierConfigSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginRight: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  section: {
    gap: 12,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  approvalCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  reqNumber: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  approvalTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  hoursText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  docNumbers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  docText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  dateRange: {
    marginTop: -4,
  },
  dateText: {
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  tierSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  tierSectionTitle: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  tierIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierBadgeContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  tierBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  tierConnector: {
    width: 20,
    height: 2,
    marginHorizontal: 2,
  },
  tierLabel: {
    fontSize: 10,
    marginLeft: 4,
  },
  tierDetails: {
    gap: 4,
  },
  tierDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierRole: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  tierApprover: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  rejectText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  approveButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  approveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  permitDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permitDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  permitDetailText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  tierOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tierOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tierOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  thresholdInputs: {
    gap: 12,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thresholdLabel: {
    fontSize: 14,
  },
  thresholdInput: {
    width: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'right',
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  workflowsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  workflowsIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workflowsContent: {
    flex: 1,
  },
  workflowsTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  workflowsSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalBottomPadding: {
    height: 40,
  },
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  rejectModalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  rejectModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  rejectModalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  rejectModalSubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  rejectReasonInput: {
    width: '100%',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top' as const,
    marginBottom: 20,
  },
  rejectModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  rejectModalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  rejectModalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  rejectModalConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectModalConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  resubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  resubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickLinkCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLinkTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  quickLinkSubtitle: {
    fontSize: 11,
    textAlign: 'center' as const,
  },
  dataSourceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  dataSourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataSourceContent: {
    flex: 1,
  },
  dataSourceTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  dataSourceSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
});
