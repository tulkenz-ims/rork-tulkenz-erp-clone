import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useServicePOsQuery, useCreateServicePO, useUpdateServicePO, ServicePurchaseOrder, useServiceRequisitionsQuery } from '@/hooks/useSupabaseProcurementExtended';
import { useProcurementVendorsQuery } from '@/hooks/useSupabaseProcurement';
import { Wrench, Search, Plus, Calendar, Building, Clock, CheckCircle, XCircle, PlayCircle, X, Receipt, FileText, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  draft: { label: 'Draft', color: '#6B7280', icon: Clock },
  pending_approval: { label: 'Pending', color: '#F59E0B', icon: Clock },
  approved: { label: 'Approved', color: '#10B981', icon: CheckCircle },
  in_progress: { label: 'In Progress', color: '#3B82F6', icon: PlayCircle },
  completed: { label: 'Completed', color: '#059669', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: XCircle },
};

const SERVICE_TYPES = [
  'Maintenance',
  'Consulting',
  'Installation',
  'Repair',
  'Training',
  'Inspection',
  'Cleaning',
  'Security',
  'IT Services',
  'Other',
];

const PAYMENT_SCHEDULES = [
  { key: 'on_completion', label: 'On Completion' },
  { key: 'milestone', label: 'Milestone Based' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'upfront', label: 'Upfront' },
];

