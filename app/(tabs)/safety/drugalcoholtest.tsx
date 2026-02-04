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
import { useDrugAlcoholTests } from '@/hooks/useRegulatoryCompliance';
import {
  DrugAlcoholTest,
  DrugTestStatus,
  DrugTestType,
  SpecimenType,
  DrugPanelType,
  DRUG_TEST_STATUS_LABELS,
  DRUG_TEST_STATUS_COLORS,
  DRUG_TEST_TYPE_LABELS,
} from '@/types/regulatoryCompliance';
import {
  Plus,
  Search,
  Filter,
  TestTube,
  Calendar,
  User,
  Building2,
  MapPin,
  ChevronRight,
  X,
  CheckCircle,
  AlertTriangle,
  Lock,
} from 'lucide-react-native';

const SPECIMEN_TYPE_LABELS: Record<SpecimenType, string> = {
  urine: 'Urine',
  hair: 'Hair',
  saliva: 'Saliva',
  blood: 'Blood',
  breath: 'Breath',
};

const PANEL_TYPE_LABELS: Record<DrugPanelType, string> = {
  '5_panel': '5-Panel',
  '7_panel': '7-Panel',
  '10_panel': '10-Panel',
  '12_panel': '12-Panel',
  custom: 'Custom',
  dot: 'DOT',
};

