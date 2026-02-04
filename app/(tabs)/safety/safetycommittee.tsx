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
import { useSafetyCommitteeMeetings } from '@/hooks/useBehaviorSafety';
import {
  SafetyCommitteeMeeting,
  MeetingType,
  MEETING_TYPE_LABELS,
} from '@/types/behaviorSafety';
import {
  Plus,
  Search,
  Users,
  Calendar,
  MapPin,
  CheckCircle,
  ChevronRight,
  X,
  UserCheck,
} from 'lucide-react-native';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  distributed: 'Distributed',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  pending_approval: '#F59E0B',
  approved: '#3B82F6',
  distributed: '#10B981',
};

export default function SafetyCommitteeScreen() {
  const { colors } = useTheme();
  const {
    meetings,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useSafetyCommitteeMeetings();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<SafetyCommitteeMeeting | null>(null);
  const [formData, setFormData] = useState({
    meeting_date: new Date().toISOString().split('T')[0],
    meeting_time: '',
    meeting_type: 'regular' as MeetingType,
    location: '',
    chairperson_name: '',
    secretary_name: '',
    quorum_met: true,
    previous_minutes_approved: false,
    training_updates: [] as string[],
    announcements: [] as string[],
    next_meeting_date: '',
    notes: '',
  });
  const [newTrainingUpdate, setNewTrainingUpdate] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState('');

  const filteredMeetings = useMemo(() => {
    return meetings.filter(m =>
      m.meeting_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.chairperson_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.location && m.location.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [meetings, searchQuery]);

  const stats = useMemo(() => ({
    total: meetings.length,
    thisYear: meetings.filter(m => new Date(m.meeting_date).getFullYear() === new Date().getFullYear()).length,
    approved: meetings.filter(m => m.status === 'approved' || m.status === 'distributed').length,
    draft: meetings.filter(m => m.status === 'draft').length,
  }), [meetings]);

  const resetForm = () => {
    setFormData({
      meeting_date: new Date().toISOString().split('T')[0],
      meeting_time: '',
      meeting_type: 'regular',
      location: '',
      chairperson_name: '',
      secretary_name: '',
      quorum_met: true,
      previous_minutes_approved: false,
      training_updates: [],
      announcements: [],
      next_meeting_date: '',
      notes: '',
    });
    setNewTrainingUpdate('');
    setNewAnnouncement('');
  };

  const handleSubmit = async () => {
    if (!formData.chairperson_name.trim()) {
      Alert.alert('Error', 'Chairperson name is required');
      return;
    }

    try {
      const payload = {
        meeting_number: generateNumber(),
        meeting_date: formData.meeting_date,
        meeting_time: formData.meeting_time || null,
        meeting_end_time: null,
        facility_id: null,
        facility_name: null,
        meeting_type: formData.meeting_type,
        location: formData.location || null,
        chairperson_id: null,
        chairperson_name: formData.chairperson_name,
        secretary_id: null,
        secretary_name: formData.secretary_name || null,
        attendees: [],
        absentees: [],
        guests: [],
        quorum_met: formData.quorum_met,
        previous_minutes_approved: formData.previous_minutes_approved,
        agenda_items: [],
        old_business: [],
        new_business: [],
        incident_reviews: [],
        inspection_reviews: [],
        training_updates: formData.training_updates,
        safety_metrics: {},
        action_items: [],
        motions: [],
        announcements: formData.announcements,
        next_meeting_date: formData.next_meeting_date || null,
        next_meeting_time: null,
        next_meeting_location: null,
        minutes_approved_by: null,
        minutes_approved_by_id: null,
        minutes_approved_date: null,
        status: 'draft' as const,
        distribution_list: [],
        distributed_date: null,
        attachments: [],
        notes: formData.notes || null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Meeting minutes created successfully');
    } catch (err) {
      console.error('Error creating meeting:', err);
      Alert.alert('Error', 'Failed to create meeting minutes');
    }
  };

  const addItem = (field: 'training_updates' | 'announcements', value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()],
      }));
      setter('');
    }
  };

  const removeItem = (field: 'training_updates' | 'announcements', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
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
    addButton: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#8B5CF6',
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
    meetingNumber: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    meetingType: {
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
    quorumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
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
    addItemRow: {
      flexDirection: 'row',
      gap: 8,
    },
    addItemInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    addItemButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    addItemButtonText: {
      color: '#fff',
      fontWeight: '600' as const,
    },
    itemList: {
      marginTop: 8,
      gap: 4,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    itemText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    removeItemButton: {
      padding: 4,
    },
    submitButton: {
      backgroundColor: '#8B5CF6',
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
  });

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#3B82F620' }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.thisYear}</Text>
          <Text style={styles.statLabel}>This Year</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#6B728020' }]}>
          <Text style={[styles.statValue, { color: '#6B7280' }]}>{stats.draft}</Text>
          <Text style={styles.statLabel}>Draft</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search meetings..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {filteredMeetings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Users size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Meetings Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'Create your first committee meeting minutes'}
            </Text>
          </View>
        ) : (
          filteredMeetings.map(meeting => (
            <TouchableOpacity
              key={meeting.id}
              style={styles.card}
              onPress={() => {
                setSelectedMeeting(meeting);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.meetingNumber}>{meeting.meeting_number}</Text>
                  <Text style={styles.meetingType}>{MEETING_TYPE_LABELS[meeting.meeting_type]}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[meeting.status] + '20' },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: STATUS_COLORS[meeting.status] }]}
                  >
                    {STATUS_LABELS[meeting.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {new Date(meeting.meeting_date).toLocaleDateString()}
                    {meeting.meeting_time && ` at ${meeting.meeting_time}`}
                  </Text>
                </View>
                {meeting.location && (
                  <View style={styles.infoRow}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{meeting.location}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <UserCheck size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>Chair: {meeting.chairperson_name}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.quorumBadge}>
                  {meeting.quorum_met ? (
                    <>
                      <CheckCircle size={14} color="#10B981" />
                      <Text style={{ fontSize: 12, color: '#10B981' }}>Quorum Met</Text>
                    </>
                  ) : (
                    <>
                      <X size={14} color="#EF4444" />
                      <Text style={{ fontSize: 12, color: '#EF4444' }}>No Quorum</Text>
                    </>
                  )}
                </View>
                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Minutes</Text>
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
              <Text style={styles.modalTitle}>New Committee Meeting</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Meeting Type</Text>
                <View style={styles.typeSelector}>
                  {(Object.keys(MEETING_TYPE_LABELS) as MeetingType[]).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        formData.meeting_type === type && styles.chipSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, meeting_type: type }))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.meeting_type === type && styles.chipTextSelected,
                        ]}
                      >
                        {MEETING_TYPE_LABELS[type]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Meeting Details</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Date *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.meeting_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, meeting_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Time</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.meeting_time}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, meeting_time: text }))}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.location}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                    placeholder="Conference room, etc."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Meeting Officers</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Chairperson *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.chairperson_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, chairperson_name: text }))}
                      placeholder="Name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Secretary</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.secretary_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, secretary_name: text }))}
                      placeholder="Name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Meeting Status</Text>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, quorum_met: !prev.quorum_met }))}
                >
                  <Text style={styles.switchLabel}>Quorum Met</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.quorum_met ? '#10B981' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.quorum_met ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, previous_minutes_approved: !prev.previous_minutes_approved }))}
                >
                  <Text style={styles.switchLabel}>Previous Minutes Approved</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.previous_minutes_approved ? '#10B981' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.previous_minutes_approved ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Training Updates</Text>
                <View style={styles.addItemRow}>
                  <TextInput
                    style={styles.addItemInput}
                    value={newTrainingUpdate}
                    onChangeText={setNewTrainingUpdate}
                    placeholder="Add training update..."
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity
                    style={styles.addItemButton}
                    onPress={() => addItem('training_updates', newTrainingUpdate, setNewTrainingUpdate)}
                  >
                    <Text style={styles.addItemButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {formData.training_updates.length > 0 && (
                  <View style={styles.itemList}>
                    {formData.training_updates.map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemText}>• {item}</Text>
                        <TouchableOpacity
                          style={styles.removeItemButton}
                          onPress={() => removeItem('training_updates', index)}
                        >
                          <X size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Announcements</Text>
                <View style={styles.addItemRow}>
                  <TextInput
                    style={styles.addItemInput}
                    value={newAnnouncement}
                    onChangeText={setNewAnnouncement}
                    placeholder="Add announcement..."
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity
                    style={styles.addItemButton}
                    onPress={() => addItem('announcements', newAnnouncement, setNewAnnouncement)}
                  >
                    <Text style={styles.addItemButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {formData.announcements.length > 0 && (
                  <View style={styles.itemList}>
                    {formData.announcements.map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemText}>• {item}</Text>
                        <TouchableOpacity
                          style={styles.removeItemButton}
                          onPress={() => removeItem('announcements', index)}
                        >
                          <X size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Next Meeting</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Next Meeting Date</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.next_meeting_date}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, next_meeting_date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
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
                  {isCreating ? 'Creating...' : 'Create Meeting Minutes'}
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
              <Text style={styles.modalTitle}>Meeting Minutes</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedMeeting && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Meeting Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Number</Text>
                      <Text style={styles.detailValue}>{selectedMeeting.meeting_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>{MEETING_TYPE_LABELS[selectedMeeting.meeting_type]}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                      </Text>
                    </View>
                    {selectedMeeting.meeting_time && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailValue}>{selectedMeeting.meeting_time}</Text>
                      </View>
                    )}
                    {selectedMeeting.location && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Location</Text>
                        <Text style={styles.detailValue}>{selectedMeeting.location}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: STATUS_COLORS[selectedMeeting.status] }]}>
                        {STATUS_LABELS[selectedMeeting.status]}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Officers</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Chairperson</Text>
                      <Text style={styles.detailValue}>{selectedMeeting.chairperson_name}</Text>
                    </View>
                    {selectedMeeting.secretary_name && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Secretary</Text>
                        <Text style={styles.detailValue}>{selectedMeeting.secretary_name}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Meeting Status</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Quorum Met</Text>
                      <Text style={[styles.detailValue, { color: selectedMeeting.quorum_met ? '#10B981' : '#EF4444' }]}>
                        {selectedMeeting.quorum_met ? 'Yes' : 'No'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Prev. Minutes</Text>
                      <Text style={[styles.detailValue, { color: selectedMeeting.previous_minutes_approved ? '#10B981' : '#6B7280' }]}>
                        {selectedMeeting.previous_minutes_approved ? 'Approved' : 'Not Approved'}
                      </Text>
                    </View>
                  </View>

                  {selectedMeeting.training_updates.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Training Updates</Text>
                      <View style={styles.detailList}>
                        {selectedMeeting.training_updates.map((update, index) => (
                          <Text key={index} style={styles.detailListItem}>• {update}</Text>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedMeeting.announcements.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Announcements</Text>
                      <View style={styles.detailList}>
                        {selectedMeeting.announcements.map((announcement, index) => (
                          <Text key={index} style={styles.detailListItem}>• {announcement}</Text>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedMeeting.next_meeting_date && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Next Meeting</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedMeeting.next_meeting_date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
