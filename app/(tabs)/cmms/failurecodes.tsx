import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Search,
  X,
  Filter,
  ChevronRight,
  Cog,
  Zap,
  Droplets,
  Wind,
  Gauge,
  Box,
  GitBranch,
  User,
  Cloud,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import {
  useFailureCodesQuery,
  useFailureCodeCategories,
  useFailureRecordsQuery,
  FailureCode,
  FailureCodeCategory,
  FailureCodeCategoryInfo,
} from '@/hooks/useSupabaseFailureCodes';

const CATEGORY_ICONS: Partial<Record<FailureCodeCategory, React.ComponentType<any>>> = {
  mechanical: Cog,
  electrical: Zap,
  hydraulic: Droplets,
  pneumatic: Wind,
  instrumentation: Gauge,
  structural: Box,
  process: GitBranch,
  operator: User,
  external: Cloud,
  environmental: Cloud,
  software: Cog,
  other: Box,
};

const SEVERITY_CONFIG = {
  minor: { label: 'Minor', color: '#10B981', bg: '#D1FAE5' },
  moderate: { label: 'Moderate', color: '#F59E0B', bg: '#FEF3C7' },
  major: { label: 'Major', color: '#EF4444', bg: '#FEE2E2' },
  critical: { label: 'Critical', color: '#DC2626', bg: '#FECACA' },
};

interface FailureCodesScreenProps {
  selectionMode?: boolean;
  initialSelectedCodes?: string[];
  onSelectionConfirm?: (selectedCodes: FailureCode[]) => void;
  onCancel?: () => void;
  maxSelections?: number;
}

