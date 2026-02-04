import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { History, Search, Filter, Package, DollarSign, MapPin, Tag, ArrowRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseAdjustments } from '@/hooks/useSupabaseAdjustments';
import type { InventoryAuditTrailEntry } from '@/types/inventory-adjustments';

export default function AuditTrailScreen() {
  const { colors } = useTheme();
  const { auditTrail, isLoading, refetch } = useSupabaseAdjustments();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredEntries = useMemo(() => {
    return auditTrail.filter(entry => {
      const matchesSearch = 
        entry.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.material_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.performed_by.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || entry.action_category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [auditTrail, searchQuery, selectedCategory]);

  const categoryCounts = useMemo(() => {
    return {
      all: auditTrail.length,
      quantity: auditTrail.filter(e => e.action_category === 'quantity').length,
      cost: auditTrail.filter(e => e.action_category === 'cost').length,
      attribute: auditTrail.filter(e => e.action_category === 'attribute').length,
      status: auditTrail.filter(e => e.action_category === 'status').length,
      location: auditTrail.filter(e => e.action_category === 'location').length,
    };
  }, [auditTrail]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getActionConfig = (actionType: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      create: { color: '#10B981', label: 'Created' },
      update: { color: '#3B82F6', label: 'Updated' },
      delete: { color: '#EF4444', label: 'Deleted' },
      receive: { color: '#10B981', label: 'Received' },
      issue: { color: '#F59E0B', label: 'Issued' },
      transfer_in: { color: '#8B5CF6', label: 'Transfer In' },
      transfer_out: { color: '#EC4899', label: 'Transfer Out' },
      adjustment: { color: '#6366F1', label: 'Adjusted' },
      count: { color: '#14B8A6', label: 'Counted' },
      reserve: { color: '#F59E0B', label: 'Reserved' },
      release: { color: '#10B981', label: 'Released' },
      cost_change: { color: '#059669', label: 'Cost Changed' },
      location_change: { color: '#8B5CF6', label: 'Location Changed' },
      status_change: { color: '#F59E0B', label: 'Status Changed' },
      reorder_point_change: { color: '#3B82F6', label: 'ROP Changed' },
      vendor_change: { color: '#6366F1', label: 'Vendor Changed' },
      attribute_change: { color: '#6B7280', label: 'Attribute Changed' },
    };
    return configs[actionType] || { color: '#6B7280', label: actionType.replace('_', ' ') };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'quantity': return Package;
      case 'cost': return DollarSign;
      case 'location': return MapPin;
      default: return Tag;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const renderItem = ({ item }: { item: InventoryAuditTrailEntry }) => {
    const actionConfig = getActionConfig(item.action_type);
    const CategoryIcon = getCategoryIcon(item.action_category);
    const { date, time } = formatDateTime(item.performed_at);
    const hasQuantityChange = item.quantity_before !== null && item.quantity_after !== null;
    const hasCostChange = item.cost_before !== null && item.cost_after !== null;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.timeSection}>
            <Text style={[styles.dateText, { color: colors.text }]}>{date}</Text>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>{time}</Text>
          </View>
          <View style={[styles.actionBadge, { backgroundColor: actionConfig.color + '20' }]}>
            <Text style={[styles.actionText, { color: actionConfig.color }]}>
              {actionConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.materialRow}>
          <View style={[styles.categoryIcon, { backgroundColor: colors.background }]}>
            <CategoryIcon size={16} color={colors.textSecondary} />
          </View>
          <View style={styles.materialInfo}>
            <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
              {item.material_name}
            </Text>
            <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
              {item.material_number}
            </Text>
          </View>
        </View>

        {hasQuantityChange && (
          <View style={[styles.changeRow, { backgroundColor: colors.background }]}>
            <Text style={[styles.changeLabel, { color: colors.textSecondary }]}>Quantity:</Text>
            <View style={styles.changeValues}>
              <Text style={[styles.changeValue, { color: colors.text }]}>{item.quantity_before}</Text>
              <ArrowRight size={14} color={colors.textSecondary} />
              <Text style={[styles.changeValue, { color: colors.text }]}>{item.quantity_after}</Text>
              <Text style={[
                styles.changeDelta, 
                { color: (item.quantity_change || 0) >= 0 ? '#10B981' : '#EF4444' }
              ]}>
                ({(item.quantity_change || 0) >= 0 ? '+' : ''}{item.quantity_change})
              </Text>
            </View>
          </View>
        )}

        {hasCostChange && (
          <View style={[styles.changeRow, { backgroundColor: colors.background }]}>
            <Text style={[styles.changeLabel, { color: colors.textSecondary }]}>Cost:</Text>
            <View style={styles.changeValues}>
              <Text style={[styles.changeValue, { color: colors.text }]}>${item.cost_before?.toFixed(2)}</Text>
              <ArrowRight size={14} color={colors.textSecondary} />
              <Text style={[styles.changeValue, { color: colors.text }]}>${item.cost_after?.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {item.field_changed && item.old_value !== null && (
          <View style={[styles.changeRow, { backgroundColor: colors.background }]}>
            <Text style={[styles.changeLabel, { color: colors.textSecondary }]}>
              {item.field_changed.replace('_', ' ')}:
            </Text>
            <View style={styles.changeValues}>
              <Text style={[styles.oldValue, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.old_value || '(empty)'}
              </Text>
              <ArrowRight size={14} color={colors.textSecondary} />
              <Text style={[styles.newValue, { color: colors.text }]} numberOfLines={1}>
                {item.new_value || '(empty)'}
              </Text>
            </View>
          </View>
        )}

        {item.reference_number && (
          <View style={styles.referenceRow}>
            <Text style={[styles.referenceLabel, { color: colors.textSecondary }]}>Ref:</Text>
            <Text style={[styles.referenceValue, { color: colors.primary }]}>{item.reference_number}</Text>
          </View>
        )}

        <View style={styles.footerRow}>
          <Text style={[styles.performedBy, { color: colors.textSecondary }]}>
            By {item.performed_by}
          </Text>
          {item.notes && (
            <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <History size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Audit Trail</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Inventory changes will be logged here for compliance and tracking
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Audit Trail' }} />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by material or user..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'quantity', 'cost', 'attribute', 'status', 'location'] as const).map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterChip,
              { 
                backgroundColor: selectedCategory === category ? colors.primary : colors.surface,
                borderColor: selectedCategory === category ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.filterChipText,
              { color: selectedCategory === category ? '#FFFFFF' : colors.textSecondary }
            ]}>
              {category} ({categoryCounts[category]})
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
          data={filteredEntries}
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
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
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 15,
    fontWeight: '600',
  },
  materialNumber: {
    fontSize: 12,
    marginTop: 1,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  changeLabel: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  changeValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  changeValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  changeDelta: {
    fontSize: 12,
    fontWeight: '600',
  },
  oldValue: {
    fontSize: 12,
    maxWidth: 80,
  },
  newValue: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 80,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  referenceLabel: {
    fontSize: 12,
  },
  referenceValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  performedBy: {
    fontSize: 11,
  },
  notes: {
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
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
