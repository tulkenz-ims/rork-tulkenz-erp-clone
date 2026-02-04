import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  X,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Package,
  Wrench,
  Landmark,
  Building2,
  Users,
  ChevronRight,
  AlertTriangle,
  Ban,
  User,
  ClipboardCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { 
  POStatus, 
  POType,
  PO_TYPE_LABELS,
  PO_STATUS_LABELS,
  PO_STATUS_COLORS,
} from '@/types/procurement';
import {
  useProcurementPurchaseOrdersQuery,
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
  POLineItem,
} from '@/hooks/useSupabaseProcurement';

type ApprovalTab = 'po' | 'ses';
type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

interface ApprovalItem {
  id: string;
  po_number: string;
  po_type: POType;
  vendor_id?: string | null;
  vendor_name: string;
  department_id?: string | null;
  department_name?: string | null;
  status: POStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  created_at: string;
  created_by: string;
  submitted_date?: string | null;
  notes?: string | null;
  line_items: POLineItem[];
  requester_name?: string;
  submitted_date_display?: string;
}

interface SESApprovalItem {
  ses_id: string;
  ses_number: string;
  po_number: string;
  vendor_name: string;
  department_name: string;
  service_description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by: string;
  submitted_date: string;
  work_completed_date?: string;
}

