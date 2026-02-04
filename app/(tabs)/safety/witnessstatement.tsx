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
import {
  Users,
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
  AlertTriangle,
  History,
  Send,
  Phone,
  Mail,
  Eye,
  Ear,
  Shield,
  PenTool,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  useWitnessStatements,
  useCreateWitnessStatement,
  WitnessRelation,
  ObservationType,
} from '@/hooks/useWitnessStatement';
import type { WitnessStatementFormData } from '@/hooks/useWitnessStatement';

const WITNESS_RELATIONS: { id: WitnessRelation; name: string; description: string }[] = [
  { id: 'direct_witness', name: 'Direct Witness', description: 'Saw the incident occur' },
  { id: 'indirect_witness', name: 'Indirect Witness', description: 'Heard about it immediately after' },
  { id: 'first_responder', name: 'First Responder', description: 'Responded to the incident' },
  { id: 'supervisor', name: 'Supervisor', description: 'Supervisor of involved parties' },
  { id: 'coworker', name: 'Coworker', description: 'Works in the same area' },
  { id: 'visitor', name: 'Visitor/Contractor', description: 'Non-employee witness' },
  { id: 'other', name: 'Other', description: 'Other relationship' },
];

const OBSERVATION_TYPES: { id: ObservationType; name: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { id: 'visual', name: 'Saw It (Visual)', icon: Eye },
  { id: 'auditory', name: 'Heard It (Auditory)', icon: Ear },
  { id: 'both', name: 'Saw and Heard', icon: Users },
  { id: 'aftermath_only', name: 'Aftermath Only', icon: AlertTriangle },
];

const DEPARTMENTS = [
  'Production', 'Warehouse', 'Shipping', 'Receiving', 'Maintenance',
  'Quality', 'Office', 'Sanitation', 'R&D', 'Safety', 'HR', 'Other'
];

const initialFormData: WitnessStatementFormData = {
  incident_reference: '',
  incident_date: '',
  incident_time: '',
  incident_location: '',
  witness_name: '',
  witness_employee_id: '',
  witness_department: '',
  witness_job_title: '',
  witness_phone: '',
  witness_email: '',
  witness_relation: '',
  observation_type: '',
  witness_location: '',
  distance_from_incident: '',
  what_observed: '',
  sequence_of_events: '',
  people_involved: '',
  actions_taken: '',
  conditions_at_time: '',
  contributing_factors: '',
  injuries_observed: '',
  damage_observed: '',
  additional_info: '',
  previous_similar_incidents: false,
  previous_incidents_details: '',
  safety_suggestions: '',
  willing_to_provide_more_info: true,
  witness_signature_confirmed: false,
};

