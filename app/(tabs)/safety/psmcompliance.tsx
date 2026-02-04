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
import { usePSMComplianceRecords } from '@/hooks/useRegulatoryCompliance';
import {
  PSMComplianceRecord,
  PSMStatus,
  PSMElement,
  PSMActivityType,
  PSM_STATUS_LABELS,
  PSM_STATUS_COLORS,
  PSM_ELEMENT_LABELS,
} from '@/types/regulatoryCompliance';
import {
  Plus,
  Search,
  Filter,
  Shield,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  ChevronRight,
  X,
  CheckCircle,
  FileText,
  Beaker,
} from 'lucide-react-native';

const ACTIVITY_TYPE_LABELS: Record<PSMActivityType, string> = {
  audit: 'Audit',
  review: 'Review',
  update: 'Update',
  training: 'Training',
  inspection: 'Inspection',
  pha: 'PHA',
  moc: 'MOC',
  pssr: 'PSSR',
  incident_review: 'Incident Review',
  drill: 'Drill',
  other: 'Other',
};

export default function PSMComplianceScreen() {
  const { colors } = useTheme();
  const {
    records,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = usePSMComplianceRecords();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PSMStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PSMComplianceRecord | null>(null);
  const [formData, setFormData] = useState({
    process_name: '',
    process_area: '',
    covered_chemical: '',
    chemical_cas_number: '',
    psm_element: 'process_hazard_analysis' as PSMElement,
    activity_type: 'audit' as PSMActivityType,
    activity_description: '',
    activity_date: new Date().toISOString().split('T')[0],
    due_date: '',
    responsible_person: '',
    findings_count: '0',
    critical_findings: '0',
    major_findings: '0',
    minor_findings: '0',
    notes: '',
  });

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch =
        r.record_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.process_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.covered_chemical.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: records.length,
    open: records.filter(r => r.status === 'open' || r.status === 'in_progress').length,
    overdue: records.filter(r => r.status === 'overdue').length,
    completed: records.filter(r => r.status === 'completed').length,
  }), [records]);

  const resetForm = () => {
    setFormData({
      process_name: '',
      process_area: '',
      covered_chemical: '',
      chemical_cas_number: '',
      psm_element: 'process_hazard_analysis',
      activity_type: 'audit',
      activity_description: '',
      activity_date: new Date().toISOString().split('T')[0],
      due_date: '',
      responsible_person: '',
      findings_count: '0',
      critical_findings: '0',
      major_findings: '0',
      minor_findings: '0',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.process_name.trim() || !formData.covered_chemical.trim() || !formData.activity_description.trim()) {
      Alert.alert('Error', 'Process name, covered chemical, and activity description are required');
      return;
    }

    try {
      const payload = {
        record_number: generateNumber(),
        facility_id: null,
        facility_name: null,
        process_name: formData.process_name,
        process_area: formData.process_area || null,
        covered_chemical: formData.covered_chemical,
        chemical_cas_number: formData.chemical_cas_number || null,
        threshold_quantity_lbs: null,
        actual_quantity_lbs: null,
        psm_element: formData.psm_element,
        activity_type: formData.activity_type,
        activity_description: formData.activity_description,
        activity_date: formData.activity_date,
        due_date: formData.due_date || null,
        completion_date: null,
        next_due_date: null,
        responsible_person: formData.responsible_person || 'Unassigned',
        responsible_person_id: null,
        participants: [],
        contractor_involvement: false,
        contractor_names: [],
        findings_count: parseInt(formData.findings_count) || 0,
        findings: [],
        critical_findings: parseInt(formData.critical_findings) || 0,
        major_findings: parseInt(formData.major_findings) || 0,
        minor_findings: parseInt(formData.minor_findings) || 0,
        corrective_actions_required: 0,
        corrective_actions_completed: 0,
        corrective_actions: [],
        documentation_updated: false,
        documents_reviewed: [],
        documents_updated: [],
        verified: false,
        verified_by: null,
        verified_by_id: null,
        verified_date: null,
        osha_citation_related: false,
        citation_number: null,
        epa_rmp_related: false,
        status: 'open' as PSMStatus,
        notes: formData.notes || null,
        attachments: [],
        created_by: 'Current User',
        created_by_id: null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'PSM compliance record created successfully');
    } catch (err) {
      console.error('Error creating record:', err);
      Alert.alert('Error', 'Failed to create record');
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
      backgroundColor: '#DC2626',
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
    recordNumber: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    elementText: {
      fontSize: 12,
      color: colors.primary,
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
    processName: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 4,
    },
    chemicalBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: '#DC262620',
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    chemicalText: {
      fontSize: 12,
      color: '#DC2626',
      fontWeight: '500' as const,
    },
    findingsRow: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8,
    },
    findingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    findingText: {
      fontSize: 11,
      fontWeight: '600' as const,
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
    elementSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    elementOption: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    elementOptionSelected: {
      borderColor: colors.primary,
    },
    elementOptionText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    elementOptionTextSelected: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
    activitySelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    activityOption: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    activityOptionSelected: {
      borderColor: colors.primary,
    },
    activityOptionText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    activityOptionTextSelected: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
    submitButton: {
      backgroundColor: '#DC2626',
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
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.overdue}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search records..."
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
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Shield size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No PSM Records</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first PSM compliance record'}
            </Text>
          </View>
        ) : (
          filteredRecords.map(record => (
            <TouchableOpacity
              key={record.id}
              style={styles.card}
              onPress={() => {
                setSelectedRecord(record);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordNumber}>{record.record_number}</Text>
                  <Text style={styles.elementText}>{PSM_ELEMENT_LABELS[record.psm_element]}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: PSM_STATUS_COLORS[record.status] + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: PSM_STATUS_COLORS[record.status] }]}>
                    {PSM_STATUS_LABELS[record.status]}
                  </Text>
                </View>
              </View>

              <Text style={styles.processName}>{record.process_name}</Text>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <FileText size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{ACTIVITY_TYPE_LABELS[record.activity_type]}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {new Date(record.activity_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{record.responsible_person}</Text>
                </View>
              </View>

              <View style={styles.chemicalBadge}>
                <Beaker size={14} color="#DC2626" />
                <Text style={styles.chemicalText}>{record.covered_chemical}</Text>
              </View>

              {(record.critical_findings > 0 || record.major_findings > 0 || record.minor_findings > 0) && (
                <View style={styles.findingsRow}>
                  {record.critical_findings > 0 && (
                    <View style={[styles.findingBadge, { backgroundColor: '#DC262620' }]}>
                      <AlertTriangle size={12} color="#DC2626" />
                      <Text style={[styles.findingText, { color: '#DC2626' }]}>
                        {record.critical_findings} Critical
                      </Text>
                    </View>
                  )}
                  {record.major_findings > 0 && (
                    <View style={[styles.findingBadge, { backgroundColor: '#F59E0B20' }]}>
                      <Text style={[styles.findingText, { color: '#F59E0B' }]}>
                        {record.major_findings} Major
                      </Text>
                    </View>
                  )}
                  {record.minor_findings > 0 && (
                    <View style={[styles.findingBadge, { backgroundColor: '#3B82F620' }]}>
                      <Text style={[styles.findingText, { color: '#3B82F6' }]}>
                        {record.minor_findings} Minor
                      </Text>
                    </View>
                  )}
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
              <Text style={styles.modalTitle}>New PSM Compliance Record</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Process Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Process Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.process_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, process_name: text }))}
                    placeholder="e.g., Ammonia Refrigeration"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Process Area</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.process_area}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, process_area: text }))}
                    placeholder="e.g., Engine Room"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Covered Chemical *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.covered_chemical}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, covered_chemical: text }))}
                      placeholder="Anhydrous Ammonia"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>CAS Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.chemical_cas_number}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, chemical_cas_number: text }))}
                      placeholder="7664-41-7"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>PSM Element</Text>
                <View style={styles.elementSelector}>
                  {(Object.keys(PSM_ELEMENT_LABELS) as PSMElement[]).slice(0, 8).map(el => (
                    <TouchableOpacity
                      key={el}
                      style={[
                        styles.elementOption,
                        formData.psm_element === el && styles.elementOptionSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, psm_element: el }))}
                    >
                      <Text style={[
                        styles.elementOptionText,
                        formData.psm_element === el && styles.elementOptionTextSelected,
                      ]}>
                        {PSM_ELEMENT_LABELS[el]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Activity Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Activity Type</Text>
                  <View style={styles.activitySelector}>
                    {(Object.keys(ACTIVITY_TYPE_LABELS) as PSMActivityType[]).slice(0, 6).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.activityOption,
                          formData.activity_type === type && styles.activityOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, activity_type: type }))}
                      >
                        <Text style={[
                          styles.activityOptionText,
                          formData.activity_type === type && styles.activityOptionTextSelected,
                        ]}>
                          {ACTIVITY_TYPE_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Activity Description *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.activity_description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, activity_description: text }))}
                    placeholder="Describe the activity..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Activity Date *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.activity_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, activity_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Due Date</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.due_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, due_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Responsible Person</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.responsible_person}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, responsible_person: text }))}
                    placeholder="Person name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Findings</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Critical Findings</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.critical_findings}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, critical_findings: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Major Findings</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.major_findings}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, major_findings: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Minor Findings</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.minor_findings}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, minor_findings: text }))}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
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
                  {isCreating ? 'Creating...' : 'Create Record'}
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
              <Text style={styles.modalTitle}>Record Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedRecord && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Record Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Record #</Text>
                      <Text style={styles.detailValue}>{selectedRecord.record_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: PSM_STATUS_COLORS[selectedRecord.status] }]}>
                        {PSM_STATUS_LABELS[selectedRecord.status]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>PSM Element</Text>
                      <Text style={styles.detailValue}>{PSM_ELEMENT_LABELS[selectedRecord.psm_element]}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Activity Type</Text>
                      <Text style={styles.detailValue}>{ACTIVITY_TYPE_LABELS[selectedRecord.activity_type]}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Process</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Process Name</Text>
                      <Text style={styles.detailValue}>{selectedRecord.process_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Chemical</Text>
                      <Text style={styles.detailValue}>{selectedRecord.covered_chemical}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Activity</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{new Date(selectedRecord.activity_date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Responsible</Text>
                      <Text style={styles.detailValue}>{selectedRecord.responsible_person}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={styles.detailValue}>{selectedRecord.activity_description}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Findings</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Critical</Text>
                      <Text style={[styles.detailValue, { color: '#DC2626' }]}>{selectedRecord.critical_findings}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Major</Text>
                      <Text style={[styles.detailValue, { color: '#F59E0B' }]}>{selectedRecord.major_findings}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Minor</Text>
                      <Text style={[styles.detailValue, { color: '#3B82F6' }]}>{selectedRecord.minor_findings}</Text>
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
                All Records
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(PSM_STATUS_LABELS) as PSMStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {PSM_STATUS_LABELS[status]}
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
