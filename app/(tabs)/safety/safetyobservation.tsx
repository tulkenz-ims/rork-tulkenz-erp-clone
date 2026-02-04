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
import { useSafetyObservations } from '@/hooks/useBehaviorSafety';
import {
  SafetyObservation,
  ObservationType,
  ObservationCategory,
  ObservationStatus,
  Priority,
  OBSERVATION_TYPE_LABELS,
  OBSERVATION_TYPE_COLORS,
  OBSERVATION_CATEGORY_LABELS,
  OBSERVATION_STATUS_LABELS,
  OBSERVATION_STATUS_COLORS,
  COMMON_SAFE_BEHAVIORS,
  COMMON_AT_RISK_BEHAVIORS,
} from '@/types/behaviorSafety';
import {
  Plus,
  Search,
  Filter,
  Eye,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  X,
  Shield,
} from 'lucide-react-native';

export default function SafetyObservationScreen() {
  const { colors } = useTheme();
  const {
    observations,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useSafetyObservations();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ObservationType | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<SafetyObservation | null>(null);
  const [formData, setFormData] = useState({
    location: '',
    work_area: '',
    observer_name: '',
    observed_employee_name: '',
    observation_type: 'safe' as ObservationType,
    category: 'ppe' as ObservationCategory,
    behavior_observed: '',
    task_being_performed: '',
    safe_behaviors: [] as string[],
    at_risk_behaviors: [] as string[],
    immediate_action_taken: '',
    coaching_provided: false,
    coaching_notes: '',
    corrective_action_required: false,
    corrective_action: '',
    priority: 'medium' as Priority,
    notes: '',
  });

  const filteredObservations = useMemo(() => {
    return observations.filter(o => {
      const matchesSearch =
        o.observation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.observer_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || o.observation_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [observations, searchQuery, typeFilter]);

  const stats = useMemo(() => ({
    total: observations.length,
    safe: observations.filter(o => o.observation_type === 'safe').length,
    atRisk: observations.filter(o => o.observation_type === 'at_risk').length,
    open: observations.filter(o => o.status === 'open' || o.status === 'in_progress').length,
  }), [observations]);

  const resetForm = () => {
    setFormData({
      location: '',
      work_area: '',
      observer_name: '',
      observed_employee_name: '',
      observation_type: 'safe',
      category: 'ppe',
      behavior_observed: '',
      task_being_performed: '',
      safe_behaviors: [],
      at_risk_behaviors: [],
      immediate_action_taken: '',
      coaching_provided: false,
      coaching_notes: '',
      corrective_action_required: false,
      corrective_action: '',
      priority: 'medium',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.location.trim() || !formData.observer_name.trim() || !formData.behavior_observed.trim()) {
      Alert.alert('Error', 'Location, observer name, and behavior observed are required');
      return;
    }

    try {
      const payload = {
        observation_number: generateNumber(),
        observation_date: new Date().toISOString().split('T')[0],
        observation_time: new Date().toTimeString().split(' ')[0],
        facility_id: null,
        facility_name: null,
        department: null,
        location: formData.location,
        work_area: formData.work_area || null,
        observer_id: null,
        observer_name: formData.observer_name,
        observer_department: null,
        observed_employee_id: null,
        observed_employee_name: formData.observed_employee_name || null,
        observation_type: formData.observation_type,
        category: formData.category,
        behavior_observed: formData.behavior_observed,
        task_being_performed: formData.task_being_performed || null,
        safe_behaviors: formData.safe_behaviors,
        at_risk_behaviors: formData.at_risk_behaviors,
        immediate_action_taken: formData.immediate_action_taken || null,
        coaching_provided: formData.coaching_provided,
        coaching_notes: formData.coaching_notes || null,
        root_cause: null,
        corrective_action_required: formData.corrective_action_required,
        corrective_action: formData.corrective_action || null,
        corrective_action_due_date: null,
        corrective_action_completed: false,
        corrective_action_completed_date: null,
        priority: formData.priority,
        status: 'open' as ObservationStatus,
        follow_up_required: formData.corrective_action_required,
        follow_up_date: null,
        follow_up_notes: null,
        reviewed_by: null,
        reviewed_by_id: null,
        reviewed_date: null,
        attachments: [],
        photos: [],
        notes: formData.notes || null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Safety observation recorded successfully');
    } catch (err) {
      console.error('Error creating observation:', err);
      Alert.alert('Error', 'Failed to record observation');
    }
  };

  const toggleSafeBehavior = (behavior: string) => {
    setFormData(prev => ({
      ...prev,
      safe_behaviors: prev.safe_behaviors.includes(behavior)
        ? prev.safe_behaviors.filter(b => b !== behavior)
        : [...prev.safe_behaviors, behavior],
    }));
  };

  const toggleAtRiskBehavior = (behavior: string) => {
    setFormData(prev => ({
      ...prev,
      at_risk_behaviors: prev.at_risk_behaviors.includes(behavior)
        ? prev.at_risk_behaviors.filter(b => b !== behavior)
        : [...prev.at_risk_behaviors, behavior],
    }));
  };

  const getTypeIcon = (type: ObservationType) => {
    if (type === 'safe' || type === 'positive') {
      return <CheckCircle size={14} color={OBSERVATION_TYPE_COLORS[type]} />;
    }
    return <AlertTriangle size={14} color={OBSERVATION_TYPE_COLORS[type]} />;
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
      backgroundColor: '#10B981',
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
    observationNumber: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    observationDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    typeText: {
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
    behaviorText: {
      fontSize: 14,
      color: colors.text,
      marginTop: 8,
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
      gap: 8,
    },
    typeOption: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    typeOptionSelected: {
      borderWidth: 2,
    },
    typeOptionText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
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
      backgroundColor: '#10B981',
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
    detailList: {
      marginTop: 8,
      gap: 4,
    },
    detailListItem: {
      fontSize: 14,
      color: colors.text,
      paddingLeft: 12,
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
    categorySelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
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
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.safe}</Text>
          <Text style={styles.statLabel}>Safe</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.atRisk}</Text>
          <Text style={styles.statLabel}>At-Risk</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.open}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search observations..."
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
        {filteredObservations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Eye size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Observations Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || typeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Record your first safety observation'}
            </Text>
          </View>
        ) : (
          filteredObservations.map(observation => (
            <TouchableOpacity
              key={observation.id}
              style={styles.card}
              onPress={() => {
                setSelectedObservation(observation);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.observationNumber}>{observation.observation_number}</Text>
                  <Text style={styles.observationDate}>
                    {new Date(observation.observation_date).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: OBSERVATION_TYPE_COLORS[observation.observation_type] + '20' },
                  ]}
                >
                  {getTypeIcon(observation.observation_type)}
                  <Text
                    style={[styles.typeText, { color: OBSERVATION_TYPE_COLORS[observation.observation_type] }]}
                  >
                    {OBSERVATION_TYPE_LABELS[observation.observation_type]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{observation.location}</Text>
                </View>
                <View style={styles.infoRow}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>Observer: {observation.observer_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Shield size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{OBSERVATION_CATEGORY_LABELS[observation.category]}</Text>
                </View>
              </View>

              <Text style={styles.behaviorText} numberOfLines={2}>
                {observation.behavior_observed}
              </Text>

              <View style={styles.cardFooter}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: OBSERVATION_STATUS_COLORS[observation.status] + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: OBSERVATION_STATUS_COLORS[observation.status] }]}>
                    {OBSERVATION_STATUS_LABELS[observation.status]}
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
              <Text style={styles.modalTitle}>New Safety Observation</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Observation Type</Text>
                <View style={styles.typeSelector}>
                  {(['safe', 'at_risk', 'positive', 'coaching'] as ObservationType[]).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        formData.observation_type === type && [
                          styles.typeOptionSelected,
                          { borderColor: OBSERVATION_TYPE_COLORS[type] },
                        ],
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, observation_type: type }))}
                    >
                      {getTypeIcon(type)}
                      <Text style={[
                        styles.typeOptionText,
                        formData.observation_type === type && { color: OBSERVATION_TYPE_COLORS[type], fontWeight: '600' as const }
                      ]}>
                        {OBSERVATION_TYPE_LABELS[type].replace(' Behavior', '').replace(' Reinforcement', '').replace(' Opportunity', '')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Location Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Location *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.location}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                    placeholder="Enter location"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Work Area</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.work_area}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, work_area: text }))}
                    placeholder="Enter work area"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Observer Information</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Observer Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.observer_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, observer_name: text }))}
                      placeholder="Your name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Observed Employee</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.observed_employee_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, observed_employee_name: text }))}
                      placeholder="Employee name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Category</Text>
                <View style={styles.categorySelector}>
                  {(Object.keys(OBSERVATION_CATEGORY_LABELS) as ObservationCategory[]).map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.chip,
                        formData.category === cat && styles.chipSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, category: cat }))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.category === cat && styles.chipTextSelected,
                        ]}
                      >
                        {OBSERVATION_CATEGORY_LABELS[cat]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Observation Details</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Behavior Observed *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.behavior_observed}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, behavior_observed: text }))}
                    placeholder="Describe the behavior observed..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Task Being Performed</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.task_being_performed}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, task_being_performed: text }))}
                    placeholder="What task was being performed?"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              {(formData.observation_type === 'safe' || formData.observation_type === 'positive') && (
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Safe Behaviors Observed</Text>
                  <View style={styles.chipContainer}>
                    {COMMON_SAFE_BEHAVIORS.map(behavior => (
                      <TouchableOpacity
                        key={behavior}
                        style={[
                          styles.chip,
                          formData.safe_behaviors.includes(behavior) && styles.chipSelected,
                        ]}
                        onPress={() => toggleSafeBehavior(behavior)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            formData.safe_behaviors.includes(behavior) && styles.chipTextSelected,
                          ]}
                        >
                          {behavior}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {(formData.observation_type === 'at_risk' || formData.observation_type === 'coaching') && (
                <>
                  <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>At-Risk Behaviors Observed</Text>
                    <View style={styles.chipContainer}>
                      {COMMON_AT_RISK_BEHAVIORS.map(behavior => (
                        <TouchableOpacity
                          key={behavior}
                          style={[
                            styles.chip,
                            formData.at_risk_behaviors.includes(behavior) && styles.chipSelected,
                          ]}
                          onPress={() => toggleAtRiskBehavior(behavior)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              formData.at_risk_behaviors.includes(behavior) && styles.chipTextSelected,
                            ]}
                          >
                            {behavior}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Actions Taken</Text>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Immediate Action Taken</Text>
                      <TextInput
                        style={[styles.textInput, styles.textArea]}
                        value={formData.immediate_action_taken}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, immediate_action_taken: text }))}
                        placeholder="Describe any immediate actions..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.switchRow}
                      onPress={() => setFormData(prev => ({ ...prev, coaching_provided: !prev.coaching_provided }))}
                    >
                      <Text style={styles.switchLabel}>Coaching Provided?</Text>
                      <View style={[styles.switchButton, { backgroundColor: formData.coaching_provided ? '#10B981' : colors.border }]}>
                        <View style={[styles.switchKnob, { alignSelf: formData.coaching_provided ? 'flex-end' : 'flex-start' }]} />
                      </View>
                    </TouchableOpacity>

                    {formData.coaching_provided && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Coaching Notes</Text>
                        <TextInput
                          style={[styles.textInput, styles.textArea]}
                          value={formData.coaching_notes}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, coaching_notes: text }))}
                          placeholder="Document coaching conversation..."
                          placeholderTextColor={colors.textSecondary}
                          multiline
                        />
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.switchRow}
                      onPress={() => setFormData(prev => ({ ...prev, corrective_action_required: !prev.corrective_action_required }))}
                    >
                      <Text style={styles.switchLabel}>Corrective Action Required?</Text>
                      <View style={[styles.switchButton, { backgroundColor: formData.corrective_action_required ? '#EF4444' : colors.border }]}>
                        <View style={[styles.switchKnob, { alignSelf: formData.corrective_action_required ? 'flex-end' : 'flex-start' }]} />
                      </View>
                    </TouchableOpacity>

                    {formData.corrective_action_required && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Corrective Action</Text>
                        <TextInput
                          style={[styles.textInput, styles.textArea]}
                          value={formData.corrective_action}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, corrective_action: text }))}
                          placeholder="Describe corrective action needed..."
                          placeholderTextColor={colors.textSecondary}
                          multiline
                        />
                      </View>
                    )}
                  </View>
                </>
              )}

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Additional Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="Any additional notes..."
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
                  {isCreating ? 'Recording...' : 'Record Observation'}
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
              <Text style={styles.modalTitle}>Observation Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedObservation && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Observation Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Number</Text>
                      <Text style={styles.detailValue}>{selectedObservation.observation_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedObservation.observation_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={[styles.detailValue, { color: OBSERVATION_TYPE_COLORS[selectedObservation.observation_type] }]}>
                        {OBSERVATION_TYPE_LABELS[selectedObservation.observation_type]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Category</Text>
                      <Text style={styles.detailValue}>{OBSERVATION_CATEGORY_LABELS[selectedObservation.category]}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: OBSERVATION_STATUS_COLORS[selectedObservation.status] }]}>
                        {OBSERVATION_STATUS_LABELS[selectedObservation.status]}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>{selectedObservation.location}</Text>
                    </View>
                    {selectedObservation.work_area && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Work Area</Text>
                        <Text style={styles.detailValue}>{selectedObservation.work_area}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Observer</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedObservation.observer_name}</Text>
                    </View>
                    {selectedObservation.observed_employee_name && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Observed</Text>
                        <Text style={styles.detailValue}>{selectedObservation.observed_employee_name}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Behavior Observed</Text>
                    <Text style={styles.detailValue}>{selectedObservation.behavior_observed}</Text>
                  </View>

                  {selectedObservation.safe_behaviors.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Safe Behaviors</Text>
                      <View style={styles.detailList}>
                        {selectedObservation.safe_behaviors.map((behavior, index) => (
                          <Text key={index} style={styles.detailListItem}>• {behavior}</Text>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedObservation.at_risk_behaviors.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>At-Risk Behaviors</Text>
                      <View style={styles.detailList}>
                        {selectedObservation.at_risk_behaviors.map((behavior, index) => (
                          <Text key={index} style={styles.detailListItem}>• {behavior}</Text>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedObservation.coaching_provided && selectedObservation.coaching_notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Coaching Notes</Text>
                      <Text style={styles.detailValue}>{selectedObservation.coaching_notes}</Text>
                    </View>
                  )}

                  {selectedObservation.corrective_action && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Corrective Action</Text>
                      <Text style={styles.detailValue}>{selectedObservation.corrective_action}</Text>
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
                All Observations
              </Text>
              {typeFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(OBSERVATION_TYPE_LABELS) as ObservationType[]).map(type => (
              <TouchableOpacity
                key={type}
                style={styles.filterOption}
                onPress={() => {
                  setTypeFilter(type);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, typeFilter === type && styles.filterOptionSelected]}>
                  {OBSERVATION_TYPE_LABELS[type]}
                </Text>
                {typeFilter === type && <CheckCircle size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
