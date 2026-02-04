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
import { useSafetySuggestions } from '@/hooks/useBehaviorSafety';
import {
  SafetySuggestion,
  SuggestionStatus,
  SuggestionCategory,
  Priority,
  SUGGESTION_STATUS_LABELS,
  SUGGESTION_STATUS_COLORS,
  SUGGESTION_CATEGORY_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/types/behaviorSafety';
import {
  Plus,
  Search,
  Filter,
  Lightbulb,
  Calendar,
  User,
  Tag,
  CheckCircle,
  ChevronRight,
  X,
} from 'lucide-react-native';

export default function SafetySuggestionScreen() {
  const { colors } = useTheme();
  const {
    suggestions,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useSafetySuggestions();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SafetySuggestion | null>(null);
  const [formData, setFormData] = useState({
    submitter_name: '',
    submitter_department: '',
    submitter_email: '',
    is_anonymous: false,
    location: '',
    category: 'process' as SuggestionCategory,
    title: '',
    description: '',
    current_situation: '',
    proposed_solution: '',
    expected_benefits: '',
    safety_impact: '',
    estimated_cost: '',
    cost_savings_potential: '',
    priority: 'medium' as Priority,
    notes: '',
  });

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      const matchesSearch =
        s.suggestion_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.submitter_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [suggestions, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: suggestions.length,
    submitted: suggestions.filter(s => s.status === 'submitted' || s.status === 'under_review').length,
    approved: suggestions.filter(s => s.status === 'approved').length,
    implemented: suggestions.filter(s => s.status === 'implemented').length,
  }), [suggestions]);

  const resetForm = () => {
    setFormData({
      submitter_name: '',
      submitter_department: '',
      submitter_email: '',
      is_anonymous: false,
      location: '',
      category: 'process',
      title: '',
      description: '',
      current_situation: '',
      proposed_solution: '',
      expected_benefits: '',
      safety_impact: '',
      estimated_cost: '',
      cost_savings_potential: '',
      priority: 'medium',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Title and description are required');
      return;
    }

    if (!formData.is_anonymous && !formData.submitter_name.trim()) {
      Alert.alert('Error', 'Submitter name is required unless anonymous');
      return;
    }

    try {
      const payload = {
        suggestion_number: generateNumber(),
        submission_date: new Date().toISOString().split('T')[0],
        submitter_id: null,
        submitter_name: formData.is_anonymous ? 'Anonymous' : formData.submitter_name,
        submitter_department: formData.submitter_department || null,
        submitter_email: formData.submitter_email || null,
        is_anonymous: formData.is_anonymous,
        facility_id: null,
        facility_name: null,
        department: formData.submitter_department || null,
        location: formData.location || null,
        category: formData.category,
        title: formData.title,
        description: formData.description,
        current_situation: formData.current_situation || null,
        proposed_solution: formData.proposed_solution || null,
        expected_benefits: formData.expected_benefits || null,
        safety_impact: formData.safety_impact || null,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        cost_savings_potential: formData.cost_savings_potential ? parseFloat(formData.cost_savings_potential) : null,
        priority: formData.priority,
        status: 'submitted' as SuggestionStatus,
        assigned_to: null,
        assigned_to_id: null,
        assigned_date: null,
        reviewed_by: null,
        reviewed_by_id: null,
        reviewed_date: null,
        review_notes: null,
        approved_by: null,
        approved_by_id: null,
        approved_date: null,
        rejection_reason: null,
        implementation_date: null,
        implementation_notes: null,
        implemented_by: null,
        implemented_by_id: null,
        follow_up_required: false,
        follow_up_date: null,
        recognition_given: false,
        recognition_type: null,
        recognition_date: null,
        attachments: [],
        photos: [],
        notes: formData.notes || null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Safety suggestion submitted successfully');
    } catch (err) {
      console.error('Error creating suggestion:', err);
      Alert.alert('Error', 'Failed to submit suggestion');
    }
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
      backgroundColor: '#F59E0B',
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
    suggestionTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    suggestionNumber: {
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
    descriptionText: {
      fontSize: 14,
      color: colors.text,
      marginTop: 8,
      lineHeight: 20,
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
    priorityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    priorityText: {
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
    categorySelector: {
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
    prioritySelector: {
      flexDirection: 'row',
      gap: 8,
    },
    priorityOption: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    priorityOptionSelected: {
      borderWidth: 2,
    },
    priorityOptionText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    submitButton: {
      backgroundColor: '#F59E0B',
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
        <View style={[styles.statCard, { backgroundColor: '#6B728020' }]}>
          <Text style={[styles.statValue, { color: '#6B7280' }]}>{stats.submitted}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#3B82F620' }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.implemented}</Text>
          <Text style={styles.statLabel}>Implemented</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search suggestions..."
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
        {filteredSuggestions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Lightbulb size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Suggestions Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Submit your first safety suggestion'}
            </Text>
          </View>
        ) : (
          filteredSuggestions.map(suggestion => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.card}
              onPress={() => {
                setSelectedSuggestion(suggestion);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                  <Text style={styles.suggestionNumber}>{suggestion.suggestion_number}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: SUGGESTION_STATUS_COLORS[suggestion.status] + '20' },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: SUGGESTION_STATUS_COLORS[suggestion.status] }]}
                  >
                    {SUGGESTION_STATUS_LABELS[suggestion.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {new Date(suggestion.submission_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {suggestion.is_anonymous ? 'Anonymous' : suggestion.submitter_name}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Tag size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{SUGGESTION_CATEGORY_LABELS[suggestion.category]}</Text>
                </View>
              </View>

              <Text style={styles.descriptionText} numberOfLines={2}>
                {suggestion.description}
              </Text>

              <View style={styles.cardFooter}>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: PRIORITY_COLORS[suggestion.priority] + '20' },
                  ]}
                >
                  <Text style={[styles.priorityText, { color: PRIORITY_COLORS[suggestion.priority] }]}>
                    {PRIORITY_LABELS[suggestion.priority]}
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
              <Text style={styles.modalTitle}>New Safety Suggestion</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Submitter Information</Text>
                
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, is_anonymous: !prev.is_anonymous }))}
                >
                  <Text style={styles.switchLabel}>Submit Anonymously</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.is_anonymous ? colors.primary : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.is_anonymous ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                {!formData.is_anonymous && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Your Name *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.submitter_name}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, submitter_name: text }))}
                        placeholder="Enter your name"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>

                    <View style={[styles.row, styles.inputGroup]}>
                      <View style={styles.halfWidth}>
                        <Text style={styles.inputLabel}>Department</Text>
                        <TextInput
                          style={styles.textInput}
                          value={formData.submitter_department}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, submitter_department: text }))}
                          placeholder="Department"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                      <View style={styles.halfWidth}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <TextInput
                          style={styles.textInput}
                          value={formData.submitter_email}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, submitter_email: text }))}
                          placeholder="Email"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="email-address"
                        />
                      </View>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Category</Text>
                <View style={styles.categorySelector}>
                  {(Object.keys(SUGGESTION_CATEGORY_LABELS) as SuggestionCategory[]).map(cat => (
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
                        {SUGGESTION_CATEGORY_LABELS[cat]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Suggestion Details</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.title}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                    placeholder="Brief title for your suggestion"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                    placeholder="Describe your safety suggestion in detail..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Situation</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.current_situation}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, current_situation: text }))}
                    placeholder="Describe the current situation or problem..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Proposed Solution</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.proposed_solution}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, proposed_solution: text }))}
                    placeholder="How would you solve this?"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.location}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                    placeholder="Where does this apply?"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Impact & Benefits</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Expected Benefits</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.expected_benefits}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, expected_benefits: text }))}
                    placeholder="What benefits would this provide?"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Safety Impact</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.safety_impact}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, safety_impact: text }))}
                    placeholder="How would this improve safety?"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Estimated Cost ($)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.estimated_cost}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, estimated_cost: text }))}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Savings Potential ($)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.cost_savings_potential}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, cost_savings_potential: text }))}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Priority</Text>
                <View style={styles.prioritySelector}>
                  {(['low', 'medium', 'high', 'critical'] as Priority[]).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityOption,
                        formData.priority === p && [
                          styles.priorityOptionSelected,
                          { borderColor: PRIORITY_COLORS[p] },
                        ],
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, priority: p }))}
                    >
                      <Text style={[
                        styles.priorityOptionText,
                        formData.priority === p && { color: PRIORITY_COLORS[p], fontWeight: '600' as const }
                      ]}>
                        {PRIORITY_LABELS[p]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Additional Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="Any additional information..."
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
                  {isCreating ? 'Submitting...' : 'Submit Suggestion'}
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
              <Text style={styles.modalTitle}>Suggestion Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedSuggestion && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Suggestion Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Number</Text>
                      <Text style={styles.detailValue}>{selectedSuggestion.suggestion_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Title</Text>
                      <Text style={styles.detailValue}>{selectedSuggestion.title}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Category</Text>
                      <Text style={styles.detailValue}>{SUGGESTION_CATEGORY_LABELS[selectedSuggestion.category]}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: SUGGESTION_STATUS_COLORS[selectedSuggestion.status] }]}>
                        {SUGGESTION_STATUS_LABELS[selectedSuggestion.status]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Priority</Text>
                      <Text style={[styles.detailValue, { color: PRIORITY_COLORS[selectedSuggestion.priority] }]}>
                        {PRIORITY_LABELS[selectedSuggestion.priority]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Submitted</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedSuggestion.submission_date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Submitter</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>
                        {selectedSuggestion.is_anonymous ? 'Anonymous' : selectedSuggestion.submitter_name}
                      </Text>
                    </View>
                    {!selectedSuggestion.is_anonymous && selectedSuggestion.submitter_department && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Department</Text>
                        <Text style={styles.detailValue}>{selectedSuggestion.submitter_department}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.detailValue}>{selectedSuggestion.description}</Text>
                  </View>

                  {selectedSuggestion.current_situation && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Current Situation</Text>
                      <Text style={styles.detailValue}>{selectedSuggestion.current_situation}</Text>
                    </View>
                  )}

                  {selectedSuggestion.proposed_solution && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Proposed Solution</Text>
                      <Text style={styles.detailValue}>{selectedSuggestion.proposed_solution}</Text>
                    </View>
                  )}

                  {selectedSuggestion.expected_benefits && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Expected Benefits</Text>
                      <Text style={styles.detailValue}>{selectedSuggestion.expected_benefits}</Text>
                    </View>
                  )}

                  {(selectedSuggestion.estimated_cost || selectedSuggestion.cost_savings_potential) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Financial Impact</Text>
                      {selectedSuggestion.estimated_cost && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Est. Cost</Text>
                          <Text style={styles.detailValue}>${selectedSuggestion.estimated_cost.toFixed(2)}</Text>
                        </View>
                      )}
                      {selectedSuggestion.cost_savings_potential && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Savings</Text>
                          <Text style={[styles.detailValue, { color: '#10B981' }]}>
                            ${selectedSuggestion.cost_savings_potential.toFixed(2)}
                          </Text>
                        </View>
                      )}
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
                All Suggestions
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(SUGGESTION_STATUS_LABELS) as SuggestionStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {SUGGESTION_STATUS_LABELS[status]}
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
