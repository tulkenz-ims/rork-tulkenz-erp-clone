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
  FileCheck,
  Plus,
  X,
  Calendar,
  User,
  FileText,
  ChevronDown,
  Check,
  Search,
  ChevronRight,
  AlertTriangle,
  History,
  Send,
  Building2,
  Clock,
  Briefcase,
  Phone,
  MapPin,
  Activity,
  Heart,
  Stethoscope,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import {
  useOSHA301Forms,
  useCreateOSHA301Form,
  type OSHA301Form,
  type Gender,
  type OSHA300InjuryType,
  type OSHA301TreatmentType,
} from '@/hooks/useSafetyOSHA';

const GENDER_OPTIONS: { id: Gender; name: string }[] = [
  { id: 'male', name: 'Male' },
  { id: 'female', name: 'Female' },
  { id: 'other', name: 'Other/Prefer not to say' },
];

const INJURY_TYPES: { id: OSHA300InjuryType; name: string }[] = [
  { id: 'injury', name: 'Injury' },
  { id: 'skin_disorder', name: 'Skin Disorder' },
  { id: 'respiratory', name: 'Respiratory Condition' },
  { id: 'poisoning', name: 'Poisoning' },
  { id: 'hearing_loss', name: 'Hearing Loss' },
  { id: 'other_illness', name: 'All Other Illnesses' },
];

const TREATMENT_TYPES: { id: OSHA301TreatmentType; name: string }[] = [
  { id: 'none', name: 'No Treatment Required' },
  { id: 'first_aid', name: 'First Aid Only' },
  { id: 'medical_treatment', name: 'Medical Treatment (beyond first aid)' },
  { id: 'emergency_room', name: 'Emergency Room Visit' },
  { id: 'hospitalization', name: 'Hospitalization (inpatient)' },
];

const JOB_TITLES = [
  'Machine Operator', 'Forklift Operator', 'Production Worker', 'Maintenance Technician',
  'Warehouse Associate', 'Quality Inspector', 'Sanitation Worker', 'Line Lead',
  'Shipping Clerk', 'Receiving Clerk', 'Lab Technician', 'Office Staff', 'Supervisor', 'Other'
];

const DEPARTMENTS = [
  'Production', 'Warehouse', 'Shipping', 'Receiving', 'Maintenance',
  'Quality', 'Office', 'Sanitation', 'R&D', 'Facilities', 'Other'
];

const BODY_PARTS = [
  'Head', 'Face', 'Eye(s)', 'Ear(s)', 'Neck', 'Upper Back', 'Lower Back',
  'Shoulder', 'Upper Arm', 'Elbow', 'Forearm', 'Wrist', 'Hand', 'Finger(s)',
  'Chest', 'Abdomen', 'Hip', 'Thigh', 'Knee', 'Lower Leg', 'Ankle', 'Foot', 'Toe(s)',
  'Multiple Body Parts', 'Body System'
];

interface FormData {
  case_number: string;
  employee_name: string;
  employee_address: string;
  employee_dob: string;
  employee_gender: Gender | '';
  employee_hire_date: string;
  job_title: string;
  department: string;
  date_of_injury: string;
  time_of_injury: string;
  time_began_work: string;
  incident_location: string;
  what_happened: string;
  object_substance: string;
  injury_illness_type: OSHA300InjuryType | '';
  body_parts_affected: string;
  treatment_received: OSHA301TreatmentType | '';
  treatment_facility: string;
  treatment_facility_address: string;
  hospitalized_overnight: boolean;
  emergency_room: boolean;
  days_away_from_work: string;
  days_job_transfer: string;
  physician_name: string;
  physician_phone: string;
}

const initialFormData: FormData = {
  case_number: '',
  employee_name: '',
  employee_address: '',
  employee_dob: '',
  employee_gender: '',
  employee_hire_date: '',
  job_title: '',
  department: '',
  date_of_injury: new Date().toISOString().split('T')[0],
  time_of_injury: '',
  time_began_work: '',
  incident_location: '',
  what_happened: '',
  object_substance: '',
  injury_illness_type: '',
  body_parts_affected: '',
  treatment_received: '',
  treatment_facility: '',
  treatment_facility_address: '',
  hospitalized_overnight: false,
  emergency_room: false,
  days_away_from_work: '0',
  days_job_transfer: '0',
  physician_name: '',
  physician_phone: '',
};

