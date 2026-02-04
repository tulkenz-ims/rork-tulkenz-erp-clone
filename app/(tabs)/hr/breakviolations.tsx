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
  AlertTriangle,
  Clock,
  X,
  Search,
  Calendar,
  Eye,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useBreakViolations,
  useReviewBreakViolation,
  type BreakViolation,
} from '@/hooks/useSupabaseTimeClock';
import {
  BREAK_VIOLATION_TYPE_LABELS,
  BREAK_VIOLATION_STATUS_LABELS,
  BREAK_VIOLATION_STATUS_COLORS,
  BREAK_TYPE_LABELS,
} from '@/types/timeclock';

type FilterStatus = 'all' | 'pending' | 'acknowledged' | 'excused' | 'warned';

export default function BreakViolationsScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedViolation, setSelectedViolation] = useState<BreakViolation | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: violations = [], isLoading, refetch } = useBreakViolations(
    filterStatus === 'all' ? undefined : { status: filterStatus }
  );

  const reviewMutation = useReviewBreakViolation();

  const filteredViolations = useMemo(() => {
    if (!searchQuery.trim()) return violations;
    const query = searchQuery.toLowerCase();
    return violations.filter((v: BreakViolation) =>
      v.employee_name.toLowerCase().includes(query) ||
      BREAK_VIOLATION_TYPE_LABELS[v.violation_type].toLowerCase().includes(query)
    );
  }, [violations, searchQuery]);

  const pendingCount = useMemo(() => {
    return violations.filter((v: BreakViolation) => v.status === 'pending').length;
  }, [violations]);

  const handleReview = useCallback((violation: BreakViolation) => {
    setSelectedViolation(violation);
    setReviewNotes('');
    setReviewModalVisible(true);
  }, []);

  const handleAction = useCallback(async (action: 'acknowledged' | 'excused' | 'warned') => {
    if (!selectedViolation || !user) {
      console.log('[BreakViolations] handleAction - missing data:', { selectedViolation: !!selectedViolation, user: !!user });
      return;
    }

    try {
      console.log('[BreakViolations] Reviewing violation:', selectedViolation.id, 'with action:', action);
      await reviewMutation.mutateAsync({
        violationId: selectedViolation.id,
        status: action,
        reviewerId: user.id,
        reviewerName: `${user.first_name} ${user.last_name}`,
        reviewNotes,
      });
      setReviewModalVisible(false);
      Alert.alert('Success', `Violation marked as ${BREAK_VIOLATION_STATUS_LABELS[action]}`);
    } catch {
      Alert.alert('Error', 'Failed to update violation');
    }
  }, [selectedViolation, user, reviewNotes, reviewMutation]);

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

  const getViolationIcon = (type: string) => {
    switch (type) {
      case 'break_too_long':
        return <Clock size={20} color="#EF4444" />;
      case 'break_too_short':
        return <AlertCircle size={20} color="#F59E0B" />;
      case 'missed_break':
        return <ShieldAlert size={20} color="#DC2626" />;
      default:
        return <AlertTriangle size={20} color="#F59E0B" />;
    }
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
      backgroundColor: '#FEE2E2',
    },
    pendingValue: {
      color: '#DC2626',
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
      paddingHorizontal: 14,
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
      fontSize: 13,
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
    violationCard: {
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
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    employeeName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    violationType: {
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
      width: 100,
    },
    detailValue: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
    },
    highlightValue: {
      fontWeight: '600' as const,
      color: '#EF4444',
    },
    timeBreakdown: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 8,
    },
    timeBlock: {
      flex: 1,
      alignItems: 'center',
    },
    timeBlockLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    timeBlockValue: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    overageValue: {
      color: '#EF4444',
    },
    notesSection: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
    },
    notesLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    notesText: {
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
      gap: 8,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
    },
    acknowledgeButton: {
      backgroundColor: '#3B82F6',
    },
    excuseButton: {
      backgroundColor: '#10B981',
    },
    warnButton: {
      backgroundColor: '#EF4444',
    },
    actionButtonText: {
      fontSize: 14,
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
          title: 'Break Violations',
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Break Violation Alerts</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.pendingStat]}>
            <Text style={[styles.statValue, styles.pendingValue]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending Review</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{violations.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by employee..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {(['pending', 'acknowledged', 'excused', 'warned', 'all'] as FilterStatus[]).map((status) => (
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
                  {status === 'all' ? 'All' : BREAK_VIOLATION_STATUS_LABELS[status]}
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
      ) : filteredViolations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AlertTriangle size={48} color={colors.textSecondary} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>
            {filterStatus === 'pending'
              ? 'No violations pending review'
              : 'No break violations found'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        >
          {filteredViolations.map((violation: BreakViolation) => (
            <View
              key={violation.id}
              style={[
                styles.violationCard,
                { borderLeftColor: BREAK_VIOLATION_STATUS_COLORS[violation.status] },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainer}>
                    {getViolationIcon(violation.violation_type)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.employeeName}>{violation.employee_name}</Text>
                    <Text style={styles.violationType}>
                      {BREAK_VIOLATION_TYPE_LABELS[violation.violation_type]}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: BREAK_VIOLATION_STATUS_COLORS[violation.status] },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {BREAK_VIOLATION_STATUS_LABELS[violation.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                  <Calendar size={16} color={colors.textSecondary} />
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(violation.violation_date)}</Text>
                </View>

                {violation.break_type && (
                  <View style={styles.detailRow}>
                    <Clock size={16} color={colors.textSecondary} />
                    <Text style={styles.detailLabel}>Break Type:</Text>
                    <Text style={styles.detailValue}>
                      {BREAK_TYPE_LABELS[violation.break_type]}
                    </Text>
                  </View>
                )}

                <View style={styles.timeBreakdown}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeBlockLabel}>Scheduled</Text>
                    <Text style={styles.timeBlockValue}>
                      {violation.scheduled_minutes || 0} min
                    </Text>
                  </View>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeBlockLabel}>Actual</Text>
                    <Text style={styles.timeBlockValue}>
                      {violation.actual_minutes || 0} min
                    </Text>
                  </View>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeBlockLabel}>Overage</Text>
                    <Text style={[styles.timeBlockValue, styles.overageValue]}>
                      +{violation.difference_minutes || 0} min
                    </Text>
                  </View>
                </View>
              </View>

              {violation.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesText}>{violation.notes}</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                  {formatDateTime(violation.created_at)}
                </Text>
                {violation.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={() => handleReview(violation)}
                  >
                    <Eye size={16} color="#FFFFFF" />
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
              <Text style={styles.modalTitle}>Review Violation</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setReviewModalVisible(false)}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedViolation && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Violation Details</Text>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Employee</Text>
                        <Text style={styles.infoValue}>{selectedViolation.employee_name}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Type</Text>
                        <Text style={styles.infoValue}>
                          {BREAK_VIOLATION_TYPE_LABELS[selectedViolation.violation_type]}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>
                          {formatDate(selectedViolation.violation_date)}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Scheduled</Text>
                        <Text style={styles.infoValue}>
                          {selectedViolation.scheduled_minutes || 0} minutes
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Actual</Text>
                        <Text style={styles.infoValue}>
                          {selectedViolation.actual_minutes || 0} minutes
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Overage</Text>
                        <Text style={[styles.infoValue, { color: '#EF4444' }]}>
                          +{selectedViolation.difference_minutes || 0} minutes
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Review Notes</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Add notes about this violation..."
                      placeholderTextColor={colors.textSecondary}
                      value={reviewNotes}
                      onChangeText={setReviewNotes}
                      multiline
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acknowledgeButton]}
                onPress={() => handleAction('acknowledged')}
                disabled={reviewMutation.isPending}
              >
                <Text style={styles.actionButtonText}>Acknowledge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.excuseButton]}
                onPress={() => handleAction('excused')}
                disabled={reviewMutation.isPending}
              >
                <Text style={styles.actionButtonText}>Excuse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.warnButton]}
                onPress={() => handleAction('warned')}
                disabled={reviewMutation.isPending}
              >
                <Text style={styles.actionButtonText}>Warn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
