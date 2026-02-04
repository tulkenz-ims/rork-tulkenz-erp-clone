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
import { useContractorWorkAuths, useContractorPrequals } from '@/hooks/useContractorSafety';
import {
  ContractorWorkAuth,
  WorkAuthStatus,
  WORK_AUTH_STATUS_LABELS,
  WORK_AUTH_STATUS_COLORS,
  WORK_TYPES,
} from '@/types/contractorSafety';
import { PPE_OPTIONS, HAZARD_OPTIONS } from '@/types/safety';
import {
  Plus,
  Search,
  Filter,
  FileCheck,
  Building2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  X,
  Shield,
  MapPin,
  Users,
  AlertTriangle,
  Flame,
  Zap,
  Construction,
} from 'lucide-react-native';

export default function ContractorWorkAuthScreen() {
  const { colors } = useTheme();
  const {
    workAuths,
    activeWorkAuths,
    isLoading,
    isRefetching,
    createWorkAuth,
    updateWorkAuth,
    approveWorkAuth,
    isCreating,
    generateWorkAuthNumber,
    refetch,
  } = useContractorWorkAuths();

  const { approvedPrequals } = useContractorPrequals();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkAuthStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWorkAuth, setSelectedWorkAuth] = useState<ContractorWorkAuth | null>(null);
  const [formData, setFormData] = useState({
    contractor_company: '',
    project_name: '',
    scope_of_work: '',
    work_location: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    supervisor_name: '',
    supervisor_phone: '',
    max_workers_onsite: '',
    hazards_identified: [] as string[],
    ppe_required: [] as string[],
    hot_work_authorized: false,
    confined_space_authorized: false,
    electrical_work_authorized: false,
    excavation_authorized: false,
  });

  const filteredWorkAuths = useMemo(() => {
    return workAuths.filter(w => {
      const matchesSearch = 
        w.contractor_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.auth_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workAuths, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: workAuths.length,
    active: workAuths.filter(w => w.status === 'active' || w.status === 'approved').length,
    pending: workAuths.filter(w => w.status === 'pending_approval').length,
    completed: workAuths.filter(w => w.status === 'completed').length,
  }), [workAuths]);

  const resetForm = () => {
    setFormData({
      contractor_company: '',
      project_name: '',
      scope_of_work: '',
      work_location: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      supervisor_name: '',
      supervisor_phone: '',
      max_workers_onsite: '',
      hazards_identified: [],
      ppe_required: [],
      hot_work_authorized: false,
      confined_space_authorized: false,
      electrical_work_authorized: false,
      excavation_authorized: false,
    });
    setSelectedWorkAuth(null);
  };

  const handleSubmit = async () => {
    if (!formData.contractor_company.trim() || !formData.project_name.trim() || !formData.scope_of_work.trim()) {
      Alert.alert('Error', 'Company, project name, and scope are required');
      return;
    }

    if (!formData.end_date) {
      Alert.alert('Error', 'End date is required');
      return;
    }

    try {
      const payload = {
        auth_number: generateWorkAuthNumber(),
        contractor_id: null,
        contractor_company: formData.contractor_company,
        prequal_id: null,
        prequal_verified: false,
        project_name: formData.project_name,
        project_number: null,
        scope_of_work: formData.scope_of_work,
        work_location: formData.work_location,
        facility_id: null,
        facility_name: null,
        department_code: null,
        department_name: null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        work_hours_start: null,
        work_hours_end: null,
        weekend_work_allowed: false,
        night_work_allowed: false,
        max_workers_onsite: formData.max_workers_onsite ? parseInt(formData.max_workers_onsite) : null,
        workers_assigned: [],
        supervisor_name: formData.supervisor_name,
        supervisor_phone: formData.supervisor_phone || null,
        supervisor_email: null,
        company_contact_name: null,
        company_contact_phone: null,
        hazards_identified: formData.hazards_identified,
        ppe_required: formData.ppe_required,
        permits_required: [],
        permit_numbers: [],
        safety_requirements: [],
        environmental_requirements: [],
        insurance_verified: false,
        insurance_id: null,
        orientation_required: true,
        orientation_completed: false,
        jha_required: true,
        jha_completed: false,
        jha_document_id: null,
        daily_briefing_required: true,
        hot_work_authorized: formData.hot_work_authorized,
        confined_space_authorized: formData.confined_space_authorized,
        electrical_work_authorized: formData.electrical_work_authorized,
        excavation_authorized: formData.excavation_authorized,
        crane_lift_authorized: false,
        status: 'pending_approval' as WorkAuthStatus,
        requested_by: 'Current User',
        requested_by_id: null,
        requested_date: new Date().toISOString(),
        approved_by: null,
        approved_by_id: null,
        approved_date: null,
        suspended_by: null,
        suspended_date: null,
        suspension_reason: null,
        completed_by: null,
        completed_date: null,
        completion_notes: null,
        attachments: [],
        notes: null,
      };

      await createWorkAuth(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Work authorization submitted for approval');
    } catch (err) {
      console.error('Error creating work authorization:', err);
      Alert.alert('Error', 'Failed to submit work authorization');
    }
  };

  const handleApprove = async (workAuth: ContractorWorkAuth) => {
    Alert.alert(
      'Approve Work Authorization',
      `Approve ${workAuth.project_name} for ${workAuth.contractor_company}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveWorkAuth({
                id: workAuth.id,
                approved_by: 'Current User',
              });
              setShowDetailModal(false);
              Alert.alert('Success', 'Work authorization approved');
            } catch (err) {
              Alert.alert('Error', 'Failed to approve work authorization');
            }
          },
        },
      ]
    );
  };

  const handleActivate = async (workAuth: ContractorWorkAuth) => {
    try {
      await updateWorkAuth({
        id: workAuth.id,
        status: 'active',
      });
      Alert.alert('Success', 'Work authorization activated');
    } catch (err) {
      Alert.alert('Error', 'Failed to activate');
    }
  };

  const handleComplete = async (workAuth: ContractorWorkAuth) => {
    Alert.prompt(
      'Complete Work Authorization',
      'Enter completion notes (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async (notes) => {
            try {
              await updateWorkAuth({
                id: workAuth.id,
                status: 'completed',
                completed_by: 'Current User',
                completed_date: new Date().toISOString(),
                completion_notes: notes || null,
              });
              setShowDetailModal(false);
              Alert.alert('Success', 'Work authorization completed');
            } catch (err) {
              Alert.alert('Error', 'Failed to complete');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getStatusIcon = (status: WorkAuthStatus) => {
    switch (status) {
      case 'approved':
      case 'active':
      case 'completed':
        return <CheckCircle size={16} color={WORK_AUTH_STATUS_COLORS[status]} />;
      case 'pending_approval':
      case 'draft':
        return <Clock size={16} color={WORK_AUTH_STATUS_COLORS[status]} />;
      case 'suspended':
      case 'cancelled':
      case 'expired':
        return <XCircle size={16} color={WORK_AUTH_STATUS_COLORS[status]} />;
      default:
        return null;
    }
  };

  const toggleHazard = (hazardId: string) => {
    setFormData(prev => ({
      ...prev,
      hazards_identified: prev.hazards_identified.includes(hazardId)
        ? prev.hazards_identified.filter(h => h !== hazardId)
        : [...prev.hazards_identified, hazardId],
    }));
  };

  const togglePPE = (ppeId: string) => {
    setFormData(prev => ({
      ...prev,
      ppe_required: prev.ppe_required.includes(ppeId)
        ? prev.ppe_required.filter(p => p !== ppeId)
        : [...prev.ppe_required, ppeId],
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
    projectName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      flex: 1,
    },
    authNumber: {
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
    permitsRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    permitBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      gap: 4,
    },
    permitText: {
      fontSize: 10,
      fontWeight: '500' as const,
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
    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    chipTextSelected: {
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
    activateButton: {
      flex: 1,
      backgroundColor: '#3B82F6',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    completeButton: {
      flex: 1,
      backgroundColor: '#059669',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    specialPermitsSection: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    specialPermitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 6,
    },
    specialPermitText: {
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
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#6B728020' }]}>
          <Text style={[styles.statValue, { color: '#6B7280' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search work authorizations..."
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
        {filteredWorkAuths.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FileCheck size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Work Authorizations Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first work authorization'}
            </Text>
          </View>
        ) : (
          filteredWorkAuths.map(workAuth => (
            <TouchableOpacity
              key={workAuth.id}
              style={styles.card}
              onPress={() => {
                setSelectedWorkAuth(workAuth);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.projectName}>{workAuth.project_name}</Text>
                  <Text style={styles.authNumber}>{workAuth.auth_number}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: WORK_AUTH_STATUS_COLORS[workAuth.status] + '20' },
                  ]}
                >
                  {getStatusIcon(workAuth.status)}
                  <Text
                    style={[styles.statusText, { color: WORK_AUTH_STATUS_COLORS[workAuth.status] }]}
                  >
                    {WORK_AUTH_STATUS_LABELS[workAuth.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Building2 size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{workAuth.contractor_company}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{workAuth.work_location}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {new Date(workAuth.start_date).toLocaleDateString()} - {new Date(workAuth.end_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {(workAuth.hot_work_authorized || workAuth.confined_space_authorized || 
                workAuth.electrical_work_authorized || workAuth.excavation_authorized) && (
                <View style={styles.permitsRow}>
                  {workAuth.hot_work_authorized && (
                    <View style={[styles.permitBadge, { backgroundColor: '#F9731620' }]}>
                      <Flame size={12} color="#F97316" />
                      <Text style={[styles.permitText, { color: '#F97316' }]}>Hot Work</Text>
                    </View>
                  )}
                  {workAuth.confined_space_authorized && (
                    <View style={[styles.permitBadge, { backgroundColor: '#7C3AED20' }]}>
                      <Construction size={12} color="#7C3AED" />
                      <Text style={[styles.permitText, { color: '#7C3AED' }]}>Confined Space</Text>
                    </View>
                  )}
                  {workAuth.electrical_work_authorized && (
                    <View style={[styles.permitBadge, { backgroundColor: '#EAB30820' }]}>
                      <Zap size={12} color="#EAB308" />
                      <Text style={[styles.permitText, { color: '#EAB308' }]}>Electrical</Text>
                    </View>
                  )}
                  {workAuth.excavation_authorized && (
                    <View style={[styles.permitBadge, { backgroundColor: '#84CC1620' }]}>
                      <Construction size={12} color="#84CC16" />
                      <Text style={[styles.permitText, { color: '#84CC16' }]}>Excavation</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.infoRow}>
                  <Users size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    Supervisor: {workAuth.supervisor_name}
                  </Text>
                </View>
                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>Details</Text>
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
              <Text style={styles.modalTitle}>New Work Authorization</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Project Information</Text>
                
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

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Project Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.project_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, project_name: text }))}
                    placeholder="Project name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Scope of Work *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.scope_of_work}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, scope_of_work: text }))}
                    placeholder="Describe the work to be performed"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Work Location</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.work_location}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, work_location: text }))}
                    placeholder="Location/area"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Schedule</Text>
                
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
                    <Text style={styles.inputLabel}>End Date *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.end_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, end_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Supervision</Text>
                
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Supervisor Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.supervisor_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, supervisor_name: text }))}
                      placeholder="Name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.supervisor_phone}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, supervisor_phone: text }))}
                      placeholder="Phone"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Max Workers On Site</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.max_workers_onsite}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, max_workers_onsite: text }))}
                    placeholder="Number of workers"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Special Permits Required</Text>
                
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, hot_work_authorized: !prev.hot_work_authorized }))}
                >
                  <View style={[styles.checkbox, formData.hot_work_authorized && styles.checkboxChecked]}>
                    {formData.hot_work_authorized && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Hot Work (Welding, Cutting, etc.)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, confined_space_authorized: !prev.confined_space_authorized }))}
                >
                  <View style={[styles.checkbox, formData.confined_space_authorized && styles.checkboxChecked]}>
                    {formData.confined_space_authorized && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Confined Space Entry</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, electrical_work_authorized: !prev.electrical_work_authorized }))}
                >
                  <View style={[styles.checkbox, formData.electrical_work_authorized && styles.checkboxChecked]}>
                    {formData.electrical_work_authorized && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Electrical Work</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, excavation_authorized: !prev.excavation_authorized }))}
                >
                  <View style={[styles.checkbox, formData.excavation_authorized && styles.checkboxChecked]}>
                    {formData.excavation_authorized && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Excavation</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Hazards Identified</Text>
                <View style={styles.chipsContainer}>
                  {HAZARD_OPTIONS.slice(0, 10).map(hazard => (
                    <TouchableOpacity
                      key={hazard.id}
                      style={[
                        styles.chip,
                        formData.hazards_identified.includes(hazard.id) && styles.chipSelected,
                      ]}
                      onPress={() => toggleHazard(hazard.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.hazards_identified.includes(hazard.id) && styles.chipTextSelected,
                        ]}
                      >
                        {hazard.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>PPE Required</Text>
                <View style={styles.chipsContainer}>
                  {PPE_OPTIONS.slice(0, 10).map(ppe => (
                    <TouchableOpacity
                      key={ppe.id}
                      style={[
                        styles.chip,
                        formData.ppe_required.includes(ppe.id) && styles.chipSelected,
                      ]}
                      onPress={() => togglePPE(ppe.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.ppe_required.includes(ppe.id) && styles.chipTextSelected,
                        ]}
                      >
                        {ppe.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isCreating}
              >
                <Text style={styles.submitButtonText}>
                  {isCreating ? 'Submitting...' : 'Submit for Approval'}
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
              <Text style={styles.modalTitle}>Work Authorization Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedWorkAuth && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Project Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Auth #</Text>
                      <Text style={styles.detailValue}>{selectedWorkAuth.auth_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Project</Text>
                      <Text style={styles.detailValue}>{selectedWorkAuth.project_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contractor</Text>
                      <Text style={styles.detailValue}>{selectedWorkAuth.contractor_company}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: WORK_AUTH_STATUS_COLORS[selectedWorkAuth.status] }]}>
                        {WORK_AUTH_STATUS_LABELS[selectedWorkAuth.status]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>{selectedWorkAuth.work_location}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Scope of Work</Text>
                    <Text style={[styles.detailValue, { paddingVertical: 8 }]}>
                      {selectedWorkAuth.scope_of_work}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Schedule</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Start Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedWorkAuth.start_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>End Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedWorkAuth.end_date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Supervision</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Supervisor</Text>
                      <Text style={styles.detailValue}>{selectedWorkAuth.supervisor_name}</Text>
                    </View>
                    {selectedWorkAuth.supervisor_phone && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>{selectedWorkAuth.supervisor_phone}</Text>
                      </View>
                    )}
                    {selectedWorkAuth.max_workers_onsite && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Max Workers</Text>
                        <Text style={styles.detailValue}>{selectedWorkAuth.max_workers_onsite}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Special Permits</Text>
                    <View style={styles.specialPermitsSection}>
                      {selectedWorkAuth.hot_work_authorized && (
                        <View style={[styles.specialPermitItem, { backgroundColor: '#F9731620' }]}>
                          <Flame size={16} color="#F97316" />
                          <Text style={[styles.specialPermitText, { color: '#F97316' }]}>Hot Work</Text>
                        </View>
                      )}
                      {selectedWorkAuth.confined_space_authorized && (
                        <View style={[styles.specialPermitItem, { backgroundColor: '#7C3AED20' }]}>
                          <Construction size={16} color="#7C3AED" />
                          <Text style={[styles.specialPermitText, { color: '#7C3AED' }]}>Confined Space</Text>
                        </View>
                      )}
                      {selectedWorkAuth.electrical_work_authorized && (
                        <View style={[styles.specialPermitItem, { backgroundColor: '#EAB30820' }]}>
                          <Zap size={16} color="#EAB308" />
                          <Text style={[styles.specialPermitText, { color: '#EAB308' }]}>Electrical</Text>
                        </View>
                      )}
                      {selectedWorkAuth.excavation_authorized && (
                        <View style={[styles.specialPermitItem, { backgroundColor: '#84CC1620' }]}>
                          <Construction size={16} color="#84CC16" />
                          <Text style={[styles.specialPermitText, { color: '#84CC16' }]}>Excavation</Text>
                        </View>
                      )}
                      {!selectedWorkAuth.hot_work_authorized && !selectedWorkAuth.confined_space_authorized &&
                       !selectedWorkAuth.electrical_work_authorized && !selectedWorkAuth.excavation_authorized && (
                        <Text style={styles.infoText}>No special permits required</Text>
                      )}
                    </View>
                  </View>

                  {selectedWorkAuth.status === 'pending_approval' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleApprove(selectedWorkAuth)}
                      >
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedWorkAuth.status === 'approved' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.activateButton}
                        onPress={() => handleActivate(selectedWorkAuth)}
                      >
                        <Text style={styles.actionButtonText}>Activate</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedWorkAuth.status === 'active' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={() => handleComplete(selectedWorkAuth)}
                      >
                        <Text style={styles.actionButtonText}>Complete</Text>
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
                All Authorizations
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(WORK_AUTH_STATUS_LABELS) as WorkAuthStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {WORK_AUTH_STATUS_LABELS[status]}
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