export default function ServicePOScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: servicePOs = [], isLoading, refetch } = useServicePOsQuery();
  const { data: requisitions = [] } = useServiceRequisitionsQuery({});
  const { data: vendors = [] } = useProcurementVendorsQuery({ activeOnly: true, vendorType: 'service' });
  const createServicePO = useCreateServicePO({
    onSuccess: () => {
      setShowCreateModal(false);
      Alert.alert('Success', 'Service PO created');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });
  useUpdateServicePO({
    onSuccess: () => Alert.alert('Success', 'Service PO updated'),
    onError: (error) => Alert.alert('Error', error.message),
  });

  const filteredServicePOs = useMemo(() => {
    let filtered = servicePOs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (spo) =>
          spo.service_po_number.toLowerCase().includes(query) ||
          spo.vendor_name.toLowerCase().includes(query) ||
          spo.service_type.toLowerCase().includes(query)
      );
    }

    if (filterStatus) {
      filtered = filtered.filter((spo) => spo.status === filterStatus);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [servicePOs, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = servicePOs.length;
    const active = servicePOs.filter((s) => s.status === 'in_progress').length;
    const completed = servicePOs.filter((s) => s.status === 'completed').length;
    const totalValue = servicePOs.reduce((sum, s) => sum + s.total_amount, 0);
    const avgCompletion = servicePOs.length > 0
      ? servicePOs.reduce((sum, s) => sum + s.completion_percent, 0) / servicePOs.length
      : 0;

    return { total, active, completed, totalValue, avgCompletion };
  }, [servicePOs]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };



  const handleCreateRequisition = (spo: ServicePurchaseOrder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/procurement/servicereq-create',
      params: {
        poId: spo.id,
        poNumber: spo.service_po_number,
      },
    });
  };

  const hasRequisition = (poId: string) => {
    return requisitions.some(r => r.source_po_id === poId);
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
      backgroundColor: '#EF444415',
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
      backgroundColor: '#EF4444',
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
      backgroundColor: '#EF4444',
      borderColor: '#EF4444',
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
    spoCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    spoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    spoIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    spoInfo: {
      flex: 1,
    },
    spoNumber: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    spoVendor: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    spoMeta: {
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
    spoAmount: {
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
    progressContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    progressLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    progressValue: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.background,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: '#EF4444',
    },
    progressStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    progressStat: {
      alignItems: 'center',
    },
    progressStatValue: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.text,
    },
    progressStatLabel: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    spoFooter: {
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
    createReqButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F9731610',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    createReqButtonText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: '#F97316',
      flex: 1,
    },
    reqLinkedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#10B98110',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 6,
    },
    reqLinkedText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: '#10B981',
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
    selectorContainer: {
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 120,
    },
    selectorOption: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    selectorOptionSelected: {
      backgroundColor: '#EF444415',
    },
    selectorOptionText: {
      fontSize: 14,
      color: colors.text,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipSelected: {
      backgroundColor: '#EF444415',
      borderColor: '#EF4444',
    },
    chipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipTextSelected: {
      color: '#EF4444',
      fontWeight: '500' as const,
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
      backgroundColor: '#EF4444',
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
  });

  const CreateServicePOModal = () => {
    const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
    const [serviceType, setServiceType] = useState('');
    const [description, setDescription] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [location, setLocation] = useState('');
    const [paymentSchedule, setPaymentSchedule] = useState<ServicePurchaseOrder['payment_schedule']>('on_completion');
    const [laborHours, setLaborHours] = useState('');
    const [hourlyRate, setHourlyRate] = useState('');

    const selectedVendorData = vendors.find((v) => v.id === selectedVendor);

    const handleSubmit = () => {
      if (!selectedVendor || !serviceType || !totalAmount) {
        Alert.alert('Error', 'Please fill in required fields');
        return;
      }

      createServicePO.mutate({
        po_id: null,
        po_number: null,
        vendor_id: selectedVendor,
        vendor_name: selectedVendorData?.name || 'Unknown',
        department_id: null,
        department_name: null,
        service_type: serviceType,
        description: description || null,
        status: 'draft',
        start_date: startDate || null,
        end_date: endDate || null,
        service_location: location || null,
        total_amount: parseFloat(totalAmount),
        completed_amount: 0,
        completion_percent: 0,
        payment_schedule: paymentSchedule,
        milestones: [],
        labor_hours_estimated: laborHours ? parseFloat(laborHours) : null,
        labor_hours_actual: null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        line_items: [],
        created_by: 'Current User',
        created_by_id: null,
        approved_by: null,
        approved_at: null,
        notes: null,
      });
    };

    return (
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Service PO</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Vendor *</Text>
                <ScrollView style={styles.selectorContainer}>
                  {vendors.map((vendor) => (
                    <TouchableOpacity
                      key={vendor.id}
                      style={[styles.selectorOption, selectedVendor === vendor.id && styles.selectorOptionSelected]}
                      onPress={() => setSelectedVendor(vendor.id)}
                    >
                      <Text style={styles.selectorOptionText}>{vendor.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Service Type *</Text>
                <View style={styles.chipGrid}>
                  {SERVICE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.chip, serviceType === type && styles.chipSelected]}
                      onPress={() => setServiceType(type)}
                    >
                      <Text style={[styles.chipText, serviceType === type && styles.chipTextSelected]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Total Amount *</Text>
                <TextInput
                  style={styles.formInput}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  placeholder="e.g., 5000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Payment Schedule</Text>
                <View style={styles.chipGrid}>
                  {PAYMENT_SCHEDULES.map((schedule) => (
                    <TouchableOpacity
                      key={schedule.key}
                      style={[styles.chip, paymentSchedule === schedule.key && styles.chipSelected]}
                      onPress={() => setPaymentSchedule(schedule.key as ServicePurchaseOrder['payment_schedule'])}
                    >
                      <Text style={[styles.chipText, paymentSchedule === schedule.key && styles.chipTextSelected]}>
                        {schedule.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Service Period</Text>
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
                <Text style={styles.formLabel}>Service Location</Text>
                <TextInput
                  style={styles.formInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter location"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Labor Estimate</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateInput}>
                    <TextInput
                      style={styles.formInput}
                      value={laborHours}
                      onChangeText={setLaborHours}
                      placeholder="Hours"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.dateInput}>
                    <TextInput
                      style={styles.formInput}
                      value={hourlyRate}
                      onChangeText={setHourlyRate}
                      placeholder="Hourly Rate"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
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
                  placeholder="Describe the service..."
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
                disabled={createServicePO.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {createServicePO.isPending ? 'Creating...' : 'Create Service PO'}
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
              <Wrench size={24} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.title}>Service POs</Text>
              <Text style={styles.subtitle}>Service & labor orders</Text>
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
            placeholder="Search service POs..."
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
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalValue)}</Text>
            <Text style={styles.statLabel}>Value</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.avgCompletion.toFixed(0)}%</Text>
            <Text style={styles.statLabel}>Avg Progress</Text>
          </View>
        </View>

        {filteredServicePOs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Wrench size={36} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Service POs</Text>
            <Text style={styles.emptyText}>Create POs for services and labor</Text>
          </View>
        ) : (
          filteredServicePOs.map((spo) => {
            const statusConfig = STATUS_CONFIG[spo.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;

            return (
              <View key={spo.id} style={styles.spoCard}>
                <View style={styles.spoHeader}>
                  <View style={[styles.spoIconContainer, { backgroundColor: `${statusConfig.color}15` }]}>
                    <StatusIcon size={24} color={statusConfig.color} />
                  </View>
                  <View style={styles.spoInfo}>
                    <Text style={styles.spoNumber}>{spo.service_po_number}</Text>
                    <Text style={styles.spoVendor}>{spo.vendor_name}</Text>
                    <View style={styles.spoMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                      </View>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{spo.service_type}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.spoAmount}>
                    <Text style={styles.amountValue}>{formatCurrency(spo.total_amount)}</Text>
                    <Text style={styles.amountLabel}>Total</Text>
                  </View>
                </View>

                {spo.status === 'in_progress' && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Completion</Text>
                      <Text style={styles.progressValue}>{spo.completion_percent}%</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${spo.completion_percent}%` }]} />
                    </View>
                    <View style={styles.progressStats}>
                      <View style={styles.progressStat}>
                        <Text style={styles.progressStatValue}>{formatCurrency(spo.completed_amount)}</Text>
                        <Text style={styles.progressStatLabel}>Completed</Text>
                      </View>
                      <View style={styles.progressStat}>
                        <Text style={styles.progressStatValue}>
                          {spo.labor_hours_actual || 0}/{spo.labor_hours_estimated || '-'}h
                        </Text>
                        <Text style={styles.progressStatLabel}>Labor Hours</Text>
                      </View>
                      <View style={styles.progressStat}>
                        <Text style={styles.progressStatValue}>{spo.milestones.length}</Text>
                        <Text style={styles.progressStatLabel}>Milestones</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.spoFooter}>
                  <View style={styles.footerItem}>
                    <Calendar size={14} color={colors.textSecondary} />
                    <Text style={styles.footerText}>
                      {formatDate(spo.start_date)} - {formatDate(spo.end_date)}
                    </Text>
                  </View>
                  {spo.service_location && (
                    <View style={styles.footerItem}>
                      <Building size={14} color={colors.textSecondary} />
                      <Text style={styles.footerText} numberOfLines={1}>{spo.service_location}</Text>
                    </View>
                  )}
                </View>

                {spo.status === 'in_progress' && !hasRequisition(spo.id) && (
                  <TouchableOpacity
                    style={styles.createReqButton}
                    onPress={() => handleCreateRequisition(spo)}
                  >
                    <Receipt size={16} color="#F97316" />
                    <Text style={styles.createReqButtonText}>Invoice Received - Create Requisition</Text>
                    <ArrowRight size={16} color="#F97316" />
                  </TouchableOpacity>
                )}

                {hasRequisition(spo.id) && (
                  <View style={styles.reqLinkedBadge}>
                    <FileText size={14} color="#10B981" />
                    <Text style={styles.reqLinkedText}>Requisition Created</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <CreateServicePOModal />
    </View>
  );
}