export default function POApprovalsScreen() {
  const { colors } = useTheme();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<ApprovalTab>('po');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<ApprovalItem | null>(null);
  const [selectedSES, setSelectedSES] = useState<SESApprovalItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [sesItems, setSesItems] = useState<SESApprovalItem[]>([]);

  const statusFilter = useMemo(() => {
    if (filterStatus === 'all') return ['pending_approval', 'approved', 'rejected'] as POStatus[];
    if (filterStatus === 'pending') return ['pending_approval'] as POStatus[];
    return [filterStatus] as POStatus[];
  }, [filterStatus]);

  const { data: purchaseOrders = [], isLoading, refetch, isRefetching } = useProcurementPurchaseOrdersQuery({
    status: statusFilter,
  });

  const approvalItems: ApprovalItem[] = useMemo(() => {
    return purchaseOrders.map((po) => ({
      id: po.id,
      po_number: po.po_number,
      po_type: po.po_type as POType,
      vendor_id: po.vendor_id,
      vendor_name: po.vendor_name,
      department_id: po.department_id,
      department_name: po.department_name,
      status: po.status as POStatus,
      subtotal: po.subtotal,
      tax: po.tax,
      shipping: po.shipping,
      total: po.total,
      created_at: po.created_at,
      created_by: po.created_by,
      submitted_date: po.submitted_date,
      notes: po.notes,
      line_items: (po.line_items || []) as unknown as POLineItem[],
      requester_name: po.created_by,
      submitted_date_display: po.submitted_date
        ? new Date(po.submitted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : new Date(po.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));
  }, [purchaseOrders]);

  const approvePOMutation = useApprovePurchaseOrder({
    onSuccess: () => {
      console.log('[POApprovalsScreen] PO approved successfully');
      refetch();
      setShowDetailModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Approved', `${selectedPO?.po_number} has been approved`);
    },
    onError: (error) => {
      console.error('[POApprovalsScreen] Approve error:', error);
      Alert.alert('Error', 'Failed to approve PO. Please try again.');
    },
  });

  const rejectPOMutation = useRejectPurchaseOrder({
    onSuccess: () => {
      console.log('[POApprovalsScreen] PO rejected successfully');
      refetch();
      setShowRejectModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Rejected', `${selectedPO?.po_number} has been rejected`);
    },
    onError: (error) => {
      console.error('[POApprovalsScreen] Reject error:', error);
      Alert.alert('Error', 'Failed to reject PO. Please try again.');
    },
  });

  const isProcessing = approvePOMutation.isPending || rejectPOMutation.isPending;

  const filteredPOItems = useMemo(() => {
    return approvalItems;
  }, [approvalItems]);

  const filteredSESItems = useMemo(() => {
    if (filterStatus === 'all') return sesItems;
    return sesItems.filter(item => item.status === filterStatus);
  }, [sesItems, filterStatus]);

  const { data: pendingPOsData = [] } = useProcurementPurchaseOrdersQuery({
    status: ['pending_approval'],
  });

  const pendingCount = useMemo(() => ({
    po: pendingPOsData.length,
    ses: sesItems.filter(i => i.status === 'pending').length,
  }), [pendingPOsData.length, sesItems]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getTypeIcon = (type: POType) => {
    switch (type) {
      case 'material':
        return <Package size={14} color="#3B82F6" />;
      case 'service':
        return <Wrench size={14} color="#8B5CF6" />;
      case 'capex':
        return <Landmark size={14} color="#F59E0B" />;
      default:
        return <FileText size={14} color={colors.textSecondary} />;
    }
  };

  const getTypeColor = (type: POType) => {
    switch (type) {
      case 'material': return '#3B82F6';
      case 'service': return '#8B5CF6';
      case 'capex': return '#F59E0B';
      default: return colors.textSecondary;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handlePOPress = (item: ApprovalItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPO(item);
    setSelectedSES(null);
    setApprovalComment('');
    setShowDetailModal(true);
  };

  const handleSESPress = (item: SESApprovalItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSES(item);
    setSelectedPO(null);
    setApprovalComment('');
    setShowDetailModal(true);
  };

  const handleApprove = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (selectedPO) {
      const approverName = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Current User';
      approvePOMutation.mutate({
        poId: selectedPO.id,
        approvedBy: approverName,
      });
    } else if (selectedSES) {
      setSesItems(prev => prev.map(item =>
        item.ses_id === selectedSES.ses_id
          ? { ...item, status: 'approved' }
          : item
      ));
      setShowDetailModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Approved', `${selectedSES.ses_number} has been approved`);
    }
  };

  const handleRejectPress = () => {
    setShowDetailModal(false);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please provide a rejection reason');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (selectedPO) {
      const rejecterName = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Current User';
      rejectPOMutation.mutate({
        poId: selectedPO.id,
        rejectedBy: rejecterName,
      });
    } else if (selectedSES) {
      setSesItems(prev => prev.map(item =>
        item.ses_id === selectedSES.ses_id
          ? { ...item, status: 'rejected' }
          : item
      ));
      setShowRejectModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Rejected', `${selectedSES.ses_number} has been rejected`);
    }
  };

  const renderFilterBadge = () => {
    if (filterStatus === 'all') return null;
    return (
      <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
        <Text style={styles.filterBadgeText}>1</Text>
      </View>
    );
  };

  const renderPOItem = (item: ApprovalItem) => {
    const statusColor = PO_STATUS_COLORS[item.status] || '#6B7280';
    const isPending = item.status === 'pending_approval';

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handlePOPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(item.po_type)}15` }]}>
              {getTypeIcon(item.po_type)}
              <Text style={[styles.typeBadgeText, { color: getTypeColor(item.po_type) }]}>
                {PO_TYPE_LABELS[item.po_type].toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.poNumber, { color: colors.text }]}>{item.po_number}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            {isPending ? <Clock size={12} color={statusColor} /> : 
             item.status === 'approved' ? <CheckCircle size={12} color={statusColor} /> :
             <XCircle size={12} color={statusColor} />}
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {PO_STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.itemBody}>
          <View style={styles.itemRow}>
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.itemRowText, { color: colors.text }]} numberOfLines={1}>
              {item.vendor_name}
            </Text>
          </View>
          <View style={styles.itemRow}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={[styles.itemRowText, { color: colors.textSecondary }]}>
              {item.department_name}
            </Text>
          </View>
        </View>

        <View style={styles.itemFooter}>
          <View style={styles.itemFooterLeft}>
            <User size={12} color={colors.textSecondary} />
            <Text style={[styles.submittedBy, { color: colors.textSecondary }]}>
              {item.requester_name}
            </Text>
            <Text style={[styles.submittedDate, { color: colors.textTertiary }]}>
              • {item.submitted_date_display}
            </Text>
          </View>
          <View style={styles.itemFooterRight}>
            <Text style={[styles.amount, { color: colors.text }]}>{formatCurrency(item.total)}</Text>
            <ChevronRight size={16} color={colors.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSESItem = (item: SESApprovalItem) => {
    const statusColor = item.status === 'pending' ? '#F59E0B' : 
                        item.status === 'approved' ? '#10B981' : '#EF4444';

    return (
      <TouchableOpacity
        key={item.ses_id}
        style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleSESPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <View style={[styles.typeBadge, { backgroundColor: '#10B98115' }]}>
              <ClipboardCheck size={14} color="#10B981" />
              <Text style={[styles.typeBadgeText, { color: '#10B981' }]}>SES</Text>
            </View>
            <Text style={[styles.poNumber, { color: colors.text }]}>{item.ses_number}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            {item.status === 'pending' ? <Clock size={12} color={statusColor} /> :
             item.status === 'approved' ? <CheckCircle size={12} color={statusColor} /> :
             <XCircle size={12} color={statusColor} />}
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.itemBody}>
          <View style={styles.itemRow}>
            <FileText size={14} color={colors.textSecondary} />
            <Text style={[styles.itemRowText, { color: colors.text }]} numberOfLines={1}>
              {item.service_description}
            </Text>
          </View>
          <View style={styles.itemRow}>
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.itemRowText, { color: colors.textSecondary }]}>
              {item.vendor_name} • PO: {item.po_number}
            </Text>
          </View>
        </View>

        <View style={styles.itemFooter}>
          <View style={styles.itemFooterLeft}>
            <User size={12} color={colors.textSecondary} />
            <Text style={[styles.submittedBy, { color: colors.textSecondary }]}>
              {item.submitted_by}
            </Text>
            <Text style={[styles.submittedDate, { color: colors.textTertiary }]}>
              • {item.submitted_date}
            </Text>
          </View>
          <View style={styles.itemFooterRight}>
            <Text style={[styles.amount, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
            <ChevronRight size={16} color={colors.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    const item = selectedPO || selectedSES;
    if (!item) return null;

    const isPO = !!selectedPO;
    const isPending = isPO 
      ? selectedPO?.status === 'pending_approval'
      : selectedSES?.status === 'pending';

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)} disabled={isProcessing}>
              <X size={24} color={isProcessing ? colors.textTertiary : colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isPO ? 'PO Details' : 'SES Details'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {isPO && selectedPO && (
              <>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailHeader}>
                    <View style={[styles.typeBadgeLarge, { backgroundColor: `${getTypeColor(selectedPO.po_type)}15` }]}>
                      {getTypeIcon(selectedPO.po_type)}
                      <Text style={[styles.typeBadgeTextLarge, { color: getTypeColor(selectedPO.po_type) }]}>
                        {PO_TYPE_LABELS[selectedPO.po_type]}
                      </Text>
                    </View>
                    <Text style={[styles.detailPONumber, { color: colors.text }]}>{selectedPO.po_number}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Vendor</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPO.vendor_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Department</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPO.department_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Submitted By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPO.requester_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPO.submitted_date_display}</Text>
                  </View>
                </View>

                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.detailCardTitle, { color: colors.text }]}>Line Items</Text>
                  {selectedPO.line_items.filter(li => !li.is_deleted).map((line, idx) => (
                    <View key={line.line_id} style={[styles.lineItem, { borderBottomColor: colors.border }]}>
                      <View style={styles.lineItemHeader}>
                        <Text style={[styles.lineNumber, { color: colors.textSecondary }]}>#{idx + 1}</Text>
                        <Text style={[styles.lineTotal, { color: colors.text }]}>{formatCurrency(line.line_total)}</Text>
                      </View>
                      <Text style={[styles.lineDescription, { color: colors.text }]}>{line.description}</Text>
                      <Text style={[styles.lineQty, { color: colors.textSecondary }]}>
                        Qty: {line.quantity} × {formatCurrency(line.unit_price)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.detailCardTitle, { color: colors.text }]}>Totals</Text>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(selectedPO.subtotal)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tax</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(selectedPO.tax)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Shipping</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(selectedPO.shipping)}</Text>
                  </View>
                  <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                    <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(selectedPO.total)}</Text>
                  </View>
                </View>

                {selectedPO.notes && (
                  <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.detailCardTitle, { color: colors.text }]}>Notes</Text>
                    <Text style={[styles.notesText, { color: colors.text }]}>{selectedPO.notes}</Text>
                  </View>
                )}
              </>
            )}

            {!isPO && selectedSES && (
              <>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailHeader}>
                    <View style={[styles.typeBadgeLarge, { backgroundColor: '#10B98115' }]}>
                      <ClipboardCheck size={16} color="#10B981" />
                      <Text style={[styles.typeBadgeTextLarge, { color: '#10B981' }]}>SES</Text>
                    </View>
                    <Text style={[styles.detailPONumber, { color: colors.text }]}>{selectedSES.ses_number}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>PO Reference</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSES.po_number}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Vendor</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSES.vendor_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Department</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSES.department_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Submitted By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSES.submitted_by}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Work Completed</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSES.work_completed_date}</Text>
                  </View>
                </View>

                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.detailCardTitle, { color: colors.text }]}>Service Details</Text>
                  <Text style={[styles.serviceDescription, { color: colors.text }]}>{selectedSES.service_description}</Text>
                  <View style={[styles.totalRow, { borderTopColor: colors.border, marginTop: 12 }]}>
                    <Text style={[styles.totalLabel, { color: colors.text }]}>Amount</Text>
                    <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(selectedSES.amount)}</Text>
                  </View>
                </View>
              </>
            )}

            {isPending && (
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailCardTitle, { color: colors.text }]}>Comments (Optional)</Text>
                <TextInput
                  style={[styles.commentInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={approvalComment}
                  onChangeText={setApprovalComment}
                  placeholder="Add a comment..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}

            {isPending && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.rejectButton, { borderColor: '#EF4444' }]}
                  onPress={handleRejectPress}
                  disabled={isProcessing}
                >
                  <Ban size={18} color="#EF4444" />
                  <Text style={[styles.rejectButtonText, { color: '#EF4444' }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveButton, { backgroundColor: '#10B981', opacity: isProcessing ? 0.7 : 1 }]}
                  onPress={handleApprove}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <CheckCircle size={18} color="#fff" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {!isPending && (
              <View style={[styles.alreadyProcessed, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AlertTriangle size={20} color={colors.textSecondary} />
                <Text style={[styles.alreadyProcessedText, { color: colors.textSecondary }]}>
                  This {isPO ? 'PO' : 'SES'} has already been {isPO ? PO_STATUS_LABELS[selectedPO?.status || 'draft'] : selectedSES?.status}
                </Text>
              </View>
            )}

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderRejectModal = () => (
    <Modal
      visible={showRejectModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowRejectModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowRejectModal(false)} disabled={isProcessing}>
            <X size={24} color={isProcessing ? colors.textTertiary : colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Reject</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.rejectModalContent}>
          <View style={[styles.rejectWarning, { backgroundColor: '#EF444415' }]}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={[styles.rejectWarningText, { color: '#EF4444' }]}>
              You are about to reject {selectedPO?.po_number || selectedSES?.ses_number}
            </Text>
          </View>

          <Text style={[styles.rejectLabel, { color: colors.text }]}>Rejection Reason *</Text>
          <TextInput
            style={[styles.rejectInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={rejectionReason}
            onChangeText={setRejectionReason}
            placeholder="Please provide a reason for rejection..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.confirmRejectButton, { backgroundColor: '#EF4444', opacity: isProcessing ? 0.7 : 1 }]}
            onPress={handleConfirmReject}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <XCircle size={18} color="#fff" />
                <Text style={styles.confirmRejectButtonText}>Confirm Rejection</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowFilterModal(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filter</Text>
          <TouchableOpacity onPress={() => { setFilterStatus('all'); setShowFilterModal(false); }}>
            <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterOptions}>
          {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterOption,
                { borderColor: colors.border },
                filterStatus === status && { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setFilterStatus(status);
                setShowFilterModal(false);
              }}
            >
              <Text style={[
                styles.filterOptionText,
                { color: filterStatus === status ? colors.primary : colors.text },
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
              {filterStatus === status && <CheckCircle size={18} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Approvals' }} />

      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'po' && { borderBottomColor: colors.primary }]}
          onPress={() => { Haptics.selectionAsync(); setActiveTab('po'); }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'po' ? colors.primary : colors.textSecondary }]}>
            PO Approvals
          </Text>
          {pendingCount.po > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.tabBadgeText}>{pendingCount.po}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ses' && { borderBottomColor: colors.primary }]}
          onPress={() => { Haptics.selectionAsync(); setActiveTab('ses'); }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'ses' ? colors.primary : colors.textSecondary }]}>
            SES Approvals
          </Text>
          {pendingCount.ses > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.tabBadgeText}>{pendingCount.ses}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.filterBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={16} color={colors.text} />
          <Text style={[styles.filterButtonText, { color: colors.text }]}>
            {filterStatus === 'all' ? 'Filter' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
          </Text>
          {renderFilterBadge()}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {activeTab === 'po' && (
          <>
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary, marginTop: 12 }]}>
                  Loading approvals...
                </Text>
              </View>
            ) : filteredPOItems.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No POs Found</Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  {filterStatus === 'pending' 
                    ? 'No pending approvals at this time'
                    : 'No purchase orders match your filter'}
                </Text>
              </View>
            ) : (
              filteredPOItems.map(renderPOItem)
            )}
          </>
        )}

        {activeTab === 'ses' && (
          <>
            {filteredSESItems.length === 0 ? (
              <View style={styles.emptyState}>
                <ClipboardCheck size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No SES Found</Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  {filterStatus === 'pending'
                    ? 'No pending service entry sheets'
                    : 'No SES records match your filter'}
                </Text>
              </View>
            ) : (
              filteredSESItems.map(renderSESItem)
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderDetailModal()}
      {renderRejectModal()}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  filterBar: {
    flexDirection: 'row',
    padding: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  filterBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  poNumber: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  itemBody: {
    gap: 6,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemRowText: {
    fontSize: 14,
    flex: 1,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  itemFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  submittedBy: {
    fontSize: 12,
  },
  submittedDate: {
    fontSize: 12,
  },
  itemFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  bottomPadding: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  clearText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalBottomPadding: {
    height: 40,
  },
  filterOptions: {
    padding: 16,
    gap: 10,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  typeBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  typeBadgeTextLarge: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  detailPONumber: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'right' as const,
    flex: 1,
    marginLeft: 16,
  },
  lineItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lineNumber: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  lineDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  lineQty: {
    fontSize: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  serviceDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  alreadyProcessed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  alreadyProcessedText: {
    fontSize: 14,
  },
  rejectModalContent: {
    padding: 16,
  },
  rejectWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  rejectWarningText: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  rejectLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  rejectInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 120,
    marginBottom: 20,
  },
  confirmRejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  confirmRejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
