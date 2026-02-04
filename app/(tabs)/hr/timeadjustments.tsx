import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Check,
  X,
  Search,
  Calendar,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useTimeAdjustmentRequests,
  useReviewTimeAdjustmentRequest,
  type TimeAdjustmentRequest,
} from '@/hooks/useSupabaseTimeClock';
import {
  ADJUSTMENT_REQUEST_STATUS_LABELS,
  ADJUSTMENT_REQUEST_STATUS_COLORS,
  ADJUSTMENT_REQUEST_TYPE_LABELS,
} from '@/types/timeclock';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function TimeAdjustmentsScreen() {
  const { colors } = useTheme();
  const { employee } = useUser();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<TimeAdjustmentRequest | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: requests = [], isLoading, refetch } = useTimeAdjustmentRequests(
    undefined,
    filterStatus === 'all' ? undefined : { status: filterStatus }
  );

  const reviewMutation = useReviewTimeAdjustmentRequest();

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const query = searchQuery.toLowerCase();
    return requests.filter(req =>
      req.employee_name.toLowerCase().includes(query) ||
      req.reason.toLowerCase().includes(query) ||
      ADJUSTMENT_REQUEST_TYPE_LABELS[req.request_type].toLowerCase().includes(query)
    );
  }, [requests, searchQuery]);

  const pendingCount = useMemo(() => {
    return requests.filter(r => r.status === 'pending').length;
  }, [requests]);

  const handleReview = useCallback((request: TimeAdjustmentRequest) => {
    setSelectedRequest(request);
    setAdminNotes('');
    setReviewModalVisible(true);
  }, []);

  const handleApprove = useCallback(async () => {
    if (!selectedRequest || !employee) return;

    try {
      await reviewMutation.mutateAsync({
        requestId: selectedRequest.id,
        status: 'approved',
        reviewerId: employee.id,
        reviewerName: `${employee.first_name} ${employee.last_name}`,
        adminNotes,
      });
      setReviewModalVisible(false);
      Alert.alert('Success', 'Request approved successfully');
    } catch {
      Alert.alert('Error', 'Failed to approve request');
    }
  }, [selectedRequest, employee, adminNotes, reviewMutation]);

  const handleReject = useCallback(async () => {
    if (!selectedRequest || !employee) return;

    if (!adminNotes.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }

    try {
      await reviewMutation.mutateAsync({
        requestId: selectedRequest.id,
        status: 'rejected',
        reviewerId: employee.id,
        reviewerName: `${employee.first_name} ${employee.last_name}`,
        adminNotes,
      });
      setReviewModalVisible(false);
      Alert.alert('Success', 'Request rejected');
    } catch {
      Alert.alert('Error', 'Failed to reject request');
    }
  }, [selectedRequest, employee, adminNotes, reviewMutation]);

  const formatDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    pendingStat: {
      backgroundColor: '#FEF3C7',
    },
    pendingValue: {
      color: '#D97706',
    },
    filterSection: {
      padding: 16,
      gap: 12,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      height: 44,
      fontSize: 16,
      color: colors.text,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    list: {
      padding: 16,
      paddingTop: 0,
    },
    requestCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    employeeName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    requestType: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    cardBody: {
      gap: 8,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      width: 80,
    },
    detailValue: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
    },
    changeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.background,
      padding: 10,
      borderRadius: 8,
      marginTop: 8,
    },
    changeLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    changeValue: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    originalValue: {
      color: '#EF4444',
      textDecorationLine: 'line-through',
    },
    newValue: {
      color: '#10B981',
    },
    arrow: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    reasonSection: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
    },
    reasonLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    reasonText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    dateText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    reviewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    reviewButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    closeButton: {
      padding: 8,
    },
    modalBody: {
      padding: 20,
    },
    modalSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    infoGrid: {
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    infoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text,
    },
    notesInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
    },
    approveButton: {
      backgroundColor: '#10B981',
    },
    rejectButton: {
      backgroundColor: '#EF4444',
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Time Adjustment Requests',
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Adjustment Request Queue</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.pendingStat]}>
            <Text style={[styles.statValue, styles.pendingValue]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{requests.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by employee or reason..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {(['pending', 'approved', 'rejected', 'all'] as FilterStatus[]).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  filterStatus === status && styles.filterChipActive,
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === status && styles.filterChipTextActive,
                  ]}
                >
                  {status === 'all' ? 'All' : ADJUSTMENT_REQUEST_STATUS_LABELS[status]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FileText size={48} color={colors.textSecondary} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>
            {filterStatus === 'pending'
              ? 'No pending requests'
              : 'No adjustment requests found'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        >
          {filteredRequests.map((request) => (
            <View
              key={request.id}
              style={[
                styles.requestCard,
                { borderLeftColor: ADJUSTMENT_REQUEST_STATUS_COLORS[request.status] },
              ]}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.employeeName}>{request.employee_name}</Text>
                  <Text style={styles.requestType}>
                    {ADJUSTMENT_REQUEST_TYPE_LABELS[request.request_type]}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: ADJUSTMENT_REQUEST_STATUS_COLORS[request.status] },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {ADJUSTMENT_REQUEST_STATUS_LABELS[request.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                {request.original_date && (
                  <View style={styles.detailRow}>
                    <Calendar size={16} color={colors.textSecondary} />
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(request.original_date)}</Text>
                  </View>
                )}

                {(request.original_clock_in || request.requested_clock_in) && (
                  <View style={styles.changeRow}>
                    <Text style={styles.changeLabel}>Clock In:</Text>
                    {request.original_clock_in && (
                      <Text style={[styles.changeValue, styles.originalValue]}>
                        {formatDateTime(request.original_clock_in)}
                      </Text>
                    )}
                    {request.original_clock_in && request.requested_clock_in && (
                      <Text style={styles.arrow}>→</Text>
                    )}
                    {request.requested_clock_in && (
                      <Text style={[styles.changeValue, styles.newValue]}>
                        {formatDateTime(request.requested_clock_in)}
                      </Text>
                    )}
                  </View>
                )}

                {(request.original_clock_out || request.requested_clock_out) && (
                  <View style={styles.changeRow}>
                    <Text style={styles.changeLabel}>Clock Out:</Text>
                    {request.original_clock_out && (
                      <Text style={[styles.changeValue, styles.originalValue]}>
                        {formatDateTime(request.original_clock_out)}
                      </Text>
                    )}
                    {request.original_clock_out && request.requested_clock_out && (
                      <Text style={styles.arrow}>→</Text>
                    )}
                    {request.requested_clock_out && (
                      <Text style={[styles.changeValue, styles.newValue]}>
                        {formatDateTime(request.requested_clock_out)}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.reasonSection}>
                <Text style={styles.reasonLabel}>Reason</Text>
                <Text style={styles.reasonText}>{request.reason}</Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                  Submitted: {formatDateTime(request.created_at)}
                </Text>
                {request.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={() => handleReview(request)}
                  >
                    <FileText size={16} color="#FFFFFF" />
                    <Text style={styles.reviewButtonText}>Review</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Request</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setReviewModalVisible(false)}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedRequest && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Request Details</Text>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Employee</Text>
                        <Text style={styles.infoValue}>{selectedRequest.employee_name}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Type</Text>
                        <Text style={styles.infoValue}>
                          {ADJUSTMENT_REQUEST_TYPE_LABELS[selectedRequest.request_type]}
                        </Text>
                      </View>
                      {selectedRequest.original_date && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Date</Text>
                          <Text style={styles.infoValue}>
                            {formatDate(selectedRequest.original_date)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Employee Reason</Text>
                    <Text style={styles.reasonText}>{selectedRequest.reason}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Admin Notes</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Add notes (required for rejection)..."
                      placeholderTextColor={colors.textSecondary}
                      value={adminNotes}
                      onChangeText={setAdminNotes}
                      multiline
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleReject}
                disabled={reviewMutation.isPending}
              >
                <X size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApprove}
                disabled={reviewMutation.isPending}
              >
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
