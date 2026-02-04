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
import { useFireSuppressionImpairments } from '@/hooks/useRegulatoryCompliance';
import {
  FireSuppressionImpairment,
  ImpairmentStatus,
  FireSystemType,
  ImpairmentType,
  ImpairmentReason,
  IMPAIRMENT_STATUS_LABELS,
  IMPAIRMENT_STATUS_COLORS,
  FIRE_SYSTEM_TYPE_LABELS,
  IMPAIRMENT_REASON_LABELS,
} from '@/types/regulatoryCompliance';
import {
  Plus,
  Search,
  Filter,
  Flame,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  CheckCircle,
  Bell,
  Shield,
  User,
} from 'lucide-react-native';

const IMPAIRMENT_TYPE_LABELS: Record<ImpairmentType, string> = {
  planned: 'Planned',
  emergency: 'Emergency',
  discovered: 'Discovered',
};

export default function FireSuppressionScreen() {
  const { colors } = useTheme();
  const {
    impairments,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useFireSuppressionImpairments();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ImpairmentStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedImpairment, setSelectedImpairment] = useState<FireSuppressionImpairment | null>(null);
  const [formData, setFormData] = useState({
    system_type: 'sprinkler' as FireSystemType,
    system_name: '',
    system_location: '',
    impairment_type: 'planned' as ImpairmentType,
    impairment_reason: 'maintenance' as ImpairmentReason,
    impairment_description: '',
    start_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    estimated_duration_hours: '',
    fire_watch_required: true,
    fire_watch_name: '',
    impairment_coordinator: '',
    fire_department_notified: false,
    insurance_notified: false,
    notes: '',
  });

  const filteredImpairments = useMemo(() => {
    return impairments.filter(i => {
      const matchesSearch =
        i.impairment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.system_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.system_location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [impairments, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: impairments.length,
    active: impairments.filter(i => i.status === 'active').length,
    pending: impairments.filter(i => i.status === 'pending').length,
    restored: impairments.filter(i => i.status === 'restored').length,
  }), [impairments]);

  const resetForm = () => {
    setFormData({
      system_type: 'sprinkler',
      system_name: '',
      system_location: '',
      impairment_type: 'planned',
      impairment_reason: 'maintenance',
      impairment_description: '',
      start_date: new Date().toISOString().split('T')[0],
      start_time: '08:00',
      estimated_duration_hours: '',
      fire_watch_required: true,
      fire_watch_name: '',
      impairment_coordinator: '',
      fire_department_notified: false,
      insurance_notified: false,
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.system_name.trim() || !formData.system_location.trim() || !formData.impairment_description.trim() || !formData.impairment_coordinator.trim()) {
      Alert.alert('Error', 'System name, location, description, and coordinator are required');
      return;
    }

    try {
      const payload = {
        impairment_number: generateNumber(),
        facility_id: null,
        facility_name: null,
        system_type: formData.system_type,
        system_name: formData.system_name,
        system_location: formData.system_location,
        system_coverage_area: null,
        impairment_type: formData.impairment_type,
        impairment_reason: formData.impairment_reason,
        impairment_description: formData.impairment_description,
        full_system_impaired: false,
        partial_areas_impaired: [],
        floors_affected: [],
        start_date: formData.start_date,
        start_time: formData.start_time,
        estimated_duration_hours: formData.estimated_duration_hours ? parseInt(formData.estimated_duration_hours) : null,
        expected_end_date: null,
        expected_end_time: null,
        actual_end_date: null,
        actual_end_time: null,
        work_being_performed: null,
        contractor_name: null,
        contractor_contact: null,
        work_permit_number: null,
        fire_watch_required: formData.fire_watch_required,
        fire_watch_assigned: !!formData.fire_watch_name,
        fire_watch_name: formData.fire_watch_name || null,
        fire_watch_location: null,
        fire_watch_start_time: null,
        portable_extinguishers_placed: false,
        extinguisher_locations: [],
        hot_work_prohibited: true,
        smoking_prohibited: true,
        fire_department_notified: formData.fire_department_notified,
        fire_department_notification_time: formData.fire_department_notified ? new Date().toISOString() : null,
        fire_department_contact: null,
        insurance_notified: formData.insurance_notified,
        insurance_notification_time: formData.insurance_notified ? new Date().toISOString() : null,
        insurance_contact: null,
        insurance_reference_number: null,
        alarm_company_notified: false,
        alarm_company_notification_time: null,
        management_notified: false,
        management_notification_time: null,
        affected_areas_notified: false,
        notification_method: null,
        impairment_tag_placed: false,
        tag_number: null,
        tag_location: null,
        tag_placed_by: null,
        tag_placed_by_id: null,
        system_restored: false,
        restoration_verified: false,
        restoration_verified_by: null,
        restoration_verified_by_id: null,
        restoration_date: null,
        restoration_time: null,
        tag_removed: false,
        tag_removed_by: null,
        tag_removed_by_id: null,
        tag_removed_date: null,
        post_restoration_test_required: true,
        post_restoration_test_completed: false,
        test_results: null,
        fire_department_closeout_notified: false,
        insurance_closeout_notified: false,
        alarm_company_closeout_notified: false,
        impairment_coordinator: formData.impairment_coordinator,
        impairment_coordinator_id: null,
        authorized_by: null,
        authorized_by_id: null,
        authorization_date: null,
        status: 'pending' as ImpairmentStatus,
        notes: formData.notes || null,
        attachments: [],
        created_by: 'Current User',
        created_by_id: null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Fire suppression impairment created successfully');
    } catch (err) {
      console.error('Error creating impairment:', err);
      Alert.alert('Error', 'Failed to create impairment');
    }
  };

  const getDurationText = (impairment: FireSuppressionImpairment) => {
    if (impairment.actual_end_date) {
      const start = new Date(`${impairment.start_date}T${impairment.start_time}`);
      const end = new Date(`${impairment.actual_end_date}T${impairment.actual_end_time || '00:00'}`);
      const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      return `${hours} hours`;
    }
    if (impairment.estimated_duration_hours) {
      return `Est. ${impairment.estimated_duration_hours} hours`;
    }
    return 'Duration unknown';
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
    impairmentNumber: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    systemType: {
      fontSize: 12,
      color: '#EF4444',
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
    systemName: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 8,
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
    notificationRow: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8,
    },
    notificationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    notificationText: {
      fontSize: 10,
      fontWeight: '500' as const,
    },
    fireWatchBadge: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: '#F59E0B20',
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    fireWatchText: {
      fontSize: 12,
      color: '#F59E0B',
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
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.restored}</Text>
          <Text style={styles.statLabel}>Restored</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search impairments..."
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
        {filteredImpairments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Flame size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Impairments</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first fire suppression impairment'}
            </Text>
          </View>
        ) : (
          filteredImpairments.map(impairment => (
            <TouchableOpacity
              key={impairment.id}
              style={styles.card}
              onPress={() => {
                setSelectedImpairment(impairment);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.impairmentNumber}>{impairment.impairment_number}</Text>
                  <Text style={styles.systemType}>{FIRE_SYSTEM_TYPE_LABELS[impairment.system_type]}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: IMPAIRMENT_STATUS_COLORS[impairment.status] + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: IMPAIRMENT_STATUS_COLORS[impairment.status] }]}>
                    {IMPAIRMENT_STATUS_LABELS[impairment.status]}
                  </Text>
                </View>
              </View>

              <Text style={styles.systemName}>{impairment.system_name}</Text>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{impairment.system_location}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {new Date(impairment.start_date).toLocaleDateString()} at {impairment.start_time}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Clock size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{getDurationText(impairment)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>Coordinator: {impairment.impairment_coordinator}</Text>
                </View>
              </View>

              {impairment.fire_watch_required && (
                <View style={styles.fireWatchBadge}>
                  <AlertTriangle size={14} color="#F59E0B" />
                  <Text style={styles.fireWatchText}>
                    Fire Watch {impairment.fire_watch_assigned ? 'Assigned' : 'Required'}
                  </Text>
                </View>
              )}

              <View style={styles.notificationRow}>
                <View style={[styles.notificationBadge, { backgroundColor: impairment.fire_department_notified ? '#10B98120' : '#EF444420' }]}>
                  <Bell size={10} color={impairment.fire_department_notified ? '#10B981' : '#EF4444'} />
                  <Text style={[styles.notificationText, { color: impairment.fire_department_notified ? '#10B981' : '#EF4444' }]}>
                    Fire Dept
                  </Text>
                </View>
                <View style={[styles.notificationBadge, { backgroundColor: impairment.insurance_notified ? '#10B98120' : '#EF444420' }]}>
                  <Shield size={10} color={impairment.insurance_notified ? '#10B981' : '#EF4444'} />
                  <Text style={[styles.notificationText, { color: impairment.insurance_notified ? '#10B981' : '#EF4444' }]}>
                    Insurance
                  </Text>
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
              <Text style={styles.modalTitle}>New Fire Suppression Impairment</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>System Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>System Type</Text>
                  <View style={styles.typeSelector}>
                    {(Object.keys(FIRE_SYSTEM_TYPE_LABELS) as FireSystemType[]).slice(0, 6).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          formData.system_type === type && styles.typeOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, system_type: type }))}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          formData.system_type === type && styles.typeOptionTextSelected,
                        ]}>
                          {FIRE_SYSTEM_TYPE_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>System Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.system_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, system_name: text }))}
                    placeholder="e.g., Main Building Sprinkler"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>System Location *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.system_location}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, system_location: text }))}
                    placeholder="e.g., Building A, Floor 2"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Impairment Details</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Impairment Type</Text>
                  <View style={styles.typeSelector}>
                    {(Object.keys(IMPAIRMENT_TYPE_LABELS) as ImpairmentType[]).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          formData.impairment_type === type && styles.typeOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, impairment_type: type }))}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          formData.impairment_type === type && styles.typeOptionTextSelected,
                        ]}>
                          {IMPAIRMENT_TYPE_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reason</Text>
                  <View style={styles.typeSelector}>
                    {(Object.keys(IMPAIRMENT_REASON_LABELS) as ImpairmentReason[]).slice(0, 5).map(reason => (
                      <TouchableOpacity
                        key={reason}
                        style={[
                          styles.typeOption,
                          formData.impairment_reason === reason && styles.typeOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, impairment_reason: reason }))}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          formData.impairment_reason === reason && styles.typeOptionTextSelected,
                        ]}>
                          {IMPAIRMENT_REASON_LABELS[reason]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.impairment_description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, impairment_description: text }))}
                    placeholder="Describe the impairment..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Start Date *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.start_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, start_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Start Time *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.start_time}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, start_time: text }))}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Estimated Duration (hours)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.estimated_duration_hours}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, estimated_duration_hours: text }))}
                    placeholder="e.g., 4"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Coordinator & Fire Watch</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Impairment Coordinator *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.impairment_coordinator}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, impairment_coordinator: text }))}
                    placeholder="Coordinator name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, fire_watch_required: !prev.fire_watch_required }))}
                >
                  <Text style={styles.switchLabel}>Fire Watch Required?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.fire_watch_required ? '#F59E0B' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.fire_watch_required ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                {formData.fire_watch_required && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Fire Watch Person</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.fire_watch_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, fire_watch_name: text }))}
                      placeholder="Fire watch person name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, fire_department_notified: !prev.fire_department_notified }))}
                >
                  <Text style={styles.switchLabel}>Fire Department Notified?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.fire_department_notified ? '#10B981' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.fire_department_notified ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, insurance_notified: !prev.insurance_notified }))}
                >
                  <Text style={styles.switchLabel}>Insurance Notified?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.insurance_notified ? '#10B981' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.insurance_notified ? 'flex-end' : 'flex-start' }]} />
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
                  {isCreating ? 'Creating...' : 'Create Impairment'}
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
              <Text style={styles.modalTitle}>Impairment Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedImpairment && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Impairment Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Number</Text>
                      <Text style={styles.detailValue}>{selectedImpairment.impairment_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: IMPAIRMENT_STATUS_COLORS[selectedImpairment.status] }]}>
                        {IMPAIRMENT_STATUS_LABELS[selectedImpairment.status]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>{IMPAIRMENT_TYPE_LABELS[selectedImpairment.impairment_type]}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reason</Text>
                      <Text style={styles.detailValue}>{IMPAIRMENT_REASON_LABELS[selectedImpairment.impairment_reason]}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>System</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>System Type</Text>
                      <Text style={styles.detailValue}>{FIRE_SYSTEM_TYPE_LABELS[selectedImpairment.system_type]}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>System Name</Text>
                      <Text style={styles.detailValue}>{selectedImpairment.system_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>{selectedImpairment.system_location}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Timeline</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Start</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedImpairment.start_date).toLocaleDateString()} at {selectedImpairment.start_time}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Duration</Text>
                      <Text style={styles.detailValue}>{getDurationText(selectedImpairment)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Coordination</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Coordinator</Text>
                      <Text style={styles.detailValue}>{selectedImpairment.impairment_coordinator}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fire Watch</Text>
                      <Text style={styles.detailValue}>
                        {selectedImpairment.fire_watch_required ? (selectedImpairment.fire_watch_name || 'Required (not assigned)') : 'Not required'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fire Dept</Text>
                      <Text style={[styles.detailValue, { color: selectedImpairment.fire_department_notified ? '#10B981' : '#EF4444' }]}>
                        {selectedImpairment.fire_department_notified ? 'Notified' : 'Not Notified'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Insurance</Text>
                      <Text style={[styles.detailValue, { color: selectedImpairment.insurance_notified ? '#10B981' : '#EF4444' }]}>
                        {selectedImpairment.insurance_notified ? 'Notified' : 'Not Notified'}
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
                All Impairments
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(IMPAIRMENT_STATUS_LABELS) as ImpairmentStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {IMPAIRMENT_STATUS_LABELS[status]}
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
