import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useVendorOnboardingQuery, useCreateVendorOnboarding, useUpdateVendorOnboarding, VendorOnboarding } from '@/hooks/useSupabaseProcurementExtended';
import { UserPlus, Search, Plus, FileCheck, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, X, FileText, Shield, CreditCard, ClipboardList, Building } from 'lucide-react-native';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  initiated: { label: 'Initiated', color: '#6B7280', icon: Clock },
  documents_pending: { label: 'Docs Pending', color: '#F59E0B', icon: FileText },
  under_review: { label: 'Under Review', color: '#3B82F6', icon: ClipboardList },
  approved: { label: 'Approved', color: '#10B981', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#EF4444', icon: XCircle },
  on_hold: { label: 'On Hold', color: '#8B5CF6', icon: AlertCircle },
};

const VENDOR_TYPES = [
  { key: 'supplier', label: 'Supplier' },
  { key: 'service', label: 'Service' },
  { key: 'contractor', label: 'Contractor' },
  { key: 'distributor', label: 'Distributor' },
];

export default function VendorOnboardingScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: onboardingRecords = [], isLoading, refetch } = useVendorOnboardingQuery();
  const createOnboarding = useCreateVendorOnboarding({
    onSuccess: () => {
      setShowCreateModal(false);
      Alert.alert('Success', 'Onboarding initiated');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });
  const updateOnboarding = useUpdateVendorOnboarding({
    onSuccess: () => Alert.alert('Success', 'Onboarding updated'),
    onError: (error) => Alert.alert('Error', error.message),
  });

  const filteredRecords = useMemo(() => {
    let filtered = onboardingRecords;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.vendor_name.toLowerCase().includes(query) ||
          (record.contact_name || '').toLowerCase().includes(query)
      );
    }

    if (filterStatus) {
      filtered = filtered.filter((record) => record.status === filterStatus);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [onboardingRecords, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = onboardingRecords.length;
    const pending = onboardingRecords.filter((r) => ['initiated', 'documents_pending', 'under_review'].includes(r.status)).length;
    const approved = onboardingRecords.filter((r) => r.status === 'approved').length;
    const rejected = onboardingRecords.filter((r) => r.status === 'rejected').length;

    return { total, pending, approved, rejected };
  }, [onboardingRecords]);

  const getCompletionPercent = (record: VendorOnboarding) => {
    const checks = [
      record.w9_received,
      record.insurance_received,
      record.certifications_received,
      record.bank_info_received,
      record.questionnaire_completed,
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  };

  const handleUpdateStatus = (record: VendorOnboarding, newStatus: string) => {
    const updates: Partial<VendorOnboarding> = { status: newStatus as VendorOnboarding['status'] };
    if (newStatus === 'approved') {
      updates.approved_at = new Date().toISOString();
      updates.approved_by = 'Current User';
    } else if (newStatus === 'rejected') {
      updates.rejected_at = new Date().toISOString();
      updates.rejected_by = 'Current User';
    } else if (newStatus === 'under_review') {
      updates.reviewed_at = new Date().toISOString();
      updates.reviewed_by = 'Current User';
    }
    updateOnboarding.mutate({ id: record.id, updates });
  };

  const handleToggleDocument = (record: VendorOnboarding, field: keyof VendorOnboarding) => {
    const currentValue = record[field] as boolean;
    const updates: Partial<VendorOnboarding> = {
      [field]: !currentValue,
    };
    if (!currentValue) {
      const dateField = `${field}_at` as keyof VendorOnboarding;
      if (dateField in record) {
        (updates as any)[dateField] = new Date().toISOString();
      }
    }
    updateOnboarding.mutate({ id: record.id, updates });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    titleIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#10B98115',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10B981',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      gap: 8,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontWeight: '600' as const,
      fontSize: 14,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      marginLeft: 8,
      color: colors.text,
      fontSize: 15,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    filterChipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
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
      marginTop: 4,
    },
    onboardingCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    cardIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardInfo: {
      flex: 1,
    },
    vendorName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    contactName: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      gap: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      backgroundColor: '#F3F4F6',
    },
    typeText: {
      fontSize: 11,
      color: '#6B7280',
    },
    progressInfo: {
      alignItems: 'flex-end',
    },
    progressPercent: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    progressLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    checklistContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    checklistTitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      textTransform: 'uppercase' as const,
      marginBottom: 10,
    },
    checklistGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    checklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '48%',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.background,
      gap: 8,
    },
    checklistItemComplete: {
      backgroundColor: '#10B98115',
    },
    checklistIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checklistText: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
    },
    checklistTextComplete: {
      color: '#10B981',
    },
    cardFooter: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 6,
    },
    actionButtonBorder: {
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
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
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    modalBody: {
      padding: 20,
    },
    formGroup: {
      marginBottom: 20,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text,
      marginBottom: 8,
    },
    formInput: {
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeOption: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.border,
    },
    typeOptionSelected: {
      backgroundColor: '#10B98115',
      borderColor: '#10B981',
    },
    typeOptionText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    typeOptionTextSelected: {
      color: '#10B981',
      fontWeight: '500' as const,
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    submitButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: '#10B981',
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
  });

  const CreateOnboardingModal = () => {
    const [vendorName, setVendorName] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [vendorType, setVendorType] = useState<VendorOnboarding['vendor_type']>('supplier');

    const handleSubmit = () => {
      if (!vendorName.trim()) {
        Alert.alert('Error', 'Please enter vendor name');
        return;
      }

      createOnboarding.mutate({
        vendor_id: null,
        vendor_name: vendorName,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        status: 'initiated',
        vendor_type: vendorType,
        onboarding_type: 'new',
        initiated_by: 'Current User',
        initiated_by_id: null,
        initiated_at: new Date().toISOString(),
        w9_received: false,
        w9_received_at: null,
        insurance_received: false,
        insurance_received_at: null,
        insurance_expiry: null,
        certifications_received: false,
        certifications: [],
        bank_info_received: false,
        bank_info_verified: false,
        questionnaire_sent: false,
        questionnaire_sent_at: null,
        questionnaire_completed: false,
        questionnaire_completed_at: null,
        questionnaire_responses: {},
        background_check_required: false,
        background_check_completed: false,
        background_check_result: null,
        reviewed_by: null,
        reviewed_by_id: null,
        reviewed_at: null,
        review_notes: null,
        approved_by: null,
        approved_by_id: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        documents: [],
        checklist_items: [],
        notes: null,
      });
    };

    return (
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Vendor Onboarding</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Vendor Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={vendorName}
                  onChangeText={setVendorName}
                  placeholder="Enter vendor name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Vendor Type</Text>
                <View style={styles.typeGrid}>
                  {VENDOR_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[styles.typeOption, vendorType === type.key && styles.typeOptionSelected]}
                      onPress={() => setVendorType(type.key as VendorOnboarding['vendor_type'])}
                    >
                      <Text style={[styles.typeOptionText, vendorType === type.key && styles.typeOptionTextSelected]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contact Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="Primary contact"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contact Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={contactEmail}
                  onChangeText={setContactEmail}
                  placeholder="email@vendor.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contact Phone</Text>
                <TextInput
                  style={styles.formInput}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={createOnboarding.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {createOnboarding.isPending ? 'Creating...' : 'Start Onboarding'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const CHECKLIST_ITEMS = [
    { key: 'w9_received', label: 'W-9 Form', icon: FileText },
    { key: 'insurance_received', label: 'Insurance', icon: Shield },
    { key: 'certifications_received', label: 'Certifications', icon: FileCheck },
    { key: 'bank_info_received', label: 'Bank Info', icon: CreditCard },
    { key: 'questionnaire_completed', label: 'Questionnaire', icon: ClipboardList },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitle}>
            <View style={styles.titleIcon}>
              <UserPlus size={24} color="#10B981" />
            </View>
            <View>
              <Text style={styles.title}>Onboarding</Text>
              <Text style={styles.subtitle}>Vendor setup process</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search vendors..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {[
            { key: null, label: 'All' },
            ...Object.entries(STATUS_CONFIG).map(([key, config]) => ({ key, label: config.label })),
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key || 'all'}
              style={[styles.filterChip, filterStatus === filter.key && styles.filterChipActive]}
              onPress={() => setFilterStatus(filter.key)}
            >
              <Text style={[styles.filterChipText, filterStatus === filter.key && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.rejected}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        {filteredRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <UserPlus size={36} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Onboarding Records</Text>
            <Text style={styles.emptyText}>Start onboarding new vendors</Text>
          </View>
        ) : (
          filteredRecords.map((record) => {
            const statusConfig = STATUS_CONFIG[record.status] || STATUS_CONFIG.initiated;
            const StatusIcon = statusConfig.icon;
            const completionPercent = getCompletionPercent(record);

            return (
              <View key={record.id} style={styles.onboardingCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconContainer, { backgroundColor: `${statusConfig.color}15` }]}>
                    <StatusIcon size={24} color={statusConfig.color} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.vendorName}>{record.vendor_name}</Text>
                    {record.contact_name && <Text style={styles.contactName}>{record.contact_name}</Text>}
                    <View style={styles.cardMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                      </View>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>
                          {VENDOR_TYPES.find((t) => t.key === record.vendor_type)?.label || record.vendor_type}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.progressInfo}>
                    <Text style={styles.progressPercent}>{completionPercent}%</Text>
                    <Text style={styles.progressLabel}>Complete</Text>
                  </View>
                </View>

                <View style={styles.checklistContainer}>
                  <Text style={styles.checklistTitle}>Document Checklist</Text>
                  <View style={styles.checklistGrid}>
                    {CHECKLIST_ITEMS.map((item) => {
                      const isComplete = record[item.key as keyof VendorOnboarding] as boolean;
                      const ItemIcon = item.icon;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[styles.checklistItem, isComplete && styles.checklistItemComplete]}
                          onPress={() => handleToggleDocument(record, item.key as keyof VendorOnboarding)}
                        >
                          <View
                            style={[
                              styles.checklistIcon,
                              { borderColor: isComplete ? '#10B981' : colors.border },
                            ]}
                          >
                            {isComplete && <CheckCircle size={14} color="#10B981" />}
                          </View>
                          <Text style={[styles.checklistText, isComplete && styles.checklistTextComplete]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {record.status !== 'approved' && record.status !== 'rejected' && (
                  <View style={styles.cardFooter}>
                    {record.status === 'initiated' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonBorder]}
                        onPress={() => handleUpdateStatus(record, 'documents_pending')}
                      >
                        <FileText size={16} color="#F59E0B" />
                        <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Request Docs</Text>
                      </TouchableOpacity>
                    )}
                    {record.status === 'documents_pending' && completionPercent >= 80 && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonBorder]}
                        onPress={() => handleUpdateStatus(record, 'under_review')}
                      >
                        <ClipboardList size={16} color="#3B82F6" />
                        <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Start Review</Text>
                      </TouchableOpacity>
                    )}
                    {record.status === 'under_review' && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonBorder]}
                          onPress={() => handleUpdateStatus(record, 'approved')}
                        >
                          <CheckCircle size={16} color="#10B981" />
                          <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleUpdateStatus(record, 'rejected')}
                        >
                          <XCircle size={16} color="#EF4444" />
                          <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <CreateOnboardingModal />
    </View>
  );
}
