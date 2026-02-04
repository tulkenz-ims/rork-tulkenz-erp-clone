import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePORevisionsQuery, useCreatePORevision, useUpdatePORevision, PORevision } from '@/hooks/useSupabaseProcurementExtended';
import { useProcurementPurchaseOrdersQuery } from '@/hooks/useSupabaseProcurement';
import { Edit3, Search, Plus, Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight, X, FileText, DollarSign, Calendar, Hash } from 'lucide-react-native';

const REVISION_TYPES = [
  { key: 'quantity_change', label: 'Quantity Change', icon: Hash, color: '#3B82F6' },
  { key: 'price_change', label: 'Price Change', icon: DollarSign, color: '#10B981' },
  { key: 'line_add', label: 'Line Added', icon: Plus, color: '#8B5CF6' },
  { key: 'line_remove', label: 'Line Removed', icon: XCircle, color: '#EF4444' },
  { key: 'date_change', label: 'Date Change', icon: Calendar, color: '#F59E0B' },
  { key: 'terms_change', label: 'Terms Change', icon: FileText, color: '#6366F1' },
  { key: 'other', label: 'Other', icon: Edit3, color: '#6B7280' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  pending: { label: 'Pending', color: '#F59E0B', icon: Clock },
  approved: { label: 'Approved', color: '#10B981', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#EF4444', icon: XCircle },
  applied: { label: 'Applied', color: '#8B5CF6', icon: CheckCircle },
};

export default function PORevisionsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: revisions = [], isLoading, refetch } = usePORevisionsQuery();
  const { data: purchaseOrders = [] } = useProcurementPurchaseOrdersQuery();
  const createRevision = useCreatePORevision({
    onSuccess: () => {
      setShowCreateModal(false);
      Alert.alert('Success', 'Revision created successfully');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });
  const updateRevision = useUpdatePORevision({
    onSuccess: () => Alert.alert('Success', 'Revision updated'),
    onError: (error) => Alert.alert('Error', error.message),
  });

  const filteredRevisions = useMemo(() => {
    let filtered = revisions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (rev) =>
          rev.po_number.toLowerCase().includes(query) ||
          rev.description.toLowerCase().includes(query)
      );
    }

    if (filterStatus) {
      filtered = filtered.filter((rev) => rev.status === filterStatus);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [revisions, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = revisions.length;
    const pending = revisions.filter((r) => r.status === 'pending').length;
    const approved = revisions.filter((r) => r.status === 'approved' || r.status === 'applied').length;
    const totalAmountChange = revisions
      .filter((r) => r.status === 'approved' || r.status === 'applied')
      .reduce((sum, r) => sum + (r.amount_change || 0), 0);

    return { total, pending, approved, totalAmountChange };
  }, [revisions]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return prefix + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const handleApprove = (revision: PORevision) => {
    Alert.alert('Approve Revision', 'Are you sure you want to approve this revision?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () =>
          updateRevision.mutate({
            id: revision.id,
            updates: { status: 'approved', approved_at: new Date().toISOString(), approved_by: 'Current User' },
          }),
      },
    ]);
  };

  const handleReject = (revision: PORevision) => {
    Alert.alert('Reject Revision', 'Are you sure you want to reject this revision?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => updateRevision.mutate({ id: revision.id, updates: { status: 'rejected' } }),
      },
    ]);
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
      backgroundColor: '#F59E0B15',
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
      backgroundColor: '#F59E0B',
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
      backgroundColor: '#F59E0B',
      borderColor: '#F59E0B',
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
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    revisionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    revisionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    revisionIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    revisionInfo: {
      flex: 1,
    },
    revisionPO: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    revisionType: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    revisionMeta: {
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
    dateText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    revisionAmount: {
      alignItems: 'flex-end',
    },
    amountValue: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    amountLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    revisionDescription: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    descriptionText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    revisionActions: {
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
    formTextArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeOption: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      gap: 8,
    },
    typeOptionSelected: {
      borderColor: '#F59E0B',
      backgroundColor: '#F59E0B10',
    },
    typeOptionText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    typeOptionTextSelected: {
      color: '#F59E0B',
      fontWeight: '500' as const,
    },
    poSelector: {
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 200,
    },
    poOption: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    poOptionSelected: {
      backgroundColor: '#F59E0B15',
    },
    poOptionText: {
      fontSize: 14,
      color: colors.text,
    },
    poOptionSubtext: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
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
      backgroundColor: '#F59E0B',
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
  });

  const CreateRevisionModal = () => {
    const [selectedPO, setSelectedPO] = useState<string | null>(null);
    const [revisionType, setRevisionType] = useState<string>('quantity_change');
    const [description, setDescription] = useState('');
    const [amountChange, setAmountChange] = useState('');
    const [reason, setReason] = useState('');

    const selectedPOData = purchaseOrders.find((po) => po.id === selectedPO);

    const handleSubmit = () => {
      if (!selectedPO || !description.trim()) {
        Alert.alert('Error', 'Please select a PO and provide a description');
        return;
      }

      createRevision.mutate({
        po_id: selectedPO,
        po_number: selectedPOData?.po_number || '',
        revision_number: 1,
        revision_type: revisionType as PORevision['revision_type'],
        description,
        previous_value: null,
        new_value: null,
        amount_change: amountChange ? parseFloat(amountChange) : null,
        effective_date: null,
        reason,
        requested_by: 'Current User',
        requested_by_id: null,
        approved_by: null,
        approved_by_id: null,
        approved_at: null,
        status: 'pending',
        vendor_notified: false,
        vendor_notified_at: null,
        vendor_acknowledged: false,
        vendor_acknowledged_at: null,
        notes: null,
      });
    };

    return (
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New PO Revision</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Purchase Order *</Text>
                <ScrollView style={styles.poSelector}>
                  {purchaseOrders
                    .filter((po) => ['approved', 'ordered', 'partial_received'].includes(po.status))
                    .map((po) => (
                      <TouchableOpacity
                        key={po.id}
                        style={[styles.poOption, selectedPO === po.id && styles.poOptionSelected]}
                        onPress={() => setSelectedPO(po.id)}
                      >
                        <Text style={styles.poOptionText}>{po.po_number}</Text>
                        <Text style={styles.poOptionSubtext}>{po.vendor_name}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Revision Type</Text>
                <View style={styles.typeGrid}>
                  {REVISION_TYPES.map((type) => {
                    const TypeIcon = type.icon;
                    const isSelected = revisionType === type.key;
                    return (
                      <TouchableOpacity
                        key={type.key}
                        style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                        onPress={() => setRevisionType(type.key)}
                      >
                        <TypeIcon size={18} color={isSelected ? type.color : colors.textSecondary} />
                        <Text style={[styles.typeOptionText, isSelected && styles.typeOptionTextSelected]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the change..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Amount Change ($)</Text>
                <TextInput
                  style={styles.formInput}
                  value={amountChange}
                  onChangeText={setAmountChange}
                  placeholder="e.g., 500 or -200"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reason</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Why is this change needed?"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={2}
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
                disabled={createRevision.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {createRevision.isPending ? 'Creating...' : 'Submit Revision'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitle}>
            <View style={styles.titleIcon}>
              <Edit3 size={24} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.title}>PO Revisions</Text>
              <Text style={styles.subtitle}>Manage change orders</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New Revision</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search revisions..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !filterStatus && styles.filterChipActive]}
            onPress={() => setFilterStatus(null)}
          >
            <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, filterStatus === key && styles.filterChipActive]}
              onPress={() => setFilterStatus(filterStatus === key ? null : key)}
            >
              <Text style={[styles.filterChipText, filterStatus === key && styles.filterChipTextActive]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Revisions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
        </View>

        {filteredRevisions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Edit3 size={36} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Revisions Found</Text>
            <Text style={styles.emptyText}>Create a revision to track PO changes</Text>
          </View>
        ) : (
          filteredRevisions.map((revision) => {
            const typeConfig = REVISION_TYPES.find((t) => t.key === revision.revision_type) || REVISION_TYPES[6];
            const TypeIcon = typeConfig.icon;
            const statusConfig = STATUS_CONFIG[revision.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;

            return (
              <View key={revision.id} style={styles.revisionCard}>
                <View style={styles.revisionHeader}>
                  <View style={[styles.revisionIconContainer, { backgroundColor: `${typeConfig.color}15` }]}>
                    <TypeIcon size={22} color={typeConfig.color} />
                  </View>
                  <View style={styles.revisionInfo}>
                    <Text style={styles.revisionPO}>{revision.po_number}</Text>
                    <Text style={styles.revisionType}>{typeConfig.label}</Text>
                    <View style={styles.revisionMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
                        <StatusIcon size={12} color={statusConfig.color} />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                      </View>
                      <Text style={styles.dateText}>{formatDate(revision.created_at)}</Text>
                    </View>
                  </View>
                  {revision.amount_change !== null && (
                    <View style={styles.revisionAmount}>
                      <Text
                        style={[
                          styles.amountValue,
                          { color: revision.amount_change >= 0 ? '#10B981' : '#EF4444' },
                        ]}
                      >
                        {formatCurrency(revision.amount_change)}
                      </Text>
                      <Text style={styles.amountLabel}>Change</Text>
                    </View>
                  )}
                </View>

                <View style={styles.revisionDescription}>
                  <Text style={styles.descriptionText} numberOfLines={2}>
                    {revision.description}
                  </Text>
                </View>

                {revision.status === 'pending' && (
                  <View style={styles.revisionActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonBorder]}
                      onPress={() => handleApprove(revision)}
                    >
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleReject(revision)}>
                      <XCircle size={16} color="#EF4444" />
                      <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <CreateRevisionModal />
    </View>
  );
}
