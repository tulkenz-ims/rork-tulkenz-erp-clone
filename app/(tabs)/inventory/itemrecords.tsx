import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  Plus,
  Filter,
  X,
  ChevronRight,
  Package,
  AlertTriangle,
  Edit2,
  Trash2,
  Check,
  MapPin,
  DollarSign,
  AlertCircle,
  Building2,
  ChevronDown,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  INVENTORY_DEPARTMENTS, 
  getDepartmentFromMaterialNumber,
  getNextMaterialNumber,
  getAllDepartments,
} from '@/constants/inventoryDepartmentCodes';
import {
  useMaterialsQuery,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useInventoryHistoryQuery,
} from '@/hooks/useSupabaseMaterials';
import { useFacilities } from '@/hooks/useFacilities';
import { useLocationsByFacility } from '@/hooks/useLocations';
import { Tables } from '@/lib/supabase';

import * as Haptics from 'expo-haptics';

type SupabaseMaterial = Tables['materials'];
type InventoryHistory = Tables['inventory_history'];

type SortField = 'materialNumber' | 'name' | 'on_hand' | 'updatedAt';
type StockFilter = 'all' | 'lowStock' | 'outOfStock' | 'active';

const UNITS_OF_MEASURE = ['each', 'pcs', 'boxes', 'cases', 'lbs', 'kg', 'gallons', 'liters', 'ft', 'meters', 'rolls', 'sets', 'kits', 'pairs', 'sheets', 'units'];

