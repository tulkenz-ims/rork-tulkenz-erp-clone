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
  Search,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  ChevronDown,
  Check,
  ChevronRight,
  AlertTriangle,
  History,
  Send,
  Camera,
  Users,
  Target,
  Shield,
  Wrench,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import {
  useAccidentInvestigations,
  useCreateAccidentInvestigation,
  type AccidentInvestigation,
  type SeverityLevel,
  type AccidentType,
  type ContributingFactor,
} from '@/hooks/useSafetyOSHA';

const ACCIDENT_TYPES: { id: AccidentType; name: string; icon: string }[] = [
  { id: 'slip_trip_fall', name: 'Slip, Trip, or Fall', icon: '🚶' },
  { id: 'struck_by', name: 'Struck By Object', icon: '💥' },
  { id: 'caught_in', name: 'Caught In/Between', icon: '⚙️' },
  { id: 'contact_with', name: 'Contact With Hazard', icon: '⚡' },
  { id: 'overexertion', name: 'Overexertion/Strain', icon: '💪' },
  { id: 'exposure', name: 'Chemical/Heat Exposure', icon: '☣️' },
  { id: 'vehicle', name: 'Vehicle Incident', icon: '🚗' },
  { id: 'equipment', name: 'Equipment Malfunction', icon: '🔧' },
  { id: 'ergonomic', name: 'Ergonomic Injury', icon: '🪑' },
  { id: 'other', name: 'Other', icon: '❓' },
];

const SEVERITY_LEVELS: { id: SeverityLevel; name: string; color: string }[] = [
  { id: 'minor', name: 'Minor - First Aid Only', color: '#10B981' },
  { id: 'moderate', name: 'Moderate - Medical Treatment', color: '#F59E0B' },
  { id: 'serious', name: 'Serious - Lost Time', color: '#F97316' },
  { id: 'severe', name: 'Severe - Hospitalization', color: '#EF4444' },
  { id: 'fatal', name: 'Fatal', color: '#7F1D1D' },
];

const CONTRIBUTING_FACTORS: { id: ContributingFactor; name: string }[] = [
  { id: 'unsafe_act', name: 'Unsafe Act/Behavior' },
  { id: 'unsafe_condition', name: 'Unsafe Condition' },
  { id: 'equipment_failure', name: 'Equipment Failure' },
  { id: 'lack_of_training', name: 'Lack of Training' },
  { id: 'ppe_issue', name: 'PPE Not Used/Inadequate' },
  { id: 'procedure_violation', name: 'Procedure Violation' },
  { id: 'environmental', name: 'Environmental Factors' },
  { id: 'human_error', name: 'Human Error' },
  { id: 'supervision', name: 'Inadequate Supervision' },
  { id: 'other', name: 'Other' },
];

const EVIDENCE_TYPES = [
  'Photographs', 'Video Recording', 'Equipment/Tools', 'PPE', 'Written Statements',
  'Diagrams/Sketches', 'Maintenance Records', 'Training Records', 'Procedure Documents', 'Other Physical Evidence'
];

const DEPARTMENTS = [
  'Production', 'Warehouse', 'Shipping', 'Receiving', 'Maintenance',
  'Quality', 'Office', 'Sanitation', 'R&D', 'Other'
];

const LOCATIONS = [
  'Production Floor', 'Warehouse', 'Loading Dock', 'Break Room', 'Office',
  'Parking Lot', 'Maintenance Shop', 'Lab', 'Cold Storage', 'Exterior', 'Other'
];

interface FormData {
  incident_date: string;
  incident_time: string;
  location: string;
  specific_location: string;
  department: string;
  injured_employee: string;
  employee_id: string;
  job_title: string;
  supervisor: string;
  accident_type: AccidentType | '';
  severity: SeverityLevel | '';
  description: string;
  immediate_cause: string;
  contributing_factors: ContributingFactor[];
  root_cause_analysis: string;
  witnesses: string;
  witness_statements: string;
  evidence_collected: string[];
  photos_attached: boolean;
  diagrams_attached: boolean;
  equipment_involved: string;
  ppe_worn: string;
  ppe_adequate: boolean;
  training_adequate: boolean;
  procedures_followed: boolean;
  corrective_actions: string;
  preventive_measures: string;
  responsible_party: string;
  target_completion_date: string;
  notes: string;
}

