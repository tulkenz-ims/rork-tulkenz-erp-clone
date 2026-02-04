import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Package,
  Wrench,
  Building2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useProcurementPurchaseOrdersQuery,
  usePurchaseRequisitionsQuery,
  usePOApprovalsQuery,
  useProcessApprovalAndUpdateStatus,
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
  useApproveRequisition,
  useRejectRequisition,
  POLineItem,
  RequisitionLineItem,
} from '@/hooks/useSupabaseProcurement';
import {
  POType,
  POStatus,
  PO_TYPE_LABELS,
  PO_STATUS_LABELS,
  PO_STATUS_COLORS,
  RequisitionStatus,
  REQUISITION_STATUS_LABELS,
  REQUISITION_STATUS_COLORS,
} from '@/types/procurement';

type TabType = 'pending' | 'all' | 'history';
type ApprovalType = 'all' | 'po' | 'requisition';

const PO_TYPE_COLORS: Record<POType, string> = {
  material: '#3B82F6',
  service: '#10B981',
  capex: '#F59E0B',
};

const PO_TYPE_ICONS: Record<POType, React.ComponentType<{ size: number; color: string }>> = {
  material: Package,
  service: Wrench,
  capex: Building2,
};

interface ApprovalItem {
  id: string;
  type: 'po' | 'requisition';
  number: string;
  vendorName: string;
  total: number;
  status: string;
  createdAt: string;
  createdBy: string;
  poType: POType;
  lineItems: POLineItem[] | RequisitionLineItem[];
  notes?: string;
  submittedDate?: string;
  approvalId?: string;
  tier?: number;
  tierName?: string;
}

