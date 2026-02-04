import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePartsCostsQuery } from '@/hooks/useCMMSCostTracking';
import { PartsCost } from '@/types/cmms';
import {
  Search,
  X,
  ChevronRight,
  DollarSign,
  Filter,
  ArrowUpDown,
  Check,
  Package,
  Calendar,
  Wrench,
  Hash,
  Building2,
  User,
  Boxes,
  Tag,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type SortField = 'issued_at' | 'material_name' | 'quantity' | 'total_cost';
type SortDirection = 'asc' | 'desc';

export default function PartsCostingScreen() {
  const { colors } = useTheme();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('issued_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedPartsCost, setSelectedPartsCost] = useState<PartsCost | null>(null);

  const { data: partsCosts = [], isLoading, refetch } = usePartsCostsQuery({
    facilityId: facilityId || undefined,
  });

  const filteredPartsCosts = useMemo(() => {
    let filtered = [...partsCosts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(pc =>
        pc.materialName.toLowerCase().includes(query) ||
        pc.materialNumber.toLowerCase().includes(query) ||
        pc.materialSku.toLowerCase().includes(query) ||
        pc.workOrderNumber.toLowerCase().includes(query) ||
        pc.partsIssueNumber.toLowerCase().includes(query) ||
        pc.equipmentName?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'issued_at':
          comparison = new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime();
          break;
        case 'material_name':
          comparison = a.materialName.localeCompare(b.materialName);
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'total_cost':
          comparison = a.totalCost - b.totalCost;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [partsCosts, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const totalEntries = partsCosts.length;
    const totalQuantity = partsCosts.reduce((sum, pc) => sum + (pc.quantity || 0), 0);
    const totalCost = partsCosts.reduce((sum, pc) => sum + (pc.totalCost || 0), 0);
    const uniqueMaterials = new Set(partsCosts.map(pc => pc.materialId)).size;
    const uniqueWorkOrders = new Set(partsCosts.map(pc => pc.workOrderId)).size;
    const avgUnitCost = partsCosts.length > 0 
      ? partsCosts.reduce((sum, pc) => sum + pc.unitCost, 0) / partsCosts.length 
      : 0;
    return { totalEntries, totalQuantity, totalCost, uniqueMaterials, uniqueWorkOrders, avgUnitCost };
  }, [partsCosts]);

  const materialBreakdown = useMemo(() => {
    const breakdown = new Map<string, { name: string; quantity: number; cost: number; count: number }>();
    
    partsCosts.forEach(pc => {
      const existing = breakdown.get(pc.materialId);
      if (existing) {
        existing.quantity += pc.quantity;
        existing.cost += pc.totalCost;
        existing.count += 1;
      } else {
        breakdown.set(pc.materialId, {
          name: pc.materialName,
          quantity: pc.quantity,
          cost: pc.totalCost,
          count: 1,
        });
      }
    });

    return Array.from(breakdown.values())
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }, [partsCosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePartsCostPress = useCallback((partsCost: PartsCost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPartsCost(partsCost);
    setShowDetailModal(true);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderPartsCostCard = (partsCost: PartsCost) => {
    return (
      <TouchableOpacity
        key={partsCost.id}
        style={[styles.partsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handlePartsCostPress(partsCost)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.materialIcon, { backgroundColor: colors.primary + '15' }]}>
            <Package size={20} color={colors.primary} />
          </View>
          <View style={styles.materialInfo}>
            <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
              {partsCost.materialName}
            </Text>
            <Text style={[styles.materialSku, { color: colors.textTertiary }]}>
              SKU: {partsCost.materialSku} • #{partsCost.materialNumber}
            </Text>
          </View>
        </View>

        <View style={styles.workOrderRow}>
          <View style={styles.workOrderInfo}>
            <Wrench size={14} color={colors.textSecondary} />
            <Text style={[styles.workOrderText, { color: colors.textSecondary }]}>
              WO: {partsCost.workOrderNumber}
            </Text>
          </View>
          <View style={styles.issueInfo}>
            <FileText size={14} color={colors.textSecondary} />
            <Text style={[styles.issueText, { color: colors.textSecondary }]}>
              {partsCost.partsIssueNumber}
            </Text>
          </View>
        </View>

        {partsCost.equipmentName && (
          <View style={styles.equipmentRow}>
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.equipmentText, { color: colors.textSecondary }]} numberOfLines={1}>
              {partsCost.equipmentName}
            </Text>
          </View>
        )}

        <View style={styles.costDetails}>
          <View style={[styles.costDetailItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Boxes size={14} color={colors.primary} />
            <Text style={[styles.costDetailLabel, { color: colors.textTertiary }]}>Qty</Text>
            <Text style={[styles.costDetailValue, { color: colors.text }]}>
              {partsCost.quantity}
            </Text>
          </View>
          <View style={[styles.costDetailItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Tag size={14} color="#F59E0B" />
            <Text style={[styles.costDetailLabel, { color: colors.textTertiary }]}>Unit</Text>
            <Text style={[styles.costDetailValue, { color: colors.text }]}>
              {formatCurrency(partsCost.unitCost)}
            </Text>
          </View>
          <View style={[styles.costDetailItem, { backgroundColor: '#10B981' + '15' }]}>
            <DollarSign size={14} color="#10B981" />
            <Text style={[styles.costDetailLabel, { color: colors.textTertiary }]}>Total</Text>
            <Text style={[styles.costDetailValue, { color: '#10B981' }]}>
              {formatCurrency(partsCost.totalCost)}
            </Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.issuedInfo}>
            <Calendar size={12} color={colors.textTertiary} />
            <Text style={[styles.issuedText, { color: colors.textTertiary }]}>
              {formatDate(partsCost.issuedAt)}
            </Text>
            <Text style={[styles.issuedByText, { color: colors.textTertiary }]}>
              • {partsCost.issuedByName}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedPartsCost) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Parts Cost Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.materialHeader}>
                <View style={[styles.materialIconLarge, { backgroundColor: colors.primary + '15' }]}>
                  <Package size={28} color={colors.primary} />
                </View>
                <View style={styles.materialHeaderInfo}>
                  <Text style={[styles.materialNameLarge, { color: colors.text }]}>
                    {selectedPartsCost.materialName}
                  </Text>
                  <Text style={[styles.materialSkuLarge, { color: colors.textSecondary }]}>
                    SKU: {selectedPartsCost.materialSku}
                  </Text>
                  <Text style={[styles.materialNumberLarge, { color: colors.textTertiary }]}>
                    #{selectedPartsCost.materialNumber}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                  <Wrench size={16} color="#3B82F6" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Work Order</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedPartsCost.workOrderNumber}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
                  <FileText size={16} color="#8B5CF6" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Parts Issue</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedPartsCost.partsIssueNumber}
                  </Text>
                </View>
              </View>

              {selectedPartsCost.equipmentName && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                    <Building2 size={16} color="#F59E0B" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Equipment</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedPartsCost.equipmentName}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#10B981' + '15' }]}>
                  <User size={16} color="#10B981" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Issued By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedPartsCost.issuedByName}
                  </Text>
                  <Text style={[styles.detailSubvalue, { color: colors.textTertiary }]}>
                    {formatDateTime(selectedPartsCost.issuedAt)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.costSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Cost Breakdown</Text>
              
              <View style={styles.costGrid}>
                <View style={[styles.costCard, { backgroundColor: colors.primary + '10' }]}>
                  <Boxes size={24} color={colors.primary} />
                  <Text style={[styles.costCardLabel, { color: colors.textSecondary }]}>Quantity</Text>
                  <Text style={[styles.costCardValue, { color: colors.primary }]}>
                    {selectedPartsCost.quantity}
                  </Text>
                </View>
                <View style={[styles.costCard, { backgroundColor: '#F59E0B' + '10' }]}>
                  <Tag size={24} color="#F59E0B" />
                  <Text style={[styles.costCardLabel, { color: colors.textSecondary }]}>Unit Cost</Text>
                  <Text style={[styles.costCardValue, { color: '#F59E0B' }]}>
                    {formatCurrency(selectedPartsCost.unitCost)}
                  </Text>
                </View>
              </View>

              <View style={[styles.totalCostBox, { backgroundColor: '#10B981' + '10', borderColor: '#10B981' + '30' }]}>
                <Text style={[styles.totalCostLabel, { color: '#10B981' }]}>Total Cost</Text>
                <Text style={[styles.totalCostValue, { color: '#10B981' }]}>
                  {formatCurrency(selectedPartsCost.totalCost)}
                </Text>
              </View>

              {(selectedPartsCost.costCenter || selectedPartsCost.glAccount) && (
                <View style={styles.accountingRow}>
                  {selectedPartsCost.costCenter && (
                    <View style={styles.accountingItem}>
                      <Text style={[styles.accountingLabel, { color: colors.textTertiary }]}>Cost Center</Text>
                      <Text style={[styles.accountingValue, { color: colors.text }]}>
                        {selectedPartsCost.costCenter}
                      </Text>
                    </View>
                  )}
                  {selectedPartsCost.glAccount && (
                    <View style={styles.accountingItem}>
                      <Text style={[styles.accountingLabel, { color: colors.textTertiary }]}>GL Account</Text>
                      <Text style={[styles.accountingValue, { color: colors.text }]}>
                        {selectedPartsCost.glAccount}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.filterModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>Sort By</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterOptions}>
            {[
              { field: 'issued_at', label: 'Date Issued' },
              { field: 'material_name', label: 'Material Name' },
              { field: 'quantity', label: 'Quantity' },
              { field: 'total_cost', label: 'Total Cost' },
            ].map((option) => (
              <TouchableOpacity
                key={option.field}
                style={[
                  styles.filterOption,
                  { borderBottomColor: colors.border },
                  sortField === option.field && { backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => {
                  if (sortField === option.field) {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortField(option.field as SortField);
                    setSortDirection('desc');
                  }
                  setShowSortModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, { color: sortField === option.field ? colors.primary : colors.text }]}>
                  {option.label}
                </Text>
                {sortField === option.field && (
                  <View style={styles.sortIndicator}>
                    <Text style={[styles.sortDirectionText, { color: colors.primary }]}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading parts costs...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Parts Costing' }} />

      <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.primary + '12' }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.totalEntries}</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Entries</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#8B5CF6' + '15' }]}>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{statistics.uniqueMaterials}</Text>
            <Text style={[styles.statLabel, { color: '#8B5CF6' }]}>Materials</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#F59E0B' + '15' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{statistics.totalQuantity}</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Qty Used</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#3B82F6' + '15' }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{statistics.uniqueWorkOrders}</Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Work Orders</Text>
          </View>
        </View>
        <View style={[styles.totalCostRow, { backgroundColor: '#10B981' + '10' }]}>
          <DollarSign size={16} color="#10B981" />
          <Text style={[styles.totalCostRowLabel, { color: '#10B981' }]}>Total Parts Cost:</Text>
          <Text style={[styles.totalCostRowAmount, { color: '#10B981' }]}>{formatCurrency(statistics.totalCost)}</Text>
        </View>
      </View>

      {materialBreakdown.length > 0 && (
        <View style={[styles.topMaterialsSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.topMaterialsTitle, { color: colors.text }]}>Top Materials by Cost</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topMaterialsScroll}>
            {materialBreakdown.map((material, index) => (
              <View key={index} style={[styles.topMaterialCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.topMaterialRank, { color: colors.primary }]}>#{index + 1}</Text>
                <Text style={[styles.topMaterialName, { color: colors.text }]} numberOfLines={1}>
                  {material.name}
                </Text>
                <Text style={[styles.topMaterialCost, { color: '#10B981' }]}>
                  {formatCurrency(material.cost)}
                </Text>
                <Text style={[styles.topMaterialQty, { color: colors.textTertiary }]}>
                  {material.quantity} units
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search materials, work orders..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowSortModal(true)}
        >
          <ArrowUpDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.resultsHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {filteredPartsCosts.length} {filteredPartsCosts.length === 1 ? 'entry' : 'entries'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredPartsCosts.length > 0 ? (
          filteredPartsCosts.map(renderPartsCostCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
              <Package size={44} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Parts Costs</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery
                ? 'No parts costs match your search'
                : 'Parts cost entries will appear here'}
            </Text>
          </View>
        )}
      </ScrollView>

      {renderDetailModal()}
      {renderSortModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  statsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    marginTop: 2,
  },
  totalCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  totalCostRowLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  totalCostRowAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  topMaterialsSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  topMaterialsTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    paddingHorizontal: 16,
  },
  topMaterialsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  topMaterialCard: {
    width: 140,
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  topMaterialRank: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  topMaterialName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  topMaterialCost: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  topMaterialQty: {
    fontSize: 11,
  },
  searchSection: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  sortButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
  },
  partsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  materialIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  materialSku: {
    fontSize: 12,
    marginTop: 2,
  },
  workOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workOrderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workOrderText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  issueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  issueText: {
    fontSize: 12,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  equipmentText: {
    fontSize: 13,
    flex: 1,
  },
  costDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  costDetailItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 2,
  },
  costDetailLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  costDetailValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  issuedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  issuedText: {
    fontSize: 12,
  },
  issuedByText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  detailSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  materialHeaderInfo: {
    flex: 1,
  },
  materialNameLarge: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  materialSkuLarge: {
    fontSize: 14,
    marginTop: 2,
  },
  materialNumberLarge: {
    fontSize: 12,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  detailSubvalue: {
    fontSize: 12,
    marginTop: 2,
  },
  costSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  costGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  costCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  costCardLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  costCardValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  totalCostBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  totalCostLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  totalCostValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  accountingRow: {
    flexDirection: 'row',
    gap: 16,
  },
  accountingItem: {
    flex: 1,
  },
  accountingLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  accountingValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  filterModalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '60%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  filterOptions: {
    maxHeight: 400,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  filterOptionText: {
    fontSize: 15,
  },
  sortIndicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortDirectionText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
