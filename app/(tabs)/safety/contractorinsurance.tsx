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
import { useContractorInsurance } from '@/hooks/useContractorSafety';
import {
  ContractorInsurance,
  InsuranceType,
  InsuranceStatus,
  INSURANCE_TYPE_LABELS,
  INSURANCE_STATUS_LABELS,
  INSURANCE_STATUS_COLORS,
} from '@/types/contractorSafety';
import {
  Plus,
  Search,
  Filter,
  Shield,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  ChevronRight,
  X,
  AlertTriangle,
  Clock,
} from 'lucide-react-native';

export default function ContractorInsuranceScreen() {
  const { colors } = useTheme();
  const {
    insurance,
    activeInsurance,
    expiringInsurance,
    isRefetching,
    createInsurance,
    verifyInsurance,
    isCreating,
    getInsuranceStatus,
    refetch,
  } = useContractorInsurance();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<InsuranceType | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<ContractorInsurance | null>(null);
  const [formData, setFormData] = useState({
    contractor_company: '',
    insurance_type: 'general_liability' as InsuranceType,
    policy_number: '',
    carrier_name: '',
    carrier_phone: '',
    agent_name: '',
    agent_phone: '',
    agent_email: '',
    coverage_amount: '',
    deductible: '',
    effective_date: new Date().toISOString().split('T')[0],
    expiration_date: '',
    additional_insured: false,
    waiver_of_subrogation: false,
    primary_noncontributory: false,
  });

  const filteredInsurance = useMemo(() => {
    return insurance.filter(i => {
      const matchesSearch = 
        i.contractor_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.policy_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.carrier_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || i.insurance_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [insurance, searchQuery, typeFilter]);

  const stats = useMemo(() => ({
    total: insurance.length,
    active: activeInsurance.length,
    expiring: expiringInsurance.length,
    expired: insurance.filter(i => getInsuranceStatus(i) === 'expired').length,
  }), [insurance, activeInsurance, expiringInsurance, getInsuranceStatus]);

  const resetForm = () => {
    setFormData({
      contractor_company: '',
      insurance_type: 'general_liability',
      policy_number: '',
      carrier_name: '',
      carrier_phone: '',
      agent_name: '',
      agent_phone: '',
      agent_email: '',
      coverage_amount: '',
      deductible: '',
      effective_date: new Date().toISOString().split('T')[0],
      expiration_date: '',
      additional_insured: false,
      waiver_of_subrogation: false,
      primary_noncontributory: false,
    });
    setSelectedInsurance(null);
  };

  const handleSubmit = async () => {
    if (!formData.contractor_company.trim() || !formData.policy_number.trim() || !formData.carrier_name.trim()) {
      Alert.alert('Error', 'Company, policy number, and carrier are required');
      return;
    }

    if (!formData.expiration_date || !formData.coverage_amount) {
      Alert.alert('Error', 'Expiration date and coverage amount are required');
      return;
    }

    try {
      const payload = {
        contractor_id: null,
        contractor_company: formData.contractor_company,
        insurance_type: formData.insurance_type,
        policy_number: formData.policy_number,
        carrier_name: formData.carrier_name,
        carrier_phone: formData.carrier_phone || null,
        carrier_address: null,
        agent_name: formData.agent_name || null,
        agent_phone: formData.agent_phone || null,
        agent_email: formData.agent_email || null,
        coverage_amount: parseFloat(formData.coverage_amount),
        deductible: formData.deductible ? parseFloat(formData.deductible) : null,
        aggregate_limit: null,
        per_occurrence_limit: null,
        effective_date: formData.effective_date,
        expiration_date: formData.expiration_date,
        additional_insured: formData.additional_insured,
        additional_insured_name: null,
        waiver_of_subrogation: formData.waiver_of_subrogation,
        primary_noncontributory: formData.primary_noncontributory,
        certificate_holder: null,
        certificate_number: null,
        certificate_url: null,
        certificate_uploaded_at: null,
        verified: false,
        verified_by: null,
        verified_by_id: null,
        verified_date: null,
        verification_method: null,
        status: 'pending_verification' as InsuranceStatus,
        renewal_reminder_sent: false,
        renewal_reminder_date: null,
        notes: null,
      };

      await createInsurance(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Insurance record added successfully');
    } catch (err) {
      console.error('Error creating insurance:', err);
      Alert.alert('Error', 'Failed to add insurance record');
    }
  };

  const handleVerify = async (ins: ContractorInsurance) => {
    Alert.alert(
      'Verify Insurance',
      `Verify insurance for ${ins.contractor_company}?\n\nPolicy: ${ins.policy_number}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            try {
              await verifyInsurance({
                id: ins.id,
                verified_by: 'Current User',
                verification_method: 'Manual verification',
              });
              setShowDetailModal(false);
              Alert.alert('Success', 'Insurance verified successfully');
            } catch (err) {
              Alert.alert('Error', 'Failed to verify insurance');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diff = expDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const insuranceTypes: { value: InsuranceType; label: string }[] = [
    { value: 'general_liability', label: 'General Liability' },
    { value: 'workers_comp', label: "Workers' Comp" },
    { value: 'auto_liability', label: 'Auto Liability' },
    { value: 'umbrella', label: 'Umbrella/Excess' },
    { value: 'professional_liability', label: 'Professional' },
    { value: 'pollution_liability', label: 'Pollution' },
    { value: 'builders_risk', label: "Builder's Risk" },
    { value: 'other', label: 'Other' },
  ];

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
    policyNumber: {
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
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.primary + '20',
    },
    typeText: {
      fontSize: 11,
      fontWeight: '500' as const,
      color: colors.primary,
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
    expirationWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      padding: 8,
      borderRadius: 6,
    },
    expirationText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
    },
    verifiedText: {
      fontSize: 12,
      color: '#10B981',
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
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeOptionSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    typeOptionText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    typeOptionTextSelected: {
      color: colors.primary,
      fontWeight: '500' as const,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
    coverageCard: {
      backgroundColor: colors.primary + '10',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      alignItems: 'center',
    },
    coverageLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    coverageValue: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.primary,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
      marginBottom: 32,
    },
    verifyButton: {
      flex: 1,
      backgroundColor: '#10B981',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    endorsementsSection: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    endorsementItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 6,
    },
    endorsementText: {
      fontSize: 12,
      fontWeight: '500' as const,
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
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.expiring}</Text>
          <Text style={styles.statLabel}>Expiring</Text>
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
            placeholder="Search insurance..."
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
        {filteredInsurance.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Shield size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Insurance Records Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || typeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first insurance record'}
            </Text>
          </View>
        ) : (
          filteredInsurance.map(ins => {
            const status = getInsuranceStatus(ins);
            const daysUntilExpiration = getDaysUntilExpiration(ins.expiration_date);
            
            return (
              <TouchableOpacity
                key={ins.id}
                style={styles.card}
                onPress={() => {
                  setSelectedInsurance(ins);
                  setShowDetailModal(true);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.companyName}>{ins.contractor_company}</Text>
                    <Text style={styles.policyNumber}>{ins.policy_number}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: INSURANCE_STATUS_COLORS[status] + '20' },
                    ]}
                  >
                    {status === 'active' && <CheckCircle size={14} color={INSURANCE_STATUS_COLORS[status]} />}
                    {status === 'expiring_soon' && <AlertTriangle size={14} color={INSURANCE_STATUS_COLORS[status]} />}
                    {status === 'expired' && <XCircle size={14} color={INSURANCE_STATUS_COLORS[status]} />}
                    {status === 'pending_verification' && <Clock size={14} color={INSURANCE_STATUS_COLORS[status]} />}
                    <Text
                      style={[styles.statusText, { color: INSURANCE_STATUS_COLORS[status] }]}
                    >
                      {INSURANCE_STATUS_LABELS[status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Building2 size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{ins.carrier_name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <DollarSign size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{formatCurrency(ins.coverage_amount)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Calendar size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>
                      Expires: {new Date(ins.expiration_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {daysUntilExpiration <= 30 && daysUntilExpiration > 0 && (
                  <View style={[styles.expirationWarning, { backgroundColor: '#F59E0B20' }]}>
                    <AlertTriangle size={14} color="#F59E0B" />
                    <Text style={[styles.expirationText, { color: '#F59E0B' }]}>
                      Expires in {daysUntilExpiration} days
                    </Text>
                  </View>
                )}

                {daysUntilExpiration <= 0 && (
                  <View style={[styles.expirationWarning, { backgroundColor: '#EF444420' }]}>
                    <XCircle size={14} color="#EF4444" />
                    <Text style={[styles.expirationText, { color: '#EF4444' }]}>
                      Expired {Math.abs(daysUntilExpiration)} days ago
                    </Text>
                  </View>
                )}

                {ins.verified && (
                  <View style={styles.verifiedBadge}>
                    <CheckCircle size={14} color="#10B981" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{INSURANCE_TYPE_LABELS[ins.insurance_type]}</Text>
                  </View>
                  <View style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>Details</Text>
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
              <Text style={styles.modalTitle}>Add Insurance Record</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Contractor Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contractor Company *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.contractor_company}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, contractor_company: text }))}
                    placeholder="Company name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Insurance Type</Text>
                <View style={styles.typeSelector}>
                  {insuranceTypes.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        formData.insurance_type === type.value && styles.typeOptionSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, insurance_type: type.value }))}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          formData.insurance_type === type.value && styles.typeOptionTextSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Policy Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Policy Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.policy_number}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, policy_number: text }))}
                    placeholder="Policy number"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Carrier Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.carrier_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, carrier_name: text }))}
                    placeholder="Insurance carrier"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Carrier Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.carrier_phone}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, carrier_phone: text }))}
                    placeholder="Phone number"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Agent Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Agent Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.agent_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, agent_name: text }))}
                    placeholder="Agent name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Agent Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.agent_phone}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, agent_phone: text }))}
                      placeholder="Phone"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Agent Email</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.agent_email}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, agent_email: text }))}
                      placeholder="Email"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Coverage Details</Text>
                
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Coverage Amount *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.coverage_amount}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, coverage_amount: text }))}
                      placeholder="1000000"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Deductible</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.deductible}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, deductible: text }))}
                      placeholder="5000"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

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
                    <Text style={styles.inputLabel}>Expiration Date *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.expiration_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, expiration_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Endorsements</Text>
                
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, additional_insured: !prev.additional_insured }))}
                >
                  <View style={[styles.checkbox, formData.additional_insured && styles.checkboxChecked]}>
                    {formData.additional_insured && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Additional Insured</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, waiver_of_subrogation: !prev.waiver_of_subrogation }))}
                >
                  <View style={[styles.checkbox, formData.waiver_of_subrogation && styles.checkboxChecked]}>
                    {formData.waiver_of_subrogation && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Waiver of Subrogation</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, primary_noncontributory: !prev.primary_noncontributory }))}
                >
                  <View style={[styles.checkbox, formData.primary_noncontributory && styles.checkboxChecked]}>
                    {formData.primary_noncontributory && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Primary & Non-Contributory</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isCreating}
              >
                <Text style={styles.submitButtonText}>
                  {isCreating ? 'Adding...' : 'Add Insurance Record'}
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
              <Text style={styles.modalTitle}>Insurance Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedInsurance && (
                <>
                  <View style={styles.coverageCard}>
                    <Text style={styles.coverageLabel}>Coverage Amount</Text>
                    <Text style={styles.coverageValue}>
                      {formatCurrency(selectedInsurance.coverage_amount)}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Policy Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contractor</Text>
                      <Text style={styles.detailValue}>{selectedInsurance.contractor_company}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>{INSURANCE_TYPE_LABELS[selectedInsurance.insurance_type]}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Policy #</Text>
                      <Text style={styles.detailValue}>{selectedInsurance.policy_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Carrier</Text>
                      <Text style={styles.detailValue}>{selectedInsurance.carrier_name}</Text>
                    </View>
                    {selectedInsurance.carrier_phone && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Carrier Phone</Text>
                        <Text style={styles.detailValue}>{selectedInsurance.carrier_phone}</Text>
                      </View>
                    )}
                  </View>

                  {(selectedInsurance.agent_name || selectedInsurance.agent_phone || selectedInsurance.agent_email) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Agent Information</Text>
                      {selectedInsurance.agent_name && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Name</Text>
                          <Text style={styles.detailValue}>{selectedInsurance.agent_name}</Text>
                        </View>
                      )}
                      {selectedInsurance.agent_phone && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Phone</Text>
                          <Text style={styles.detailValue}>{selectedInsurance.agent_phone}</Text>
                        </View>
                      )}
                      {selectedInsurance.agent_email && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Email</Text>
                          <Text style={styles.detailValue}>{selectedInsurance.agent_email}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Coverage Period</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Effective Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedInsurance.effective_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Expiration</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedInsurance.expiration_date).toLocaleDateString()}
                      </Text>
                    </View>
                    {selectedInsurance.deductible && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Deductible</Text>
                        <Text style={styles.detailValue}>{formatCurrency(selectedInsurance.deductible)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Endorsements</Text>
                    <View style={styles.endorsementsSection}>
                      <View style={[
                        styles.endorsementItem,
                        { backgroundColor: selectedInsurance.additional_insured ? '#10B98120' : '#6B728020' }
                      ]}>
                        {selectedInsurance.additional_insured ? (
                          <CheckCircle size={14} color="#10B981" />
                        ) : (
                          <XCircle size={14} color="#6B7280" />
                        )}
                        <Text style={[
                          styles.endorsementText,
                          { color: selectedInsurance.additional_insured ? '#10B981' : '#6B7280' }
                        ]}>
                          Additional Insured
                        </Text>
                      </View>

                      <View style={[
                        styles.endorsementItem,
                        { backgroundColor: selectedInsurance.waiver_of_subrogation ? '#10B98120' : '#6B728020' }
                      ]}>
                        {selectedInsurance.waiver_of_subrogation ? (
                          <CheckCircle size={14} color="#10B981" />
                        ) : (
                          <XCircle size={14} color="#6B7280" />
                        )}
                        <Text style={[
                          styles.endorsementText,
                          { color: selectedInsurance.waiver_of_subrogation ? '#10B981' : '#6B7280' }
                        ]}>
                          Waiver of Subrogation
                        </Text>
                      </View>

                      <View style={[
                        styles.endorsementItem,
                        { backgroundColor: selectedInsurance.primary_noncontributory ? '#10B98120' : '#6B728020' }
                      ]}>
                        {selectedInsurance.primary_noncontributory ? (
                          <CheckCircle size={14} color="#10B981" />
                        ) : (
                          <XCircle size={14} color="#6B7280" />
                        )}
                        <Text style={[
                          styles.endorsementText,
                          { color: selectedInsurance.primary_noncontributory ? '#10B981' : '#6B7280' }
                        ]}>
                          Primary & Non-Contributory
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Verification Status</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Verified</Text>
                      <Text style={[
                        styles.detailValue,
                        { color: selectedInsurance.verified ? '#10B981' : '#F59E0B' }
                      ]}>
                        {selectedInsurance.verified ? 'Yes' : 'Pending Verification'}
                      </Text>
                    </View>
                    {selectedInsurance.verified && selectedInsurance.verified_by && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Verified By</Text>
                          <Text style={styles.detailValue}>{selectedInsurance.verified_by}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Verified Date</Text>
                          <Text style={styles.detailValue}>
                            {selectedInsurance.verified_date 
                              ? new Date(selectedInsurance.verified_date).toLocaleDateString()
                              : '-'}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  {!selectedInsurance.verified && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.verifyButton}
                        onPress={() => handleVerify(selectedInsurance)}
                      >
                        <Text style={styles.actionButtonText}>Verify Insurance</Text>
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
              <Text style={styles.modalTitle}>Filter by Type</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setTypeFilter('all');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, typeFilter === 'all' && styles.filterOptionSelected]}>
                All Types
              </Text>
              {typeFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {insuranceTypes.map(type => (
              <TouchableOpacity
                key={type.value}
                style={styles.filterOption}
                onPress={() => {
                  setTypeFilter(type.value);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, typeFilter === type.value && styles.filterOptionSelected]}>
                  {type.label}
                </Text>
                {typeFilter === type.value && <CheckCircle size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