export default function OSHA301Screen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedForm, setExpandedForm] = useState<string | null>(null);
  
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showJobTitlePicker, setShowJobTitlePicker] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showInjuryTypePicker, setShowInjuryTypePicker] = useState(false);
  const [showBodyPartPicker, setShowBodyPartPicker] = useState(false);
  const [showTreatmentPicker, setShowTreatmentPicker] = useState(false);

  const { data: forms = [], isLoading, refetch } = useOSHA301Forms();
  const createMutation = useCreateOSHA301Form();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateFormData = useCallback((key: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const filteredForms = useMemo(() => {
    return forms.filter(form => {
      const matchesSearch = !searchQuery ||
        form.form_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.what_happened.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => new Date(b.date_of_injury).getTime() - new Date(a.date_of_injury).getTime());
  }, [forms, searchQuery]);

  const canSubmit = formData.employee_name.trim().length > 0 &&
    formData.job_title &&
    formData.department &&
    formData.date_of_injury &&
    formData.incident_location.trim().length > 0 &&
    formData.what_happened.trim().length > 20 &&
    formData.object_substance.trim().length > 0 &&
    formData.injury_illness_type &&
    formData.body_parts_affected &&
    formData.treatment_received;

  const generateFormNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `O301-${year}${month}-${random}`;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields. The OSHA 301 form requires detailed incident information.');
      return;
    }

    Alert.alert(
      'Submit OSHA 301 Form',
      'This injury and illness incident report will be submitted for approval. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await createMutation.mutateAsync({
                form_number: generateFormNumber(),
                case_number: formData.case_number || 'TBD',
                establishment_name: 'Company Name',
                establishment_address: 'Company Address',
                employee_name: formData.employee_name,
                employee_address: formData.employee_address,
                employee_dob: formData.employee_dob,
                employee_gender: formData.employee_gender as Gender,
                employee_hire_date: formData.employee_hire_date,
                job_title: formData.job_title,
                department: formData.department,
                date_of_injury: formData.date_of_injury,
                time_of_injury: formData.time_of_injury,
                time_began_work: formData.time_began_work,
                incident_location: formData.incident_location,
                what_happened: formData.what_happened,
                object_substance: formData.object_substance,
                injury_illness_type: formData.injury_illness_type as OSHA300InjuryType,
                body_parts_affected: formData.body_parts_affected,
                treatment_received: formData.treatment_received as OSHA301TreatmentType,
                treatment_facility: formData.treatment_facility,
                treatment_facility_address: formData.treatment_facility_address,
                hospitalized_overnight: formData.hospitalized_overnight,
                emergency_room: formData.emergency_room,
                days_away_from_work: parseInt(formData.days_away_from_work) || 0,
                days_job_transfer: parseInt(formData.days_job_transfer) || 0,
                physician_name: formData.physician_name,
                physician_phone: formData.physician_phone,
                completed_by: user?.email || 'Unknown',
                completed_by_title: 'Safety Personnel',
                completed_by_phone: '',
                completion_date: new Date().toISOString().split('T')[0],
                status: 'pending_approval',
                entered_by: user?.email || 'Unknown',
                entered_by_id: user?.id || '',
                submitted_at: new Date().toISOString(),
                approved_by: null,
                approved_at: null,
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'OSHA 301 Form submitted for approval.');
              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[OSHA301] Submit error:', error);
              Alert.alert('Error', 'Failed to submit form. Please try again.');
            }
          },
        },
      ]
    );
  }, [canSubmit, formData, user, generateFormNumber, createMutation]);

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
        <View style={[styles.iconContainer, { backgroundColor: '#7C3AED20' }]}>
          <FileCheck size={32} color="#7C3AED" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>OSHA 301 Form</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Injury and Illness Incident Report
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#7C3AED20', borderColor: '#7C3AED40' }]}>
        <AlertTriangle size={18} color="#7C3AED" />
        <Text style={[styles.infoText, { color: '#7C3AED' }]}>
          Complete this form within 7 calendar days after learning of an injury or illness. Keep for 5 years following the year the records cover.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Employee Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>OSHA 300 Case Number</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="From OSHA 300 Log (if known)"
        placeholderTextColor={colors.textSecondary}
        value={formData.case_number}
        onChangeText={(text) => updateFormData('case_number', text)}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Employee Full Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Full legal name"
          placeholderTextColor={colors.textSecondary}
          value={formData.employee_name}
          onChangeText={(text) => updateFormData('employee_name', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Employee Street Address</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MapPin size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Street, City, State, ZIP"
          placeholderTextColor={colors.textSecondary}
          value={formData.employee_address}
          onChangeText={(text) => updateFormData('employee_address', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date of Birth</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.employee_dob}
              onChangeText={(text) => updateFormData('employee_dob', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Hire Date</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.employee_hire_date}
              onChangeText={(text) => updateFormData('employee_hire_date', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Gender</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowGenderPicker(true)}
      >
        <User size={18} color={formData.employee_gender ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.employee_gender ? colors.text : colors.textSecondary }]}>
          {formData.employee_gender 
            ? GENDER_OPTIONS.find(g => g.id === formData.employee_gender)?.name
            : 'Select gender'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Job Title *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowJobTitlePicker(true)}
      >
        <Briefcase size={18} color={formData.job_title ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.job_title ? colors.text : colors.textSecondary }]}>
          {formData.job_title || 'Select job title'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Department *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowDepartmentPicker(true)}
      >
        <Building2 size={18} color={formData.department ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.department ? colors.text : colors.textSecondary }]}>
          {formData.department || 'Select department'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Incident Details</Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date of Injury *</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.date_of_injury}
              onChangeText={(text) => updateFormData('date_of_injury', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Time of Injury</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.time_of_injury}
              onChangeText={(text) => updateFormData('time_of_injury', text)}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Time Employee Began Work</Text>
      <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}>
        <Clock size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.dateInput, { color: colors.text }]}
          value={formData.time_began_work}
          onChangeText={(text) => updateFormData('time_began_work', text)}
          placeholder="HH:MM AM/PM"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Where Did the Event Occur? *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MapPin size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="e.g., Loading dock north end"
          placeholderTextColor={colors.textSecondary}
          value={formData.incident_location}
          onChangeText={(text) => updateFormData('incident_location', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>What Was Employee Doing Just Before Incident? *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe the activity, tools or equipment being used, and any other relevant details about what the employee was doing before the incident occurred..."
        placeholderTextColor={colors.textSecondary}
        value={formData.what_happened}
        onChangeText={(text) => updateFormData('what_happened', text)}
        multiline
        numberOfLines={5}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Object/Substance That Directly Harmed Employee *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="e.g., the equipment, tool, chemical, surface, etc. that caused the injury or illness"
        placeholderTextColor={colors.textSecondary}
        value={formData.object_substance}
        onChangeText={(text) => updateFormData('object_substance', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Injury/Illness Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Type of Injury/Illness *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowInjuryTypePicker(true)}
      >
        <Activity size={18} color={formData.injury_illness_type ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.injury_illness_type ? colors.text : colors.textSecondary }]}>
          {formData.injury_illness_type 
            ? INJURY_TYPES.find(t => t.id === formData.injury_illness_type)?.name
            : 'Select type'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Body Part(s) Affected *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowBodyPartPicker(true)}
      >
        <Heart size={18} color={formData.body_parts_affected ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.body_parts_affected ? colors.text : colors.textSecondary }]}>
          {formData.body_parts_affected || 'Select body part(s)'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Treatment Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Treatment Received *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowTreatmentPicker(true)}
      >
        <Stethoscope size={18} color={formData.treatment_received ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.treatment_received ? colors.text : colors.textSecondary }]}>
          {formData.treatment_received 
            ? TREATMENT_TYPES.find(t => t.id === formData.treatment_received)?.name
            : 'Select treatment type'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      {formData.treatment_received && formData.treatment_received !== 'none' && formData.treatment_received !== 'first_aid' && (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Treatment Facility Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Hospital, clinic, or doctor's office name"
            placeholderTextColor={colors.textSecondary}
            value={formData.treatment_facility}
            onChangeText={(text) => updateFormData('treatment_facility', text)}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Facility Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Street, City, State, ZIP"
            placeholderTextColor={colors.textSecondary}
            value={formData.treatment_facility_address}
            onChangeText={(text) => updateFormData('treatment_facility_address', text)}
          />
        </>
      )}

      <View style={styles.checkboxRow}>
        <Pressable
          style={[styles.checkboxItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('hospitalized_overnight', !formData.hospitalized_overnight);
          }}
        >
          <View style={[styles.checkbox, { borderColor: formData.hospitalized_overnight ? '#EF4444' : colors.border, backgroundColor: formData.hospitalized_overnight ? '#EF4444' : 'transparent' }]}>
            {formData.hospitalized_overnight && <Check size={12} color="#fff" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Hospitalized Overnight</Text>
        </Pressable>
        <Pressable
          style={[styles.checkboxItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('emergency_room', !formData.emergency_room);
          }}
        >
          <View style={[styles.checkbox, { borderColor: formData.emergency_room ? '#F59E0B' : colors.border, backgroundColor: formData.emergency_room ? '#F59E0B' : 'transparent' }]}>
            {formData.emergency_room && <Check size={12} color="#fff" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Emergency Room</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Days Away From Work</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.inputField, { color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              value={formData.days_away_from_work}
              onChangeText={(text) => updateFormData('days_away_from_work', text)}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Days Job Transfer/Restriction</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.inputField, { color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              value={formData.days_job_transfer}
              onChangeText={(text) => updateFormData('days_job_transfer', text)}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Treating Physician</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Physician/Healthcare Provider Name</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Stethoscope size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Dr. Name"
          placeholderTextColor={colors.textSecondary}
          value={formData.physician_name}
          onChangeText={(text) => updateFormData('physician_name', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Physician Phone</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Phone size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="(555) 555-5555"
          placeholderTextColor={colors.textSecondary}
          value={formData.physician_phone}
          onChangeText={(text) => updateFormData('physician_phone', text)}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.actionButtons}>
        <Pressable style={[styles.resetButton, { borderColor: colors.border }]} onPress={resetForm}>
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, { backgroundColor: canSubmit ? '#7C3AED' : colors.border }]}
          onPress={handleSubmit}
          disabled={!canSubmit || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Send size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Form</Text>
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
          placeholder="Search forms..."
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
        <Text style={[styles.summaryTitle, { color: colors.text }]}>OSHA 301 Forms Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: colors.primary }]}>{forms.length}</Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: '#F59E0B' }]}>
              {forms.filter(f => f.status === 'pending_approval').length}
            </Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>
              {forms.filter(f => f.status === 'approved').length}
            </Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Approved</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredForms.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FileCheck size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Forms Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            OSHA 301 forms will appear here
          </Text>
        </View>
      ) : (
        filteredForms.map(form => {
          const isExpanded = expandedForm === form.id;
          
          return (
            <Pressable
              key={form.id}
              style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedForm(isExpanded ? null : form.id);
              }}
            >
              <View style={styles.historyHeader}>
                <View style={styles.historyHeaderLeft}>
                  <View style={[styles.formIcon, { backgroundColor: '#7C3AED20' }]}>
                    <FileCheck size={20} color="#7C3AED" />
                  </View>
                  <View>
                    <Text style={[styles.historyNumber, { color: colors.text }]}>{form.form_number}</Text>
                    <Text style={[styles.historyEmployee, { color: colors.textSecondary }]}>{form.employee_name}</Text>
                  </View>
                </View>
                <View style={styles.historyHeaderRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(form.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(form.status) }]}>
                      {form.status.replace('_', ' ').toUpperCase()}
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
                {form.what_happened}
              </Text>

              <View style={styles.historyMeta}>
                <View style={styles.historyMetaItem}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{form.date_of_injury}</Text>
                </View>
                <View style={styles.historyMetaItem}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{form.incident_location}</Text>
                </View>
              </View>

              {isExpanded && (
                <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Job Title</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{form.job_title} - {form.department}</Text>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Object/Substance</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{form.object_substance}</Text>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Injury Type</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>
                      {INJURY_TYPES.find(t => t.id === form.injury_illness_type)?.name} - {form.body_parts_affected}
                    </Text>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Treatment</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>
                      {TREATMENT_TYPES.find(t => t.id === form.treatment_received)?.name}
                      {form.treatment_facility && ` at ${form.treatment_facility}`}
                    </Text>
                  </View>
                  <View style={styles.statsRow}>
                    {form.days_away_from_work > 0 && (
                      <View style={[styles.statChip, { backgroundColor: '#EF444415' }]}>
                        <Text style={[styles.statChipText, { color: '#EF4444' }]}>{form.days_away_from_work} days away</Text>
                      </View>
                    )}
                    {form.days_job_transfer > 0 && (
                      <View style={[styles.statChip, { backgroundColor: '#F59E0B15' }]}>
                        <Text style={[styles.statChipText, { color: '#F59E0B' }]}>{form.days_job_transfer} days restricted</Text>
                      </View>
                    )}
                    {form.hospitalized_overnight && (
                      <View style={[styles.statChip, { backgroundColor: '#EF444415' }]}>
                        <Text style={[styles.statChipText, { color: '#EF4444' }]}>Hospitalized</Text>
                      </View>
                    )}
                  </View>
                  {form.physician_name && (
                    <View style={styles.expandedSection}>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Physician</Text>
                      <Text style={[styles.expandedText, { color: colors.text }]}>{form.physician_name}</Text>
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
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: '#7C3AED', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('new')}
        >
          <Plus size={18} color={activeTab === 'new' ? '#7C3AED' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#7C3AED' : colors.textSecondary }]}>New Form</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#7C3AED', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? '#7C3AED' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#7C3AED' : colors.textSecondary }]}>
            History ({forms.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'new' ? renderNewTab() : renderHistoryTab()}

      <Modal visible={showGenderPicker} transparent animationType="slide" onRequestClose={() => setShowGenderPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Gender</Text>
              <Pressable onPress={() => setShowGenderPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {GENDER_OPTIONS.map(option => (
                <Pressable
                  key={option.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.employee_gender === option.id && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { updateFormData('employee_gender', option.id); setShowGenderPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.modalOptionText, { color: formData.employee_gender === option.id ? colors.primary : colors.text }]}>{option.name}</Text>
                  {formData.employee_gender === option.id && <Check size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showJobTitlePicker} transparent animationType="slide" onRequestClose={() => setShowJobTitlePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Job Title</Text>
              <Pressable onPress={() => setShowJobTitlePicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {JOB_TITLES.map(title => (
                <Pressable
                  key={title}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.job_title === title && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { updateFormData('job_title', title); setShowJobTitlePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.modalOptionText, { color: formData.job_title === title ? colors.primary : colors.text }]}>{title}</Text>
                  {formData.job_title === title && <Check size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

      <Modal visible={showInjuryTypePicker} transparent animationType="slide" onRequestClose={() => setShowInjuryTypePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Injury Type</Text>
              <Pressable onPress={() => setShowInjuryTypePicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {INJURY_TYPES.map(type => (
                <Pressable
                  key={type.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.injury_illness_type === type.id && { backgroundColor: '#7C3AED10' }]}
                  onPress={() => { updateFormData('injury_illness_type', type.id); setShowInjuryTypePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.modalOptionText, { color: formData.injury_illness_type === type.id ? '#7C3AED' : colors.text }]}>{type.name}</Text>
                  {formData.injury_illness_type === type.id && <Check size={18} color="#7C3AED" />}
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
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.body_parts_affected === part && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { updateFormData('body_parts_affected', part); setShowBodyPartPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.modalOptionText, { color: formData.body_parts_affected === part ? colors.primary : colors.text }]}>{part}</Text>
                  {formData.body_parts_affected === part && <Check size={18} color={colors.primary} />}
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Treatment Type</Text>
              <Pressable onPress={() => setShowTreatmentPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {TREATMENT_TYPES.map(type => (
                <Pressable
                  key={type.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.treatment_received === type.id && { backgroundColor: '#7C3AED10' }]}
                  onPress={() => { updateFormData('treatment_received', type.id); setShowTreatmentPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.modalOptionText, { color: formData.treatment_received === type.id ? '#7C3AED' : colors.text }]}>{type.name}</Text>
                  {formData.treatment_received === type.id && <Check size={18} color="#7C3AED" />}
                </Pressable>
              ))}
            </ScrollView>
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
  textArea: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 100, textAlignVertical: 'top' as const, marginBottom: 12 },
  selector: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  selectorText: { flex: 1, fontSize: 15 },
  row: { flexDirection: 'row' as const, gap: 12 },
  halfField: { flex: 1 },
  dateField: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, gap: 10, marginBottom: 12 },
  dateInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  checkboxRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 12 },
  checkboxItem: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderRadius: 10, borderWidth: 1, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  checkboxLabel: { fontSize: 14, fontWeight: '500' as const },
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
  formIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const },
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
  statsRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginTop: 8 },
  statChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statChipText: { fontSize: 12, fontWeight: '500' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  modalList: { padding: 8 },
  modalOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1, gap: 12 },
  modalOptionText: { flex: 1, fontSize: 15 },
});
