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
import { useMedicalRestrictions } from '@/hooks/useRegulatoryCompliance';
import {
  MedicalRestriction,
  RestrictionStatus,
  RestrictionCategory,
  RESTRICTION_STATUS_LABELS,
  RESTRICTION_STATUS_COLORS,
  RESTRICTION_CATEGORIES,
} from '@/types/regulatoryCompliance';
import {
  Plus,
  Search,
  Filter,
  AlertCircle,
  Calendar,
  User,
  Building2,
  Clock,
  ChevronRight,
  X,
  CheckCircle,
  Stethoscope,
  Ban,
} from 'lucide-react-native';

export default function MedicalRestrictionScreen() {
  const { colors } = useTheme();
  const {
    restrictions,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useMedicalRestrictions();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RestrictionStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRestriction, setSelectedRestriction] = useState<MedicalRestriction | null>(null);
  const [formData, setFormData] = useState({
    employee_name: '',
    department: '',
    job_title: '',
    supervisor_name: '',
    effective_date: new Date().toISOString().split('T')[0],
    expiration_date: '',
    is_permanent: false,
    prescribing_physician: '',
    medical_facility: '',
    restriction_category: 'lifting' as RestrictionCategory,
    lifting_max_lbs: '',
    standing_max_hours: '',
    sitting_max_hours: '',
    no_driving: false,
    no_heights: false,
    no_ladders: false,
    other_restrictions: '',
    notes: '',
  });

  const filteredRestrictions = useMemo(() => {
    return restrictions.filter(r => {
      const matchesSearch =
        r.restriction_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employee_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [restrictions, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: restrictions.length,
    active: restrictions.filter(r => r.status === 'active').length,
    expiring: restrictions.filter(r => {
      if (!r.expiration_date || r.status !== 'active') return false;
      const expDate = new Date(r.expiration_date);
      const now = new Date();
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays > 0;
    }).length,
    released: restrictions.filter(r => r.status === 'released').length,
  }), [restrictions]);

  const resetForm = () => {
    setFormData({
      employee_name: '',
      department: '',
      job_title: '',
      supervisor_name: '',
      effective_date: new Date().toISOString().split('T')[0],
      expiration_date: '',
      is_permanent: false,
      prescribing_physician: '',
      medical_facility: '',
      restriction_category: 'lifting',
      lifting_max_lbs: '',
      standing_max_hours: '',
      sitting_max_hours: '',
      no_driving: false,
      no_heights: false,
      no_ladders: false,
      other_restrictions: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.employee_name.trim() || !formData.prescribing_physician.trim()) {
      Alert.alert('Error', 'Employee name and prescribing physician are required');
      return;
    }

    try {
      const payload = {
        restriction_number: generateNumber(),
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
        return_to_work_id: null,
        effective_date: formData.effective_date,
        expiration_date: formData.expiration_date || null,
        is_permanent: formData.is_permanent,
        prescribing_physician: formData.prescribing_physician,
        medical_facility: formData.medical_facility || null,
        facility_phone: null,
        restriction_category: formData.restriction_category,
        lifting_max_lbs: formData.lifting_max_lbs ? parseInt(formData.lifting_max_lbs) : null,
        lifting_frequency: null,
        standing_max_hours: formData.standing_max_hours ? parseFloat(formData.standing_max_hours) : null,
        sitting_max_hours: formData.sitting_max_hours ? parseFloat(formData.sitting_max_hours) : null,
        walking_max_distance: null,
        no_repetitive_motion: false,
        repetitive_motion_details: null,
        no_driving: formData.no_driving,
        no_heights: formData.no_heights,
        height_limit_feet: null,
        no_ladders: formData.no_ladders,
        no_extreme_temps: false,
        temp_restrictions: null,
        no_chemicals: false,
        chemical_restrictions: [],
        no_noise_exposure: false,
        noise_limit_db: null,
        no_vibration: false,
        cognitive_restrictions: null,
        medication_restrictions: null,
        other_restrictions: formData.other_restrictions || null,
        modified_schedule_required: false,
        work_hours_per_day: null,
        work_days_per_week: null,
        required_breaks: null,
        break_frequency_minutes: null,
        equipment_required: [],
        accommodations_required: [],
        accommodations_provided: false,
        accommodations_details: null,
        employee_notified: false,
        employee_notified_date: null,
        supervisor_notified: false,
        supervisor_notified_date: null,
        hr_notified: false,
        hr_notified_date: null,
        employee_acknowledged: false,
        employee_acknowledged_date: null,
        supervisor_acknowledged: false,
        supervisor_acknowledged_date: null,
        next_review_date: null,
        last_reviewed_date: null,
        reviewed_by: null,
        reviewed_by_id: null,
        review_notes: null,
        status: 'active' as RestrictionStatus,
        notes: formData.notes || null,
        attachments: [],
        created_by: 'Current User',
        created_by_id: null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Medical restriction created successfully');
    } catch (err) {
      console.error('Error creating restriction:', err);
      Alert.alert('Error', 'Failed to create restriction');
    }
  };

  const getDaysUntilExpiration = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    const exp = new Date(expirationDate);
    const now = new Date();
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
      backgroundColor: '#F59E0B',
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
    restrictionNumber: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    categoryText: {
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
    restrictionsList: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
      gap: 6,
    },
    restrictionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    restrictionText: {
      fontSize: 12,
      color: colors.text,
    },
    expirationBadge: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    expirationText: {
      fontSize: 11,
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
    thirdWidth: {
      flex: 1,
    },
    categorySelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryOption: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    categoryOptionSelected: {
      borderColor: colors.primary,
    },
    categoryOptionText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    categoryOptionTextSelected: {
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
      backgroundColor: '#F59E0B',
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

  const getCategoryLabel = (cat: RestrictionCategory) => {
    const found = RESTRICTION_CATEGORIES.find(c => c.value === cat);
    return found?.label || cat;
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.expiring}</Text>
          <Text style={styles.statLabel}>Expiring</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.released}</Text>
          <Text style={styles.statLabel}>Released</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restrictions..."
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
        {filteredRestrictions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <AlertCircle size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Medical Restrictions</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first medical restriction'}
            </Text>
          </View>
        ) : (
          filteredRestrictions.map(restriction => {
            const daysUntilExp = getDaysUntilExpiration(restriction.expiration_date);
            return (
              <TouchableOpacity
                key={restriction.id}
                style={styles.card}
                onPress={() => {
                  setSelectedRestriction(restriction);
                  setShowDetailModal(true);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.restrictionNumber}>{restriction.restriction_number}</Text>
                    <Text style={styles.categoryText}>{getCategoryLabel(restriction.restriction_category)}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: RESTRICTION_STATUS_COLORS[restriction.status] + '20' },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: RESTRICTION_STATUS_COLORS[restriction.status] }]}>
                      {RESTRICTION_STATUS_LABELS[restriction.status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <User size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{restriction.employee_name}</Text>
                  </View>
                  {restriction.department && (
                    <View style={styles.infoRow}>
                      <Building2 size={14} color={colors.textSecondary} />
                      <Text style={styles.infoText}>{restriction.department}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Stethoscope size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>Dr. {restriction.prescribing_physician}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Calendar size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>
                      Effective: {new Date(restriction.effective_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.restrictionsList}>
                  {restriction.lifting_max_lbs && (
                    <View style={styles.restrictionItem}>
                      <Ban size={12} color="#EF4444" />
                      <Text style={styles.restrictionText}>Max lift: {restriction.lifting_max_lbs} lbs</Text>
                    </View>
                  )}
                  {restriction.no_driving && (
                    <View style={styles.restrictionItem}>
                      <Ban size={12} color="#EF4444" />
                      <Text style={styles.restrictionText}>No driving</Text>
                    </View>
                  )}
                  {restriction.no_heights && (
                    <View style={styles.restrictionItem}>
                      <Ban size={12} color="#EF4444" />
                      <Text style={styles.restrictionText}>No heights</Text>
                    </View>
                  )}
                  {restriction.no_ladders && (
                    <View style={styles.restrictionItem}>
                      <Ban size={12} color="#EF4444" />
                      <Text style={styles.restrictionText}>No ladders</Text>
                    </View>
                  )}
                </View>

                {restriction.is_permanent ? (
                  <View style={[styles.expirationBadge, { backgroundColor: '#6B728020' }]}>
                    <Clock size={12} color="#6B7280" />
                    <Text style={[styles.expirationText, { color: '#6B7280' }]}>Permanent</Text>
                  </View>
                ) : daysUntilExp !== null && daysUntilExp > 0 ? (
                  <View style={[styles.expirationBadge, { backgroundColor: daysUntilExp <= 7 ? '#EF444420' : '#F59E0B20' }]}>
                    <Clock size={12} color={daysUntilExp <= 7 ? '#EF4444' : '#F59E0B'} />
                    <Text style={[styles.expirationText, { color: daysUntilExp <= 7 ? '#EF4444' : '#F59E0B' }]}>
                      Expires in {daysUntilExp} days
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>View Details</Text>
                    <ChevronRight size={16} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
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
              <Text style={styles.modalTitle}>New Medical Restriction</Text>
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
                <Text style={styles.sectionTitle}>Medical Provider</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Prescribing Physician *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.prescribing_physician}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, prescribing_physician: text }))}
                    placeholder="Physician name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Medical Facility</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.medical_facility}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, medical_facility: text }))}
                    placeholder="Facility name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Restriction Period</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Effective Date *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.effective_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, effective_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Expiration Date</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.expiration_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, expiration_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                      editable={!formData.is_permanent}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, is_permanent: !prev.is_permanent }))}
                >
                  <Text style={styles.switchLabel}>Permanent Restriction?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.is_permanent ? '#6B7280' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.is_permanent ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Restriction Category</Text>
                <View style={styles.categorySelector}>
                  {RESTRICTION_CATEGORIES.slice(0, 6).map(cat => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryOption,
                        formData.restriction_category === cat.value && styles.categoryOptionSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, restriction_category: cat.value }))}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        formData.restriction_category === cat.value && styles.categoryOptionTextSelected,
                      ]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Specific Restrictions</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.thirdWidth}>
                    <Text style={styles.inputLabel}>Max Lift (lbs)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.lifting_max_lbs}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, lifting_max_lbs: text }))}
                      placeholder="20"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.thirdWidth}>
                    <Text style={styles.inputLabel}>Max Stand (hrs)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.standing_max_hours}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, standing_max_hours: text }))}
                      placeholder="2"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.thirdWidth}>
                    <Text style={styles.inputLabel}>Max Sit (hrs)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.sitting_max_hours}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, sitting_max_hours: text }))}
                      placeholder="4"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, no_driving: !prev.no_driving }))}
                >
                  <Text style={styles.switchLabel}>No Driving</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.no_driving ? '#EF4444' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.no_driving ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, no_heights: !prev.no_heights }))}
                >
                  <Text style={styles.switchLabel}>No Heights</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.no_heights ? '#EF4444' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.no_heights ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, no_ladders: !prev.no_ladders }))}
                >
                  <Text style={styles.switchLabel}>No Ladders</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.no_ladders ? '#EF4444' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.no_ladders ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Other Restrictions</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.other_restrictions}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, other_restrictions: text }))}
                    placeholder="Describe other restrictions..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>
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
                  {isCreating ? 'Creating...' : 'Create Restriction'}
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
              <Text style={styles.modalTitle}>Restriction Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedRestriction && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Restriction Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Number</Text>
                      <Text style={styles.detailValue}>{selectedRestriction.restriction_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: RESTRICTION_STATUS_COLORS[selectedRestriction.status] }]}>
                        {RESTRICTION_STATUS_LABELS[selectedRestriction.status]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Category</Text>
                      <Text style={styles.detailValue}>{getCategoryLabel(selectedRestriction.restriction_category)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Employee</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedRestriction.employee_name}</Text>
                    </View>
                    {selectedRestriction.department && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Department</Text>
                        <Text style={styles.detailValue}>{selectedRestriction.department}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Period</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Effective Date</Text>
                      <Text style={styles.detailValue}>{new Date(selectedRestriction.effective_date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Expiration</Text>
                      <Text style={styles.detailValue}>
                        {selectedRestriction.is_permanent ? 'Permanent' : 
                          selectedRestriction.expiration_date ? new Date(selectedRestriction.expiration_date).toLocaleDateString() : 'Not set'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Physician</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>Dr. {selectedRestriction.prescribing_physician}</Text>
                    </View>
                    {selectedRestriction.medical_facility && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Facility</Text>
                        <Text style={styles.detailValue}>{selectedRestriction.medical_facility}</Text>
                      </View>
                    )}
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
                All Restrictions
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(RESTRICTION_STATUS_LABELS) as RestrictionStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {RESTRICTION_STATUS_LABELS[status]}
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
