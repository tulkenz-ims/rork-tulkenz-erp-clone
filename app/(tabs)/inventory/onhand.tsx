import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Filter,
  X,
  Package,
  AlertTriangle,
  MapPin,
  Clock,
  History,
  Edit3,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import { Tables } from '@/lib/supabase';
import { 
  getDepartmentFromMaterialNumber,
  getAllDepartments,
} from '@/constants/inventoryDepartmentCodes';
import * as Haptics from 'expo-haptics';

type SupabaseMaterial = Tables['materials'];
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type SortField = 'on_hand' | 'materialNumber' | 'name' | 'location';

export default function OnHandViewScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('materialNumber');
  const [sortAsc, setSortAsc] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const {
    data: materials = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useMaterialsQuery({
    orderBy: { column: 'name', ascending: true },
  });

  const departments = getAllDepartments();

  const locations = useMemo(() => {
    const locs = new Set<string>();
    materials.forEach(m => {
      if (m.location) locs.add(m.location);
    });
    return Array.from(locs).sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    let result = [...materials];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        m =>
          m.material_number.toLowerCase().includes(query) ||
          m.name.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query)
      );
    }

    if (selectedDepartment !== null) {
      result = result.filter(m => m.inventory_department === selectedDepartment);
    }

    if (selectedLocation) {
      result = result.filter(m => m.location === selectedLocation);
    }

    switch (stockFilter) {
      case 'in_stock':
        result = result.filter(m => m.on_hand > m.min_level);
        break;
      case 'low_stock':
        result = result.filter(m => m.on_hand > 0 && m.on_hand <= m.min_level);
        break;
      case 'out_of_stock':
        result = result.filter(m => m.on_hand === 0);
        break;
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'on_hand':
          comparison = a.on_hand - b.on_hand;
          break;
        case 'materialNumber':
          comparison = a.material_number.localeCompare(b.material_number);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'location':
          comparison = (a.location || '').localeCompare(b.location || '');
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [searchQuery, selectedDepartment, stockFilter, selectedLocation, sortField, sortAsc, materials]);

  const stats = useMemo(() => {
    const total = materials.length;
    const belowReorder = materials.filter(m => m.on_hand <= m.min_level && m.on_hand > 0).length;
    const outOfStock = materials.filter(m => m.on_hand === 0).length;
    const totalValue = materials.reduce((sum, m) => sum + (m.on_hand * m.unit_price), 0);
    return { total, belowReorder, outOfStock, totalValue };
  }, [materials]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getStockStatus = useCallback((item: SupabaseMaterial) => {
    if (item.on_hand === 0) {
      return { label: 'Out of Stock', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.12)' };
    }
    if (item.on_hand <= item.min_level) {
      return { label: 'Low Stock', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)' };
    }
    return { label: 'In Stock', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.12)' };
  }, []);

  const toggleExpand = useCallback((itemId: string) => {
    Haptics.selectionAsync();
    setExpandedItem(prev => prev === itemId ? null : itemId);
  }, []);

  const handleViewLots = useCallback((materialId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/inventory/lottracking' as never);
  }, [router]);

  const handleAdjustQuantity = useCallback((materialId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/inventory/itemrecords' as never);
  }, [router]);

  const handleViewHistory = useCallback((materialId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/inventory/transactionhistory' as never);
  }, [router]);

  const clearFilters = useCallback(() => {
    setSelectedDepartment(null);
    setStockFilter('all');
    setSelectedLocation(null);
    setSortField('materialNumber');
    setSortAsc(true);
    setShowFilterModal(false);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedDepartment !== null) count++;
    if (stockFilter !== 'all') count++;
    if (selectedLocation !== null) count++;
    return count;
  }, [selectedDepartment, stockFilter, selectedLocation]);

  const renderItemRow = useCallback((item: SupabaseMaterial) => {
    const dept = getDepartmentFromMaterialNumber(item.material_number);
    const stockStatus = getStockStatus(item);
    const isExpanded = expandedItem === item.id;
    const lastTransaction = item.updated_at;

    return (
      <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable style={styles.itemMain} onPress={() => toggleExpand(item.id)}>
          <View style={styles.itemLeft}>
            <View style={[styles.statusIndicator, { backgroundColor: stockStatus.color }]} />
            <View style={styles.itemInfo}>
              <View style={styles.itemHeaderRow}>
                <View style={[styles.deptBadge, { backgroundColor: dept?.color || colors.primary }]}>
                  <Text style={styles.deptBadgeText}>{dept?.shortName || 'UNK'}</Text>
                </View>
                <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
                  {item.material_number}
                </Text>
              </View>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.location && (
                <View style={styles.locationRow}>
                  <MapPin size={12} color={colors.textTertiary} />
                  <Text style={[styles.locationText, { color: colors.textTertiary }]}>
                    {item.location}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.itemRight}>
            <View style={styles.quantityContainer}>
              <Text style={[styles.quantityValue, { color: stockStatus.color }]}>
                {item.on_hand}
              </Text>
              <Text style={[styles.quantityUnit, { color: colors.textTertiary }]}>
                {item.unit_of_measure}
              </Text>
            </View>
            <View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor }]}>
              <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>
                {stockStatus.label}
              </Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={18} color={colors.textTertiary} />
            ) : (
              <ChevronDown size={18} color={colors.textTertiary} />
            )}
          </View>
        </Pressable>

        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
            <View style={styles.expandedStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Reorder Point</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{item.min_level}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Max Level</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{item.max_level}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Unit Price</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>${item.unit_price.toFixed(2)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total Value</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>
                  ${(item.on_hand * item.unit_price).toFixed(2)}
                </Text>
              </View>
            </View>

            {lastTransaction && (
              <View style={styles.lastTransactionRow}>
                <Clock size={12} color={colors.textTertiary} />
                <Text style={[styles.lastTransactionText, { color: colors.textTertiary }]}>
                  Last updated: {new Date(lastTransaction).toLocaleDateString()}
                </Text>
              </View>
            )}

            <View style={styles.quickActions}>
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                onPress={() => handleViewLots(item.id)}
              >
                <Layers size={14} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>View Lots</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, { backgroundColor: '#8B5CF615' }]}
                onPress={() => handleAdjustQuantity(item.id)}
              >
                <Edit3 size={14} color="#8B5CF6" />
                <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>Adjust Qty</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, { backgroundColor: '#6B728015' }]}
                onPress={() => handleViewHistory(item.id)}
              >
                <History size={14} color="#6B7280" />
                <Text style={[styles.actionButtonText, { color: '#6B7280' }]}>History</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }, [colors, expandedItem, getStockStatus, toggleExpand, handleViewLots, handleAdjustQuantity, handleViewHistory]);

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setShowFilterModal(false)} style={styles.modalCloseBtn}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filters & Sort</Text>
          <Pressable onPress={clearFilters} style={styles.modalActionBtn}>
            <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Stock Status</Text>
          <View style={styles.filterChips}>
            {[
              { value: 'all' as StockFilter, label: 'All', color: colors.primary },
              { value: 'in_stock' as StockFilter, label: 'In Stock', color: '#10B981' },
              { value: 'low_stock' as StockFilter, label: 'Low Stock', color: '#F59E0B' },
              { value: 'out_of_stock' as StockFilter, label: 'Out of Stock', color: '#EF4444' },
            ].map(option => (
              <Pressable
                key={option.value}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: stockFilter === option.value ? option.color + '20' : colors.surface,
                    borderColor: stockFilter === option.value ? option.color : colors.border,
                  }
                ]}
                onPress={() => setStockFilter(option.value)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: stockFilter === option.value ? option.color : colors.text }
                ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Department</Text>
          <View style={styles.filterChips}>
            <Pressable
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedDepartment === null ? colors.primary + '20' : colors.surface,
                  borderColor: selectedDepartment === null ? colors.primary : colors.border,
                }
              ]}
              onPress={() => setSelectedDepartment(null)}
            >
              <Text style={[
                styles.filterChipText,
                { color: selectedDepartment === null ? colors.primary : colors.text }
              ]}>
                All
              </Text>
            </Pressable>
            {departments.map(d => (
              <Pressable
                key={d.code}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedDepartment === d.code ? d.color + '20' : colors.surface,
                    borderColor: selectedDepartment === d.code ? d.color : colors.border,
                  }
                ]}
                onPress={() => setSelectedDepartment(d.code)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: selectedDepartment === d.code ? d.color : colors.text }
                ]}>
                  {d.shortName}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Location</Text>
          <View style={styles.filterChips}>
            <Pressable
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedLocation === null ? colors.primary + '20' : colors.surface,
                  borderColor: selectedLocation === null ? colors.primary : colors.border,
                }
              ]}
              onPress={() => setSelectedLocation(null)}
            >
              <Text style={[
                styles.filterChipText,
                { color: selectedLocation === null ? colors.primary : colors.text }
              ]}>
                All
              </Text>
            </Pressable>
            {locations.map(loc => (
              <Pressable
                key={loc}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedLocation === loc ? colors.primary + '20' : colors.surface,
                    borderColor: selectedLocation === loc ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setSelectedLocation(loc)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: selectedLocation === loc ? colors.primary : colors.text }
                ]}>
                  {loc}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Sort By</Text>
          <View style={styles.filterChips}>
            {[
              { field: 'on_hand' as SortField, label: 'Quantity' },
              { field: 'materialNumber' as SortField, label: 'Material #' },
              { field: 'name' as SortField, label: 'Name' },
              { field: 'location' as SortField, label: 'Location' },
            ].map(option => (
              <Pressable
                key={option.field}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: sortField === option.field ? colors.primary + '20' : colors.surface,
                    borderColor: sortField === option.field ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => {
                  if (sortField === option.field) {
                    setSortAsc(!sortAsc);
                  } else {
                    setSortField(option.field);
                    setSortAsc(true);
                  }
                }}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: sortField === option.field ? colors.primary : colors.text }
                ]}>
                  {option.label} {sortField === option.field ? (sortAsc ? '↑' : '↓') : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Pressable
          style={[styles.applyButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowFilterModal(false)}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </Pressable>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading inventory...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <AlertCircle size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to Load</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error?.message || 'An error occurred'}
        </Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
        >
          <RefreshCw size={16} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Package size={18} color={colors.primary} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Total SKUs</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TrendingDown size={18} color="#F59E0B" />
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{stats.belowReorder}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Below Reorder</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AlertTriangle size={18} color="#EF4444" />
          <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{stats.outOfStock}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Out of Stock</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by material #, name..."
            placeholderTextColor={colors.textTertiary}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[
            styles.filterButton,
            { 
              backgroundColor: colors.surface, 
              borderColor: activeFilterCount > 0 ? colors.primary : colors.border 
            }
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={activeFilterCount > 0 ? colors.primary : colors.textTertiary} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.quickFilters}>
        {[
          { value: 'all' as StockFilter, label: 'All', count: stats.total },
          { value: 'low_stock' as StockFilter, label: 'Low Stock', count: stats.belowReorder, color: '#F59E0B' },
          { value: 'out_of_stock' as StockFilter, label: 'Out of Stock', count: stats.outOfStock, color: '#EF4444' },
        ].map(filter => (
          <Pressable
            key={filter.value}
            style={[
              styles.quickFilterChip,
              {
                backgroundColor: stockFilter === filter.value 
                  ? (filter.color || colors.primary) + '15' 
                  : colors.surface,
                borderColor: stockFilter === filter.value 
                  ? (filter.color || colors.primary) 
                  : colors.border,
              }
            ]}
            onPress={() => setStockFilter(filter.value)}
          >
            <Text style={[
              styles.quickFilterText,
              { color: stockFilter === filter.value ? (filter.color || colors.primary) : colors.textSecondary }
            ]}>
              {filter.label}
            </Text>
            <View style={[
              styles.quickFilterCount,
              { backgroundColor: stockFilter === filter.value ? (filter.color || colors.primary) + '20' : colors.backgroundSecondary }
            ]}>
              <Text style={[
                styles.quickFilterCountText,
                { color: stockFilter === filter.value ? (filter.color || colors.primary) : colors.textTertiary }
              ]}>
                {filter.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {filteredMaterials.length} items
        </Text>

        {filteredMaterials.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Package size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Items Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          filteredMaterials.map(renderItemRow)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  summaryCards: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  summaryLabel: {
    fontSize: 10,
    textAlign: 'center' as const,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative' as const,
  },
  filterBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  quickFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  quickFilterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  quickFilterCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  quickFilterCountText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  resultCount: {
    fontSize: 13,
    marginBottom: 8,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  itemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  deptBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deptBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700' as const,
  },
  materialNumber: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  quantityValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  quantityUnit: {
    fontSize: 11,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  expandedContent: {
    padding: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  expandedStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  lastTransactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  lastTransactionText: {
    fontSize: 11,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  modalActionBtn: {
    padding: 4,
  },
  clearText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
    marginTop: 8,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  applyButton: {
    margin: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
