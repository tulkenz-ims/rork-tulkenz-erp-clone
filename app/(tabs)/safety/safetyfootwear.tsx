import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Footprints,
  Plus,
  Search,
  Filter,
  X,
  Calendar,
  User,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Edit,
  DollarSign,
  Package,
  ShieldCheck,
  Clock,
} from 'lucide-react-native';
import {
  useSafetyFootwearRecords,
  useFootwearTypes,
  useReplacementDueFootwear,
  useSafetyFootwearAllowances,
  useCreateSafetyFootwearRecord,
  useUpdateSafetyFootwearRecord,
  useDeleteSafetyFootwearRecord,
} from '@/hooks/useSafetyFootwear';
import { SafetyFootwearRecord, SafetyFootwearFormData } from '@/types/ppeManagement';

const SHOE_SIZES = ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14', '15'];
const SHOE_WIDTHS = ['N', 'M', 'W', 'XW', '2XW'];
const SAFETY_FEATURES = [
  'Steel Toe',
  'Composite Toe',
  'Metatarsal Guard',
  'Puncture Resistant',
  'Slip Resistant',
  'Oil Resistant',
  'EH Rated',
  'Waterproof',
  'Insulated',
  'Chemical Resistant',
];

const CONDITIONS: Array<{ value: SafetyFootwearFormData['condition']; label: string; color: string }> = [
  { value: 'new', label: 'New', color: '#10B981' },
  { value: 'good', label: 'Good', color: '#3B82F6' },
  { value: 'fair', label: 'Fair', color: '#F59E0B' },
  { value: 'worn', label: 'Worn', color: '#EF4444' },
  { value: 'replaced', label: 'Replaced', color: '#6B7280' },
];

