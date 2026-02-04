import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Filter,
  Package,
  MapPin,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingDown,
  ExternalLink,
  Boxes,
  Loader2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMaterialsByDepartment } from '@/hooks/useSupabaseMaterials';
import * as Haptics from 'expo-haptics';
import { getDepartmentByCode } from '@/constants/inventoryDepartmentCodes';
import { Tables } from '@/lib/supabase';

type SupabaseMaterial = Tables['materials'];

interface Material {
  id: string;
  materialNumber: string;
  inventoryDepartment: number;
  name: string;
  sku: string;
  category: string;
  description?: string | null;
  on_hand: number;
  min_level: number;
  max_level: number;
  unit_price: number;
  unit_of_measure: string;
  location?: string | null;
  vendor?: string | null;
  lead_time_days?: number | null;
  avg_monthly_usage?: number | null;
  departmentFields?: {
    criticalSpare?: boolean;
  } | null;
}

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';

interface FilteredInventoryViewProps {
  departmentCode: number;
  title?: string;
  showMasterLink?: boolean;
  onItemPress?: (item: Material) => void;
}

const getStockStatus = (item: Material): StockStatus => {
  if (item.on_hand === 0) return 'out_of_stock';
  if (item.on_hand <= item.min_level) return 'low_stock';
  if (item.on_hand >= item.max_level) return 'overstock';
  return 'in_stock';
};

const getStockStatusColor = (status: StockStatus): string => {
  switch (status) {
    case 'out_of_stock': return '#EF4444';
    case 'low_stock': return '#F59E0B';
    case 'overstock': return '#3B82F6';
    case 'in_stock': return '#10B981';
  }
};

const getStockStatusLabel = (status: StockStatus): string => {
  switch (status) {
    case 'out_of_stock': return 'Out of Stock';
    case 'low_stock': return 'Low Stock';
    case 'overstock': return 'Overstock';
    case 'in_stock': return 'In Stock';
  }
};

const mapSupabaseMaterial = (m: SupabaseMaterial): Material => ({
  id: m.id,
  materialNumber: m.material_number,
  inventoryDepartment: m.inventory_department,
  name: m.name,
  sku: m.sku,
  category: m.category,
  description: m.description,
  on_hand: m.on_hand,
  min_level: m.min_level,
  max_level: m.max_level,
  unit_price: m.unit_price || 0,
  unit_of_measure: m.unit_of_measure,
  location: m.location,
  vendor: m.vendor,
  lead_time_days: m.lead_time_days,
  avg_monthly_usage: (m as Record<string, unknown>).avg_monthly_usage as number | null | undefined,
  departmentFields: (m as Record<string, unknown>).department_fields as Material['departmentFields'],
});

