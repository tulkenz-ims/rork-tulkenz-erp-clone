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
  AlertTriangle,
  Plus,
  Calendar,
  MapPin,
  User,
  Clock,
  FileText,
  X,
  Check,
  ChevronDown,
  History,
  Shield,
  Zap,
  Flame,
  Truck,
  Droplets,
  Wind,
  Package,
  Wrench,
  Users,
  Target,
  AlertCircle,
  ChevronRight,
  Eye,
  Building2,
  Search,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseSafety, SafetyIncident } from '@/hooks/useSupabaseSafety';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

type PotentialSeverity = 'minor' | 'moderate' | 'serious' | 'critical' | 'fatality';

interface HazardCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  examples: string[];
}

const HAZARD_CATEGORIES: HazardCategory[] = [
  {
    id: 'slip_trip_fall',
    name: 'Slip/Trip/Fall',
    icon: AlertTriangle,
    color: '#F59E0B',
    examples: ['Wet floor', 'Uneven surface', 'Obstructed walkway', 'Missing handrail'],
  },
  {
    id: 'struck_by',
    name: 'Struck By/Against',
    icon: Target,
    color: '#EF4444',
    examples: ['Falling object', 'Moving equipment', 'Swinging load', 'Flying debris'],
  },
  {
    id: 'caught_in',
    name: 'Caught In/Between',
    icon: Wrench,
    color: '#DC2626',
    examples: ['Moving machinery', 'Pinch point', 'Conveyor', 'Closing door'],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: Zap,
    color: '#8B5CF6',
    examples: ['Exposed wiring', 'Damaged cord', 'Water near electrical', 'Overloaded circuit'],
  },
  {
    id: 'fire',
    name: 'Fire/Explosion',
    icon: Flame,
    color: '#DC2626',
    examples: ['Hot work near combustibles', 'Gas leak', 'Blocked exit', 'Missing extinguisher'],
  },
  {
    id: 'chemical',
    name: 'Chemical/Hazmat',
    icon: Droplets,
    color: '#06B6D4',
    examples: ['Spill', 'Fumes', 'Missing label', 'Improper storage'],
  },
  {
    id: 'vehicle',
    name: 'Vehicle/Forklift',
    icon: Truck,
    color: '#F97316',
    examples: ['Near collision', 'Speeding', 'Blind spot', 'Pedestrian in path'],
  },
  {
    id: 'ergonomic',
    name: 'Ergonomic',
    icon: User,
    color: '#10B981',
    examples: ['Heavy lift', 'Awkward posture', 'Repetitive motion', 'Improper technique'],
  },
  {
    id: 'environmental',
    name: 'Environmental',
    icon: Wind,
    color: '#3B82F6',
    examples: ['Extreme temperature', 'Poor ventilation', 'Noise exposure', 'Poor lighting'],
  },
  {
    id: 'falling_object',
    name: 'Falling Object',
    icon: Package,
    color: '#A855F7',
    examples: ['Unstable stack', 'Overhead load', 'Unsecured item', 'Damaged racking'],
  },
  {
    id: 'ppe',
    name: 'PPE Issue',
    icon: Shield,
    color: '#6366F1',
    examples: ['Missing PPE', 'Damaged PPE', 'Wrong PPE', 'PPE not worn'],
  },
  {
    id: 'other',
    name: 'Other',
    icon: AlertCircle,
    color: '#64748B',
    examples: ['Other hazard not listed'],
  },
];

const SEVERITY_OPTIONS = [
  { id: 'minor' as const, name: 'Minor', description: 'First aid or less', color: '#10B981' },
  { id: 'moderate' as const, name: 'Moderate', description: 'Medical treatment', color: '#F59E0B' },
  { id: 'serious' as const, name: 'Serious', description: 'Lost time injury', color: '#F97316' },
  { id: 'critical' as const, name: 'Critical', description: 'Permanent disability', color: '#EF4444' },
  { id: 'fatality' as const, name: 'Fatality', description: 'Life-threatening', color: '#DC2626' },
];