export default function SafetyFootwearScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SafetyFootwearRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: footwearRecords, isLoading, refetch } = useSafetyFootwearRecords();
  const { data: footwearTypes } = useFootwearTypes();
  const { data: replacementDue } = useReplacementDueFootwear(30);
  const { data: allowances } = useSafetyFootwearAllowances();
  const createMutation = useCreateSafetyFootwearRecord();
  const updateMutation = useUpdateSafetyFootwearRecord();
  const deleteMutation = useDeleteSafetyFootwearRecord();

  const [formData, setFormData] = useState<SafetyFootwearFormData>({
    employee_name: '',
    department: '',
    issue_date: new Date().toISOString().split('T')[0],
    footwear_type: '',
    brand: '',
    model: '',
    size: '',
    width: 'M',
    safety_features: [],
    cost: undefined,
    condition: 'new',
    voucher_number: '',
    vendor: '',
    notes: '',
  });

  const resetForm = useCallback(() => {
    setFormData({
      employee_name: '',
      department: '',
      issue_date: new Date().toISOString().split('T')[0],
      footwear_type: '',
      brand: '',
      model: '',
      size: '',
      width: 'M',
      safety_features: [],
      cost: undefined,
      condition: 'new',
      voucher_number: '',
      vendor: '',
      notes: '',
    });
    setSelectedRecord(null);
  }, []);

  const handleOpenForm = useCallback((record?: SafetyFootwearRecord) => {
    if (record) {
      setSelectedRecord(record);
      setFormData({
        employee_name: record.employee_name,
        department: record.department || '',
        issue_date: record.issue_date,
        footwear_type: record.footwear_type,
        brand: record.brand || '',
        model: record.model || '',
        size: record.size,
        width: record.width || 'M',
        safety_features: record.safety_features || [],
        cost: record.cost || undefined,
        allowance_used: record.allowance_used || undefined,
        allowance_remaining: record.allowance_remaining || undefined,
        condition: record.condition,
        replacement_due_date: record.replacement_due_date || undefined,
        voucher_number: record.voucher_number || '',
        vendor: record.vendor || '',
        notes: record.notes || '',
      });
    } else {
      resetForm();
    }
    setShowFormModal(true);
  }, [resetForm]);

  const handleSubmit = useCallback(async () => {
    if (!formData.employee_name || !formData.footwear_type || !formData.size) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const replacementDate = formData.replacement_due_date || (() => {
      const date = new Date(formData.issue_date);
      date.setFullYear(date.getFullYear() + 1);
      return date.toISOString().split('T')[0];
    })();

    const submitData = {
      ...formData,
      replacement_due_date: replacementDate,
    };

    try {
      if (selectedRecord) {
        await updateMutation.mutateAsync({ id: selectedRecord.id, ...submitData });
        Alert.alert('Success', 'Footwear record updated successfully');
      } else {
        await createMutation.mutateAsync(submitData);
        Alert.alert('Success', 'Footwear record created successfully');
      }
      setShowFormModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving footwear record:', error);
      Alert.alert('Error', 'Failed to save footwear record');
    }
  }, [formData, selectedRecord, createMutation, updateMutation, resetForm]);

  const handleDelete = useCallback((record: SafetyFootwearRecord) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to delete the footwear record for ${record.employee_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(record.id);
              Alert.alert('Success', 'Footwear record deleted');
            } catch (error) {
              console.error('Error deleting footwear record:', error);
              Alert.alert('Error', 'Failed to delete footwear record');
            }
          },
        },
      ]
    );
  }, [deleteMutation]);

  const toggleSafetyFeature = (feature: string) => {
    const features = formData.safety_features || [];
    if (features.includes(feature)) {
      setFormData({ ...formData, safety_features: features.filter(f => f !== feature) });
    } else {
      setFormData({ ...formData, safety_features: [...features, feature] });
    }
  };

  const filteredRecords = footwearRecords?.filter((record) => {
    const matchesSearch =
      record.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.footwear_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterCondition === 'all' || record.condition === filterCondition;
    return matchesSearch && matchesFilter;
  }) || [];

  const getConditionColor = (condition: string) => {
    const found = CONDITIONS.find(c => c.value === condition);
    return found?.color || '#6B7280';
  };

  const isReplacementDueSoon = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const totalRecords = footwearRecords?.length || 0;
  const activeRecords = footwearRecords?.filter(r => r.condition !== 'replaced').length || 0;
  const replacementDueCount = replacementDue?.length || 0;
  const totalSpent = footwearRecords?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading footwear records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Footprints size={24} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Safety Footwear</Text>
            <Text style={styles.headerSubtitle}>Track and manage safety shoe issuance</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Package size={20} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{activeRecords}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Clock size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{replacementDueCount}</Text>
            <Text style={styles.statLabel}>Due Soon</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <DollarSign size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>${totalSpent.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>

        <View style={styles.searchFilterRow}>
          <View style={styles.searchContainer}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, type..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleOpenForm()}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.addButtonText}>Issue Footwear</Text>
        </TouchableOpacity>

        {replacementDue && replacementDue.length > 0 && (
          <View style={styles.alertSection}>
            <View style={styles.alertHeader}>
              <AlertTriangle size={18} color="#F59E0B" />
              <Text style={styles.alertTitle}>Replacement Due</Text>
            </View>
            {replacementDue.slice(0, 3).map((record) => (
              <TouchableOpacity
                key={record.id}
                style={styles.alertItem}
                onPress={() => {
                  setSelectedRecord(record);
                  setShowDetailModal(true);
                }}
              >
                <Text style={styles.alertItemText}>{record.employee_name}</Text>
                <Text style={styles.alertItemDate}>Due: {record.replacement_due_date}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Footwear Records ({filteredRecords.length})</Text>
          {filteredRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Footprints size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No footwear records found</Text>
              <Text style={styles.emptySubtext}>Issue new footwear to get started</Text>
            </View>
          ) : (
            filteredRecords.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={styles.recordCard}
                onPress={() => {
                  setSelectedRecord(record);
                  setShowDetailModal(true);
                }}
              >
                <View style={styles.recordCardHeader}>
                  <View style={styles.recordCardLeft}>
                    <View style={styles.employeeInfo}>
                      <User size={16} color="#6B7280" />
                      <Text style={styles.employeeName}>{record.employee_name}</Text>
                    </View>
                    {record.department && (
                      <Text style={styles.departmentText}>{record.department}</Text>
                    )}
                  </View>
                  <View style={[styles.conditionBadge, { backgroundColor: `${getConditionColor(record.condition)}20` }]}>
                    <Text style={[styles.conditionText, { color: getConditionColor(record.condition) }]}>
                      {record.condition.charAt(0).toUpperCase() + record.condition.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.recordCardBody}>
                  <View style={styles.recordDetail}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{record.footwear_type}</Text>
                  </View>
                  {record.brand && (
                    <View style={styles.recordDetail}>
                      <Text style={styles.detailLabel}>Brand/Model:</Text>
                      <Text style={styles.detailValue}>{record.brand} {record.model}</Text>
                    </View>
                  )}
                  <View style={styles.recordDetail}>
                    <Text style={styles.detailLabel}>Size:</Text>
                    <Text style={styles.detailValue}>{record.size} {record.width}</Text>
                  </View>
                  {record.cost && (
                    <View style={styles.recordDetail}>
                      <Text style={styles.detailLabel}>Cost:</Text>
                      <Text style={styles.detailValue}>${record.cost.toFixed(2)}</Text>
                    </View>
                  )}
                </View>

                {record.safety_features && record.safety_features.length > 0 && (
                  <View style={styles.featuresRow}>
                    {record.safety_features.slice(0, 3).map((feature, index) => (
                      <View key={index} style={styles.featureChip}>
                        <ShieldCheck size={12} color="#3B82F6" />
                        <Text style={styles.featureChipText}>{feature}</Text>
                      </View>
                    ))}
                    {record.safety_features.length > 3 && (
                      <Text style={styles.moreFeatures}>+{record.safety_features.length - 3} more</Text>
                    )}
                  </View>
                )}

                <View style={styles.recordCardFooter}>
                  <View style={styles.dateInfo}>
                    <Calendar size={14} color="#6B7280" />
                    <Text style={styles.dateText}>Issued: {record.issue_date}</Text>
                  </View>
                  {record.replacement_due_date && (
                    <View style={[
                      styles.replacementInfo,
                      isOverdue(record.replacement_due_date) && styles.overdueInfo,
                      isReplacementDueSoon(record.replacement_due_date) && styles.dueSoonInfo,
                    ]}>
                      <Text style={[
                        styles.replacementText,
                        isOverdue(record.replacement_due_date) && styles.overdueText,
                        isReplacementDueSoon(record.replacement_due_date) && styles.dueSoonText,
                      ]}>
                        {isOverdue(record.replacement_due_date) ? 'OVERDUE' : `Replace: ${record.replacement_due_date}`}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => handleOpenForm(record)}
                  >
                    <Edit size={16} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => handleDelete(record)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                  <ChevronRight size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Condition</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.filterOption, filterCondition === 'all' && styles.filterOptionActive]}
              onPress={() => {
                setFilterCondition('all');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterCondition === 'all' && styles.filterOptionTextActive]}>
                All Conditions
              </Text>
              {filterCondition === 'all' && <CheckCircle size={18} color="#3B82F6" />}
            </TouchableOpacity>
            {CONDITIONS.map((condition) => (
              <TouchableOpacity
                key={condition.value}
                style={[styles.filterOption, filterCondition === condition.value && styles.filterOptionActive]}
                onPress={() => {
                  setFilterCondition(condition.value);
                  setShowFilterModal(false);
                }}
              >
                <View style={styles.filterOptionContent}>
                  <View style={[styles.conditionDot, { backgroundColor: condition.color }]} />
                  <Text style={[styles.filterOptionText, filterCondition === condition.value && styles.filterOptionTextActive]}>
                    {condition.label}
                  </Text>
                </View>
                {filterCondition === condition.value && <CheckCircle size={18} color="#3B82F6" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showFormModal} animationType="slide">
        <SafeAreaView style={styles.formModal}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => { setShowFormModal(false); resetForm(); }}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>
              {selectedRecord ? 'Edit Footwear' : 'Issue Footwear'}
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Employee Information</Text>

              <Text style={styles.inputLabel}>Employee Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.employee_name}
                onChangeText={(text) => setFormData({ ...formData, employee_name: text })}
                placeholder="Enter employee name"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Department</Text>
              <TextInput
                style={styles.textInput}
                value={formData.department}
                onChangeText={(text) => setFormData({ ...formData, department: text })}
                placeholder="Enter department"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Footwear Details</Text>

              <Text style={styles.inputLabel}>Footwear Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {footwearTypes?.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.chip, formData.footwear_type === type.name && styles.chipActive]}
                    onPress={() => setFormData({ ...formData, footwear_type: type.name })}
                  >
                    <Text style={[styles.chipText, formData.footwear_type === type.name && styles.chipTextActive]}>
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Brand</Text>
              <TextInput
                style={styles.textInput}
                value={formData.brand}
                onChangeText={(text) => setFormData({ ...formData, brand: text })}
                placeholder="Enter brand name"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Model</Text>
              <TextInput
                style={styles.textInput}
                value={formData.model}
                onChangeText={(text) => setFormData({ ...formData, model: text })}
                placeholder="Enter model number"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Size *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {SHOE_SIZES.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.sizeChip, formData.size === size && styles.sizeChipActive]}
                    onPress={() => setFormData({ ...formData, size })}
                  >
                    <Text style={[styles.sizeChipText, formData.size === size && styles.sizeChipTextActive]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Width</Text>
              <View style={styles.widthRow}>
                {SHOE_WIDTHS.map((width) => (
                  <TouchableOpacity
                    key={width}
                    style={[styles.widthButton, formData.width === width && styles.widthButtonActive]}
                    onPress={() => setFormData({ ...formData, width })}
                  >
                    <Text style={[styles.widthButtonText, formData.width === width && styles.widthButtonTextActive]}>
                      {width}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Safety Features</Text>
              <View style={styles.featuresGrid}>
                {SAFETY_FEATURES.map((feature) => (
                  <TouchableOpacity
                    key={feature}
                    style={[styles.featureToggle, formData.safety_features?.includes(feature) && styles.featureToggleActive]}
                    onPress={() => toggleSafetyFeature(feature)}
                  >
                    {formData.safety_features?.includes(feature) && (
                      <CheckCircle size={14} color="#fff" />
                    )}
                    <Text style={[styles.featureToggleText, formData.safety_features?.includes(feature) && styles.featureToggleTextActive]}>
                      {feature}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Purchase Information</Text>

              <Text style={styles.inputLabel}>Issue Date *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.issue_date}
                onChangeText={(text) => setFormData({ ...formData, issue_date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Cost</Text>
              <TextInput
                style={styles.textInput}
                value={formData.cost?.toString() || ''}
                onChangeText={(text) => setFormData({ ...formData, cost: text ? parseFloat(text) : undefined })}
                placeholder="Enter cost"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Voucher Number</Text>
              <TextInput
                style={styles.textInput}
                value={formData.voucher_number}
                onChangeText={(text) => setFormData({ ...formData, voucher_number: text })}
                placeholder="Enter voucher number"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Vendor</Text>
              <TextInput
                style={styles.textInput}
                value={formData.vendor}
                onChangeText={(text) => setFormData({ ...formData, vendor: text })}
                placeholder="Enter vendor name"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Condition</Text>
              <View style={styles.conditionRow}>
                {CONDITIONS.map((condition) => (
                  <TouchableOpacity
                    key={condition.value}
                    style={[
                      styles.conditionButton,
                      formData.condition === condition.value && {
                        backgroundColor: condition.color,
                        borderColor: condition.color,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, condition: condition.value })}
                  >
                    <Text style={[
                      styles.conditionButtonText,
                      formData.condition === condition.value && styles.conditionButtonTextActive,
                    ]}>
                      {condition.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Add any additional notes..."
                multiline
                numberOfLines={4}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide">
        <SafeAreaView style={styles.detailModal}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => { setShowDetailModal(false); setSelectedRecord(null); }}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>Footwear Details</Text>
            <TouchableOpacity onPress={() => { setShowDetailModal(false); handleOpenForm(selectedRecord!); }}>
              <Edit size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          {selectedRecord && (
            <ScrollView style={styles.detailContent}>
              <View style={[styles.conditionBanner, { backgroundColor: `${getConditionColor(selectedRecord.condition)}20` }]}>
                <Text style={[styles.conditionBannerText, { color: getConditionColor(selectedRecord.condition) }]}>
                  {selectedRecord.condition.toUpperCase()}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Employee</Text>
                <Text style={styles.detailMainValue}>{selectedRecord.employee_name}</Text>
                {selectedRecord.department && (
                  <Text style={styles.detailSubValue}>{selectedRecord.department}</Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Footwear</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Type:</Text>
                  <Text style={styles.detailRowValue}>{selectedRecord.footwear_type}</Text>
                </View>
                {selectedRecord.brand && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Brand:</Text>
                    <Text style={styles.detailRowValue}>{selectedRecord.brand}</Text>
                  </View>
                )}
                {selectedRecord.model && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Model:</Text>
                    <Text style={styles.detailRowValue}>{selectedRecord.model}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Size:</Text>
                  <Text style={styles.detailRowValue}>{selectedRecord.size} {selectedRecord.width}</Text>
                </View>
              </View>

              {selectedRecord.safety_features && selectedRecord.safety_features.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Safety Features</Text>
                  <View style={styles.detailFeaturesGrid}>
                    {selectedRecord.safety_features.map((feature, index) => (
                      <View key={index} style={styles.detailFeatureChip}>
                        <ShieldCheck size={14} color="#3B82F6" />
                        <Text style={styles.detailFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Purchase Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Issue Date:</Text>
                  <Text style={styles.detailRowValue}>{selectedRecord.issue_date}</Text>
                </View>
                {selectedRecord.cost && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Cost:</Text>
                    <Text style={styles.detailRowValue}>${selectedRecord.cost.toFixed(2)}</Text>
                  </View>
                )}
                {selectedRecord.voucher_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Voucher:</Text>
                    <Text style={styles.detailRowValue}>{selectedRecord.voucher_number}</Text>
                  </View>
                )}
                {selectedRecord.vendor && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Vendor:</Text>
                    <Text style={styles.detailRowValue}>{selectedRecord.vendor}</Text>
                  </View>
                )}
                {selectedRecord.replacement_due_date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Replacement Due:</Text>
                    <Text style={[
                      styles.detailRowValue,
                      isOverdue(selectedRecord.replacement_due_date) && styles.overdueDetailText,
                    ]}>
                      {selectedRecord.replacement_due_date}
                      {isOverdue(selectedRecord.replacement_due_date) && ' (OVERDUE)'}
                    </Text>
                  </View>
                )}
              </View>

              {selectedRecord.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Notes</Text>
                  <Text style={styles.notesText}>{selectedRecord.notes}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.deleteDetailButton}
                onPress={() => {
                  setShowDetailModal(false);
                  handleDelete(selectedRecord);
                }}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text style={styles.deleteDetailButtonText}>Delete Record</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#111827',
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  alertSection: {
    margin: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  alertItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
  },
  alertItemDate: {
    fontSize: 12,
    color: '#B45309',
  },
  listSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recordCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordCardLeft: {
    flex: 1,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  departmentText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 24,
  },
  conditionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordCardBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  recordDetail: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 90,
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featureChipText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '500',
  },
  moreFeatures: {
    fontSize: 11,
    color: '#6B7280',
    alignSelf: 'center',
  },
  recordCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  replacementInfo: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  overdueInfo: {
    backgroundColor: '#FEE2E2',
  },
  dueSoonInfo: {
    backgroundColor: '#FEF3C7',
  },
  replacementText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  overdueText: {
    color: '#DC2626',
  },
  dueSoonText: {
    color: '#D97706',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  cardActionButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterOptionActive: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  conditionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  filterOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  formModal: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  detailModal: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  formContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  chipScroll: {
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#8B5CF6',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
  },
  chipTextActive: {
    color: '#fff',
  },
  sizeChip: {
    width: 44,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sizeChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  sizeChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  sizeChipTextActive: {
    color: '#fff',
  },
  widthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  widthButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  widthButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  widthButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  widthButtonTextActive: {
    color: '#fff',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    gap: 6,
  },
  featureToggleActive: {
    backgroundColor: '#8B5CF6',
  },
  featureToggleText: {
    fontSize: 13,
    color: '#374151',
  },
  featureToggleTextActive: {
    color: '#fff',
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  conditionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  conditionButtonTextActive: {
    color: '#fff',
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  conditionBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  conditionBannerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailMainValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailRowLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailRowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  overdueDetailText: {
    color: '#DC2626',
  },
  detailFeaturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  detailFeatureText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  deleteDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 32,
  },
  deleteDetailButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
});
