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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Building2,
  Plus,
  X,
  Edit2,
  Trash2,
  Power,
  AlertCircle,
  Search,
  ChevronDown,
  Users,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Hash,
  Layers,
  CreditCard,
  Filter,
  CheckCircle,
  Factory,
  Wrench,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useToggleDepartmentStatus,
  useNextDepartmentCode,
} from '@/hooks/useDepartments';
import { useFacilities } from '@/hooks/useFacilities';
import type { Department, DepartmentFormData, DepartmentWithFacility } from '@/types/department';
import type { Facility } from '@/types/facility';

const DEPARTMENT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7', '#6B7280', '#1D4ED8', '#047857',
];

interface DepartmentModalProps {
  visible: boolean;
  onClose: () => void;
  department?: DepartmentWithFacility | null;
  facilities: Facility[];
  nextCode: string;
}

function DepartmentModal({ visible, onClose, department, facilities, nextCode }: DepartmentModalProps) {
  const { colors } = useTheme();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const isEditing = !!department;

  const [formData, setFormData] = useState<DepartmentFormData>({
    name: department?.name || '',
    department_code: department?.department_code || nextCode,
    description: department?.description || '',
    facility_id: department?.facility_id || null,
    gl_account: department?.gl_account || '',
    cost_center: department?.cost_center || '',
    profit_center: department?.profit_center || '',
    phone: department?.phone || '',
    email: department?.email || '',
    status: department?.status || 'active',
    is_production: department?.is_production ?? false,
    is_support: department?.is_support ?? false,
    shift_required: department?.shift_required ?? false,
    annual_budget: department?.annual_budget || null,
    labor_budget: department?.labor_budget || null,
    materials_budget: department?.materials_budget || null,
    budgeted_headcount: department?.budgeted_headcount || null,
    color: department?.color || '#3B82F6',
    notes: department?.notes || '',
    base_department_code: department?.base_department_code || null,
    inventory_department_code: department?.inventory_department_code || null,
    gl_code_prefix: department?.gl_code_prefix || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showFacilityPicker, setShowFacilityPicker] = useState(false);

  const selectedFacility = useMemo(() => {
    return facilities.find(f => f.id === formData.facility_id);
  }, [facilities, formData.facility_id]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Department name is required';
    }
    
    if (!formData.department_code.trim()) {
      newErrors.department_code = 'Department code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    try {
      if (isEditing && department) {
        await updateDepartment.mutateAsync({
          id: department.id,
          ...formData,
        });
      } else {
        await createDepartment.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      console.error('[DepartmentModal] Error saving department:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save department');
    }
  }, [validate, isEditing, department, formData, updateDepartment, createDepartment, onClose]);

  const isLoading = createDepartment.isPending || updateDepartment.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isEditing ? 'Edit Department' : 'Add Department'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Department Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: errors.name ? colors.error : colors.border, color: colors.text },
                ]}
                value={formData.name}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                placeholder="e.g., Maintenance"
                placeholderTextColor={colors.textTertiary}
              />
              {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Department Code *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, borderColor: errors.department_code ? colors.error : colors.border, color: colors.text },
                  ]}
                  value={formData.department_code}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, department_code: text }))}
                  placeholder="e.g., 1001"
                  placeholderTextColor={colors.textTertiary}
                />
                {errors.department_code && <Text style={[styles.errorText, { color: colors.error }]}>{errors.department_code}</Text>}
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Inventory Code (1-9)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.inventory_department_code?.toString() || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, inventory_department_code: parseInt(text) || null }))}
                  placeholder="e.g., 1"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={1}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Facility</Text>
              <Pressable
                style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowFacilityPicker(!showFacilityPicker)}
              >
                <MapPin size={18} color={colors.textSecondary} />
                <Text style={[styles.pickerText, { color: selectedFacility ? colors.text : colors.textTertiary }]}>
                  {selectedFacility?.name || 'Select Facility (Optional)'}
                </Text>
                <ChevronDown size={18} color={colors.textSecondary} />
              </Pressable>
              {showFacilityPicker && (
                <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Pressable
                    style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, facility_id: null }));
                      setShowFacilityPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: colors.textSecondary }]}>No Facility (Company-wide)</Text>
                  </Pressable>
                  {facilities.map((facility) => (
                    <Pressable
                      key={facility.id}
                      style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, facility_id: facility.id }));
                        setShowFacilityPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, { color: colors.text }]}>{facility.name}</Text>
                      <Text style={[styles.pickerOptionSub, { color: colors.textTertiary }]}>{facility.facility_code}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={formData.description || ''}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                placeholder="Department description..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Financial Information</Text>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>GL Account</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.gl_account || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, gl_account: text }))}
                  placeholder="e.g., 5000-100"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Cost Center</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.cost_center || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, cost_center: text }))}
                  placeholder="e.g., CC-1001"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>GL Code Prefix</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.gl_code_prefix || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, gl_code_prefix: text }))}
                  placeholder="e.g., 5000"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={4}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Profit Center</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.profit_center || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, profit_center: text }))}
                  placeholder="e.g., PC-1001"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Budget & Headcount</Text>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Annual Budget</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.annual_budget?.toString() || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, annual_budget: parseFloat(text) || null }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Budgeted Headcount</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.budgeted_headcount?.toString() || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, budgeted_headcount: parseInt(text) || null }))}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Labor Budget</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.labor_budget?.toString() || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, labor_budget: parseFloat(text) || null }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Materials Budget</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.materials_budget?.toString() || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, materials_budget: parseFloat(text) || null }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Contact Information</Text>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.phone || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: text }))}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.email || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
                  placeholder="dept@company.com"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Department Type</Text>

            <View style={styles.togglesRow}>
              <Pressable
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: formData.is_production ? colors.primary + '20' : colors.surface,
                    borderColor: formData.is_production ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFormData((prev) => ({ ...prev, is_production: !prev.is_production }))}
              >
                <Factory size={16} color={formData.is_production ? colors.primary : colors.textSecondary} />
                <Text style={[styles.toggleChipText, { color: formData.is_production ? colors.primary : colors.text }]}>
                  Production
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: formData.is_support ? colors.info + '20' : colors.surface,
                    borderColor: formData.is_support ? colors.info : colors.border,
                  },
                ]}
                onPress={() => setFormData((prev) => ({ ...prev, is_support: !prev.is_support }))}
              >
                <Wrench size={16} color={formData.is_support ? colors.info : colors.textSecondary} />
                <Text style={[styles.toggleChipText, { color: formData.is_support ? colors.info : colors.text }]}>
                  Support
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: formData.shift_required ? colors.warning + '20' : colors.surface,
                    borderColor: formData.shift_required ? colors.warning : colors.border,
                  },
                ]}
                onPress={() => setFormData((prev) => ({ ...prev, shift_required: !prev.shift_required }))}
              >
                <Users size={16} color={formData.shift_required ? colors.warning : colors.textSecondary} />
                <Text style={[styles.toggleChipText, { color: formData.shift_required ? colors.warning : colors.text }]}>
                  Shift Required
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Department Color</Text>

            <View style={styles.colorGrid}>
              {DEPARTMENT_COLORS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    formData.color === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setFormData((prev) => ({ ...prev, color }))}
                >
                  {formData.color === color && <CheckCircle size={16} color="#fff" />}
                </Pressable>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={formData.notes || ''}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, notes: text }))}
                placeholder="Additional notes..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>{isEditing ? 'Update' : 'Create'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function DepartmentsScreen() {
  const { colors } = useTheme();
  const { data: departments, isLoading, refetch, isRefetching } = useDepartments();
  const { data: facilities = [] } = useFacilities();
  const { data: nextCode = '0001' } = useNextDepartmentCode(null);
  const deleteDepartment = useDeleteDepartment();
  const toggleStatus = useToggleDepartmentStatus();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentWithFacility | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredDepartments = useMemo(() => {
    if (!departments) return [];
    
    return departments.filter((dept) => {
      const matchesSearch = !searchQuery || 
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.department_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.gl_account?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.cost_center?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || dept.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [departments, searchQuery, statusFilter]);

  const handleAddDepartment = useCallback(() => {
    setSelectedDepartment(null);
    setModalVisible(true);
  }, []);

  const handleEditDepartment = useCallback((department: DepartmentWithFacility) => {
    setSelectedDepartment(department);
    setModalVisible(true);
  }, []);

  const handleDeleteDepartment = useCallback((department: DepartmentWithFacility) => {
    Alert.alert(
      'Delete Department',
      `Are you sure you want to delete "${department.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDepartment.mutateAsync(department.id);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete department');
            }
          },
        },
      ]
    );
  }, [deleteDepartment]);

  const handleToggleStatus = useCallback(async (department: DepartmentWithFacility) => {
    try {
      const newStatus = department.status === 'active' ? 'inactive' : 'active';
      await toggleStatus.mutateAsync({ id: department.id, status: newStatus });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update department status');
    }
  }, [toggleStatus]);

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const activeCount = departments?.filter(d => d.status === 'active').length || 0;
  const totalBudget = departments?.reduce((sum, d) => sum + (d.annual_budget || 0), 0) || 0;
  const totalHeadcount = departments?.reduce((sum, d) => sum + (d.budgeted_headcount || 0), 0) || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Departments',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primary + '15' }]}>
            <Building2 size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{activeCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success + '15' }]}>
            <DollarSign size={20} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(totalBudget)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Budget</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.info + '15' }]}>
            <Users size={20} color={colors.info} />
            <Text style={[styles.statValue, { color: colors.text }]}>{totalHeadcount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Headcount</Text>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search departments..."
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterChips}>
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: statusFilter === status ? colors.primary : colors.surface,
                    borderColor: statusFilter === status ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: statusFilter === status ? '#fff' : colors.text },
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleAddDepartment}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading departments...</Text>
          </View>
        ) : filteredDepartments.length > 0 ? (
          filteredDepartments.map((department) => (
            <Pressable
              key={department.id}
              style={[
                styles.departmentItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: department.status === 'active' ? colors.border : colors.textTertiary,
                  opacity: department.status === 'active' ? 1 : 0.7,
                },
              ]}
              onPress={() => handleEditDepartment(department)}
            >
              <View style={[styles.departmentColor, { backgroundColor: department.color }]} />
              <View style={styles.departmentContent}>
                <View style={styles.departmentHeader}>
                  <Text style={[styles.departmentName, { color: colors.text }]}>{department.name}</Text>
                  <View style={[styles.codeBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.codeText, { color: colors.primary }]}>{department.department_code}</Text>
                  </View>
                </View>
                
                {department.facility && (
                  <View style={styles.facilityTag}>
                    <MapPin size={12} color={colors.textTertiary} />
                    <Text style={[styles.facilityTagText, { color: colors.textTertiary }]}>
                      {department.facility.name}
                    </Text>
                  </View>
                )}

                <View style={styles.departmentMeta}>
                  {department.gl_account && (
                    <View style={[styles.metaChip, { backgroundColor: colors.backgroundSecondary }]}>
                      <CreditCard size={10} color={colors.textTertiary} />
                      <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>
                        GL: {department.gl_account}
                      </Text>
                    </View>
                  )}
                  {department.cost_center && (
                    <View style={[styles.metaChip, { backgroundColor: colors.backgroundSecondary }]}>
                      <Hash size={10} color={colors.textTertiary} />
                      <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>
                        CC: {department.cost_center}
                      </Text>
                    </View>
                  )}
                  {department.inventory_department_code && (
                    <View style={[styles.metaChip, { backgroundColor: colors.backgroundSecondary }]}>
                      <Layers size={10} color={colors.textTertiary} />
                      <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>
                        Inv: {department.inventory_department_code}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.departmentStats}>
                  {department.budgeted_headcount !== null && (
                    <View style={styles.statItem}>
                      <Users size={12} color={colors.textTertiary} />
                      <Text style={[styles.statItemText, { color: colors.textSecondary }]}>
                        {department.actual_headcount}/{department.budgeted_headcount}
                      </Text>
                    </View>
                  )}
                  {department.annual_budget !== null && (
                    <View style={styles.statItem}>
                      <DollarSign size={12} color={colors.textTertiary} />
                      <Text style={[styles.statItemText, { color: colors.textSecondary }]}>
                        {formatCurrency(department.annual_budget)}
                      </Text>
                    </View>
                  )}
                  {department.is_production && (
                    <View style={[styles.typeTag, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.typeTagText, { color: colors.primary }]}>Production</Text>
                    </View>
                  )}
                  {department.is_support && (
                    <View style={[styles.typeTag, { backgroundColor: colors.info + '15' }]}>
                      <Text style={[styles.typeTagText, { color: colors.info }]}>Support</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.departmentActions}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => handleToggleStatus(department)}
                  hitSlop={8}
                >
                  <Power size={16} color={department.status === 'active' ? colors.success : colors.textTertiary} />
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => handleEditDepartment(department)}
                  hitSlop={8}
                >
                  <Edit2 size={16} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
                  onPress={() => handleDeleteDepartment(department)}
                  hitSlop={8}
                >
                  <Trash2 size={16} color={colors.error} />
                </Pressable>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Building2 size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Departments</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'No departments match your search.' : 'Create your first department to organize your workforce.'}
            </Text>
            {!searchQuery && (
              <Pressable
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={handleAddDepartment}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.emptyButtonText}>Add Department</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
          <Building2 size={20} color={colors.info} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.info }]}>Department Codes</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              • Department Code: 4-digit identifier (e.g., 1001){'\n'}
              • GL Code Prefix: Links to General Ledger accounts{'\n'}
              • Inventory Code: First digit of material numbers (1-9){'\n'}
              • Departments can be facility-specific or company-wide
            </Text>
          </View>
        </View>
      </ScrollView>

      <DepartmentModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedDepartment(null);
        }}
        department={selectedDepartment}
        facilities={facilities}
        nextCode={nextCode}
      />
    </SafeAreaView>
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
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  departmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  departmentColor: {
    width: 4,
    height: '100%',
    minHeight: 60,
    borderRadius: 2,
    marginRight: 12,
  },
  departmentContent: {
    flex: 1,
  },
  departmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  departmentName: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  facilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  facilityTagText: {
    fontSize: 12,
  },
  departmentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  metaChipText: {
    fontSize: 10,
  },
  departmentStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statItemText: {
    fontSize: 12,
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  departmentActions: {
    flexDirection: 'column',
    gap: 6,
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
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
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top' as const,
  },
  row: {
    flexDirection: 'row',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
  },
  pickerDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  pickerOptionText: {
    fontSize: 14,
  },
  pickerOptionSub: {
    fontSize: 12,
  },
  togglesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