const LOCATIONS = [
  { id: 'production', name: 'Production Floor' },
  { id: 'warehouse', name: 'Warehouse' },
  { id: 'shipping', name: 'Shipping/Receiving' },
  { id: 'maintenance', name: 'Maintenance Shop' },
  { id: 'lab', name: 'Lab/QC Area' },
  { id: 'office', name: 'Office Area' },
  { id: 'breakroom', name: 'Break Room' },
  { id: 'restroom', name: 'Restroom' },
  { id: 'parking', name: 'Parking Lot' },
  { id: 'loading', name: 'Loading Dock' },
  { id: 'exterior', name: 'Exterior' },
  { id: 'other', name: 'Other' },
];

const CONTRIBUTING_FACTORS = [
  { id: 'training', name: 'Inadequate Training' },
  { id: 'procedure', name: 'Missing/Unclear Procedure' },
  { id: 'equipment', name: 'Equipment Failure/Defect' },
  { id: 'housekeeping', name: 'Poor Housekeeping' },
  { id: 'communication', name: 'Communication Failure' },
  { id: 'fatigue', name: 'Fatigue/Distraction' },
  { id: 'rushing', name: 'Rushing/Time Pressure' },
  { id: 'complacency', name: 'Complacency' },
  { id: 'ppe', name: 'PPE Not Available/Used' },
  { id: 'design', name: 'Poor Design/Layout' },
  { id: 'maintenance', name: 'Maintenance Issue' },
  { id: 'weather', name: 'Weather/Environmental' },
  { id: 'supervision', name: 'Inadequate Supervision' },
  { id: 'other', name: 'Other' },
];

interface NearMissFormData {
  description: string;
  location: string;
  specificLocation: string;
  date: string;
  time: string;
  hazardCategory: string;
  potentialSeverity: PotentialSeverity;
  whatCouldHaveHappened: string;
  contributingFactors: string[];
  immediateActions: string;
  recommendations: string;
  witnessNames: string;
  involvedPersonName: string;
  anonymous: boolean;
}

const initialFormData: NearMissFormData = {
  description: '',
  location: '',
  specificLocation: '',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  hazardCategory: '',
  potentialSeverity: 'moderate',
  whatCouldHaveHappened: '',
  contributingFactors: [],
  immediateActions: '',
  recommendations: '',
  witnessNames: '',
  involvedPersonName: '',
  anonymous: false,
};

