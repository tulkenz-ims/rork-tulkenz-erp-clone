import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { ClipboardCheck, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseAdjustments } from '@/hooks/useSupabaseAdjustments';
import type { InventoryAdjustment } from '@/types/inventory-adjustments';

export default function AdjustmentApprovalScreen() {
  const { colors } = useTheme();
  const { pendingAdjustments, adjustments, isLoading, approveAdjustment, rejectAdjustment, refetch } = useSupabaseAdjustments();
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [refreshing, setRefreshing] = useState(false);

  const filteredAdjustments = useMemo(() => {
    if (selectedStatus === 'pending') {
      return pendingAdjustments;
    }
    return adjustments.filter(adj => adj.status === selectedStatus);
  }, [adjustments, pendingAdjustments, selectedStatus]);

  const statusCounts = useMemo(() => {
    return {
      pending: pendingAdjustments.length,
      approved: adjustments.filter(a => a.status === 'approved').length,
      rejected: adjustments.filter(a => a.status === 'rejected').length,
      posted: adjustments.filter(a => a.status === 'posted').length,
    };
  }, [adjustments, pendingAdjustments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleApprove = (adjustment: InventoryAdjustment) => {
    Alert.alert(
      'Approve Adjustment',
      `Approve ${adjustment.adjustment_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Approve', 
          onPress: async () => {
            try {
              await approveAdjustment(adjustment.id);
            } catch {
              Alert.alert('Error', 'Failed to approve adjustment');
            }
          }
        },
      ]
    );
  };

  const handleReject = (adjustment: InventoryAdjustment) => {
    Alert.prompt(
      'Reject Adjustment',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: async (reason) => {
            try {
              await rejectAdjustment({ id: adjustment.id, reason: reason || 'No reason provided' });
            } catch {
              Alert.alert('Error', 'Failed to reject adjustment');
            }
          }
        },
      ],
      'plain-text'
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { color: '#F59E0B', icon: Clock, label: 'Pending' };
      case 'pending_approval': return { color: '#F59E0B', icon: Clock, label: 'Pending Approval' };
      case 'approved': return { color: '#10B981', icon: CheckCircle, label: 'Approved' };
      case 'rejected': return { color: '#EF4444', icon: XCircle, label: 'Rejected' };
      case 'posted': return { color: '#3B82F6', icon: CheckCircle, label: 'Posted' };
      default: return { color: '#6B7280', icon: Clock, label: status };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderItem = ({ item }: { item: InventoryAdjustment }) => {
    const statusConfig = getStatusConfig(item.status);
    const StatusIcon = statusConfig.icon;
    const isIncrease = item.quantity_change > 0;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.adjustmentNumber, { color: colors.primary }]}>
              {item.adjustment_number}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <StatusIcon size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
            {item.material_name}
          </Text>
          <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
            {item.material_number} • {item.reason_name}
          </Text>
        </View>

        <View style={styles.quantitySection}>
          <View style={styles.quantityItem}>
            <Text style={[styles.quantityLabel, { color: colors.textSecondary }]}>Before</Text>
            <Text style={[styles.quantityValue, { color: colors.text }]}>{item.quantity_before}</Text>
          </View>
          <View style={[styles.changeIndicator, { backgroundColor: isIncrease ? '#10B98120' : '#EF444420' }]}>
            {isIncrease ? (
              <TrendingUp size={16} color="#10B981" />
            ) : (
              <TrendingDown size={16} color="#EF4444" />
            )}
            <Text style={[styles.changeValue, { color: isIncrease ? '#10B981' : '#EF4444' }]}>
              {isIncrease ? '+' : ''}{item.quantity_change}
            </Text>
          </View>
          <View style={styles.quantityItem}>
            <Text style={[styles.quantityLabel, { color: colors.textSecondary }]}>After</Text>
            <Text style={[styles.quantityValue, { color: colors.text }]}>{item.quantity_after}</Text>
          </View>
        </View>

        {item.total_cost_impact !== null && item.total_cost_impact !== 0 && (
          <View style={[styles.costImpact, { backgroundColor: colors.background }]}>
            <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Cost Impact:</Text>
            <Text style={[
              styles.costValue, 
              { color: item.total_cost_impact > 0 ? '#10B981' : '#EF4444' }
            ]}>
              {item.total_cost_impact > 0 ? '+' : ''}${Math.abs(item.total_cost_impact).toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            By {item.performed_by} • {formatDate(item.performed_at)}
          </Text>
        </View>

        {(item.status === 'pending' || item.status === 'pending_approval') && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.approveButton, { backgroundColor: '#10B981' }]}
              onPress={() => handleApprove(item)}
            >
              <CheckCircle size={16} color="#FFFFFF" />
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.rejectButton, { backgroundColor: '#FEE2E2' }]}
              onPress={() => handleReject(item)}
            >
              <XCircle size={16} color="#EF4444" />
              <Text style={[styles.rejectButtonText, { color: '#EF4444' }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'rejected' && item.rejection_reason && (
          <View style={[styles.rejectionReason, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.rejectionReasonLabel}>Rejection Reason:</Text>
            <Text style={styles.rejectionReasonText}>{item.rejection_reason}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <ClipboardCheck size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Adjustments</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        {selectedStatus === 'pending' 
          ? 'No adjustments pending approval'
          : `No ${selectedStatus} adjustments`}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Adjustment Approval' }} />

      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{statusCounts.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{statusCounts.approved}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{statusCounts.rejected}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{statusCounts.posted}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posted</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['pending', 'approved', 'rejected', 'posted'] as const).map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              { 
                backgroundColor: selectedStatus === status ? colors.primary : colors.surface,
                borderColor: selectedStatus === status ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setSelectedStatus(status)}
          >
            <Text style={[
              styles.filterChipText,
              { color: selectedStatus === status ? '#FFFFFF' : colors.textSecondary }
            ]}>
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredAdjustments}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  adjustmentNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  materialNumber: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quantityItem: {
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  costImpact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  costLabel: {
    fontSize: 13,
  },
  costValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  metaRow: {
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rejectionReason: {
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  rejectionReasonLabel: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
    marginBottom: 4,
  },
  rejectionReasonText: {
    fontSize: 13,
    color: '#991B1B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
