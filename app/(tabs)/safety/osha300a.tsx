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
import { useOSHA300ASummaries } from '@/hooks/useRegulatoryCompliance';
import {
  OSHA300ASummary,
  OSHA300AStatus,
  OSHA_STATUS_LABELS,
  OSHA_STATUS_COLORS,
} from '@/types/regulatoryCompliance';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Calendar,
  Building2,
  Users,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  CheckCircle,
  Award,
} from 'lucide-react-native';

export default function OSHA300AScreen() {
  const { colors } = useTheme();
  const {
    summaries,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useOSHA300ASummaries();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OSHA300AStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<OSHA300ASummary | null>(null);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    establishment_name: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    industry_description: '',
    naics_code: '',
    annual_average_employees: '',
    total_hours_worked: '',
    total_deaths: '0',
    total_days_away: '0',
    total_job_transfer_restriction: '0',
    total_other_recordable: '0',
    injury_total_cases: '0',
    skin_disorder_total: '0',
    respiratory_total: '0',
    poisoning_total: '0',
    hearing_loss_total: '0',
    other_illness_total: '0',
    certifying_official_name: '',
    certifying_official_title: '',
    certifying_official_phone: '',
    notes: '',
  });

  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => {
      const matchesSearch =
        s.summary_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.establishment_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.year.toString().includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [summaries, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: summaries.length,
    posted: summaries.filter(s => s.status === 'posted').length,
    pending: summaries.filter(s => s.status === 'pending_review' || s.status === 'draft').length,
    totalIncidents: summaries.reduce((sum, s) => 
      sum + s.total_deaths + s.total_days_away + s.total_job_transfer_restriction + s.total_other_recordable, 0),
  }), [summaries]);

  const resetForm = () => {
    setFormData({
      year: new Date().getFullYear(),
      establishment_name: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      industry_description: '',
      naics_code: '',
      annual_average_employees: '',
      total_hours_worked: '',
      total_deaths: '0',
      total_days_away: '0',
      total_job_transfer_restriction: '0',
      total_other_recordable: '0',
      injury_total_cases: '0',
      skin_disorder_total: '0',
      respiratory_total: '0',
      poisoning_total: '0',
      hearing_loss_total: '0',
      other_illness_total: '0',
      certifying_official_name: '',
      certifying_official_title: '',
      certifying_official_phone: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.establishment_name.trim()) {
      Alert.alert('Error', 'Establishment name is required');
      return;
    }

    try {
      const payload = {
        summary_number: generateNumber(),
        year: formData.year,
        facility_id: null,
        facility_name: null,
        establishment_name: formData.establishment_name,
        street_address: formData.street_address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        industry_description: formData.industry_description || null,
        sic_code: null,
        naics_code: formData.naics_code || null,
        annual_average_employees: parseInt(formData.annual_average_employees) || 0,
        total_hours_worked: parseInt(formData.total_hours_worked) || 0,
        total_deaths: parseInt(formData.total_deaths) || 0,
        total_days_away: parseInt(formData.total_days_away) || 0,
        total_job_transfer_restriction: parseInt(formData.total_job_transfer_restriction) || 0,
        total_other_recordable: parseInt(formData.total_other_recordable) || 0,
        injury_total_cases: parseInt(formData.injury_total_cases) || 0,
        injury_days_away: 0,
        injury_job_transfer: 0,
        injury_other_recordable: 0,
        skin_disorder_total: parseInt(formData.skin_disorder_total) || 0,
        skin_disorder_days_away: 0,
        skin_disorder_job_transfer: 0,
        skin_disorder_other_recordable: 0,
        respiratory_total: parseInt(formData.respiratory_total) || 0,
        respiratory_days_away: 0,
        respiratory_job_transfer: 0,
        respiratory_other_recordable: 0,
        poisoning_total: parseInt(formData.poisoning_total) || 0,
        poisoning_days_away: 0,
        poisoning_job_transfer: 0,
        poisoning_other_recordable: 0,
        hearing_loss_total: parseInt(formData.hearing_loss_total) || 0,
        hearing_loss_days_away: 0,
        hearing_loss_job_transfer: 0,
        hearing_loss_other_recordable: 0,
        other_illness_total: parseInt(formData.other_illness_total) || 0,
        other_illness_days_away: 0,
        other_illness_job_transfer: 0,
        other_illness_other_recordable: 0,
        certifying_official_name: formData.certifying_official_name || null,
        certifying_official_title: formData.certifying_official_title || null,
        certifying_official_phone: formData.certifying_official_phone || null,
        certification_date: null,
        posting_start_date: null,
        posting_end_date: null,
        posted_by: null,
        posted_by_id: null,
        status: 'draft' as OSHA300AStatus,
        notes: formData.notes || null,
        attachments: [],
        created_by: 'Current User',
        created_by_id: null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'OSHA 300A Summary created successfully');
    } catch (err) {
      console.error('Error creating summary:', err);
      Alert.alert('Error', 'Failed to create summary');
    }
  };

  const getTotalRecordables = (s: OSHA300ASummary) => {
    return s.total_deaths + s.total_days_away + s.total_job_transfer_restriction + s.total_other_recordable;
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
      backgroundColor: '#3B82F6',
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
    summaryNumber: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    yearText: {
      fontSize: 18,
      fontWeight: '700' as const,
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
    metricsRow: {
      flexDirection: 'row',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    metricItem: {
      flex: 1,
      alignItems: 'center',
      padding: 8,
      backgroundColor: colors.background,
      borderRadius: 8,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    metricLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: 12,
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
    submitButton: {
      backgroundColor: '#3B82F6',
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
      width: 140,
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
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.posted}</Text>
          <Text style={styles.statLabel}>Posted</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.totalIncidents}</Text>
          <Text style={styles.statLabel}>Incidents</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search summaries..."
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
        {filteredSummaries.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FileText size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No OSHA 300A Summaries</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first annual summary'}
            </Text>
          </View>
        ) : (
          filteredSummaries.map(summary => (
            <TouchableOpacity
              key={summary.id}
              style={styles.card}
              onPress={() => {
                setSelectedSummary(summary);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryNumber}>{summary.summary_number}</Text>
                  <Text style={styles.yearText}>{summary.year}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: OSHA_STATUS_COLORS[summary.status] + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: OSHA_STATUS_COLORS[summary.status] }]}>
                    {OSHA_STATUS_LABELS[summary.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Building2 size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{summary.establishment_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Users size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {summary.annual_average_employees.toLocaleString()} employees
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Clock size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {summary.total_hours_worked.toLocaleString()} hours worked
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#EF4444' }]}>{summary.total_deaths}</Text>
                  <Text style={styles.metricLabel}>Deaths</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{summary.total_days_away}</Text>
                  <Text style={styles.metricLabel}>Days Away</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#3B82F6' }]}>{summary.total_job_transfer_restriction}</Text>
                  <Text style={styles.metricLabel}>Transfers</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#6B7280' }]}>{summary.total_other_recordable}</Text>
                  <Text style={styles.metricLabel}>Other</Text>
                </View>
              </View>

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
              <Text style={styles.modalTitle}>New OSHA 300A Summary</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Establishment Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Year *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.year.toString()}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, year: parseInt(text) || new Date().getFullYear() }))}
                    keyboardType="numeric"
                    placeholder="2024"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Establishment Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.establishment_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, establishment_name: text }))}
                    placeholder="Company/Facility Name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Street Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.street_address}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, street_address: text }))}
                    placeholder="123 Main Street"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.city}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                      placeholder="City"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.thirdWidth}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.state}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, state: text }))}
                      placeholder="TX"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.thirdWidth}>
                    <Text style={styles.inputLabel}>ZIP</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.zip_code}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, zip_code: text }))}
                      placeholder="12345"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Industry Description</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.industry_description}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, industry_description: text }))}
                      placeholder="Manufacturing"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>NAICS Code</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.naics_code}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, naics_code: text }))}
                      placeholder="311999"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Employment Information</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Annual Avg Employees</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.annual_average_employees}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, annual_average_employees: text }))}
                      placeholder="100"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Total Hours Worked</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.total_hours_worked}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, total_hours_worked: text }))}
                      placeholder="200000"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Injury/Illness Summary</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Total Deaths (G)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.total_deaths}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, total_deaths: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Days Away (H)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.total_days_away}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, total_days_away: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Job Transfer/Restrict (I)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.total_job_transfer_restriction}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, total_job_transfer_restriction: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Other Recordable (J)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.total_other_recordable}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, total_other_recordable: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Illness Categories</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Injuries</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.injury_total_cases}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, injury_total_cases: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Skin Disorders</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.skin_disorder_total}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, skin_disorder_total: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Respiratory</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.respiratory_total}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, respiratory_total: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Poisoning</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.poisoning_total}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, poisoning_total: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Hearing Loss</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.hearing_loss_total}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, hearing_loss_total: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Other Illnesses</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.other_illness_total}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, other_illness_total: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Certification</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Certifying Official Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.certifying_official_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, certifying_official_name: text }))}
                    placeholder="John Smith"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Title</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.certifying_official_title}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, certifying_official_title: text }))}
                      placeholder="Safety Manager"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.certifying_official_phone}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, certifying_official_phone: text }))}
                      placeholder="(555) 123-4567"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                    />
                  </View>
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
                  {isCreating ? 'Creating...' : 'Create Summary'}
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
              <Text style={styles.modalTitle}>Summary Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedSummary && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Summary Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Number</Text>
                      <Text style={styles.detailValue}>{selectedSummary.summary_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Year</Text>
                      <Text style={styles.detailValue}>{selectedSummary.year}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: OSHA_STATUS_COLORS[selectedSummary.status] }]}>
                        {OSHA_STATUS_LABELS[selectedSummary.status]}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Establishment</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedSummary.establishment_name}</Text>
                    </View>
                    {selectedSummary.street_address && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Address</Text>
                        <Text style={styles.detailValue}>
                          {selectedSummary.street_address}, {selectedSummary.city}, {selectedSummary.state} {selectedSummary.zip_code}
                        </Text>
                      </View>
                    )}
                    {selectedSummary.naics_code && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>NAICS Code</Text>
                        <Text style={styles.detailValue}>{selectedSummary.naics_code}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Employment Data</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Avg Employees</Text>
                      <Text style={styles.detailValue}>{selectedSummary.annual_average_employees.toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Hours Worked</Text>
                      <Text style={styles.detailValue}>{selectedSummary.total_hours_worked.toLocaleString()}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Injury/Illness Summary</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Deaths (G)</Text>
                      <Text style={styles.detailValue}>{selectedSummary.total_deaths}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Days Away (H)</Text>
                      <Text style={styles.detailValue}>{selectedSummary.total_days_away}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Job Transfer (I)</Text>
                      <Text style={styles.detailValue}>{selectedSummary.total_job_transfer_restriction}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Other (J)</Text>
                      <Text style={styles.detailValue}>{selectedSummary.total_other_recordable}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Recordable</Text>
                      <Text style={[styles.detailValue, { fontWeight: '600' as const }]}>
                        {getTotalRecordables(selectedSummary)}
                      </Text>
                    </View>
                  </View>

                  {selectedSummary.certifying_official_name && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Certification</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Official</Text>
                        <Text style={styles.detailValue}>{selectedSummary.certifying_official_name}</Text>
                      </View>
                      {selectedSummary.certifying_official_title && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Title</Text>
                          <Text style={styles.detailValue}>{selectedSummary.certifying_official_title}</Text>
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
                All Summaries
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(OSHA_STATUS_LABELS) as OSHA300AStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {OSHA_STATUS_LABELS[status]}
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