export default function NearMissScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { incidents, createIncident, generateIncidentNumber, refetch, isLoading } = useSupabaseSafety();
  
  const [activeTab, setActiveTab] = useState<'report' | 'history'>('report');
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState<NearMissFormData>(initialFormData);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showHazardPicker, setShowHazardPicker] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);
  const [showFactorsPicker, setShowFactorsPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const nearMissHistory = useMemo(() => {
    return incidents
      .filter(i => i.incident_type === 'near_miss')
      .sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime());
  }, [incidents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const updateFormData = useCallback((key: keyof NearMissFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleContributingFactor = useCallback((factorId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData(prev => ({
      ...prev,
      contributingFactors: prev.contributingFactors.includes(factorId)
        ? prev.contributingFactors.filter(f => f !== factorId)
        : [...prev.contributingFactors, factorId],
    }));
  }, []);

  const canSubmit = formData.description.trim().length > 10 &&
    formData.location &&
    formData.hazardCategory &&
    formData.whatCouldHaveHappened.trim().length > 10;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please fill in all required fields:\n• Description (min 10 chars)\n• Location\n• Hazard Type\n• What Could Have Happened (min 10 chars)');
      return;
    }

    Alert.alert(
      'Submit Near-Miss Report',
      'Are you sure you want to submit this near-miss report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              const incidentNumber = generateIncidentNumber();
              const locationName = LOCATIONS.find(l => l.id === formData.location)?.name || formData.location;
              const fullLocation = formData.specificLocation 
                ? `${locationName} - ${formData.specificLocation}`
                : locationName;

              const contributingFactorNames = formData.contributingFactors
                .map(id => CONTRIBUTING_FACTORS.find(f => f.id === id)?.name || id);

              await createIncident({
                incident_number: incidentNumber,
                incident_type: 'near_miss',
                severity: formData.potentialSeverity,
                status: 'reported',
                facility_id: null,
                location: fullLocation,
                department_code: null,
                department_name: null,
                incident_date: formData.date,
                incident_time: formData.time,
                reported_date: new Date().toISOString().split('T')[0],
                reported_by: formData.anonymous ? 'Anonymous' : (user?.email || 'Unknown'),
                reported_by_id: formData.anonymous ? null : (user?.id || null),
                description: formData.description,
                immediate_actions: formData.immediateActions || null,
                injured_employee_id: null,
                injured_employee_name: formData.involvedPersonName || null,
                injury_type: null,
                body_part: null,
                medical_treatment: null,
                days_away: null,
                restricted_days: null,
                witnesses: formData.witnessNames ? formData.witnessNames.split(',').map(w => w.trim()) : [],
                root_cause: null,
                contributing_factors: contributingFactorNames,
                corrective_actions: null,
                preventive_actions: formData.recommendations || null,
                osha_recordable: false,
                osha_form_completed: false,
                investigation_lead: null,
                investigation_lead_id: null,
                investigation_date: null,
                investigation_notes: JSON.stringify({
                  hazardCategory: formData.hazardCategory,
                  whatCouldHaveHappened: formData.whatCouldHaveHappened,
                  potentialSeverity: formData.potentialSeverity,
                }),
                closed_date: null,
                closed_by: null,
                closed_by_id: null,
                attachments: [],
                notes: null,
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Near-miss report submitted successfully! Thank you for helping keep our workplace safe.');
              
              setFormData(initialFormData);
              setActiveTab('history');
              refetch();
            } catch (error) {
              console.error('[NearMiss] Submit error:', error);
              Alert.alert('Error', 'Failed to submit report. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }, [canSubmit, formData, user, createIncident, generateIncidentNumber, refetch]);

  const resetForm = useCallback(() => {
    Alert.alert(
      'Clear Form',
      'Are you sure you want to clear all entries?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setFormData(initialFormData),
        },
      ]
    );
  }, []);

  const getSeverityColor = (severity: string) => {
    return SEVERITY_OPTIONS.find(s => s.id === severity)?.color || colors.textSecondary;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return '#10B981';
      case 'under_investigation': return '#F59E0B';
      case 'reported': return '#3B82F6';
      default: return colors.textSecondary;
    }
  };

  const renderReportTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#F59E0B20' }]}>
          <AlertTriangle size={32} color="#F59E0B" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Near-Miss Report</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Report close calls and potential hazards before they cause injury
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#3B82F620', borderColor: '#3B82F640' }]}>
        <Eye size={18} color="#3B82F6" />
        <Text style={[styles.infoText, { color: '#3B82F6' }]}>
          Near-miss reporting helps identify hazards before someone gets hurt. Your report matters!
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Event Details *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>What happened? *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe the near-miss event in detail. What were you doing? What happened?"
        placeholderTextColor={colors.textSecondary}
        value={formData.description}
        onChangeText={(text) => updateFormData('description', text)}
        multiline
        numberOfLines={4}
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
          <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
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
          {formData.location ? LOCATIONS.find(l => l.id === formData.location)?.name : 'Select location'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Specific location details (aisle, machine #, etc.)"
        placeholderTextColor={colors.textSecondary}
        value={formData.specificLocation}
        onChangeText={(text) => updateFormData('specificLocation', text)}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Hazard Information *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Hazard Type *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowHazardPicker(true)}
      >
        {formData.hazardCategory ? (
          <>
            {React.createElement(HAZARD_CATEGORIES.find(h => h.id === formData.hazardCategory)?.icon || AlertTriangle, {
              size: 18,
              color: HAZARD_CATEGORIES.find(h => h.id === formData.hazardCategory)?.color || colors.primary,
            })}
            <Text style={[styles.selectorText, { color: colors.text }]}>
              {HAZARD_CATEGORIES.find(h => h.id === formData.hazardCategory)?.name}
            </Text>
          </>
        ) : (
          <>
            <AlertCircle size={18} color={colors.textSecondary} />
            <Text style={[styles.selectorText, { color: colors.textSecondary }]}>Select hazard type</Text>
          </>
        )}
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>What could have happened? *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe the potential consequences if this hadn't been a near-miss..."
        placeholderTextColor={colors.textSecondary}
        value={formData.whatCouldHaveHappened}
        onChangeText={(text) => updateFormData('whatCouldHaveHappened', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Potential Severity (if incident occurred)</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowSeverityPicker(true)}
      >
        <View style={[styles.severityDot, { backgroundColor: getSeverityColor(formData.potentialSeverity) }]} />
        <Text style={[styles.selectorText, { color: colors.text }]}>
          {SEVERITY_OPTIONS.find(s => s.id === formData.potentialSeverity)?.name} - {SEVERITY_OPTIONS.find(s => s.id === formData.potentialSeverity)?.description}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Contributing Factors</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowFactorsPicker(true)}
      >
        <FileText size={18} color={formData.contributingFactors.length > 0 ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.contributingFactors.length > 0 ? colors.text : colors.textSecondary }]}>
          {formData.contributingFactors.length > 0
            ? `${formData.contributingFactors.length} factor(s) selected`
            : 'Select contributing factors'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      {formData.contributingFactors.length > 0 && (
        <View style={styles.selectedFactors}>
          {formData.contributingFactors.map((factorId) => {
            const factor = CONTRIBUTING_FACTORS.find(f => f.id === factorId);
            return (
              <View key={factorId} style={[styles.factorChip, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.factorChipText, { color: colors.primary }]}>{factor?.name}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Actions & Recommendations</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Immediate Actions Taken</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="What did you do immediately after the near-miss?"
        placeholderTextColor={colors.textSecondary}
        value={formData.immediateActions}
        onChangeText={(text) => updateFormData('immediateActions', text)}
        multiline
        numberOfLines={2}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Recommendations to Prevent Recurrence</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="What changes would help prevent this from happening again?"
        placeholderTextColor={colors.textSecondary}
        value={formData.recommendations}
        onChangeText={(text) => updateFormData('recommendations', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>People Involved</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Person(s) Involved (if any)</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Name of person(s) who were at risk"
          placeholderTextColor={colors.textSecondary}
          value={formData.involvedPersonName}
          onChangeText={(text) => updateFormData('involvedPersonName', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Witnesses</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Users size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Witness names (comma separated)"
          placeholderTextColor={colors.textSecondary}
          value={formData.witnessNames}
          onChangeText={(text) => updateFormData('witnessNames', text)}
        />
      </View>

      <Pressable
        style={[styles.anonymousToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('anonymous', !formData.anonymous);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.anonymous ? colors.primary : colors.border, backgroundColor: formData.anonymous ? colors.primary : 'transparent' }]}>
          {formData.anonymous && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.anonymousTextContainer}>
          <Text style={[styles.anonymousTitle, { color: colors.text }]}>Submit Anonymously</Text>
          <Text style={[styles.anonymousSubtitle, { color: colors.textSecondary }]}>
            Your name will not be recorded with this report
          </Text>
        </View>
      </Pressable>

      <View style={styles.actionButtons}>
        <Pressable
          style={[styles.resetButton, { borderColor: colors.border }]}
          onPress={resetForm}
        >
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, { backgroundColor: canSubmit ? '#F59E0B' : colors.border }]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <AlertTriangle size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Report</Text>
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
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : nearMissHistory.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AlertTriangle size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Near-Miss Reports</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Submit your first near-miss report to help identify hazards
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Near-Miss Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: colors.primary }]}>{nearMissHistory.length}</Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Total</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#F59E0B' }]}>
                  {nearMissHistory.filter(r => r.status === 'under_investigation').length}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Investigating</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>
                  {nearMissHistory.filter(r => r.status === 'closed').length}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Closed</Text>
              </View>
            </View>
          </View>

          {nearMissHistory.map((report) => {
            const isExpanded = expandedReport === report.id;
            let investigationData: any = {};
            try {
              investigationData = report.investigation_notes ? JSON.parse(report.investigation_notes) : {};
            } catch {
              investigationData = {};
            }
            const hazardCategory = HAZARD_CATEGORIES.find(h => h.id === investigationData.hazardCategory);

            return (
              <Pressable
                key={report.id}
                style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExpandedReport(isExpanded ? null : report.id);
                }}
              >
                <View style={styles.historyHeader}>
                  <View style={styles.historyHeaderLeft}>
                    <View style={[styles.hazardIcon, { backgroundColor: (hazardCategory?.color || '#F59E0B') + '20' }]}>
                      {hazardCategory ? (
                        React.createElement(hazardCategory.icon, { size: 18, color: hazardCategory.color })
                      ) : (
                        <AlertTriangle size={18} color="#F59E0B" />
                      )}
                    </View>
                    <View>
                      <Text style={[styles.historyNumber, { color: colors.text }]}>{report.incident_number}</Text>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                        {new Date(report.incident_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyHeaderRight}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                        {report.status.replace('_', ' ').toUpperCase()}
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
                  {report.description}
                </Text>

                <View style={styles.historyMeta}>
                  <View style={styles.historyMetaItem}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{report.location}</Text>
                  </View>
                  <View style={styles.historyMetaItem}>
                    <View style={[styles.severityDotSmall, { backgroundColor: getSeverityColor(report.severity) }]} />
                    <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                      {SEVERITY_OPTIONS.find(s => s.id === report.severity)?.name || report.severity}
                    </Text>
                  </View>
                </View>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                    {investigationData.whatCouldHaveHappened && (
                      <View style={styles.expandedSection}>
                        <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>What Could Have Happened</Text>
                        <Text style={[styles.expandedText, { color: colors.text }]}>{investigationData.whatCouldHaveHappened}</Text>
                      </View>
                    )}
                    
                    {report.contributing_factors && report.contributing_factors.length > 0 && (
                      <View style={styles.expandedSection}>
                        <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Contributing Factors</Text>
                        <View style={styles.factorsList}>
                          {report.contributing_factors.map((factor, index) => (
                            <View key={index} style={[styles.factorChipSmall, { backgroundColor: colors.background }]}>
                              <Text style={[styles.factorChipTextSmall, { color: colors.text }]}>{factor}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {report.immediate_actions && (
                      <View style={styles.expandedSection}>
                        <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Immediate Actions</Text>
                        <Text style={[styles.expandedText, { color: colors.text }]}>{report.immediate_actions}</Text>
                      </View>
                    )}

                    {report.preventive_actions && (
                      <View style={styles.expandedSection}>
                        <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Recommendations</Text>
                        <Text style={[styles.expandedText, { color: colors.text }]}>{report.preventive_actions}</Text>
                      </View>
                    )}

                    {report.corrective_actions && (
                      <View style={[styles.correctiveBox, { backgroundColor: '#10B98115' }]}>
                        <Text style={[styles.expandedLabel, { color: '#10B981' }]}>Corrective Actions Taken</Text>
                        <Text style={[styles.expandedText, { color: colors.text }]}>{report.corrective_actions}</Text>
                      </View>
                    )}

                    <View style={styles.reporterInfo}>
                      <User size={14} color={colors.textSecondary} />
                      <Text style={[styles.reporterText, { color: colors.textSecondary }]}>
                        Reported by {report.reported_by}
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
          style={[styles.tab, activeTab === 'report' && { borderBottomColor: '#F59E0B', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('report')}
        >
          <Plus size={18} color={activeTab === 'report' ? '#F59E0B' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'report' ? '#F59E0B' : colors.textSecondary }]}>
            New Report
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#F59E0B', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? '#F59E0B' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#F59E0B' : colors.textSecondary }]}>
            History ({nearMissHistory.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'report' ? renderReportTab() : renderHistoryTab()}

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

      {/* Hazard Picker Modal */}
      <Modal
        visible={showHazardPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHazardPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Hazard Type</Text>
              <Pressable onPress={() => setShowHazardPicker(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {HAZARD_CATEGORIES.map((hazard) => {
                const HazardIcon = hazard.icon;
                return (
                  <Pressable
                    key={hazard.id}
                    style={[
                      styles.hazardOption,
                      { borderBottomColor: colors.border },
                      formData.hazardCategory === hazard.id && { backgroundColor: hazard.color + '10' },
                    ]}
                    onPress={() => {
                      updateFormData('hazardCategory', hazard.id);
                      setShowHazardPicker(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={[styles.hazardOptionIcon, { backgroundColor: hazard.color + '20' }]}>
                      <HazardIcon size={20} color={hazard.color} />
                    </View>
                    <View style={styles.hazardOptionContent}>
                      <Text style={[styles.hazardOptionName, { color: colors.text }]}>{hazard.name}</Text>
                      <Text style={[styles.hazardOptionExamples, { color: colors.textSecondary }]} numberOfLines={1}>
                        {hazard.examples.slice(0, 3).join(', ')}
                      </Text>
                    </View>
                    {formData.hazardCategory === hazard.id && <Check size={18} color={hazard.color} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Severity Picker Modal */}
      <Modal
        visible={showSeverityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSeverityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Potential Severity</Text>
              <Pressable onPress={() => setShowSeverityPicker(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {SEVERITY_OPTIONS.map((severity) => (
                <Pressable
                  key={severity.id}
                  style={[
                    styles.severityOption,
                    { borderBottomColor: colors.border },
                    formData.potentialSeverity === severity.id && { backgroundColor: severity.color + '10' },
                  ]}
                  onPress={() => {
                    updateFormData('potentialSeverity', severity.id);
                    setShowSeverityPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={[styles.severityIndicator, { backgroundColor: severity.color }]} />
                  <View style={styles.severityContent}>
                    <Text style={[styles.severityName, { color: colors.text }]}>{severity.name}</Text>
                    <Text style={[styles.severityDesc, { color: colors.textSecondary }]}>{severity.description}</Text>
                  </View>
                  {formData.potentialSeverity === severity.id && <Check size={18} color={severity.color} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Contributing Factors Picker Modal */}
      <Modal
        visible={showFactorsPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFactorsPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Contributing Factors</Text>
              <Pressable onPress={() => setShowFactorsPicker(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {CONTRIBUTING_FACTORS.map((factor) => (
                <Pressable
                  key={factor.id}
                  style={[
                    styles.factorOption,
                    { borderBottomColor: colors.border },
                    formData.contributingFactors.includes(factor.id) && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => toggleContributingFactor(factor.id)}
                >
                  <View style={[
                    styles.factorCheckbox,
                    { borderColor: formData.contributingFactors.includes(factor.id) ? colors.primary : colors.border },
                    formData.contributingFactors.includes(factor.id) && { backgroundColor: colors.primary },
                  ]}>
                    {formData.contributingFactors.includes(factor.id) && <Check size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.factorOptionText, { color: colors.text }]}>{factor.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowFactorsPicker(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
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
  infoCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
    minHeight: 100,
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
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedFactors: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
  },
  factorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  factorChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
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
  anonymousToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  anonymousTextContainer: {
    flex: 1,
  },
  anonymousTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  anonymousSubtitle: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 8,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
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
  },
  hazardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  historyNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  historyDate: {
    fontSize: 12,
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
  historyDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
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
  severityDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  expandedContent: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  expandedSection: {
    marginBottom: 12,
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
  },
  expandedText: {
    fontSize: 14,
    lineHeight: 20,
  },
  factorsList: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  factorChipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  factorChipTextSmall: {
    fontSize: 12,
  },
  correctiveBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  reporterInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 12,
  },
  reporterText: {
    fontSize: 12,
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
  hazardOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  hazardOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  hazardOptionContent: {
    flex: 1,
  },
  hazardOptionName: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  hazardOptionExamples: {
    fontSize: 12,
    marginTop: 2,
  },
  severityOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  severityIndicator: {
    width: 6,
    height: 36,
    borderRadius: 3,
  },
  severityContent: {
    flex: 1,
  },
  severityName: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  severityDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  factorOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  factorCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  factorOptionText: {
    flex: 1,
    fontSize: 15,
  },
  doneButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