export default function DrugAlcoholTestScreen() {
  const { colors } = useTheme();
  const {
    tests,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useDrugAlcoholTests();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DrugTestStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<DrugAlcoholTest | null>(null);
  const [formData, setFormData] = useState({
    employee_name: '',
    department: '',
    job_title: '',
    is_candidate: false,
    test_date: new Date().toISOString().split('T')[0],
    test_type: 'random' as DrugTestType,
    test_reason: '',
    collection_site: '',
    specimen_type: 'urine' as SpecimenType,
    drug_panel_type: '10_panel' as DrugPanelType,
    alcohol_test_included: true,
    is_dot_test: false,
    notes: '',
  });

  const filteredTests = useMemo(() => {
    return tests.filter(t => {
      const matchesSearch =
        t.test_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.employee_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tests, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: tests.length,
    pending: tests.filter(t => t.status === 'pending' || t.status === 'collected').length,
    negative: tests.filter(t => t.drug_result === 'negative').length,
    positive: tests.filter(t => t.drug_result === 'positive').length,
  }), [tests]);

  const resetForm = () => {
    setFormData({
      employee_name: '',
      department: '',
      job_title: '',
      is_candidate: false,
      test_date: new Date().toISOString().split('T')[0],
      test_type: 'random',
      test_reason: '',
      collection_site: '',
      specimen_type: 'urine',
      drug_panel_type: '10_panel',
      alcohol_test_included: true,
      is_dot_test: false,
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.employee_name.trim() || !formData.collection_site.trim()) {
      Alert.alert('Error', 'Employee name and collection site are required');
      return;
    }

    try {
      const payload = {
        test_number: generateNumber(),
        employee_id: null,
        employee_name: formData.employee_name,
        employee_code: null,
        department: formData.department || null,
        job_title: formData.job_title || null,
        is_candidate: formData.is_candidate,
        candidate_name: formData.is_candidate ? formData.employee_name : null,
        facility_id: null,
        facility_name: null,
        test_date: formData.test_date,
        test_time: null,
        test_type: formData.test_type,
        test_reason: formData.test_reason || null,
        collection_site: formData.collection_site,
        collection_site_address: null,
        collector_name: null,
        specimen_type: formData.specimen_type,
        specimen_id: null,
        chain_of_custody_number: null,
        collection_time: null,
        drug_panel_type: formData.drug_panel_type,
        substances_tested: [],
        alcohol_test_included: formData.alcohol_test_included,
        alcohol_test_type: formData.alcohol_test_included ? 'breath' : null,
        bat_name: null,
        bat_certification: null,
        drug_result: null,
        alcohol_result: null,
        alcohol_level: null,
        positive_substances: [],
        mro_name: null,
        mro_phone: null,
        mro_review_date: null,
        mro_verified_result: null,
        mro_notes: null,
        is_dot_test: formData.is_dot_test,
        dot_mode: null,
        dot_reason_code: null,
        action_taken: null,
        action_date: null,
        action_details: null,
        follow_up_required: false,
        follow_up_date: null,
        follow_up_notes: null,
        employee_notified: false,
        employee_notified_date: null,
        supervisor_notified: false,
        supervisor_notified_date: null,
        hr_notified: false,
        hr_notified_date: null,
        access_restricted: true,
        authorized_viewers: [],
        status: 'scheduled' as DrugTestStatus,
        notes: formData.notes || null,
        confidential_notes: null,
        attachments: [],
        created_by: 'Current User',
        created_by_id: null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Drug/Alcohol test scheduled successfully');
    } catch (err) {
      console.error('Error creating test:', err);
      Alert.alert('Error', 'Failed to schedule test');
    }
  };

  const getResultColor = (result: string | null) => {
    switch (result) {
      case 'negative': return '#10B981';
      case 'positive': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
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
      backgroundColor: '#8B5CF6',
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
    testNumber: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    testType: {
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
    resultRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 12,
    },
    resultBadge: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      gap: 6,
    },
    resultText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    confidentialBadge: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
      backgroundColor: '#6B728020',
    },
    confidentialText: {
      fontSize: 11,
      color: '#6B7280',
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
      paddingVertical: 8,
      paddingHorizontal: 12,
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
      backgroundColor: '#8B5CF6',
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
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.negative}</Text>
          <Text style={styles.statLabel}>Negative</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.positive}</Text>
          <Text style={styles.statLabel}>Positive</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tests..."
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
        {filteredTests.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <TestTube size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Drug/Alcohol Tests</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Schedule your first test'}
            </Text>
          </View>
        ) : (
          filteredTests.map(test => (
            <TouchableOpacity
              key={test.id}
              style={styles.card}
              onPress={() => {
                setSelectedTest(test);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testNumber}>{test.test_number}</Text>
                  <Text style={styles.testType}>{DRUG_TEST_TYPE_LABELS[test.test_type]}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: DRUG_TEST_STATUS_COLORS[test.status] + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: DRUG_TEST_STATUS_COLORS[test.status] }]}>
                    {DRUG_TEST_STATUS_LABELS[test.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{test.employee_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {new Date(test.test_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{test.collection_site}</Text>
                </View>
                <View style={styles.infoRow}>
                  <TestTube size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {SPECIMEN_TYPE_LABELS[test.specimen_type]} - {test.drug_panel_type ? PANEL_TYPE_LABELS[test.drug_panel_type] : 'Standard'}
                  </Text>
                </View>
              </View>

              {test.status === 'completed' && (
                <View style={styles.resultRow}>
                  <View style={[styles.resultBadge, { backgroundColor: getResultColor(test.drug_result) + '20' }]}>
                    {test.drug_result === 'negative' ? (
                      <CheckCircle size={14} color={getResultColor(test.drug_result)} />
                    ) : test.drug_result === 'positive' ? (
                      <AlertTriangle size={14} color={getResultColor(test.drug_result)} />
                    ) : null}
                    <Text style={[styles.resultText, { color: getResultColor(test.drug_result) }]}>
                      Drug: {test.drug_result?.toUpperCase() || 'PENDING'}
                    </Text>
                  </View>
                  {test.alcohol_test_included && (
                    <View style={[styles.resultBadge, { backgroundColor: getResultColor(test.alcohol_result) + '20' }]}>
                      <Text style={[styles.resultText, { color: getResultColor(test.alcohol_result) }]}>
                        Alcohol: {test.alcohol_result?.toUpperCase() || 'PENDING'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {test.access_restricted && (
                <View style={styles.confidentialBadge}>
                  <Lock size={12} color="#6B7280" />
                  <Text style={styles.confidentialText}>Confidential</Text>
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
              <Text style={styles.modalTitle}>Schedule Drug/Alcohol Test</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Employee/Candidate Information</Text>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, is_candidate: !prev.is_candidate }))}
                >
                  <Text style={styles.switchLabel}>Pre-Employment (Candidate)?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.is_candidate ? '#8B5CF6' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.is_candidate ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{formData.is_candidate ? 'Candidate Name *' : 'Employee Name *'}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.employee_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, employee_name: text }))}
                    placeholder="Full name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                {!formData.is_candidate && (
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
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Test Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Test Date *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.test_date}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, test_date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Test Type</Text>
                  <View style={styles.typeSelector}>
                    {(Object.keys(DRUG_TEST_TYPE_LABELS) as DrugTestType[]).slice(0, 4).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          formData.test_type === type && styles.typeOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, test_type: type }))}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          formData.test_type === type && styles.typeOptionTextSelected,
                        ]}>
                          {DRUG_TEST_TYPE_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {formData.test_type === 'reasonable_suspicion' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Test Reason</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={formData.test_reason}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, test_reason: text }))}
                      placeholder="Reason for testing..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Collection Site *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.collection_site}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, collection_site: text }))}
                    placeholder="Collection facility name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Test Configuration</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Specimen Type</Text>
                  <View style={styles.typeSelector}>
                    {(Object.keys(SPECIMEN_TYPE_LABELS) as SpecimenType[]).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          formData.specimen_type === type && styles.typeOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, specimen_type: type }))}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          formData.specimen_type === type && styles.typeOptionTextSelected,
                        ]}>
                          {SPECIMEN_TYPE_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Drug Panel</Text>
                  <View style={styles.typeSelector}>
                    {(Object.keys(PANEL_TYPE_LABELS) as DrugPanelType[]).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          formData.drug_panel_type === type && styles.typeOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, drug_panel_type: type }))}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          formData.drug_panel_type === type && styles.typeOptionTextSelected,
                        ]}>
                          {PANEL_TYPE_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, alcohol_test_included: !prev.alcohol_test_included }))}
                >
                  <Text style={styles.switchLabel}>Include Alcohol Test?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.alcohol_test_included ? '#10B981' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.alcohol_test_included ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, is_dot_test: !prev.is_dot_test }))}
                >
                  <Text style={styles.switchLabel}>DOT-Regulated Test?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.is_dot_test ? '#3B82F6' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.is_dot_test ? 'flex-end' : 'flex-start' }]} />
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
                  {isCreating ? 'Scheduling...' : 'Schedule Test'}
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
              <Text style={styles.modalTitle}>Test Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedTest && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Test Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Test #</Text>
                      <Text style={styles.detailValue}>{selectedTest.test_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: DRUG_TEST_STATUS_COLORS[selectedTest.status] }]}>
                        {DRUG_TEST_STATUS_LABELS[selectedTest.status]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Test Type</Text>
                      <Text style={styles.detailValue}>{DRUG_TEST_TYPE_LABELS[selectedTest.test_type]}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Test Date</Text>
                      <Text style={styles.detailValue}>{new Date(selectedTest.test_date).toLocaleDateString()}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>{selectedTest.is_candidate ? 'Candidate' : 'Employee'}</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedTest.employee_name}</Text>
                    </View>
                    {selectedTest.department && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Department</Text>
                        <Text style={styles.detailValue}>{selectedTest.department}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Collection</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Site</Text>
                      <Text style={styles.detailValue}>{selectedTest.collection_site}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Specimen</Text>
                      <Text style={styles.detailValue}>{SPECIMEN_TYPE_LABELS[selectedTest.specimen_type]}</Text>
                    </View>
                    {selectedTest.drug_panel_type && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Panel</Text>
                        <Text style={styles.detailValue}>{PANEL_TYPE_LABELS[selectedTest.drug_panel_type]}</Text>
                      </View>
                    )}
                  </View>

                  {selectedTest.status === 'completed' && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Results</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Drug Result</Text>
                        <Text style={[styles.detailValue, { color: getResultColor(selectedTest.drug_result) }]}>
                          {selectedTest.drug_result?.toUpperCase() || 'N/A'}
                        </Text>
                      </View>
                      {selectedTest.alcohol_test_included && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Alcohol Result</Text>
                          <Text style={[styles.detailValue, { color: getResultColor(selectedTest.alcohol_result) }]}>
                            {selectedTest.alcohol_result?.toUpperCase() || 'N/A'}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
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
                All Tests
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(DRUG_TEST_STATUS_LABELS) as DrugTestStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {DRUG_TEST_STATUS_LABELS[status]}
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