export default function FilteredInventoryView({
  departmentCode,
  title,
  showMasterLink = true,
  onItemPress,
}: FilteredInventoryViewProps) {
  const { colors } = useTheme();
  const router = useRouter();
  
  const { data: supabaseMaterials, isLoading, refetch, isRefetching } = useMaterialsByDepartment(departmentCode);
  const materials = useMemo(() => (supabaseMaterials || []).map(mapSupabaseMaterial), [supabaseMaterials]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StockStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const department = getDepartmentByCode(departmentCode);
  const displayTitle = title || department?.name || 'Inventory';

  const filteredMaterials = useMemo(() => {
    let result = [...materials];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.materialNumber.includes(query) ||
        m.sku.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query) ||
        (m.vendor && m.vendor.toLowerCase().includes(query))
      );
    }
    
    if (selectedStatus !== 'all') {
      result = result.filter(m => getStockStatus(m) === selectedStatus);
    }
    
    return result.sort((a, b) => {
      const statusOrder = { out_of_stock: 0, low_stock: 1, in_stock: 2, overstock: 3 };
      return statusOrder[getStockStatus(a)] - statusOrder[getStockStatus(b)];
    });
  }, [materials, searchQuery, selectedStatus]);

  const summary = useMemo(() => {
    return {
      total: materials.length,
      totalValue: materials.reduce((sum, m) => sum + (m.on_hand * m.unit_price), 0),
      outOfStock: materials.filter(m => m.on_hand === 0).length,
      lowStock: materials.filter(m => m.on_hand > 0 && m.on_hand <= m.min_level).length,
    };
  }, [materials]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleItemPress = useCallback((item: Material) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onItemPress) {
      onItemPress(item);
    } else {
      setExpandedItem(expandedItem === item.id ? null : item.id);
    }
  }, [expandedItem, onItemPress]);

  const handleGoToMaster = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/inventory');
  }, [router]);

  const renderStockStatusBadge = (status: StockStatus) => {
    const color = getStockStatusColor(status);
    const label = getStockStatusLabel(status);
    return (
      <View style={[styles.statusBadge, { backgroundColor: color + '15' }]}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderItemCard = (item: Material) => {
    const status = getStockStatus(item);
    const statusColor = getStockStatusColor(status);
    const isExpanded = expandedItem === item.id;
    
    return (
      <Pressable
        key={item.id}
        style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemMainInfo}>
            <View style={styles.itemNumberRow}>
              <Text style={[styles.itemNumber, { color: department?.color || colors.primary }]}>
                {item.materialNumber}
              </Text>
              {item.departmentFields?.criticalSpare && (
                <View style={[styles.criticalBadge, { backgroundColor: '#EF4444' + '20' }]}>
                  <AlertTriangle size={10} color="#EF4444" />
                  <Text style={[styles.criticalText, { color: '#EF4444' }]}>Critical</Text>
                </View>
              )}
            </View>
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.itemCategory, { color: colors.textSecondary }]}>
              {item.category} {item.vendor ? `• ${item.vendor}` : ''}
            </Text>
          </View>
          
          <View style={styles.itemStockInfo}>
            {renderStockStatusBadge(status)}
            <View style={styles.stockQtyContainer}>
              <Text style={[styles.stockQty, { color: statusColor }]}>{item.on_hand}</Text>
              <Text style={[styles.stockUom, { color: colors.textSecondary }]}>{item.unit_of_measure}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.itemMeta}>
          <View style={styles.metaItem}>
            <MapPin size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.location || 'No location'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <DollarSign size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              ${item.unit_price.toFixed(2)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Package size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              Min: {item.min_level} / Max: {item.max_level}
            </Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={16} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={16} color={colors.textSecondary} />
          )}
        </View>

        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
            <View style={styles.expandedRow}>
              <View style={styles.expandedItem}>
                <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>SKU</Text>
                <Text style={[styles.expandedValue, { color: colors.text }]}>{item.sku}</Text>
              </View>
              <View style={styles.expandedItem}>
                <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Total Value</Text>
                <Text style={[styles.expandedValue, { color: colors.text }]}>
                  ${(item.on_hand * item.unit_price).toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={styles.expandedRow}>
              <View style={styles.expandedItem}>
                <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Lead Time</Text>
                <Text style={[styles.expandedValue, { color: colors.text }]}>
                  {item.lead_time_days || '-'} days
                </Text>
              </View>
              <View style={styles.expandedItem}>
                <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Avg Monthly</Text>
                <Text style={[styles.expandedValue, { color: colors.text }]}>
                  {item.avg_monthly_usage || '-'}
                </Text>
              </View>
            </View>
            {item.description && (
              <View style={styles.descriptionContainer}>
                <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Description</Text>
                <Text style={[styles.descriptionText, { color: colors.text }]}>{item.description}</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing || isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: department?.color + '10', borderColor: department?.color + '30' }]}>
          <View style={[styles.headerIcon, { backgroundColor: department?.color + '20' }]}>
            <Boxes size={28} color={department?.color || colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{displayTitle}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {department?.description || 'Department inventory'}
            </Text>
          </View>
          {showMasterLink && (
            <Pressable 
              style={[styles.masterLinkButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleGoToMaster}
            >
              <ExternalLink size={16} color={colors.primary} />
              <Text style={[styles.masterLinkText, { color: colors.primary }]}>Master</Text>
            </Pressable>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.summaryScroll}
          contentContainerStyle={styles.summaryContainer}
        >
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Package size={18} color={department?.color || colors.primary} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>{summary.total}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Items</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DollarSign size={18} color="#10B981" />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ${(summary.totalValue / 1000).toFixed(1)}K
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Value</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AlertCircle size={18} color="#EF4444" />
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{summary.outOfStock}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Out of Stock</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TrendingDown size={18} color="#F59E0B" />
            <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{summary.lowStock}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Low Stock</Text>
          </View>
        </ScrollView>

        <View style={styles.searchSection}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={`Search ${displayTitle.toLowerCase()}...`}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={[
              styles.filterButton,
              { 
                backgroundColor: selectedStatus !== 'all' ? colors.primary + '15' : colors.surface,
                borderColor: selectedStatus !== 'all' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={18} color={selectedStatus !== 'all' ? colors.primary : colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {filteredMaterials.length} items
          </Text>
          {selectedStatus !== 'all' && (
            <Pressable onPress={() => setSelectedStatus('all')}>
              <Text style={[styles.clearFiltersText, { color: colors.primary }]}>Clear filter</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.listContainer}>
          {filteredMaterials.map(item => renderItemCard(item))}
          
          {isLoading ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Loader2 size={48} color={colors.primary} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Loading...</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Fetching inventory data
              </Text>
            </View>
          ) : filteredMaterials.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Package size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No items found</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Try adjusting your search' : `No inventory in ${displayTitle}`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.filterModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filter by Status</Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.filterOptions}>
              {(['all', 'out_of_stock', 'low_stock', 'in_stock', 'overstock'] as const).map(status => (
                <Pressable
                  key={status}
                  style={[
                    styles.filterOption,
                    { 
                      backgroundColor: selectedStatus === status ? colors.primary + '15' : colors.backgroundSecondary,
                      borderColor: selectedStatus === status ? colors.primary : 'transparent',
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedStatus(status);
                    setShowFilterModal(false);
                  }}
                >
                  {status !== 'all' && (
                    <View style={[styles.filterDot, { backgroundColor: getStockStatusColor(status) }]} />
                  )}
                  <Text style={[
                    styles.filterOptionText,
                    { color: selectedStatus === status ? colors.primary : colors.text }
                  ]}>
                    {status === 'all' ? 'All Status' : getStockStatusLabel(status)}
                  </Text>
                  {selectedStatus === status && (
                    <CheckCircle2 size={18} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  masterLinkButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  masterLinkText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  summaryScroll: {
    marginBottom: 16,
  },
  summaryContainer: {
    gap: 10,
  },
  summaryCard: {
    width: 100,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
    gap: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  summaryLabel: {
    fontSize: 10,
    textAlign: 'center' as const,
  },
  searchSection: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  resultsHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultsCount: {
    fontSize: 13,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  listContainer: {
    gap: 10,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    padding: 12,
  },
  itemMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemNumberRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemNumber: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  criticalBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  criticalText: {
    fontSize: 9,
    fontWeight: '600' as const,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
  },
  itemStockInfo: {
    alignItems: 'flex-end' as const,
  },
  stockQtyContainer: {
    flexDirection: 'row' as const,
    alignItems: 'baseline',
    marginTop: 8,
    gap: 4,
  },
  stockQty: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  stockUom: {
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  itemMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: 12,
  },
  expandedRow: {
    flexDirection: 'row' as const,
    marginBottom: 10,
  },
  expandedItem: {
    flex: 1,
  },
  expandedLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  expandedValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  descriptionContainer: {
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  filterModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  filterModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  filterOptions: {
    padding: 16,
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  filterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
  },
});