export default function WitnessStatementScreen() {
  const { colors } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<WitnessStatementFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStatement, setExpandedStatement] = useState<string | null>(null);
  
  const [showRelationPicker, setShowRelationPicker] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);

  const { data: statements = [], isLoading, refetch } = useWitnessStatements();
  const createMutation = useCreateWitnessStatement();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateFormData = useCallback((key: keyof WitnessStatementFormData, value: WitnessStatementFormData[keyof WitnessStatementFormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const filteredStatements = useMemo(() => {
    return statements.filter(statement => {
      const matchesSearch = !searchQuery ||
        statement.statement_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        statement.witness_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        statement.incident_reference.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [statements, searchQuery]);

  const canSubmit = formData.incident_reference.trim().length > 0 &&
    formData.witness_name.trim().length > 0 &&
    formData.witness_relation &&
    formData.observation_type &&
    formData.what_observed.trim().length > 10 &&
    formData.sequence_of_events.trim().length > 10 &&
    formData.witness_signature_confirmed;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields and confirm the witness signature.');
      return;
    }

    Alert.alert(
      'Submit Statement',
      'This witness statement will be submitted for review. The witness has confirmed the accuracy of this statement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await createMutation.mutateAsync(formData);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Witness statement submitted for review.');
              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[WitnessStatement] Submit error:', error);
              Alert.alert('Error', 'Failed to submit statement. Please try again.');
            }
          },
        },
      ]
    );
  }, [canSubmit, formData, createMutation]);

  const resetForm = useCallback(() => {
    Alert.alert('Clear Form', 'Are you sure you want to clear all entries?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setFormData(initialFormData) },
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reviewed': return '#10B981';
      case 'archived': return '#6B7280';
      case 'pending_review': return '#F59E0B';
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
        <View style={[styles.iconContainer, { backgroundColor: '#0891B220' }]}>
          <Users size={32} color="#0891B2" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Witness Statement</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Document witness accounts of safety incidents
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#0891B220', borderColor: '#0891B240' }]}>
        <Shield size={18} color="#0891B2" />
        <Text style={[styles.infoText, { color: '#0891B2' }]}>
          Witness statements are confidential and used only for safety investigation purposes. Be factual and objective.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Incident Information *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Incident Reference # *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <FileText size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="INC-XXXX-XXXX"
          placeholderTextColor={colors.textSecondary}
          value={formData.incident_reference}
          onChangeText={(text) => updateFormData('incident_reference', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Incident Date</Text>
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

      <Text style={[styles.label, { color: colors.textSecondary }]}>Incident Location</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MapPin size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Where did the incident occur?"
          placeholderTextColor={colors.textSecondary}
          value={formData.incident_location}
          onChangeText={(text) => updateFormData('incident_location', text)}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Witness Information *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Witness Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Full name"
          placeholderTextColor={colors.textSecondary}
          value={formData.witness_name}
          onChangeText={(text) => updateFormData('witness_name', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Employee ID</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="EMP###"
            placeholderTextColor={colors.textSecondary}
            value={formData.witness_employee_id}
            onChangeText={(text) => updateFormData('witness_employee_id', text)}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Job Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Position"
            placeholderTextColor={colors.textSecondary}
            value={formData.witness_job_title}
            onChangeText={(text) => updateFormData('witness_job_title', text)}
          />
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Department</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowDepartmentPicker(true)}
      >
        <Text style={[styles.selectorText, { color: formData.witness_department ? colors.text : colors.textSecondary }]}>
          {formData.witness_department || 'Select department'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Phone size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.inputField, { color: colors.text }]}
              placeholder="Contact number"
              placeholderTextColor={colors.textSecondary}
              value={formData.witness_phone}
              onChangeText={(text) => updateFormData('witness_phone', text)}
              keyboardType="phone-pad"
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Mail size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.inputField, { color: colors.text }]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={formData.witness_email}
              onChangeText={(text) => updateFormData('witness_email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Witness Relationship to Incident *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowRelationPicker(true)}
      >
        <Users size={18} color={formData.witness_relation ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.witness_relation ? colors.text : colors.textSecondary, flex: 1 }]}>
          {formData.witness_relation 
            ? WITNESS_RELATIONS.find(r => r.id === formData.witness_relation)?.name
            : 'Select relationship'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Observation Details *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>How did you observe the incident? *</Text>
      <View style={styles.observationGrid}>
        {OBSERVATION_TYPES.map((type) => {
          const IconComponent = type.icon;
          const isSelected = formData.observation_type === type.id;
          return (
            <Pressable
              key={type.id}
              style={[
                styles.observationOption,
                { borderColor: isSelected ? '#0891B2' : colors.border },
                isSelected && { backgroundColor: '#0891B220' }
              ]}
              onPress={() => {
                updateFormData('observation_type', type.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <IconComponent size={20} color={isSelected ? '#0891B2' : colors.textSecondary} />
              <Text style={[styles.observationText, { color: isSelected ? '#0891B2' : colors.text }]}>{type.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Where were you positioned?</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="e.g., At my workstation, 10 feet away"
        placeholderTextColor={colors.textSecondary}
        value={formData.witness_location}
        onChangeText={(text) => updateFormData('witness_location', text)}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Approximate distance from incident</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="e.g., 5 feet, 10 meters"
        placeholderTextColor={colors.textSecondary}
        value={formData.distance_from_incident}
        onChangeText={(text) => updateFormData('distance_from_incident', text)}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Statement *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>What did you observe? *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, minHeight: 100 }]}
        placeholder="Describe exactly what you saw and/or heard in your own words..."
        placeholderTextColor={colors.textSecondary}
        value={formData.what_observed}
        onChangeText={(text) => updateFormData('what_observed', text)}
        multiline
        numberOfLines={5}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Sequence of Events *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, minHeight: 100 }]}
        placeholder="Describe the sequence of events as you observed them (before, during, after)..."
        placeholderTextColor={colors.textSecondary}
        value={formData.sequence_of_events}
        onChangeText={(text) => updateFormData('sequence_of_events', text)}
        multiline
        numberOfLines={5}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>People Involved</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Names or descriptions of people involved..."
        placeholderTextColor={colors.textSecondary}
        value={formData.people_involved}
        onChangeText={(text) => updateFormData('people_involved', text)}
        multiline
        numberOfLines={2}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Actions Taken (by you or others)</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="What actions were taken in response..."
        placeholderTextColor={colors.textSecondary}
        value={formData.actions_taken}
        onChangeText={(text) => updateFormData('actions_taken', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Conditions & Contributing Factors</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Conditions at Time of Incident</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Lighting, floor condition, noise level, weather, etc..."
        placeholderTextColor={colors.textSecondary}
        value={formData.conditions_at_time}
        onChangeText={(text) => updateFormData('conditions_at_time', text)}
        multiline
        numberOfLines={2}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Contributing Factors You Observed</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Any factors that may have contributed to the incident..."
        placeholderTextColor={colors.textSecondary}
        value={formData.contributing_factors}
        onChangeText={(text) => updateFormData('contributing_factors', text)}
        multiline
        numberOfLines={2}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Injuries Observed</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Description of any injuries you observed..."
        placeholderTextColor={colors.textSecondary}
        value={formData.injuries_observed}
        onChangeText={(text) => updateFormData('injuries_observed', text)}
        multiline
        numberOfLines={2}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Property/Equipment Damage Observed</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Description of any damage you observed..."
        placeholderTextColor={colors.textSecondary}
        value={formData.damage_observed}
        onChangeText={(text) => updateFormData('damage_observed', text)}
        multiline
        numberOfLines={2}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Information</Text>

      <Pressable
        style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('previous_similar_incidents', !formData.previous_similar_incidents);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.previous_similar_incidents ? '#F59E0B' : colors.border, backgroundColor: formData.previous_similar_incidents ? '#F59E0B' : 'transparent' }]}>
          {formData.previous_similar_incidents && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.toggleContent}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Aware of Similar Previous Incidents</Text>
          <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>I know of similar incidents that occurred before</Text>
        </View>
      </Pressable>

      {formData.previous_similar_incidents && (
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginTop: 8 }]}
          placeholder="Please describe the previous incidents..."
          placeholderTextColor={colors.textSecondary}
          value={formData.previous_incidents_details}
          onChangeText={(text) => updateFormData('previous_incidents_details', text)}
          multiline
          numberOfLines={2}
        />
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>Safety Suggestions</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Suggestions to prevent similar incidents..."
        placeholderTextColor={colors.textSecondary}
        value={formData.safety_suggestions}
        onChangeText={(text) => updateFormData('safety_suggestions', text)}
        multiline
        numberOfLines={2}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Any Other Information</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Anything else relevant to this incident..."
        placeholderTextColor={colors.textSecondary}
        value={formData.additional_info}
        onChangeText={(text) => updateFormData('additional_info', text)}
        multiline
        numberOfLines={2}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Acknowledgment *</Text>

      <Pressable
        style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('willing_to_provide_more_info', !formData.willing_to_provide_more_info);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.willing_to_provide_more_info ? '#10B981' : colors.border, backgroundColor: formData.willing_to_provide_more_info ? '#10B981' : 'transparent' }]}>
          {formData.willing_to_provide_more_info && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.toggleContent}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Willing to Provide Additional Information</Text>
          <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>I am available for follow-up questions</Text>
        </View>
      </Pressable>

      <View style={[styles.signatureCard, { backgroundColor: '#0891B210', borderColor: '#0891B240' }]}>
        <PenTool size={20} color="#0891B2" />
        <View style={styles.signatureContent}>
          <Text style={[styles.signatureTitle, { color: colors.text }]}>Witness Signature Confirmation *</Text>
          <Text style={[styles.signatureText, { color: colors.textSecondary }]}>
            By checking this box, the witness confirms that this statement is true and accurate to the best of their knowledge.
          </Text>
          <Pressable
            style={[styles.signatureCheckbox, { borderColor: formData.witness_signature_confirmed ? '#0891B2' : colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              updateFormData('witness_signature_confirmed', !formData.witness_signature_confirmed);
            }}
          >
            <View style={[styles.checkboxLarge, { borderColor: formData.witness_signature_confirmed ? '#0891B2' : colors.border, backgroundColor: formData.witness_signature_confirmed ? '#0891B2' : 'transparent' }]}>
              {formData.witness_signature_confirmed && <Check size={18} color="#fff" />}
            </View>
            <Text style={[styles.signatureCheckboxText, { color: formData.witness_signature_confirmed ? '#0891B2' : colors.text }]}>
              I confirm this statement is accurate
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={resetForm}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Clear Form</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: canSubmit ? '#0891B2' : colors.border }]}
          onPress={handleSubmit}
          disabled={createMutation.isPending || !canSubmit}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Send size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Submit Statement</Text>
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
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search statements..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading && statements.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredStatements.length === 0 ? (
        <View style={styles.emptyState}>
          <Users size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Statements Found</Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            {searchQuery ? 'Try adjusting your search' : 'Record your first witness statement'}
          </Text>
        </View>
      ) : (
        filteredStatements.map((statement) => {
          const isExpanded = expandedStatement === statement.id;
          return (
            <Pressable
              key={statement.id}
              style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedStatement(isExpanded ? null : statement.id);
              }}
            >
              <View style={styles.historyCardHeader}>
                <View style={styles.historyCardLeft}>
                  <View style={[styles.historyIcon, { backgroundColor: '#0891B220' }]}>
                    <Users size={20} color="#0891B2" />
                  </View>
                  <View>
                    <Text style={[styles.historyNumber, { color: colors.text }]}>{statement.statement_number}</Text>
                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{statement.date}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(statement.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(statement.status) }]}>
                    {statement.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.witnessInfo}>
                <User size={14} color={colors.textSecondary} />
                <Text style={[styles.witnessName, { color: colors.text }]}>{statement.witness_name}</Text>
                <Text style={[styles.witnessRelation, { color: colors.textSecondary }]}>
                  • {WITNESS_RELATIONS.find(r => r.id === statement.witness_relation)?.name}
                </Text>
              </View>

              <Text style={[styles.historyObservation, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 2}>
                {statement.what_observed}
              </Text>

              <View style={styles.historyMeta}>
                <View style={styles.historyMetaItem}>
                  <FileText size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{statement.incident_reference}</Text>
                </View>
              </View>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  
                  <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Sequence of Events:</Text>
                  <Text style={[styles.expandedText, { color: colors.text }]}>{statement.sequence_of_events}</Text>

                  {statement.actions_taken && (
                    <>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary, marginTop: 12 }]}>Actions Taken:</Text>
                      <Text style={[styles.expandedText, { color: colors.text }]}>{statement.actions_taken}</Text>
                    </>
                  )}

                  {statement.contributing_factors && (
                    <>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary, marginTop: 12 }]}>Contributing Factors:</Text>
                      <Text style={[styles.expandedText, { color: colors.text }]}>{statement.contributing_factors}</Text>
                    </>
                  )}

                  {statement.safety_suggestions && (
                    <>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary, marginTop: 12 }]}>Safety Suggestions:</Text>
                      <Text style={[styles.expandedText, { color: colors.text }]}>{statement.safety_suggestions}</Text>
                    </>
                  )}

                  <View style={[styles.signatureInfo, { backgroundColor: '#10B98110', marginTop: 12 }]}>
                    <Check size={16} color="#10B981" />
                    <Text style={[styles.signatureInfoText, { color: '#10B981' }]}>
                      Statement signed on {statement.signature_date}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.expandIndicator}>
                <ChevronRight 
                  size={18} 
                  color={colors.textSecondary} 
                  style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} 
                />
              </View>
            </Pressable>
          );
        })
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: '#0891B2', borderBottomWidth: 2 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('new'); }}
        >
          <Plus size={18} color={activeTab === 'new' ? '#0891B2' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#0891B2' : colors.textSecondary }]}>New Statement</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#0891B2', borderBottomWidth: 2 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('history'); }}
        >
          <History size={18} color={activeTab === 'history' ? '#0891B2' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#0891B2' : colors.textSecondary }]}>History</Text>
        </Pressable>
      </View>

      {activeTab === 'new' ? renderNewTab() : renderHistoryTab()}

      <Modal visible={showRelationPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Relationship</Text>
              <Pressable onPress={() => setShowRelationPicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {WITNESS_RELATIONS.map((relation) => (
                <Pressable
                  key={relation.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    updateFormData('witness_relation', relation.id);
                    setShowRelationPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={styles.modalOptionContent}>
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>{relation.name}</Text>
                    <Text style={[styles.modalOptionDesc, { color: colors.textSecondary }]}>{relation.description}</Text>
                  </View>
                  {formData.witness_relation === relation.id && <Check size={20} color="#0891B2" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showDepartmentPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Department</Text>
              <Pressable onPress={() => setShowDepartmentPicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {DEPARTMENTS.map((dept) => (
                <Pressable
                  key={dept}
                  style={[styles.modalOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    updateFormData('witness_department', dept);
                    setShowDepartmentPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{dept}</Text>
                  {formData.witness_department === dept && <Check size={20} color="#0891B2" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  tabContainer: { flexDirection: 'row' as const, borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, gap: 8 },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  headerCard: { borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center' as const, borderWidth: 1 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' as const },
  subtitle: { fontSize: 14, textAlign: 'center' as const, lineHeight: 20 },
  infoCard: { flexDirection: 'row' as const, padding: 14, borderRadius: 12, marginBottom: 20, borderWidth: 1, gap: 12, alignItems: 'flex-start' as const },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, marginTop: 8, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500' as const, marginBottom: 6 },
  row: { flexDirection: 'row' as const, gap: 12, marginBottom: 4 },
  halfField: { flex: 1 },
  dateField: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 48, gap: 8, marginBottom: 12 },
  dateInput: { flex: 1, fontSize: 15 },
  selector: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 50, gap: 10, marginBottom: 12 },
  selectorText: { fontSize: 15 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 15, marginBottom: 12 },
  inputWithIcon: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 50, gap: 10, marginBottom: 12 },
  inputField: { flex: 1, fontSize: 15, height: '100%' },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12, textAlignVertical: 'top' as const, minHeight: 90 },
  observationGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 16 },
  observationOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, gap: 8, width: '48%' },
  observationText: { fontSize: 12, fontWeight: '500' as const, flex: 1 },
  toggleOption: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  toggleContent: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: '600' as const },
  toggleSubtitle: { fontSize: 12, marginTop: 2 },
  signatureCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, flexDirection: 'row' as const, gap: 12 },
  signatureContent: { flex: 1 },
  signatureTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 6 },
  signatureText: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  signatureCheckbox: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderRadius: 8, borderWidth: 1, gap: 10 },
  checkboxLarge: { width: 28, height: 28, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  signatureCheckboxText: { fontSize: 14, fontWeight: '600' as const },
  buttonRow: { flexDirection: 'row' as const, gap: 12, marginTop: 8 },
  secondaryButton: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' as const },
  primaryButton: { flex: 2, height: 50, borderRadius: 12, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  bottomPadding: { height: 40 },
  searchContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46, gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15 },
  loadingContainer: { padding: 40, alignItems: 'center' as const },
  emptyState: { alignItems: 'center' as const, padding: 40 },
  emptyStateTitle: { fontSize: 17, fontWeight: '600' as const, marginTop: 16 },
  emptyStateText: { fontSize: 14, marginTop: 8, textAlign: 'center' as const },
  historyCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  historyCardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, marginBottom: 10 },
  historyCardLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  historyIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  historyNumber: { fontSize: 15, fontWeight: '700' as const },
  historyDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' as const },
  witnessInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 8 },
  witnessName: { fontSize: 14, fontWeight: '500' as const },
  witnessRelation: { fontSize: 12 },
  historyObservation: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  historyMeta: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
  historyMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  historyMetaText: { fontSize: 12 },
  expandedContent: { marginTop: 12 },
  divider: { height: 1, marginBottom: 12 },
  expandedLabel: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, marginBottom: 6 },
  expandedText: { fontSize: 14, lineHeight: 20 },
  signatureInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 10, borderRadius: 8, gap: 8 },
  signatureInfoText: { fontSize: 13, fontWeight: '500' as const },
  expandIndicator: { alignItems: 'center' as const, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700' as const },
  modalScroll: { padding: 8 },
  modalOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1, gap: 12 },
  modalOptionContent: { flex: 1 },
  modalOptionText: { fontSize: 15, fontWeight: '500' as const },
  modalOptionDesc: { fontSize: 12, marginTop: 2 },
});
