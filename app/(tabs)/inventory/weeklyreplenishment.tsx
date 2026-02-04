import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Calendar, Plus, CheckCircle, Clock, FileText, Send, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseReplenishment } from '@/hooks/useSupabaseReplenishment';
import type { WeeklyReplenishmentPlan } from '@/types/inventory-replenishment';

export default function WeeklyReplenishmentScreen() {
  const { colors } = useTheme();
  const { weeklyPlans, isLoading, submitWeeklyPlan, approveWeeklyPlan, refetch } = useSupabaseReplenishment();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredPlans = useMemo(() => {
    return weeklyPlans
      .filter(plan => selectedStatus === 'all' || plan.status === selectedStatus)
      .sort((a, b) => new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime());
  }, [weeklyPlans, selectedStatus]);

  const statusCounts = useMemo(() => {
    return {
      all: weeklyPlans.length,
      draft: weeklyPlans.filter(p => p.status === 'draft').length,
      pending_approval: weeklyPlans.filter(p => p.status === 'pending_approval').length,
      approved: weeklyPlans.filter(p => p.status === 'approved').length,
      completed: weeklyPlans.filter(p => p.status === 'completed').length,
    };
  }, [weeklyPlans]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSubmit = (plan: WeeklyReplenishmentPlan) => {
    Alert.alert(
      'Submit Plan',
      `Submit "${plan.plan_name}" for approval?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit', 
          onPress: async () => {
            try {
              await submitWeeklyPlan(plan.id);
            } catch {
              Alert.alert('Error', 'Failed to submit plan');
            }
          }
        },
      ]
    );
  };

  const handleApprove = (plan: WeeklyReplenishmentPlan) => {
    Alert.alert(
      'Approve Plan',
      `Approve "${plan.plan_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Approve', 
          onPress: async () => {
            try {
              await approveWeeklyPlan(plan.id);
            } catch {
              Alert.alert('Error', 'Failed to approve plan');
            }
          }
        },
      ]
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft': return { color: '#6B7280', icon: FileText, label: 'Draft' };
      case 'pending_approval': return { color: '#F59E0B', icon: Clock, label: 'Pending' };
      case 'approved': return { color: '#10B981', icon: CheckCircle, label: 'Approved' };
      case 'in_progress': return { color: '#3B82F6', icon: Clock, label: 'In Progress' };
      case 'completed': return { color: '#059669', icon: CheckCircle, label: 'Completed' };
      default: return { color: '#6B7280', icon: FileText, label: status };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }: { item: WeeklyReplenishmentPlan }) => {
    const statusConfig = getStatusConfig(item.status);
    const StatusIcon = statusConfig.icon;

    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.planName, { color: colors.text }]} numberOfLines={1}>
              {item.plan_name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <StatusIcon size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.planNumber, { color: colors.textSecondary }]}>
            {item.plan_number}
          </Text>
        </View>

        <View style={[styles.dateRow, { backgroundColor: colors.background }]}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formatDate(item.week_start_date)} - {formatDate(item.week_end_date)}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.primary }]}>{item.total_items}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Items</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {item.total_quantity.toLocaleString()}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Qty</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>
              ${item.total_estimated_cost.toLocaleString()}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Est. Cost</Text>
          </View>
        </View>

        {item.status === 'draft' && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleSubmit(item)}
          >
            <Send size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Submit for Approval</Text>
          </TouchableOpacity>
        )}

        {item.status === 'pending_approval' && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => handleApprove(item)}
          >
            <CheckCircle size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
        )}

        <View style={styles.chevronRow}>
          <Text style={[styles.viewDetails, { color: colors.textSecondary }]}>View Details</Text>
          <ChevronRight size={16} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Calendar size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Weekly Plans</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Create weekly replenishment plans to organize and track your ordering
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Weekly Replenishment' }} />

      <View style={styles.filterRow}>
        {(['all', 'draft', 'pending_approval', 'approved', 'completed'] as const).map(status => (
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
              {status === 'all' ? 'All' : status === 'pending_approval' ? 'Pending' : status} ({statusCounts[status]})
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
          data={filteredPlans}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    padding: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
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
    marginBottom: 4,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  planNumber: {
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
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  viewDetails: {
    fontSize: 13,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