export default function FailureCodesScreen({
  selectionMode = false,
  initialSelectedCodes = [],
  onSelectionConfirm,
  onCancel,
  maxSelections,
}: FailureCodesScreenProps) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FailureCodeCategory | 'all'>('all');
  const [selectedCode, setSelectedCode] = useState<FailureCode | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [selectedCodeIds, setSelectedCodeIds] = useState<Set<string>>(new Set(initialSelectedCodes));
  const [collapsedCategories, setCollapsedCategories] = useState<Set<FailureCodeCategory>>(new Set());

  const { data: failureCodesData = [], isLoading: isLoadingCodes, refetch: refetchCodes } = useFailureCodesQuery({ isActive: true });
  const { data: categoriesData = [] } = useFailureCodeCategories();
  const { data: failureRecordsDataRaw = [], isLoading: isLoadingRecords, refetch: refetchRecords } = useFailureRecordsQuery();

  const failureRecordsData = useMemo(() => {
    return failureRecordsDataRaw.map(r => ({
      id: r.id,
      workOrderNumber: r.work_order_number,
      equipmentName: r.equipment_name,
      failureCodeId: r.failure_code_id,
      failureCode: r.failure_code,
      failureDate: r.failure_date,
      description: r.description,
      downtimeHours: r.downtime_hours || 0,
      repairHours: r.repair_hours || 0,
      partsCost: r.parts_cost || 0,
      laborCost: r.labor_cost || 0,
      isRecurring: r.is_recurring || false,
    }));
  }, [failureRecordsDataRaw]);

  const failureCodes: FailureCode[] = useMemo(() => {
    return failureCodesData.map(fc => ({
      id: fc.id,
      code: fc.code,
      name: fc.name,
      description: fc.description,
      category: fc.category,
      severity: fc.severity as FailureCode['severity'],
      commonCauses: 'common_causes' in fc ? (fc as any).common_causes : (fc as any).commonCauses || [],
      suggestedActions: 'suggested_actions' in fc ? (fc as any).suggested_actions : (fc as any).suggestedActions || [],
      mttrHours: 'mttr_hours' in fc ? (fc as any).mttr_hours : (fc as any).mttrHours,
      isActive: 'is_active' in fc ? (fc as any).is_active : (fc as any).isActive ?? true,
    }));
  }, [failureCodesData]);

  const FAILURE_CODE_CATEGORIES = categoriesData;

  const isLoading = isLoadingCodes || isLoadingRecords;

  const handleRefresh = useCallback(() => {
    refetchCodes();
    refetchRecords();
  }, [refetchCodes, refetchRecords]);

  useEffect(() => {
    setSelectedCodeIds(new Set(initialSelectedCodes));
  }, [initialSelectedCodes]);

  const toggleCodeSelection = useCallback((codeId: string) => {
    setSelectedCodeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codeId)) {
        newSet.delete(codeId);
      } else {
        if (maxSelections && newSet.size >= maxSelections) {
          return prev;
        }
        newSet.add(codeId);
      }
      return newSet;
    });
  }, [maxSelections]);

  const toggleCategoryCollapse = useCallback((category: FailureCodeCategory) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const handleConfirmSelection = useCallback(() => {
    const selectedCodes = failureCodes.filter(code => selectedCodeIds.has(code.id));
    onSelectionConfirm?.(selectedCodes);
  }, [selectedCodeIds, onSelectionConfirm, failureCodes]);

  const clearAllSelections = useCallback(() => {
    setSelectedCodeIds(new Set());
  }, []);

  const filteredCodes = useMemo(() => {
    return failureCodes.filter(code => {
      const matchesSearch = searchQuery === '' ||
        code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || code.category === selectedCategory;
      
      return matchesSearch && matchesCategory && code.isActive;
    });
  }, [searchQuery, selectedCategory, failureCodes]);

  const groupedCodes = useMemo(() => {
    const groups: Partial<Record<FailureCodeCategory, FailureCode[]>> = {};
    
    filteredCodes.forEach(code => {
      if (!groups[code.category]) {
        groups[code.category] = [];
      }
      groups[code.category]!.push(code);
    });
    
    return groups;
  }, [filteredCodes]);

  const getFailureCount = useCallback((codeId: string) => {
    return failureRecordsData.filter(r => r.failureCodeId === codeId).length;
  }, [failureRecordsData]);

  const getFailuresByCode = useCallback((codeId: string) => {
    return failureRecordsData.filter(r => r.failureCodeId === codeId);
  }, [failureRecordsData]);

  const getCategoryInfo = useCallback((categoryId: FailureCodeCategory): FailureCodeCategoryInfo => {
    return FAILURE_CODE_CATEGORIES.find(c => c.id === categoryId)!;
  }, []);

  const renderCategoryIcon = useCallback((category: FailureCodeCategory, size: number = 20, color?: string) => {
    const Icon = CATEGORY_ICONS[category] || Cog;
    const categoryInfo = getCategoryInfo(category);
    return <Icon size={size} color={color || categoryInfo?.color || '#6B7280'} />;
  }, [getCategoryInfo]);

  const renderCodeItem = useCallback((code: FailureCode) => {
    const categoryInfo = getCategoryInfo(code.category);
    const severityConfig = SEVERITY_CONFIG[code.severity];
    const failureCount = getFailureCount(code.id);
    const isSelected = selectedCodeIds.has(code.id);
    const isAtLimit = maxSelections && selectedCodeIds.size >= maxSelections && !isSelected;

    const handlePress = () => {
      if (selectionMode) {
        if (!isAtLimit) {
          toggleCodeSelection(code.id);
        }
      } else {
        setSelectedCode(code);
      }
    };

    return (
      <TouchableOpacity
        key={code.id}
        style={[
          styles.codeCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          selectionMode && isSelected && {
            backgroundColor: colors.primary + '10',
            borderColor: colors.primary,
            borderWidth: 2,
          },
          selectionMode && isAtLimit && { opacity: 0.5 },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.codeHeader}>
          {selectionMode && (
            <View
              style={[
                styles.selectionIndicator,
                isSelected
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: 'transparent', borderColor: colors.border },
              ]}
            >
              {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
            </View>
          )}
          <View style={[styles.codeIconContainer, { backgroundColor: categoryInfo.color + '20' }]}>
            {renderCategoryIcon(code.category, 18, categoryInfo.color)}
          </View>
          <View style={styles.codeInfo}>
            <Text style={[styles.codeText, { color: categoryInfo.color }]}>{code.code}</Text>
            <Text style={[styles.codeName, { color: colors.text }]} numberOfLines={1}>{code.name}</Text>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: severityConfig.bg }]}>
            <Text style={[styles.severityText, { color: severityConfig.color }]}>{severityConfig.label}</Text>
          </View>
        </View>
        
        <Text style={[styles.codeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {code.description}
        </Text>
        
        <View style={styles.codeFooter}>
          <View style={styles.codeStats}>
            {code.mttrHours && (
              <View style={styles.statItem}>
                <Clock size={12} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  ~{code.mttrHours}h MTTR
                </Text>
              </View>
            )}
            {failureCount > 0 && (
              <View style={styles.statItem}>
                <AlertTriangle size={12} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {failureCount} occurrence{failureCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
          {!selectionMode && <ChevronRight size={16} color={colors.textSecondary} />}
        </View>
      </TouchableOpacity>
    );
  }, [colors, getCategoryInfo, renderCategoryIcon, getFailureCount, selectionMode, selectedCodeIds, toggleCodeSelection, maxSelections]);

  const renderCategorySection = useCallback((category: FailureCodeCategory) => {
    const codes = groupedCodes[category] || [];
    if (codes.length === 0) return null;
    
    const categoryInfo = getCategoryInfo(category);
    const isCollapsed = collapsedCategories.has(category);
    const selectedInCategory = codes.filter(code => selectedCodeIds.has(code.id)).length;
    
    return (
      <View key={category} style={styles.categorySection}>
        <TouchableOpacity
          style={styles.categorySectionHeader}
          onPress={() => toggleCategoryCollapse(category)}
          activeOpacity={0.7}
        >
          <View style={[styles.categoryIconSmall, { backgroundColor: categoryInfo.color + '20' }]}>
            {renderCategoryIcon(category, 16, categoryInfo.color)}
          </View>
          <Text style={[styles.categorySectionTitle, { color: colors.text }]}>
            {categoryInfo.name}
          </Text>
          {selectionMode && selectedInCategory > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.selectedCountText}>{selectedInCategory}</Text>
            </View>
          )}
          <View style={[styles.countBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>{codes.length}</Text>
          </View>
          {isCollapsed ? (
            <ChevronDown size={18} color={colors.textSecondary} />
          ) : (
            <ChevronUp size={18} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
        {!isCollapsed && codes.map(renderCodeItem)}
      </View>
    );
  }, [groupedCodes, colors, getCategoryInfo, renderCategoryIcon, renderCodeItem, collapsedCategories, toggleCategoryCollapse, selectionMode, selectedCodeIds]);

  const renderDetailModal = () => {
    if (!selectedCode) return null;
    
    const categoryInfo = getCategoryInfo(selectedCode.category);
    const severityConfig = SEVERITY_CONFIG[selectedCode.severity];
    const failures = getFailuresByCode(selectedCode.id);

    return (
      <Modal
        visible={!!selectedCode}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCode(null)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSelectedCode(null)} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Failure Code Details</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <View style={[styles.detailIconLarge, { backgroundColor: categoryInfo.color + '20' }]}>
                  {renderCategoryIcon(selectedCode.category, 28, categoryInfo.color)}
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={[styles.detailCode, { color: categoryInfo.color }]}>{selectedCode.code}</Text>
                  <Text style={[styles.detailName, { color: colors.text }]}>{selectedCode.name}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
                <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '15' }]}>
                  {renderCategoryIcon(selectedCode.category, 14, categoryInfo.color)}
                  <Text style={[styles.categoryBadgeText, { color: categoryInfo.color }]}>
                    {categoryInfo.name}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Severity</Text>
                <View style={[styles.severityBadgeLarge, { backgroundColor: severityConfig.bg }]}>
                  <View style={[styles.severityDot, { backgroundColor: severityConfig.color }]} />
                  <Text style={[styles.severityTextLarge, { color: severityConfig.color }]}>
                    {severityConfig.label}
                  </Text>
                </View>
              </View>

              {selectedCode.mttrHours && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Avg. Repair Time</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedCode.mttrHours} hours
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                {selectedCode.description}
              </Text>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Common Causes</Text>
              {selectedCode.commonCauses.map((cause, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={[styles.bulletPoint, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.listItemText, { color: colors.textSecondary }]}>{cause}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Suggested Actions</Text>
              {selectedCode.suggestedActions.map((action, index) => (
                <View key={index} style={styles.listItem}>
                  <CheckCircle size={14} color="#10B981" />
                  <Text style={[styles.listItemText, { color: colors.textSecondary }]}>{action}</Text>
                </View>
              ))}
            </View>

            {failures.length > 0 && (
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Occurrences</Text>
                  <View style={[styles.occurrencesBadge, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.occurrencesText, { color: '#EF4444' }]}>{failures.length}</Text>
                  </View>
                </View>
                {failures.slice(0, 5).map((failure) => (
                  <View key={failure.id} style={[styles.failureItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.failureHeader}>
                      <Text style={[styles.failureWO, { color: colors.primary }]}>{failure.workOrderNumber}</Text>
                      <Text style={[styles.failureDate, { color: colors.textSecondary }]}>{failure.failureDate}</Text>
                    </View>
                    <Text style={[styles.failureEquipment, { color: colors.text }]}>{failure.equipmentName}</Text>
                    <Text style={[styles.failureDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {failure.description}
                    </Text>
                    <View style={styles.failureStats}>
                      <Text style={[styles.failureStatItem, { color: colors.textSecondary }]}>
                        ⏱ {failure.downtimeHours}h downtime
                      </Text>
                      <Text style={[styles.failureStatItem, { color: colors.textSecondary }]}>
                        💰 ${(failure.partsCost + failure.laborCost).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderCategoryFilterModal = () => (
    <Modal
      visible={showCategoryFilter}
      animationType="fade"
      transparent
      onRequestClose={() => setShowCategoryFilter(false)}
    >
      <TouchableOpacity 
        style={styles.filterModalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowCategoryFilter(false)}
      >
        <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filter by Category</Text>
          
          <TouchableOpacity
            style={[
              styles.filterOption,
              selectedCategory === 'all' && { backgroundColor: colors.primary + '15' }
            ]}
            onPress={() => { setSelectedCategory('all'); setShowCategoryFilter(false); }}
          >
            <View style={[styles.filterIconContainer, { backgroundColor: colors.border }]}>
              <Filter size={16} color={colors.textSecondary} />
            </View>
            <Text style={[
              styles.filterOptionText,
              { color: selectedCategory === 'all' ? colors.primary : colors.text }
            ]}>
              All Categories
            </Text>
            {selectedCategory === 'all' && <CheckCircle size={18} color={colors.primary} />}
          </TouchableOpacity>

          {FAILURE_CODE_CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.filterOption,
                selectedCategory === category.id && { backgroundColor: category.color + '15' }
              ]}
              onPress={() => { setSelectedCategory(category.id); setShowCategoryFilter(false); }}
            >
              <View style={[styles.filterIconContainer, { backgroundColor: category.color + '20' }]}>
                {renderCategoryIcon(category.id, 16, category.color)}
              </View>
              <Text style={[
                styles.filterOptionText,
                { color: selectedCategory === category.id ? category.color : colors.text }
              ]}>
                {category.name}
              </Text>
              <Text style={[styles.filterCount, { color: colors.textSecondary }]}>
                {failureCodes.filter(c => c.category === category.id && c.isActive).length}
              </Text>
              {selectedCategory === category.id && <CheckCircle size={18} color={category.color} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const selectedCategoryInfo = selectedCategory !== 'all' 
    ? getCategoryInfo(selectedCategory) 
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search failure codes..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedCategory !== 'all' && { 
              backgroundColor: selectedCategoryInfo!.color + '15',
              borderColor: selectedCategoryInfo!.color 
            },
            selectedCategory === 'all' && { backgroundColor: colors.background, borderColor: colors.border }
          ]}
          onPress={() => setShowCategoryFilter(true)}
        >
          {selectedCategory !== 'all' ? (
            <>
              {renderCategoryIcon(selectedCategory, 16, selectedCategoryInfo!.color)}
              <Text style={[styles.filterButtonText, { color: selectedCategoryInfo!.color }]}>
                {selectedCategoryInfo!.name}
              </Text>
            </>
          ) : (
            <>
              <Filter size={16} color={colors.textSecondary} />
              <Text style={[styles.filterButtonText, { color: colors.textSecondary }]}>Filter</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{filteredCodes.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Codes</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{failureRecordsData.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Failures</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>
            {failureRecordsData.filter(f => f.isRecurring).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Recurring</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {selectedCategory === 'all' ? (
          Object.keys(groupedCodes).map(category => 
            renderCategorySection(category as FailureCodeCategory)
          )
        ) : (
          (groupedCodes[selectedCategory] || []).map(renderCodeItem)
        )}

        {isLoading && filteredCodes.length === 0 && (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Loading...</Text>
          </View>
        )}

        {!isLoading && filteredCodes.length === 0 && (
          <View style={styles.emptyState}>
            <Info size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Failure Codes Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Try adjusting your search or filter criteria
            </Text>
          </View>
        )}

        <View style={{ height: selectionMode ? 100 : 20 }} />
      </ScrollView>

      {selectionMode && (
        <View style={[styles.selectionFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.selectionInfo}>
            <Text style={[styles.selectionCount, { color: colors.text }]}>
              {selectedCodeIds.size} selected
              {maxSelections ? ` (max ${maxSelections})` : ''}
            </Text>
            {selectedCodeIds.size > 0 && (
              <TouchableOpacity onPress={clearAllSelections}>
                <Text style={[styles.clearButton, { color: colors.primary }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.selectionActions}>
            {onCancel && (
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: colors.primary },
                selectedCodeIds.size === 0 && { opacity: 0.5 },
              ]}
              onPress={handleConfirmSelection}
              disabled={selectedCodeIds.size === 0}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Confirm Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {renderDetailModal()}
      {renderCategoryFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 42,
    gap: 6,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsBar: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    alignSelf: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },
  categorySection: {
    marginBottom: 20,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  categoryIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  codeCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  codeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeInfo: {
    flex: 1,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  codeName: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  codeDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  codeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeStats: {
    flexDirection: 'row',
    gap: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
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
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 14,
  },
  detailIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailCode: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  severityBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityTextLarge: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  occurrencesBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  occurrencesText: {
    fontSize: 12,
    fontWeight: '700',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  failureItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  failureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  failureWO: {
    fontSize: 13,
    fontWeight: '600',
  },
  failureDate: {
    fontSize: 12,
  },
  failureEquipment: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  failureDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  failureStats: {
    flexDirection: 'row',
    gap: 16,
  },
  failureStatItem: {
    fontSize: 12,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  filterModalContent: {
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  filterModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 10,
  },
  filterIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  filterCount: {
    fontSize: 13,
    marginRight: 4,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 4,
  },
  selectedCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectionFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
