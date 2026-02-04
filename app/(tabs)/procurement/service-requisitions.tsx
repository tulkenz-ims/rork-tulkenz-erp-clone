import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Search,
  X,
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Building,
  Calendar,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Send,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useServiceRequisitionsQuery,
  ServiceRequisition,
  useApproveServiceRequisition,
  useRejectServiceRequisition,
} from '@/hooks/useSupabaseProcurementExtended';
import {
  SERVICE_REQUISITION_STATUS_LABELS,
  SERVICE_REQUISITION_STATUS_COLORS,
  APPROVAL_TIER_LABELS,
} from '@/types/procurement';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'posted';

const FILTER_OPTIONS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'posted', label: 'Posted' },
];

export default function ServiceRequisitionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<ServiceRequisition | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requisitions = [], isLoading, refetch } = useServiceRequisitionsQuery({});

  const approveRequisition = useApproveServiceRequisition({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Requisition approved');
      setShowApprovalModal(false);
      setSelectedRequisition(null);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const rejectRequisition = useRejectServiceRequisition({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Rejected', 'Requisition has been rejected');
      setShowRejectModal(false);
      setSelectedRequisition(null);
      setRejectionReason('');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const filteredRequisitions = useMemo(() => {
    let filtered = requisitions;

    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        filtered = filtered.filter(r => r.status === 'pending_tier2_approval' || r.status === 'pending_tier3_approval');
      } else {
        filtered = filtered.filter(r => r.status === filterStatus);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.requisition_number.toLowerCase().includes(query) ||
        r.vendor_name.toLowerCase().includes(query) ||
        r.source_po_number.toLowerCase().includes(query) ||
        r.service_type.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [requisitions, filterStatus, searchQuery]);

  const pendingCount = useMemo(() => {
    return requisitions.filter(r => r.status === 'pending_tier2_approval' || r.status === 'pending_tier3_approval').length;
  }, [requisitions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleApprove = (req: ServiceRequisition) => {
    setSelectedRequisition(req);
    setShowApprovalModal(true);
  };

  const handleReject = (req: ServiceRequisition) => {
    setSelectedRequisition(req);
    setShowRejectModal(true);
  };

  const confirmApproval = () => {
    if (!selectedRequisition) return;
    const approverName = user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.email || 'Unknown';
    
    approveRequisition.mutate({
      id: selectedRequisition.id,
      tier: selectedRequisition.current_approval_tier,
      approvedBy: approverName,
    });
  };

  const confirmRejection = () => {
    if (!selectedRequisition) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }
    const rejecterName = user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.email || 'Unknown';

    rejectRequisition.mutate({
      id: selectedRequisition.id,
      rejectedBy: rejecterName,
      reason: rejectionReason,
    });
  };

  const handlePostToSES = (req: ServiceRequisition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/procurement/ses-post',
      params: { requisitionId: req.id },
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} color="#10B981" />;
      case 'rejected':
        return <XCircle size={16} color="#EF4444" />;
      case 'posted':
        return <FileText size={16} color="#059669" />;
      default:
        return <Clock size={16} color="#F59E0B" />;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchSection: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
    },
    filterSection: {
      paddingVertical: 12,
    },
    filterScroll: {
      paddingHorizontal: 16,
      gap: 8,
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
    pendingBadge: {
      backgroundColor: '#F59E0B',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 6,
    },
    pendingBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600' as const,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    reqIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reqNumber: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    reqDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 6,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    cardBody: {
      padding: 14,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    amountSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    amountLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    amountValue: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
    },
    varianceSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    varianceText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    cardFooter: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 6,
    },
    footerButtonText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    footerDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 12,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
      color: colors.text,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
    },
    modalCardTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 12,
    },
    modalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    modalLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    modalValue: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.text,
    },
    tierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F59E0B15',
      padding: 12,
      borderRadius: 10,
      gap: 10,
      marginBottom: 16,
    },
    tierText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#F59E0B',
    },
    rejectInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    confirmButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 10,
      gap: 8,
    },
    confirmButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#fff',
    },
  });

  const renderApprovalModal = () => (
    <Modal
      visible={showApprovalModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowApprovalModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowApprovalModal(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Approve Requisition</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedRequisition && (
            <>
              <View style={styles.tierBadge}>
                <CheckCircle size={20} color="#F59E0B" />
                <Text style={styles.tierText}>
                  {APPROVAL_TIER_LABELS[selectedRequisition.current_approval_tier]} Approval
                </Text>
              </View>

              <View style={styles.modalCard}>
                <Text style={styles.modalCardTitle}>Requisition Details</Text>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Requisition #</Text>
                  <Text style={styles.modalValue}>{selectedRequisition.requisition_number}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Source PO</Text>
                  <Text style={styles.modalValue}>{selectedRequisition.source_po_number}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Vendor</Text>
                  <Text style={styles.modalValue}>{selectedRequisition.vendor_name}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Service Type</Text>
                  <Text style={styles.modalValue}>{selectedRequisition.service_type}</Text>
                </View>
              </View>

              <View style={styles.modalCard}>
                <Text style={styles.modalCardTitle}>Invoice Details</Text>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Invoice #</Text>
                  <Text style={styles.modalValue}>{selectedRequisition.invoice_number || '-'}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Invoice Amount</Text>
                  <Text style={[styles.modalValue, { fontWeight: '700' as const }]}>
                    {formatCurrency(selectedRequisition.invoice_amount)}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Original Estimate</Text>
                  <Text style={styles.modalValue}>{formatCurrency(selectedRequisition.original_estimate)}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Variance</Text>
                  <Text style={[styles.modalValue, { 
                    color: selectedRequisition.variance > 0 ? '#EF4444' : selectedRequisition.variance < 0 ? '#10B981' : colors.text 
                  }]}>
                    {selectedRequisition.variance > 0 ? '+' : ''}{formatCurrency(selectedRequisition.variance)} ({selectedRequisition.variance_percent.toFixed(1)}%)
                  </Text>
                </View>
                {selectedRequisition.variance_reason && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.modalLabel}>Variance Reason</Text>
                    <Text style={[styles.modalValue, { marginTop: 4 }]}>{selectedRequisition.variance_reason}</Text>
                  </View>
                )}
              </View>

              {selectedRequisition.required_tiers.length > 1 && selectedRequisition.current_approval_tier === 2 && (
                <View style={[styles.modalCard, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF6' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={16} color="#8B5CF6" />
                    <Text style={[styles.modalCardTitle, { color: '#8B5CF6', marginBottom: 0 }]}>
                      Additional Approval Required
                    </Text>
                  </View>
                  <Text style={[styles.modalLabel, { marginTop: 8 }]}>
                    After your approval, this will require {APPROVAL_TIER_LABELS[3]} approval.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowApprovalModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: '#10B981' }]}
            onPress={confirmApproval}
            disabled={approveRequisition.isPending}
          >
            {approveRequisition.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CheckCircle size={18} color="#fff" />
                <Text style={styles.confirmButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderRejectModal = () => (
    <Modal
      visible={showRejectModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowRejectModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowRejectModal(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Reject Requisition</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedRequisition && (
            <>
              <View style={styles.modalCard}>
                <Text style={styles.modalCardTitle}>Requisition Details</Text>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Requisition #</Text>
                  <Text style={styles.modalValue}>{selectedRequisition.requisition_number}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Vendor</Text>
                  <Text style={styles.modalValue}>{selectedRequisition.vendor_name}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Invoice Amount</Text>
                  <Text style={styles.modalValue}>{formatCurrency(selectedRequisition.invoice_amount)}</Text>
                </View>
              </View>

              <View style={styles.modalCard}>
                <Text style={styles.modalCardTitle}>Rejection Reason *</Text>
                <TextInput
                  style={styles.rejectInput}
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  placeholder="Please provide a reason for rejection..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setShowRejectModal(false);
              setRejectionReason('');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: '#EF4444' }]}
            onPress={confirmRejection}
            disabled={rejectRequisition.isPending}
          >
            {rejectRequisition.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <XCircle size={18} color="#fff" />
                <Text style={styles.confirmButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Service Requisitions' }} />

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requisitions..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterSection}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filterStatus === option.key ? colors.primary + '15' : colors.background,
                  borderColor: filterStatus === option.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilterStatus(option.key)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[
                  styles.filterChipText,
                  { color: filterStatus === option.key ? colors.primary : colors.textSecondary },
                ]}>
                  {option.label}
                </Text>
                {option.key === 'pending' && pendingCount > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : filteredRequisitions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Receipt size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No service requisitions found</Text>
          </View>
        ) : (
          filteredRequisitions.map(req => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.reqIcon, { backgroundColor: '#F9731615' }]}>
                    <Receipt size={18} color="#F97316" />
                  </View>
                  <View>
                    <Text style={styles.reqNumber}>{req.requisition_number}</Text>
                    <Text style={styles.reqDate}>{formatDate(req.created_at)}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: SERVICE_REQUISITION_STATUS_COLORS[req.status] + '15' }]}>
                  {getStatusIcon(req.status)}
                  <Text style={[styles.statusText, { color: SERVICE_REQUISITION_STATUS_COLORS[req.status] }]}>
                    {SERVICE_REQUISITION_STATUS_LABELS[req.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Building size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{req.vendor_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <FileText size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>PO: {req.source_po_number}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>Invoice: {req.invoice_number || '-'}</Text>
                </View>

                <View style={styles.amountSection}>
                  <View>
                    <Text style={styles.amountLabel}>Invoice Amount</Text>
                    <Text style={styles.amountValue}>{formatCurrency(req.invoice_amount)}</Text>
                    <View style={styles.varianceSection}>
                      {req.variance > 0 ? (
                        <TrendingUp size={14} color="#EF4444" />
                      ) : req.variance < 0 ? (
                        <TrendingDown size={14} color="#10B981" />
                      ) : null}
                      <Text style={[styles.varianceText, { 
                        color: req.variance > 0 ? '#EF4444' : req.variance < 0 ? '#10B981' : colors.textSecondary 
                      }]}>
                        {req.variance > 0 ? '+' : ''}{formatCurrency(req.variance)} ({req.variance_percent.toFixed(1)}%)
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.textTertiary} />
                </View>
              </View>

              {(req.status === 'pending_tier2_approval' || req.status === 'pending_tier3_approval') && (
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.footerButton}
                    onPress={() => handleReject(req)}
                  >
                    <XCircle size={16} color="#EF4444" />
                    <Text style={[styles.footerButtonText, { color: '#EF4444' }]}>Reject</Text>
                  </TouchableOpacity>
                  <View style={styles.footerDivider} />
                  <TouchableOpacity
                    style={styles.footerButton}
                    onPress={() => handleApprove(req)}
                  >
                    <CheckCircle size={16} color="#10B981" />
                    <Text style={[styles.footerButtonText, { color: '#10B981' }]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}

              {req.status === 'approved' && (
                <TouchableOpacity
                  style={[styles.cardFooter, { justifyContent: 'center', backgroundColor: '#05966910' }]}
                  onPress={() => handlePostToSES(req)}
                >
                  <View style={[styles.footerButton, { flex: 0 }]}>
                    <Send size={16} color="#059669" />
                    <Text style={[styles.footerButtonText, { color: '#059669' }]}>Post to SES</Text>
                    <ChevronRight size={16} color="#059669" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {renderApprovalModal()}
      {renderRejectModal()}
    </View>
  );
}
