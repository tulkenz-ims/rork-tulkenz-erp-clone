import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  ClipboardList,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Search,
  Send,
  RotateCcw,
  AlertCircle,
  Database,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { 
  useMaterialsQuery,
  useCreateCountSession,
  useUpdateCountSession,
  useApplyCountToInventory,
  CountSessionItem,
} from '@/hooks/useSupabaseMaterials';
import { 
  getDepartmentFromMaterialNumber,
  getAllDepartments,
} from '@/constants/inventoryDepartmentCodes';
import { ADJUSTMENT_REASONS } from '@/constants/inventoryTransactionsConstants';
import * as Haptics from 'expo-haptics';

type CountStep = 'select' | 'count' | 'review' | 'post';
type CountBy = 'department' | 'location' | 'category' | 'all';

interface LocalCountItem {
  materialId: string;
  materialName: string;
  materialSku: string;
  materialNumber: string;
  inventoryDepartment: number;
  location: string | null;
  unitOfMeasure: string;
  unitPrice: number;
  systemQuantity: number;
  countedQuantity: number | null;
  variance: number;
  variancePercent: number;
  reason: string;
  notes: string;
  approved: boolean;
}

export default function InventoryCountScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState<CountStep>('select');
  const [countBy, setCountBy] = useState<CountBy>('all');
  const [filterValue, setFilterValue] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [countItems, setCountItems] = useState<LocalCountItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionNumber, setSessionNumber] = useState<string>('');

  const performerName = user 
    ? `${user.first_name} ${user.last_name}`
    : 'System User';

  const { 
    data: materials = [], 
    isLoading: materialsLoading, 
    error: materialsError,
    refetch: refetchMaterials,
  } = useMaterialsQuery({
    filters: [{ column: 'status', operator: 'eq', value: 'active' }],
    orderBy: { column: 'name', ascending: true },
  });

  const createSession = useCreateCountSession({
    onSuccess: (session) => {
      setActiveSessionId(session.id);
      console.log('[InventoryCount] Created session:', session.id);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to create count session: ${error.message}`);
    },
  });

  const updateSession = useUpdateCountSession({
    onError: (error) => {
      console.error('[InventoryCount] Update session error:', error);
    },
  });



  const applyToInventory = useApplyCountToInventory({
    onSuccess: () => {
      console.log('[InventoryCount] Applied counts to inventory');
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to apply counts: ${error.message}`);
    },
  });

  const departments = getAllDepartments();
  
  const locations = useMemo(() => {
    const locs = new Set<string>();
    materials.forEach(m => {
      if (m.location) locs.add(m.location);
    });
    return Array.from(locs).sort();
  }, [materials]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    materials.forEach(m => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats).sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    let result = [...materials];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        m =>
          m.material_number.toLowerCase().includes(query) ||
          m.name.toLowerCase().includes(query) ||
          m.sku.toLowerCase().includes(query)
      );
    }

    if (countBy === 'department' && filterValue) {
      const deptCode = parseInt(filterValue);
      result = result.filter(m => m.inventory_department === deptCode);
    } else if (countBy === 'location' && filterValue) {
      result = result.filter(m => m.location === filterValue);
    } else if (countBy === 'category' && filterValue) {
      result = result.filter(m => m.category === filterValue);
    }

    return result;
  }, [searchQuery, countBy, filterValue, materials]);

  const varianceItems = useMemo(() => {
    return countItems.filter(item => item.variance !== 0);
  }, [countItems]);

  const countStats = useMemo(() => {
    const total = countItems.length;
    const counted = countItems.filter(item => item.countedQuantity !== null).length;
    const withVariance = varianceItems.length;
    const approved = varianceItems.filter(item => item.approved).length;
    const totalPositiveVariance = varianceItems
      .filter(item => item.variance > 0)
      .reduce((sum, item) => sum + (item.variance * item.unitPrice), 0);
    const totalNegativeVariance = varianceItems
      .filter(item => item.variance < 0)
      .reduce((sum, item) => sum + Math.abs(item.variance * item.unitPrice), 0);

    return { total, counted, withVariance, approved, totalPositiveVariance, totalNegativeVariance };
  }, [countItems, varianceItems]);

  const toggleSelectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedItems.size === filteredMaterials.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredMaterials.map(m => m.id)));
    }
  }, [filteredMaterials, selectedItems.size]);

  const toggleItem = useCallback((itemId: string) => {
    Haptics.selectionAsync();
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const generateSessionNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CNT-${year}${month}${day}-${random}`;
  }, []);

  const startCount = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const selectedMaterials = filteredMaterials.filter(m => selectedItems.has(m.id));
    
    const localItems: LocalCountItem[] = selectedMaterials.map(m => ({
      materialId: m.id,
      materialName: m.name,
      materialSku: m.sku,
      materialNumber: m.material_number,
      inventoryDepartment: m.inventory_department,
      location: m.location,
      unitOfMeasure: m.unit_of_measure,
      unitPrice: m.unit_price,
      systemQuantity: m.on_hand,
      countedQuantity: null,
      variance: 0,
      variancePercent: 0,
      reason: '',
      notes: '',
      approved: false,
    }));
    
    setCountItems(localItems);
    
    const newSessionNumber = generateSessionNumber();
    setSessionNumber(newSessionNumber);

    const sessionItems: CountSessionItem[] = selectedMaterials.map(m => ({
      material_id: m.id,
      material_name: m.name,
      material_sku: m.sku,
      expected_quantity: m.on_hand,
      counted: false,
    }));

    const sessionName = countBy === 'department' && filterValue 
      ? `${newSessionNumber} - Dept ${filterValue}`
      : countBy === 'location' && filterValue
      ? `${newSessionNumber} - ${filterValue}`
      : countBy === 'category' && filterValue
      ? `${newSessionNumber} - ${filterValue}`
      : newSessionNumber;

    try {
      await createSession.mutateAsync({
        name: sessionName,
        category: countBy === 'category' ? filterValue || undefined : undefined,
        created_by: performerName,
        items: sessionItems,
      });
      
      setCurrentStep('count');
      console.log(`[InventoryCount] Started count session ${newSessionNumber} with ${localItems.length} items`);
    } catch (error) {
      console.error('[InventoryCount] Failed to create session:', error);
    }
  }, [filteredMaterials, selectedItems, countBy, filterValue, generateSessionNumber, createSession, performerName]);

  const updateCountedQuantity = useCallback((index: number, value: string) => {
    const numValue = value === '' ? null : parseInt(value) || 0;
    setCountItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.countedQuantity = numValue;
      if (numValue !== null) {
        item.variance = numValue - item.systemQuantity;
        item.variancePercent = item.systemQuantity > 0 
          ? Math.round((item.variance / item.systemQuantity) * 100) 
          : (numValue > 0 ? 100 : 0);
      } else {
        item.variance = 0;
        item.variancePercent = 0;
      }
      updated[index] = item;
      return updated;
    });
  }, []);

  const updateItemReason = useCallback((index: number, reason: string) => {
    setCountItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], reason };
      return updated;
    });
  }, []);

  const updateItemNotes = useCallback((index: number, notes: string) => {
    setCountItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], notes };
      return updated;
    });
  }, []);

  const toggleItemApproval = useCallback((index: number) => {
    Haptics.selectionAsync();
    setCountItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], approved: !updated[index].approved };
      return updated;
    });
  }, []);

  const approveAllVariances = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCountItems(prev => prev.map(item => ({
      ...item,
      approved: item.variance !== 0 ? true : item.approved,
    })));
  }, []);

  const goToReview = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (activeSessionId) {
      const sessionItems: CountSessionItem[] = countItems.map(item => ({
        material_id: item.materialId,
        material_name: item.materialName,
        material_sku: item.materialSku,
        expected_quantity: item.systemQuantity,
        counted_quantity: item.countedQuantity ?? undefined,
        variance: item.countedQuantity !== null ? item.variance : undefined,
        counted: item.countedQuantity !== null,
        counted_at: item.countedQuantity !== null ? new Date().toISOString() : undefined,
        counted_by: item.countedQuantity !== null ? performerName : undefined,
        notes: item.notes || undefined,
      }));

      const countedCount = sessionItems.filter(i => i.counted).length;
      const varianceCount = sessionItems.filter(i => i.counted && i.variance !== 0).length;

      try {
        await updateSession.mutateAsync({
          id: activeSessionId,
          updates: {
            items: sessionItems as unknown as Record<string, unknown>[],
            counted_items: countedCount,
            variance_count: varianceCount,
            status: 'in_progress',
          },
        });
      } catch (error) {
        console.error('[InventoryCount] Failed to update session:', error);
      }
    }
    
    setCurrentStep('review');
    console.log(`[InventoryCount] Moving to review step. ${varianceItems.length} items with variance`);
  }, [activeSessionId, countItems, varianceItems.length, updateSession, performerName]);

  const postAdjustments = useCallback(async () => {
    const unapproved = varianceItems.filter(item => !item.approved);
    if (unapproved.length > 0) {
      Alert.alert(
        'Unapproved Variances',
        `There are ${unapproved.length} variance(s) that haven't been approved. Please approve all variances before posting.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const missingReasons = varianceItems.filter(item => !item.reason && Math.abs(item.variancePercent) > 10);
    if (missingReasons.length > 0) {
      Alert.alert(
        'Missing Reasons',
        `Please provide reasons for variances greater than 10% (${missingReasons.length} item(s)).`,
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (activeSessionId) {
      try {
        await updateSession.mutateAsync({
          id: activeSessionId,
          updates: {
            status: 'completed',
            completed_at: new Date().toISOString(),
          },
        });

        await applyToInventory.mutateAsync({
          sessionId: activeSessionId,
          appliedBy: performerName,
        });
      } catch (error) {
        console.error('[InventoryCount] Failed to complete session:', error);
      }
    }

    setCurrentStep('post');
    console.log(`[InventoryCount] Posted adjustments for session ${sessionNumber}`);
    console.log(`[InventoryCount] Total items: ${countStats.total}, Variances: ${countStats.withVariance}`);
    console.log(`[InventoryCount] Positive variance value: $${countStats.totalPositiveVariance.toFixed(2)}`);
    console.log(`[InventoryCount] Negative variance value: $${countStats.totalNegativeVariance.toFixed(2)}`);
  }, [varianceItems, countStats, sessionNumber, activeSessionId, updateSession, applyToInventory, performerName]);

  const resetCount = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep('select');
    setCountBy('all');
    setFilterValue(null);
    setSelectedItems(new Set());
    setCountItems([]);
    setSearchQuery('');
    setActiveSessionId(null);
    setSessionNumber('');
  }, []);

  const getVarianceColor = useCallback((variance: number, variancePercent: number) => {
    if (variance === 0) return '#10B981';
    if (Math.abs(variancePercent) <= 5) return '#F59E0B';
    return '#EF4444';
  }, []);

  const renderStepIndicator = () => (
    <View style={[styles.stepIndicator, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {(['select', 'count', 'review', 'post'] as CountStep[]).map((step, index) => {
        const isActive = currentStep === step;
        const isCompleted = 
          (step === 'select' && currentStep !== 'select') ||
          (step === 'count' && (currentStep === 'review' || currentStep === 'post')) ||
          (step === 'review' && currentStep === 'post');
        const stepLabels = ['Select', 'Count', 'Review', 'Post'];

        return (
          <React.Fragment key={step}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                {
                  backgroundColor: isCompleted ? '#10B981' : isActive ? colors.primary : colors.backgroundSecondary,
                  borderColor: isCompleted ? '#10B981' : isActive ? colors.primary : colors.border,
                }
              ]}>
                {isCompleted ? (
                  <Check size={14} color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    { color: isActive ? '#FFFFFF' : colors.textTertiary }
                  ]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                { color: isActive ? colors.primary : isCompleted ? '#10B981' : colors.textTertiary }
              ]}>
                {stepLabels[index]}
              </Text>
            </View>
            {index < 3 && (
              <View style={[
                styles.stepConnector,
                { backgroundColor: isCompleted ? '#10B981' : colors.border }
              ]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderLoadingState = () => (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading materials...
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
      <AlertCircle size={48} color="#EF4444" />
      <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to Load Materials</Text>
      <Text style={[styles.errorText, { color: colors.textSecondary }]}>
        {materialsError?.message || 'An error occurred while loading materials.'}
      </Text>
      <Pressable
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={() => refetchMaterials()}
      >
        <RotateCcw size={16} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );

  const renderEmptyState = () => (
    <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
      <Database size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Materials Found</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {searchQuery 
          ? 'No materials match your search criteria.'
          : 'Add materials to your inventory to start counting.'}
      </Text>
    </View>
  );

  const renderSelectStep = () => {
    if (materialsLoading) return renderLoadingState();
    if (materialsError) return renderErrorState();

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Select Items to Count</Text>
        <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
          Choose how you want to filter items, then select which ones to include in this count session.
        </Text>

        <View style={styles.countBySection}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Count By</Text>
          <View style={styles.countByOptions}>
            {[
              { value: 'all' as CountBy, label: 'All Items' },
              { value: 'department' as CountBy, label: 'Department' },
              { value: 'location' as CountBy, label: 'Location' },
              { value: 'category' as CountBy, label: 'Category' },
            ].map(option => (
              <Pressable
                key={option.value}
                style={[
                  styles.countByOption,
                  {
                    backgroundColor: countBy === option.value ? colors.primary + '15' : colors.surface,
                    borderColor: countBy === option.value ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCountBy(option.value);
                  setFilterValue(null);
                }}
              >
                <Text style={[
                  styles.countByOptionText,
                  { color: countBy === option.value ? colors.primary : colors.text }
                ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {countBy !== 'all' && (
          <View style={styles.filterSection}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Select {countBy === 'department' ? 'Department' : countBy === 'location' ? 'Location' : 'Category'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <View style={styles.filterChips}>
                {(countBy === 'department' ? departments.map(d => ({ value: String(d.code), label: d.shortName, color: d.color })) :
                  countBy === 'location' ? locations.map(l => ({ value: l, label: l })) :
                  categories.map(c => ({ value: c, label: c }))
                ).map(option => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: filterValue === option.value 
                          ? ('color' in option ? option.color + '20' : colors.primary + '15')
                          : colors.surface,
                        borderColor: filterValue === option.value 
                          ? ('color' in option ? option.color : colors.primary)
                          : colors.border,
                      }
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setFilterValue(option.value);
                    }}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: filterValue === option.value ? ('color' in option ? option.color : colors.primary) : colors.text }
                    ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

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

        {filteredMaterials.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <View style={styles.selectHeader}>
              <Pressable style={styles.selectAllButton} onPress={toggleSelectAll}>
                <View style={[
                  styles.checkbox,
                  {
                    backgroundColor: selectedItems.size === filteredMaterials.length && filteredMaterials.length > 0 
                      ? colors.primary 
                      : colors.surface,
                    borderColor: selectedItems.size === filteredMaterials.length && filteredMaterials.length > 0 
                      ? colors.primary 
                      : colors.border,
                  }
                ]}>
                  {selectedItems.size === filteredMaterials.length && filteredMaterials.length > 0 && (
                    <Check size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={[styles.selectAllText, { color: colors.text }]}>Select All</Text>
              </Pressable>
              <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>
                {selectedItems.size} of {filteredMaterials.length} selected
              </Text>
            </View>

            <ScrollView 
              style={styles.itemsList} 
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={materialsLoading}
                  onRefresh={refetchMaterials}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
            >
              {filteredMaterials.map(item => {
                const isSelected = selectedItems.has(item.id);
                const dept = getDepartmentFromMaterialNumber(item.material_number);

                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.selectItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => toggleItem(item.id)}
                  >
                    <View style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }
                    ]}>
                      {isSelected && <Check size={14} color="#FFFFFF" />}
                    </View>
                    <View style={styles.selectItemInfo}>
                      <View style={styles.selectItemHeader}>
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
                          <MapPin size={10} color={colors.textTertiary} />
                          <Text style={[styles.locationText, { color: colors.textTertiary }]}>
                            {item.location}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.selectItemQty}>
                      <Text style={[styles.qtyValue, { color: colors.text }]}>{item.on_hand}</Text>
                      <Text style={[styles.qtyUnit, { color: colors.textTertiary }]}>{item.unit_of_measure}</Text>
                    </View>
                  </Pressable>
                );
              })}
              <View style={{ height: 100 }} />
            </ScrollView>
          </>
        )}

        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable
            style={[
              styles.primaryButton,
              {
                backgroundColor: selectedItems.size > 0 ? colors.primary : colors.border,
                opacity: selectedItems.size > 0 ? 1 : 0.5,
              }
            ]}
            onPress={startCount}
            disabled={selectedItems.size === 0 || createSession.isPending}
          >
            {createSession.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <ClipboardList size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Start Count ({selectedItems.size})</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  const renderCountStep = () => (
    <KeyboardAvoidingView 
      style={styles.stepContent} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.countHeader}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Enter Counts</Text>
        <View style={[styles.progressBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.progressText, { color: colors.primary }]}>
            {countStats.counted}/{countStats.total} counted
          </Text>
        </View>
      </View>

      <ScrollView style={styles.countItemsList} showsVerticalScrollIndicator={false}>
        {countItems.map((item, index) => {
          const dept = getDepartmentFromMaterialNumber(item.materialNumber);
          const varianceColor = item.countedQuantity !== null 
            ? getVarianceColor(item.variance, item.variancePercent)
            : colors.textTertiary;

          return (
            <View
              key={item.materialId}
              style={[
                styles.countItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: item.countedQuantity !== null && item.variance !== 0 
                    ? varianceColor 
                    : colors.border,
                }
              ]}
            >
              <View style={styles.countItemHeader}>
                <View style={[styles.deptBadge, { backgroundColor: dept?.color || colors.primary }]}>
                  <Text style={styles.deptBadgeText}>{dept?.shortName || 'UNK'}</Text>
                </View>
                <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
                  {item.materialNumber}
                </Text>
                {item.location && (
                  <>
                    <View style={[styles.dotSeparator, { backgroundColor: colors.border }]} />
                    <MapPin size={10} color={colors.textTertiary} />
                    <Text style={[styles.locationText, { color: colors.textTertiary }]}>
                      {item.location}
                    </Text>
                  </>
                )}
              </View>
              <Text style={[styles.countItemName, { color: colors.text }]} numberOfLines={1}>
                {item.materialName}
              </Text>

              <View style={styles.countRow}>
                <View style={styles.systemQtyContainer}>
                  <Text style={[styles.qtyLabel, { color: colors.textTertiary }]}>System</Text>
                  <Text style={[styles.systemQty, { color: colors.text }]}>
                    {item.systemQuantity} {item.unitOfMeasure}
                  </Text>
                </View>

                <View style={styles.countInputContainer}>
                  <Text style={[styles.qtyLabel, { color: colors.textTertiary }]}>Counted</Text>
                  <TextInput
                    style={[
                      styles.countInput,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: item.countedQuantity !== null ? colors.primary : colors.border,
                        color: colors.text,
                      }
                    ]}
                    value={item.countedQuantity !== null ? String(item.countedQuantity) : ''}
                    onChangeText={(value) => updateCountedQuantity(index, value)}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.varianceContainer}>
                  <Text style={[styles.qtyLabel, { color: colors.textTertiary }]}>Variance</Text>
                  <View style={[styles.varianceBadge, { backgroundColor: varianceColor + '15' }]}>
                    <Text style={[styles.varianceText, { color: varianceColor }]}>
                      {item.countedQuantity !== null 
                        ? (item.variance >= 0 ? '+' : '') + item.variance
                        : '-'
                      }
                    </Text>
                  </View>
                </View>
              </View>

              {item.countedQuantity !== null && item.variance !== 0 && (
                <View style={[styles.varianceNote, { backgroundColor: varianceColor + '10' }]}>
                  <AlertTriangle size={12} color={varianceColor} />
                  <Text style={[styles.varianceNoteText, { color: varianceColor }]}>
                    {Math.abs(item.variancePercent)}% {item.variance > 0 ? 'over' : 'under'} system quantity
                  </Text>
                </View>
              )}

              <TextInput
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                    color: colors.text,
                  }
                ]}
                value={item.notes}
                onChangeText={(value) => updateItemNotes(index, value)}
                placeholder="Notes (optional)"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          );
        })}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCurrentStep('select');
          }}
        >
          <ChevronLeft size={18} color={colors.text} />
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Back</Text>
        </Pressable>
        <Pressable
          style={[
            styles.primaryButton,
            { flex: 1, backgroundColor: colors.primary }
          ]}
          onPress={goToReview}
          disabled={updateSession.isPending}
        >
          {updateSession.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Review Variances</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Review Variances</Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        {varianceItems.length > 0 
          ? `Review and approve ${varianceItems.length} item(s) with variance. Reasons required for variances >10%.`
          : 'No variances found. All counts match system quantities.'
        }
      </Text>

      {varianceItems.length > 0 && (
        <View style={styles.reviewStats}>
          <View style={[styles.reviewStatCard, { backgroundColor: '#10B981' + '15', borderColor: '#10B981' }]}>
            <Text style={[styles.reviewStatValue, { color: '#10B981' }]}>
              +${countStats.totalPositiveVariance.toFixed(2)}
            </Text>
            <Text style={[styles.reviewStatLabel, { color: '#10B981' }]}>Overage</Text>
          </View>
          <View style={[styles.reviewStatCard, { backgroundColor: '#EF4444' + '15', borderColor: '#EF4444' }]}>
            <Text style={[styles.reviewStatValue, { color: '#EF4444' }]}>
              -${countStats.totalNegativeVariance.toFixed(2)}
            </Text>
            <Text style={[styles.reviewStatLabel, { color: '#EF4444' }]}>Shortage</Text>
          </View>
        </View>
      )}

      {varianceItems.length > 0 && (
        <Pressable
          style={[styles.approveAllButton, { backgroundColor: colors.primary + '15' }]}
          onPress={approveAllVariances}
        >
          <CheckCircle2 size={16} color={colors.primary} />
          <Text style={[styles.approveAllText, { color: colors.primary }]}>Approve All</Text>
        </Pressable>
      )}

      <ScrollView style={styles.varianceList} showsVerticalScrollIndicator={false}>
        {varianceItems.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <CheckCircle2 size={48} color="#10B981" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>All Counts Match!</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No adjustments needed. Ready to post.
            </Text>
          </View>
        ) : (
          varianceItems.map((item) => {
            const itemIndex = countItems.findIndex(ci => ci.materialId === item.materialId);
            const varianceColor = getVarianceColor(item.variance, item.variancePercent);
            const needsReason = Math.abs(item.variancePercent) > 10 && !item.reason;

            return (
              <View
                key={item.materialId}
                style={[
                  styles.varianceItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: needsReason ? '#EF4444' : item.approved ? '#10B981' : colors.border,
                  }
                ]}
              >
                <View style={styles.varianceItemHeader}>
                  <View style={styles.varianceItemInfo}>
                    <Text style={[styles.varianceItemName, { color: colors.text }]} numberOfLines={1}>
                      {item.materialName}
                    </Text>
                    <Text style={[styles.varianceItemNumber, { color: colors.textSecondary }]}>
                      {item.materialNumber}
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.approveCheckbox,
                      {
                        backgroundColor: item.approved ? '#10B981' : colors.surface,
                        borderColor: item.approved ? '#10B981' : colors.border,
                      }
                    ]}
                    onPress={() => toggleItemApproval(itemIndex)}
                  >
                    {item.approved && <Check size={16} color="#FFFFFF" />}
                  </Pressable>
                </View>

                <View style={styles.varianceDetails}>
                  <View style={styles.varianceDetailRow}>
                    <Text style={[styles.varianceDetailLabel, { color: colors.textTertiary }]}>System:</Text>
                    <Text style={[styles.varianceDetailValue, { color: colors.text }]}>
                      {item.systemQuantity}
                    </Text>
                  </View>
                  <View style={styles.varianceDetailRow}>
                    <Text style={[styles.varianceDetailLabel, { color: colors.textTertiary }]}>Counted:</Text>
                    <Text style={[styles.varianceDetailValue, { color: colors.text }]}>
                      {item.countedQuantity}
                    </Text>
                  </View>
                  <View style={styles.varianceDetailRow}>
                    <Text style={[styles.varianceDetailLabel, { color: colors.textTertiary }]}>Variance:</Text>
                    <View style={[styles.varianceBadgeLarge, { backgroundColor: varianceColor + '15' }]}>
                      <Text style={[styles.varianceBadgeText, { color: varianceColor }]}>
                        {item.variance >= 0 ? '+' : ''}{item.variance} ({item.variancePercent}%)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.varianceDetailRow}>
                    <Text style={[styles.varianceDetailLabel, { color: colors.textTertiary }]}>Value:</Text>
                    <Text style={[styles.varianceDetailValue, { color: varianceColor }]}>
                      {item.variance >= 0 ? '+' : '-'}${Math.abs(item.variance * item.unitPrice).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.reasonSection}>
                  <Text style={[
                    styles.reasonLabel, 
                    { color: needsReason ? '#EF4444' : colors.textTertiary }
                  ]}>
                    Reason {Math.abs(item.variancePercent) > 10 ? '(Required)' : '(Optional)'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.reasonChips}>
                      {ADJUSTMENT_REASONS.map(reason => (
                        <Pressable
                          key={reason.value}
                          style={[
                            styles.reasonChip,
                            {
                              backgroundColor: item.reason === reason.value ? colors.primary + '15' : colors.backgroundSecondary,
                              borderColor: item.reason === reason.value ? colors.primary : colors.border,
                            }
                          ]}
                          onPress={() => updateItemReason(itemIndex, reason.value)}
                        >
                          <Text style={[
                            styles.reasonChipText,
                            { color: item.reason === reason.value ? colors.primary : colors.text }
                          ]}>
                            {reason.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCurrentStep('count');
          }}
        >
          <ChevronLeft size={18} color={colors.text} />
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Back</Text>
        </Pressable>
        <Pressable
          style={[
            styles.primaryButton,
            { flex: 1, backgroundColor: '#10B981' }
          ]}
          onPress={postAdjustments}
          disabled={updateSession.isPending || applyToInventory.isPending}
        >
          {updateSession.isPending || applyToInventory.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Send size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Post Adjustments</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );

  const renderPostStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.successContainer}>
        <View style={[styles.successIcon, { backgroundColor: '#10B981' + '20' }]}>
          <CheckCircle2 size={64} color="#10B981" />
        </View>
        <Text style={[styles.successTitle, { color: colors.text }]}>Count Posted Successfully!</Text>
        <Text style={[styles.successDescription, { color: colors.textSecondary }]}>
          Session {sessionNumber} has been completed and all adjustments have been recorded.
        </Text>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Items Counted</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{countStats.total}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Variances Found</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{countStats.withVariance}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Overage Value</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
              +${countStats.totalPositiveVariance.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Shortage Value</Text>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
              -${countStats.totalNegativeVariance.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: '600' as const }]}>
              Net Adjustment
            </Text>
            <Text style={[
              styles.summaryValue, 
              { 
                color: countStats.totalPositiveVariance - countStats.totalNegativeVariance >= 0 
                  ? '#10B981' 
                  : '#EF4444',
                fontWeight: '700' as const,
              }
            ]}>
              ${(countStats.totalPositiveVariance - countStats.totalNegativeVariance).toFixed(2)}
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.newCountButton, { backgroundColor: colors.primary }]}
          onPress={resetCount}
        >
          <RotateCcw size={18} color="#FFFFFF" />
          <Text style={styles.newCountButtonText}>Start New Count</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderStepIndicator()}
      {currentStep === 'select' && renderSelectStep()}
      {currentStep === 'count' && renderCountStep()}
      {currentStep === 'review' && renderReviewStep()}
      {currentStep === 'post' && renderPostStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  stepConnector: {
    width: 40,
    height: 2,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stepDescription: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    lineHeight: 20,
  },
  countBySection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  countByOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countByOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  countByOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
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
  selectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  selectedCount: {
    fontSize: 13,
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  selectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  selectItemInfo: {
    flex: 1,
  },
  selectItemHeader: {
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
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 10,
  },
  selectItemQty: {
    alignItems: 'flex-end',
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  qtyUnit: {
    fontSize: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  countHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  countItemsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  countItem: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  countItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  countItemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  systemQtyContainer: {
    flex: 1,
  },
  qtyLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
  },
  systemQty: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  countInputContainer: {
    flex: 1,
  },
  countInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  varianceContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  varianceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  varianceText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  varianceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  varianceNoteText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  notesInput: {
    marginTop: 10,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  reviewStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  reviewStatCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  reviewStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  reviewStatLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  approveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  varianceList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  varianceItem: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  varianceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  varianceItemInfo: {
    flex: 1,
  },
  varianceItemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  varianceItemNumber: {
    fontSize: 12,
  },
  approveCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  varianceDetails: {
    gap: 6,
    marginBottom: 12,
  },
  varianceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  varianceDetailLabel: {
    fontSize: 12,
  },
  varianceDetailValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  varianceBadgeLarge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  varianceBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  reasonSection: {
    marginTop: 4,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  reasonChips: {
    flexDirection: 'row',
    gap: 6,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  reasonChipText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  successDescription: {
    fontSize: 15,
    textAlign: 'center' as const,
    marginBottom: 24,
    lineHeight: 22,
  },
  summaryCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
  },
  newCountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  newCountButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
