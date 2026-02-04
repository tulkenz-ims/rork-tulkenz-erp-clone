import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Heart,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  ChevronDown,
  Check,
  Search,
  ChevronRight,
  Pill,
  Stethoscope,
  AlertTriangle,
  History,
  Send,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import {
  useFirstAidEntries,
  useCreateFirstAidEntry,
  type FirstAidEntry,
  type InjuryType,
  type TreatmentType,
} from '@/hooks/useSafetyOSHA';

const INJURY_TYPES: { id: InjuryType; name: string; icon: string }[] = [
  { id: 'cut', name: 'Cut/Laceration', icon: '🩹' },
  { id: 'scrape', name: 'Scrape/Abrasion', icon: '🔴' },
  { id: 'burn', name: 'Burn', icon: '🔥' },
  { id: 'bruise', name: 'Bruise/Contusion', icon: '🟣' },
  { id: 'sprain', name: 'Sprain', icon: '🦶' },
  { id: 'strain', name: 'Strain', icon: '💪' },
  { id: 'eye_injury', name: 'Eye Irritation/Injury', icon: '👁️' },
  { id: 'insect_bite', name: 'Insect Bite/Sting', icon: '🐝' },
  { id: 'splinter', name: 'Splinter', icon: '🪵' },
  { id: 'headache', name: 'Headache', icon: '🤕' },
  { id: 'nausea', name: 'Nausea/Dizziness', icon: '😵' },
  { id: 'other', name: 'Other', icon: '❓' },
];

const TREATMENT_TYPES: { id: TreatmentType; name: string }[] = [
  { id: 'bandage', name: 'Bandage/Dressing' },
  { id: 'ice_pack', name: 'Ice Pack/Cold Compress' },
  { id: 'antiseptic', name: 'Antiseptic/Cleaning' },
  { id: 'burn_treatment', name: 'Burn Cream/Treatment' },
  { id: 'eye_wash', name: 'Eye Wash' },
  { id: 'splint', name: 'Splint/Immobilization' },
  { id: 'medication', name: 'OTC Medication' },
  { id: 'cpr_aed', name: 'CPR/AED' },
  { id: 'other', name: 'Other Treatment' },
];

const BODY_PARTS = [
  'Head', 'Face', 'Eye', 'Ear', 'Neck', 'Shoulder', 'Upper Arm', 'Elbow',
  'Forearm', 'Wrist', 'Hand', 'Finger', 'Chest', 'Back', 'Abdomen',
  'Hip', 'Thigh', 'Knee', 'Lower Leg', 'Ankle', 'Foot', 'Toe', 'Multiple'
];

const DEPARTMENTS = [
  'Production', 'Warehouse', 'Shipping', 'Receiving', 'Maintenance',
  'Quality', 'Office', 'Sanitation', 'R&D', 'Other'
];

const LOCATIONS = [
  'Production Floor', 'Warehouse', 'Loading Dock', 'Break Room', 'Office',
  'Parking Lot', 'Maintenance Shop', 'Lab', 'Cold Storage', 'Other'
];

interface FormData {
  employee_name: string;
  employee_id: string;
  department: string;
  location: string;
  specific_location: string;
  date: string;
  time: string;
  injury_type: InjuryType | '';
  injury_description: string;
  body_part: string;
  treatment_provided: TreatmentType[];
  treatment_details: string;
  follow_up_required: boolean;
  follow_up_notes: string;
  returned_to_work: boolean;
  sent_for_medical: boolean;
  medical_facility: string;
  notes: string;
}

const initialFormData: FormData = {
  employee_name: '',
  employee_id: '',
  department: '',
  location: '',
  specific_location: '',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  injury_type: '',
  injury_description: '',
  body_part: '',
  treatment_provided: [],
  treatment_details: '',
  follow_up_required: false,
  follow_up_notes: '',
  returned_to_work: true,
  sent_for_medical: false,
  medical_facility: '',
  notes: '',
};

