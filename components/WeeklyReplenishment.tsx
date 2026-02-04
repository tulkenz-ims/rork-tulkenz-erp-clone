import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Calendar,
  Package,
  ShoppingCart,
  Check,
  X,
  Search,
  Filter,
  Plus,
  Send,
  AlertTriangle,
  Clock,
  DollarSign,
  BarChart3,
  FileText,
  CheckCircle,
  Building2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { INVENTORY_DEPARTMENTS } from '@/constants/inventoryDepartmentCodes';
import {
  WeeklyCountItem,
  ReplenishmentRequisition,
  useReplenishmentItemsQuery,
  useReplenishmentRequisitionsQuery,
  useReplenishmentSummary,
  useRecordItemCount,
  useCreateReplenishmentRequisition,
  useSubmitRequisition,
  useApproveRequisition,
  getCurrentWeekDates,
  calculateOrderQuantity,
  getItemsBelowTarget,
  getItemsNeedingOrder,
  getRequisitionStatusColor,
  getRequisitionStatusLabel,
  getCountStatusColor,
  getCountStatusLabel,
} from '@/hooks/useSupabaseReplenishment';

type ViewMode = 'items' | 'count' | 'requisitions' | 'summary';
type FilterDept = number | 'all';

interface WeeklyReplenishmentProps {
  departmentFilter?: number;
}