export default function POApprovalScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [approvalTypeFilter, setApprovalTypeFilter] = useState<ApprovalType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const {
    data: pendingPOs,
    isLoading: isLoadingPOs,
    refetch: refetchPOs,
    isRefetching: isRefetchingPOs,
  } = useProcurementPurchaseOrdersQuery({
    status: activeTab === 'pending' ? 'pending_approval' : undefined,
  });

  const {
    data: pendingRequisitions,
    isLoading: isLoadingReqs,
    refetch: refetchReqs,
    isRefetching: isRefetchingReqs,
  } = usePurchaseRequisitionsQuery({
    status: activeTab === 'pending' ? 'pending_approval' : undefined,
  });

  const {
    data: poApprovals,
    isLoading: isLoadingApprovals,
    refetch: refetchApprovals,
    isRefetching: isRefetchingApprovals,
  } = usePOApprovalsQuery({
    approverId: user?.id,
    status: activeTab === 'pending' ? 'pending' : undefined,
  });

  const processApproval = useProcessApprovalAndUpdateStatus({
    onSuccess: () => {
      console.log('[POApprovalScreen] Approval processed successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchAll();
      setShowApprovalModal(false);
      setSelectedItem(null);
      setApprovalComments('');
    },
    onError: (error) => {
      console.error('[POApprovalScreen] Approval error:', error);
      Alert.alert('Error', error.message || 'Failed to process approval');
    },
  });

  const approvePO = useApprovePurchaseOrder({
    onSuccess: () => {
      console.log('[POApprovalScreen] PO approved successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchAll();
      setShowApprovalModal(false);
      setSelectedItem(null);
      setApprovalComments('');
    },
    onError: (error) => {
      console.error('[POApprovalScreen] Approve PO error:', error);
      Alert.alert('Error', error.message || 'Failed to approve PO');
    },
  });

  const rejectPO = useRejectPurchaseOrder({
    onSuccess: () => {
      console.log('[POApprovalScreen] PO rejected successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchAll();
      setShowApprovalModal(false);
      setSelectedItem(null);
      setApprovalComments('');
    },
    onError: (error) => {
      console.error('[POApprovalScreen] Reject PO error:', error);
      Alert.alert('Error', error.message || 'Failed to reject PO');
    },
  });

  const approveRequisition = useApproveRequisition({
    onSuccess: () => {
      console.log('[POApprovalScreen] Requisition approved successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchAll();
      setShowApprovalModal(false);
      setSelectedItem(null);
      setApprovalComments('');
    },
    onError: (error) => {
      console.error('[POApprovalScreen] Approve requisition error:', error);
      Alert.alert('Error', error.message || 'Failed to approve requisition');
    },
  });

  const rejectRequisition = useRejectRequisition({
    onSuccess: () => {
      console.log('[POApprovalScreen] Requisition rejected successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchAll();
      setShowApprovalModal(false);
      setSelectedItem(null);
      setApprovalComments('');
    },
    onError: (error) => {
      console.error('[POApprovalScreen] Reject requisition error:', error);
      Alert.alert('Error', error.message || 'Failed to reject requisition');
    },
  });

  const isLoading = isLoadingPOs || isLoadingReqs || isLoadingApprovals;
  const isRefetching = isRefetchingPOs || isRefetchingReqs || isRefetchingApprovals;

  const refetchAll = useCallback(() => {
    console.log('[POApprovalScreen] Refreshing all data...');
    refetchPOs();
    refetchReqs();
    refetchApprovals();
  }, [refetchPOs, refetchReqs, refetchApprovals]);

  const approvalItems = useMemo((): ApprovalItem[] => {
    const items: ApprovalItem[] = [];

    if (approvalTypeFilter === 'all' || approvalTypeFilter === 'po') {
      (pendingPOs || []).forEach((po) => {
        const matchingApproval = poApprovals?.find((a) => a.po_id === po.id);
        items.push({
          id: po.id,
          type: 'po',
          number: po.po_number,
          vendorName: po.vendor_name,
          total: po.total,
          status: po.status,
          createdAt: po.created_at,
          createdBy: po.created_by,
          poType: po.po_type as POType,
          lineItems: (po.line_items || []) as unknown as POLineItem[],
          notes: po.notes || undefined,
          submittedDate: po.submitted_date || undefined,
          approvalId: matchingApproval?.id,
          tier: matchingApproval?.tier,
          tierName: matchingApproval?.tier_name || undefined,
        });
      });
    }

    if (approvalTypeFilter === 'all' || approvalTypeFilter === 'requisition') {
      (pendingRequisitions || []).forEach((req) => {
        const matchingApproval = poApprovals?.find((a) => a.requisition_id === req.id);
        items.push({
          id: req.id,
          type: 'requisition',
          number: req.requisition_number,
          vendorName: req.vendor_name || 'Not Assigned',
          total: req.total,
          status: req.status,
          createdAt: req.created_at,
          createdBy: req.created_by_name,
          poType: req.requisition_type as POType,
          lineItems: (req.line_items || []) as unknown as RequisitionLineItem[],
          notes: req.notes || undefined,
          submittedDate: req.requested_date || undefined,
          approvalId: matchingApproval?.id,
          tier: matchingApproval?.tier,
          tierName: matchingApproval?.tier_name || undefined,
        });
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return items.filter(
        (item) =>
          item.number.toLowerCase().includes(query) ||
          item.vendorName.toLowerCase().includes(query) ||
          item.createdBy.toLowerCase().includes(query)
      );
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [pendingPOs, pendingRequisitions, poApprovals, approvalTypeFilter, searchQuery]);

  const stats = useMemo(() => {
    const pendingPOCount = (pendingPOs || []).filter((po) => po.status === 'pending_approval').length;
    const pendingReqCount = (pendingRequisitions || []).filter((req) => req.status === 'pending_approval').length;
    const totalPendingValue = approvalItems.reduce((sum, item) => sum + item.total, 0);
    const myPendingCount = poApprovals?.filter((a) => a.status === 'pending').length || 0;

    return {
      pendingPOs: pendingPOCount,
      pendingRequisitions: pendingReqCount,
      totalPending: pendingPOCount + pendingReqCount,
      totalPendingValue,
      myPendingCount,
    };
  }, [pendingPOs, pendingRequisitions, approvalItems, poApprovals]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const toggleExpanded = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openDetailModal = (item: ApprovalItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const openApprovalModal = (item: ApprovalItem, action: 'approve' | 'reject') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedItem(item);
    setApprovalAction(action);
    setApprovalComments('');
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = async () => {
    if (!selectedItem || !user) return;

    const userName = `${user.first_name} ${user.last_name}`;

    if (selectedItem.approvalId) {
      processApproval.mutate({
        approvalId: selectedItem.approvalId,
        decision: approvalAction === 'approve' ? 'approved' : 'rejected',
        comments: approvalComments || undefined,
      });
    } else {
      if (selectedItem.type === 'po') {
        if (approvalAction === 'approve') {
          approvePO.mutate({ poId: selectedItem.id, approvedBy: userName });
        } else {
          rejectPO.mutate({ poId: selectedItem.id, rejectedBy: userName });
        }
      } else {
        if (approvalAction === 'approve') {
          approveRequisition.mutate({ requisitionId: selectedItem.id, approvedBy: userName });
        } else {
          rejectRequisition.mutate({
            requisitionId: selectedItem.id,
            rejectedBy: userName,
            reason: approvalComments || undefined,
          });
        }
      }
    }
  };

  const isProcessing =
    processApproval.isPending ||
    approvePO.isPending ||
    rejectPO.isPending ||
    approveRequisition.isPending ||
    rejectRequisition.isPending;

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: React.ComponentType<{ size: number; color: string }>,
    iconColor: string
  ) => {
    const IconComponent = icon;
    return (
      <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.statIconContainer, { backgroundColor: `${iconColor}15` }]}>
          <IconComponent size={18} color={iconColor} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
    );
  };

  const renderApprovalCard = (item: ApprovalItem) => {
    const typeColor = PO_TYPE_COLORS[item.poType];
    const TypeIcon = PO_TYPE_ICONS[item.poType];
    const isExpanded = expandedItems.has(item.id);
    const statusColor = item.type === 'po' 
      ? PO_STATUS_COLORS[item.status as POStatus] 
      : REQUISITION_STATUS_COLORS[item.status as RequisitionStatus];
    const statusLabel = item.type === 'po'
      ? PO_STATUS_LABELS[item.status as POStatus]
      : REQUISITION_STATUS_LABELS[item.status as RequisitionStatus];

    return (
      <View
        key={item.id}
        style={[styles.approvalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <TouchableOpacity
          style={styles.approvalCardHeader}
          onPress={() => toggleExpanded(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.approvalCardLeft}>
            <View style={[styles.typeIconContainer, { backgroundColor: `${typeColor}15` }]}>
              <TypeIcon size={20} color={typeColor} />
            </View>
            <View style={styles.approvalCardInfo}>
              <View style={styles.approvalCardTitleRow}>
                <Text style={[styles.approvalNumber, { color: colors.text }]}>{item.number}</Text>
                <View style={[styles.typeBadge, { backgroundColor: `${typeColor}10` }]}>
                  <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                    {item.type === 'po' ? 'PO' : 'REQ'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.vendorName, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.vendorName}
              </Text>
            </View>
          </View>
          <View style={styles.approvalCardRight}>
            <Text style={[styles.totalAmount, { color: colors.text }]}>{formatCurrency(item.total)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={20} color={colors.textTertiary} />
            ) : (
              <ChevronDown size={20} color={colors.textTertiary} />
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <User size={14} color={colors.textTertiary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>{item.createdBy}</Text>
              </View>
              <View style={styles.detailItem}>
                <Calendar size={14} color={colors.textTertiary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </View>

            {item.tierName && (
              <View style={styles.tierInfo}>
                <Text style={[styles.tierLabel, { color: colors.textTertiary }]}>Approval Tier:</Text>
                <Text style={[styles.tierValue, { color: colors.text }]}>
                  {item.tierName} (Level {item.tier})
                </Text>
              </View>
            )}

            <View style={styles.lineItemsHeader}>
              <Text style={[styles.lineItemsTitle, { color: colors.text }]}>
                Line Items ({item.lineItems.length})
              </Text>
            </View>

            {item.lineItems.slice(0, 3).map((lineItem, index) => (
              <View
                key={index}
                style={[styles.lineItem, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.lineItemDesc, { color: colors.text }]} numberOfLines={1}>
                  {lineItem.description}
                </Text>
                <View style={styles.lineItemDetails}>
                  <Text style={[styles.lineItemQty, { color: colors.textSecondary }]}>
                    Qty: {lineItem.quantity}
                  </Text>
                  <Text style={[styles.lineItemTotal, { color: colors.text }]}>
                    {formatCurrency(lineItem.line_total)}
                  </Text>
                </View>
              </View>
            ))}

            {item.lineItems.length > 3 && (
              <TouchableOpacity onPress={() => openDetailModal(item)}>
                <Text style={[styles.viewMoreText, { color: colors.primary }]}>
                  +{item.lineItems.length - 3} more items
                </Text>
              </TouchableOpacity>
            )}

            {item.notes && (
              <View style={[styles.notesContainer, { backgroundColor: colors.background }]}>
                <MessageSquare size={14} color={colors.textTertiary} />
                <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.notes}
                </Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.rejectButton, { borderColor: '#EF4444' }]}
                onPress={() => openApprovalModal(item, 'reject')}
                activeOpacity={0.7}
              >
                <XCircle size={18} color="#EF4444" />
                <Text style={[styles.rejectButtonText, { color: '#EF4444' }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveButton, { backgroundColor: '#10B981' }]}
                onPress={() => openApprovalModal(item, 'approve')}
                activeOpacity={0.7}
              >
                <CheckCircle size={18} color="#fff" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedItem) return null;

    const typeColor = PO_TYPE_COLORS[selectedItem.poType];
    const TypeIcon = PO_TYPE_ICONS[selectedItem.poType];

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedItem.number}</Text>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailSectionHeader}>
                <View style={[styles.typeIconContainer, { backgroundColor: `${typeColor}15` }]}>
                  <TypeIcon size={20} color={typeColor} />
                </View>
                <View>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                    {PO_TYPE_LABELS[selectedItem.poType]} {selectedItem.type === 'po' ? 'Purchase Order' : 'Requisition'}
                  </Text>
                  <Text style={[styles.detailSectionSubtitle, { color: colors.textSecondary }]}>
                    {selectedItem.vendorName}
                  </Text>
                </View>
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Created By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedItem.createdBy}</Text>
                </View>
                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Created Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedItem.createdAt)}</Text>
                </View>
                {selectedItem.submittedDate && (
                  <View style={styles.detailGridItem}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Submitted</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(selectedItem.submittedDate)}
                    </Text>
                  </View>
                )}
                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Total</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(selectedItem.total)}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Line Items ({selectedItem.lineItems.length})
              </Text>
              {selectedItem.lineItems.map((lineItem, index) => (
                <View
                  key={index}
                  style={[styles.modalLineItem, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.modalLineItemHeader}>
                    <Text style={[styles.modalLineItemNum, { color: colors.textTertiary }]}>#{index + 1}</Text>
                    <Text style={[styles.modalLineItemTotal, { color: colors.text }]}>
                      {formatCurrency(lineItem.line_total)}
                    </Text>
                  </View>
                  <Text style={[styles.modalLineItemDesc, { color: colors.text }]}>{lineItem.description}</Text>
                  <View style={styles.modalLineItemDetails}>
                    <Text style={[styles.modalLineItemQty, { color: colors.textSecondary }]}>
                      Qty: {lineItem.quantity} × {formatCurrency(lineItem.unit_price)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {selectedItem.notes && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
                <Text style={[styles.notesFullText, { color: colors.textSecondary }]}>{selectedItem.notes}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalRejectButton, { borderColor: '#EF4444' }]}
                onPress={() => {
                  setShowDetailModal(false);
                  setTimeout(() => openApprovalModal(selectedItem, 'reject'), 300);
                }}
                activeOpacity={0.7}
              >
                <XCircle size={20} color="#EF4444" />
                <Text style={[styles.modalRejectButtonText, { color: '#EF4444' }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalApproveButton, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  setShowDetailModal(false);
                  setTimeout(() => openApprovalModal(selectedItem, 'approve'), 300);
                }}
                activeOpacity={0.7}
              >
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.modalApproveButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderApprovalModal = () => {
    if (!selectedItem) return null;

    const isApproving = approvalAction === 'approve';

    return (
      <Modal
        visible={showApprovalModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowApprovalModal(false)}
      >
        <View style={styles.approvalModalOverlay}>
          <View style={[styles.approvalModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.approvalModalHeader}>
              <View
                style={[
                  styles.approvalModalIcon,
                  { backgroundColor: isApproving ? '#10B98115' : '#EF444415' },
                ]}
              >
                {isApproving ? (
                  <CheckCircle2 size={32} color="#10B981" />
                ) : (
                  <AlertCircle size={32} color="#EF4444" />
                )}
              </View>
              <Text style={[styles.approvalModalTitle, { color: colors.text }]}>
                {isApproving ? 'Approve' : 'Reject'} {selectedItem.number}?
              </Text>
              <Text style={[styles.approvalModalSubtitle, { color: colors.textSecondary }]}>
                {selectedItem.vendorName} • {formatCurrency(selectedItem.total)}
              </Text>
            </View>

            <View style={styles.commentsContainer}>
              <Text style={[styles.commentsLabel, { color: colors.text }]}>
                Comments {!isApproving && <Text style={{ color: '#EF4444' }}>*</Text>}
              </Text>
              <TextInput
                style={[
                  styles.commentsInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder={isApproving ? 'Optional comments...' : 'Reason for rejection...'}
                placeholderTextColor={colors.textTertiary}
                value={approvalComments}
                onChangeText={setApprovalComments}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.approvalModalActions}>
              <TouchableOpacity
                style={[styles.approvalModalCancel, { borderColor: colors.border }]}
                onPress={() => setShowApprovalModal(false)}
                disabled={isProcessing}
              >
                <Text style={[styles.approvalModalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.approvalModalConfirm,
                  { backgroundColor: isApproving ? '#10B981' : '#EF4444' },
                  (!isApproving && !approvalComments) && styles.disabledButton,
                ]}
                onPress={handleApprovalSubmit}
                disabled={isProcessing || (!isApproving && !approvalComments)}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    {isApproving ? (
                      <CheckCircle size={18} color="#fff" />
                    ) : (
                      <XCircle size={18} color="#fff" />
                    )}
                    <Text style={styles.approvalModalConfirmText}>
                      {isApproving ? 'Approve' : 'Reject'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'PO Approvals' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading approvals...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'PO Approvals' }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetchAll} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          {renderStatCard('My Queue', stats.myPendingCount, User, colors.primary)}
          {renderStatCard('PO Pending', stats.pendingPOs, FileText, '#F59E0B')}
          {renderStatCard('Req Pending', stats.pendingRequisitions, Clock, '#8B5CF6')}
          {renderStatCard('Total Value', formatCurrency(stats.totalPendingValue), DollarSign, '#10B981')}
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by PO #, vendor, or requestor..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'po', 'requisition'] as ApprovalType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: approvalTypeFilter === type ? colors.primary : colors.surface,
                    borderColor: approvalTypeFilter === type ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setApprovalTypeFilter(type);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: approvalTypeFilter === type ? '#fff' : colors.text },
                  ]}
                >
                  {type === 'all' ? 'All Types' : type === 'po' ? 'Purchase Orders' : 'Requisitions'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {approvalItems.length > 0 ? (
          <View style={styles.approvalList}>
            {approvalItems.map(renderApprovalCard)}
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <CheckCircle size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Pending Approvals</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery
                ? 'No approvals match your search criteria'
                : 'All approvals have been processed'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderDetailModal()}
      {renderApprovalModal()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  approvalList: {
    gap: 12,
  },
  approvalCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  approvalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  approvalCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalCardInfo: {
    flex: 1,
  },
  approvalCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approvalNumber: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  vendorName: {
    fontSize: 13,
    marginTop: 2,
  },
  approvalCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  expandedContent: {
    padding: 14,
    borderTopWidth: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tierLabel: {
    fontSize: 12,
  },
  tierValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  lineItemsHeader: {
    marginBottom: 8,
  },
  lineItemsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  lineItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  lineItemDesc: {
    fontSize: 13,
    marginBottom: 4,
  },
  lineItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineItemQty: {
    fontSize: 12,
  },
  lineItemTotal: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 8,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  bottomPadding: {
    height: 24,
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
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  detailSectionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailGridItem: {
    width: '45%',
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  modalLineItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalLineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalLineItemNum: {
    fontSize: 12,
  },
  modalLineItemTotal: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalLineItemDesc: {
    fontSize: 14,
    marginBottom: 4,
  },
  modalLineItemDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  modalLineItemQty: {
    fontSize: 13,
  },
  notesFullText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  modalRejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  modalRejectButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalApproveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalApproveButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  approvalModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  approvalModalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
  },
  approvalModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  approvalModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  approvalModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  approvalModalSubtitle: {
    fontSize: 14,
  },
  commentsContainer: {
    marginBottom: 20,
  },
  commentsLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  commentsInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontSize: 15,
  },
  approvalModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  approvalModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  approvalModalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  approvalModalConfirm: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approvalModalConfirmText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