export default function FirstAidLogScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showInjuryPicker, setShowInjuryPicker] = useState(false);
  const [showBodyPartPicker, setShowBodyPartPicker] = useState(false);
  const [showTreatmentPicker, setShowTreatmentPicker] = useState(false);

  const { data: entries = [], isLoading, refetch } = useFirstAidEntries();
  const createMutation = useCreateFirstAidEntry();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateFormData = useCallback((key: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleTreatment = useCallback((treatmentId: TreatmentType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData(prev => ({
      ...prev,
      treatment_provided: prev.treatment_provided.includes(treatmentId)
        ? prev.treatment_provided.filter(t => t !== treatmentId)
        : [...prev.treatment_provided, treatmentId],
    }));
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = !searchQuery ||
        entry.entry_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.injury_description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, searchQuery]);

  const canSubmit = formData.employee_name.trim().length > 0 &&
    formData.department &&
    formData.location &&
    formData.injury_type &&
    formData.injury_description.trim().length > 5 &&
    formData.body_part &&
    formData.treatment_provided.length > 0 &&
    formData.treatment_details.trim().length > 5;

  const generateEntryNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `FA-${year}${month}-${random}`;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields.');
      return;
    }

    Alert.alert(
      'Submit for Approval',
      'This first aid log entry will be submitted for supervisor approval. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await createMutation.mutateAsync({
                entry_number: generateEntryNumber(),
                date: formData.date,
                time: formData.time,
                employee_name: formData.employee_name,
                employee_id: formData.employee_id || '',
                department: formData.department,
                location: formData.specific_location 
                  ? `${formData.location} - ${formData.specific_location}`
                  : formData.location,
                injury_type: formData.injury_type as InjuryType,
                injury_description: formData.injury_description,
                body_part: formData.body_part,
                treatment_provided: formData.treatment_provided,
                treatment_details: formData.treatment_details,
                administered_by: user?.email || 'Unknown',
                administered_by_id: user?.id || '',
                follow_up_required: formData.follow_up_required,
                follow_up_notes: formData.follow_up_notes,
                returned_to_work: formData.returned_to_work,
                sent_for_medical: formData.sent_for_medical,
                medical_facility: formData.medical_facility,
                status: 'pending_approval',
                submitted_at: new Date().toISOString(),
                approved_by: null,
                approved_at: null,
                notes: formData.notes,
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'First aid log entry submitted for approval.');
              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[FirstAidLog] Submit error:', error);
              Alert.alert('Error', 'Failed to submit entry. Please try again.');
            }
          },
        },
      ]
    );
  }, [canSubmit, formData, user, generateEntryNumber, createMutation]);

  const resetForm = useCallback(() => {
    Alert.alert('Clear Form', 'Are you sure you want to clear all entries?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setFormData(initialFormData) },
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'pending_approval': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const renderNewTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#EC489920' }]}>
          <Heart size={32} color="#EC4899" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>First Aid Log</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Document minor injuries and first aid treatment provided
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#3B82F620', borderColor: '#3B82F640' }]}>
        <AlertTriangle size={18} color="#3B82F6" />
        <Text style={[styles.infoText, { color: '#3B82F6' }]}>
          All first aid treatments must be documented. This log helps track workplace injuries and ensures proper follow-up care.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Employee Information *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Employee Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Full name of injured employee"
          placeholderTextColor={colors.textSecondary}
          value={formData.employee_name}
          onChangeText={(text) => updateFormData('employee_name', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Employee ID (Optional)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Employee ID number"
        placeholderTextColor={colors.textSecondary}
        value={formData.employee_id}
        onChangeText={(text) => updateFormData('employee_id', text)}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Department *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowDepartmentPicker(true)}
      >
        <FileText size={18} color={formData.department ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.department ? colors.text : colors.textSecondary }]}>
          {formData.department || 'Select department'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Incident Details *</Text>

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
          <Text style={[styles.label, { color: colors.textSecondary }]}>Time *</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.time}
              onChangeText={(text) => updateFormData('time', text)}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Location *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowLocationPicker(true)}
      >
        <MapPin size={18} color={formData.location ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.location ? colors.text : colors.textSecondary }]}>
          {formData.location || 'Select location'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Specific location details (optional)"
        placeholderTextColor={colors.textSecondary}
        value={formData.specific_location}
        onChangeText={(text) => updateFormData('specific_location', text)}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Injury Information *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Type of Injury *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowInjuryPicker(true)}
      >
        <Stethoscope size={18} color={formData.injury_type ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.injury_type ? colors.text : colors.textSecondary }]}>
          {formData.injury_type 
            ? `${INJURY_TYPES.find(i => i.id === formData.injury_type)?.icon} ${INJURY_TYPES.find(i => i.id === formData.injury_type)?.name}`
            : 'Select injury type'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Body Part Affected *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowBodyPartPicker(true)}
      >
        <User size={18} color={formData.body_part ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.body_part ? colors.text : colors.textSecondary }]}>
          {formData.body_part || 'Select body part'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Description of Injury *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe the injury and how it occurred..."
        placeholderTextColor={colors.textSecondary}
        value={formData.injury_description}
        onChangeText={(text) => updateFormData('injury_description', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Treatment Provided *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Treatment Type(s) *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowTreatmentPicker(true)}
      >
        <Pill size={18} color={formData.treatment_provided.length > 0 ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.treatment_provided.length > 0 ? colors.text : colors.textSecondary }]}>
          {formData.treatment_provided.length > 0
            ? `${formData.treatment_provided.length} treatment(s) selected`
            : 'Select treatments provided'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      {formData.treatment_provided.length > 0 && (
        <View style={styles.selectedTreatments}>
          {formData.treatment_provided.map(treatmentId => {
            const treatment = TREATMENT_TYPES.find(t => t.id === treatmentId);
            return (
              <View key={treatmentId} style={[styles.treatmentChip, { backgroundColor: '#EC489920' }]}>
                <Text style={[styles.treatmentChipText, { color: '#EC4899' }]}>{treatment?.name}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>Treatment Details *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe the treatment provided in detail..."
        placeholderTextColor={colors.textSecondary}
        value={formData.treatment_details}
        onChangeText={(text) => updateFormData('treatment_details', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Follow-Up & Outcome</Text>

      <Pressable
        style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('returned_to_work', !formData.returned_to_work);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.returned_to_work ? '#10B981' : colors.border, backgroundColor: formData.returned_to_work ? '#10B981' : 'transparent' }]}>
          {formData.returned_to_work && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.toggleContent}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Returned to Work</Text>
          <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>Employee returned to normal duties</Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('sent_for_medical', !formData.sent_for_medical);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.sent_for_medical ? '#EF4444' : colors.border, backgroundColor: formData.sent_for_medical ? '#EF4444' : 'transparent' }]}>
          {formData.sent_for_medical && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.toggleContent}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Sent for Medical Evaluation</Text>
          <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>Employee referred to medical facility</Text>
        </View>
      </Pressable>

      {formData.sent_for_medical && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Medical facility name"
          placeholderTextColor={colors.textSecondary}
          value={formData.medical_facility}
          onChangeText={(text) => updateFormData('medical_facility', text)}
        />
      )}

      <Pressable
        style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('follow_up_required', !formData.follow_up_required);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.follow_up_required ? '#F59E0B' : colors.border, backgroundColor: formData.follow_up_required ? '#F59E0B' : 'transparent' }]}>
          {formData.follow_up_required && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.toggleContent}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Follow-Up Required</Text>
          <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>Needs additional monitoring or care</Text>
        </View>
      </Pressable>

      {formData.follow_up_required && (
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Follow-up notes and instructions..."
          placeholderTextColor={colors.textSecondary}
          value={formData.follow_up_notes}
          onChangeText={(text) => updateFormData('follow_up_notes', text)}
          multiline
          numberOfLines={2}
        />
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>Additional Notes</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Any additional information..."
        placeholderTextColor={colors.textSecondary}
        value={formData.notes}
        onChangeText={(text) => updateFormData('notes', text)}
        multiline
        numberOfLines={2}
      />

      <View style={styles.actionButtons}>
        <Pressable style={[styles.resetButton, { borderColor: colors.border }]} onPress={resetForm}>
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, { backgroundColor: canSubmit ? '#EC4899' : colors.border }]}
          onPress={handleSubmit}
          disabled={!canSubmit || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Send size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit for Approval</Text>
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
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search entries..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>First Aid Log Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: colors.primary }]}>{entries.length}</Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: '#F59E0B' }]}>
              {entries.filter(e => e.status === 'pending_approval').length}
            </Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>
              {entries.filter(e => e.status === 'approved').length}
            </Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Approved</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Heart size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Entries Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            First aid log entries will appear here
          </Text>
        </View>
      ) : (
        filteredEntries.map(entry => {
          const isExpanded = expandedEntry === entry.id;
          const injuryType = INJURY_TYPES.find(i => i.id === entry.injury_type);
          
          return (
            <Pressable
              key={entry.id}
              style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedEntry(isExpanded ? null : entry.id);
              }}
            >
              <View style={styles.historyHeader}>
                <View style={styles.historyHeaderLeft}>
                  <View style={[styles.injuryIcon, { backgroundColor: '#EC489920' }]}>
                    <Text style={styles.injuryIconText}>{injuryType?.icon || '🩹'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.historyNumber, { color: colors.text }]}>{entry.entry_number}</Text>
                    <Text style={[styles.historyEmployee, { color: colors.textSecondary }]}>{entry.employee_name}</Text>
                  </View>
                </View>
                <View style={styles.historyHeaderRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(entry.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(entry.status) }]}>
                      {entry.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <ChevronRight
                    size={18}
                    color={colors.textSecondary}
                    style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                  />
                </View>
              </View>

              <Text style={[styles.historyDescription, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 2}>
                {entry.injury_description}
              </Text>

              <View style={styles.historyMeta}>
                <View style={styles.historyMetaItem}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{entry.date}</Text>
                </View>
                <View style={styles.historyMetaItem}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{entry.location}</Text>
                </View>
              </View>

              {isExpanded && (
                <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Injury Type</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{injuryType?.name} - {entry.body_part}</Text>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Treatment Provided</Text>
                    <View style={styles.treatmentList}>
                      {entry.treatment_provided.map(t => (
                        <Text key={t} style={[styles.treatmentItem, { color: colors.text }]}>
                          • {TREATMENT_TYPES.find(tt => tt.id === t)?.name}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Treatment Details</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{entry.treatment_details}</Text>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Administered By</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{entry.administered_by}</Text>
                  </View>
                  {entry.follow_up_required && (
                    <View style={[styles.followUpBox, { backgroundColor: '#F59E0B15' }]}>
                      <Text style={[styles.expandedLabel, { color: '#F59E0B' }]}>Follow-Up Required</Text>
                      <Text style={[styles.expandedText, { color: colors.text }]}>{entry.follow_up_notes || 'No details'}</Text>
                    </View>
                  )}
                  {entry.sent_for_medical && (
                    <View style={[styles.medicalBox, { backgroundColor: '#EF444415' }]}>
                      <Text style={[styles.expandedLabel, { color: '#EF4444' }]}>Sent for Medical Evaluation</Text>
                      <Text style={[styles.expandedText, { color: colors.text }]}>{entry.medical_facility || 'Facility not specified'}</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          );
        })
      )}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: '#EC4899', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('new')}
        >
          <Plus size={18} color={activeTab === 'new' ? '#EC4899' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#EC4899' : colors.textSecondary }]}>New Entry</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#EC4899', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? '#EC4899' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#EC4899' : colors.textSecondary }]}>
            History ({entries.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'new' ? renderNewTab() : renderHistoryTab()}

      <Modal visible={showDepartmentPicker} transparent animationType="slide" onRequestClose={() => setShowDepartmentPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Department</Text>
              <Pressable onPress={() => setShowDepartmentPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {DEPARTMENTS.map(dept => (
                <Pressable
                  key={dept}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.department === dept && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { updateFormData('department', dept); setShowDepartmentPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.modalOptionText, { color: formData.department === dept ? colors.primary : colors.text }]}>{dept}</Text>
                  {formData.department === dept && <Check size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showLocationPicker} transparent animationType="slide" onRequestClose={() => setShowLocationPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Location</Text>
              <Pressable onPress={() => setShowLocationPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {LOCATIONS.map(loc => (
                <Pressable
                  key={loc}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.location === loc && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { updateFormData('location', loc); setShowLocationPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <MapPin size={18} color={formData.location === loc ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.modalOptionText, { color: formData.location === loc ? colors.primary : colors.text }]}>{loc}</Text>
                  {formData.location === loc && <Check size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showInjuryPicker} transparent animationType="slide" onRequestClose={() => setShowInjuryPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Injury Type</Text>
              <Pressable onPress={() => setShowInjuryPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {INJURY_TYPES.map(injury => (
                <Pressable
                  key={injury.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.injury_type === injury.id && { backgroundColor: '#EC489910' }]}
                  onPress={() => { updateFormData('injury_type', injury.id); setShowInjuryPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={styles.injuryEmoji}>{injury.icon}</Text>
                  <Text style={[styles.modalOptionText, { color: formData.injury_type === injury.id ? '#EC4899' : colors.text }]}>{injury.name}</Text>
                  {formData.injury_type === injury.id && <Check size={18} color="#EC4899" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showBodyPartPicker} transparent animationType="slide" onRequestClose={() => setShowBodyPartPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Body Part</Text>
              <Pressable onPress={() => setShowBodyPartPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {BODY_PARTS.map(part => (
                <Pressable
                  key={part}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.body_part === part && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { updateFormData('body_part', part); setShowBodyPartPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.modalOptionText, { color: formData.body_part === part ? colors.primary : colors.text }]}>{part}</Text>
                  {formData.body_part === part && <Check size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showTreatmentPicker} transparent animationType="slide" onRequestClose={() => setShowTreatmentPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Treatments</Text>
              <Pressable onPress={() => setShowTreatmentPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {TREATMENT_TYPES.map(treatment => (
                <Pressable
                  key={treatment.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.treatment_provided.includes(treatment.id) && { backgroundColor: '#EC489910' }]}
                  onPress={() => toggleTreatment(treatment.id)}
                >
                  <View style={[styles.checkbox, { borderColor: formData.treatment_provided.includes(treatment.id) ? '#EC4899' : colors.border, backgroundColor: formData.treatment_provided.includes(treatment.id) ? '#EC4899' : 'transparent' }]}>
                    {formData.treatment_provided.includes(treatment.id) && <Check size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.modalOptionText, { color: formData.treatment_provided.includes(treatment.id) ? '#EC4899' : colors.text }]}>{treatment.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={[styles.doneButton, { backgroundColor: '#EC4899' }]} onPress={() => setShowTreatmentPicker(false)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  tabBar: { flexDirection: 'row' as const, borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  headerCard: { borderRadius: 16, padding: 24, alignItems: 'center' as const, borderWidth: 1, marginBottom: 16 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' as const },
  subtitle: { fontSize: 14, textAlign: 'center' as const, lineHeight: 20 },
  infoCard: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20, gap: 12 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, marginBottom: 12, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '500' as const, marginBottom: 8 },
  input: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, marginBottom: 12 },
  inputWithIcon: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, marginBottom: 12, gap: 10 },
  inputField: { flex: 1, fontSize: 15, paddingVertical: 14 },
  textArea: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top' as const, marginBottom: 12 },
  selector: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  selectorText: { flex: 1, fontSize: 15 },
  row: { flexDirection: 'row' as const, gap: 12 },
  halfField: { flex: 1 },
  dateField: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, gap: 10, marginBottom: 12 },
  dateInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  selectedTreatments: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 12 },
  treatmentChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  treatmentChipText: { fontSize: 13, fontWeight: '500' as const },
  toggleOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderRadius: 10, borderWidth: 1, gap: 12, marginBottom: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  toggleContent: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: '500' as const },
  toggleSubtitle: { fontSize: 12, marginTop: 2 },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 8 },
  resetButton: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 16, alignItems: 'center' as const },
  resetButtonText: { fontSize: 16, fontWeight: '600' as const },
  submitButton: { flex: 2, borderRadius: 10, padding: 16, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  submitButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#fff' },
  bottomPadding: { height: 40 },
  searchContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, marginBottom: 16, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  summaryCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 16, textAlign: 'center' as const },
  summaryStats: { flexDirection: 'row' as const, justifyContent: 'space-around' as const, alignItems: 'center' as const },
  summaryStatItem: { alignItems: 'center' as const },
  summaryStatValue: { fontSize: 28, fontWeight: '700' as const },
  summaryStatLabel: { fontSize: 12, marginTop: 4 },
  summaryDivider: { width: 1, height: 40 },
  loadingContainer: { padding: 40, alignItems: 'center' as const },
  emptyState: { alignItems: 'center' as const, padding: 40, borderRadius: 12, borderWidth: 1 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' as const },
  historyCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 12 },
  historyHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 10 },
  historyHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  historyHeaderRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  injuryIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const },
  injuryIconText: { fontSize: 20 },
  historyNumber: { fontSize: 15, fontWeight: '600' as const },
  historyEmployee: { fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  historyDescription: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  historyMeta: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
  historyMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  historyMetaText: { fontSize: 12 },
  expandedContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  expandedSection: { marginBottom: 12 },
  expandedLabel: { fontSize: 12, fontWeight: '500' as const, marginBottom: 4 },
  expandedText: { fontSize: 14, lineHeight: 20 },
  treatmentList: { marginTop: 4 },
  treatmentItem: { fontSize: 14, lineHeight: 22 },
  followUpBox: { padding: 12, borderRadius: 8, marginTop: 8 },
  medicalBox: { padding: 12, borderRadius: 8, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  modalList: { padding: 8 },
  modalOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1, gap: 12 },
  modalOptionText: { flex: 1, fontSize: 15 },
  injuryEmoji: { fontSize: 20 },
  doneButton: { margin: 16, padding: 16, borderRadius: 10, alignItems: 'center' as const },
  doneButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#fff' },
});