const WeeklyReplenishment: React.FC<WeeklyReplenishmentProps> = ({
  departmentFilter,
}) => {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('items');
  const [deptFilter, setDeptFilter] = useState<FilterDept>(departmentFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<WeeklyCountItem | null>(null);
  const [showCountModal, setShowCountModal] = useState(false);
  const [countValue, setCountValue] = useState('');
  
  const [selectedRequisition, setSelectedRequisition] = useState<ReplenishmentRequisition | null>(null);
  const [showReqDetailModal, setShowReqDetailModal] = useState(false);
  
  const [showCreateReqModal, setShowCreateReqModal] = useState(false);
  const [selectedItemsForReq, setSelectedItemsForReq] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems } = useReplenishmentItemsQuery({
    departmentCode: deptFilter === 'all' ? undefined : deptFilter,
  });
  
  const { data: requisitions = [], isLoading: requisitionsLoading, refetch: refetchRequisitions } = useReplenishmentRequisitionsQuery();
  
  const recordCountMutation = useRecordItemCount({
    onSuccess: () => {
      setShowCountModal(false);
      setSelectedItem(null);
      setCountValue('');
    },
  });
  
  const createRequisitionMutation = useCreateReplenishmentRequisition({
    onSuccess: (newReq) => {
      setSelectedItemsForReq(new Set());
      setShowCreateReqModal(false);
      Alert.alert('Success', `Requisition ${newReq.requisitionNumber} created successfully`);
    },
  });
  
  const submitRequisitionMutation = useSubmitRequisition({
    onSuccess: () => {
      setShowReqDetailModal(false);
    },
  });
  
  const approveRequisitionMutation = useApproveRequisition({
    onSuccess: () => {
      setShowReqDetailModal(false);
    },
  });

  const weekInfo = useMemo(() => getCurrentWeekDates(), []);
  
  const summary = useReplenishmentSummary(items, requisitions);
  
  const refreshing = itemsLoading || requisitionsLoading;

  const filteredItems = useMemo(() => {
    let result = [...items].filter(i => i.isActive);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.materialName.toLowerCase().includes(query) ||
        i.materialNumber.toLowerCase().includes(query) ||
        i.sku.toLowerCase().includes(query) ||
        i.vendor.toLowerCase().includes(query)
      );
    }
    
    return result.sort((a, b) => {
      const aNeeds = a.buildToOrderQty - a.currentOnHand;
      const bNeeds = b.buildToOrderQty - b.currentOnHand;
      return bNeeds - aNeeds;
    });
  }, [items, searchQuery]);

  const itemsNeedingOrder = useMemo(() => 
    getItemsNeedingOrder(filteredItems),
    [filteredItems]
  );

  const itemsBelowTarget = useMemo(() => 
    getItemsBelowTarget(filteredItems),
    [filteredItems]
  );

  const onRefresh = useCallback(() => {
    console.log('[WeeklyReplenishment] Refreshing data...');
    refetchItems();
    refetchRequisitions();
  }, [refetchItems, refetchRequisitions]);

  const handleCountItem = useCallback((item: WeeklyCountItem) => {
    setSelectedItem(item);
    setCountValue(item.currentOnHand.toString());
    setShowCountModal(true);
    Haptics.selectionAsync();
  }, []);

  const handleSaveCount = useCallback(() => {
    if (!selectedItem) return;
    
    const counted = parseInt(countValue, 10);
    if (isNaN(counted) || counted < 0) {
      Alert.alert('Error', 'Please enter a valid count');
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    recordCountMutation.mutate({
      materialId: selectedItem.id,
      countedQty: counted,
      countedBy: 'Current User',
    });
  }, [selectedItem, countValue, recordCountMutation]);

  const toggleItemForReq = useCallback((itemId: string) => {
    setSelectedItemsForReq(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
    Haptics.selectionAsync();
  }, []);

  const handleCreateRequisition = useCallback(() => {
    const selectedItems = filteredItems.filter(i => selectedItemsForReq.has(i.id));
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select items to include in requisition');
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    createRequisitionMutation.mutate({
      items: selectedItems,
      departmentCode: deptFilter === 'all' ? 0 : deptFilter,
      departmentName: deptFilter === 'all' ? 'Multi-Department' : INVENTORY_DEPARTMENTS[deptFilter]?.name || 'Unknown',
      requestedBy: 'Current User',
      priority: itemsBelowTarget.length > 3 ? 'high' : 'normal',
      notes: 'Weekly replenishment requisition',
    });
  }, [filteredItems, selectedItemsForReq, deptFilter, itemsBelowTarget.length, createRequisitionMutation]);

  const handleSubmitRequisition = useCallback((req: ReplenishmentRequisition) => {
    Alert.alert(
      'Submit Requisition',
      `Submit ${req.requisitionNumber} for approval?\n\nTotal: ${req.totalValue.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            submitRequisitionMutation.mutate(req.id);
          }
        }
      ]
    );
  }, [submitRequisitionMutation]);

  const handleApproveRequisition = useCallback((req: ReplenishmentRequisition) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    approveRequisitionMutation.mutate({
      requisitionId: req.id,
      approvedBy: 'Current User',
    });
  }, [approveRequisitionMutation]);

  const selectAllForReq = useCallback(() => {
    const needingOrder = itemsNeedingOrder.map(i => i.id);
    setSelectedItemsForReq(new Set(needingOrder));
    Haptics.selectionAsync();
  }, [itemsNeedingOrder]);

  const renderSummaryCard = () => (
    <View style={[styles.summaryContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.summaryHeader}>
        <View style={styles.weekBadge}>
          <Calendar size={16} color={colors.primary} />
          <Text style={[styles.weekText, { color: colors.text }]}>
            Week {weekInfo.weekNumber}, {weekInfo.year}
          </Text>
        </View>
        <Text style={[styles.dateRange, { color: colors.textSecondary }]}>
          {weekInfo.start.toLocaleDateString()} - {weekInfo.end.toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Package size={20} color={colors.info} />
          <Text style={[styles.statValue, { color: colors.text }]}>{summary.totalActiveItems}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Items</Text>
        </View>
        <View style={styles.statItem}>
          <AlertTriangle size={20} color={colors.warning} />
          <Text style={[styles.statValue, { color: colors.warning }]}>{summary.itemsBelowTarget}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Below Target</Text>
        </View>
        <View style={styles.statItem}>
          <DollarSign size={20} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>${(summary.totalOrderValue / 1000).toFixed(1)}k</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Order Value</Text>
        </View>
        <View style={styles.statItem}>
          <FileText size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{summary.pendingRequisitions}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending PRs</Text>
        </View>
      </View>
    </View>
  );

  const renderItemCard = (item: WeeklyCountItem, selectable: boolean = false) => {
    const dept = INVENTORY_DEPARTMENTS[item.departmentCode];
    const needsOrder = item.currentOnHand < item.buildToOrderQty;
    const belowTarget = item.currentOnHand < item.weeklyTarget;
    const orderQty = calculateOrderQuantity(item.currentOnHand, item.buildToOrderQty);
    const isSelected = selectedItemsForReq.has(item.id);
    
    return (
      <Pressable
        key={item.id}
        style={[
          styles.itemCard,
          { backgroundColor: colors.surface },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={() => {
          if (selectable) {
            toggleItemForReq(item.id);
          } else {
            handleCountItem(item);
          }
        }}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleRow}>
            {selectable && (
              <View style={[
                styles.checkbox,
                { borderColor: colors.border },
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}>
                {isSelected && <Check size={14} color="#FFFFFF" />}
              </View>
            )}
            <View style={[styles.deptDot, { backgroundColor: dept?.color || colors.border }]} />
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
              {item.materialName}
            </Text>
          </View>
          <View style={[
            styles.statusChip,
            { backgroundColor: getCountStatusColor(item.countStatus) + '20' }
          ]}>
            <Text style={[styles.statusChipText, { color: getCountStatusColor(item.countStatus) }]}>
              {getCountStatusLabel(item.countStatus)}
            </Text>
          </View>
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={[styles.itemSku, { color: colors.textSecondary }]}>
            {item.materialNumber} • {item.sku}
          </Text>
          <Text style={[styles.itemVendor, { color: colors.textSecondary }]}>
            {item.vendor}
          </Text>
        </View>
        
        <View style={styles.qtyRow}>
          <View style={styles.qtyItem}>
            <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>On Hand</Text>
            <Text style={[
              styles.qtyValue,
              { color: belowTarget ? colors.error : colors.text }
            ]}>
              {item.currentOnHand}
            </Text>
          </View>
          <View style={styles.qtyItem}>
            <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Target</Text>
            <Text style={[styles.qtyValue, { color: colors.text }]}>{item.weeklyTarget}</Text>
          </View>
          <View style={styles.qtyItem}>
            <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Build To</Text>
            <Text style={[styles.qtyValue, { color: colors.primary }]}>{item.buildToOrderQty}</Text>
          </View>
          {needsOrder && (
            <View style={styles.qtyItem}>
              <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Order</Text>
              <Text style={[styles.qtyValue, { color: colors.success }]}>+{orderQty}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.itemFooter}>
          <View style={styles.footerLeft}>
            <DollarSign size={14} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              ${item.unitCost.toFixed(2)}/{item.unit}
            </Text>
          </View>
          {needsOrder && (
            <View style={[styles.orderBadge, { backgroundColor: colors.success + '15' }]}>
              <ShoppingCart size={12} color={colors.success} />
              <Text style={[styles.orderBadgeText, { color: colors.success }]}>
                ${(orderQty * item.unitCost).toFixed(2)}
              </Text>
            </View>
          )}
          {item.lastCountedAt && (
            <View style={styles.footerRight}>
              <Clock size={12} color={colors.textSecondary} />
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                {new Date(item.lastCountedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const renderRequisitionCard = (req: ReplenishmentRequisition) => {
    
    return (
      <Pressable
        key={req.id}
        style={[styles.reqCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          setSelectedRequisition(req);
          setShowReqDetailModal(true);
          Haptics.selectionAsync();
        }}
      >
        <View style={styles.reqHeader}>
          <View style={styles.reqTitleRow}>
            <FileText size={18} color={colors.primary} />
            <Text style={[styles.reqNumber, { color: colors.text }]}>{req.requisitionNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getRequisitionStatusColor(req.status) + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: getRequisitionStatusColor(req.status) }]}>
              {getRequisitionStatusLabel(req.status)}
            </Text>
          </View>
        </View>
        
        <View style={styles.reqDetails}>
          <View style={styles.reqInfoRow}>
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.reqDetailText, { color: colors.textSecondary }]}>
              {req.departmentName}
            </Text>
          </View>
          <View style={styles.reqInfoRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.reqDetailText, { color: colors.textSecondary }]}>
              Week {req.weekNumber}
            </Text>
          </View>
        </View>
        
        <View style={styles.reqFooter}>
          <View style={styles.reqFooterItem}>
            <Package size={14} color={colors.info} />
            <Text style={[styles.reqFooterText, { color: colors.text }]}>{req.totalItems} items</Text>
          </View>
          <View style={styles.reqFooterItem}>
            <DollarSign size={14} color={colors.success} />
            <Text style={[styles.reqFooterValue, { color: colors.success }]}>
              ${req.totalValue.toFixed(2)}
            </Text>
          </View>
        </View>
        
        {req.priority === 'high' || req.priority === 'urgent' ? (
          <View style={[styles.priorityBadge, { backgroundColor: colors.error + '15' }]}>
            <AlertTriangle size={12} color={colors.error} />
            <Text style={[styles.priorityText, { color: colors.error }]}>
              {req.priority.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderDeptSummary = () => (
    <ScrollView style={styles.summaryList} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Department Breakdown</Text>
      {summary.departmentBreakdown.map(dept => {
        const deptInfo = INVENTORY_DEPARTMENTS[dept.departmentCode];
        return (
          <View key={dept.departmentCode} style={[styles.deptSummaryCard, { backgroundColor: colors.surface }]}>
            <View style={styles.deptSummaryHeader}>
              <View style={[styles.deptIndicator, { backgroundColor: deptInfo?.color || colors.border }]} />
              <View style={styles.deptSummaryInfo}>
                <Text style={[styles.deptSummaryName, { color: colors.text }]}>{dept.departmentName}</Text>
                <Text style={[styles.deptSummaryCount, { color: colors.textSecondary }]}>
                  {dept.itemCount} items tracked
                </Text>
              </View>
            </View>
            <View style={styles.deptSummaryStats}>
              <View style={styles.deptStat}>
                <Text style={[styles.deptStatValue, { color: dept.belowTarget > 0 ? colors.warning : colors.success }]}>
                  {dept.belowTarget}
                </Text>
                <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>Below Target</Text>
              </View>
              <View style={styles.deptStat}>
                <Text style={[styles.deptStatValue, { color: colors.text }]}>
                  ${dept.orderValue.toFixed(0)}
                </Text>
                <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>Order Value</Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderCountModal = () => (
    <Modal visible={showCountModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Count Item</Text>
          <Pressable onPress={() => setShowCountModal(false)} hitSlop={8}>
            <X size={24} color={colors.text} />
          </Pressable>
        </View>
        
        {selectedItem && (
          <ScrollView style={styles.modalContent}>
            <View style={[styles.countItemInfo, { backgroundColor: colors.surface }]}>
              <Text style={[styles.countItemName, { color: colors.text }]}>{selectedItem.materialName}</Text>
              <Text style={[styles.countItemSku, { color: colors.textSecondary }]}>
                {selectedItem.materialNumber} • {selectedItem.sku}
              </Text>
              <Text style={[styles.countItemLocation, { color: colors.textSecondary }]}>
                Location: {selectedItem.location}
              </Text>
            </View>
            
            <View style={[styles.countTargets, { backgroundColor: colors.surface }]}>
              <View style={styles.countTargetRow}>
                <Text style={[styles.countTargetLabel, { color: colors.textSecondary }]}>Weekly Target</Text>
                <Text style={[styles.countTargetValue, { color: colors.text }]}>{selectedItem.weeklyTarget}</Text>
              </View>
              <View style={styles.countTargetRow}>
                <Text style={[styles.countTargetLabel, { color: colors.textSecondary }]}>Build To Order</Text>
                <Text style={[styles.countTargetValue, { color: colors.primary }]}>{selectedItem.buildToOrderQty}</Text>
              </View>
              <View style={styles.countTargetRow}>
                <Text style={[styles.countTargetLabel, { color: colors.textSecondary }]}>Last Count</Text>
                <Text style={[styles.countTargetValue, { color: colors.text }]}>
                  {selectedItem.lastCountedQty || 'N/A'}
                </Text>
              </View>
            </View>
            
            <View style={styles.countInputGroup}>
              <Text style={[styles.countInputLabel, { color: colors.text }]}>Current Count</Text>
              <TextInput
                style={[styles.countInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={countValue}
                onChangeText={setCountValue}
                keyboardType="number-pad"
                placeholder="Enter count"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
            </View>
            
            {countValue && !isNaN(parseInt(countValue, 10)) && (
              <View style={[styles.countPreview, { backgroundColor: colors.surface }]}>
                <Text style={[styles.countPreviewTitle, { color: colors.text }]}>Order Calculation</Text>
                <View style={styles.countPreviewRow}>
                  <Text style={[styles.countPreviewLabel, { color: colors.textSecondary }]}>Counted</Text>
                  <Text style={[styles.countPreviewValue, { color: colors.text }]}>{countValue}</Text>
                </View>
                <View style={styles.countPreviewRow}>
                  <Text style={[styles.countPreviewLabel, { color: colors.textSecondary }]}>Build To</Text>
                  <Text style={[styles.countPreviewValue, { color: colors.text }]}>{selectedItem.buildToOrderQty}</Text>
                </View>
                <View style={[styles.countPreviewRow, styles.countPreviewTotal]}>
                  <Text style={[styles.countPreviewLabel, { color: colors.text, fontWeight: '600' as const }]}>
                    Order Qty
                  </Text>
                  <Text style={[styles.countPreviewValue, { color: colors.success, fontWeight: '700' as const }]}>
                    {Math.max(0, selectedItem.buildToOrderQty - parseInt(countValue, 10))}
                  </Text>
                </View>
              </View>
            )}
            
            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveCount}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Count</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const renderCreateReqModal = () => (
    <Modal visible={showCreateReqModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Create Requisition</Text>
          <Pressable onPress={() => setShowCreateReqModal(false)} hitSlop={8}>
            <X size={24} color={colors.text} />
          </Pressable>
        </View>
        
        <View style={[styles.reqSelectHeader, { backgroundColor: colors.surface }]}>
          <View style={styles.reqSelectInfo}>
            <Text style={[styles.reqSelectCount, { color: colors.text }]}>
              {selectedItemsForReq.size} items selected
            </Text>
            <Text style={[styles.reqSelectTotal, { color: colors.success }]}>
              ${filteredItems
                .filter(i => selectedItemsForReq.has(i.id))
                .reduce((sum, i) => sum + (calculateOrderQuantity(i.currentOnHand, i.buildToOrderQty) * i.unitCost), 0)
                .toFixed(2)}
            </Text>
          </View>
          <Pressable
            style={[styles.selectAllButton, { borderColor: colors.primary }]}
            onPress={selectAllForReq}
          >
            <Text style={[styles.selectAllText, { color: colors.primary }]}>Select All Needing Order</Text>
          </Pressable>
        </View>
        
        <ScrollView style={styles.reqItemsList}>
          {itemsNeedingOrder.map(item => renderItemCard(item, true))}
        </ScrollView>
        
        <View style={[styles.createReqFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable
            style={[
              styles.createReqButton,
              { backgroundColor: colors.primary },
              selectedItemsForReq.size === 0 && styles.createReqButtonDisabled
            ]}
            onPress={handleCreateRequisition}
            disabled={selectedItemsForReq.size === 0}
          >
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.createReqButtonText}>Create Requisition</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderReqDetailModal = () => (
    <Modal visible={showReqDetailModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Requisition Details</Text>
          <Pressable onPress={() => setShowReqDetailModal(false)} hitSlop={8}>
            <X size={24} color={colors.text} />
          </Pressable>
        </View>
        
        {selectedRequisition && (
          <ScrollView style={styles.modalContent}>
            <View style={[styles.reqDetailCard, { backgroundColor: colors.surface }]}>
              <View style={styles.reqDetailHeader}>
                <Text style={[styles.reqDetailNumber, { color: colors.text }]}>
                  {selectedRequisition.requisitionNumber}
                </Text>
                <View style={[
                  styles.statusBadgeLarge,
                  { backgroundColor: getRequisitionStatusColor(selectedRequisition.status) + '20' }
                ]}>
                  <Text style={[
                    styles.statusBadgeLargeText,
                    { color: getRequisitionStatusColor(selectedRequisition.status) }
                  ]}>
                    {getRequisitionStatusLabel(selectedRequisition.status)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.reqDetailRows}>
                <View style={styles.reqDetailRow}>
                  <Text style={[styles.reqDetailLabel, { color: colors.textSecondary }]}>Department</Text>
                  <Text style={[styles.reqDetailValue, { color: colors.text }]}>
                    {selectedRequisition.departmentName}
                  </Text>
                </View>
                <View style={styles.reqDetailRow}>
                  <Text style={[styles.reqDetailLabel, { color: colors.textSecondary }]}>Week</Text>
                  <Text style={[styles.reqDetailValue, { color: colors.text }]}>
                    {selectedRequisition.weekNumber}, {selectedRequisition.year}
                  </Text>
                </View>
                <View style={styles.reqDetailRow}>
                  <Text style={[styles.reqDetailLabel, { color: colors.textSecondary }]}>Requested By</Text>
                  <Text style={[styles.reqDetailValue, { color: colors.text }]}>
                    {selectedRequisition.requestedBy}
                  </Text>
                </View>
                <View style={styles.reqDetailRow}>
                  <Text style={[styles.reqDetailLabel, { color: colors.textSecondary }]}>Requested At</Text>
                  <Text style={[styles.reqDetailValue, { color: colors.text }]}>
                    {new Date(selectedRequisition.requestedAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
            
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Line Items</Text>
            {selectedRequisition.items.map(item => (
              <View key={item.id} style={[styles.lineItemCard, { backgroundColor: colors.surface }]}>
                <View style={styles.lineItemHeader}>
                  <Text style={[styles.lineItemName, { color: colors.text }]} numberOfLines={1}>
                    {item.materialName}
                  </Text>
                  <Text style={[styles.lineItemTotal, { color: colors.success }]}>
                    ${item.lineTotal.toFixed(2)}
                  </Text>
                </View>
                <Text style={[styles.lineItemSku, { color: colors.textSecondary }]}>
                  {item.materialNumber} • {item.sku}
                </Text>
                <View style={styles.lineItemDetails}>
                  <Text style={[styles.lineItemDetail, { color: colors.textSecondary }]}>
                    On Hand: {item.currentOnHand}
                  </Text>
                  <Text style={[styles.lineItemDetail, { color: colors.textSecondary }]}>
                    Build To: {item.buildToOrderQty}
                  </Text>
                  <Text style={[styles.lineItemDetail, { color: colors.primary }]}>
                    Order: {item.orderQty}
                  </Text>
                </View>
                <Text style={[styles.lineItemVendor, { color: colors.textSecondary }]}>
                  {item.vendor} • ${item.unitCost.toFixed(2)}/{item.unit}
                </Text>
              </View>
            ))}
            
            <View style={[styles.reqTotalCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.reqTotalLabel, { color: colors.text }]}>Total Value</Text>
              <Text style={[styles.reqTotalValue, { color: colors.success }]}>
                ${selectedRequisition.totalValue.toFixed(2)}
              </Text>
            </View>
            
            {selectedRequisition.status === 'draft' && (
              <Pressable
                style={[styles.submitReqButton, { backgroundColor: colors.primary }]}
                onPress={() => handleSubmitRequisition(selectedRequisition)}
              >
                <Send size={20} color="#FFFFFF" />
                <Text style={styles.submitReqButtonText}>Submit for Approval</Text>
              </Pressable>
            )}
            
            {selectedRequisition.status === 'submitted' && (
              <Pressable
                style={[styles.approveReqButton, { backgroundColor: colors.success }]}
                onPress={() => handleApproveRequisition(selectedRequisition)}
              >
                <CheckCircle size={20} color="#FFFFFF" />
                <Text style={styles.approveReqButtonText}>Approve Requisition</Text>
              </Pressable>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderSummaryCard()}
      
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search items..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable
          style={[styles.filterButton, showFilters && { backgroundColor: colors.primary + '20' }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? colors.primary : colors.textSecondary} />
        </Pressable>
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setShowCreateReqModal(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <Plus size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      
      {showFilters && (
        <View style={[styles.filtersRow, { backgroundColor: colors.surface }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                deptFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => { setDeptFilter('all'); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.filterChipText, { color: deptFilter === 'all' ? '#FFFFFF' : colors.text }]}>
                All Depts
              </Text>
            </Pressable>
            {Object.values(INVENTORY_DEPARTMENTS).map(dept => (
              <Pressable
                key={dept.code}
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  deptFilter === dept.code && { backgroundColor: dept.color, borderColor: dept.color }
                ]}
                onPress={() => { setDeptFilter(dept.code); Haptics.selectionAsync(); }}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: deptFilter === dept.code ? '#FFFFFF' : colors.text }
                ]}>
                  {dept.shortName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      
      <View style={styles.tabRow}>
        {([
          { key: 'items' as ViewMode, label: 'Items', icon: Package },
          { key: 'requisitions' as ViewMode, label: 'Requisitions', icon: FileText },
          { key: 'summary' as ViewMode, label: 'Summary', icon: BarChart3 },
        ]).map(tab => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              viewMode === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setViewMode(tab.key)}
          >
            <tab.icon size={18} color={viewMode === tab.key ? colors.primary : colors.textSecondary} />
            <Text style={[
              styles.tabText,
              { color: viewMode === tab.key ? colors.primary : colors.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
      
      {viewMode === 'items' && (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {itemsBelowTarget.length > 0 && (
            <View style={[styles.alertBanner, { backgroundColor: colors.warning + '15' }]}>
              <AlertTriangle size={18} color={colors.warning} />
              <Text style={[styles.alertText, { color: colors.warning }]}>
                {itemsBelowTarget.length} items below weekly target
              </Text>
            </View>
          )}
          {filteredItems.map(item => renderItemCard(item))}
        </ScrollView>
      )}
      
      {viewMode === 'requisitions' && (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {requisitions.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Requisitions</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Create your first weekly replenishment requisition
              </Text>
            </View>
          ) : (
            requisitions.map(renderRequisitionCard)
          )}
        </ScrollView>
      )}
      
      {viewMode === 'summary' && renderDeptSummary()}
      
      {renderCountModal()}
      {renderCreateReqModal()}
      {renderReqDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  dateRange: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersRow: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  itemCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  itemDetails: {
    marginBottom: 10,
  },
  itemSku: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  itemVendor: {
    fontSize: 12,
    marginTop: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  qtyItem: {
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  reqCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 2,
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reqTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqNumber: {
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  reqDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  reqInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reqDetailText: {
    fontSize: 13,
  },
  reqFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  reqFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reqFooterText: {
    fontSize: 13,
  },
  reqFooterValue: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  summaryList: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  deptSummaryCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  deptSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  deptIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  deptSummaryInfo: {
    flex: 1,
  },
  deptSummaryName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  deptSummaryCount: {
    fontSize: 12,
    marginTop: 2,
  },
  deptSummaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  deptStat: {
    alignItems: 'center',
  },
  deptStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  deptStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  countItemInfo: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  countItemName: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  countItemSku: {
    fontSize: 13,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  countItemLocation: {
    fontSize: 13,
    marginTop: 4,
  },
  countTargets: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  countTargetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  countTargetLabel: {
    fontSize: 14,
  },
  countTargetValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  countInputGroup: {
    marginBottom: 16,
  },
  countInputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  countInput: {
    fontSize: 24,
    fontWeight: '700' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
  },
  countPreview: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  countPreviewTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  countPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  countPreviewTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: 8,
    paddingTop: 12,
  },
  countPreviewLabel: {
    fontSize: 14,
  },
  countPreviewValue: {
    fontSize: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  reqSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  reqSelectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reqSelectCount: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  reqSelectTotal: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  reqItemsList: {
    flex: 1,
    padding: 16,
  },
  createReqFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  createReqButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createReqButtonDisabled: {
    opacity: 0.5,
  },
  createReqButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  reqDetailCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  reqDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  reqDetailNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    fontFamily: 'monospace',
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeLargeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  reqDetailRows: {
    gap: 4,
  },
  reqDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  reqDetailLabel: {
    fontSize: 14,
  },
  reqDetailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  lineItemCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineItemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
    marginRight: 8,
  },
  lineItemTotal: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  lineItemSku: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  lineItemDetails: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  lineItemDetail: {
    fontSize: 12,
  },
  lineItemVendor: {
    fontSize: 11,
    marginTop: 6,
  },
  reqTotalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  reqTotalLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  reqTotalValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  submitReqButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  submitReqButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  approveReqButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  approveReqButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

export default WeeklyReplenishment;
