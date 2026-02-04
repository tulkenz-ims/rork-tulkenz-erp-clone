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
import { useWorkersCompClaims } from '@/hooks/useRegulatoryCompliance';
import {
  WorkersCompClaim,
  WorkersCompStatus,
  InjuryType,
  TreatmentType,
  WORKERS_COMP_STATUS_LABELS,
  WORKERS_COMP_STATUS_COLORS,
  BODY_PARTS,
  INJURY_NATURES,
} from '@/types/regulatoryCompliance';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Calendar,
  User,
  MapPin,
  AlertTriangle,
  ChevronRight,
  X,
  CheckCircle,
  DollarSign,
  Activity,
} from 'lucide-react-native';

export default function WorkersCompScreen() {
  const { colors } = useTheme();
  const {
    claims,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useWorkersCompClaims();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkersCompStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<WorkersCompClaim | null>(null);
  const [formData, setFormData] = useState({
    employee_name: '',
    department: '',
    job_title: '',
    date_of_injury: new Date().toISOString().split('T')[0],
    date_reported: new Date().toISOString().split('T')[0],
    injury_type: 'injury' as InjuryType,
    body_part_affected: [] as string[],
    nature_of_injury: '',
    injury_description: '',
    injury_location: '',
    cause_of_injury: '',
    medical_treatment_required: false,
    initial_treatment_type: 'none' as TreatmentType,
    treating_physician: '',
    treating_facility: '',
    lost_time_claim: false,
    osha_recordable: false,
    notes: '',
  });

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      const matchesSearch =
        c.claim_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nature_of_injury.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [claims, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: claims.length,
    open: claims.filter(c => c.status === 'open' || c.status === 'pending').length,
    closed: claims.filter(c => c.status === 'closed').length,
    totalCost: claims.reduce((sum, c) => sum + (c.total_incurred || 0), 0),
  }), [claims]);

  const resetForm = () => {
    setFormData({
      employee_name: '',
      department: '',
      job_title: '',
      date_of_injury: new Date().toISOString().split('T')[0],
      date_reported: new Date().toISOString().split('T')[0],
      injury_type: 'injury',
      body_part_affected: [],
      nature_of_injury: '',
      injury_description: '',
      injury_location: '',
      cause_of_injury: '',
      medical_treatment_required: false,
      initial_treatment_type: 'none',
      treating_physician: '',
      treating_facility: '',
      lost_time_claim: false,
      osha_recordable: false,
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.employee_name.trim() || !formData.nature_of_injury.trim() || !formData.injury_description.trim()) {
      Alert.alert('Error', 'Employee name, nature of injury, and description are required');
      return;
    }

    try {
      const payload = {
        claim_number: generateNumber(),
        employee_id: null,
        employee_name: formData.employee_name,
        employee_code: null,
        department: formData.department || null,
        job_title: formData.job_title || null,
        hire_date: null,
        date_of_birth: null,
        ssn_last_four: null,
        facility_id: null,
        facility_name: null,
        date_of_injury: formData.date_of_injury,
        time_of_injury: null,
        date_reported: formData.date_reported,
        reported_to: null,
        reported_to_id: null,
        injury_type: formData.injury_type,
        body_part_affected: formData.body_part_affected,
        nature_of_injury: formData.nature_of_injury,
        injury_description: formData.injury_description,
        injury_location: formData.injury_location || null,
        cause_of_injury: formData.cause_of_injury || null,
        object_substance_involved: null,
        activity_at_time: null,
        witnesses: [],
        medical_treatment_required: formData.medical_treatment_required,
        initial_treatment_type: formData.initial_treatment_type,
        treating_physician: formData.treating_physician || null,
        treating_facility: formData.treating_facility || null,
        treating_facility_address: null,
        treating_facility_phone: null,
        lost_time_claim: formData.lost_time_claim,
        first_day_lost: null,
        return_to_work_date: null,
        days_away_from_work: 0,
        days_restricted_duty: 0,
        insurance_carrier: null,
        policy_number: null,
        insurance_claim_number: null,
        adjuster_name: null,
        adjuster_phone: null,
        adjuster_email: null,
        medical_costs: 0,
        indemnity_costs: 0,
        legal_costs: 0,
        other_costs: 0,
        total_incurred: 0,
        reserve_amount: 0,
        status: 'open' as WorkersCompStatus,
        claim_accepted_date: null,
        claim_denied_date: null,
        denial_reason: null,
        claim_closed_date: null,
        closure_reason: null,
        osha_recordable: formData.osha_recordable,
        osha_300_log_entry: null,
        osha_301_completed: false,
        investigation_completed: false,
        investigation_date: null,
        investigated_by: null,
        investigated_by_id: null,
        root_cause: null,
        corrective_actions: [],
        notes: formData.notes || null,
        internal_notes: null,
        attachments: [],
        created_by: 'Current User',
        created_by_id: null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Workers Comp claim created successfully');
    } catch (err) {
      console.error('Error creating claim:', err);
      Alert.alert('Error', 'Failed to create claim');
    }
  };

  const toggleBodyPart = (part: string) => {
    setFormData(prev => ({
      ...prev,
      body_part_affected: prev.body_part_affected.includes(part)
        ? prev.body_part_affected.filter(p => p !== part)
        : [...prev.body_part_affected, part],
    }));
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
      fontSize: 20,
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
      backgroundColor: '#EF4444',
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
    claimNumber: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    injuryDate: {
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
    injuryText: {
      fontSize: 14,
      color: colors.text,
      marginTop: 8,
      fontWeight: '500' as const,
    },
    bodyPartsText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    costText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
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
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    chipTextSelected: {
      color: colors.primary,
      fontWeight: '500' as const,
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
      backgroundColor: '#EF4444',
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
      width: 120,
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
    typeSelector: {
      flexDirection: 'row',
      gap: 8,
    },
    typeOption: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      alignItems: 'center',
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
  });

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.open}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.closed}</Text>
          <Text style={styles.statLabel}>Closed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#3B82F620' }]}>
          <Text style={[styles.statValue, { color: '#3B82F6', fontSize: 16 }]}>
            ${stats.totalCost.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Total Cost</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search claims..."
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
        {filteredClaims.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FileText size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Workers Comp Claims</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first claim record'}
            </Text>
          </View>
        ) : (
          filteredClaims.map(claim => (
            <TouchableOpacity
              key={claim.id}
              style={styles.card}
              onPress={() => {
                setSelectedClaim(claim);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimNumber}>{claim.claim_number}</Text>
                  <Text style={styles.injuryDate}>
                    Injury: {new Date(claim.date_of_injury).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: WORKERS_COMP_STATUS_COLORS[claim.status] + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: WORKERS_COMP_STATUS_COLORS[claim.status] }]}>
                    {WORKERS_COMP_STATUS_LABELS[claim.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{claim.employee_name}</Text>
                </View>
                {claim.department && (
                  <View style={styles.infoRow}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{claim.department}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.injuryText}>{claim.nature_of_injury}</Text>
              {claim.body_part_affected.length > 0 && (
                <Text style={styles.bodyPartsText}>
                  Body Parts: {claim.body_part_affected.join(', ')}
                </Text>
              )}

              <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <DollarSign size={14} color={colors.textSecondary} />
                  <Text style={styles.costText}>${claim.total_incurred.toLocaleString()}</Text>
                </View>
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
              <Text style={styles.modalTitle}>New Workers Comp Claim</Text>
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
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Injury Information</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Date of Injury *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.date_of_injury}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, date_of_injury: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Date Reported *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.date_reported}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, date_reported: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Injury Type</Text>
                  <View style={styles.typeSelector}>
                    {(['injury', 'illness', 'occupational_disease'] as InjuryType[]).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          formData.injury_type === type && styles.typeOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, injury_type: type }))}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          formData.injury_type === type && styles.typeOptionTextSelected,
                        ]}>
                          {type === 'injury' ? 'Injury' : type === 'illness' ? 'Illness' : 'Occupational'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nature of Injury *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.nature_of_injury}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, nature_of_injury: text }))}
                    placeholder="e.g., Sprain, Cut, Fracture"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Injury Description *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.injury_description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, injury_description: text }))}
                    placeholder="Describe the injury..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Body Parts Affected</Text>
                  <View style={styles.chipContainer}>
                    {BODY_PARTS.slice(0, 12).map(part => (
                      <TouchableOpacity
                        key={part}
                        style={[
                          styles.chip,
                          formData.body_part_affected.includes(part) && styles.chipSelected,
                        ]}
                        onPress={() => toggleBodyPart(part)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            formData.body_part_affected.includes(part) && styles.chipTextSelected,
                          ]}
                        >
                          {part}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Injury Location</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.injury_location}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, injury_location: text }))}
                    placeholder="Where did the injury occur?"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cause of Injury</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.cause_of_injury}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, cause_of_injury: text }))}
                    placeholder="What caused the injury?"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Treatment</Text>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, medical_treatment_required: !prev.medical_treatment_required }))}
                >
                  <Text style={styles.switchLabel}>Medical Treatment Required?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.medical_treatment_required ? '#3B82F6' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.medical_treatment_required ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                {formData.medical_treatment_required && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Treating Physician</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.treating_physician}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, treating_physician: text }))}
                        placeholder="Physician name"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Medical Facility</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.treating_facility}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, treating_facility: text }))}
                        placeholder="Facility name"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, lost_time_claim: !prev.lost_time_claim }))}
                >
                  <Text style={styles.switchLabel}>Lost Time Claim?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.lost_time_claim ? '#EF4444' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.lost_time_claim ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, osha_recordable: !prev.osha_recordable }))}
                >
                  <Text style={styles.switchLabel}>OSHA Recordable?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.osha_recordable ? '#F59E0B' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.osha_recordable ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>
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
                  {isCreating ? 'Creating...' : 'Create Claim'}
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
              <Text style={styles.modalTitle}>Claim Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedClaim && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Claim Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Claim #</Text>
                      <Text style={styles.detailValue}>{selectedClaim.claim_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: WORKERS_COMP_STATUS_COLORS[selectedClaim.status] }]}>
                        {WORKERS_COMP_STATUS_LABELS[selectedClaim.status]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date of Injury</Text>
                      <Text style={styles.detailValue}>{new Date(selectedClaim.date_of_injury).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date Reported</Text>
                      <Text style={styles.detailValue}>{new Date(selectedClaim.date_reported).toLocaleDateString()}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Employee</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedClaim.employee_name}</Text>
                    </View>
                    {selectedClaim.department && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Department</Text>
                        <Text style={styles.detailValue}>{selectedClaim.department}</Text>
                      </View>
                    )}
                    {selectedClaim.job_title && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Job Title</Text>
                        <Text style={styles.detailValue}>{selectedClaim.job_title}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Injury Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Nature</Text>
                      <Text style={styles.detailValue}>{selectedClaim.nature_of_injury}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={styles.detailValue}>{selectedClaim.injury_description}</Text>
                    </View>
                    {selectedClaim.body_part_affected.length > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Body Parts</Text>
                        <Text style={styles.detailValue}>{selectedClaim.body_part_affected.join(', ')}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Financial</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Medical Costs</Text>
                      <Text style={styles.detailValue}>${selectedClaim.medical_costs.toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Indemnity Costs</Text>
                      <Text style={styles.detailValue}>${selectedClaim.indemnity_costs.toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Incurred</Text>
                      <Text style={[styles.detailValue, { fontWeight: '600' as const }]}>
                        ${selectedClaim.total_incurred.toLocaleString()}
                      </Text>
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
                All Claims
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(WORKERS_COMP_STATUS_LABELS) as WorkersCompStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {WORKERS_COMP_STATUS_LABELS[status]}
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
