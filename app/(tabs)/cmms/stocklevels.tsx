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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  useStockLevelsQuery,
  useUpdateStockLevel,
} from '@/hooks/useCMMSPartsManagement';
import { StockLevel } from '@/types/cmms';
import {
  Search,
  X,
  ChevronRight,
  Package,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Filter,
  ArrowUpDown,
  Check,
  MapPin,
  DollarSign,
  Calendar,
  Hash,
  BarChart3,
  Clock,
  Edit3,
  Save,
  Layers,
  Box,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type StockStatus = 'ok' | 'low' | 'critical' | 'overstock' | 'out_of_stock';

const STATUS_CONFIG: Record<StockStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  ok: { label: 'In Stock', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 },
  low: { label: 'Low Stock', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: AlertTriangle },
  critical: { label: 'Critical', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: AlertCircle },
  overstock: { label: 'Overstock', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: TrendingUp },
  out_of_stock: { label: 'Out of Stock', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: XCircle },
};

type StatusFilter = 'all' | StockStatus;
type SortField = 'material_name' | 'on_hand' | 'total_value' | 'days_of_supply' | 'status';
type SortDirection = 'asc' | 'desc';

export default function StockLevelsScreen() {
  const { colors } = useTheme();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('material_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockLevel | null>(null);
  const [editOnHand, setEditOnHand] = useState('');

  const { data: stockLevels = [], isLoading, refetch } = useStockLevelsQuery({
    facilityId: facilityId || undefined,
  });

  const updateMutation = useUpdateStockLevel({
    onSuccess: () => {
      setShowEditModal(false);
      setSelectedStock(null);
      Alert.alert('Success', 'Stock level updated successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update stock level');
    },
  });

  const categories = useMemo(() => {
    const cats = new Set(stockLevels.map(s => s.category));
    return Array.from(cats).sort();
  }, [stockLevels]);

  const filteredStocks = useMemo(() => {
    let filtered = [...stockLevels];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(stock => stock.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(stock => stock.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(stock =>
        stock.materialName.toLowerCase().includes(query) ||
        stock.materialNumber.toLowerCase().includes(query) ||
        stock.materialSku.toLowerCase().includes(query) ||
        stock.location?.toLowerCase().includes(query) ||
        stock.category.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'material_name':
          comparison = a.materialName.localeCompare(b.materialName);
          break;
        case 'on_hand':
          comparison = a.onHand - b.onHand;
          break;
        case 'total_value':
          comparison = a.totalValue - b.totalValue;
          break;
        case 'days_of_supply':
          comparison = a.daysOfSupply - b.daysOfSupply;
          break;
        case 'status':
          const statusOrder = { out_of_stock: 0, critical: 1, low: 2, ok: 3, overstock: 4 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [stockLevels, statusFilter, categoryFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = stockLevels.length;
    const ok = stockLevels.filter(s => s.status === 'ok').length;
    const low = stockLevels.filter(s => s.status === 'low').length;
    const critical = stockLevels.filter(s => s.status === 'critical').length;
    const outOfStock = stockLevels.filter(s => s.status === 'out_of_stock').length;
    const overstock = stockLevels.filter(s => s.status === 'overstock').length;
    const totalValue = stockLevels.reduce((sum, s) => sum + (s.totalValue || 0), 0);
    return { total, ok, low, critical, outOfStock, overstock, totalValue };
  }, [stockLevels]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleStockPress = useCallback((stock: StockLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStock(stock);
    setShowDetailModal(true);
  }, []);

  const handleEditPress = useCallback(() => {
    if (!selectedStock) return;
    setEditOnHand(selectedStock.onHand.toString());
    setShowDetailModal(false);
    setShowEditModal(true);
  }, [selectedStock]);

  const handleSaveCount = useCallback(() => {
    if (!selectedStock) return;
    const newOnHand = parseInt(editOnHand, 10);
    if (isNaN(newOnHand) || newOnHand < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid quantity');
      return;
    }

    Alert.alert(
      'Confirm Stock Count',
      `Update on-hand quantity from ${selectedStock.onHand} to ${newOnHand}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => {
            updateMutation.mutate({
              id: selectedStock.id,
              updates: {
                onHand: newOnHand,
                lastCountedAt: new Date().toISOString(),
              },
            });
          },
        },
      ]
    );
  }, [selectedStock, editOnHand, updateMutation]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStockLevelBar = (stock: StockLevel) => {
    const percentage = stock.maxLevel > 0 ? Math.min((stock.onHand / stock.maxLevel) * 100, 100) : 0;
    const reorderPercentage = stock.maxLevel > 0 ? (stock.reorderPoint / stock.maxLevel) * 100 : 0;
    const statusConfig = STATUS_CONFIG[stock.status];

    return (
      <View style={styles.stockBarContainer}>
        <View style={[styles.stockBarBackground, { backgroundColor: colors.backgroundSecondary }]}>
          <View
            style={[
              styles.stockBarFill,
              {
                width: `${percentage}%`,
                backgroundColor: statusConfig.color,
              },
            ]}
          />
          <View
            style={[
              styles.reorderMarker,
              {
                left: `${reorderPercentage}%`,
                backgroundColor: '#F59E0B',
              },
            ]}
          />
        </View>
        <View style={styles.stockBarLabels}>
          <Text style={[styles.stockBarMin, { color: colors.textTertiary }]}>0</Text>
          <Text style={[styles.stockBarMax, { color: colors.textTertiary }]}>{stock.maxLevel}</Text>
        </View>
      </View>
    );
  };

  const renderStockCard = (stock: StockLevel) => {
    const statusConfig = STATUS_CONFIG[stock.status];
    const StatusIcon = statusConfig.icon;

    return (
      <TouchableOpacity
        key={stock.id}
        style={[styles.stockCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleStockPress(stock)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.materialInfo}>
            <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
              {stock.materialName}
            </Text>
            <Text style={[styles.materialSku, { color: colors.textTertiary }]}>
              {stock.materialSku}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <StatusIcon size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.stockDetails}>
          <View style={styles.stockMetric}>
            <Text style={[styles.stockMetricLabel, { color: colors.textTertiary }]}>On Hand</Text>
            <Text style={[styles.stockMetricValue, { color: colors.text }]}>{stock.onHand}</Text>
          </View>
          <View style={styles.stockMetric}>
            <Text style={[styles.stockMetricLabel, { color: colors.textTertiary }]}>Reorder Pt</Text>
            <Text style={[styles.stockMetricValue, { color: stock.onHand <= stock.reorderPoint ? '#F59E0B' : colors.text }]}>
              {stock.reorderPoint}
            </Text>
          </View>
          <View style={styles.stockMetric}>
            <Text style={[styles.stockMetricLabel, { color: colors.textTertiary }]}>Days Supply</Text>
            <Text style={[styles.stockMetricValue, { color: stock.daysOfSupply < 7 ? '#EF4444' : colors.text }]}>
              {stock.daysOfSupply}
            </Text>
          </View>
          <View style={styles.stockMetric}>
            <Text style={[styles.stockMetricLabel, { color: colors.textTertiary }]}>Value</Text>
            <Text style={[styles.stockMetricValue, { color: '#10B981' }]}>
              {formatCurrency(stock.totalValue)}
            </Text>
          </View>
        </View>

        {getStockLevelBar(stock)}

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.locationInfo}>
            {stock.location && (
              <View style={styles.locationBadge}>
                <MapPin size={12} color={colors.textTertiary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                  {stock.location}{stock.bin ? ` / ${stock.bin}` : ''}
                </Text>
              </View>
            )}
            <View style={[styles.categoryBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Layers size={12} color={colors.textSecondary} />
              <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                {stock.category}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedStock) return null;
    const statusConfig = STATUS_CONFIG[selectedStock.status];
    const StatusIcon = statusConfig.icon;

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Stock Details</Text>
            <TouchableOpacity
              onPress={handleEditPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Edit3 size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <View style={styles.materialHeaderInfo}>
                  <Text style={[styles.materialNameLarge, { color: colors.text }]}>
                    {selectedStock.materialName}
                  </Text>
                  <Text style={[styles.materialSkuLarge, { color: colors.textTertiary }]}>
                    {selectedStock.materialSku}
                  </Text>
                </View>
                <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.bgColor }]}>
                  <StatusIcon size={16} color={statusConfig.color} />
                  <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>

              <View style={styles.stockVisualSection}>
                <View style={[styles.onHandDisplay, { backgroundColor: statusConfig.bgColor }]}>
                  <Text style={[styles.onHandLabel, { color: statusConfig.color }]}>On Hand</Text>
                  <Text style={[styles.onHandValue, { color: statusConfig.color }]}>{selectedStock.onHand}</Text>
                </View>
                <View style={styles.stockLimits}>
                  <View style={styles.limitRow}>
                    <Text style={[styles.limitLabel, { color: colors.textTertiary }]}>Min Level</Text>
                    <Text style={[styles.limitValue, { color: colors.text }]}>{selectedStock.minLevel}</Text>
                  </View>
                  <View style={styles.limitRow}>
                    <Text style={[styles.limitLabel, { color: colors.textTertiary }]}>Reorder Pt</Text>
                    <Text style={[styles.limitValue, { color: '#F59E0B' }]}>{selectedStock.reorderPoint}</Text>
                  </View>
                  <View style={styles.limitRow}>
                    <Text style={[styles.limitLabel, { color: colors.textTertiary }]}>Max Level</Text>
                    <Text style={[styles.limitValue, { color: colors.text }]}>{selectedStock.maxLevel}</Text>
                  </View>
                </View>
              </View>

              {getStockLevelBar(selectedStock)}
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Usage & Supply</Text>
              
              <View style={styles.metricsGrid}>
                <View style={[styles.metricBox, { backgroundColor: colors.backgroundSecondary }]}>
                  <BarChart3 size={18} color="#3B82F6" />
                  <Text style={[styles.metricBoxLabel, { color: colors.textTertiary }]}>Avg Daily Usage</Text>
                  <Text style={[styles.metricBoxValue, { color: colors.text }]}>{selectedStock.avgDailyUsage.toFixed(1)}</Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: colors.backgroundSecondary }]}>
                  <TrendingDown size={18} color="#8B5CF6" />
                  <Text style={[styles.metricBoxLabel, { color: colors.textTertiary }]}>Avg Monthly Usage</Text>
                  <Text style={[styles.metricBoxValue, { color: colors.text }]}>{selectedStock.avgMonthlyUsage.toFixed(1)}</Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: selectedStock.daysOfSupply < 7 ? 'rgba(239, 68, 68, 0.1)' : colors.backgroundSecondary }]}>
                  <Clock size={18} color={selectedStock.daysOfSupply < 7 ? '#EF4444' : '#10B981'} />
                  <Text style={[styles.metricBoxLabel, { color: colors.textTertiary }]}>Days of Supply</Text>
                  <Text style={[styles.metricBoxValue, { color: selectedStock.daysOfSupply < 7 ? '#EF4444' : colors.text }]}>
                    {selectedStock.daysOfSupply}
                  </Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: colors.backgroundSecondary }]}>
                  <Package size={18} color="#F59E0B" />
                  <Text style={[styles.metricBoxLabel, { color: colors.textTertiary }]}>Reorder Qty</Text>
                  <Text style={[styles.metricBoxValue, { color: colors.text }]}>{selectedStock.reorderQty}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Cost & Value</Text>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#10B981' + '15' }]}>
                  <DollarSign size={16} color="#10B981" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Unit Cost</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatCurrency(selectedStock.unitCost)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                  <DollarSign size={16} color="#3B82F6" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Total Value</Text>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>
                    {formatCurrency(selectedStock.totalValue)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location & Activity</Text>
              
              {selectedStock.location && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
                    <MapPin size={16} color="#8B5CF6" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Location</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedStock.location}{selectedStock.bin ? ` / Bin: ${selectedStock.bin}` : ''}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                  <Layers size={16} color="#F59E0B" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Category</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedStock.category}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#10B981' + '15' }]}>
                  <Calendar size={16} color="#10B981" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Last Received</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(selectedStock.lastReceived)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#EF4444' + '15' }]}>
                  <Calendar size={16} color="#EF4444" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Last Issued</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(selectedStock.lastIssued)}
                  </Text>
                </View>
              </View>

              {selectedStock.lastCountedAt && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#6B7280' + '15' }]}>
                    <Hash size={16} color="#6B7280" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Last Counted</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(selectedStock.lastCountedAt)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderEditModal = () => {
    if (!selectedStock) return null;

    return (
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.editModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.editModalTitle, { color: colors.text }]}>Update Stock Count</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.editModalBody}>
              <Text style={[styles.editMaterialName, { color: colors.text }]}>
                {selectedStock.materialName}
              </Text>
              <Text style={[styles.editMaterialSku, { color: colors.textTertiary }]}>
                {selectedStock.materialSku}
              </Text>

              <View style={styles.editCurrentStock}>
                <Text style={[styles.editCurrentLabel, { color: colors.textTertiary }]}>
                  Current On Hand:
                </Text>
                <Text style={[styles.editCurrentValue, { color: colors.text }]}>
                  {selectedStock.onHand}
                </Text>
              </View>

              <View style={styles.editInputContainer}>
                <Text style={[styles.editInputLabel, { color: colors.text }]}>New Quantity</Text>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={editOnHand}
                  onChangeText={setEditOnHand}
                  keyboardType="number-pad"
                  placeholder="Enter quantity"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={[styles.editModalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.editCancelButton, { borderColor: colors.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.editCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveCount}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFFFFF" />
                    <Text style={styles.editSaveText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.filterModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filter by Status</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                { borderBottomColor: colors.border },
                statusFilter === 'all' && { backgroundColor: colors.primary + '10' },
              ]}
              onPress={() => {
                setStatusFilter('all');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, { color: statusFilter === 'all' ? colors.primary : colors.text }]}>
                All Status
              </Text>
              {statusFilter === 'all' && <Check size={20} color={colors.primary} />}
            </TouchableOpacity>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterOption,
                  { borderBottomColor: colors.border },
                  statusFilter === status && { backgroundColor: config.bgColor },
                ]}
                onPress={() => {
                  setStatusFilter(status as StockStatus);
                  setShowFilterModal(false);
                }}
              >
                <View style={styles.filterOptionContent}>
                  <config.icon size={18} color={config.color} />
                  <Text style={[styles.filterOptionText, { color: statusFilter === status ? config.color : colors.text }]}>
                    {config.label}
                  </Text>
                </View>
                {statusFilter === status && <Check size={20} color={config.color} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
              { field: 'material_name', label: 'Material Name' },
              { field: 'on_hand', label: 'On Hand Qty' },
              { field: 'total_value', label: 'Total Value' },
              { field: 'days_of_supply', label: 'Days of Supply' },
              { field: 'status', label: 'Status' },
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
                    setSortDirection('asc');
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading stock levels...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Stock Levels',
        }}
      />

      <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.ok.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.ok.color }]}>{statistics.ok}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.ok.color }]}>In Stock</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.low.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.low.color }]}>{statistics.low}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.low.color }]}>Low</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.critical.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.critical.color }]}>{statistics.critical}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.critical.color }]}>Critical</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.out_of_stock.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.out_of_stock.color }]}>{statistics.outOfStock}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.out_of_stock.color }]}>Out</Text>
          </View>
        </View>
        <View style={[styles.totalValueRow, { backgroundColor: '#10B981' + '10' }]}>
          <DollarSign size={16} color="#10B981" />
          <Text style={[styles.totalValueLabel, { color: '#10B981' }]}>Total Inventory Value:</Text>
          <Text style={[styles.totalValueAmount, { color: '#10B981' }]}>{formatCurrency(statistics.totalValue)}</Text>
        </View>
      </View>

      <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search parts, SKU, location..."
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
          style={[
            styles.filterButton,
            { backgroundColor: colors.surface, borderColor: statusFilter !== 'all' ? colors.primary : colors.border },
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={statusFilter !== 'all' ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowSortModal(true)}
        >
          <ArrowUpDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.resultsHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {filteredStocks.length} {filteredStocks.length === 1 ? 'item' : 'items'}
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
        {filteredStocks.length > 0 ? (
          filteredStocks.map(renderStockCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
              <Box size={44} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Stock Items</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery || statusFilter !== 'all'
                ? 'No items match your filters'
                : 'Stock items will appear here when added'}
            </Text>
          </View>
        )}
      </ScrollView>

      {renderDetailModal()}
      {renderEditModal()}
      {renderFilterModal()}
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
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    marginTop: 2,
  },
  totalValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  totalValueLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  totalValueAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
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
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  stockCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  stockDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  stockMetric: {
    flex: 1,
    alignItems: 'center',
  },
  stockMetricLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  stockMetricValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  stockBarContainer: {
    gap: 4,
  },
  stockBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  stockBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  reorderMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    borderRadius: 1,
  },
  stockBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockBarMin: {
    fontSize: 10,
  },
  stockBarMax: {
    fontSize: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500' as const,
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
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
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
    fontSize: 13,
    marginTop: 4,
  },
  stockVisualSection: {
    flexDirection: 'row',
    gap: 16,
  },
  onHandDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
  },
  onHandLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  onHandValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  stockLimits: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitLabel: {
    fontSize: 13,
  },
  limitValue: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricBox: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    gap: 6,
  },
  metricBoxLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  metricBoxValue: {
    fontSize: 18,
    fontWeight: '700' as const,
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
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  editModalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  editModalBody: {
    padding: 20,
    gap: 16,
  },
  editMaterialName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  editMaterialSku: {
    fontSize: 13,
    marginTop: -8,
  },
  editCurrentStock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  editCurrentLabel: {
    fontSize: 14,
  },
  editCurrentValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  editInputContainer: {
    gap: 8,
  },
  editInputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  editInput: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  editModalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  editCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  editSaveButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editSaveText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
