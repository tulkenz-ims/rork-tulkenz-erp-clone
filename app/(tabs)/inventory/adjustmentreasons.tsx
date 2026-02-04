import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { FileText, Search, Plus, Edit2, Trash2, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseAdjustments } from '@/hooks/useSupabaseAdjustments';
import type { AdjustmentReason } from '@/types/inventory-adjustments';

export default function AdjustmentReasonsScreen() {
  const { colors } = useTheme();
  const { reasons, isLoading, deleteReason, refetch } = useSupabaseAdjustments();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredReasons = useMemo(() => {
    return reasons.filter(reason => {
      const matchesSearch = 
        reason.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reason.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || reason.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [reasons, searchQuery, selectedCategory]);

  const categoryCounts = useMemo(() => {
    return {
      all: reasons.length,
      increase: reasons.filter(r => r.category === 'increase').length,
      decrease: reasons.filter(r => r.category === 'decrease').length,
      correction: reasons.filter(r => r.category === 'correction').length,
      damage: reasons.filter(r => r.category === 'damage').length,
      other: reasons.filter(r => ['transfer', 'expiration', 'theft', 'other'].includes(r.category)).length,
    };
  }, [reasons]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (reason: AdjustmentReason) => {
    Alert.alert(
      'Delete Reason',
      `Are you sure you want to delete "${reason.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReason(reason.id);
            } catch {
              Alert.alert('Error', 'Failed to delete reason');
            }
          }
        },
      ]
    );
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'increase': return { color: '#10B981', icon: TrendingUp, label: 'Increase' };
      case 'decrease': return { color: '#EF4444', icon: TrendingDown, label: 'Decrease' };
      case 'correction': return { color: '#3B82F6', icon: FileText, label: 'Correction' };
      case 'damage': return { color: '#F59E0B', icon: XCircle, label: 'Damage' };
      case 'expiration': return { color: '#8B5CF6', icon: XCircle, label: 'Expiration' };
      case 'theft': return { color: '#DC2626', icon: XCircle, label: 'Theft' };
      case 'transfer': return { color: '#6366F1', icon: FileText, label: 'Transfer' };
      default: return { color: '#6B7280', icon: FileText, label: 'Other' };
    }
  };

  const renderItem = ({ item }: { item: AdjustmentReason }) => {
    const categoryConfig = getCategoryConfig(item.category);
    const CategoryIcon = categoryConfig.icon;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.iconCircle, { backgroundColor: categoryConfig.color + '20' }]}>
              <CategoryIcon size={18} color={categoryConfig.color} />
            </View>
            <View style={styles.titleSection}>
              <Text style={[styles.reasonName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.reasonCode, { color: colors.textSecondary }]}>{item.code}</Text>
            </View>
            <View style={[
              styles.statusIndicator, 
              { backgroundColor: item.is_active ? '#10B98120' : '#EF444420' }
            ]}>
              {item.is_active ? (
                <CheckCircle size={14} color="#10B981" />
              ) : (
                <XCircle size={14} color="#EF4444" />
              )}
            </View>
          </View>
        </View>

        {item.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: categoryConfig.color + '15' }]}>
            <Text style={[styles.tagText, { color: categoryConfig.color }]}>
              {categoryConfig.label}
            </Text>
          </View>
          {item.requires_approval && (
            <View style={[styles.tag, { backgroundColor: '#F59E0B15' }]}>
              <Text style={[styles.tagText, { color: '#F59E0B' }]}>Requires Approval</Text>
            </View>
          )}
          {item.requires_notes && (
            <View style={[styles.tag, { backgroundColor: '#3B82F615' }]}>
              <Text style={[styles.tagText, { color: '#3B82F6' }]}>Notes Required</Text>
            </View>
          )}
          {item.requires_photo && (
            <View style={[styles.tag, { backgroundColor: '#8B5CF615' }]}>
              <Text style={[styles.tagText, { color: '#8B5CF6' }]}>Photo Required</Text>
            </View>
          )}
        </View>

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
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FileText size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Adjustment Reasons</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Create reason codes to categorize and track inventory adjustments
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Adjustment Reasons' }} />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search reasons..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'increase', 'decrease', 'correction', 'damage', 'other'] as const).map(category => (
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
              {category === 'all' ? 'All' : category} ({categoryCounts[category]})
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
          data={filteredReasons}
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
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleSection: {
    flex: 1,
  },
  reasonName: {
    fontSize: 16,
    fontWeight: '600',
  },
  reasonCode: {
    fontSize: 13,
    marginTop: 2,
  },
  statusIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
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
