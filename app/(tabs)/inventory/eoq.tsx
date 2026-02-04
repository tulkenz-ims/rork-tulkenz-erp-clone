import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Calculator, Search, TrendingUp, Info } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseReplenishment } from '@/hooks/useSupabaseReplenishment';
import type { ReorderPointSetting } from '@/types/inventory-replenishment';

export default function EOQScreen() {
  const { colors } = useTheme();
  const { reorderPoints, isLoading, refetch, calculateEOQ } = useSupabaseReplenishment();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const eoqItems = useMemo(() => {
    return reorderPoints
      .filter(item => {
        const matchesSearch = 
          item.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.material_number.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch && item.eoq_enabled;
      })
      .sort((a, b) => (b.calculated_eoq || 0) - (a.calculated_eoq || 0));
  }, [reorderPoints, searchQuery]);

  const allItems = useMemo(() => {
    return reorderPoints.filter(item => {
      const matchesSearch = 
        item.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.material_number.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [reorderPoints, searchQuery]);

  const stats = useMemo(() => {
    const enabled = reorderPoints.filter(i => i.eoq_enabled);
    const totalEOQ = enabled.reduce((sum, i) => sum + (i.calculated_eoq || 0), 0);
    return {
      enabled: enabled.length,
      total: reorderPoints.length,
      avgEOQ: enabled.length > 0 ? Math.round(totalEOQ / enabled.length) : 0,
    };
  }, [reorderPoints]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: ReorderPointSetting }) => {
    const eoqValue = item.calculated_eoq || 0;
    const variance = item.reorder_quantity > 0 
      ? ((eoqValue - item.reorder_quantity) / item.reorder_quantity * 100).toFixed(1)
      : '0';
    
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
              {item.material_name}
            </Text>
            {item.eoq_enabled && (
              <View style={[styles.enabledBadge, { backgroundColor: '#10B98120' }]}>
                <Text style={[styles.enabledText, { color: '#10B981' }]}>EOQ Enabled</Text>
              </View>
            )}
          </View>
          <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
            {item.material_number}
          </Text>
        </View>

        <View style={styles.eoqDisplay}>
          <View style={styles.eoqMainValue}>
            <Text style={[styles.eoqLabel, { color: colors.textSecondary }]}>Calculated EOQ</Text>
            <Text style={[styles.eoqValue, { color: colors.primary }]}>
              {eoqValue.toLocaleString()}
            </Text>
          </View>
          <View style={styles.eoqComparison}>
            <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>vs Current Qty</Text>
            <Text style={[
              styles.comparisonValue, 
              { color: Number(variance) > 0 ? '#10B981' : Number(variance) < 0 ? '#EF4444' : colors.text }
            ]}>
              {Number(variance) > 0 ? '+' : ''}{variance}%
            </Text>
          </View>
        </View>

        <View style={styles.inputsGrid}>
          <View style={styles.inputItem}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Annual Demand</Text>
            <Text style={[styles.inputValue, { color: colors.text }]}>
              {item.annual_demand?.toLocaleString() ?? '-'}
            </Text>
          </View>
          <View style={styles.inputItem}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ordering Cost</Text>
            <Text style={[styles.inputValue, { color: colors.text }]}>
              ${item.ordering_cost?.toFixed(2) ?? '-'}
            </Text>
          </View>
          <View style={styles.inputItem}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Holding Cost %</Text>
            <Text style={[styles.inputValue, { color: colors.text }]}>
              {item.holding_cost_percent ?? '-'}%
            </Text>
          </View>
          <View style={styles.inputItem}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current Reorder Qty</Text>
            <Text style={[styles.inputValue, { color: colors.text }]}>
              {item.reorder_quantity.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Calculator size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No EOQ Data</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Enable EOQ calculation for materials to optimize order quantities and reduce costs
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Economic Order Quantity' }} />

      <View style={[styles.infoCard, { backgroundColor: '#3B82F610', borderColor: '#3B82F640' }]}>
        <Info size={18} color="#3B82F6" />
        <Text style={[styles.infoText, { color: '#3B82F6' }]}>
          EOQ = √(2DS/H) where D=Annual Demand, S=Ordering Cost, H=Holding Cost
        </Text>
      </View>

      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.enabled}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Enabled</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Items</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.avgEOQ}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg EOQ</Text>
        </View>
      </View>

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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={eoqItems.length > 0 ? eoqItems : allItems}
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
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
  enabledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  enabledText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eoqDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  eoqMainValue: {},
  eoqLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  eoqValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  eoqComparison: {
    alignItems: 'flex-end',
  },
  comparisonLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputItem: {
    width: '47%',
  },
  inputLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  inputValue: {
    fontSize: 14,
    fontWeight: '600',
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
