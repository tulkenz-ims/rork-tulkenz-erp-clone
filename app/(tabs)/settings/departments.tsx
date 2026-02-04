import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Building2,
  ChevronLeft,
  Plus,
  Settings2,
  Hash,
  Layers,
  CreditCard,
  X,
  Trash2,
  Check,
  ChevronDown,
  Palette,
  AlertCircle,
  Package,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  useDepartments, 
  useCreateDepartment, 
  useUpdateDepartment, 
  useDeleteDepartment 
} from '@/hooks/useDepartments';
import { useFacilities } from '@/hooks/useFacilities';
import { CODE_FORMATS, BASE_DEPARTMENTS } from '@/constants/departments';
import type { DepartmentWithFacility } from '@/types/department';
import type { Facility } from '@/types/facility';

const DEPARTMENT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#6B7280', '#F97316',
  '#14B8A6', '#A855F7', '#F43F5E', '#0EA5E9', '#22C55E',
];

interface DepartmentFormData {
  name: string;
  department_code: string;
  description: string;
  facility_id: string | null;
  gl_account: string;
  gl_code_prefix: string;
  cost_center: string;
  inventory_department_code: number | null;
  base_department_code: number | null;
  color: string;
  is_production: boolean;
  is_support: boolean;
  status: 'active' | 'inactive' | 'archived';
}

const initialFormData: DepartmentFormData = {
  name: '',
  department_code: '',
  description: '',
  facility_id: null,
  gl_account: '',
  gl_code_prefix: '',
  cost_center: '',
  inventory_department_code: null,
  base_department_code: null,
  color: '#3B82F6',
  is_production: false,
  is_support: false,
  status: 'active',
};

