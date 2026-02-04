import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useReturnToWorkForms } from '@/hooks/useRegulatoryCompliance';
import {
  ReturnToWorkForm,
  ReturnToWorkStatus,
  AbsenceType,
  ReturnType,
  RETURN_TO_WORK_STATUS_LABELS,
  RETURN_TO_WORK_STATUS_COLORS,
} from '@/types/regulatoryCompliance';
import {
  Plus,
  Search,
  Filter,
  UserCheck,
  Calendar,
  User,
  Building2,
  Clock,
  ChevronRight,
  X,
  CheckCircle,
  AlertTriangle,
  Briefcase,
} from 'lucide-react-native';

const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  workers_comp: 'Workers Comp',
  fmla: 'FMLA',
  medical_leave: 'Medical Leave',
  personal_leave: 'Personal Leave',
  other: 'Other',
};

const RETURN_TYPE_LABELS: Record<ReturnType, string> = {
  full_duty: 'Full Duty',
  modified_duty: 'Modified Duty',
  light_duty: 'Light Duty',
  partial_return: 'Partial Return',
  not_cleared: 'Not Cleared',
};

export default function ReturnToWorkScreen() {
  const { colors } = useTheme();
  const {
    forms,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useReturnToWorkForms();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReturnToWorkStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<ReturnToWorkForm | null>(null);
  const [formData, setFormData] = useState({
    employee_name: '',
    department: '',
    job_title: '',
    supervisor_name: '',
    absence_type: 'medical_leave' as AbsenceType,
    absence_reason: '',
    first_day_absent: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    medical_clearance_required: true,
    return_type: 'full_duty' as ReturnType,
    has_restrictions: false,
    restriction_details: '',
    modified_duty_assigned: false,
    modified_duty_description: '',
    notes: '',
  });

  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const matchesSearch =
        f.form_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.employee_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [forms, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: forms.length,
    pending: forms.filter(f => f.status === 'pending').length,
    cleared: forms.filter(f => f.status === 'cleared').length,
    restricted: forms.filter(f => f.status === 'restricted').length,
  }), [forms]);

  const resetForm = () => {
    setFormData({
      employee_name: '',
      department: '',
      job_title: '',
      supervisor_name: '',
      absence_type: 'medical_leave',
      absence_reason: '',
      first_day_absent: new Date().toISOString().split('T')[0],
      expected_return_date: '',
      medical_clearance_required: true,
      return_type: 'full_duty',
      has_restrictions: false,
      restriction_details: '',
      modified_duty_assigned: false,
      modified_duty_description: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.employee_name.trim()) {
      Alert.alert('Error', 'Employee name is required');
      return;
    }

    try {
      const payload = {
        form_number: generateNumber(),
        employee_id: null,
        employee_name: formData.employee_name,
        employee_code: null,
        department: formData.department || null,
        job_title: formData.job_title || null,
        supervisor_id: null,
        supervisor_name: formData.supervisor_name || null,
        facility_id: null,
        facility_name: null,
        workers_comp_claim_id: null,
        claim_number: null,
        absence_type: formData.absence_type,
        absence_reason: formData.absence_reason || null,
        first_day_absent: formData.first_day_absent,
        last_day_absent: null,
        expected_return_date: formData.expected_return_date || null,
        actual_return_date: null,
        total_days_absent: null,
        medical_clearance_required: formData.medical_clearance_required,
        medical_clearance_received: false,
        clearance_date: null,
        clearing_physician: null,
        clearing_facility: null,
        return_type: formData.return_type,
        has_restrictions: formData.has_restrictions,
        restrictions_start_date: null,
        restrictions_end_date: null,
        restriction_details: formData.restriction_details || null,
        work_hours_per_day: null,
        work_days_per_week: null,
        lifting_restriction_lbs: null,
        standing_restriction_hours: null,
        sitting_restriction_hours: null,
        walking_restriction: null,
        driving_restriction: false,
        other_restrictions: [],
        modified_duty_assigned: formData.modified_duty_assigned,
        modified_duty_description: formData.modified_duty_description || null,
        modified_duty_department: null,
        modified_duty_supervisor: null,
        modified_duty_start_date: null,
        modified_duty_end_date: null,
        fitness_for_duty_exam_required: false,
        fitness_for_duty_exam_date: null,
        fitness_for_duty_result: null,
        follow_up_required: false,
        follow_up_date: null,
        follow_up_notes: null,
        next_medical_appointment: null,
        hr_reviewed: false,
        hr_reviewer: null,
        hr_reviewer_id: null,
        hr_review_date: null,
        hr_notes: null,
        supervisor_approved: false,
        supervisor_approval_date: null,
        hr_approved: false,
        hr_approval_date: null,
        status: 'pending' as ReturnToWorkStatus,
        notes: formData.notes || null,
        attachments: [],
        created_by: 'Current User',
        created_by_id: null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Return to Work form created successfully');
    } catch (err) {
      console.error('Error creating form:', err);
      Alert.alert('Error', 'Failed to create form');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    statsContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 44,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      color: colors.text,
    },
    filterButton: {
      width: 44,
      height: 44,
      backgroundColor: colors.surface,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButton: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#10B981',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    formNumber: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    absenceType: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    cardBody: {
      gap: 8,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    returnTypeBadge: {
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    returnTypeText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    viewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewButtonText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500' as const,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    modalBody: {
      padding: 16,
    },
    formSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 12,
    },
    inputGroup: {
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    halfWidth: {
      flex: 1,
    },
    typeSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeOption: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    typeOptionSelected: {
      borderColor: colors.primary,
    },
    typeOptionText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    typeOptionTextSelected: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 12,
    },
    switchLabel: {
      fontSize: 15,
      color: colors.text,
    },
    switchButton: {
      width: 50,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    switchKnob: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#fff',
    },
    submitButton: {
      backgroundColor: '#10B981',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 32,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    detailSection: {
      marginBottom: 20,
    },
    detailRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      width: 130,
    },
    detailValue: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    filterModalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
    },
    filterOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterOptionText: {
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
    filterOptionSelected: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
  });

  const getReturnTypeColor = (type: ReturnType | null) => {
    switch (type) {
      case 'full_duty': return '#10B981';
      case 'modified_duty': return '#3B82F6';
      case 'light_duty': return '#F59E0B';
      case 'partial_return': return '#8B5CF6';
      case 'not_cleared': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.cleared}</Text>
          <Text style={styles.statLabel}>Cleared</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#3B82F620' }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.restricted}</Text>
          <Text style={styles.statLabel}>Restricted</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search forms..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {filteredForms.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <UserCheck size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Return to Work Forms</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first return to work form'}
            </Text>
          </View>
        ) : (
          filteredForms.map(form => (
            <TouchableOpacity
              key={form.id}
              style={styles.card}
              onPress={() => {
                setSelectedForm(form);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formNumber}>{form.form_number}</Text>
                  <Text style={styles.absenceType}>{ABSENCE_TYPE_LABELS[form.absence_type]}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: RETURN_TO_WORK_STATUS_COLORS[form.status] + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: RETURN_TO_WORK_STATUS_COLORS[form.status] }]}>
                    {RETURN_TO_WORK_STATUS_LABELS[form.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{form.employee_name}</Text>
                </View>
                {form.department && (
                  <View style={styles.infoRow}>
                    <Building2 size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{form.department}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    Absent from: {new Date(form.first_day_absent).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {form.return_type && (
                <View
                  style={[
                    styles.returnTypeBadge,
                    { backgroundColor: getReturnTypeColor(form.return_type) + '20' },
                  ]}
                >
                  <Text style={[styles.returnTypeText, { color: getReturnTypeColor(form.return_type) }]}>
                    {RETURN_TYPE_LABELS[form.return_type]}
                  </Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                  <ChevronRight size={16} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setShowFormModal(true);
        }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showFormModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFormModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Return to Work Form</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Employee Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Employee Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.employee_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, employee_name: text }))}
                    placeholder="Full name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Department</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.department}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, department: text }))}
                      placeholder="Department"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Job Title</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.job_title}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, job_title: text }))}
                      placeholder="Job title"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Supervisor</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.supervisor_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, supervisor_name: text }))}
                    placeholder="Supervisor name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Absence Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Absence Type</Text>
                  <View style={styles.typeSelector}>
                    {(Object.keys(ABSENCE_TYPE_LABELS) as AbsenceType[]).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          formData.absence_type === type && styles.typeOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, absence_type: type }))}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          formData.absence_type === type && styles.typeOptionTextSelected,
                        ]}>
                          {ABSENCE_TYPE_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Absence Reason</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.absence_reason}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, absence_reason: text }))}
                    placeholder="Reason for absence..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>First Day Absent *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.first_day_absent}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, first_day_absent: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Expected Return</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.expected_return_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, expected_return_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Return Status</Text>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, medical_clearance_required: !prev.medical_clearance_required }))}
                >
                  <Text style={styles.switchLabel}>Medical Clearance Required?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.medical_clearance_required ? '#3B82F6' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.medical_clearance_required ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Return Type</Text>
                  <View style={styles.typeSelector}>
                    {(Object.keys(RETURN_TYPE_LABELS) as ReturnType[]).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          formData.return_type === type && styles.typeOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, return_type: type }))}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          formData.return_type === type && styles.typeOptionTextSelected,
                        ]}>
                          {RETURN_TYPE_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, has_restrictions: !prev.has_restrictions }))}
                >
                  <Text style={styles.switchLabel}>Has Restrictions?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.has_restrictions ? '#F59E0B' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.has_restrictions ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                {formData.has_restrictions && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Restriction Details</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={formData.restriction_details}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, restriction_details: text }))}
                      placeholder="Describe restrictions..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, modified_duty_assigned: !prev.modified_duty_assigned }))}
                >
                  <Text style={styles.switchLabel}>Modified Duty Assigned?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.modified_duty_assigned ? '#10B981' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.modified_duty_assigned ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                {formData.modified_duty_assigned && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Modified Duty Description</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={formData.modified_duty_description}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, modified_duty_description: text }))}
                      placeholder="Describe modified duties..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                    />
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="Additional notes..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isCreating}
              >
                <Text style={styles.submitButtonText}>
                  {isCreating ? 'Creating...' : 'Create Form'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Form Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedForm && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Form Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Form #</Text>
                      <Text style={styles.detailValue}>{selectedForm.form_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: RETURN_TO_WORK_STATUS_COLORS[selectedForm.status] }]}>
                        {RETURN_TO_WORK_STATUS_LABELS[selectedForm.status]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Absence Type</Text>
                      <Text style={styles.detailValue}>{ABSENCE_TYPE_LABELS[selectedForm.absence_type]}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Employee</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedForm.employee_name}</Text>
                    </View>
                    {selectedForm.department && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Department</Text>
                        <Text style={styles.detailValue}>{selectedForm.department}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Absence Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>First Day Absent</Text>
                      <Text style={styles.detailValue}>{new Date(selectedForm.first_day_absent).toLocaleDateString()}</Text>
                    </View>
                    {selectedForm.expected_return_date && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Expected Return</Text>
                        <Text style={styles.detailValue}>{new Date(selectedForm.expected_return_date).toLocaleDateString()}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Return Status</Text>
                    {selectedForm.return_type && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Return Type</Text>
                        <Text style={[styles.detailValue, { color: getReturnTypeColor(selectedForm.return_type) }]}>
                          {RETURN_TYPE_LABELS[selectedForm.return_type]}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Medical Clear Req.</Text>
                      <Text style={styles.detailValue}>{selectedForm.medical_clearance_required ? 'Yes' : 'No'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Has Restrictions</Text>
                      <Text style={styles.detailValue}>{selectedForm.has_restrictions ? 'Yes' : 'No'}</Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Status</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setStatusFilter('all');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, statusFilter === 'all' && styles.filterOptionSelected]}>
                All Forms
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(RETURN_TO_WORK_STATUS_LABELS) as ReturnToWorkStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {RETURN_TO_WORK_STATUS_LABELS[status]}
                </Text>
                {statusFilter === status && <CheckCircle size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
