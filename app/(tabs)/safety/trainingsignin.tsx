import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  Plus,
  Calendar,
  Clock,
  User,
  FileText,
  X,
  Check,
  ChevronDown,
  History,
  GraduationCap,
  BookOpen,
  Shield,
  Flame,
  AlertTriangle,
  Truck,
  Zap,
  Heart,
  HardHat,
  ChevronRight,
  Trash2,
  Edit3,
  ClipboardCheck,
  Award,
  Building2,
  MapPin,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface TrainingType {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  description: string;
}

const TRAINING_TYPES: TrainingType[] = [
  {
    id: 'safety_orientation',
    name: 'Safety Orientation',
    icon: Shield,
    color: '#3B82F6',
    description: 'New employee safety training',
  },
  {
    id: 'hazcom',
    name: 'HazCom/GHS',
    icon: AlertTriangle,
    color: '#F59E0B',
    description: 'Hazard communication training',
  },
  {
    id: 'fire_safety',
    name: 'Fire Safety',
    icon: Flame,
    color: '#EF4444',
    description: 'Fire prevention and response',
  },
  {
    id: 'forklift',
    name: 'Forklift/PIT',
    icon: Truck,
    color: '#F97316',
    description: 'Powered industrial truck training',
  },
  {
    id: 'lockout_tagout',
    name: 'Lockout/Tagout',
    icon: Zap,
    color: '#8B5CF6',
    description: 'LOTO procedures training',
  },
  {
    id: 'first_aid',
    name: 'First Aid/CPR',
    icon: Heart,
    color: '#EC4899',
    description: 'Emergency medical response',
  },
  {
    id: 'ppe',
    name: 'PPE Training',
    icon: HardHat,
    color: '#10B981',
    description: 'Personal protective equipment',
  },
  {
    id: 'job_specific',
    name: 'Job-Specific',
    icon: BookOpen,
    color: '#06B6D4',
    description: 'Role-specific safety training',
  },
  {
    id: 'annual_refresher',
    name: 'Annual Refresher',
    icon: GraduationCap,
    color: '#6366F1',
    description: 'Yearly safety refresher course',
  },
  {
    id: 'other',
    name: 'Other Training',
    icon: FileText,
    color: '#64748B',
    description: 'Other safety training',
  },
];

const LOCATIONS = [
  { id: 'training_room', name: 'Training Room' },
  { id: 'conference_room', name: 'Conference Room' },
  { id: 'production_floor', name: 'Production Floor' },
  { id: 'warehouse', name: 'Warehouse' },
  { id: 'break_room', name: 'Break Room' },
  { id: 'outdoor', name: 'Outdoor Area' },
  { id: 'online', name: 'Online/Virtual' },
  { id: 'other', name: 'Other' },
];

interface Attendee {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  signed: boolean;
  signedAt: string | null;
}

interface TrainingFormData {
  trainingTitle: string;
  trainingType: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  instructorName: string;
  instructorQualifications: string;
  location: string;
  specificLocation: string;
  materialsProvided: string;
  learningObjectives: string;
  attendees: Attendee[];
  notes: string;
}

interface TrainingRecord {
  id: string;
  trainingTitle: string;
  trainingType: string;
  date: string;
  instructorName: string;
  location: string;
  attendeeCount: number;
  status: 'completed' | 'in_progress' | 'cancelled';
  createdAt: string;
}

const initialFormData: TrainingFormData = {
  trainingTitle: '',
  trainingType: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  startTime: '08:00',
  endTime: '09:00',
  duration: '1 hour',
  instructorName: '',
  instructorQualifications: '',
  location: '',
  specificLocation: '',
  materialsProvided: '',
  learningObjectives: '',
  attendees: [],
  notes: '',
};

