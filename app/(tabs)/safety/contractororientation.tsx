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
import { useContractorOrientations, useContractorPrequals } from '@/hooks/useContractorSafety';
import {
  ContractorOrientation,
  OrientationStatus,
  OrientationTopic,
  OrientationAcknowledgment,
  ORIENTATION_STATUS_LABELS,
  ORIENTATION_STATUS_COLORS,
  DEFAULT_ORIENTATION_TOPICS,
  DEFAULT_SAFETY_ACKNOWLEDGMENTS,
} from '@/types/contractorSafety';
import {
  Plus,
  Search,
  Filter,
  GraduationCap,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  ChevronRight,
  X,
  PlayCircle,
  BadgeCheck,
} from 'lucide-react-native';

export default function ContractorOrientationScreen() {
  const { colors } = useTheme();
  const {
    orientations,
    isRefetching,
    createOrientation,
    updateOrientation,
    isCreating,
    generateOrientationNumber,
    refetch,
  } = useContractorOrientations();

  const { approvedPrequals } = useContractorPrequals();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrientationStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrientation, setSelectedOrientation] = useState<ContractorOrientation | null>(null);
  const [formData, setFormData] = useState({
    contractor_company: '',
    contractor_id: '',
    attendee_name: '',
    attendee_title: '',
    attendee_phone: '',
    attendee_email: '',
    orientation_type: 'initial' as 'initial' | 'annual_refresher' | 'site_specific' | 'project_specific',
    scheduled_date: new Date().toISOString().split('T')[0],
    facility_name: '',
    topics_covered: [...DEFAULT_ORIENTATION_TOPICS] as OrientationTopic[],
    acknowledgments: [...DEFAULT_SAFETY_ACKNOWLEDGMENTS] as OrientationAcknowledgment[],
  });

  const filteredOrientations = useMemo(() => {
    return orientations.filter(o => {
      const matchesSearch = 
        o.attendee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.contractor_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.orientation_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orientations, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: orientations.length,
    completed: orientations.filter(o => o.status === 'completed').length,
    scheduled: orientations.filter(o => o.status === 'scheduled').length,
    expired: orientations.filter(o => o.status === 'expired').length,
  }), [orientations]);

  const resetForm = () => {
    setFormData({
      contractor_company: '',
      contractor_id: '',
      attendee_name: '',
      attendee_title: '',
      attendee_phone: '',
      attendee_email: '',
      orientation_type: 'initial',
      scheduled_date: new Date().toISOString().split('T')[0],
      facility_name: '',
      topics_covered: [...DEFAULT_ORIENTATION_TOPICS],
      acknowledgments: [...DEFAULT_SAFETY_ACKNOWLEDGMENTS],
    });
    setSelectedOrientation(null);
  };

  const handleSubmit = async () => {
    if (!formData.contractor_company.trim() || !formData.attendee_name.trim()) {
      Alert.alert('Error', 'Company and attendee name are required');
      return;
    }

    try {
      const payload = {
        orientation_number: generateOrientationNumber(),
        contractor_id: formData.contractor_id || null,
        contractor_company: formData.contractor_company,
        attendee_name: formData.attendee_name,
        attendee_title: formData.attendee_title || null,
        attendee_phone: formData.attendee_phone || null,
        attendee_email: formData.attendee_email || null,
        attendee_photo_url: null,
        facility_id: null,
        facility_name: formData.facility_name || null,
        orientation_type: formData.orientation_type,
        scheduled_date: formData.scheduled_date,
        scheduled_time: null,
        completed_date: null,
        instructor_name: null,
        instructor_id: null,
        topics_covered: formData.topics_covered,
        quiz_required: true,
        quiz_score: null,
        quiz_passed: null,
        passing_score: 80,
        badge_number: null,
        badge_issued: false,
        badge_issued_date: null,
        badge_expiration: null,
        status: 'scheduled' as OrientationStatus,
        signature_url: null,
        signed_date: null,
        acknowledgments: formData.acknowledgments,
        notes: null,
      };

      await createOrientation(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Orientation scheduled successfully');
    } catch (err) {
      console.error('Error creating orientation:', err);
      Alert.alert('Error', 'Failed to schedule orientation');
    }
  };

  const handleStartOrientation = async (orientation: ContractorOrientation) => {
    try {
      await updateOrientation({
        id: orientation.id,
        status: 'in_progress',
      });
      Alert.alert('Success', 'Orientation started');
    } catch (err) {
      Alert.alert('Error', 'Failed to start orientation');
    }
  };

  const handleCompleteOrientation = async (orientation: ContractorOrientation) => {
    Alert.prompt(
      'Complete Orientation',
      'Enter quiz score (0-100):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async (scoreStr: string | undefined) => {
            const score = parseInt(scoreStr || '0');
            const passed = score >= (orientation.passing_score || 80);
            
            try {
              const badgeExpiration = new Date();
              badgeExpiration.setFullYear(badgeExpiration.getFullYear() + 1);
              
              await updateOrientation({
                id: orientation.id,
                status: passed ? 'completed' : 'failed',
                completed_date: new Date().toISOString(),
                quiz_score: score,
                quiz_passed: passed,
                badge_issued: passed,
                badge_issued_date: passed ? new Date().toISOString() : null,
                badge_expiration: passed ? badgeExpiration.toISOString() : null,
                badge_number: passed ? `B-${Date.now().toString().slice(-6)}` : null,
              });
              setShowDetailModal(false);
              Alert.alert(
                passed ? 'Success' : 'Failed',
                passed 
                  ? `Orientation completed. Badge issued.`
                  : `Score ${score}% below passing score of ${orientation.passing_score}%`
              );
            } catch (err) {
              Alert.alert('Error', 'Failed to complete orientation');
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const getStatusIcon = (status: OrientationStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color={ORIENTATION_STATUS_COLORS[status]} />;
      case 'scheduled':
        return <Calendar size={16} color={ORIENTATION_STATUS_COLORS[status]} />;
      case 'in_progress':
        return <PlayCircle size={16} color={ORIENTATION_STATUS_COLORS[status]} />;
      case 'failed':
      case 'expired':
      case 'cancelled':
        return <XCircle size={16} color={ORIENTATION_STATUS_COLORS[status]} />;
      default:
        return null;
    }
  };

  const orientationTypes = [
    { value: 'initial', label: 'Initial Orientation' },
    { value: 'annual_refresher', label: 'Annual Refresher' },
    { value: 'site_specific', label: 'Site-Specific' },
    { value: 'project_specific', label: 'Project-Specific' },
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
    attendeeName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      flex: 1,
    },
    orientationNumber: {
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
    contractorPicker: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contractorPickerText: {
      fontSize: 15,
      color: colors.text,
    },
    contractorPickerPlaceholder: {
      color: colors.textSecondary,
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
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: '#10B98120',
      borderRadius: 8,
      marginBottom: 16,
    },
    badgeText: {
      fontSize: 14,
      color: '#10B981',
      fontWeight: '600' as const,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
      marginBottom: 32,
    },
    startButton: {
      flex: 1,
      backgroundColor: '#3B82F6',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    completeButton: {
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
    topicItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      gap: 12,
    },
    topicCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    topicCheckboxChecked: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    topicText: {
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
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#3B82F620' }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.scheduled}</Text>
          <Text style={styles.statLabel}>Scheduled</Text>
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
            placeholder="Search orientations..."
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
        {filteredOrientations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <GraduationCap size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Orientations Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Schedule your first contractor orientation'}
            </Text>
          </View>
        ) : (
          filteredOrientations.map(orientation => (
            <TouchableOpacity
              key={orientation.id}
              style={styles.card}
              onPress={() => {
                setSelectedOrientation(orientation);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attendeeName}>{orientation.attendee_name}</Text>
                  <Text style={styles.orientationNumber}>{orientation.orientation_number}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: ORIENTATION_STATUS_COLORS[orientation.status] + '20' },
                  ]}
                >
                  {getStatusIcon(orientation.status)}
                  <Text
                    style={[styles.statusText, { color: ORIENTATION_STATUS_COLORS[orientation.status] }]}
                  >
                    {ORIENTATION_STATUS_LABELS[orientation.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Building2 size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{orientation.contractor_company}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {new Date(orientation.scheduled_date).toLocaleDateString()}
                  </Text>
                </View>
                {orientation.badge_number && (
                  <View style={styles.infoRow}>
                    <BadgeCheck size={14} color="#10B981" />
                    <Text style={[styles.infoText, { color: '#10B981' }]}>
                      Badge: {orientation.badge_number}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>
                    {orientation.orientation_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
              <Text style={styles.modalTitle}>Schedule Orientation</Text>
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
                    placeholder="Enter company name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Attendee Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Attendee Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.attendee_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, attendee_name: text }))}
                    placeholder="Full name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Title</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.attendee_title}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, attendee_title: text }))}
                      placeholder="Job title"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.attendee_phone}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, attendee_phone: text }))}
                      placeholder="Phone"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.attendee_email}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, attendee_email: text }))}
                    placeholder="Email address"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Orientation Type</Text>
                <View style={styles.typeSelector}>
                  {orientationTypes.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        formData.orientation_type === type.value && styles.typeOptionSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, orientation_type: type.value as typeof formData.orientation_type }))}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          formData.orientation_type === type.value && styles.typeOptionTextSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Schedule</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Scheduled Date</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.scheduled_date}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, scheduled_date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Facility</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.facility_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, facility_name: text }))}
                    placeholder="Facility name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isCreating}
              >
                <Text style={styles.submitButtonText}>
                  {isCreating ? 'Scheduling...' : 'Schedule Orientation'}
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
              <Text style={styles.modalTitle}>Orientation Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedOrientation && (
                <>
                  {selectedOrientation.badge_issued && selectedOrientation.badge_number && (
                    <View style={styles.badgeContainer}>
                      <BadgeCheck size={24} color="#10B981" />
                      <Text style={styles.badgeText}>
                        Badge #{selectedOrientation.badge_number} Issued
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Attendee Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedOrientation.attendee_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Company</Text>
                      <Text style={styles.detailValue}>{selectedOrientation.contractor_company}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Orientation #</Text>
                      <Text style={styles.detailValue}>{selectedOrientation.orientation_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: ORIENTATION_STATUS_COLORS[selectedOrientation.status] }]}>
                        {ORIENTATION_STATUS_LABELS[selectedOrientation.status]}
                      </Text>
                    </View>
                    {selectedOrientation.attendee_title && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Title</Text>
                        <Text style={styles.detailValue}>{selectedOrientation.attendee_title}</Text>
                      </View>
                    )}
                    {selectedOrientation.attendee_phone && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>{selectedOrientation.attendee_phone}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Orientation Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrientation.orientation_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Scheduled</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedOrientation.scheduled_date).toLocaleDateString()}
                      </Text>
                    </View>
                    {selectedOrientation.completed_date && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Completed</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedOrientation.completed_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    {selectedOrientation.quiz_score !== null && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Quiz Score</Text>
                        <Text style={[
                          styles.detailValue,
                          { color: selectedOrientation.quiz_passed ? '#10B981' : '#EF4444' }
                        ]}>
                          {selectedOrientation.quiz_score}% {selectedOrientation.quiz_passed ? '(Passed)' : '(Failed)'}
                        </Text>
                      </View>
                    )}
                    {selectedOrientation.badge_expiration && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Badge Expires</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedOrientation.badge_expiration).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Topics Covered</Text>
                    {selectedOrientation.topics_covered?.map((topic, index) => (
                      <View key={index} style={styles.topicItem}>
                        <View style={[
                          styles.topicCheckbox,
                          topic.completed && styles.topicCheckboxChecked
                        ]}>
                          {topic.completed && <CheckCircle size={14} color="#fff" />}
                        </View>
                        <Text style={styles.topicText}>{topic.topic}</Text>
                      </View>
                    ))}
                  </View>

                  {selectedOrientation.status === 'scheduled' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => handleStartOrientation(selectedOrientation)}
                      >
                        <Text style={styles.actionButtonText}>Start Orientation</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedOrientation.status === 'in_progress' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={() => handleCompleteOrientation(selectedOrientation)}
                      >
                        <Text style={styles.actionButtonText}>Complete & Score</Text>
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
                All Orientations
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(ORIENTATION_STATUS_LABELS) as OrientationStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {ORIENTATION_STATUS_LABELS[status]}
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