const initialFormData: FormData = {
  incident_date: new Date().toISOString().split('T')[0],
  incident_time: '',
  location: '',
  specific_location: '',
  department: '',
  injured_employee: '',
  employee_id: '',
  job_title: '',
  supervisor: '',
  accident_type: '',
  severity: '',
  description: '',
  immediate_cause: '',
  contributing_factors: [],
  root_cause_analysis: '',
  witnesses: '',
  witness_statements: '',
  evidence_collected: [],
  photos_attached: false,
  diagrams_attached: false,
  equipment_involved: '',
  ppe_worn: '',
  ppe_adequate: true,
  training_adequate: true,
  procedures_followed: true,
  corrective_actions: '',
  preventive_measures: '',
  responsible_party: '',
  target_completion_date: '',
  notes: '',
};

export default function AccidentInvestigationScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedInvestigation, setExpandedInvestigation] = useState<string | null>(null);
  
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showAccidentTypePicker, setShowAccidentTypePicker] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);
  const [showFactorsPicker, setShowFactorsPicker] = useState(false);
  const [showEvidencePicker, setShowEvidencePicker] = useState(false);

  const { data: investigations = [], isLoading, refetch } = useAccidentInvestigations();
  const createMutation = useCreateAccidentInvestigation();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateFormData = useCallback((key: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleFactor = useCallback((factorId: ContributingFactor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData(prev => ({
      ...prev,
      contributing_factors: prev.contributing_factors.includes(factorId)
        ? prev.contributing_factors.filter(f => f !== factorId)
        : [...prev.contributing_factors, factorId],
    }));
  }, []);

  const toggleEvidence = useCallback((evidence: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData(prev => ({
      ...prev,
      evidence_collected: prev.evidence_collected.includes(evidence)
        ? prev.evidence_collected.filter(e => e !== evidence)
        : [...prev.evidence_collected, evidence],
    }));
  }, []);

  const filteredInvestigations = useMemo(() => {
    return investigations.filter(inv => {
      const matchesSearch = !searchQuery ||
        inv.investigation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.injured_employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime());
  }, [investigations, searchQuery]);

  const canSubmit = formData.injured_employee.trim().length > 0 &&
    formData.department &&
    formData.location &&
    formData.accident_type &&
    formData.severity &&
    formData.description.trim().length > 10 &&
    formData.immediate_cause.trim().length > 5 &&
    formData.contributing_factors.length > 0 &&
    formData.root_cause_analysis.trim().length > 10 &&
    formData.corrective_actions.trim().length > 10;

  const generateInvestigationNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `AI-${year}${month}-${random}`;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields including description, immediate cause, contributing factors, root cause analysis, and corrective actions.');
      return;
    }

    Alert.alert(
      'Submit Investigation',
      'This accident investigation will be submitted for review and approval. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await createMutation.mutateAsync({
                investigation_number: generateInvestigationNumber(),
                incident_date: formData.incident_date,
                incident_time: formData.incident_time,
                report_date: new Date().toISOString().split('T')[0],
                location: formData.location,
                specific_location: formData.specific_location,
                department: formData.department,
                injured_employee: formData.injured_employee,
                employee_id: formData.employee_id,
                job_title: formData.job_title,
                supervisor: formData.supervisor,
                accident_type: formData.accident_type as AccidentType,
                severity: formData.severity as SeverityLevel,
                description: formData.description,
                immediate_cause: formData.immediate_cause,
                contributing_factors: formData.contributing_factors,
                root_cause_analysis: formData.root_cause_analysis,
                witnesses: formData.witnesses.split(',').map(w => w.trim()).filter(w => w),
                witness_statements: formData.witness_statements,
                evidence_collected: formData.evidence_collected,
                photos_attached: formData.photos_attached,
                diagrams_attached: formData.diagrams_attached,
                equipment_involved: formData.equipment_involved,
                ppe_worn: formData.ppe_worn,
                ppe_adequate: formData.ppe_adequate,
                training_adequate: formData.training_adequate,
                procedures_followed: formData.procedures_followed,
                corrective_actions: formData.corrective_actions,
                preventive_measures: formData.preventive_measures,
                responsible_party: formData.responsible_party,
                target_completion_date: formData.target_completion_date,
                status: 'pending_approval',
                investigated_by: user?.email || 'Unknown',
                investigated_by_id: user?.id || '',
                submitted_at: new Date().toISOString(),
                approved_by: null,
                approved_at: null,
                notes: formData.notes,
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Accident investigation submitted for approval.');
              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[AccidentInvestigation] Submit error:', error);
              Alert.alert('Error', 'Failed to submit investigation. Please try again.');
            }
          },
        },
      ]
    );
  }, [canSubmit, formData, user, generateInvestigationNumber, createMutation]);

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
      case 'closed': return '#6B7280';
      default: return colors.textSecondary;
    }
  };

  const getSeverityColor = (severity: SeverityLevel) => {
    return SEVERITY_LEVELS.find(s => s.id === severity)?.color || colors.textSecondary;
  };

  const renderNewTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#7C3AED20' }]}>
          <Search size={32} color="#7C3AED" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Accident Investigation</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Thorough investigation to identify root causes and prevent recurrence
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}>
        <AlertTriangle size={18} color="#EF4444" />
        <Text style={[styles.infoText, { color: '#EF4444' }]}>
          Complete this investigation within 24-48 hours of the incident. Document all findings thoroughly.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Incident Information *</Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Incident Date *</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.incident_date}
              onChangeText={(text) => updateFormData('incident_date', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Incident Time</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.incident_time}
              onChangeText={(text) => updateFormData('incident_time', text)}
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
        placeholder="Specific location details (e.g., Line 3, near column B4)"
        placeholderTextColor={colors.textSecondary}
        value={formData.specific_location}
        onChangeText={(text) => updateFormData('specific_location', text)}
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

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Injured Employee Information *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Employee Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Full name of injured employee"
          placeholderTextColor={colors.textSecondary}
          value={formData.injured_employee}
          onChangeText={(text) => updateFormData('injured_employee', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Employee ID</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="ID number"
            placeholderTextColor={colors.textSecondary}
            value={formData.employee_id}
            onChangeText={(text) => updateFormData('employee_id', text)}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Job Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Position"
            placeholderTextColor={colors.textSecondary}
            value={formData.job_title}
            onChangeText={(text) => updateFormData('job_title', text)}
          />
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Supervisor</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Supervisor name"
        placeholderTextColor={colors.textSecondary}
        value={formData.supervisor}
        onChangeText={(text) => updateFormData('supervisor', text)}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Accident Classification *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Type of Accident *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowAccidentTypePicker(true)}
      >
        <AlertTriangle size={18} color={formData.accident_type ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.accident_type ? colors.text : colors.textSecondary }]}>
          {formData.accident_type 
            ? `${ACCIDENT_TYPES.find(a => a.id === formData.accident_type)?.icon} ${ACCIDENT_TYPES.find(a => a.id === formData.accident_type)?.name}`
            : 'Select accident type'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Severity Level *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowSeverityPicker(true)}
      >
        <Shield size={18} color={formData.severity ? getSeverityColor(formData.severity as SeverityLevel) : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.severity ? colors.text : colors.textSecondary }]}>
          {formData.severity 
            ? SEVERITY_LEVELS.find(s => s.id === formData.severity)?.name
            : 'Select severity level'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Incident Description *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Description of Accident *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe what happened in detail. Include sequence of events, actions taken, conditions at the time..."
        placeholderTextColor={colors.textSecondary}
        value={formData.description}
        onChangeText={(text) => updateFormData('description', text)}
        multiline
        numberOfLines={5}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Immediate Cause *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="What directly caused the accident? (e.g., wet floor, malfunctioning equipment)"
        placeholderTextColor={colors.textSecondary}
        value={formData.immediate_cause}
        onChangeText={(text) => updateFormData('immediate_cause', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Root Cause Analysis *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Contributing Factors *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowFactorsPicker(true)}
      >
        <Target size={18} color={formData.contributing_factors.length > 0 ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.contributing_factors.length > 0 ? colors.text : colors.textSecondary }]}>
          {formData.contributing_factors.length > 0
            ? `${formData.contributing_factors.length} factor(s) selected`
            : 'Select contributing factors'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      {formData.contributing_factors.length > 0 && (
        <View style={styles.selectedItems}>
          {formData.contributing_factors.map(factorId => {
            const factor = CONTRIBUTING_FACTORS.find(f => f.id === factorId);
            return (
              <View key={factorId} style={[styles.itemChip, { backgroundColor: '#7C3AED20' }]}>
                <Text style={[styles.itemChipText, { color: '#7C3AED' }]}>{factor?.name}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>Root Cause Analysis *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Use 5-Why analysis or similar method to identify the underlying root cause(s)..."
        placeholderTextColor={colors.textSecondary}
        value={formData.root_cause_analysis}
        onChangeText={(text) => updateFormData('root_cause_analysis', text)}
        multiline
        numberOfLines={5}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Evidence & Witnesses</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Witnesses (comma-separated names)</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Users size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="John Doe, Jane Smith"
          placeholderTextColor={colors.textSecondary}
          value={formData.witnesses}
          onChangeText={(text) => updateFormData('witnesses', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Witness Statements Summary</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Summarize key points from witness interviews..."
        placeholderTextColor={colors.textSecondary}
        value={formData.witness_statements}
        onChangeText={(text) => updateFormData('witness_statements', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Evidence Collected</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowEvidencePicker(true)}
      >
        <Camera size={18} color={formData.evidence_collected.length > 0 ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.evidence_collected.length > 0 ? colors.text : colors.textSecondary }]}>
          {formData.evidence_collected.length > 0
            ? `${formData.evidence_collected.length} type(s) selected`
            : 'Select evidence types'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      {formData.evidence_collected.length > 0 && (
        <View style={styles.selectedItems}>
          {formData.evidence_collected.map(evidence => (
            <View key={evidence} style={[styles.itemChip, { backgroundColor: '#3B82F620' }]}>
              <Text style={[styles.itemChipText, { color: '#3B82F6' }]}>{evidence}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.checkboxRow}>
        <Pressable
          style={[styles.checkboxItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('photos_attached', !formData.photos_attached);
          }}
        >
          <View style={[styles.checkbox, { borderColor: formData.photos_attached ? '#10B981' : colors.border, backgroundColor: formData.photos_attached ? '#10B981' : 'transparent' }]}>
            {formData.photos_attached && <Check size={12} color="#fff" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Photos Attached</Text>
        </Pressable>
        <Pressable
          style={[styles.checkboxItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('diagrams_attached', !formData.diagrams_attached);
          }}
        >
          <View style={[styles.checkbox, { borderColor: formData.diagrams_attached ? '#10B981' : colors.border, backgroundColor: formData.diagrams_attached ? '#10B981' : 'transparent' }]}>
            {formData.diagrams_attached && <Check size={12} color="#fff" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Diagrams Attached</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment & PPE</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Equipment Involved</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Wrench size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Equipment name, ID, or description"
          placeholderTextColor={colors.textSecondary}
          value={formData.equipment_involved}
          onChangeText={(text) => updateFormData('equipment_involved', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>PPE Worn at Time of Incident</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="List PPE worn (e.g., safety glasses, gloves, hard hat)"
        placeholderTextColor={colors.textSecondary}
        value={formData.ppe_worn}
        onChangeText={(text) => updateFormData('ppe_worn', text)}
      />

      <View style={styles.assessmentSection}>
        <Pressable
          style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('ppe_adequate', !formData.ppe_adequate);
          }}
        >
          <View style={[styles.checkbox, { borderColor: formData.ppe_adequate ? '#10B981' : '#EF4444', backgroundColor: formData.ppe_adequate ? '#10B981' : '#EF4444' }]}>
            {formData.ppe_adequate ? <Check size={14} color="#fff" /> : <X size={14} color="#fff" />}
          </View>
          <View style={styles.toggleContent}>
            <Text style={[styles.toggleTitle, { color: colors.text }]}>PPE Was Adequate</Text>
            <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
              {formData.ppe_adequate ? 'PPE was appropriate for the task' : 'PPE was inadequate or not used'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('training_adequate', !formData.training_adequate);
          }}
        >
          <View style={[styles.checkbox, { borderColor: formData.training_adequate ? '#10B981' : '#EF4444', backgroundColor: formData.training_adequate ? '#10B981' : '#EF4444' }]}>
            {formData.training_adequate ? <Check size={14} color="#fff" /> : <X size={14} color="#fff" />}
          </View>
          <View style={styles.toggleContent}>
            <Text style={[styles.toggleTitle, { color: colors.text }]}>Training Was Adequate</Text>
            <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
              {formData.training_adequate ? 'Employee was properly trained' : 'Training gaps identified'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('procedures_followed', !formData.procedures_followed);
          }}
        >
          <View style={[styles.checkbox, { borderColor: formData.procedures_followed ? '#10B981' : '#EF4444', backgroundColor: formData.procedures_followed ? '#10B981' : '#EF4444' }]}>
            {formData.procedures_followed ? <Check size={14} color="#fff" /> : <X size={14} color="#fff" />}
          </View>
          <View style={styles.toggleContent}>
            <Text style={[styles.toggleTitle, { color: colors.text }]}>Procedures Were Followed</Text>
            <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
              {formData.procedures_followed ? 'Standard procedures were followed' : 'Procedures were not followed'}
            </Text>
          </View>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Corrective Actions *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Corrective Actions Required *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="List specific actions to correct the immediate cause and prevent recurrence..."
        placeholderTextColor={colors.textSecondary}
        value={formData.corrective_actions}
        onChangeText={(text) => updateFormData('corrective_actions', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Preventive Measures</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Additional measures to prevent similar incidents..."
        placeholderTextColor={colors.textSecondary}
        value={formData.preventive_measures}
        onChangeText={(text) => updateFormData('preventive_measures', text)}
        multiline
        numberOfLines={3}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Responsible Party</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Name/Title"
            placeholderTextColor={colors.textSecondary}
            value={formData.responsible_party}
            onChangeText={(text) => updateFormData('responsible_party', text)}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Target Date</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
            value={formData.target_completion_date}
            onChangeText={(text) => updateFormData('target_completion_date', text)}
          />
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Additional Notes</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Any additional information or observations..."
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
          style={[styles.submitButton, { backgroundColor: canSubmit ? '#7C3AED' : colors.border }]}
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
          placeholder="Search investigations..."
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
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Investigation Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: colors.primary }]}>{investigations.length}</Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: '#F59E0B' }]}>
              {investigations.filter(i => i.status === 'pending_approval').length}
            </Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>
              {investigations.filter(i => i.status === 'approved' || i.status === 'closed').length}
            </Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredInvestigations.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Investigations Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Accident investigations will appear here
          </Text>
        </View>
      ) : (
        filteredInvestigations.map(investigation => {
          const isExpanded = expandedInvestigation === investigation.id;
          const accidentType = ACCIDENT_TYPES.find(a => a.id === investigation.accident_type);
          const severity = SEVERITY_LEVELS.find(s => s.id === investigation.severity);
          
          return (
            <Pressable
              key={investigation.id}
              style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedInvestigation(isExpanded ? null : investigation.id);
              }}
            >
              <View style={styles.historyHeader}>
                <View style={styles.historyHeaderLeft}>
                  <View style={[styles.accidentIcon, { backgroundColor: '#7C3AED20' }]}>
                    <Text style={styles.accidentIconText}>{accidentType?.icon || '⚠️'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.historyNumber, { color: colors.text }]}>{investigation.investigation_number}</Text>
                    <Text style={[styles.historyEmployee, { color: colors.textSecondary }]}>{investigation.injured_employee}</Text>
                  </View>
                </View>
                <View style={styles.historyHeaderRight}>
                  <View style={[styles.severityBadge, { backgroundColor: severity?.color + '20' }]}>
                    <Text style={[styles.severityText, { color: severity?.color }]}>
                      {investigation.severity.toUpperCase()}
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
                {investigation.description}
              </Text>

              <View style={styles.historyMeta}>
                <View style={styles.historyMetaItem}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{investigation.incident_date}</Text>
                </View>
                <View style={styles.historyMetaItem}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{investigation.location}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(investigation.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(investigation.status) }]}>
                    {investigation.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              {isExpanded && (
                <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Immediate Cause</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{investigation.immediate_cause}</Text>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Root Cause Analysis</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{investigation.root_cause_analysis}</Text>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Corrective Actions</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{investigation.corrective_actions}</Text>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Investigated By</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{investigation.investigated_by}</Text>
                  </View>
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
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#7C3AED' : colors.textSecondary }]}>New Investigation</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#7C3AED', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? '#7C3AED' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#7C3AED' : colors.textSecondary }]}>
            History ({investigations.length})
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

      <Modal visible={showAccidentTypePicker} transparent animationType="slide" onRequestClose={() => setShowAccidentTypePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Accident Type</Text>
              <Pressable onPress={() => setShowAccidentTypePicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {ACCIDENT_TYPES.map(type => (
                <Pressable
                  key={type.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.accident_type === type.id && { backgroundColor: '#7C3AED10' }]}
                  onPress={() => { updateFormData('accident_type', type.id); setShowAccidentTypePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={styles.typeEmoji}>{type.icon}</Text>
                  <Text style={[styles.modalOptionText, { color: formData.accident_type === type.id ? '#7C3AED' : colors.text }]}>{type.name}</Text>
                  {formData.accident_type === type.id && <Check size={18} color="#7C3AED" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showSeverityPicker} transparent animationType="slide" onRequestClose={() => setShowSeverityPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Severity Level</Text>
              <Pressable onPress={() => setShowSeverityPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {SEVERITY_LEVELS.map(level => (
                <Pressable
                  key={level.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.severity === level.id && { backgroundColor: level.color + '10' }]}
                  onPress={() => { updateFormData('severity', level.id); setShowSeverityPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <View style={[styles.severityDot, { backgroundColor: level.color }]} />
                  <Text style={[styles.modalOptionText, { color: formData.severity === level.id ? level.color : colors.text }]}>{level.name}</Text>
                  {formData.severity === level.id && <Check size={18} color={level.color} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showFactorsPicker} transparent animationType="slide" onRequestClose={() => setShowFactorsPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Contributing Factors</Text>
              <Pressable onPress={() => setShowFactorsPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {CONTRIBUTING_FACTORS.map(factor => (
                <Pressable
                  key={factor.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.contributing_factors.includes(factor.id) && { backgroundColor: '#7C3AED10' }]}
                  onPress={() => toggleFactor(factor.id)}
                >
                  <View style={[styles.checkbox, { borderColor: formData.contributing_factors.includes(factor.id) ? '#7C3AED' : colors.border, backgroundColor: formData.contributing_factors.includes(factor.id) ? '#7C3AED' : 'transparent' }]}>
                    {formData.contributing_factors.includes(factor.id) && <Check size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.modalOptionText, { color: formData.contributing_factors.includes(factor.id) ? '#7C3AED' : colors.text }]}>{factor.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={[styles.doneButton, { backgroundColor: '#7C3AED' }]} onPress={() => setShowFactorsPicker(false)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showEvidencePicker} transparent animationType="slide" onRequestClose={() => setShowEvidencePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Evidence Types</Text>
              <Pressable onPress={() => setShowEvidencePicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {EVIDENCE_TYPES.map(evidence => (
                <Pressable
                  key={evidence}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.evidence_collected.includes(evidence) && { backgroundColor: '#3B82F610' }]}
                  onPress={() => toggleEvidence(evidence)}
                >
                  <View style={[styles.checkbox, { borderColor: formData.evidence_collected.includes(evidence) ? '#3B82F6' : colors.border, backgroundColor: formData.evidence_collected.includes(evidence) ? '#3B82F6' : 'transparent' }]}>
                    {formData.evidence_collected.includes(evidence) && <Check size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.modalOptionText, { color: formData.evidence_collected.includes(evidence) ? '#3B82F6' : colors.text }]}>{evidence}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={[styles.doneButton, { backgroundColor: '#3B82F6' }]} onPress={() => setShowEvidencePicker(false)}>
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
  textArea: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 100, textAlignVertical: 'top' as const, marginBottom: 12 },
  selector: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  selectorText: { flex: 1, fontSize: 15 },
  row: { flexDirection: 'row' as const, gap: 12 },
  halfField: { flex: 1 },
  dateField: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, gap: 10, marginBottom: 12 },
  dateInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  selectedItems: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 12 },
  itemChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  itemChipText: { fontSize: 13, fontWeight: '500' as const },
  checkboxRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 12 },
  checkboxItem: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderRadius: 10, borderWidth: 1, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  checkboxLabel: { fontSize: 14, fontWeight: '500' as const },
  assessmentSection: { gap: 10, marginBottom: 12 },
  toggleOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderRadius: 10, borderWidth: 1, gap: 12 },
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
  accidentIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const },
  accidentIconText: { fontSize: 20 },
  historyNumber: { fontSize: 15, fontWeight: '600' as const },
  historyEmployee: { fontSize: 13, marginTop: 2 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: '700' as const },
  historyDescription: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  historyMeta: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12, alignItems: 'center' as const },
  historyMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  historyMetaText: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  expandedContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  expandedSection: { marginBottom: 12 },
  expandedLabel: { fontSize: 12, fontWeight: '500' as const, marginBottom: 4 },
  expandedText: { fontSize: 14, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  modalList: { padding: 8 },
  modalOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1, gap: 12 },
  modalOptionText: { flex: 1, fontSize: 15 },
  typeEmoji: { fontSize: 20 },
  severityDot: { width: 12, height: 12, borderRadius: 6 },
  doneButton: { margin: 16, padding: 16, borderRadius: 10, alignItems: 'center' as const },
  doneButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#fff' },
});