export default function DepartmentsSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const { data: departments = [], isLoading, refetch } = useDepartments();
  const { data: facilities = [] } = useFacilities();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [showFormModal, setShowFormModal] = useState(false);
  const [showFacilityPicker, setShowFacilityPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBaseCodePicker, setShowBaseCodePicker] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentWithFacility | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  const activeDepartments = departments.filter(d => d.status === 'active');
  const inactiveDepartments = departments.filter(d => d.status !== 'active');

  const selectedFacility = facilities.find(f => f.id === formData.facility_id);

  const generateDepartmentCode = useCallback((facilityNumber: number | null, baseCode: number | null) => {
    if (baseCode === null) return '';
    if (facilityNumber && facilityNumber > 0) {
      return `${facilityNumber}${String(baseCode).padStart(3, '0')}`;
    }
    return String(baseCode).padStart(4, '0');
  }, []);

  useEffect(() => {
    if (formData.base_department_code !== null) {
      const facilityNumber = selectedFacility?.facility_number || null;
      const code = generateDepartmentCode(facilityNumber, formData.base_department_code);
      setFormData(prev => ({ ...prev, department_code: code }));
    }
  }, [formData.base_department_code, selectedFacility, generateDepartmentCode]);

  const handleOpenCreate = () => {
    setEditingDepartment(null);
    setFormData(initialFormData);
    setShowFormModal(true);
  };

  const handleOpenEdit = (dept: DepartmentWithFacility) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      department_code: dept.department_code,
      description: dept.description || '',
      facility_id: dept.facility_id,
      gl_account: dept.gl_account || '',
      gl_code_prefix: dept.gl_code_prefix || '',
      cost_center: dept.cost_center || '',
      inventory_department_code: dept.inventory_department_code,
      base_department_code: dept.base_department_code,
      color: dept.color || '#3B82F6',
      is_production: dept.is_production || false,
      is_support: dept.is_support || false,
      status: dept.status,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Department name is required');
      return;
    }
    if (!formData.department_code.trim()) {
      Alert.alert('Error', 'Department code is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingDepartment) {
        await updateDepartment.mutateAsync({
          id: editingDepartment.id,
          name: formData.name.trim(),
          department_code: formData.department_code.trim(),
          description: formData.description.trim() || null,
          facility_id: formData.facility_id,
          gl_account: formData.gl_account.trim() || null,
          gl_code_prefix: formData.gl_code_prefix.trim() || null,
          cost_center: formData.cost_center.trim() || null,
          inventory_department_code: formData.inventory_department_code,
          base_department_code: formData.base_department_code,
          color: formData.color,
          is_production: formData.is_production,
          is_support: formData.is_support,
          status: formData.status,
        });
        console.log('[Departments] Updated department:', editingDepartment.id);
      } else {
        await createDepartment.mutateAsync({
          name: formData.name.trim(),
          department_code: formData.department_code.trim(),
          description: formData.description.trim() || undefined,
          facility_id: formData.facility_id,
          gl_account: formData.gl_account.trim() || undefined,
          gl_code_prefix: formData.gl_code_prefix.trim() || undefined,
          cost_center: formData.cost_center.trim() || undefined,
          inventory_department_code: formData.inventory_department_code,
          base_department_code: formData.base_department_code,
          color: formData.color,
          is_production: formData.is_production,
          is_support: formData.is_support,
          status: formData.status,
        });
        console.log('[Departments] Created new department');
      }
      setShowFormModal(false);
      refetch();
    } catch (error: any) {
      console.error('[Departments] Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save department');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (dept: DepartmentWithFacility) => {
    Alert.alert(
      'Delete Department',
      `Are you sure you want to delete "${dept.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDepartment.mutateAsync(dept.id);
              console.log('[Departments] Deleted department:', dept.id);
              refetch();
            } catch (error: any) {
              console.error('[Departments] Delete error:', error);
              Alert.alert('Error', error.message || 'Failed to delete department');
            }
          },
        },
      ]
    );
  };

  const handleSelectFacility = (facility: Facility | null) => {
    setFormData(prev => ({ ...prev, facility_id: facility?.id || null }));
    setShowFacilityPicker(false);
  };

  const handleSelectBaseCode = (baseCode: number, template: typeof BASE_DEPARTMENTS[0]) => {
    setFormData(prev => ({
      ...prev,
      base_department_code: baseCode,
      inventory_department_code: template.inventoryCode,
      gl_code_prefix: template.glCodePrefix,
      name: prev.name || template.name,
      color: prev.color === '#3B82F6' ? template.color : prev.color,
    }));
    setShowBaseCodePicker(false);
  };

  const renderDepartmentItem = (dept: DepartmentWithFacility, index: number, total: number) => (
    <Pressable
      key={dept.id}
      style={[
        styles.departmentItem,
        index < total - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
      onPress={() => handleOpenEdit(dept)}
    >
      <View style={[styles.departmentColor, { backgroundColor: dept.color }]} />
      <View style={styles.departmentInfo}>
        <View style={styles.departmentHeader}>
          <Text style={[styles.departmentName, { color: colors.text }]}>{dept.name}</Text>
          {dept.status !== 'active' && (
            <View style={[styles.statusBadge, { backgroundColor: colors.warningBg }]}>
              <Text style={[styles.statusText, { color: colors.warning }]}>{dept.status}</Text>
            </View>
          )}
        </View>
        {dept.facility && (
          <Text style={[styles.facilityLabel, { color: colors.textTertiary }]}>
            {dept.facility.name}
          </Text>
        )}
        <View style={styles.departmentCodes}>
          <View style={[styles.codeChip, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.codeChipLabel, { color: colors.textTertiary }]}>Dept</Text>
            <Text style={[styles.codeChipValue, { color: colors.text }]}>{dept.department_code}</Text>
          </View>
          {dept.gl_code_prefix && (
            <View style={[styles.codeChip, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.codeChipLabel, { color: colors.textTertiary }]}>GL</Text>
              <Text style={[styles.codeChipValue, { color: colors.text }]}>{dept.gl_code_prefix}</Text>
            </View>
          )}
          {dept.inventory_department_code !== null && dept.inventory_department_code > 0 && (
            <View style={[styles.codeChip, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.codeChipLabel, { color: colors.textTertiary }]}>Inv</Text>
              <Text style={[styles.codeChipValue, { color: colors.text }]}>{dept.inventory_department_code}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.itemActions}>
        <Pressable
          style={[styles.deleteButton, { backgroundColor: colors.errorBg }]}
          onPress={(e) => {
            e.stopPropagation();
            handleDelete(dept);
          }}
        >
          <Trash2 size={16} color={colors.error} />
        </Pressable>
        <Settings2 size={18} color={colors.textTertiary} />
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Departments',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Code Formats</Text>
          <View style={[styles.formatsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.formatRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.formatIcon, { backgroundColor: colors.infoBg }]}>
                <Hash size={18} color={colors.primary} />
              </View>
              <View style={styles.formatContent}>
                <Text style={[styles.formatLabel, { color: colors.text }]}>Department Code</Text>
                <Text style={[styles.formatDescription, { color: colors.textSecondary }]}>
                  [Facility#][3-digit base] (e.g., 1001 = Facility 1, Dept 001)
                </Text>
              </View>
            </View>
            <View style={[styles.formatRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.formatIcon, { backgroundColor: colors.successBg }]}>
                <CreditCard size={18} color={colors.success} />
              </View>
              <View style={styles.formatContent}>
                <Text style={[styles.formatLabel, { color: colors.text }]}>GL Code Prefix</Text>
                <Text style={[styles.formatDescription, { color: colors.textSecondary }]}>
                  {CODE_FORMATS.glCode.length} digits (e.g., {CODE_FORMATS.glCode.example})
                </Text>
              </View>
            </View>
            <View style={styles.formatRow}>
              <View style={[styles.formatIcon, { backgroundColor: colors.warningBg }]}>
                <Package size={18} color={colors.warning} />
              </View>
              <View style={styles.formatContent}>
                <Text style={[styles.formatLabel, { color: colors.text }]}>Inventory Code</Text>
                <Text style={[styles.formatDescription, { color: colors.textSecondary }]}>
                  First digit of 7-digit material# (e.g., 1XXXXXX, 2XXXXXX)
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Active Departments ({activeDepartments.length})
            </Text>
            <Pressable 
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleOpenCreate}
            >
              <Plus size={16} color="#FFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={[styles.loadingContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading departments...</Text>
            </View>
          ) : activeDepartments.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Layers size={32} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No departments configured</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Add departments to enable work orders, inventory, and more
              </Text>
            </View>
          ) : (
            <View style={[styles.departmentsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {activeDepartments.map((dept, index) => 
                renderDepartmentItem(dept, index, activeDepartments.length)
              )}
            </View>
          )}
        </View>

        {inactiveDepartments.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Inactive Departments ({inactiveDepartments.length})
            </Text>
            <View style={[styles.departmentsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {inactiveDepartments.map((dept, index) => 
                renderDepartmentItem(dept, index, inactiveDepartments.length)
              )}
            </View>
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
          <Building2 size={20} color={colors.info} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.info }]}>Department Codes Reference</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              • Department Code: Facility# + Base code (e.g., 1001){'\n'}
              • GL Code Prefix: 4-digit G/L account prefix{'\n'}
              • Inventory Code: 1st digit of material numbers (1-9)
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showFormModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFormModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowFormModal(false)} style={styles.modalCloseButton}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingDepartment ? 'Edit Department' : 'New Department'}
            </Text>
            <Pressable 
              onPress={handleSave} 
              style={[styles.modalSaveButton, { backgroundColor: colors.primary }]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Check size={18} color="#FFF" />
                  <Text style={styles.modalSaveText}>Save</Text>
                </>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Basic Information</Text>
              
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Department Name *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Maintenance"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Department description..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Facility (Optional)</Text>
                <Pressable
                  style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowFacilityPicker(true)}
                >
                  <Building2 size={18} color={colors.textSecondary} />
                  <Text style={[styles.pickerButtonText, { color: selectedFacility ? colors.text : colors.textTertiary }]}>
                    {selectedFacility ? `${selectedFacility.name} (F${selectedFacility.facility_number})` : 'Select facility...'}
                  </Text>
                  <ChevronDown size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Codes & Numbers</Text>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Base Department Template</Text>
                <Pressable
                  style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowBaseCodePicker(true)}
                >
                  <Layers size={18} color={colors.textSecondary} />
                  <Text style={[styles.pickerButtonText, { color: formData.base_department_code !== null ? colors.text : colors.textTertiary }]}>
                    {formData.base_department_code !== null 
                      ? BASE_DEPARTMENTS.find(b => b.baseCode === formData.base_department_code)?.name || `Code ${formData.base_department_code}`
                      : 'Select template or enter manually...'
                    }
                  </Text>
                  <ChevronDown size={18} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Department Code *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={formData.department_code}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, department_code: text }))}
                    placeholder="e.g., 1001"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>GL Prefix</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={formData.gl_code_prefix}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, gl_code_prefix: text }))}
                    placeholder="e.g., 5000"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Inventory Code (1-9)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={formData.inventory_department_code?.toString() || ''}
                    onChangeText={(text) => {
                      const num = parseInt(text, 10);
                      setFormData(prev => ({ 
                        ...prev, 
                        inventory_department_code: isNaN(num) ? null : Math.min(9, Math.max(0, num))
                      }));
                    }}
                    placeholder="e.g., 1"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Cost Center</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={formData.cost_center}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, cost_center: text }))}
                    placeholder="e.g., CC-MAINT"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              <View style={[styles.helpBox, { backgroundColor: colors.infoBg }]}>
                <AlertCircle size={16} color={colors.info} />
                <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                  Inventory code is the first digit of material numbers (e.g., 3XXXXXX for code 3)
                </Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Display & Settings</Text>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Color</Text>
                <Pressable
                  style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowColorPicker(true)}
                >
                  <View style={[styles.colorPreview, { backgroundColor: formData.color }]} />
                  <Text style={[styles.pickerButtonText, { color: colors.text }]}>{formData.color}</Text>
                  <ChevronDown size={18} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Production Department</Text>
                  <Text style={[styles.switchDescription, { color: colors.textTertiary }]}>
                    Involved in manufacturing/production
                  </Text>
                </View>
                <Switch
                  value={formData.is_production}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, is_production: value }))}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={formData.is_production ? colors.primary : colors.textTertiary}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Support Department</Text>
                  <Text style={[styles.switchDescription, { color: colors.textTertiary }]}>
                    Provides support services
                  </Text>
                </View>
                <Switch
                  value={formData.is_support}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, is_support: value }))}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={formData.is_support ? colors.primary : colors.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Status</Text>
                <View style={styles.statusOptions}>
                  {(['active', 'inactive', 'archived'] as const).map((status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.statusOption,
                        { borderColor: colors.border },
                        formData.status === status && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, status }))}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        { color: formData.status === status ? colors.primary : colors.textSecondary },
                      ]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showFacilityPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFacilityPicker(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setShowFacilityPicker(false)}>
          <View style={[styles.pickerContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Facility</Text>
            <Pressable
              style={[styles.pickerOption, { borderBottomColor: colors.border }]}
              onPress={() => handleSelectFacility(null)}
            >
              <Text style={[styles.pickerOptionText, { color: colors.textSecondary }]}>
                No facility (Organization-wide)
              </Text>
              {formData.facility_id === null && <Check size={18} color={colors.primary} />}
            </Pressable>
            {facilities.map((facility) => (
              <Pressable
                key={facility.id}
                style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectFacility(facility)}
              >
                <View>
                  <Text style={[styles.pickerOptionText, { color: colors.text }]}>{facility.name}</Text>
                  <Text style={[styles.pickerOptionSubtext, { color: colors.textTertiary }]}>
                    Facility #{facility.facility_number}
                  </Text>
                </View>
                {formData.facility_id === facility.id && <Check size={18} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showBaseCodePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBaseCodePicker(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setShowBaseCodePicker(false)}>
          <View style={[styles.pickerContent, styles.pickerContentLarge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Department Templates</Text>
            <ScrollView style={styles.pickerScroll}>
              {BASE_DEPARTMENTS.filter(b => b.isActive).map((template) => (
                <Pressable
                  key={template.id}
                  style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectBaseCode(template.baseCode, template)}
                >
                  <View style={styles.templateOption}>
                    <View style={[styles.templateColor, { backgroundColor: template.color }]} />
                    <View style={styles.templateInfo}>
                      <Text style={[styles.pickerOptionText, { color: colors.text }]}>{template.name}</Text>
                      <Text style={[styles.pickerOptionSubtext, { color: colors.textTertiary }]}>
                        Base: {template.baseCode} • GL: {template.glCodePrefix} • Inv: {template.inventoryCode}
                      </Text>
                    </View>
                  </View>
                  {formData.base_department_code === template.baseCode && <Check size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showColorPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setShowColorPicker(false)}>
          <View style={[styles.pickerContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Color</Text>
            <View style={styles.colorGrid}>
              {DEPARTMENT_COLORS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    formData.color === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, color }));
                    setShowColorPicker(false);
                  }}
                >
                  {formData.color === color && <Check size={18} color="#FFF" />}
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  formatsCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  formatIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatContent: {
    flex: 1,
  },
  formatLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  formatDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  departmentsList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  departmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  departmentColor: {
    width: 4,
    height: 48,
    borderRadius: 2,
  },
  departmentInfo: {
    flex: 1,
  },
  departmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  departmentName: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  facilityLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  departmentCodes: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  codeChipLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  codeChipValue: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  modalSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 15,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginTop: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  switchDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  pickerContentLarge: {
    maxHeight: '80%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  pickerScroll: {
    maxHeight: 400,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  pickerOptionSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  templateColor: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  templateInfo: {
    flex: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
});
