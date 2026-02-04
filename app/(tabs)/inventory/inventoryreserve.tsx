import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Lock, Search, Plus, Unlock, Calendar, Package } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseAdjustments } from '@/hooks/useSupabaseAdjustments';
import type { InventoryReserve } from '@/types/inventory-adjustments';

export default function InventoryReserveScreen() {
  const { colors } = useTheme();
  const { reserves, activeReserves, isLoading, releaseReserve, refetch } = useSupabaseAdjustments();
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filteredReserves = useMemo(() => {
    const items = showActiveOnly ? activeReserves : reserves;
    return items.filter(reserve => 
      reserve.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reserve.material_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reserve.reserve_number.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [reserves, activeReserves, searchQuery, showActiveOnly]);

  const stats = useMemo(() => {
    const totalQty = activeReserves.reduce((sum, r) => sum + r.quantity, 0);
    const totalValue = activeReserves.reduce((sum, r) => sum + (r.total_value || 0), 0);
    return {
      active: activeReserves.length,
      total: reserves.length,
      totalQty,
      totalValue,
    };
  }, [reserves, activeReserves]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRelease = (reserve: InventoryReserve) => {
    Alert.prompt(
      'Release Reserve',
      'Provide a reason for releasing this reserve:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Release', 
          onPress: async (reason) => {
            try {
              await releaseReserve({ id: reserve.id, reason: reason || 'Released by user' });
            } catch {
              Alert.alert('Error', 'Failed to release reserve');
            }
          }
        },
      ],
      'plain-text'
    );
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'quality_hold': return { color: '#EF4444', label: 'Quality Hold', icon: Lock };
      case 'customer_allocation': return { color: '#3B82F6', label: 'Customer', icon: Package };
      case 'project_allocation': return { color: '#8B5CF6', label: 'Project', icon: Package };
      case 'safety_reserve': return { color: '#10B981', label: 'Safety', icon: Lock };
      case 'obsolescence': return { color: '#F59E0B', label: 'Obsolescence', icon: Lock };
      default: return { color: '#6B7280', label: 'Other', icon: Lock };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: InventoryReserve }) => {
    const typeConfig = getTypeConfig(item.reserve_type);
    const TypeIcon = typeConfig.icon;
    const isExpired = item.expiration_date && new Date(item.expiration_date) < new Date();

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.typeIcon, { backgroundColor: typeConfig.color + '20' }]}>
              <TypeIcon size={16} color={typeConfig.color} />
            </View>
            <View style={styles.titleSection}>
              <Text style={[styles.reserveNumber, { color: colors.primary }]}>
                {item.reserve_number}
              </Text>
              <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
                {item.material_name}
              </Text>
            </View>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: item.status === 'active' ? '#10B98120' : '#6B728020' }
            ]}>
              <Text style={[
                styles.statusText, 
                { color: item.status === 'active' ? '#10B981' : '#6B7280' }
              ]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '10' }]}>
          <Text style={[styles.typeText, { color: typeConfig.color }]}>
            {typeConfig.label}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Quantity</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.quantity} {item.unit_of_measure}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Value</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              ${(item.total_value || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              From: {formatDate(item.effective_date)}
            </Text>
          </View>
          {item.expiration_date && (
            <View style={styles.dateItem}>
              <Calendar size={12} color={isExpired ? '#EF4444' : colors.textSecondary} />
              <Text style={[styles.dateText, { color: isExpired ? '#EF4444' : colors.textSecondary }]}>
                Expires: {formatDate(item.expiration_date)}
              </Text>
            </View>
          )}
        </View>

        {item.reference_number && (
          <View style={[styles.referenceRow, { backgroundColor: colors.background }]}>
            <Text style={[styles.referenceLabel, { color: colors.textSecondary }]}>Reference:</Text>
            <Text style={[styles.referenceValue, { color: colors.text }]}>{item.reference_number}</Text>
          </View>
        )}

        {item.status === 'active' && (
          <TouchableOpacity 
            style={[styles.releaseButton, { backgroundColor: '#3B82F610', borderColor: '#3B82F640' }]}
            onPress={() => handleRelease(item)}
          >
            <Unlock size={16} color="#3B82F6" />
            <Text style={[styles.releaseButtonText, { color: '#3B82F6' }]}>Release Reserve</Text>
          </TouchableOpacity>
        )}

        {item.status === 'released' && item.release_reason && (
          <View style={[styles.releaseReason, { backgroundColor: colors.background }]}>
            <Text style={[styles.releaseReasonLabel, { color: colors.textSecondary }]}>
              Released: {item.release_reason}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Lock size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Reserves</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Create inventory reserves to hold stock for quality, projects, or customers
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Inventory Reserve' }} />

      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalQty.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Units</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>${stats.totalValue.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Value</Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { 
              backgroundColor: showActiveOnly ? '#10B981' : colors.surface,
              borderColor: showActiveOnly ? '#10B981' : colors.border,
            }
          ]}
          onPress={() => setShowActiveOnly(!showActiveOnly)}
        >
          <Lock size={16} color={showActiveOnly ? '#FFFFFF' : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredReserves}
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
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleSection: {
    flex: 1,
  },
  reserveNumber: {
    fontSize: 13,
    fontWeight: '600',
  },
  materialName: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  datesRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  referenceLabel: {
    fontSize: 12,
    marginRight: 8,
  },
  referenceValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  releaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  releaseButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  releaseReason: {
    padding: 10,
    borderRadius: 8,
  },
  releaseReasonLabel: {
    fontSize: 12,
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
