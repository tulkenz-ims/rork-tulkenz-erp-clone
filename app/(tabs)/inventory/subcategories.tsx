import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  FolderTree,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Package,
  Building2,
  LayoutGrid,
  Filter,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  INVENTORY_DEPARTMENTS,
  DepartmentSubCategory,
  getAllDepartments,
  getSubCategorySummary,
} from '@/constants/inventoryDepartmentCodes';
import * as Haptics from 'expo-haptics';

interface SubCategoryFormData {
  id: string;
  code: string;
  name: string;
  description: string;
  departmentCode: number;
  sortOrder: number;
  isActive: boolean;
}

export default function SubCategoriesScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<number>>(new Set([3]));
  const [refreshing, setRefreshing] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategoryFormData | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const departments = useMemo(() => getAllDepartments(), []);

  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) {
      return selectedDepartment 
        ? departments.filter(d => d.code === selectedDepartment)
        : departments;
    }

    const query = searchQuery.toLowerCase();
    return departments.filter(dept => {
      if (dept.name.toLowerCase().includes(query) || 
          dept.shortName.toLowerCase().includes(query)) {
        return true;
      }
      return dept.subCategories.some(
        sc => sc.name.toLowerCase().includes(query) || 
              sc.description.toLowerCase().includes(query) ||
              sc.code.toLowerCase().includes(query)
      );
    });
  }, [departments, searchQuery, selectedDepartment]);

  const getFilteredSubCategories = useCallback((departmentCode: number) => {
    const subCats = INVENTORY_DEPARTMENTS[departmentCode]?.subCategories || [];
    let filtered = showInactive ? subCats : subCats.filter(sc => sc.isActive);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        sc => sc.name.toLowerCase().includes(query) || 
              sc.description.toLowerCase().includes(query) ||
              sc.code.toLowerCase().includes(query)
      );
    }
    
    return filtered.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [searchQuery, showInactive]);

  const totalStats = useMemo(() => {
    let total = 0;
    let active = 0;
    departments.forEach(dept => {
      const summary = getSubCategorySummary(dept.code);
      total += summary.total;
      active += summary.active;
    });
    return { total, active, inactive: total - active };
  }, [departments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const toggleDepartment = useCallback((deptCode: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptCode)) {
        newSet.delete(deptCode);
      } else {
        newSet.add(deptCode);
      }
      return newSet;
    });
  }, []);

  const handleAddSubCategory = useCallback((departmentCode: number) => {
    Haptics.selectionAsync();
    const dept = INVENTORY_DEPARTMENTS[departmentCode];
    const nextOrder = (dept?.subCategories.length || 0) + 1;
    const nextCode = `${departmentCode}-${nextOrder.toString().padStart(2, '0')}`;
    
    setEditingSubCategory({
      id: '',
      code: nextCode,
      name: '',
      description: '',
      departmentCode,
      sortOrder: nextOrder,
      isActive: true,
    });
    setModalVisible(true);
  }, []);

  const handleEditSubCategory = useCallback((subCategory: DepartmentSubCategory) => {
    Haptics.selectionAsync();
    setEditingSubCategory({
      id: subCategory.id,
      code: subCategory.code,
      name: subCategory.name,
      description: subCategory.description,
      departmentCode: subCategory.departmentCode,
      sortOrder: subCategory.sortOrder,
      isActive: subCategory.isActive,
    });
    setModalVisible(true);
  }, []);

  const handleDeleteSubCategory = useCallback((subCategory: DepartmentSubCategory) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Sub-Category',
      `Are you sure you want to delete "${subCategory.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            console.log('Deleting sub-category:', subCategory.id);
            Alert.alert('Success', 'Sub-category deleted successfully');
          }
        },
      ]
    );
  }, []);

  const handleSaveSubCategory = useCallback(() => {
    if (!editingSubCategory) return;
    
    if (!editingSubCategory.name.trim()) {
      Alert.alert('Error', 'Sub-category name is required');
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('Saving sub-category:', editingSubCategory);
    setModalVisible(false);
    setEditingSubCategory(null);
    Alert.alert('Success', editingSubCategory.id ? 'Sub-category updated' : 'Sub-category created');
  }, [editingSubCategory]);

  const renderSubCategoryCard = useCallback((subCategory: DepartmentSubCategory, deptColor: string) => {
    return (
      <View
        key={subCategory.id}
        style={[
          styles.subCategoryCard,
          { 
            backgroundColor: colors.surface, 
            borderColor: subCategory.isActive ? colors.border : '#9CA3AF',
            opacity: subCategory.isActive ? 1 : 0.7,
          },
        ]}
      >
        <View style={styles.subCategoryHeader}>
          <View style={[styles.subCategoryDot, { backgroundColor: deptColor }]} />
          <View style={styles.subCategoryInfo}>
            <View style={styles.subCategoryTitleRow}>
              <Text style={[styles.subCategoryCode, { color: colors.textSecondary }]}>
                {subCategory.code}
              </Text>
              {!subCategory.isActive && (
                <View style={[styles.inactiveBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={styles.inactiveBadgeText}>Inactive</Text>
                </View>
              )}
            </View>
            <Text style={[styles.subCategoryName, { color: colors.text }]}>
              {subCategory.name}
            </Text>
            <Text style={[styles.subCategoryDescription, { color: colors.textTertiary }]} numberOfLines={2}>
              {subCategory.description}
            </Text>
          </View>
        </View>
        
        <View style={styles.subCategoryActions}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: `${deptColor}15` }]}
            onPress={() => handleEditSubCategory(subCategory)}
          >
            <Edit3 size={14} color={deptColor} />
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
            onPress={() => handleDeleteSubCategory(subCategory)}
          >
            <Trash2 size={14} color="#EF4444" />
          </Pressable>
        </View>
      </View>
    );
  }, [colors, handleEditSubCategory, handleDeleteSubCategory]);

  const renderDepartmentSection = useCallback((dept: typeof departments[0]) => {
    const isExpanded = expandedDepartments.has(dept.code);
    const subCategories = getFilteredSubCategories(dept.code);
    const summary = getSubCategorySummary(dept.code);
    
    return (
      <View key={dept.code} style={styles.departmentSection}>
        <Pressable
          style={[
            styles.departmentHeader,
            { 
              backgroundColor: colors.surface, 
              borderColor: isExpanded ? dept.color : colors.border,
              borderWidth: isExpanded ? 2 : 1,
            },
          ]}
          onPress={() => toggleDepartment(dept.code)}
        >
          <View style={[styles.departmentIcon, { backgroundColor: `${dept.color}15` }]}>
            <Building2 size={20} color={dept.color} />
          </View>
          
          <View style={styles.departmentInfo}>
            <View style={styles.departmentTitleRow}>
              <Text style={[styles.departmentCode, { color: dept.color }]}>
                {dept.code}
              </Text>
              <Text style={[styles.departmentName, { color: colors.text }]}>
                {dept.name}
              </Text>
            </View>
            <View style={styles.departmentStats}>
              <View style={[styles.statBadge, { backgroundColor: `${dept.color}15` }]}>
                <LayoutGrid size={10} color={dept.color} />
                <Text style={[styles.statBadgeText, { color: dept.color }]}>
                  {summary.active} active
                </Text>
              </View>
              {summary.inactive > 0 && (
                <View style={[styles.statBadge, { backgroundColor: '#F3F4F6' }]}>
                  <Text style={[styles.statBadgeText, { color: '#6B7280' }]}>
                    {summary.inactive} inactive
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.expandIconContainer}>
            {isExpanded ? (
              <ChevronDown size={20} color={colors.textSecondary} />
            ) : (
              <ChevronRight size={20} color={colors.textSecondary} />
            )}
          </View>
        </Pressable>
        
        {isExpanded && (
          <View style={[styles.subCategoriesContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.subCategoriesHeader}>
              <Text style={[styles.subCategoriesTitle, { color: colors.textSecondary }]}>
                Sub-Categories ({subCategories.length})
              </Text>
              <Pressable
                style={[styles.addButton, { backgroundColor: dept.color }]}
                onPress={() => handleAddSubCategory(dept.code)}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>
            
            {subCategories.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <FolderTree size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyStateText, { color: colors.textTertiary }]}>
                  No sub-categories found
                </Text>
              </View>
            ) : (
              subCategories.map(sc => renderSubCategoryCard(sc, dept.color))
            )}
          </View>
        )}
      </View>
    );
  }, [
    colors, 
    expandedDepartments, 
    toggleDepartment, 
    getFilteredSubCategories, 
    handleAddSubCategory, 
    renderSubCategoryCard
  ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Department Sub-Categories',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.backgroundSecondary }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search sub-categories..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
        
        <Pressable
          style={[
            styles.filterButton,
            { 
              backgroundColor: selectedDepartment || showInactive 
                ? colors.primary 
                : colors.backgroundSecondary 
            },
          ]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Filter 
            size={18} 
            color={selectedDepartment || showInactive ? '#FFFFFF' : colors.textSecondary} 
          />
        </Pressable>
      </View>
      
      <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsItem}>
          <Text style={[styles.statsValue, { color: colors.primary }]}>{totalStats.total}</Text>
          <Text style={[styles.statsLabel, { color: colors.textTertiary }]}>Total</Text>
        </View>
        <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statsItem}>
          <Text style={[styles.statsValue, { color: '#10B981' }]}>{totalStats.active}</Text>
          <Text style={[styles.statsLabel, { color: colors.textTertiary }]}>Active</Text>
        </View>
        <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statsItem}>
          <Text style={[styles.statsValue, { color: '#9CA3AF' }]}>{totalStats.inactive}</Text>
          <Text style={[styles.statsLabel, { color: colors.textTertiary }]}>Inactive</Text>
        </View>
        <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statsItem}>
          <Text style={[styles.statsValue, { color: '#F59E0B' }]}>{departments.length}</Text>
          <Text style={[styles.statsLabel, { color: colors.textTertiary }]}>Depts</Text>
        </View>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredDepartments.map(renderDepartmentSection)}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.filterModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filters</Text>
              <Pressable onPress={() => setFilterModalVisible(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>
                Department
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable
                  style={[
                    styles.filterChip,
                    { 
                      backgroundColor: !selectedDepartment ? colors.primary : colors.backgroundSecondary,
                      borderColor: !selectedDepartment ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedDepartment(null)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: !selectedDepartment ? '#FFFFFF' : colors.text },
                  ]}>
                    All
                  </Text>
                </Pressable>
                {departments.map(dept => (
                  <Pressable
                    key={dept.code}
                    style={[
                      styles.filterChip,
                      { 
                        backgroundColor: selectedDepartment === dept.code ? dept.color : colors.backgroundSecondary,
                        borderColor: selectedDepartment === dept.code ? dept.color : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedDepartment(dept.code)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: selectedDepartment === dept.code ? '#FFFFFF' : colors.text },
                    ]}>
                      {dept.shortName}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>
                Status
              </Text>
              <Pressable
                style={[
                  styles.toggleRow,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
                onPress={() => setShowInactive(!showInactive)}
              >
                {showInactive ? (
                  <Eye size={18} color={colors.primary} />
                ) : (
                  <EyeOff size={18} color={colors.textSecondary} />
                )}
                <Text style={[styles.toggleText, { color: colors.text }]}>
                  Show inactive sub-categories
                </Text>
                <View style={[
                  styles.toggleSwitch,
                  { backgroundColor: showInactive ? colors.primary : colors.border },
                ]}>
                  <View style={[
                    styles.toggleKnob,
                    { transform: [{ translateX: showInactive ? 16 : 0 }] },
                  ]} />
                </View>
              </Pressable>
            </View>
            
            <Pressable
              style={[styles.clearFiltersButton, { borderColor: colors.border }]}
              onPress={() => {
                setSelectedDepartment(null);
                setShowInactive(false);
                setFilterModalVisible(false);
              }}
            >
              <Text style={[styles.clearFiltersText, { color: colors.textSecondary }]}>
                Clear All Filters
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingSubCategory?.id ? 'Edit Sub-Category' : 'Add Sub-Category'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            
            {editingSubCategory && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Department</Text>
                  <View style={[styles.formValue, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.formValueText, { color: colors.text }]}>
                      {INVENTORY_DEPARTMENTS[editingSubCategory.departmentCode]?.name || 'Unknown'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Code</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    value={editingSubCategory.code}
                    onChangeText={(text) => setEditingSubCategory({ ...editingSubCategory, code: text })}
                    placeholder="e.g., 3-01"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Name *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    value={editingSubCategory.name}
                    onChangeText={(text) => setEditingSubCategory({ ...editingSubCategory, name: text })}
                    placeholder="Sub-category name"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Description</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextarea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    value={editingSubCategory.description}
                    onChangeText={(text) => setEditingSubCategory({ ...editingSubCategory, description: text })}
                    placeholder="Brief description of items in this sub-category"
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Sort Order</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    value={editingSubCategory.sortOrder.toString()}
                    onChangeText={(text) => setEditingSubCategory({ ...editingSubCategory, sortOrder: parseInt(text) || 0 })}
                    placeholder="1"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="number-pad"
                  />
                </View>
                
                <Pressable
                  style={[
                    styles.toggleRow,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                  ]}
                  onPress={() => setEditingSubCategory({ 
                    ...editingSubCategory, 
                    isActive: !editingSubCategory.isActive 
                  })}
                >
                  <Package size={18} color={editingSubCategory.isActive ? '#10B981' : colors.textTertiary} />
                  <Text style={[styles.toggleText, { color: colors.text }]}>
                    Active
                  </Text>
                  <View style={[
                    styles.toggleSwitch,
                    { backgroundColor: editingSubCategory.isActive ? '#10B981' : colors.border },
                  ]}>
                    <View style={[
                      styles.toggleKnob,
                      { transform: [{ translateX: editingSubCategory.isActive ? 16 : 0 }] },
                    ]} />
                  </View>
                </Pressable>
              </ScrollView>
            )}
            
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveSubCategory}
              >
                <Check size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
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
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  statsItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    height: 30,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  departmentSection: {
    marginBottom: 12,
  },
  departmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  departmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  departmentInfo: {
    flex: 1,
  },
  departmentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  departmentCode: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  departmentName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  departmentStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  expandIconContainer: {
    padding: 4,
  },
  subCategoriesContainer: {
    marginTop: 4,
    borderRadius: 12,
    padding: 10,
  },
  subCategoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subCategoriesTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  subCategoryCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  subCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  subCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  subCategoryInfo: {
    flex: 1,
  },
  subCategoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  subCategoryCode: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  inactiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  subCategoryName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  subCategoryDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  subCategoryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 10,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  formValue: {
    padding: 12,
    borderRadius: 8,
  },
  formValueText: {
    fontSize: 14,
  },
  formInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  formTextarea: {
    minHeight: 80,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  toggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  toggleSwitch: {
    width: 40,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  filterModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  filterSection: {
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 10,
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
  clearFiltersButton: {
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
