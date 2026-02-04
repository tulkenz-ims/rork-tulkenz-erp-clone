import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Shield, Search, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseReplenishment } from '@/hooks/useSupabaseReplenishment';
import type { ReorderPointSetting } from '@/types/inventory-replenishment';

export default function SafetyStockScreen() {
  const { colors } = useTheme();
  const { reorderPoints, isLoading, refetch } = useSupabaseReplenishment();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const safetyStockItems = useMemo(() => {
    return reorderPoints
      .filter(item => {
        const matchesSearch = 
          item.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.material_number.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => b.safety_stock - a.safety_stock);
  }, [reorderPoints, searchQuery]);

  const stats = useMemo(() => {
    const withSafetyStock = reorderPoints.filter(i => i.safety_stock > 0);
    const totalValue = withSafetyStock.reduce((sum, i) => sum + i.safety_stock, 0);
    return {
      totalItems: withSafetyStock.length,
      totalSafetyStock: totalValue,
      avgDays: withSafetyStock.length > 0 
        ? Math.round(withSafetyStock.reduce((sum, i) => sum + i.safety_stock_days, 0) / withSafetyStock.length)
        : 0,
    };
  }, [reorderPoints]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: ReorderPointSetting }) => {
    const hasAdequateSafety = item.safety_stock > 0;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
              {item.material_name}
            </Text>
            {hasAdequateSafety ? (
              <CheckCircle size={18} color="#10B981" />
            ) : (
              <AlertTriangle size={18} color="#F59E0B" />
            )}
          </View>
          <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
            {item.material_number}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Safety Stock</Text>
            <Text style={[styles.metricValue, { color: hasAdequateSafety ? '#10B981' : '#F59E0B' }]}>
              {item.safety_stock}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Days Coverage</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {item.safety_stock_days} days
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Lead Time</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {item.lead_time_days} days
            </Text>
          </View>
        </View>

        <View style={[styles.serviceLevel, { backgroundColor: colors.background }]}>
          <Text style={[styles.serviceLevelLabel, { color: colors.textSecondary }]}>
            Service Level Target
          </Text>
          <Text style={[styles.serviceLevelValue, { color: colors.primary }]}>
            {item.service_level_percent}%
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Shield size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Safety Stock Data</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Configure safety stock levels to protect against demand variability
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Safety Stock' }} />

      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalItems}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Items</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.totalSafetyStock.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Units</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.avgDays}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Days</Text>
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
          data={safetyStockItems}
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
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
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
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  serviceLevel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  serviceLevelLabel: {
    fontSize: 13,
  },
  serviceLevelValue: {
    fontSize: 15,
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
