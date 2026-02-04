import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { AlertTriangle, Search, CheckCircle, XCircle, Eye, TrendingUp, TrendingDown, FileSearch } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseAdjustments } from '@/hooks/useSupabaseAdjustments';
import type { VarianceRecord } from '@/types/inventory-adjustments';

export default function VarianceReviewScreen() {
  const { colors } = useTheme();
  const { pendingVariances, variances, isLoading, reviewVariance, refetch } = useSupabaseAdjustments();
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filteredVariances = useMemo(() => {
    let items = selectedStatus === 'pending' ? pendingVariances : variances.filter(v => v.status === selectedStatus);
    
    if (searchQuery) {
      items = items.filter(v => 
        v.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.material_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.variance_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return items.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
    });
  }, [variances, pendingVariances, selectedStatus, searchQuery]);

  const stats = useMemo(() => {
    return {
      pending: pendingVariances.length,
      shortage: variances.filter(v => v.variance_type === 'shortage').length,
      overage: variances.filter(v => v.variance_type === 'overage').length,
      critical: variances.filter(v => v.severity === 'critical' || v.severity === 'high').length,
    };
  }, [variances, pendingVariances]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleReview = (variance: VarianceRecord, resolution: VarianceRecord['resolution']) => {
    Alert.prompt(
      resolution === 'adjust_system' ? 'Approve Adjustment' : 'Review Notes',
      'Add review notes:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit', 
          onPress: async (notes) => {
            try {
              await reviewVariance({ 
                id: variance.id, 
                notes: notes || '', 
                resolution 
              });
            } catch {
              Alert.alert('Error', 'Failed to review variance');
            }
          }
        },
      ],
      'plain-text'
    );
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical': return { color: '#DC2626', label: 'Critical' };
      case 'high': return { color: '#EF4444', label: 'High' };
      case 'medium': return { color: '#F59E0B', label: 'Medium' };
      case 'low': return { color: '#10B981', label: 'Low' };
      default: return { color: '#6B7280', label: 'None' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending_review': return { color: '#F59E0B', label: 'Pending Review' };
      case 'under_investigation': return { color: '#8B5CF6', label: 'Investigating' };
      case 'approved': return { color: '#10B981', label: 'Approved' };
      case 'adjusted': return { color: '#3B82F6', label: 'Adjusted' };
      case 'written_off': return { color: '#EF4444', label: 'Written Off' };
      default: return { color: '#6B7280', label: status };
    }
  };

  const renderItem = ({ item }: { item: VarianceRecord }) => {
    const severityConfig = getSeverityConfig(item.severity);
    const statusConfig = getStatusConfig(item.status);
    const isShortage = item.variance_type === 'shortage';

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.varianceNumber, { color: colors.primary }]}>
              {item.variance_number}
            </Text>
            <View style={[styles.severityBadge, { backgroundColor: severityConfig.color + '20' }]}>
              <AlertTriangle size={12} color={severityConfig.color} />
              <Text style={[styles.severityText, { color: severityConfig.color }]}>
                {severityConfig.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
            {item.material_name}
          </Text>
          <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
            {item.material_number} • {item.source_type.replace('_', ' ')}
          </Text>
        </View>

        <View style={styles.varianceSection}>
          <View style={styles.varianceItem}>
            <Text style={[styles.varianceLabel, { color: colors.textSecondary }]}>System</Text>
            <Text style={[styles.varianceValue, { color: colors.text }]}>{item.system_quantity}</Text>
          </View>
          <View style={[
            styles.varianceIndicator, 
            { backgroundColor: isShortage ? '#EF444420' : '#10B98120' }
          ]}>
            {isShortage ? (
              <TrendingDown size={16} color="#EF4444" />
            ) : (
              <TrendingUp size={16} color="#10B981" />
            )}
            <Text style={[
              styles.varianceAmount, 
              { color: isShortage ? '#EF4444' : '#10B981' }
            ]}>
              {item.variance_quantity > 0 ? '+' : ''}{item.variance_quantity}
            </Text>
          </View>
          <View style={styles.varianceItem}>
            <Text style={[styles.varianceLabel, { color: colors.textSecondary }]}>Counted</Text>
            <Text style={[styles.varianceValue, { color: colors.text }]}>{item.counted_quantity}</Text>
          </View>
        </View>

        {item.variance_cost !== null && item.variance_cost !== 0 && (
          <View style={[styles.costRow, { backgroundColor: colors.background }]}>
            <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Value Impact:</Text>
            <Text style={[
              styles.costValue, 
              { color: isShortage ? '#EF4444' : '#10B981' }
            ]}>
              {isShortage ? '-' : '+'}${Math.abs(item.variance_cost).toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={[styles.statusChip, { backgroundColor: statusConfig.color + '15' }]}>
            <Text style={[styles.statusChipText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Counted by {item.counted_by}
          </Text>
        </View>

        {(item.status === 'pending_review' || item.status === 'under_investigation') && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
              onPress={() => handleReview(item, 'adjust_system')}
            >
              <CheckCircle size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Adjust</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
              onPress={() => handleReview(item, 'investigate')}
            >
              <Eye size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Investigate</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
              onPress={() => handleReview(item, 'no_action')}
            >
              <XCircle size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>No Action</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.root_cause && (
          <View style={[styles.rootCause, { backgroundColor: colors.background }]}>
            <Text style={[styles.rootCauseLabel, { color: colors.textSecondary }]}>Root Cause:</Text>
            <Text style={[styles.rootCauseText, { color: colors.text }]}>{item.root_cause}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FileSearch size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Variances</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        {selectedStatus === 'pending' 
          ? 'No variances pending review'
          : 'No variances found'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Variance Review' }} />

      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.shortage}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Shortages</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.overage}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overages</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.critical}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Critical</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search variances..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterRow}>
        {(['pending', 'under_investigation', 'approved', 'adjusted'] as const).map(status => (
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
              {status === 'pending' ? 'Pending' : status === 'under_investigation' ? 'Investigating' : status}
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
          data={filteredVariances}
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
    fontSize: 10,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
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
    fontSize: 11,
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
  varianceNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  materialNumber: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  varianceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  varianceItem: {
    alignItems: 'center',
  },
  varianceLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  varianceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  varianceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  varianceAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  costRow: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  rootCause: {
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  rootCauseLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  rootCauseText: {
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
});
