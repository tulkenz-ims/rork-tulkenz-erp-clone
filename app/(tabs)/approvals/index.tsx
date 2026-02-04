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
  TouchableOpacity,
} from 'react-native';
import {
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Calendar,
  FileText,
  Building2,
  Users,
  ChevronDown,
  ChevronRight,
  Shield,
  Crown,
  Lock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePendingPurchaseRequestApprovals,
  usePendingRequisitionApprovalsByTier,
  useManagerApprovePurchaseRequest,
  useManagerRejectPurchaseRequest,
  useApproveRequisitionTier,
  useRejectRequisitionTier,
  PendingRequisitionApproval,
  PurchaseRequestLineItem,
} from '@/hooks/useSupabaseProcurement';
import { Tables } from '@/lib/supabase';
import { APPROVAL_TIER_LABELS } from '@/types/procurement';

type PurchaseRequest = Tables['purchase_requests'];

type ApprovalTab = 'dept_manager' | 'plant_manager' | 'executive';

const MOCK_PIN = '1234';

interface DepartmentGroup {
  departmentId: string | null;
  departmentName: string;
  requests: PurchaseRequest[];
}

interface PinModalState {
  visible: boolean;
  action: 'approve' | 'reject';
  itemType: 'request' | 'requisition';
  itemId: string;
  tier?: number;
  title: string;
}