export default function TrainingSignInScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState<TrainingFormData>(initialFormData);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const [newAttendeeName, setNewAttendeeName] = useState('');
  const [newAttendeeId, setNewAttendeeId] = useState('');
  const [newAttendeeDept, setNewAttendeeDept] = useState('');

  const [trainingHistory, setTrainingHistory] = useState<TrainingRecord[]>([
    {
      id: '1',
      trainingTitle: 'Annual Safety Refresher 2024',
      trainingType: 'annual_refresher',
      date: '2024-01-15',
      instructorName: 'John Smith',
      location: 'Training Room',
      attendeeCount: 24,
      status: 'completed',
      createdAt: '2024-01-15T08:00:00Z',
    },
    {
      id: '2',
      trainingTitle: 'Forklift Certification',
      trainingType: 'forklift',
      date: '2024-01-10',
      instructorName: 'Mike Johnson',
      location: 'Warehouse',
      attendeeCount: 8,
      status: 'completed',
      createdAt: '2024-01-10T09:00:00Z',
    },
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const updateFormData = useCallback((key: keyof TrainingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const addAttendee = useCallback(() => {
    if (!newAttendeeName.trim()) {
      Alert.alert('Error', 'Please enter attendee name');
      return;
    }

    const newAttendee: Attendee = {
      id: Date.now().toString(),
      name: newAttendeeName.trim(),
      employeeId: newAttendeeId.trim() || 'N/A',
      department: newAttendeeDept.trim() || 'N/A',
      signed: false,
      signedAt: null,
    };

    setFormData(prev => ({
      ...prev,
      attendees: [...prev.attendees, newAttendee],
    }));

    setNewAttendeeName('');
    setNewAttendeeId('');
    setNewAttendeeDept('');
    setShowAddAttendee(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [newAttendeeName, newAttendeeId, newAttendeeDept]);

  const toggleAttendeeSignature = useCallback((attendeeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.map(a =>
        a.id === attendeeId
          ? { ...a, signed: !a.signed, signedAt: !a.signed ? new Date().toISOString() : null }
          : a
      ),
    }));
  }, []);

  const removeAttendee = useCallback((attendeeId: string) => {
    Alert.alert(
      'Remove Attendee',
      'Are you sure you want to remove this attendee?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setFormData(prev => ({
              ...prev,
              attendees: prev.attendees.filter(a => a.id !== attendeeId),
            }));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  }, []);

  const signedCount = useMemo(() => {
    return formData.attendees.filter(a => a.signed).length;
  }, [formData.attendees]);

  const canSubmit = formData.trainingTitle.trim().length > 0 &&
    formData.trainingType &&
    formData.instructorName.trim().length > 0 &&
    formData.attendees.length > 0 &&
    signedCount > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete all required fields:\n• Training Title\n• Training Type\n• Instructor Name\n• At least one signed attendee');
      return;
    }

    const unsignedCount = formData.attendees.length - signedCount;
    const message = unsignedCount > 0
      ? `${unsignedCount} attendee(s) have not signed. Do you want to submit anyway?`
      : 'Submit this training sign-in sheet?';

    Alert.alert(
      'Submit Training Record',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await new Promise(resolve => setTimeout(resolve, 1500));

              const newRecord: TrainingRecord = {
                id: Date.now().toString(),
                trainingTitle: formData.trainingTitle,
                trainingType: formData.trainingType,
                date: formData.date,
                instructorName: formData.instructorName,
                location: LOCATIONS.find(l => l.id === formData.location)?.name || formData.location,
                attendeeCount: signedCount,
                status: 'completed',
                createdAt: new Date().toISOString(),
              };

              setTrainingHistory(prev => [newRecord, ...prev]);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', `Training record saved with ${signedCount} signed attendee(s).`);

              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[TrainingSignIn] Submit error:', error);
              Alert.alert('Error', 'Failed to submit training record. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }, [canSubmit, formData, signedCount]);

  const resetForm = useCallback(() => {
    if (formData.attendees.length > 0 || formData.trainingTitle) {
      Alert.alert(
        'Clear Form',
        'Are you sure you want to clear all entries? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: () => setFormData(initialFormData),
          },
        ]
      );
    } else {
      setFormData(initialFormData);
    }
  }, [formData]);

  const getTypeColor = (typeId: string) => {
    return TRAINING_TYPES.find(t => t.id === typeId)?.color || colors.textSecondary;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const renderNewTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
          <Users size={32} color="#3B82F6" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Training Sign-In Sheet</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Document attendance for safety training sessions
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Training Title *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="e.g., Annual Safety Refresher 2024"
        placeholderTextColor={colors.textSecondary}
        value={formData.trainingTitle}
        onChangeText={(text) => updateFormData('trainingTitle', text)}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Training Type *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowTypePicker(true)}
      >
        {formData.trainingType ? (
          <>
            {React.createElement(TRAINING_TYPES.find(t => t.id === formData.trainingType)?.icon || FileText, {
              size: 18,
              color: getTypeColor(formData.trainingType),
            })}
            <Text style={[styles.selectorText, { color: colors.text }]}>
              {TRAINING_TYPES.find(t => t.id === formData.trainingType)?.name}
            </Text>
          </>
        ) : (
          <>
            <GraduationCap size={18} color={colors.textSecondary} />
            <Text style={[styles.selectorText, { color: colors.textSecondary }]}>Select training type</Text>
          </>
        )}
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Description/Objectives</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe the training content and learning objectives..."
        placeholderTextColor={colors.textSecondary}
        value={formData.description}
        onChangeText={(text) => updateFormData('description', text)}
        multiline
        numberOfLines={3}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date *</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.date}
              onChangeText={(text) => updateFormData('date', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Duration</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.duration}
              onChangeText={(text) => updateFormData('duration', text)}
              placeholder="e.g., 2 hours"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Start Time</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.startTime}
              onChangeText={(text) => updateFormData('startTime', text)}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>End Time</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.endTime}
              onChangeText={(text) => updateFormData('endTime', text)}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructor Details</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Instructor Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Full name of trainer"
          placeholderTextColor={colors.textSecondary}
          value={formData.instructorName}
          onChangeText={(text) => updateFormData('instructorName', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Qualifications/Certifications</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="e.g., OSHA Certified Trainer, CPR Instructor"
        placeholderTextColor={colors.textSecondary}
        value={formData.instructorQualifications}
        onChangeText={(text) => updateFormData('instructorQualifications', text)}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Location & Materials</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Training Location</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowLocationPicker(true)}
      >
        <MapPin size={18} color={formData.location ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.location ? colors.text : colors.textSecondary }]}>
          {formData.location ? LOCATIONS.find(l => l.id === formData.location)?.name : 'Select location'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Materials Provided</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="e.g., Handouts, Videos, Safety Manual"
        placeholderTextColor={colors.textSecondary}
        value={formData.materialsProvided}
        onChangeText={(text) => updateFormData('materialsProvided', text)}
      />

      <View style={styles.attendeesHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
          Attendees ({formData.attendees.length})
        </Text>
        <Pressable
          style={[styles.addAttendeeBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddAttendee(true)}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addAttendeeBtnText}>Add</Text>
        </Pressable>
      </View>

      {formData.attendees.length === 0 ? (
        <View style={[styles.emptyAttendees, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Users size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyAttendeesText, { color: colors.textSecondary }]}>
            No attendees added yet
          </Text>
          <Text style={[styles.emptyAttendeesSubtext, { color: colors.textSecondary }]}>
            Tap &quot;Add&quot; to add training participants
          </Text>
        </View>
      ) : (
        <View style={styles.attendeesList}>
          <View style={[styles.attendeeStatsBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.attendeeStat}>
              <Text style={[styles.attendeeStatValue, { color: colors.primary }]}>{formData.attendees.length}</Text>
              <Text style={[styles.attendeeStatLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.attendeeStat}>
              <Text style={[styles.attendeeStatValue, { color: '#10B981' }]}>{signedCount}</Text>
              <Text style={[styles.attendeeStatLabel, { color: colors.textSecondary }]}>Signed</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.attendeeStat}>
              <Text style={[styles.attendeeStatValue, { color: '#F59E0B' }]}>{formData.attendees.length - signedCount}</Text>
              <Text style={[styles.attendeeStatLabel, { color: colors.textSecondary }]}>Pending</Text>
            </View>
          </View>

          {formData.attendees.map((attendee, index) => (
            <View
              key={attendee.id}
              style={[
                styles.attendeeCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                attendee.signed && { borderColor: '#10B98140' },
              ]}
            >
              <View style={styles.attendeeRow}>
                <View style={styles.attendeeNumber}>
                  <Text style={[styles.attendeeNumberText, { color: colors.textSecondary }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.attendeeInfo}>
                  <Text style={[styles.attendeeName, { color: colors.text }]}>{attendee.name}</Text>
                  <Text style={[styles.attendeeDetail, { color: colors.textSecondary }]}>
                    ID: {attendee.employeeId} • {attendee.department}
                  </Text>
                </View>
                <View style={styles.attendeeActions}>
                  <Pressable
                    style={[
                      styles.signatureBtn,
                      { backgroundColor: attendee.signed ? '#10B98120' : colors.background },
                      { borderColor: attendee.signed ? '#10B981' : colors.border },
                    ]}
                    onPress={() => toggleAttendeeSignature(attendee.id)}
                  >
                    {attendee.signed ? (
                      <Check size={18} color="#10B981" />
                    ) : (
                      <Edit3 size={16} color={colors.textSecondary} />
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => removeAttendee(attendee.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
              {attendee.signed && attendee.signedAt && (
                <Text style={[styles.signedTime, { color: '#10B981' }]}>
                  ✓ Signed at {new Date(attendee.signedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Notes</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Any additional notes or comments..."
        placeholderTextColor={colors.textSecondary}
        value={formData.notes}
        onChangeText={(text) => updateFormData('notes', text)}
        multiline
        numberOfLines={3}
      />

      <View style={styles.actionButtons}>
        <Pressable
          style={[styles.resetButton, { borderColor: colors.border }]}
          onPress={resetForm}
        >
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, { backgroundColor: canSubmit ? '#3B82F6' : colors.border }]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <ClipboardCheck size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Record</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {trainingHistory.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <GraduationCap size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Training Records</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Submit your first training sign-in sheet to see it here
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Training Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: colors.primary }]}>{trainingHistory.length}</Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Sessions</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>
                  {trainingHistory.reduce((sum, r) => sum + r.attendeeCount, 0)}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Total Trained</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#F59E0B' }]}>
                  {trainingHistory.filter(r => r.status === 'completed').length}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Completed</Text>
              </View>
            </View>
          </View>

          {trainingHistory.map((record) => {
            const isExpanded = expandedRecord === record.id;
            const trainingType = TRAINING_TYPES.find(t => t.id === record.trainingType);
            const TypeIcon = trainingType?.icon || FileText;

            return (
              <Pressable
                key={record.id}
                style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExpandedRecord(isExpanded ? null : record.id);
                }}
              >
                <View style={styles.historyHeader}>
                  <View style={styles.historyHeaderLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: (trainingType?.color || '#3B82F6') + '20' }]}>
                      <TypeIcon size={20} color={trainingType?.color || '#3B82F6'} />
                    </View>
                    <View style={styles.historyTitleContainer}>
                      <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
                        {record.trainingTitle}
                      </Text>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                        {new Date(record.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyHeaderRight}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                        {record.status.toUpperCase().replace('_', ' ')}
                      </Text>
                    </View>
                    <ChevronRight
                      size={18}
                      color={colors.textSecondary}
                      style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                    />
                  </View>
                </View>

                <View style={styles.historyMeta}>
                  <View style={styles.historyMetaItem}>
                    <User size={14} color={colors.textSecondary} />
                    <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                      {record.instructorName}
                    </Text>
                  </View>
                  <View style={styles.historyMetaItem}>
                    <Users size={14} color={colors.textSecondary} />
                    <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                      {record.attendeeCount} attendees
                    </Text>
                  </View>
                </View>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                    <View style={styles.expandedRow}>
                      <View style={styles.expandedItem}>
                        <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Training Type</Text>
                        <Text style={[styles.expandedValue, { color: colors.text }]}>{trainingType?.name || 'N/A'}</Text>
                      </View>
                      <View style={styles.expandedItem}>
                        <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Location</Text>
                        <Text style={[styles.expandedValue, { color: colors.text }]}>{record.location}</Text>
                      </View>
                    </View>
                    <View style={styles.certificateBox}>
                      <Award size={18} color="#3B82F6" />
                      <Text style={[styles.certificateText, { color: colors.text }]}>
                        {record.attendeeCount} employees trained and certified
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </>
      )}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: '#3B82F6', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('new')}
        >
          <Plus size={18} color={activeTab === 'new' ? '#3B82F6' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#3B82F6' : colors.textSecondary }]}>
            New Session
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#3B82F6', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? '#3B82F6' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#3B82F6' : colors.textSecondary }]}>
            History ({trainingHistory.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'new' ? renderNewTab() : renderHistoryTab()}

      {/* Training Type Picker Modal */}
      <Modal
        visible={showTypePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Training Type</Text>
              <Pressable onPress={() => setShowTypePicker(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {TRAINING_TYPES.map((type) => {
                const TypeIcon = type.icon;
                return (
                  <Pressable
                    key={type.id}
                    style={[
                      styles.typeOption,
                      { borderBottomColor: colors.border },
                      formData.trainingType === type.id && { backgroundColor: type.color + '10' },
                    ]}
                    onPress={() => {
                      updateFormData('trainingType', type.id);
                      setShowTypePicker(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={[styles.typeOptionIcon, { backgroundColor: type.color + '20' }]}>
                      <TypeIcon size={20} color={type.color} />
                    </View>
                    <View style={styles.typeOptionContent}>
                      <Text style={[styles.typeOptionName, { color: colors.text }]}>{type.name}</Text>
                      <Text style={[styles.typeOptionDesc, { color: colors.textSecondary }]}>{type.description}</Text>
                    </View>
                    {formData.trainingType === type.id && <Check size={18} color={type.color} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Location</Text>
              <Pressable onPress={() => setShowLocationPicker(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {LOCATIONS.map((location) => (
                <Pressable
                  key={location.id}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border },
                    formData.location === location.id && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => {
                    updateFormData('location', location.id);
                    setShowLocationPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Building2 size={18} color={formData.location === location.id ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.modalOptionText, { color: formData.location === location.id ? colors.primary : colors.text }]}>
                    {location.name}
                  </Text>
                  {formData.location === location.id && <Check size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Attendee Modal */}
      <Modal
        visible={showAddAttendee}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddAttendee(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Attendee</Text>
              <Pressable onPress={() => setShowAddAttendee(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Enter attendee name"
                placeholderTextColor={colors.textSecondary}
                value={newAttendeeName}
                onChangeText={setNewAttendeeName}
                autoFocus
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Employee ID</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Enter employee ID"
                placeholderTextColor={colors.textSecondary}
                value={newAttendeeId}
                onChangeText={setNewAttendeeId}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Department</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Enter department"
                placeholderTextColor={colors.textSecondary}
                value={newAttendeeDept}
                onChangeText={setNewAttendeeDept}
              />

              <Pressable
                style={[styles.addButton, { backgroundColor: newAttendeeName.trim() ? colors.primary : colors.border }]}
                onPress={addAttendee}
                disabled={!newAttendeeName.trim()}
              >
                <Plus size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Attendee</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  tabBar: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 12,
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top' as const,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 12,
  },
  halfField: {
    flex: 1,
  },
  dateField: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  selector: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
  },
  inputWithIcon: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 10,
  },
  inputField: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  attendeesHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 16,
    marginBottom: 12,
  },
  addAttendeeBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addAttendeeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyAttendees: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    marginBottom: 16,
  },
  emptyAttendeesText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
  },
  emptyAttendeesSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  attendeesList: {
    marginBottom: 16,
  },
  attendeeStatsBar: {
    flexDirection: 'row' as const,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  attendeeStat: {
    flex: 1,
    alignItems: 'center' as const,
  },
  attendeeStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  attendeeStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%' as const,
  },
  attendeeCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  attendeeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  attendeeNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  attendeeNumberText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  attendeeDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  attendeeActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  signatureBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  signedTime: {
    fontSize: 11,
    marginTop: 8,
    marginLeft: 38,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 16,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row' as const,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
  emptyState: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  summaryStats: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
  },
  summaryStatItem: {
    alignItems: 'center' as const,
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  summaryStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 36,
  },
  historyCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  historyHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  historyTitleContainer: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  historyDate: {
    fontSize: 12,
    marginTop: 2,
  },
  historyHeaderRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  historyMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  historyMetaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  historyMetaText: {
    fontSize: 12,
  },
  expandedContent: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  expandedRow: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 12,
  },
  expandedItem: {
    flex: 1,
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
  },
  expandedValue: {
    fontSize: 14,
  },
  certificateBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#3B82F610',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  certificateText: {
    flex: 1,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalList: {
    padding: 8,
  },
  modalOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 15,
  },
  typeOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  typeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  typeOptionContent: {
    flex: 1,
  },
  typeOptionName: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  typeOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  modalBody: {
    padding: 16,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row' as const,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
