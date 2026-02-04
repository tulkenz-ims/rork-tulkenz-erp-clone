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
import { useContractorPrequals } from '@/hooks/useContractorSafety';
import {
  ContractorPrequal,
  ContractorReference,
  PrequalStatus,
  RiskLevel,
  PREQUAL_STATUS_LABELS,
  PREQUAL_STATUS_COLORS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  WORK_TYPES,
} from '@/types/contractorSafety';
import {
  Plus,
  Search,
  Filter,
  Building2,
  Phone,
  Mail,
  MapPin,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  X,
  FileText,
  Users,
  Calendar,
  Star,
} from 'lucide-react-native';

export default function ContractorPrequalScreen() {
  const { colors } = useTheme();
  const {
    prequals,
    isLoading,
    isRefetching,
    createPrequal,
    updatePrequal,
    deletePrequal,
    isCreating,
    generatePrequalNumber,
    refetch,
  } = useContractorPrequals();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PrequalStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPrequal, setSelectedPrequal] = useState<ContractorPrequal | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    company_address: '',
    company_city: '',
    company_state: '',
    company_zip: '',
    company_phone: '',
    company_email: '',
    primary_contact_name: '',
    primary_contact_title: '',
    primary_contact_phone: '',
    primary_contact_email: '',
    services_provided: [] as string[],
    work_types: [] as string[],
    years_in_business: '',
    employee_count: '',
    safety_program: false,
    drug_testing_program: false,
    emr_rate: '',
    trir_rate: '',
    experience_description: '',
  });

  const filteredPrequals = useMemo(() => {
    return prequals.filter(p => {
      const matchesSearch = 
        p.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.prequal_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.primary_contact_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [prequals, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: prequals.length,
    approved: prequals.filter(p => p.status === 'approved' || p.status === 'conditionally_approved').length,
    pending: prequals.filter(p => p.status === 'pending' || p.status === 'under_review').length,
    expired: prequals.filter(p => p.status === 'expired').length,
  }), [prequals]);

  const resetForm = () => {
    setFormData({
      company_name: '',
      company_address: '',
      company_city: '',
      company_state: '',
      company_zip: '',
      company_phone: '',
      company_email: '',
      primary_contact_name: '',
      primary_contact_title: '',
      primary_contact_phone: '',
      primary_contact_email: '',
      services_provided: [],
      work_types: [],
      years_in_business: '',
      employee_count: '',
      safety_program: false,
      drug_testing_program: false,
      emr_rate: '',
      trir_rate: '',
      experience_description: '',
    });
    setSelectedPrequal(null);
  };

  const handleSubmit = async () => {
    if (!formData.company_name.trim() || !formData.primary_contact_name.trim()) {
      Alert.alert('Error', 'Company name and primary contact are required');
      return;
    }

    try {
      const payload = {
        prequal_number: generatePrequalNumber(),
        company_name: formData.company_name,
        company_address: formData.company_address || null,
        company_city: formData.company_city || null,
        company_state: formData.company_state || null,
        company_zip: formData.company_zip || null,
        company_phone: formData.company_phone || null,
        company_email: formData.company_email || null,
        company_website: null,
        tax_id: null,
        duns_number: null,
        years_in_business: formData.years_in_business ? parseInt(formData.years_in_business) : null,
        employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
        primary_contact_name: formData.primary_contact_name,
        primary_contact_title: formData.primary_contact_title || null,
        primary_contact_phone: formData.primary_contact_phone || null,
        primary_contact_email: formData.primary_contact_email || null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        services_provided: formData.services_provided,
        work_types: formData.work_types,
        experience_description: formData.experience_description || null,
        references: [] as ContractorReference[],
        safety_program: formData.safety_program,
        safety_manual_provided: false,
        emr_rate: formData.emr_rate ? parseFloat(formData.emr_rate) : null,
        trir_rate: formData.trir_rate ? parseFloat(formData.trir_rate) : null,
        dart_rate: null,
        osha_citations_3_years: null,
        fatalities_3_years: null,
        drug_testing_program: formData.drug_testing_program,
        background_check_program: false,
        safety_training_program: false,
        risk_level: 'medium' as RiskLevel,
        status: 'pending' as PrequalStatus,
        submitted_date: new Date().toISOString(),
        reviewed_by: null,
        reviewed_by_id: null,
        reviewed_date: null,
        review_notes: null,
        approved_by: null,
        approved_by_id: null,
        approved_date: null,
        expiration_date: null,
        rejection_reason: null,
        conditions: null,
        attachments: [],
        notes: null,
      };

      await createPrequal(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Pre-qualification submitted successfully');
    } catch (err) {
      console.error('Error creating pre-qualification:', err);
      Alert.alert('Error', 'Failed to submit pre-qualification');
    }
  };

  const handleApprove = async (prequal: ContractorPrequal) => {
    Alert.alert(
      'Approve Contractor',
      `Are you sure you want to approve ${prequal.company_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const expirationDate = new Date();
              expirationDate.setFullYear(expirationDate.getFullYear() + 1);
              
              await updatePrequal({
                id: prequal.id,
                status: 'approved',
                approved_date: new Date().toISOString(),
                expiration_date: expirationDate.toISOString(),
              });
              setShowDetailModal(false);
              Alert.alert('Success', 'Contractor approved successfully');
            } catch (err) {
              Alert.alert('Error', 'Failed to approve contractor');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (prequal: ContractorPrequal) => {
    Alert.prompt(
      'Reject Contractor',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              await updatePrequal({
                id: prequal.id,
                status: 'rejected',
                rejection_reason: reason || 'No reason provided',
              });
              setShowDetailModal(false);
              Alert.alert('Success', 'Contractor rejected');
            } catch (err) {
              Alert.alert('Error', 'Failed to reject contractor');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getStatusIcon = (status: PrequalStatus) => {
    switch (status) {
      case 'approved':
      case 'conditionally_approved':
        return <CheckCircle size={16} color={PREQUAL_STATUS_COLORS[status]} />;
      case 'pending':
      case 'under_review':
        return <Clock size={16} color={PREQUAL_STATUS_COLORS[status]} />;
      case 'rejected':
      case 'expired':
        return <XCircle size={16} color={PREQUAL_STATUS_COLORS[status]} />;
      default:
        return null;
    }
  };

  const toggleWorkType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      work_types: prev.work_types.includes(type)
        ? prev.work_types.filter(t => t !== type)
        : [...prev.work_types, type],
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
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
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
      backgroundColor: colors.primary,
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
    companyName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      flex: 1,
    },
    prequalNumber: {
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
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    riskBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    riskText: {
      fontSize: 11,
      fontWeight: '600' as const,
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
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxLabel: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    workTypesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    workTypeChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    workTypeChipSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    workTypeChipText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    workTypeChipTextSelected: {
      color: colors.primary,
      fontWeight: '500' as const,
    },
    submitButton: {
      backgroundColor: colors.primary,
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
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
      marginBottom: 32,
    },
    approveButton: {
      flex: 1,
      backgroundColor: '#10B981',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    rejectButton: {
      flex: 1,
      backgroundColor: '#EF4444',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600' as const,
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
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.expired}</Text>
          <Text style={styles.statLabel}>Expired</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contractors..."
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
        {filteredPrequals.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Building2 size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Contractors Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first contractor pre-qualification'}
            </Text>
          </View>
        ) : (
          filteredPrequals.map(prequal => (
            <TouchableOpacity
              key={prequal.id}
              style={styles.card}
              onPress={() => {
                setSelectedPrequal(prequal);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyName}>{prequal.company_name}</Text>
                  <Text style={styles.prequalNumber}>{prequal.prequal_number}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: PREQUAL_STATUS_COLORS[prequal.status] + '20' },
                  ]}
                >
                  {getStatusIcon(prequal.status)}
                  <Text
                    style={[styles.statusText, { color: PREQUAL_STATUS_COLORS[prequal.status] }]}
                  >
                    {PREQUAL_STATUS_LABELS[prequal.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Users size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{prequal.primary_contact_name}</Text>
                </View>
                {prequal.company_phone && (
                  <View style={styles.infoRow}>
                    <Phone size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{prequal.company_phone}</Text>
                  </View>
                )}
                {prequal.company_email && (
                  <View style={styles.infoRow}>
                    <Mail size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{prequal.company_email}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View
                  style={[
                    styles.riskBadge,
                    { backgroundColor: RISK_LEVEL_COLORS[prequal.risk_level] + '20' },
                  ]}
                >
                  <AlertTriangle size={12} color={RISK_LEVEL_COLORS[prequal.risk_level]} />
                  <Text style={[styles.riskText, { color: RISK_LEVEL_COLORS[prequal.risk_level] }]}>
                    {RISK_LEVEL_LABELS[prequal.risk_level]}
                  </Text>
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

      {/* Form Modal */}
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
              <Text style={styles.modalTitle}>New Pre-Qualification</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Company Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Company Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.company_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, company_name: text }))}
                    placeholder="Enter company name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.company_address}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, company_address: text }))}
                    placeholder="Street address"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.company_city}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, company_city: text }))}
                      placeholder="City"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.company_state}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, company_state: text }))}
                      placeholder="State"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.company_phone}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, company_phone: text }))}
                      placeholder="Phone number"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.company_email}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, company_email: text }))}
                      placeholder="Email address"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Primary Contact</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contact Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.primary_contact_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, primary_contact_name: text }))}
                    placeholder="Full name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Title</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.primary_contact_title}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, primary_contact_title: text }))}
                      placeholder="Job title"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.primary_contact_phone}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, primary_contact_phone: text }))}
                      placeholder="Phone"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Company Details</Text>
                
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Years in Business</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.years_in_business}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, years_in_business: text }))}
                      placeholder="Years"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Employee Count</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.employee_count}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, employee_count: text }))}
                      placeholder="# Employees"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Work Types</Text>
                <View style={styles.workTypesGrid}>
                  {WORK_TYPES.slice(0, 12).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.workTypeChip,
                        formData.work_types.includes(type) && styles.workTypeChipSelected,
                      ]}
                      onPress={() => toggleWorkType(type)}
                    >
                      <Text
                        style={[
                          styles.workTypeChipText,
                          formData.work_types.includes(type) && styles.workTypeChipTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Safety Information</Text>
                
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, safety_program: !prev.safety_program }))}
                >
                  <View style={[styles.checkbox, formData.safety_program && styles.checkboxChecked]}>
                    {formData.safety_program && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Has Written Safety Program</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, drug_testing_program: !prev.drug_testing_program }))}
                >
                  <View style={[styles.checkbox, formData.drug_testing_program && styles.checkboxChecked]}>
                    {formData.drug_testing_program && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Has Drug Testing Program</Text>
                </TouchableOpacity>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>EMR Rate</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.emr_rate}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, emr_rate: text }))}
                      placeholder="e.g., 0.85"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>TRIR Rate</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.trir_rate}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, trir_rate: text }))}
                      placeholder="e.g., 2.5"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isCreating}
              >
                <Text style={styles.submitButtonText}>
                  {isCreating ? 'Submitting...' : 'Submit Pre-Qualification'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contractor Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedPrequal && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Company Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Company</Text>
                      <Text style={styles.detailValue}>{selectedPrequal.company_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Pre-Qual #</Text>
                      <Text style={styles.detailValue}>{selectedPrequal.prequal_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: PREQUAL_STATUS_COLORS[selectedPrequal.status] }]}>
                        {PREQUAL_STATUS_LABELS[selectedPrequal.status]}
                      </Text>
                    </View>
                    {selectedPrequal.company_address && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Address</Text>
                        <Text style={styles.detailValue}>
                          {selectedPrequal.company_address}
                          {selectedPrequal.company_city && `, ${selectedPrequal.company_city}`}
                          {selectedPrequal.company_state && `, ${selectedPrequal.company_state}`}
                        </Text>
                      </View>
                    )}
                    {selectedPrequal.company_phone && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>{selectedPrequal.company_phone}</Text>
                      </View>
                    )}
                    {selectedPrequal.company_email && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>{selectedPrequal.company_email}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Primary Contact</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedPrequal.primary_contact_name}</Text>
                    </View>
                    {selectedPrequal.primary_contact_title && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Title</Text>
                        <Text style={styles.detailValue}>{selectedPrequal.primary_contact_title}</Text>
                      </View>
                    )}
                    {selectedPrequal.primary_contact_phone && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>{selectedPrequal.primary_contact_phone}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Safety Metrics</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Risk Level</Text>
                      <Text style={[styles.detailValue, { color: RISK_LEVEL_COLORS[selectedPrequal.risk_level] }]}>
                        {RISK_LEVEL_LABELS[selectedPrequal.risk_level]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Safety Program</Text>
                      <Text style={styles.detailValue}>{selectedPrequal.safety_program ? 'Yes' : 'No'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Drug Testing</Text>
                      <Text style={styles.detailValue}>{selectedPrequal.drug_testing_program ? 'Yes' : 'No'}</Text>
                    </View>
                    {selectedPrequal.emr_rate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>EMR Rate</Text>
                        <Text style={styles.detailValue}>{selectedPrequal.emr_rate}</Text>
                      </View>
                    )}
                    {selectedPrequal.trir_rate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>TRIR Rate</Text>
                        <Text style={styles.detailValue}>{selectedPrequal.trir_rate}</Text>
                      </View>
                    )}
                  </View>

                  {(selectedPrequal.status === 'pending' || selectedPrequal.status === 'under_review') && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleApprove(selectedPrequal)}
                      >
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleReject(selectedPrequal)}
                      >
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
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
                All Contractors
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(PREQUAL_STATUS_LABELS) as PrequalStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {PREQUAL_STATUS_LABELS[status]}
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
