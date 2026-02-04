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
import { useSafetyRecognitions } from '@/hooks/useBehaviorSafety';
import {
  SafetyRecognition,
  RecognitionType,
  RECOGNITION_TYPE_LABELS,
  RECOGNITION_TYPE_COLORS,
} from '@/types/behaviorSafety';
import {
  Plus,
  Search,
  Filter,
  Award,
  Calendar,
  User,
  Star,
  CheckCircle,
  ChevronRight,
  X,
  Trophy,
  Users,
  Gift,
} from 'lucide-react-native';

const STATUS_LABELS: Record<string, string> = {
  nominated: 'Nominated',
  approved: 'Approved',
  presented: 'Presented',
  rejected: 'Rejected',
};

const STATUS_COLORS: Record<string, string> = {
  nominated: '#F59E0B',
  approved: '#3B82F6',
  presented: '#10B981',
  rejected: '#EF4444',
};

export default function SafetyRecognitionScreen() {
  const { colors } = useTheme();
  const {
    recognitions,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useSafetyRecognitions();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RecognitionType | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecognition, setSelectedRecognition] = useState<SafetyRecognition | null>(null);
  const [formData, setFormData] = useState({
    recipient_name: '',
    recipient_department: '',
    recipient_job_title: '',
    is_team_recognition: false,
    team_name: '',
    recognition_type: 'safety_star' as RecognitionType,
    title: '',
    description: '',
    achievement_details: '',
    safety_impact: '',
    award_name: '',
    award_value: '',
    award_description: '',
    presented_by_name: '',
    presented_by_title: '',
    ceremony_date: '',
    ceremony_location: '',
    is_public: true,
    nominated_by_name: '',
    nomination_reason: '',
    notes: '',
  });

  const filteredRecognitions = useMemo(() => {
    return recognitions.filter(r => {
      const matchesSearch =
        r.recognition_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || r.recognition_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [recognitions, searchQuery, typeFilter]);

  const stats = useMemo(() => ({
    total: recognitions.length,
    presented: recognitions.filter(r => r.status === 'presented').length,
    pending: recognitions.filter(r => r.status === 'nominated' || r.status === 'approved').length,
    thisMonth: recognitions.filter(r => {
      const date = new Date(r.recognition_date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
  }), [recognitions]);

  const resetForm = () => {
    setFormData({
      recipient_name: '',
      recipient_department: '',
      recipient_job_title: '',
      is_team_recognition: false,
      team_name: '',
      recognition_type: 'safety_star',
      title: '',
      description: '',
      achievement_details: '',
      safety_impact: '',
      award_name: '',
      award_value: '',
      award_description: '',
      presented_by_name: '',
      presented_by_title: '',
      ceremony_date: '',
      ceremony_location: '',
      is_public: true,
      nominated_by_name: '',
      nomination_reason: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.recipient_name.trim() && !formData.is_team_recognition) {
      Alert.alert('Error', 'Recipient name is required');
      return;
    }

    if (formData.is_team_recognition && !formData.team_name.trim()) {
      Alert.alert('Error', 'Team name is required for team recognition');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Title and description are required');
      return;
    }

    if (!formData.presented_by_name.trim()) {
      Alert.alert('Error', 'Presented by name is required');
      return;
    }

    try {
      const payload = {
        recognition_number: generateNumber(),
        recognition_date: new Date().toISOString().split('T')[0],
        facility_id: null,
        facility_name: null,
        recipient_id: null,
        recipient_name: formData.is_team_recognition ? formData.team_name : formData.recipient_name,
        recipient_department: formData.recipient_department || null,
        recipient_job_title: formData.recipient_job_title || null,
        is_team_recognition: formData.is_team_recognition,
        team_name: formData.is_team_recognition ? formData.team_name : null,
        team_members: [],
        recognition_type: formData.recognition_type,
        category: null,
        title: formData.title,
        description: formData.description,
        achievement_details: formData.achievement_details || null,
        incident_date: null,
        incident_reference: null,
        safety_impact: formData.safety_impact || null,
        award_name: formData.award_name || null,
        award_value: formData.award_value ? parseFloat(formData.award_value) : null,
        award_description: formData.award_description || null,
        presented_by_id: null,
        presented_by_name: formData.presented_by_name,
        presented_by_title: formData.presented_by_title || null,
        ceremony_date: formData.ceremony_date || null,
        ceremony_location: formData.ceremony_location || null,
        announcement_method: null,
        is_public: formData.is_public,
        milestones: {},
        nominated_by_id: null,
        nominated_by_name: formData.nominated_by_name || null,
        nomination_date: formData.nominated_by_name ? new Date().toISOString().split('T')[0] : null,
        nomination_reason: formData.nomination_reason || null,
        approved_by_id: null,
        approved_by_name: null,
        approved_date: null,
        status: 'nominated' as const,
        photos: [],
        attachments: [],
        notes: formData.notes || null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Safety recognition created successfully');
    } catch (err) {
      console.error('Error creating recognition:', err);
      Alert.alert('Error', 'Failed to create recognition');
    }
  };

  const getTypeIcon = (type: RecognitionType) => {
    switch (type) {
      case 'safety_star':
        return <Star size={14} color={RECOGNITION_TYPE_COLORS[type]} />;
      case 'perfect_record':
        return <Trophy size={14} color={RECOGNITION_TYPE_COLORS[type]} />;
      case 'safety_leadership':
        return <Users size={14} color={RECOGNITION_TYPE_COLORS[type]} />;
      default:
        return <Award size={14} color={RECOGNITION_TYPE_COLORS[type]} />;
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
    cardTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    recognitionNumber: {
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
    typeSelector: {
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
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
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.presented}</Text>
          <Text style={styles.statLabel}>Presented</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#3B82F620' }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.thisMonth}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recognitions..."
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
        {filteredRecognitions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Award size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Recognitions Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || typeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first safety recognition'}
            </Text>
          </View>
        ) : (
          filteredRecognitions.map(recognition => (
            <TouchableOpacity
              key={recognition.id}
              style={styles.card}
              onPress={() => {
                setSelectedRecognition(recognition);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{recognition.title}</Text>
                  <Text style={styles.recognitionNumber}>{recognition.recognition_number}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[recognition.status] + '20' },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: STATUS_COLORS[recognition.status] }]}
                  >
                    {STATUS_LABELS[recognition.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {recognition.is_team_recognition ? `Team: ${recognition.team_name}` : recognition.recipient_name}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {new Date(recognition.recognition_date).toLocaleDateString()}
                  </Text>
                </View>
                {recognition.award_value && (
                  <View style={styles.infoRow}>
                    <Gift size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>Award: ${recognition.award_value.toFixed(2)}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.descriptionText} numberOfLines={2}>
                {recognition.description}
              </Text>

              <View style={styles.cardFooter}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: RECOGNITION_TYPE_COLORS[recognition.recognition_type] + '20' },
                  ]}
                >
                  {getTypeIcon(recognition.recognition_type)}
                  <Text style={[styles.typeText, { color: RECOGNITION_TYPE_COLORS[recognition.recognition_type] }]}>
                    {RECOGNITION_TYPE_LABELS[recognition.recognition_type]}
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
              <Text style={styles.modalTitle}>New Safety Recognition</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Recognition Type</Text>
                <View style={styles.typeSelector}>
                  {(Object.keys(RECOGNITION_TYPE_LABELS) as RecognitionType[]).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        formData.recognition_type === type && styles.chipSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, recognition_type: type }))}
                    >
                      {getTypeIcon(type)}
                      <Text
                        style={[
                          styles.chipText,
                          formData.recognition_type === type && styles.chipTextSelected,
                        ]}
                      >
                        {RECOGNITION_TYPE_LABELS[type]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Recipient Information</Text>
                
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, is_team_recognition: !prev.is_team_recognition }))}
                >
                  <Text style={styles.switchLabel}>Team Recognition</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.is_team_recognition ? colors.primary : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.is_team_recognition ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                {formData.is_team_recognition ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Team Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.team_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, team_name: text }))}
                      placeholder="Enter team name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Recipient Name *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.recipient_name}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, recipient_name: text }))}
                        placeholder="Enter recipient name"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>

                    <View style={[styles.row, styles.inputGroup]}>
                      <View style={styles.halfWidth}>
                        <Text style={styles.inputLabel}>Department</Text>
                        <TextInput
                          style={styles.textInput}
                          value={formData.recipient_department}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, recipient_department: text }))}
                          placeholder="Department"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                      <View style={styles.halfWidth}>
                        <Text style={styles.inputLabel}>Job Title</Text>
                        <TextInput
                          style={styles.textInput}
                          value={formData.recipient_job_title}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, recipient_job_title: text }))}
                          placeholder="Job title"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Recognition Details</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.title}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                    placeholder="Recognition title"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                    placeholder="Describe the reason for this recognition..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Achievement Details</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.achievement_details}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, achievement_details: text }))}
                    placeholder="Specific details of the achievement..."
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
                    placeholder="How did this impact safety?"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Award Information</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Award Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.award_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, award_name: text }))}
                      placeholder="e.g., Gift Card"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Value ($)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.award_value}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, award_value: text }))}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Award Description</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.award_description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, award_description: text }))}
                    placeholder="Description of the award"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Presenter Information</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Presented By *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.presented_by_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, presented_by_name: text }))}
                      placeholder="Name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Title</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.presented_by_title}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, presented_by_title: text }))}
                      placeholder="Title"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Ceremony Date</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.ceremony_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, ceremony_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Location</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.ceremony_location}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, ceremony_location: text }))}
                      placeholder="Location"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Nomination</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nominated By</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.nominated_by_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, nominated_by_name: text }))}
                    placeholder="Who nominated this person?"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nomination Reason</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.nomination_reason}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, nomination_reason: text }))}
                    placeholder="Why was this person nominated?"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, is_public: !prev.is_public }))}
                >
                  <Text style={styles.switchLabel}>Public Announcement</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.is_public ? '#10B981' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.is_public ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>
              </View>

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
                  {isCreating ? 'Creating...' : 'Create Recognition'}
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
              <Text style={styles.modalTitle}>Recognition Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedRecognition && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Recognition Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Number</Text>
                      <Text style={styles.detailValue}>{selectedRecognition.recognition_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Title</Text>
                      <Text style={styles.detailValue}>{selectedRecognition.title}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={[styles.detailValue, { color: RECOGNITION_TYPE_COLORS[selectedRecognition.recognition_type] }]}>
                        {RECOGNITION_TYPE_LABELS[selectedRecognition.recognition_type]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: STATUS_COLORS[selectedRecognition.status] }]}>
                        {STATUS_LABELS[selectedRecognition.status]}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedRecognition.recognition_date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Recipient</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedRecognition.recipient_name}</Text>
                    </View>
                    {selectedRecognition.is_team_recognition && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Team</Text>
                        <Text style={styles.detailValue}>{selectedRecognition.team_name}</Text>
                      </View>
                    )}
                    {selectedRecognition.recipient_department && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Department</Text>
                        <Text style={styles.detailValue}>{selectedRecognition.recipient_department}</Text>
                      </View>
                    )}
                    {selectedRecognition.recipient_job_title && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Job Title</Text>
                        <Text style={styles.detailValue}>{selectedRecognition.recipient_job_title}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.detailValue}>{selectedRecognition.description}</Text>
                  </View>

                  {selectedRecognition.achievement_details && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Achievement Details</Text>
                      <Text style={styles.detailValue}>{selectedRecognition.achievement_details}</Text>
                    </View>
                  )}

                  {selectedRecognition.safety_impact && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Safety Impact</Text>
                      <Text style={styles.detailValue}>{selectedRecognition.safety_impact}</Text>
                    </View>
                  )}

                  {(selectedRecognition.award_name || selectedRecognition.award_value) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Award</Text>
                      {selectedRecognition.award_name && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Name</Text>
                          <Text style={styles.detailValue}>{selectedRecognition.award_name}</Text>
                        </View>
                      )}
                      {selectedRecognition.award_value && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Value</Text>
                          <Text style={[styles.detailValue, { color: '#10B981' }]}>
                            ${selectedRecognition.award_value.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Presenter</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedRecognition.presented_by_name}</Text>
                    </View>
                    {selectedRecognition.presented_by_title && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Title</Text>
                        <Text style={styles.detailValue}>{selectedRecognition.presented_by_title}</Text>
                      </View>
                    )}
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
                All Recognitions
              </Text>
              {typeFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(RECOGNITION_TYPE_LABELS) as RecognitionType[]).map(type => (
              <TouchableOpacity
                key={type}
                style={styles.filterOption}
                onPress={() => {
                  setTypeFilter(type);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, typeFilter === type && styles.filterOptionSelected]}>
                  {RECOGNITION_TYPE_LABELS[type]}
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
