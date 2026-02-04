import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { RefreshCw, Search, Settings, Zap, Pause, Play } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseReplenishment } from '@/hooks/useSupabaseReplenishment';
import type { ReorderPointSetting } from '@/types/inventory-replenishment';

export default function AutoReplenishScreen() {
  const { colors } = useTheme();
  const { reorderPoints, isLoading, updateReorderPoint, refetch } = useSupabaseReplenishment();
  const [searchQuery, setSearchQuery] = useState('');
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filteredItems = useMemo(() => {
    return reorderPoints
      .filter(item => {
        const matchesSearch = 
          item.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.material_number.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = !showEnabledOnly || item.auto_replenish_enabled;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (a.auto_replenish_enabled && !b.auto_replenish_enabled) return -1;
        if (!a.auto_replenish_enabled && b.auto_replenish_enabled) return 1;
        return a.material_name.localeCompare(b.material_name);
      });
  }, [reorderPoints, searchQuery, showEnabledOnly]);

  const stats = useMemo(() => {
    const enabled = reorderPoints.filter(i => i.auto_replenish_enabled);
    const byTrigger = {
      reorder_point: enabled.filter(i => i.auto_replenish_trigger === 'reorder_point').length,
      safety_stock: enabled.filter(i => i.auto_replenish_trigger === 'safety_stock').length,
      min_level: enabled.filter(i => i.auto_replenish_trigger === 'min_level').length,
      schedule: enabled.filter(i => i.auto_replenish_trigger === 'schedule').length,
    };
    return { enabled: enabled.length, total: reorderPoints.length, byTrigger };
  }, [reorderPoints]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleToggleAutoReplenish = async (item: ReorderPointSetting) => {
    try {
      await updateReorderPoint({
        id: item.id,
        auto_replenish_enabled: !item.auto_replenish_enabled,
      });
    } catch (error) {
      console.error('Failed to toggle auto-replenish:', error);
    }
  };

  const getTriggerColor = (trigger: string) => {
    switch (trigger) {
      case 'reorder_point': return '#3B82F6';
      case 'safety_stock': return '#10B981';
      case 'min_level': return '#F59E0B';
      case 'schedule': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const renderItem = ({ item }: { item: ReorderPointSetting }) => {
    const triggerColor = getTriggerColor(item.auto_replenish_trigger);
    
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.titleSection}>
              <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
                {item.material_name}
              </Text>
              <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
                {item.material_number}
              </Text>
            </View>
            <Switch
              value={item.auto_replenish_enabled}
              onValueChange={() => handleToggleAutoReplenish(item)}
              trackColor={{ false: colors.border, true: '#10B98180' }}
              thumbColor={item.auto_replenish_enabled ? '#10B981' : '#F3F4F6'}
            />
          </View>
        </View>

        {item.auto_replenish_enabled && (
          <>
            <View style={[styles.triggerSection, { backgroundColor: triggerColor + '10' }]}>
              <Zap size={14} color={triggerColor} />
              <Text style={[styles.triggerLabel, { color: triggerColor }]}>
                Trigger: {item.auto_replenish_trigger.replace('_', ' ')}
              </Text>
            </View>

            <View style={styles.configGrid}>
              <View style={styles.configItem}>
                <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Reorder Point</Text>
                <Text style={[styles.configValue, { color: colors.text }]}>{item.reorder_point}</Text>
              </View>
              <View style={styles.configItem}>
                <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Reorder Qty</Text>
                <Text style={[styles.configValue, { color: colors.text }]}>{item.reorder_quantity}</Text>
              </View>
              {item.auto_replenish_vendor_name && (
                <View style={[styles.configItem, { width: '100%' }]}>
                  <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Vendor</Text>
                  <Text style={[styles.configValue, { color: colors.text }]}>{item.auto_replenish_vendor_name}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {!item.auto_replenish_enabled && (
          <View style={[styles.disabledBanner, { backgroundColor: colors.background }]}>
            <Pause size={14} color={colors.textSecondary} />
            <Text style={[styles.disabledText, { color: colors.textSecondary }]}>
              Auto-replenishment disabled
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <RefreshCw size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Auto-Replenishment</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Enable auto-replenishment for materials to automate purchase order creation
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Auto-Replenishment' }} />

      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.enabled}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Enabled</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.byTrigger.reorder_point}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>ROP Trigger</Text>
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
              backgroundColor: showEnabledOnly ? '#10B981' : colors.surface,
              borderColor: showEnabledOnly ? '#10B981' : colors.border,
            }
          ]}
          onPress={() => setShowEnabledOnly(!showEnabledOnly)}
        >
          <Play size={16} color={showEnabledOnly ? '#FFFFFF' : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
    paddingBottom: 40,
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
    justifyContent: 'space-between',
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  materialNumber: {
    fontSize: 13,
  },
  triggerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  triggerLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  configGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  configItem: {
    width: '47%',
  },
  configLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  configValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  disabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  disabledText: {
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
