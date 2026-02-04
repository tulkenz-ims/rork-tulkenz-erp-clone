import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Clock, Search, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseReplenishment } from '@/hooks/useSupabaseReplenishment';
import type { ReorderPointSetting } from '@/types/inventory-replenishment';

export default function LeadTimesScreen() {
  const { colors } = useTheme();
  const { reorderPoints, isLoading, refetch } = useSupabaseReplenishment();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const leadTimeItems = useMemo(() => {
    return reorderPoints
      .filter(item => {
        const matchesSearch = 
          item.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.material_number.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => b.lead_time_days - a.lead_time_days);
  }, [reorderPoints, searchQuery]);

  const stats = useMemo(() => {
    const withLeadTime = reorderPoints.filter(i => i.lead_time_days > 0);
    const avgLead = withLeadTime.length > 0 
      ? Math.round(withLeadTime.reduce((sum, i) => sum + i.lead_time_days, 0) / withLeadTime.length)
      : 0;
    const maxLead = Math.max(...withLeadTime.map(i => i.lead_time_days), 0);
    const longLead = withLeadTime.filter(i => i.lead_time_days > 14).length;
    return { avgLead, maxLead, longLead, total: withLeadTime.length };
  }, [reorderPoints]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getLeadTimeColor = (days: number) => {
    if (days <= 7) return '#10B981';
    if (days <= 14) return '#F59E0B';
    return '#EF4444';
  };

  const renderItem = ({ item }: { item: ReorderPointSetting }) => {
    const leadColor = getLeadTimeColor(item.lead_time_days);
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
              {item.material_name}
            </Text>
            <View style={[styles.leadTimeBadge, { backgroundColor: leadColor + '20' }]}>
              <Clock size={12} color={leadColor} />
              <Text style={[styles.leadTimeText, { color: leadColor }]}>
                {item.lead_time_days} days
              </Text>
            </View>
          </View>
          <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
            {item.material_number}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Internal Lead</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {item.lead_time_days} days
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Vendor Lead</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {item.vendor_lead_time_days ?? '-'} {item.vendor_lead_time_days ? 'days' : ''}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Review Period</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {item.review_period_days} days
            </Text>
          </View>
        </View>

        {item.lead_time_days > 14 && (
          <View style={[styles.warningBanner, { backgroundColor: '#FEF3C7' }]}>
            <AlertTriangle size={14} color="#D97706" />
            <Text style={styles.warningText}>
              Long lead time - consider increasing safety stock
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Clock size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Lead Time Data</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Configure lead times for your materials to optimize ordering
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Lead Time Tracking' }} />

      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Items</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.avgLead}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Days</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.maxLead}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Max Days</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.longLead}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Long Lead</Text>
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
          data={leadTimeItems}
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
  leadTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  leadTimeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricBox: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
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