function ItemHistorySection({ materialId, colors }: { materialId: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  const { data: history = [], isLoading } = useInventoryHistoryQuery({
    materialId,
    limit: 10,
    enabled: !!materialId,
  });

  const getActionColor = (action: InventoryHistory['action']) => {
    switch (action) {
      case 'receive': return '#10B981';
      case 'issue': return '#EF4444';
      case 'adjustment': return '#F59E0B';
      case 'count': return '#3B82F6';
      case 'transfer': return '#8B5CF6';
      case 'create': return '#10B981';
      case 'delete': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const formatAction = (action: InventoryHistory['action']) => {
    return action.charAt(0).toUpperCase() + action.slice(1);
  };

  if (isLoading) {
    return (
      <View style={[historyStyles.section, { backgroundColor: colors.surface }]}>
        <Text style={[historyStyles.sectionTitle, { color: colors.text }]}>Transaction History</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={[historyStyles.section, { backgroundColor: colors.surface }]}>
        <Text style={[historyStyles.sectionTitle, { color: colors.text }]}>Transaction History</Text>
        <Text style={[historyStyles.emptyText, { color: colors.textTertiary }]}>No transaction history</Text>
      </View>
    );
  }

  return (
    <View style={[historyStyles.section, { backgroundColor: colors.surface }]}>
      <Text style={[historyStyles.sectionTitle, { color: colors.text }]}>Transaction History</Text>
      {history.map((item) => (
        <View key={item.id} style={[historyStyles.historyItem, { borderBottomColor: colors.border }]}>
          <View style={historyStyles.historyHeader}>
            <View style={[historyStyles.actionBadge, { backgroundColor: getActionColor(item.action) + '20' }]}>
              <Text style={[historyStyles.actionText, { color: getActionColor(item.action) }]}>
                {formatAction(item.action)}
              </Text>
            </View>
            <Text style={[historyStyles.historyDate, { color: colors.textTertiary }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={historyStyles.historyDetails}>
            <Text style={[historyStyles.quantityChange, { color: item.quantity_change >= 0 ? '#10B981' : '#EF4444' }]}>
              {item.quantity_change >= 0 ? '+' : ''}{item.quantity_change}
            </Text>
            <Text style={[historyStyles.quantityRange, { color: colors.textSecondary }]}>
              {item.quantity_before} → {item.quantity_after}
            </Text>
          </View>
          {item.reason && (
            <Text style={[historyStyles.reason, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.reason}
            </Text>
          )}
          <Text style={[historyStyles.performedBy, { color: colors.textTertiary }]}>
            by {item.performed_by}
          </Text>
        </View>
      ))}
    </View>
  );
}

const historyStyles = StyleSheet.create({
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
    paddingVertical: 16,
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  historyDate: {
    fontSize: 12,
  },
  historyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  quantityChange: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  quantityRange: {
    fontSize: 13,
  },
  reason: {
    fontSize: 13,
    marginBottom: 4,
  },
  performedBy: {
    fontSize: 11,
  },
});

export default function ItemRecordsScreen() {
  const { colors } = useTheme();
  
  const { data: supabaseMaterials = [], isLoading, isError, error, refetch } = useMaterialsQuery({
    orderBy: { column: 'name', ascending: true },
  });
  
  const createMaterial = useCreateMaterial({
    onSuccess: () => {
      console.log('[ItemRecords] Material created successfully');
      setShowItemModal(false);
    },
    onError: (err) => {
      Alert.alert('Error', `Failed to create item: ${err.message}`);
    },
  });
  
  const updateMaterial = useUpdateMaterial({
    onSuccess: () => {
      console.log('[ItemRecords] Material updated successfully');
      setShowItemModal(false);
    },
    onError: (err) => {
      Alert.alert('Error', `Failed to update item: ${err.message}`);
    },
  });
  
  const deleteMaterial = useDeleteMaterial({
    onSuccess: () => {
      console.log('[ItemRecords] Material deleted successfully');
      setShowItemModal(false);
    },
    onError: (err) => {
      Alert.alert('Error', `Failed to delete item: ${err.message}`);
    },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortField, setSortField] = useState<SortField>('materialNumber');
  const [sortAsc, setSortAsc] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SupabaseMaterial | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    materialNumber: '',
    name: '',
    description: '',
    inventoryDepartment: 3,
    category: '',
    unit_of_measure: 'each',
    min_level: 0,
    max_level: 100,
    unit_price: 0,
    vendor: '',
    location: '',
    facility_id: null as string | null,
    location_id: null as string | null,
    bin: '',
    aisle: '',
    rack: '',
    shelf: '',
    notes: '',
    status: 'active' as 'active' | 'inactive',
  });

  const { data: facilities = [] } = useFacilities();
  const { data: locations = [] } = useLocationsByFacility(formData.facility_id ?? undefined);

  const departments = getAllDepartments();

  const filteredMaterials = useMemo(() => {
    let result = [...supabaseMaterials];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        m =>
          m.material_number.toLowerCase().includes(query) ||
          m.name.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query) ||
          m.vendor?.toLowerCase().includes(query)
      );
    }

    if (selectedDepartment !== null) {
      result = result.filter(m => m.inventory_department === selectedDepartment);
    }

    if (selectedStatus) {
      result = result.filter(m => m.status === selectedStatus);
    }

    if (stockFilter !== 'all') {
      switch (stockFilter) {
        case 'lowStock':
          result = result.filter(m => m.on_hand <= m.min_level && m.on_hand > 0);
          break;
        case 'outOfStock':
          result = result.filter(m => m.on_hand === 0);
          break;
        case 'active':
          result = result.filter(m => m.status === 'active');
          break;
      }
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'materialNumber':
          comparison = a.material_number.localeCompare(b.material_number);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'on_hand':
          comparison = a.on_hand - b.on_hand;
          break;
        case 'updatedAt':
          comparison = (a.updated_at || '').localeCompare(b.updated_at || '');
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [supabaseMaterials, searchQuery, selectedDepartment, selectedStatus, stockFilter, sortField, sortAsc]);

  const stats = useMemo(() => {
    const active = supabaseMaterials.filter(m => m.status === 'active').length;
    const lowStock = supabaseMaterials.filter(m => m.on_hand <= m.min_level && m.on_hand > 0).length;
    const outOfStock = supabaseMaterials.filter(m => m.on_hand === 0).length;
    return { total: supabaseMaterials.length, active, lowStock, outOfStock };
  }, [supabaseMaterials]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const getStockStatus = useCallback((item: SupabaseMaterial) => {
    if (item.on_hand === 0) {
      return { label: 'Out of Stock', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
    }
    if (item.on_hand <= item.min_level) {
      return { label: 'Low Stock', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' };
    }
    if (item.on_hand >= item.max_level) {
      return { label: 'Overstock', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' };
    }
    return { label: 'In Stock', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' };
  }, []);

  const handleAddItem = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const existingNumbers = supabaseMaterials.map(m => m.material_number);
    const newMaterialNumber = getNextMaterialNumber(3, existingNumbers);
    
    setFormData({
      materialNumber: newMaterialNumber,
      name: '',
      description: '',
      inventoryDepartment: 3,
      category: '',
      unit_of_measure: 'each',
      min_level: 0,
      max_level: 100,
      unit_price: 0,
      vendor: '',
      location: '',
      facility_id: null,
      location_id: null,
      bin: '',
      aisle: '',
      rack: '',
      shelf: '',
      notes: '',
      status: 'active',
    });
    setSelectedItem(null);
    setIsEditing(false);
    setShowItemModal(true);
  }, [supabaseMaterials]);

  const handleEditItem = useCallback((item: SupabaseMaterial) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData({
      materialNumber: item.material_number,
      name: item.name,
      description: item.description || '',
      inventoryDepartment: item.inventory_department,
      category: item.category,
      unit_of_measure: item.unit_of_measure,
      min_level: item.min_level,
      max_level: item.max_level,
      unit_price: item.unit_price,
      vendor: item.vendor || '',
      location: item.location || '',
      facility_id: item.facility_id || null,
      location_id: item.location_id || null,
      bin: item.bin || '',
      aisle: item.aisle || '',
      rack: item.rack || '',
      shelf: item.shelf || '',
      notes: '',
      status: (item.status === 'active' || item.status === 'inactive') ? item.status : 'active',
    });
    setSelectedItem(item);
    setIsEditing(true);
    setShowItemModal(true);
  }, []);

  const handleViewItem = useCallback((item: SupabaseMaterial) => {
    Haptics.selectionAsync();
    setSelectedItem(item);
    setIsEditing(false);
    setShowItemModal(true);
  }, []);

  const handleSaveItem = useCallback(() => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Item name is required');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isEditing && selectedItem) {
      updateMaterial.mutate({
        id: selectedItem.id,
        updates: {
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          unit_of_measure: formData.unit_of_measure,
          min_level: formData.min_level,
          max_level: formData.max_level,
          unit_price: formData.unit_price,
          vendor: formData.vendor || null,
          location: formData.location || null,
          facility_id: formData.facility_id,
          location_id: formData.location_id,
          bin: formData.bin || null,
          aisle: formData.aisle || null,
          rack: formData.rack || null,
          shelf: formData.shelf || null,
          status: formData.status,
        },
      });
    } else {
      createMaterial.mutate({
        material_number: formData.materialNumber,
        inventory_department: formData.inventoryDepartment,
        name: formData.name,
        sku: `SKU-${formData.materialNumber}`,
        description: formData.description || null,
        category: formData.category || 'General',
        on_hand: 0,
        min_level: formData.min_level,
        max_level: formData.max_level,
        unit_price: formData.unit_price,
        unit_of_measure: formData.unit_of_measure,
        vendor: formData.vendor || null,
        location: formData.location || null,
        status: formData.status,
        classification: 'stock',
        facility_id: formData.facility_id,
        location_id: formData.location_id,
        bin: formData.bin || null,
        aisle: formData.aisle || null,
        rack: formData.rack || null,
        shelf: formData.shelf || null,
        barcode: null,
        qr_code: null,
        vendor_part_number: null,
        manufacturer: null,
        manufacturer_part_number: null,
        lead_time_days: null,
        department_code: null,
        cost_center: null,
        gl_account: null,
      });
    }
  }, [formData, isEditing, selectedItem, createMaterial, updateMaterial]);

  const handleDeleteItem = useCallback((item: SupabaseMaterial) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteMaterial.mutate({
              id: item.id,
              materialName: item.name,
              materialSku: item.sku,
            });
          },
        },
      ]
    );
  }, [deleteMaterial]);

  const handleDepartmentChange = useCallback((deptCode: number) => {
    const existingNumbers = supabaseMaterials.map(m => m.material_number);
    const newMaterialNumber = getNextMaterialNumber(deptCode, existingNumbers);
    setFormData(prev => ({
      ...prev,
      inventoryDepartment: deptCode,
      materialNumber: newMaterialNumber,
    }));
  }, [supabaseMaterials]);

  const clearFilters = useCallback(() => {
    setSelectedDepartment(null);
    setSelectedStatus(null);
    setStockFilter('all');
    setShowFilterModal(false);
  }, []);

  const handleStatCardPress = useCallback((filter: StockFilter) => {
    Haptics.selectionAsync();
    setStockFilter(prev => prev === filter ? 'all' : filter);
  }, []);

  const renderItemCard = useCallback((item: SupabaseMaterial) => {
    const dept = getDepartmentFromMaterialNumber(item.material_number);
    const stockStatus = getStockStatus(item);

    return (
      <Pressable
        key={item.id}
        style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleViewItem(item)}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleRow}>
            <View style={[styles.deptBadge, { backgroundColor: dept?.color || colors.primary + '20' }]}>
              <Text style={[styles.deptBadgeText, { color: '#FFFFFF' }]}>
                {dept?.shortName || 'UNK'}
              </Text>
            </View>
            <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
              {item.material_number}
            </Text>
          </View>
          <View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor }]}>
            <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>
              {stockStatus.label}
            </Text>
          </View>
        </View>

        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>

        {item.description && (
          <Text style={[styles.itemDescription, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.description}
          </Text>
        )}

        <View style={styles.itemFooter}>
          <View style={styles.itemStat}>
            <Package size={14} color={colors.textTertiary} />
            <Text style={[styles.itemStatText, { color: colors.text }]}>
              {item.on_hand} {item.unit_of_measure}
            </Text>
          </View>
          {item.location && (
            <View style={styles.itemStat}>
              <MapPin size={14} color={colors.textTertiary} />
              <Text style={[styles.itemStatText, { color: colors.textSecondary }]}>
                {item.location}
              </Text>
            </View>
          )}
          <View style={styles.itemStat}>
            <DollarSign size={14} color={colors.textTertiary} />
            <Text style={[styles.itemStatText, { color: colors.textSecondary }]}>
              ${item.unit_price.toFixed(2)}
            </Text>
          </View>
        </View>

        <ChevronRight size={20} color={colors.textTertiary} style={styles.itemChevron} />
      </Pressable>
    );
  }, [colors, getStockStatus, handleViewItem]);

  const renderItemModal = () => {
    const dept = selectedItem ? getDepartmentFromMaterialNumber(selectedItem.material_number) : INVENTORY_DEPARTMENTS[formData.inventoryDepartment];
    const stockStatus = selectedItem ? getStockStatus(selectedItem) : null;
    const isSaving = createMaterial.isPending || updateMaterial.isPending;

    return (
      <Modal
        visible={showItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowItemModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowItemModal(false)} style={styles.modalCloseBtn}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedItem && !isEditing ? 'Item Details' : isEditing ? 'Edit Item' : 'New Item'}
            </Text>
            {selectedItem && !isEditing ? (
              <Pressable onPress={() => handleEditItem(selectedItem)} style={styles.modalActionBtn}>
                <Edit2 size={20} color={colors.primary} />
              </Pressable>
            ) : (
              <Pressable onPress={handleSaveItem} style={styles.modalActionBtn} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Check size={24} color={colors.primary} />
                )}
              </Pressable>
            )}
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedItem && !isEditing ? (
              <>
                <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                  <View style={styles.detailHeader}>
                    <View style={[styles.deptBadgeLarge, { backgroundColor: dept?.color || colors.primary }]}>
                      <Text style={styles.deptBadgeLargeText}>{dept?.shortName || 'UNK'}</Text>
                    </View>
                    <View style={styles.detailHeaderInfo}>
                      <Text style={[styles.detailMaterialNumber, { color: colors.textSecondary }]}>
                        {selectedItem.material_number}
                      </Text>
                      <Text style={[styles.detailName, { color: colors.text }]}>
                        {selectedItem.name}
                      </Text>
                    </View>
                  </View>

                  {stockStatus && (
                    <View style={[styles.stockStatusBanner, { backgroundColor: stockStatus.bgColor }]}>
                      <AlertTriangle size={16} color={stockStatus.color} />
                      <Text style={[styles.stockStatusText, { color: stockStatus.color }]}>
                        {stockStatus.label} - {selectedItem.on_hand} {selectedItem.unit_of_measure} on hand
                      </Text>
                    </View>
                  )}

                  {selectedItem.description && (
                    <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
                      {selectedItem.description}
                    </Text>
                  )}
                </View>

                <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Stock Information</Text>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailGridItem}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>On Hand</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedItem.on_hand}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Min Level</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedItem.min_level}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Max Level</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedItem.max_level}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Unit Price</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>${selectedItem.unit_price.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Item Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Department</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{dept?.name || 'Unknown'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Category</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedItem.category}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Unit of Measure</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedItem.unit_of_measure}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>SKU</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedItem.sku}</Text>
                  </View>
                  {selectedItem.location && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Location</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedItem.location}</Text>
                    </View>
                  )}
                  {selectedItem.vendor && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Vendor</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedItem.vendor}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Status</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: selectedItem.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)' }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: selectedItem.status === 'active' ? '#10B981' : '#6B7280' }
                      ]}>
                        {selectedItem.status === 'active' ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>

                {selectedItem.created_at && (
                  <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Record History</Text>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Created</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{new Date(selectedItem.created_at).toLocaleDateString()}</Text>
                    </View>
                    {selectedItem.updated_at && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Last Updated</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{new Date(selectedItem.updated_at).toLocaleDateString()}</Text>
                      </View>
                    )}
                  </View>
                )}

                <ItemHistorySection materialId={selectedItem.id} colors={colors} />

                <Pressable
                  style={[styles.deleteButton, { backgroundColor: colors.errorBg }]}
                  onPress={() => handleDeleteItem(selectedItem)}
                >
                  <Trash2 size={18} color={colors.error} />
                  <Text style={[styles.deleteButtonText, { color: colors.error }]}>Delete Item</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>Basic Information</Text>
                  
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Department</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptSelector}>
                    {departments.map(d => (
                      <Pressable
                        key={d.code}
                        style={[
                          styles.deptOption,
                          { 
                            backgroundColor: formData.inventoryDepartment === d.code ? d.color : colors.backgroundSecondary,
                            borderColor: formData.inventoryDepartment === d.code ? d.color : colors.border,
                          }
                        ]}
                        onPress={() => !isEditing && handleDepartmentChange(d.code)}
                        disabled={isEditing}
                      >
                        <Text style={[
                          styles.deptOptionText,
                          { color: formData.inventoryDepartment === d.code ? '#FFFFFF' : colors.text }
                        ]}>
                          {d.shortName}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Material Number</Text>
                  <View style={[styles.inputDisabled, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.inputDisabledText, { color: colors.textTertiary }]}>
                      {formData.materialNumber}
                    </Text>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Name *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.name}
                    onChangeText={text => setFormData(prev => ({ ...prev, name: text }))}
                    placeholder="Enter item name"
                    placeholderTextColor={colors.textTertiary}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.description}
                    onChangeText={text => setFormData(prev => ({ ...prev, description: text }))}
                    placeholder="Enter description"
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.category}
                    onChangeText={text => setFormData(prev => ({ ...prev, category: text }))}
                    placeholder="e.g., Raw Materials, Components"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>Stock Settings</Text>
                  
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Unit of Measure</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.uomSelector}>
                    {UNITS_OF_MEASURE.map(uom => (
                      <Pressable
                        key={uom}
                        style={[
                          styles.uomOption,
                          { 
                            backgroundColor: formData.unit_of_measure === uom ? colors.primary : colors.backgroundSecondary,
                            borderColor: formData.unit_of_measure === uom ? colors.primary : colors.border,
                          }
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, unit_of_measure: uom }))}
                      >
                        <Text style={[
                          styles.uomOptionText,
                          { color: formData.unit_of_measure === uom ? '#FFFFFF' : colors.text }
                        ]}>
                          {uom}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reorder Point</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                        value={formData.min_level.toString()}
                        onChangeText={text => setFormData(prev => ({ ...prev, min_level: parseInt(text) || 0 }))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Max Level</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                        value={formData.max_level.toString()}
                        onChangeText={text => setFormData(prev => ({ ...prev, max_level: parseInt(text) || 0 }))}
                        keyboardType="numeric"
                        placeholder="100"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Unit Price ($)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.unit_price.toString()}
                    onChangeText={text => setFormData(prev => ({ ...prev, unit_price: parseFloat(text) || 0 }))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>Location & Storage</Text>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Facility</Text>
                  <View style={styles.selectWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.facilitySelector}>
                      <Pressable
                        style={[
                          styles.facilityOption,
                          { 
                            backgroundColor: formData.facility_id === null ? colors.primary : colors.backgroundSecondary,
                            borderColor: formData.facility_id === null ? colors.primary : colors.border,
                          }
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, facility_id: null, location_id: null }))}
                      >
                        <Building2 size={14} color={formData.facility_id === null ? '#FFFFFF' : colors.textSecondary} />
                        <Text style={[
                          styles.facilityOptionText,
                          { color: formData.facility_id === null ? '#FFFFFF' : colors.text }
                        ]}>
                          None
                        </Text>
                      </Pressable>
                      {facilities.map(f => (
                        <Pressable
                          key={f.id}
                          style={[
                            styles.facilityOption,
                            { 
                              backgroundColor: formData.facility_id === f.id ? colors.primary : colors.backgroundSecondary,
                              borderColor: formData.facility_id === f.id ? colors.primary : colors.border,
                            }
                          ]}
                          onPress={() => setFormData(prev => ({ ...prev, facility_id: f.id, location_id: null }))}
                        >
                          <Building2 size={14} color={formData.facility_id === f.id ? '#FFFFFF' : colors.textSecondary} />
                          <Text style={[
                            styles.facilityOptionText,
                            { color: formData.facility_id === f.id ? '#FFFFFF' : colors.text }
                          ]}>
                            {f.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  {formData.facility_id && locations.length > 0 && (
                    <>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Area/Location</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationSelector}>
                        <Pressable
                          style={[
                            styles.locationOption,
                            { 
                              backgroundColor: formData.location_id === null ? colors.primary + '20' : colors.backgroundSecondary,
                              borderColor: formData.location_id === null ? colors.primary : colors.border,
                            }
                          ]}
                          onPress={() => setFormData(prev => ({ ...prev, location_id: null }))}
                        >
                          <Text style={[
                            styles.locationOptionText,
                            { color: formData.location_id === null ? colors.primary : colors.text }
                          ]}>
                            None
                          </Text>
                        </Pressable>
                        {locations.map(loc => (
                          <Pressable
                            key={loc.id}
                            style={[
                              styles.locationOption,
                              { 
                                backgroundColor: formData.location_id === loc.id ? colors.primary + '20' : colors.backgroundSecondary,
                                borderColor: formData.location_id === loc.id ? colors.primary : colors.border,
                              }
                            ]}
                            onPress={() => setFormData(prev => ({ ...prev, location_id: loc.id }))}
                          >
                            <Text style={[
                              styles.locationOptionText,
                              { color: formData.location_id === loc.id ? colors.primary : colors.text }
                            ]}>
                              {loc.name}
                            </Text>
                            <Text style={[styles.locationOptionCode, { color: colors.textTertiary }]}>
                              {loc.location_code}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </>
                  )}

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Storage Position (Optional)</Text>
                  <View style={styles.storageGrid}>
                    <View style={styles.storageField}>
                      <Text style={[styles.storageFieldLabel, { color: colors.textTertiary }]}>Aisle</Text>
                      <TextInput
                        style={[styles.storageInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                        value={formData.aisle}
                        onChangeText={text => setFormData(prev => ({ ...prev, aisle: text }))}
                        placeholder="A"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <View style={styles.storageField}>
                      <Text style={[styles.storageFieldLabel, { color: colors.textTertiary }]}>Rack</Text>
                      <TextInput
                        style={[styles.storageInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                        value={formData.rack}
                        onChangeText={text => setFormData(prev => ({ ...prev, rack: text }))}
                        placeholder="01"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <View style={styles.storageField}>
                      <Text style={[styles.storageFieldLabel, { color: colors.textTertiary }]}>Shelf</Text>
                      <TextInput
                        style={[styles.storageInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                        value={formData.shelf}
                        onChangeText={text => setFormData(prev => ({ ...prev, shelf: text }))}
                        placeholder="1"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <View style={styles.storageField}>
                      <Text style={[styles.storageFieldLabel, { color: colors.textTertiary }]}>Bin</Text>
                      <TextInput
                        style={[styles.storageInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                        value={formData.bin}
                        onChangeText={text => setFormData(prev => ({ ...prev, bin: text }))}
                        placeholder="A1"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Legacy Location Reference</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.location}
                    onChangeText={text => setFormData(prev => ({ ...prev, location: text }))}
                    placeholder="e.g., Warehouse A - Shelf 3"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>Additional Info</Text>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Vendor</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.vendor}
                    onChangeText={text => setFormData(prev => ({ ...prev, vendor: text }))}
                    placeholder="Primary vendor name"
                    placeholderTextColor={colors.textTertiary}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Status</Text>
                  <View style={styles.statusToggle}>
                    <Pressable
                      style={[
                        styles.statusOption,
                        { 
                          backgroundColor: formData.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : colors.backgroundSecondary,
                          borderColor: formData.status === 'active' ? '#10B981' : colors.border,
                        }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                    >
                      <Text style={[styles.statusOptionText, { color: formData.status === 'active' ? '#10B981' : colors.textSecondary }]}>
                        Active
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.statusOption,
                        { 
                          backgroundColor: formData.status === 'inactive' ? 'rgba(107, 114, 128, 0.15)' : colors.backgroundSecondary,
                          borderColor: formData.status === 'inactive' ? '#6B7280' : colors.border,
                        }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, status: 'inactive' }))}
                    >
                      <Text style={[styles.statusOptionText, { color: formData.status === 'inactive' ? '#6B7280' : colors.textSecondary }]}>
                        Inactive
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={{ height: 40 }} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

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
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
          <Pressable onPress={clearFilters} style={styles.modalActionBtn}>
            <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Department</Text>
          <View style={styles.filterOptions}>
            <Pressable
              style={[
                styles.filterOption,
                { 
                  backgroundColor: selectedDepartment === null ? colors.primary : colors.surface,
                  borderColor: selectedDepartment === null ? colors.primary : colors.border,
                }
              ]}
              onPress={() => setSelectedDepartment(null)}
            >
              <Text style={[styles.filterOptionText, { color: selectedDepartment === null ? '#FFFFFF' : colors.text }]}>
                All
              </Text>
            </Pressable>
            {departments.map(d => (
              <Pressable
                key={d.code}
                style={[
                  styles.filterOption,
                  { 
                    backgroundColor: selectedDepartment === d.code ? d.color : colors.surface,
                    borderColor: selectedDepartment === d.code ? d.color : colors.border,
                  }
                ]}
                onPress={() => setSelectedDepartment(d.code)}
              >
                <Text style={[styles.filterOptionText, { color: selectedDepartment === d.code ? '#FFFFFF' : colors.text }]}>
                  {d.shortName}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Status</Text>
          <View style={styles.filterOptions}>
            {['All', 'active', 'inactive'].map(status => (
              <Pressable
                key={status}
                style={[
                  styles.filterOption,
                  { 
                    backgroundColor: (status === 'All' ? selectedStatus === null : selectedStatus === status) ? colors.primary : colors.surface,
                    borderColor: (status === 'All' ? selectedStatus === null : selectedStatus === status) ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setSelectedStatus(status === 'All' ? null : status)}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: (status === 'All' ? selectedStatus === null : selectedStatus === status) ? '#FFFFFF' : colors.text }
                ]}>
                  {status === 'All' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Sort By</Text>
          <View style={styles.filterOptions}>
            {[
              { field: 'materialNumber' as SortField, label: 'Material #' },
              { field: 'name' as SortField, label: 'Name' },
              { field: 'on_hand' as SortField, label: 'Quantity' },
              { field: 'updatedAt' as SortField, label: 'Updated' },
            ].map(({ field, label }) => (
              <Pressable
                key={field}
                style={[
                  styles.filterOption,
                  { 
                    backgroundColor: sortField === field ? colors.primary : colors.surface,
                    borderColor: sortField === field ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => {
                  if (sortField === field) {
                    setSortAsc(!sortAsc);
                  } else {
                    setSortField(field);
                    setSortAsc(true);
                  }
                }}
              >
                <Text style={[styles.filterOptionText, { color: sortField === field ? '#FFFFFF' : colors.text }]}>
                  {label} {sortField === field ? (sortAsc ? '↑' : '↓') : ''}
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

  const activeFilterCount = (selectedDepartment !== null ? 1 : 0) + (selectedStatus !== null ? 1 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statsRow}>
        <Pressable 
          style={[styles.statCard, { backgroundColor: colors.surface, borderColor: stockFilter === 'all' ? colors.primary : colors.border }]}
          onPress={() => handleStatCardPress('all')}
        >
          <Text style={[styles.statValue, { color: stockFilter === 'all' ? colors.primary : colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total Items</Text>
        </Pressable>
        <Pressable 
          style={[styles.statCard, { backgroundColor: colors.surface, borderColor: stockFilter === 'active' ? '#10B981' : colors.border }]}
          onPress={() => handleStatCardPress('active')}
        >
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Active</Text>
        </Pressable>
        <Pressable 
          style={[styles.statCard, { backgroundColor: colors.surface, borderColor: stockFilter === 'lowStock' ? '#F59E0B' : colors.border }]}
          onPress={() => handleStatCardPress('lowStock')}
        >
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.lowStock}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Low Stock</Text>
        </Pressable>
        <Pressable 
          style={[styles.statCard, { backgroundColor: colors.surface, borderColor: stockFilter === 'outOfStock' ? '#EF4444' : colors.border }]}
          onPress={() => handleStatCardPress('outOfStock')}
        >
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.outOfStock}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Out</Text>
        </Pressable>
      </View>

      {stockFilter !== 'all' && (
        <View style={[styles.activeFilterBanner, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.activeFilterText, { color: colors.primary }]}>
            Showing: {stockFilter === 'lowStock' ? 'Low Stock' : stockFilter === 'outOfStock' ? 'Out of Stock' : 'Active'} items
          </Text>
          <Pressable onPress={() => setStockFilter('all')}>
            <X size={16} color={colors.primary} />
          </Pressable>
        </View>
      )}

      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search items..."
            placeholderTextColor={colors.textTertiary}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: activeFilterCount > 0 ? colors.primary : colors.border }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={activeFilterCount > 0 ? colors.primary : colors.textTertiary} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddItem}
        >
          <Plus size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading items...</Text>
          </View>
        ) : isError ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.text }]}>Failed to load items</Text>
            <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>{error?.message}</Text>
            <Pressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {filteredMaterials.length} items found
            </Text>
            {filteredMaterials.map(renderItemCard)}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderItemModal()}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  resultCount: {
    fontSize: 13,
    marginBottom: 12,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    position: 'relative' as const,
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
  },
  deptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  deptBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  materialNumber: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
    paddingRight: 24,
  },
  itemDescription: {
    fontSize: 12,
    marginBottom: 10,
    paddingRight: 24,
  },
  itemFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  itemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemStatText: {
    fontSize: 12,
  },
  itemChevron: {
    position: 'absolute' as const,
    right: 14,
    top: '50%',
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
  detailSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  deptBadgeLarge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deptBadgeLargeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailMaterialNumber: {
    fontSize: 13,
    marginBottom: 2,
  },
  detailName: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  stockStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  stockStatusText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailGridItem: {
    width: '47%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  formSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  inputDisabled: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputDisabledText: {
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  deptSelector: {
    flexDirection: 'row',
    marginTop: 4,
  },
  deptOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  deptOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  uomSelector: {
    flexDirection: 'row',
    marginTop: 4,
  },
  uomOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  uomOptionText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  statusToggle: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
    marginTop: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  selectWrapper: {
    marginTop: 4,
  },
  facilitySelector: {
    flexDirection: 'row',
  },
  facilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  facilityOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  locationSelector: {
    flexDirection: 'row',
    marginTop: 4,
  },
  locationOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  locationOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  locationOptionCode: {
    fontSize: 10,
    marginTop: 2,
  },
  storageGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  storageField: {
    flex: 1,
  },
  storageFieldLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  storageInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center' as const,
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
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center' as const,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
