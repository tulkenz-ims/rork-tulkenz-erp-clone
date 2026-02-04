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
  ArrowUpDown,
  Filter,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  Edit3,
  Save,
  RotateCcw,
  CheckSquare,
  Square,
  Layers,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getDepartmentFromMaterialNumber,
  getAllDepartments,
} from '@/constants/inventoryDepartmentCodes';
import {
  useMaterialsQuery,
  useUpdateMaterial,
} from '@/hooks/useSupabaseMaterials';
import { Tables } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

type Material = Tables['materials'];

type StockStatus = 'all' | 'critical' | 'low' | 'healthy' | 'overstock';
type SortField = 'name' | 'on_hand' | 'min_level' | 'max_level' | 'variance';

interface EditedLevels {
  [materialId: string]: {
    min_level: number;
    max_level: number;
  };
}

export default function MinMaxScreen() {
  const { colors } = useTheme();
  
  const { data: materials = [], isLoading, isError, error, refetch } = useMaterialsQuery({
    orderBy: { column: 'name', ascending: true },
  });
  
  const updateMaterial = useUpdateMaterial({
    onSuccess: () => {
      console.log('[MinMax] Material levels updated');
    },
    onError: (err) => {
      Alert.alert('Error', `Failed to update levels: ${err.message}`);
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [stockStatus, setStockStatus] = useState<StockStatus>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editedLevels, setEditedLevels] = useState<EditedLevels>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const [bulkMinLevel, setBulkMinLevel] = useState('');
  const [bulkMaxLevel, setBulkMaxLevel] = useState('');
  const [bulkMinAdjustment, setBulkMinAdjustment] = useState('');
  const [bulkMaxAdjustment, setBulkMaxAdjustment] = useState('');
  const [bulkAdjustmentType, setBulkAdjustmentType] = useState<'set' | 'adjust'>('set');

  const departments = getAllDepartments();

  const getStockStatusInfo = useCallback((item: Material) => {
    if (item.on_hand === 0) {
      return { status: 'critical' as const, label: 'Out of Stock', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.12)' };
    }
    if (item.on_hand <= item.min_level) {
      return { status: 'low' as const, label: 'Below Min', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)' };
    }
    if (item.on_hand >= item.max_level) {
      return { status: 'overstock' as const, label: 'Above Max', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.12)' };
    }
    return { status: 'healthy' as const, label: 'In Range', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.12)' };
  }, []);

  const filteredMaterials = useMemo(() => {
    let result = [...materials];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        m =>
          m.material_number.toLowerCase().includes(query) ||
          m.name.toLowerCase().includes(query) ||
          m.category?.toLowerCase().includes(query)
      );
    }

    if (selectedDepartment !== null) {
      result = result.filter(m => m.inventory_department === selectedDepartment);
    }

    if (stockStatus !== 'all') {
      result = result.filter(m => {
        const info = getStockStatusInfo(m);
        return info.status === stockStatus;
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'on_hand':
          comparison = a.on_hand - b.on_hand;
          break;
        case 'min_level':
          comparison = a.min_level - b.min_level;
          break;
        case 'max_level':
          comparison = a.max_level - b.max_level;
          break;
        case 'variance':
          const aVar = a.on_hand - a.min_level;
          const bVar = b.on_hand - b.min_level;
          comparison = aVar - bVar;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [materials, searchQuery, selectedDepartment, stockStatus, sortField, sortAsc, getStockStatusInfo]);

  const stats = useMemo(() => ({
    critical: materials.filter(m => m.on_hand === 0).length,
    low: materials.filter(m => m.on_hand > 0 && m.on_hand <= m.min_level).length,
    healthy: materials.filter(m => m.on_hand > m.min_level && m.on_hand < m.max_level).length,
    overstock: materials.filter(m => m.on_hand >= m.max_level).length,
  }), [materials]);

  const hasUnsavedChanges = Object.keys(editedLevels).length > 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const toggleExpand = useCallback((id: string) => {
    Haptics.selectionAsync();
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedItems.size === filteredMaterials.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredMaterials.map(m => m.id)));
    }
  }, [filteredMaterials, selectedItems.size]);

  const handleLevelChange = useCallback((materialId: string, field: 'min_level' | 'max_level', value: string) => {
    const numValue = parseInt(value) || 0;
    const material = materials.find(m => m.id === materialId);
    if (!material) return;

    setEditedLevels(prev => {
      const existing = prev[materialId] || { min_level: material.min_level, max_level: material.max_level };
      return {
        ...prev,
        [materialId]: {
          ...existing,
          [field]: numValue,
        },
      };
    });
  }, [materials]);

  const getDisplayValue = useCallback((material: Material, field: 'min_level' | 'max_level') => {
    if (editedLevels[material.id]) {
      return editedLevels[material.id][field];
    }
    return material[field];
  }, [editedLevels]);

  const hasItemChanged = useCallback((materialId: string) => {
    return !!editedLevels[materialId];
  }, [editedLevels]);

  const resetItemChanges = useCallback((materialId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditedLevels(prev => {
      const next = { ...prev };
      delete next[materialId];
      return next;
    });
  }, []);

  const resetAllChanges = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard all unsaved changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => setEditedLevels({}) },
      ]
    );
  }, []);

  const saveAllChanges = useCallback(async () => {
    const changedIds = Object.keys(editedLevels);
    if (changedIds.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Save Changes',
      `Save min/max level changes for ${changedIds.length} item${changedIds.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            setIsSaving(true);
            try {
              for (const id of changedIds) {
                const levels = editedLevels[id];
                await updateMaterial.mutateAsync({
                  id,
                  updates: {
                    min_level: levels.min_level,
                    max_level: levels.max_level,
                  },
                });
              }
              setEditedLevels({});
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', `Updated ${changedIds.length} item${changedIds.length > 1 ? 's' : ''}`);
            } catch (err) {
              console.error('[MinMax] Save error:', err);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  }, [editedLevels, updateMaterial]);

  const applyBulkChanges = useCallback(() => {
    if (selectedItems.size === 0) {
      Alert.alert('No Items Selected', 'Please select items to apply bulk changes.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newEdits: EditedLevels = { ...editedLevels };

    selectedItems.forEach(id => {
      const material = materials.find(m => m.id === id);
      if (!material) return;

      const existing = newEdits[id] || { min_level: material.min_level, max_level: material.max_level };

      if (bulkAdjustmentType === 'set') {
        if (bulkMinLevel !== '') {
          existing.min_level = parseInt(bulkMinLevel) || 0;
        }
        if (bulkMaxLevel !== '') {
          existing.max_level = parseInt(bulkMaxLevel) || 0;
        }
      } else {
        if (bulkMinAdjustment !== '') {
          existing.min_level = Math.max(0, existing.min_level + (parseInt(bulkMinAdjustment) || 0));
        }
        if (bulkMaxAdjustment !== '') {
          existing.max_level = Math.max(0, existing.max_level + (parseInt(bulkMaxAdjustment) || 0));
        }
      }

      newEdits[id] = existing;
    });

    setEditedLevels(newEdits);
    setShowBulkModal(false);
    setBulkMinLevel('');
    setBulkMaxLevel('');
    setBulkMinAdjustment('');
    setBulkMaxAdjustment('');
    setSelectedItems(new Set());

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedItems, materials, editedLevels, bulkAdjustmentType, bulkMinLevel, bulkMaxLevel, bulkMinAdjustment, bulkMaxAdjustment]);

  const clearFilters = useCallback(() => {
    setSelectedDepartment(null);
    setStockStatus('all');
    setSortField('name');
    setSortAsc(true);
    setShowFilterModal(false);
  }, []);

  const handleStatusFilter = useCallback((status: StockStatus) => {
    Haptics.selectionAsync();
    setStockStatus(prev => prev === status ? 'all' : status);
  }, []);

  const renderItemCard = useCallback((item: Material) => {
    const dept = getDepartmentFromMaterialNumber(item.material_number);
    const statusInfo = getStockStatusInfo(item);
    const isExpanded = expandedItems.has(item.id);
    const isSelected = selectedItems.has(item.id);
    const isEdited = hasItemChanged(item.id);
    
    const currentMin = getDisplayValue(item, 'min_level');
    const currentMax = getDisplayValue(item, 'max_level');
    const variance = item.on_hand - currentMin;

    return (
      <View
        key={item.id}
        style={[
          styles.itemCard,
          {
            backgroundColor: colors.surface,
            borderColor: isEdited ? '#F59E0B' : isSelected ? colors.primary : colors.border,
            borderWidth: isEdited || isSelected ? 2 : 1,
          },
        ]}
      >
        <Pressable style={styles.itemHeader} onPress={() => toggleExpand(item.id)}>
          <Pressable
            style={styles.checkboxArea}
            onPress={(e) => {
              e.stopPropagation();
              toggleSelect(item.id);
            }}
          >
            {isSelected ? (
              <CheckSquare size={22} color={colors.primary} />
            ) : (
              <Square size={22} color={colors.textTertiary} />
            )}
          </Pressable>

          <View style={styles.itemMain}>
            <View style={styles.itemTitleRow}>
              <View style={[styles.deptBadge, { backgroundColor: dept?.color || colors.primary }]}>
                <Text style={styles.deptBadgeText}>{dept?.shortName || 'UNK'}</Text>
              </View>
              <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
                {item.material_number}
              </Text>
              {isEdited && (
                <View style={[styles.editedBadge, { backgroundColor: '#F59E0B20' }]}>
                  <Edit3 size={10} color="#F59E0B" />
                  <Text style={styles.editedText}>Modified</Text>
                </View>
              )}
            </View>

            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>

            <View style={styles.levelPreview}>
              <View style={styles.levelItem}>
                <Text style={[styles.levelLabel, { color: colors.textTertiary }]}>On Hand</Text>
                <Text style={[styles.levelValue, { color: statusInfo.color }]}>{item.on_hand}</Text>
              </View>
              <View style={styles.levelItem}>
                <Text style={[styles.levelLabel, { color: colors.textTertiary }]}>Min</Text>
                <Text style={[styles.levelValue, { color: isEdited ? '#F59E0B' : colors.text }]}>
                  {currentMin}
                </Text>
              </View>
              <View style={styles.levelItem}>
                <Text style={[styles.levelLabel, { color: colors.textTertiary }]}>Max</Text>
                <Text style={[styles.levelValue, { color: isEdited ? '#F59E0B' : colors.text }]}>
                  {currentMax}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
            </View>
          </View>

          {isExpanded ? (
            <ChevronUp size={20} color={colors.textTertiary} />
          ) : (
            <ChevronDown size={20} color={colors.textTertiary} />
          )}
        </Pressable>

        {isExpanded && (
          <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
            <View style={styles.stockBar}>
              <View style={[styles.stockBarTrack, { backgroundColor: colors.backgroundSecondary }]}>
                <View
                  style={[
                    styles.stockBarMin,
                    {
                      width: `${Math.min((currentMin / Math.max(currentMax, 1)) * 100, 100)}%`,
                      backgroundColor: '#F59E0B30',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.stockBarCurrent,
                    {
                      width: `${Math.min((item.on_hand / Math.max(currentMax, 1)) * 100, 100)}%`,
                      backgroundColor: statusInfo.color,
                    },
                  ]}
                />
              </View>
              <View style={styles.stockBarLabels}>
                <Text style={[styles.stockBarLabel, { color: colors.textTertiary }]}>0</Text>
                <Text style={[styles.stockBarLabel, { color: '#F59E0B' }]}>Min: {currentMin}</Text>
                <Text style={[styles.stockBarLabel, { color: colors.textTertiary }]}>Max: {currentMax}</Text>
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Minimum Level</Text>
                <TextInput
                  style={[
                    styles.levelInput,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: isEdited ? '#F59E0B' : colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={currentMin.toString()}
                  onChangeText={(text) => handleLevelChange(item.id, 'min_level', text)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Maximum Level</Text>
                <TextInput
                  style={[
                    styles.levelInput,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: isEdited ? '#F59E0B' : colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={currentMax.toString()}
                  onChangeText={(text) => handleLevelChange(item.id, 'max_level', text)}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.varianceRow}>
              <View style={styles.varianceItem}>
                <Text style={[styles.varianceLabel, { color: colors.textTertiary }]}>
                  Variance from Min
                </Text>
                <Text
                  style={[
                    styles.varianceValue,
                    { color: variance >= 0 ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {variance >= 0 ? '+' : ''}{variance} {item.unit_of_measure}
                </Text>
              </View>
              <View style={styles.varianceItem}>
                <Text style={[styles.varianceLabel, { color: colors.textTertiary }]}>
                  % of Max
                </Text>
                <Text style={[styles.varianceValue, { color: colors.text }]}>
                  {Math.round((item.on_hand / Math.max(currentMax, 1)) * 100)}%
                </Text>
              </View>
            </View>

            {isEdited && (
              <Pressable
                style={[styles.resetButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => resetItemChanges(item.id)}
              >
                <RotateCcw size={14} color={colors.textSecondary} />
                <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
                  Reset Changes
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }, [colors, expandedItems, selectedItems, editedLevels, getStockStatusInfo, toggleExpand, toggleSelect, handleLevelChange, getDisplayValue, hasItemChanged, resetItemChanges]);

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
          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Department</Text>
          <View style={styles.filterOptions}>
            <Pressable
              style={[
                styles.filterOption,
                {
                  backgroundColor: selectedDepartment === null ? colors.primary : colors.surface,
                  borderColor: selectedDepartment === null ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedDepartment(null)}
            >
              <Text
                style={[styles.filterOptionText, { color: selectedDepartment === null ? '#FFFFFF' : colors.text }]}
              >
                All
              </Text>
            </Pressable>
            {departments.map((d) => (
              <Pressable
                key={d.code}
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: selectedDepartment === d.code ? d.color : colors.surface,
                    borderColor: selectedDepartment === d.code ? d.color : colors.border,
                  },
                ]}
                onPress={() => setSelectedDepartment(d.code)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    { color: selectedDepartment === d.code ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {d.shortName}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Sort By</Text>
          <View style={styles.filterOptions}>
            {[
              { field: 'name' as SortField, label: 'Name' },
              { field: 'on_hand' as SortField, label: 'On Hand' },
              { field: 'min_level' as SortField, label: 'Min Level' },
              { field: 'max_level' as SortField, label: 'Max Level' },
              { field: 'variance' as SortField, label: 'Variance' },
            ].map(({ field, label }) => (
              <Pressable
                key={field}
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: sortField === field ? colors.primary : colors.surface,
                    borderColor: sortField === field ? colors.primary : colors.border,
                  },
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
                <Text
                  style={[styles.filterOptionText, { color: sortField === field ? '#FFFFFF' : colors.text }]}
                >
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
          <Text style={styles.applyButtonText}>Apply</Text>
        </Pressable>
      </View>
    </Modal>
  );

  const renderBulkModal = () => (
    <Modal
      visible={showBulkModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowBulkModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setShowBulkModal(false)} style={styles.modalCloseBtn}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Bulk Update Levels</Text>
          <Pressable onPress={applyBulkChanges} style={styles.modalActionBtn}>
            <Check size={24} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={[styles.bulkInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Layers size={20} color={colors.primary} />
            <Text style={[styles.bulkInfoText, { color: colors.text }]}>
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </Text>
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Update Type</Text>
          <View style={styles.bulkTypeSelector}>
            <Pressable
              style={[
                styles.bulkTypeOption,
                {
                  backgroundColor: bulkAdjustmentType === 'set' ? colors.primary : colors.surface,
                  borderColor: bulkAdjustmentType === 'set' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setBulkAdjustmentType('set')}
            >
              <Text
                style={[
                  styles.bulkTypeText,
                  { color: bulkAdjustmentType === 'set' ? '#FFFFFF' : colors.text },
                ]}
              >
                Set Values
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.bulkTypeOption,
                {
                  backgroundColor: bulkAdjustmentType === 'adjust' ? colors.primary : colors.surface,
                  borderColor: bulkAdjustmentType === 'adjust' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setBulkAdjustmentType('adjust')}
            >
              <Text
                style={[
                  styles.bulkTypeText,
                  { color: bulkAdjustmentType === 'adjust' ? '#FFFFFF' : colors.text },
                ]}
              >
                Adjust By
              </Text>
            </Pressable>
          </View>

          {bulkAdjustmentType === 'set' ? (
            <>
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Set Min Level To</Text>
              <TextInput
                style={[
                  styles.bulkInput,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={bulkMinLevel}
                onChangeText={setBulkMinLevel}
                keyboardType="numeric"
                placeholder="Leave empty to skip"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Set Max Level To</Text>
              <TextInput
                style={[
                  styles.bulkInput,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={bulkMaxLevel}
                onChangeText={setBulkMaxLevel}
                keyboardType="numeric"
                placeholder="Leave empty to skip"
                placeholderTextColor={colors.textTertiary}
              />
            </>
          ) : (
            <>
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Adjust Min Level By</Text>
              <TextInput
                style={[
                  styles.bulkInput,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={bulkMinAdjustment}
                onChangeText={setBulkMinAdjustment}
                keyboardType="numeric"
                placeholder="e.g., +10 or -5"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Adjust Max Level By</Text>
              <TextInput
                style={[
                  styles.bulkInput,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={bulkMaxAdjustment}
                onChangeText={setBulkMaxAdjustment}
                keyboardType="numeric"
                placeholder="e.g., +10 or -5"
                placeholderTextColor={colors.textTertiary}
              />
            </>
          )}
        </ScrollView>

        <Pressable
          style={[
            styles.applyButton,
            { backgroundColor: selectedItems.size > 0 ? colors.primary : colors.textTertiary },
          ]}
          onPress={applyBulkChanges}
          disabled={selectedItems.size === 0}
        >
          <Text style={styles.applyButtonText}>
            Apply to {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  const activeFilterCount =
    (selectedDepartment !== null ? 1 : 0) + (stockStatus !== 'all' ? 1 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.summaryRow}>
        <Pressable
          style={[
            styles.summaryCard,
            {
              backgroundColor: stockStatus === 'critical' ? '#EF444420' : colors.surface,
              borderColor: stockStatus === 'critical' ? '#EF4444' : colors.border,
            },
          ]}
          onPress={() => handleStatusFilter('critical')}
        >
          <AlertOctagon size={18} color="#EF4444" />
          <Text style={[styles.summaryCount, { color: '#EF4444' }]}>{stats.critical}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Out</Text>
        </Pressable>

        <Pressable
          style={[
            styles.summaryCard,
            {
              backgroundColor: stockStatus === 'low' ? '#F59E0B20' : colors.surface,
              borderColor: stockStatus === 'low' ? '#F59E0B' : colors.border,
            },
          ]}
          onPress={() => handleStatusFilter('low')}
        >
          <AlertTriangle size={18} color="#F59E0B" />
          <Text style={[styles.summaryCount, { color: '#F59E0B' }]}>{stats.low}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Low</Text>
        </Pressable>

        <Pressable
          style={[
            styles.summaryCard,
            {
              backgroundColor: stockStatus === 'healthy' ? '#10B98120' : colors.surface,
              borderColor: stockStatus === 'healthy' ? '#10B981' : colors.border,
            },
          ]}
          onPress={() => handleStatusFilter('healthy')}
        >
          <Package size={18} color="#10B981" />
          <Text style={[styles.summaryCount, { color: '#10B981' }]}>{stats.healthy}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>OK</Text>
        </Pressable>

        <Pressable
          style={[
            styles.summaryCard,
            {
              backgroundColor: stockStatus === 'overstock' ? '#3B82F620' : colors.surface,
              borderColor: stockStatus === 'overstock' ? '#3B82F6' : colors.border,
            },
          ]}
          onPress={() => handleStatusFilter('overstock')}
        >
          <TrendingUp size={18} color="#3B82F6" />
          <Text style={[styles.summaryCount, { color: '#3B82F6' }]}>{stats.overstock}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Over</Text>
        </Pressable>
      </View>

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
          style={[
            styles.iconButton,
            {
              backgroundColor: colors.surface,
              borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
            },
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

      <View style={styles.actionBar}>
        <View style={styles.actionLeft}>
          <Pressable
            style={[styles.selectAllBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={selectAll}
          >
            {selectedItems.size === filteredMaterials.length && filteredMaterials.length > 0 ? (
              <CheckSquare size={16} color={colors.primary} />
            ) : (
              <Square size={16} color={colors.textTertiary} />
            )}
            <Text style={[styles.selectAllText, { color: colors.text }]}>
              {selectedItems.size > 0 ? `${selectedItems.size} selected` : 'Select All'}
            </Text>
          </Pressable>

          {selectedItems.size > 0 && (
            <Pressable
              style={[styles.bulkBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowBulkModal(true)}
            >
              <ArrowUpDown size={14} color="#FFFFFF" />
              <Text style={styles.bulkBtnText}>Bulk Edit</Text>
            </Pressable>
          )}
        </View>

        {hasUnsavedChanges && (
          <View style={styles.actionRight}>
            <Pressable
              style={[styles.discardBtn, { backgroundColor: colors.backgroundSecondary }]}
              onPress={resetAllChanges}
            >
              <RotateCcw size={14} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.saveBtn, { backgroundColor: '#10B981' }]}
              onPress={saveAllChanges}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Save size={14} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save ({Object.keys(editedLevels).length})</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading items...</Text>
          </View>
        ) : isError ? (
          <View style={styles.errorContainer}>
            <AlertOctagon size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.text }]}>Failed to load items</Text>
            <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>{error?.message}</Text>
            <Pressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : filteredMaterials.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Package size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Items Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery || selectedDepartment !== null || stockStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Add items to manage their min/max levels'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {filteredMaterials.length} item{filteredMaterials.length !== 1 ? 's' : ''}
            </Text>
            {filteredMaterials.map(renderItemCard)}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderFilterModal()}
      {renderBulkModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  summaryLabel: {
    fontSize: 10,
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
  iconButton: {
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  discardBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    marginBottom: 10,
  },
  itemCard: {
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  checkboxArea: {
    marginRight: 12,
    padding: 2,
  },
  itemMain: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editedText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '600' as const,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  levelPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelItem: {
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 9,
  },
  levelValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statusBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  expandedSection: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    marginTop: 0,
  },
  stockBar: {
    marginBottom: 16,
    marginTop: 14,
  },
  stockBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  stockBarMin: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    height: '100%',
  },
  stockBarCurrent: {
    height: '100%',
    borderRadius: 4,
  },
  stockBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stockBarLabel: {
    fontSize: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  levelInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlign: 'center' as const,
  },
  varianceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  varianceItem: {
    flex: 1,
    alignItems: 'center',
  },
  varianceLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  varianceValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
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
  bulkInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  bulkInfoText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  bulkTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  bulkTypeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  bulkTypeText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  bulkInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
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
});
