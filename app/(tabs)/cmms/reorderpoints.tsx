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
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  useReorderPointsQuery,
  useUpdateReorderPoint,
} from '@/hooks/useCMMSPartsManagement';
import { ReorderPoint } from '@/types/cmms';
import {
  Search,
  X,
  ChevronRight,
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  Truck,
  DollarSign,
  Filter,
  ArrowUpDown,
  Check,
  Settings,
  RefreshCw,
  ShoppingCart,
  Hash,
  Building2,
  Calendar,
  BarChart3,
  Layers,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type StatusFilter = 'all' | 'needs_reorder' | 'ok' | 'auto_reorder';
type SortField = 'material_name' | 'current_on_hand' | 'days_supply' | 'unit_cost';
type SortDirection = 'asc' | 'desc';

export default function ReorderPointsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('material_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReorderPoint | null>(null);

  const [editReorderPoint, setEditReorderPoint] = useState('');
  const [editReorderQty, setEditReorderQty] = useState('');
  const [editLeadTime, setEditLeadTime] = useState('');
  const [editSafetyDays, setEditSafetyDays] = useState('');
  const [editAutoReorder, setEditAutoReorder] = useState(false);

  const { data: reorderPoints = [], isLoading, refetch } = useReorderPointsQuery({
    facilityId: facilityId || undefined,
  });

  const updateMutation = useUpdateReorderPoint({
    onSuccess: () => {
      setShowEditModal(false);
      setShowDetailModal(false);
      Alert.alert('Success', 'Reorder point settings updated');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update reorder point');
    },
  });

  const filteredItems = useMemo(() => {
    let filtered = [...reorderPoints];

    if (statusFilter === 'needs_reorder') {
      filtered = filtered.filter(item => item.currentOnHand <= item.reorderPoint);
    } else if (statusFilter === 'ok') {
      filtered = filtered.filter(item => item.currentOnHand > item.reorderPoint);
    } else if (statusFilter === 'auto_reorder') {
      filtered = filtered.filter(item => item.isAutoReorder);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.materialName.toLowerCase().includes(query) ||
        item.materialNumber.toLowerCase().includes(query) ||
        item.materialSku.toLowerCase().includes(query) ||
        item.preferredVendorName?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'material_name':
          comparison = a.materialName.localeCompare(b.materialName);
          break;
        case 'current_on_hand':
          comparison = a.currentOnHand - b.currentOnHand;
          break;
        case 'days_supply':
          const aDays = a.avgDailyUsage > 0 ? a.currentOnHand / a.avgDailyUsage : 999;
          const bDays = b.avgDailyUsage > 0 ? b.currentOnHand / b.avgDailyUsage : 999;
          comparison = aDays - bDays;
          break;
        case 'unit_cost':
          comparison = a.unitCost - b.unitCost;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [reorderPoints, statusFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = reorderPoints.length;
    const needsReorder = reorderPoints.filter(i => i.currentOnHand <= i.reorderPoint).length;
    const autoEnabled = reorderPoints.filter(i => i.isAutoReorder).length;
    const pendingOrders = reorderPoints.filter(i => i.pendingOrderQty > 0).length;
    const totalValue = reorderPoints.reduce((sum, i) => sum + (i.currentOnHand * i.unitCost), 0);
    return { total, needsReorder, autoEnabled, pendingOrders, totalValue };
  }, [reorderPoints]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleItemPress = useCallback((item: ReorderPoint) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(item);
    setShowDetailModal(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (!selectedItem) return;
    setEditReorderPoint(selectedItem.reorderPoint.toString());
    setEditReorderQty(selectedItem.reorderQty.toString());
    setEditLeadTime(selectedItem.leadTimeDays.toString());
    setEditSafetyDays(selectedItem.safetyStockDays.toString());
    setEditAutoReorder(selectedItem.isAutoReorder);
    setShowEditModal(true);
  }, [selectedItem]);

  const handleSaveEdit = useCallback(() => {
    if (!selectedItem) return;
    
    const reorderPointVal = parseInt(editReorderPoint, 10);
    const reorderQtyVal = parseInt(editReorderQty, 10);
    const leadTimeVal = parseInt(editLeadTime, 10);
    const safetyDaysVal = parseInt(editSafetyDays, 10);

    if (isNaN(reorderPointVal) || reorderPointVal < 0) {
      Alert.alert('Error', 'Please enter a valid reorder point');
      return;
    }
    if (isNaN(reorderQtyVal) || reorderQtyVal <= 0) {
      Alert.alert('Error', 'Please enter a valid reorder quantity');
      return;
    }

    updateMutation.mutate({
      id: selectedItem.id,
      updates: {
        reorderPoint: reorderPointVal,
        reorderQty: reorderQtyVal,
        leadTimeDays: isNaN(leadTimeVal) ? selectedItem.leadTimeDays : leadTimeVal,
        safetyStockDays: isNaN(safetyDaysVal) ? selectedItem.safetyStockDays : safetyDaysVal,
        isAutoReorder: editAutoReorder,
      },
    });
  }, [selectedItem, editReorderPoint, editReorderQty, editLeadTime, editSafetyDays, editAutoReorder, updateMutation]);

  const handleCreateRequest = useCallback(() => {
    if (!selectedItem) return;
    setShowDetailModal(false);
    router.push('/cmms/partsrequest' as any);
  }, [selectedItem, router]);

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

  const getStockStatus = (item: ReorderPoint) => {
    const ratio = item.currentOnHand / item.reorderPoint;
    if (item.currentOnHand === 0) {
      return { label: 'Out of Stock', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: AlertCircle };
    }
    if (ratio <= 1) {
      return { label: 'Needs Reorder', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: AlertTriangle };
    }
    if (ratio <= 1.5) {
      return { label: 'Low Stock', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: TrendingDown };
    }
    return { label: 'In Stock', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 };
  };

  const getDaysOfSupply = (item: ReorderPoint) => {
    if (item.avgDailyUsage <= 0) return 'N/A';
    const days = Math.round(item.currentOnHand / item.avgDailyUsage);
    return `${days} days`;
  };

  const renderItemCard = (item: ReorderPoint) => {
    const status = getStockStatus(item);
    const StatusIcon = status.icon;
    const needsReorder = item.currentOnHand <= item.reorderPoint;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.itemCard, 
          { backgroundColor: colors.surface, borderColor: needsReorder ? status.color + '50' : colors.border }
        ]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.materialInfo}>
            <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
              {item.materialName}
            </Text>
            <Text style={[styles.materialSku, { color: colors.textTertiary }]}>
              {item.materialSku}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <StatusIcon size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.stockLevelsRow}>
          <View style={[styles.levelBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.levelLabel, { color: colors.textTertiary }]}>On Hand</Text>
            <Text style={[styles.levelValue, { color: needsReorder ? status.color : colors.text }]}>
              {item.currentOnHand}
            </Text>
          </View>
          <View style={[styles.levelBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.levelLabel, { color: colors.textTertiary }]}>Reorder Point</Text>
            <Text style={[styles.levelValue, { color: colors.text }]}>
              {item.reorderPoint}
            </Text>
          </View>
          <View style={[styles.levelBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.levelLabel, { color: colors.textTertiary }]}>Reorder Qty</Text>
            <Text style={[styles.levelValue, { color: colors.primary }]}>
              {item.reorderQty}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.metricText, { color: colors.textSecondary }]}>
              {getDaysOfSupply(item)} supply
            </Text>
          </View>
          <View style={styles.metricItem}>
            <DollarSign size={14} color={colors.textSecondary} />
            <Text style={[styles.metricText, { color: colors.textSecondary }]}>
              {formatCurrency(item.unitCost)}/ea
            </Text>
          </View>
          {item.isAutoReorder && (
            <View style={[styles.autoReorderBadge, { backgroundColor: '#8B5CF6' + '15' }]}>
              <RefreshCw size={12} color="#8B5CF6" />
              <Text style={[styles.autoReorderText, { color: '#8B5CF6' }]}>Auto</Text>
            </View>
          )}
        </View>

        {item.pendingOrderQty > 0 && (
          <View style={[styles.pendingOrderRow, { backgroundColor: '#3B82F6' + '10' }]}>
            <Truck size={14} color="#3B82F6" />
            <Text style={[styles.pendingOrderText, { color: '#3B82F6' }]}>
              {item.pendingOrderQty} units on order
            </Text>
          </View>
        )}

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.vendorInfo}>
            {item.preferredVendorName ? (
              <>
                <Building2 size={14} color={colors.textTertiary} />
                <Text style={[styles.vendorName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.preferredVendorName}
                </Text>
              </>
            ) : (
              <Text style={[styles.noVendor, { color: colors.textTertiary }]}>No preferred vendor</Text>
            )}
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedItem) return null;
    const status = getStockStatus(selectedItem);
    const StatusIcon = status.icon;
    const needsReorder = selectedItem.currentOnHand <= selectedItem.reorderPoint;

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reorder Point Details</Text>
            <TouchableOpacity onPress={handleEdit}>
              <Settings size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <View style={styles.materialHeaderInfo}>
                  <Text style={[styles.materialNameLarge, { color: colors.text }]}>
                    {selectedItem.materialName}
                  </Text>
                  <Text style={[styles.materialSkuLarge, { color: colors.textTertiary }]}>
                    {selectedItem.materialSku} • {selectedItem.materialNumber}
                  </Text>
                </View>
                <View style={[styles.statusBadgeLarge, { backgroundColor: status.bgColor }]}>
                  <StatusIcon size={16} color={status.color} />
                  <Text style={[styles.statusTextLarge, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>

              <View style={styles.stockLevelsGrid}>
                <View style={[styles.stockLevelCard, { backgroundColor: needsReorder ? status.bgColor : colors.backgroundSecondary }]}>
                  <Package size={20} color={needsReorder ? status.color : colors.textSecondary} />
                  <Text style={[styles.stockLevelLabel, { color: colors.textTertiary }]}>Current Stock</Text>
                  <Text style={[styles.stockLevelValue, { color: needsReorder ? status.color : colors.text }]}>
                    {selectedItem.currentOnHand}
                  </Text>
                </View>
                <View style={[styles.stockLevelCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <AlertTriangle size={20} color="#F59E0B" />
                  <Text style={[styles.stockLevelLabel, { color: colors.textTertiary }]}>Reorder Point</Text>
                  <Text style={[styles.stockLevelValue, { color: colors.text }]}>
                    {selectedItem.reorderPoint}
                  </Text>
                </View>
                <View style={[styles.stockLevelCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Layers size={20} color={colors.primary} />
                  <Text style={[styles.stockLevelLabel, { color: colors.textTertiary }]}>Reorder Qty</Text>
                  <Text style={[styles.stockLevelValue, { color: colors.primary }]}>
                    {selectedItem.reorderQty}
                  </Text>
                </View>
                <View style={[styles.stockLevelCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <TrendingUp size={20} color="#10B981" />
                  <Text style={[styles.stockLevelLabel, { color: colors.textTertiary }]}>Max Level</Text>
                  <Text style={[styles.stockLevelValue, { color: colors.text }]}>
                    {selectedItem.maxLevel}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                  <BarChart3 size={16} color="#3B82F6" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Average Daily Usage</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedItem.avgDailyUsage.toFixed(2)} units/day
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                  <Clock size={16} color="#F59E0B" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Days of Supply</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {getDaysOfSupply(selectedItem)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
                  <Truck size={16} color="#8B5CF6" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Lead Time</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedItem.leadTimeDays} days
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#10B981' + '15' }]}>
                  <DollarSign size={16} color="#10B981" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Unit Cost</Text>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>
                    {formatCurrency(selectedItem.unitCost)}
                  </Text>
                </View>
              </View>

              {selectedItem.preferredVendorName && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Building2 size={16} color={colors.primary} />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Preferred Vendor</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedItem.preferredVendorName}
                    </Text>
                  </View>
                </View>
              )}

              {selectedItem.lastOrderDate && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#6B7280' + '15' }]}>
                    <Calendar size={16} color="#6B7280" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Last Order</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(selectedItem.lastOrderDate)} • {selectedItem.lastOrderQty} units
                    </Text>
                  </View>
                </View>
              )}

              {selectedItem.pendingOrderQty > 0 && (
                <View style={[styles.pendingOrderBox, { backgroundColor: '#3B82F6' + '10', borderColor: '#3B82F6' + '30' }]}>
                  <Truck size={18} color="#3B82F6" />
                  <View style={styles.pendingOrderContent}>
                    <Text style={[styles.pendingOrderLabel, { color: '#3B82F6' }]}>Pending Order</Text>
                    <Text style={[styles.pendingOrderValue, { color: colors.text }]}>
                      {selectedItem.pendingOrderQty} units on order
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.autoReorderSection, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.autoReorderHeader}>
                  <RefreshCw size={18} color={selectedItem.isAutoReorder ? '#8B5CF6' : colors.textTertiary} />
                  <Text style={[styles.autoReorderTitle, { color: colors.text }]}>Auto Reorder</Text>
                </View>
                <View style={[
                  styles.autoReorderStatus,
                  { backgroundColor: selectedItem.isAutoReorder ? '#8B5CF6' + '15' : colors.surface }
                ]}>
                  <Text style={[
                    styles.autoReorderStatusText,
                    { color: selectedItem.isAutoReorder ? '#8B5CF6' : colors.textTertiary }
                  ]}>
                    {selectedItem.isAutoReorder ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>

              <View style={styles.calculatedSection}>
                <Text style={[styles.calculatedTitle, { color: colors.textTertiary }]}>Calculated Values</Text>
                <View style={styles.calculatedRow}>
                  <Text style={[styles.calculatedLabel, { color: colors.textSecondary }]}>
                    Calculated Reorder Point:
                  </Text>
                  <Text style={[styles.calculatedValue, { color: colors.text }]}>
                    {selectedItem.calculatedReorderPoint}
                  </Text>
                </View>
                <View style={styles.calculatedRow}>
                  <Text style={[styles.calculatedLabel, { color: colors.textSecondary }]}>
                    Calculated Reorder Qty:
                  </Text>
                  <Text style={[styles.calculatedValue, { color: colors.text }]}>
                    {selectedItem.calculatedReorderQty}
                  </Text>
                </View>
                <View style={styles.calculatedRow}>
                  <Text style={[styles.calculatedLabel, { color: colors.textSecondary }]}>
                    Safety Stock Days:
                  </Text>
                  <Text style={[styles.calculatedValue, { color: colors.text }]}>
                    {selectedItem.safetyStockDays} days
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {needsReorder && (
            <View style={[styles.modalActions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateRequest}
              >
                <ShoppingCart size={18} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Create Purchase Request</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  const renderEditModal = () => {
    if (!selectedItem) return null;

    return (
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Reorder Settings</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.editSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.editSectionTitle, { color: colors.text }]}>
                {selectedItem.materialName}
              </Text>
              <Text style={[styles.editSectionSubtitle, { color: colors.textTertiary }]}>
                {selectedItem.materialSku}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reorder Point</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={editReorderPoint}
                  onChangeText={setEditReorderPoint}
                  keyboardType="numeric"
                  placeholder="Enter reorder point"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={[styles.inputHint, { color: colors.textTertiary }]}>
                  Order will be triggered when stock falls below this level
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reorder Quantity</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={editReorderQty}
                  onChangeText={setEditReorderQty}
                  keyboardType="numeric"
                  placeholder="Enter reorder quantity"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={[styles.inputHint, { color: colors.textTertiary }]}>
                  Default quantity to order when reordering
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Lead Time (Days)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={editLeadTime}
                  onChangeText={setEditLeadTime}
                  keyboardType="numeric"
                  placeholder="Enter lead time"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={[styles.inputHint, { color: colors.textTertiary }]}>
                  Expected time from order to delivery
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Safety Stock Days</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={editSafetyDays}
                  onChangeText={setEditSafetyDays}
                  keyboardType="numeric"
                  placeholder="Enter safety stock days"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={[styles.inputHint, { color: colors.textTertiary }]}>
                  Buffer stock to account for demand variability
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  { backgroundColor: editAutoReorder ? '#8B5CF6' + '15' : colors.backgroundSecondary, borderColor: editAutoReorder ? '#8B5CF6' : colors.border }
                ]}
                onPress={() => setEditAutoReorder(!editAutoReorder)}
              >
                <View style={styles.toggleContent}>
                  <RefreshCw size={20} color={editAutoReorder ? '#8B5CF6' : colors.textSecondary} />
                  <View style={styles.toggleTextContent}>
                    <Text style={[styles.toggleTitle, { color: colors.text }]}>Auto Reorder</Text>
                    <Text style={[styles.toggleDescription, { color: colors.textTertiary }]}>
                      Automatically create purchase requests when stock falls below reorder point
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.checkbox,
                  { backgroundColor: editAutoReorder ? '#8B5CF6' : 'transparent', borderColor: editAutoReorder ? '#8B5CF6' : colors.border }
                ]}>
                  {editAutoReorder && <Check size={14} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={[styles.modalActions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>Save Changes</Text>
              )}
            </TouchableOpacity>
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
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filter Items</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterOptions}>
            {[
              { value: 'all', label: 'All Items', icon: Package, color: colors.primary },
              { value: 'needs_reorder', label: 'Needs Reorder', icon: AlertTriangle, color: '#F59E0B' },
              { value: 'ok', label: 'In Stock', icon: CheckCircle2, color: '#10B981' },
              { value: 'auto_reorder', label: 'Auto Reorder Enabled', icon: RefreshCw, color: '#8B5CF6' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  { borderBottomColor: colors.border },
                  statusFilter === option.value && { backgroundColor: option.color + '10' },
                ]}
                onPress={() => {
                  setStatusFilter(option.value as StatusFilter);
                  setShowFilterModal(false);
                }}
              >
                <View style={styles.filterOptionContent}>
                  <option.icon size={18} color={statusFilter === option.value ? option.color : colors.textSecondary} />
                  <Text style={[
                    styles.filterOptionText,
                    { color: statusFilter === option.value ? option.color : colors.text }
                  ]}>
                    {option.label}
                  </Text>
                </View>
                {statusFilter === option.value && <Check size={20} color={option.color} />}
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
              { field: 'current_on_hand', label: 'Current Stock' },
              { field: 'days_supply', label: 'Days of Supply' },
              { field: 'unit_cost', label: 'Unit Cost' },
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
                <Text style={[
                  styles.filterOptionText,
                  { color: sortField === option.field ? colors.primary : colors.text }
                ]}>
                  {option.label}
                </Text>
                {sortField === option.field && (
                  <Text style={[styles.sortDirectionText, { color: colors.primary }]}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </Text>
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading reorder points...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Reorder Points' }} />

      <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.primary + '12' }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total}</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Total</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#F59E0B' + '15' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{statistics.needsReorder}</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Need Reorder</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#8B5CF6' + '15' }]}>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{statistics.autoEnabled}</Text>
            <Text style={[styles.statLabel, { color: '#8B5CF6' }]}>Auto Enabled</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#3B82F6' + '15' }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{statistics.pendingOrders}</Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>On Order</Text>
          </View>
        </View>
      </View>

      <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search materials, SKUs, vendors..."
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
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
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
        {filteredItems.length > 0 ? (
          filteredItems.map(renderItemCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
              <Package size={44} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Reorder Points</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery || statusFilter !== 'all'
                ? 'No items match your filters'
                : 'Reorder points will appear here when configured'}
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
    fontSize: 9,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    marginTop: 2,
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
  itemCard: {
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
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusTextLarge: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  stockLevelsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  levelBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  levelValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricText: {
    fontSize: 12,
  },
  autoReorderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  autoReorderText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  pendingOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  pendingOrderText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  vendorName: {
    fontSize: 13,
    flex: 1,
  },
  noVendor: {
    fontSize: 13,
    fontStyle: 'italic' as const,
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
    textAlign: 'center' as const,
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
    gap: 12,
  },
  materialHeaderInfo: {
    gap: 4,
  },
  materialNameLarge: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  materialSkuLarge: {
    fontSize: 13,
  },
  stockLevelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  stockLevelCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  stockLevelLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  stockLevelValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  divider: {
    height: 1,
    marginVertical: 4,
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
  pendingOrderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  pendingOrderContent: {
    flex: 1,
  },
  pendingOrderLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  pendingOrderValue: {
    fontSize: 14,
    marginTop: 2,
  },
  autoReorderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
  },
  autoReorderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoReorderTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  autoReorderStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  autoReorderStatusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  calculatedSection: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  calculatedTitle: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  calculatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculatedLabel: {
    fontSize: 13,
  },
  calculatedValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  editSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 20,
  },
  editSectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  editSectionSubtitle: {
    fontSize: 13,
    marginTop: -16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputHint: {
    fontSize: 11,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTextContent: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  toggleDescription: {
    fontSize: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
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
  sortDirectionText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
