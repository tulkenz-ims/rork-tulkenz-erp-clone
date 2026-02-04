import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Bell, Search, Plus, Edit2, Trash2, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseReplenishment } from '@/hooks/useSupabaseReplenishment';
import type { ReorderPointSetting } from '@/types/inventory-replenishment';

export default function ReorderPointsScreen() {
  const { colors } = useTheme();
  const { reorderPoints, isLoading, deleteReorderPoint, refetch } = useSupabaseReplenishment();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredItems = useMemo(() => {
    return reorderPoints.filter(item => {
      const matchesSearch = 
        item.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.material_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [reorderPoints, searchQuery, selectedStatus]);

  const statusCounts = useMemo(() => {
    return {
      all: reorderPoints.length,
      active: reorderPoints.filter(i => i.status === 'active').length,
      inactive: reorderPoints.filter(i => i.status === 'inactive').length,
      review_needed: reorderPoints.filter(i => i.status === 'review_needed').length,
    };
  }, [reorderPoints]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (item: ReorderPointSetting) => {
    Alert.alert(
      'Delete Reorder Point',
      `Are you sure you want to delete the reorder point setting for ${item.material_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReorderPoint(item.id);
            } catch {
              Alert.alert('Error', 'Failed to delete reorder point setting');
            }
          }
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'inactive': return '#6B7280';
      case 'review_needed': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={14} color="#10B981" />;
      case 'review_needed': return <AlertTriangle size={14} color="#F59E0B" />;
      default: return null;
    }
  };

  const renderItem = ({ item }: { item: ReorderPointSetting }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
            {item.material_name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            {getStatusIcon(item.status)}
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
          {item.material_number}
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Reorder Point</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{item.reorder_point}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Reorder Qty</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{item.reorder_quantity}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Safety Stock</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{item.safety_stock}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Lead Time</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{item.lead_time_days} days</Text>
        </View>
      </View>

      {item.auto_replenish_enabled && (
        <View style={[styles.autoReplenishBadge, { backgroundColor: '#3B82F620' }]}>
          <RefreshCw size={12} color="#3B82F6" />
          <Text style={[styles.autoReplenishText, { color: '#3B82F6' }]}>
            Auto-Replenish: {item.auto_replenish_trigger.replace('_', ' ')}
          </Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.background }]}>
          <Edit2 size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
          onPress={() => handleDelete(item)}
        >
          <Trash2 size={16} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Bell size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Reorder Points</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        {searchQuery || selectedStatus !== 'all' 
          ? 'No items match your filters'
          : 'Set up reorder points for your materials to get automatic replenishment suggestions'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Reorder Points' }} />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search materials..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'active', 'review_needed', 'inactive'] as const).map(status => (
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
              {status === 'all' ? 'All' : status.replace('_', ' ')} ({statusCounts[status]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
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
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  autoReplenishBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  autoReplenishText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
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
