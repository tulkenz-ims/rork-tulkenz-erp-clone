import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useBlanketPOsQuery, useCreateBlanketPO, useUpdateBlanketPO, BlanketPurchaseOrder } from '@/hooks/useSupabaseProcurementExtended';
import { useProcurementVendorsQuery } from '@/hooks/useSupabaseProcurement';
import { Layers, Search, Plus, Calendar, DollarSign, Building, ChevronRight, X, AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react-native';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6B7280' },
  active: { label: 'Active', color: '#10B981' },
  expired: { label: 'Expired', color: '#EF4444' },
  closed: { label: 'Closed', color: '#374151' },
  cancelled: { label: 'Cancelled', color: '#DC2626' },
};

export default function BlanketPOScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: blanketPOs = [], isLoading, refetch } = useBlanketPOsQuery();
  const { data: vendors = [] } = useProcurementVendorsQuery({ activeOnly: true });
  const createBlanketPO = useCreateBlanketPO({
    onSuccess: () => {
      setShowCreateModal(false);
      Alert.alert('Success', 'Blanket PO created successfully');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });
  const updateBlanketPO = useUpdateBlanketPO({
    onSuccess: () => Alert.alert('Success', 'Blanket PO updated'),
    onError: (error) => Alert.alert('Error', error.message),
  });

  const filteredBlanketPOs = useMemo(() => {
    let filtered = blanketPOs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (bpo) =>
          bpo.blanket_po_number.toLowerCase().includes(query) ||
          bpo.vendor_name.toLowerCase().includes(query)
      );
    }

    if (filterStatus) {
      filtered = filtered.filter((bpo) => bpo.status === filterStatus);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [blanketPOs, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const active = blanketPOs.filter((b) => b.status === 'active').length;
    const totalCommitted = blanketPOs
      .filter((b) => b.status === 'active')
      .reduce((sum, b) => sum + b.total_amount, 0);
    const totalReleased = blanketPOs
      .filter((b) => b.status === 'active')
      .reduce((sum, b) => sum + b.released_amount, 0);
    const expiringSoon = blanketPOs.filter((b) => {
      if (b.status !== 'active') return false;
      const endDate = new Date(b.end_date);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length;

    return { active, totalCommitted, totalReleased, expiringSoon };
  }, [blanketPOs]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getUtilizationPercent = (bpo: BlanketPurchaseOrder) => {
    if (bpo.total_amount === 0) return 0;
    return (bpo.released_amount / bpo.total_amount) * 100;
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
      backgroundColor: '#06B6D415',
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
      backgroundColor: '#06B6D4',
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
      backgroundColor: '#06B6D4',
      borderColor: '#06B6D4',
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
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    statWarning: {
      backgroundColor: '#FEF3C7',
    },
    statValueWarning: {
      color: '#D97706',
    },
    bpoCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    bpoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    bpoIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#06B6D415',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bpoInfo: {
      flex: 1,
    },
    bpoNumber: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    bpoVendor: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    bpoMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    expiryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      gap: 4,
    },
    expiryText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    bpoAmount: {
      alignItems: 'flex-end',
    },
    amountValue: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
    },
    amountLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    utilizationContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    utilizationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    utilizationLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    utilizationValue: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text,
    },
    utilizationBar: {
      height: 8,
      backgroundColor: colors.background,
      borderRadius: 4,
      overflow: 'hidden',
    },
    utilizationFill: {
      height: '100%',
      borderRadius: 4,
    },
    utilizationStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    utilizationStat: {
      alignItems: 'center',
    },
    utilizationStatValue: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.text,
    },
    utilizationStatLabel: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    bpoFooter: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    footerItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    footerText: {
      fontSize: 12,
      color: colors.textSecondary,
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
    vendorSelector: {
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 150,
    },
    vendorOption: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    vendorOptionSelected: {
      backgroundColor: '#06B6D415',
    },
    vendorOptionText: {
      fontSize: 14,
      color: colors.text,
    },
    dateRow: {
      flexDirection: 'row',
      gap: 12,
    },
    dateInput: {
      flex: 1,
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
      backgroundColor: '#06B6D4',
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
  });

  const CreateBlanketPOModal = () => {
    const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [terms, setTerms] = useState('');

    const selectedVendorData = vendors.find((v) => v.id === selectedVendor);

    const handleSubmit = () => {
      if (!selectedVendor || !totalAmount || !startDate || !endDate) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      createBlanketPO.mutate({
        blanket_po_number: '',
        vendor_id: selectedVendor,
        vendor_name: selectedVendorData?.name || 'Unknown',
        department_id: null,
        department_name: null,
        description,
        status: 'draft',
        start_date: startDate,
        end_date: endDate,
        total_amount: parseFloat(totalAmount),
        terms_conditions: terms || null,
        payment_terms: 'net_30',
        auto_renew: false,
        renewal_notice_days: 30,
        line_items: [],
        created_by: 'Current User',
        created_by_id: null,
        approved_by: null,
        approved_by_id: null,
        approved_at: null,
        notes: null,
      });
    };

    return (
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Blanket PO</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Vendor *</Text>
                <ScrollView style={styles.vendorSelector}>
                  {vendors.map((vendor) => (
                    <TouchableOpacity
                      key={vendor.id}
                      style={[styles.vendorOption, selectedVendor === vendor.id && styles.vendorOptionSelected]}
                      onPress={() => setSelectedVendor(vendor.id)}
                    >
                      <Text style={styles.vendorOptionText}>{vendor.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Total Amount *</Text>
                <TextInput
                  style={styles.formInput}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  placeholder="e.g., 50000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contract Period *</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateInput}>
                    <TextInput
                      style={styles.formInput}
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="Start (YYYY-MM-DD)"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.dateInput}>
                    <TextInput
                      style={styles.formInput}
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="End (YYYY-MM-DD)"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the blanket PO..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Terms & Conditions</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={terms}
                  onChangeText={setTerms}
                  placeholder="Enter terms..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
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
                disabled={createBlanketPO.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {createBlanketPO.isPending ? 'Creating...' : 'Create Blanket PO'}
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
              <Layers size={24} color="#06B6D4" />
            </View>
            <View>
              <Text style={styles.title}>Blanket POs</Text>
              <Text style={styles.subtitle}>Standing purchase orders</Text>
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
            placeholder="Search blanket POs..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {[
            { key: null, label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'draft', label: 'Draft' },
            { key: 'expired', label: 'Expired' },
            { key: 'closed', label: 'Closed' },
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
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalCommitted)}</Text>
            <Text style={styles.statLabel}>Committed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalReleased)}</Text>
            <Text style={styles.statLabel}>Released</Text>
          </View>
          <View style={[styles.statCard, stats.expiringSoon > 0 && styles.statWarning]}>
            <Text style={[styles.statValue, stats.expiringSoon > 0 && styles.statValueWarning]}>
              {stats.expiringSoon}
            </Text>
            <Text style={styles.statLabel}>Expiring</Text>
          </View>
        </View>

        {filteredBlanketPOs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Layers size={36} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Blanket POs Found</Text>
            <Text style={styles.emptyText}>Create a blanket PO for recurring purchases</Text>
          </View>
        ) : (
          filteredBlanketPOs.map((bpo) => {
            const statusConfig = STATUS_CONFIG[bpo.status] || STATUS_CONFIG.draft;
            const utilization = getUtilizationPercent(bpo);
            const daysRemaining = getDaysRemaining(bpo.end_date);
            const isExpiringSoon = bpo.status === 'active' && daysRemaining <= 30 && daysRemaining > 0;

            return (
              <View key={bpo.id} style={styles.bpoCard}>
                <View style={styles.bpoHeader}>
                  <View style={styles.bpoIconContainer}>
                    <Building size={24} color="#06B6D4" />
                  </View>
                  <View style={styles.bpoInfo}>
                    <Text style={styles.bpoNumber}>{bpo.blanket_po_number}</Text>
                    <Text style={styles.bpoVendor}>{bpo.vendor_name}</Text>
                    <View style={styles.bpoMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                        <Text style={styles.statusText}>{statusConfig.label}</Text>
                      </View>
                      {isExpiringSoon && (
                        <View style={[styles.expiryBadge, { backgroundColor: '#FEF3C7' }]}>
                          <AlertTriangle size={12} color="#D97706" />
                          <Text style={[styles.expiryText, { color: '#D97706' }]}>{daysRemaining}d left</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.bpoAmount}>
                    <Text style={styles.amountValue}>{formatCurrency(bpo.total_amount)}</Text>
                    <Text style={styles.amountLabel}>Total</Text>
                  </View>
                </View>

                <View style={styles.utilizationContainer}>
                  <View style={styles.utilizationHeader}>
                    <Text style={styles.utilizationLabel}>Utilization</Text>
                    <Text style={styles.utilizationValue}>{utilization.toFixed(0)}%</Text>
                  </View>
                  <View style={styles.utilizationBar}>
                    <View
                      style={[
                        styles.utilizationFill,
                        {
                          width: `${Math.min(utilization, 100)}%`,
                          backgroundColor: utilization > 90 ? '#EF4444' : utilization > 75 ? '#F59E0B' : '#10B981',
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.utilizationStats}>
                    <View style={styles.utilizationStat}>
                      <Text style={styles.utilizationStatValue}>{formatCurrency(bpo.released_amount)}</Text>
                      <Text style={styles.utilizationStatLabel}>Released</Text>
                    </View>
                    <View style={styles.utilizationStat}>
                      <Text style={styles.utilizationStatValue}>{formatCurrency(bpo.remaining_amount)}</Text>
                      <Text style={styles.utilizationStatLabel}>Remaining</Text>
                    </View>
                    <View style={styles.utilizationStat}>
                      <Text style={styles.utilizationStatValue}>{bpo.release_count}</Text>
                      <Text style={styles.utilizationStatLabel}>Releases</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.bpoFooter}>
                  <View style={styles.footerItem}>
                    <Calendar size={14} color={colors.textSecondary} />
                    <Text style={styles.footerText}>
                      {formatDate(bpo.start_date)} - {formatDate(bpo.end_date)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <CreateBlanketPOModal />
    </View>
  );
}