export default function ApprovalsScreen() {
  const { colors } = useTheme();
  const { user, userProfile } = useUser();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<ApprovalTab>('dept_manager');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(['all']));
  const [pinModal, setPinModal] = useState<PinModalState>({
    visible: false,
    action: 'approve',
    itemType: 'request',
    itemId: '',
    title: '',
  });
  const [pinInput, setPinInput] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<{
    type: 'request' | 'requisition';
    id: string;
    tier?: number;
    title: string;
  } | null>(null);

  const { data: pendingRequests = [], isLoading: loadingRequests, refetch: refetchRequests } = usePendingPurchaseRequestApprovals();
  const { data: tier2Approvals = [], isLoading: loadingTier2, refetch: refetchTier2 } = usePendingRequisitionApprovalsByTier(2);
  const { data: tier3Approvals = [], isLoading: loadingTier3, refetch: refetchTier3 } = usePendingRequisitionApprovalsByTier(3);

  const approveRequestMutation = useManagerApprovePurchaseRequest({
    onSuccess: () => {
      console.log('[Approvals] Request approved');
      refetchRequests();
    },
    onError: (error) => {
      console.error('[Approvals] Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request');
    },
  });

  const rejectRequestMutation = useManagerRejectPurchaseRequest({
    onSuccess: () => {
      console.log('[Approvals] Request rejected');
      refetchRequests();
    },
    onError: (error) => {
      console.error('[Approvals] Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    },
  });

  const approveRequisitionMutation = useApproveRequisitionTier({
    onSuccess: () => {
      console.log('[Approvals] Requisition tier approved');
      refetchTier2();
      refetchTier3();
      queryClient.invalidateQueries({ queryKey: ['pending_requisition_approvals_by_tier'] });
    },
    onError: (error) => {
      console.error('[Approvals] Error approving requisition:', error);
      Alert.alert('Error', 'Failed to approve requisition');
    },
  });

  const rejectRequisitionMutation = useRejectRequisitionTier({
    onSuccess: () => {
      console.log('[Approvals] Requisition rejected');
      refetchTier2();
      refetchTier3();
      queryClient.invalidateQueries({ queryKey: ['pending_requisition_approvals_by_tier'] });
    },
    onError: (error) => {
      console.error('[Approvals] Error rejecting requisition:', error);
      Alert.alert('Error', 'Failed to reject requisition');
    },
  });

  const currentUserName = useMemo(() => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    return 'Current User';
  }, [userProfile]);

  const departmentGroups = useMemo((): DepartmentGroup[] => {
    const groups: Map<string, DepartmentGroup> = new Map();
    
    pendingRequests.forEach(request => {
      const deptId = request.department_id || 'unassigned';
      const deptName = request.department_name || 'Unassigned';
      
      if (!groups.has(deptId)) {
        groups.set(deptId, {
          departmentId: request.department_id,
          departmentName: deptName,
          requests: [],
        });
      }
      groups.get(deptId)?.requests.push(request);
    });
    
    return Array.from(groups.values()).sort((a, b) => 
      a.departmentName.localeCompare(b.departmentName)
    );
  }, [pendingRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[Approvals] Refreshing data...');
    try {
      await Promise.all([
        refetchRequests(),
        refetchTier2(),
        refetchTier3(),
      ]);
    } catch (error) {
      console.error('[Approvals] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchRequests, refetchTier2, refetchTier3]);

  const toggleDepartment = (deptId: string) => {
    Haptics.selectionAsync();
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  const handleApprovePress = (
    itemType: 'request' | 'requisition',
    itemId: string,
    title: string,
    tier?: number
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPinInput('');
    setPinModal({
      visible: true,
      action: 'approve',
      itemType,
      itemId,
      tier,
      title,
    });
  };

  const handleRejectPress = (
    itemType: 'request' | 'requisition',
    itemId: string,
    title: string,
    tier?: number
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRejectReason('');
    setRejectingItem({ type: itemType, id: itemId, tier, title });
    setShowRejectModal(true);
  };

  const handlePinSubmit = async () => {
    if (pinInput !== MOCK_PIN) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid PIN', 'Please enter the correct PIN to approve.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPinModal(prev => ({ ...prev, visible: false }));

    if (pinModal.itemType === 'request') {
      approveRequestMutation.mutate({
        requestId: pinModal.itemId,
        approvedBy: currentUserName,
        approvedById: user?.id,
      });
    } else if (pinModal.itemType === 'requisition' && pinModal.tier) {
      approveRequisitionMutation.mutate({
        requisitionId: pinModal.itemId,
        tier: pinModal.tier,
        approvedBy: currentUserName,
        approvedById: user?.id,
      });
    }
  };

  const handleRejectSubmit = () => {
    if (!rejectingItem) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowRejectModal(false);

    if (rejectingItem.type === 'request') {
      rejectRequestMutation.mutate({
        requestId: rejectingItem.id,
        rejectedBy: currentUserName,
        rejectedById: user?.id,
        reason: rejectReason || undefined,
      });
    } else if (rejectingItem.type === 'requisition' && rejectingItem.tier) {
      rejectRequisitionMutation.mutate({
        requisitionId: rejectingItem.id,
        tier: rejectingItem.tier,
        rejectedBy: currentUserName,
        rejectedById: user?.id,
        reason: rejectReason || undefined,
      });
    }

    setRejectingItem(null);
    setRejectReason('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderTab = (tab: ApprovalTab, label: string, count: number, icon: React.ReactNode, color: string) => {
    const isActive = activeTab === tab;
    
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tab,
          {
            backgroundColor: isActive ? `${color}15` : colors.surface,
            borderColor: isActive ? color : colors.border,
          },
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveTab(tab);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.tabIcon, { backgroundColor: `${color}20` }]}>
          {icon}
        </View>
        <View style={styles.tabContent}>
          <Text style={[styles.tabLabel, { color: isActive ? color : colors.text }]} numberOfLines={1}>
            {label}
          </Text>
          <View style={[styles.tabBadge, { backgroundColor: count > 0 ? color : colors.border }]}>
            <Text style={styles.tabBadgeText}>{count}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequestCard = (request: PurchaseRequest) => {
    const lineItems = (request.line_items || []) as unknown as PurchaseRequestLineItem[];
    
    return (
      <View
        key={request.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardNumber, { color: colors.primary }]}>{request.request_number}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(request.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(request.priority) }]}>
                {request.priority.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardAmount, { color: colors.text }]}>
            {formatCurrency(request.total_estimated)}
          </Text>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {request.requester_name}
            </Text>
          </View>
          {request.needed_by_date && (
            <View style={styles.detailRow}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                Needed by {formatDate(request.needed_by_date)}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <FileText size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {request.notes && (
          <Text style={[styles.cardNotes, { color: colors.textTertiary }]} numberOfLines={2}>
            {request.notes}
          </Text>
        )}

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.rejectButton, { borderColor: '#EF4444' }]}
            onPress={() => handleRejectPress('request', request.id, request.request_number)}
            disabled={rejectRequestMutation.isPending}
          >
            <XCircle size={18} color="#EF4444" />
            <Text style={[styles.rejectButtonText, { color: '#EF4444' }]}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.approveButton, { backgroundColor: '#10B981' }]}
            onPress={() => handleApprovePress('request', request.id, request.request_number)}
            disabled={approveRequestMutation.isPending}
          >
            {approveRequestMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Lock size={16} color="#fff" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  const renderRequisitionCard = (approval: PendingRequisitionApproval, tier: number) => {
    const tierLabel = APPROVAL_TIER_LABELS[tier] || `Tier ${tier}`;
    const tierColor = tier === 2 ? '#F59E0B' : '#8B5CF6';

    return (
      <View
        key={approval.approval_id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardNumber, { color: colors.primary }]}>{approval.requisition_number}</Text>
            <View style={[styles.tierBadge, { backgroundColor: `${tierColor}20` }]}>
              <Text style={[styles.tierBadgeText, { color: tierColor }]}>{tierLabel}</Text>
            </View>
          </View>
          <Text style={[styles.cardAmount, { color: colors.text }]}>
            {formatCurrency(approval.total)}
          </Text>
        </View>

        <View style={styles.cardDetails}>
          {approval.department_name && (
            <View style={styles.detailRow}>
              <Building2 size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {approval.department_name}
              </Text>
            </View>
          )}
          {approval.vendor_name && (
            <View style={styles.detailRow}>
              <ShoppingCart size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {approval.vendor_name}
              </Text>
            </View>
          )}
          {approval.needed_by_date && (
            <View style={styles.detailRow}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                Needed by {formatDate(approval.needed_by_date)}
              </Text>
            </View>
          )}
          {approval.source_request_number && (
            <View style={styles.detailRow}>
              <FileText size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                From: {approval.source_request_number}
              </Text>
            </View>
          )}
        </View>

        {approval.justification && (
          <Text style={[styles.cardNotes, { color: colors.textTertiary }]} numberOfLines={2}>
            {approval.justification}
          </Text>
        )}

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.rejectButton, { borderColor: '#EF4444' }]}
            onPress={() => handleRejectPress('requisition', approval.requisition_id, approval.requisition_number, tier)}
            disabled={rejectRequisitionMutation.isPending}
          >
            <XCircle size={18} color="#EF4444" />
            <Text style={[styles.rejectButtonText, { color: '#EF4444' }]}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.approveButton, { backgroundColor: tierColor }]}
            onPress={() => handleApprovePress('requisition', approval.requisition_id, approval.requisition_number, tier)}
            disabled={approveRequisitionMutation.isPending}
          >
            {approveRequisitionMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Lock size={16} color="#fff" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  const renderDeptManagerTab = () => {
    if (loadingRequests) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading requests...</Text>
        </View>
      );
    }

    if (departmentGroups.length === 0) {
      return (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <CheckCircle2 size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>All Caught Up!</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No purchase requests pending department manager approval
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.deptList}>
        {departmentGroups.map(group => {
          const isExpanded = expandedDepts.has(group.departmentId || 'unassigned');
          
          return (
            <View key={group.departmentId || 'unassigned'} style={styles.deptGroup}>
              <TouchableOpacity
                style={[styles.deptHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => toggleDepartment(group.departmentId || 'unassigned')}
                activeOpacity={0.7}
              >
                <View style={[styles.deptIconContainer, { backgroundColor: '#3B82F615' }]}>
                  <Building2 size={20} color="#3B82F6" />
                </View>
                <View style={styles.deptInfo}>
                  <Text style={[styles.deptName, { color: colors.text }]}>{group.departmentName}</Text>
                  <Text style={[styles.deptCount, { color: colors.textSecondary }]}>
                    {group.requests.length} pending approval{group.requests.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                {isExpanded ? (
                  <ChevronDown size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronRight size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.deptRequests}>
                  {group.requests.map(renderRequestCard)}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderPlantManagerTab = () => {
    if (loadingTier2) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading approvals...</Text>
        </View>
      );
    }

    if (tier2Approvals.length === 0) {
      return (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <CheckCircle2 size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>All Caught Up!</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No requisitions pending Plant Manager approval
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.cardList}>
        {tier2Approvals.map(approval => renderRequisitionCard(approval, 2))}
      </View>
    );
  };

  const renderExecutiveTab = () => {
    if (loadingTier3) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading approvals...</Text>
        </View>
      );
    }

    if (tier3Approvals.length === 0) {
      return (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <CheckCircle2 size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>All Caught Up!</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No requisitions pending Executive approval
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.cardList}>
        {tier3Approvals.map(approval => renderRequisitionCard(approval, 3))}
      </View>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'normal': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.tabsContainer}>
          {renderTab(
            'dept_manager',
            'Dept Manager',
            pendingRequests.length,
            <Users size={18} color="#3B82F6" />,
            '#3B82F6'
          )}
          {renderTab(
            'plant_manager',
            'Plant Manager',
            tier2Approvals.length,
            <Shield size={18} color="#F59E0B" />,
            '#F59E0B'
          )}
          {renderTab(
            'executive',
            'Executive',
            tier3Approvals.length,
            <Crown size={18} color="#8B5CF6" />,
            '#8B5CF6'
          )}
        </View>

        <View style={styles.content}>
          {activeTab === 'dept_manager' && renderDeptManagerTab()}
          {activeTab === 'plant_manager' && renderPlantManagerTab()}
          {activeTab === 'executive' && renderExecutiveTab()}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={pinModal.visible}
        animationType="fade"
        transparent
        onRequestClose={() => setPinModal(prev => ({ ...prev, visible: false }))}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.pinModalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.pinModalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.pinModalIcon, { backgroundColor: '#10B98115' }]}>
                <Lock size={24} color="#10B981" />
              </View>
              <Text style={[styles.pinModalTitle, { color: colors.text }]}>Enter PIN to Approve</Text>
              <Text style={[styles.pinModalSubtitle, { color: colors.textSecondary }]}>
                {pinModal.title}
              </Text>
            </View>

            <View style={styles.pinInputContainer}>
              <TextInput
                style={[styles.pinInput, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                placeholder="Enter 4-digit PIN"
                placeholderTextColor={colors.textTertiary}
                value={pinInput}
                onChangeText={setPinInput}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                autoFocus
              />
            </View>

            <View style={styles.pinModalActions}>
              <Pressable
                style={[styles.pinCancelButton, { borderColor: colors.border }]}
                onPress={() => setPinModal(prev => ({ ...prev, visible: false }))}
              >
                <Text style={[styles.pinCancelText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.pinConfirmButton, { 
                  backgroundColor: '#10B981',
                  opacity: pinInput.length !== 4 ? 0.5 : 1,
                }]}
                onPress={handlePinSubmit}
                disabled={pinInput.length !== 4}
              >
                <Text style={styles.pinConfirmText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showRejectModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRejectModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.rejectModalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.rejectModalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.rejectModalIcon, { backgroundColor: '#EF444415' }]}>
                <XCircle size={24} color="#EF4444" />
              </View>
              <Text style={[styles.rejectModalTitle, { color: colors.text }]}>Reject Approval</Text>
              <Text style={[styles.rejectModalSubtitle, { color: colors.textSecondary }]}>
                {rejectingItem?.title}
              </Text>
            </View>

            <View style={styles.rejectReasonContainer}>
              <Text style={[styles.rejectReasonLabel, { color: colors.textSecondary }]}>
                Reason (optional)
              </Text>
              <TextInput
                style={[styles.rejectReasonInput, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                placeholder="Enter reason for rejection..."
                placeholderTextColor={colors.textTertiary}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.rejectModalActions}>
              <Pressable
                style={[styles.rejectCancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectingItem(null);
                  setRejectReason('');
                }}
              >
                <Text style={[styles.rejectCancelText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.rejectConfirmButton, { backgroundColor: '#EF4444' }]}
                onPress={handleRejectSubmit}
              >
                <Text style={styles.rejectConfirmText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tabContent: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  deptList: {
    gap: 12,
  },
  deptGroup: {
    gap: 8,
  },
  deptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  deptIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deptInfo: {
    flex: 1,
  },
  deptName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  deptCount: {
    fontSize: 12,
  },
  deptRequests: {
    paddingLeft: 8,
    gap: 10,
  },
  cardList: {
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDetails: {
    gap: 6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  cardNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pinModalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pinModalHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  pinModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pinModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  pinModalSubtitle: {
    fontSize: 14,
  },
  pinInputContainer: {
    padding: 20,
  },
  pinInput: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    letterSpacing: 8,
  },
  pinModalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  pinCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  pinCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pinConfirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  pinConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  rejectModalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    overflow: 'hidden',
  },
  rejectModalHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  rejectModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rejectModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  rejectModalSubtitle: {
    fontSize: 14,
  },
  rejectReasonContainer: {
    padding: 20,
  },
  rejectReasonLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  rejectReasonInput: {
    fontSize: 15,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 80,
  },
  rejectModalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  rejectCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  rejectCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  rejectConfirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  rejectConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
