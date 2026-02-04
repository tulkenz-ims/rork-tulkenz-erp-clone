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
  Truck,
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
  Shield,
  Camera,
  Users,
  Gauge,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  useVehicleIncidents,
  useCreateVehicleIncident,
  VehicleType,
  IncidentType,
  SeverityLevel,
} from '@/hooks/useVehicleIncident';
import type { VehicleIncidentFormData } from '@/hooks/useVehicleIncident';

const VEHICLE_TYPES: { id: VehicleType; name: string; icon: string }[] = [
  { id: 'forklift', name: 'Forklift', icon: '🚜' },
  { id: 'pallet_jack', name: 'Electric Pallet Jack', icon: '📦' },
  { id: 'order_picker', name: 'Order Picker', icon: '🏗️' },
  { id: 'reach_truck', name: 'Reach Truck', icon: '🔧' },
  { id: 'company_vehicle', name: 'Company Vehicle', icon: '🚗' },
  { id: 'delivery_truck', name: 'Delivery Truck', icon: '🚚' },
  { id: 'golf_cart', name: 'Golf Cart/Utility Vehicle', icon: '🛺' },
  { id: 'scissor_lift', name: 'Scissor Lift', icon: '⬆️' },
  { id: 'other', name: 'Other', icon: '❓' },
];

const INCIDENT_TYPES: { id: IncidentType; name: string }[] = [
  { id: 'collision_object', name: 'Collision with Object/Structure' },
  { id: 'collision_vehicle', name: 'Collision with Another Vehicle' },
  { id: 'collision_person', name: 'Collision/Contact with Person' },
  { id: 'tip_over', name: 'Vehicle Tip-Over' },
  { id: 'load_drop', name: 'Load Drop/Spill' },
  { id: 'pedestrian_near_miss', name: 'Pedestrian Near-Miss' },
  { id: 'mechanical_failure', name: 'Mechanical Failure' },
  { id: 'operator_injury', name: 'Operator Injury (non-collision)' },
  { id: 'property_damage', name: 'Property Damage Only' },
  { id: 'other', name: 'Other' },
];

const SEVERITY_LEVELS: { id: SeverityLevel; name: string; color: string }[] = [
  { id: 'near_miss', name: 'Near-Miss - No Contact', color: '#3B82F6' },
  { id: 'minor', name: 'Minor - No Injuries, Minor Damage', color: '#10B981' },
  { id: 'moderate', name: 'Moderate - Minor Injury/Damage', color: '#F59E0B' },
  { id: 'serious', name: 'Serious - Medical Treatment Required', color: '#F97316' },
  { id: 'severe', name: 'Severe - Hospitalization/Major Damage', color: '#EF4444' },
];

const DEPARTMENTS = [
  'Production', 'Warehouse', 'Shipping', 'Receiving', 'Maintenance',
  'Quality', 'Sanitation', 'Transportation', 'Facilities', 'Other'
];

const LOCATIONS = [
  'Warehouse', 'Loading Dock', 'Production Floor', 'Parking Lot', 'Shipping Yard',
  'Cold Storage', 'Staging Area', 'Receiving Bay', 'Exterior Road', 'Other'
];

const initialFormData: VehicleIncidentFormData = {
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  location: '',
  specific_location: '',
  department: '',
  vehicle_type: '',
  vehicle_id: '',
  operator_name: '',
  operator_id: '',
  operator_certified: true,
  certification_date: '',
  incident_type: '',
  severity: '',
  description: '',
  injuries_occurred: false,
  injury_details: '',
  property_damage: false,
  damage_details: '',
  estimated_cost: '',
  witnesses: '',
  pre_shift_completed: true,
  speed_appropriate: true,
  load_secured: true,
  visibility_adequate: true,
  contributing_factors: '',
  immediate_actions: '',
  corrective_actions: '',
  photos_attached: false,
  police_notified: false,
  police_report_number: '',
  notes: '',
};

export default function VehicleIncidentScreen() {
  const { colors } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<VehicleIncidentFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showVehicleTypePicker, setShowVehicleTypePicker] = useState(false);
  const [showIncidentTypePicker, setShowIncidentTypePicker] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);

  const { data: incidents = [], isLoading, refetch } = useVehicleIncidents();
  const createMutation = useCreateVehicleIncident();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateFormData = useCallback((key: keyof VehicleIncidentFormData, value: VehicleIncidentFormData[keyof VehicleIncidentFormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const matchesSearch = !searchQuery ||
        incident.report_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.operator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incidents, searchQuery]);

  const canSubmit = formData.operator_name.trim().length > 0 &&
    formData.department &&
    formData.location &&
    formData.vehicle_type &&
    formData.vehicle_id.trim().length > 0 &&
    formData.incident_type &&
    formData.severity &&
    formData.description.trim().length > 10 &&
    formData.immediate_actions.trim().length > 5;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields.');
      return;
    }

    Alert.alert(
      'Submit for Approval',
      'This vehicle incident report will be submitted for approval. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await createMutation.mutateAsync(formData);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Vehicle incident report submitted for approval.');
              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[VehicleIncident] Submit error:', error);
              Alert.alert('Error', 'Failed to submit report. Please try again.');
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
      case 'approved': return '#10B981';
      case 'pending_approval': return '#F59E0B';
      case 'rejected': return '#EF4444';
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
        <View style={[styles.iconContainer, { backgroundColor: '#14B8A620' }]}>
          <Truck size={32} color="#14B8A6" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Vehicle/Forklift Incident</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Report vehicle or powered equipment incidents
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}>
        <AlertTriangle size={18} color="#EF4444" />
        <Text style={[styles.infoText, { color: '#EF4444' }]}>
          All vehicle incidents must be reported immediately. Serious incidents require immediate supervisor notification.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Incident Information *</Text>

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
        placeholder="Specific location details"
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

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Vehicle Information *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Vehicle Type *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowVehicleTypePicker(true)}
      >
        <Truck size={18} color={formData.vehicle_type ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.vehicle_type ? colors.text : colors.textSecondary }]}>
          {formData.vehicle_type 
            ? `${VEHICLE_TYPES.find(v => v.id === formData.vehicle_type)?.icon} ${VEHICLE_TYPES.find(v => v.id === formData.vehicle_type)?.name}`
            : 'Select vehicle type'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Vehicle ID/Number *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Gauge size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Equipment ID or license plate"
          placeholderTextColor={colors.textSecondary}
          value={formData.vehicle_id}
          onChangeText={(text) => updateFormData('vehicle_id', text)}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Operator Information *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Operator Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Full name of operator"
          placeholderTextColor={colors.textSecondary}
          value={formData.operator_name}
          onChangeText={(text) => updateFormData('operator_name', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Employee ID</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Operator's employee ID"
        placeholderTextColor={colors.textSecondary}
        value={formData.operator_id}
        onChangeText={(text) => updateFormData('operator_id', text)}
      />

      <Pressable
        style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('operator_certified', !formData.operator_certified);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.operator_certified ? '#10B981' : '#EF4444', backgroundColor: formData.operator_certified ? '#10B981' : '#EF4444' }]}>
          {formData.operator_certified ? <Check size={14} color="#fff" /> : <X size={14} color="#fff" />}
        </View>
        <View style={styles.toggleContent}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Operator Certified</Text>
          <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
            {formData.operator_certified ? 'Operator has valid certification' : 'Operator NOT certified'}
          </Text>
        </View>
      </Pressable>

      {formData.operator_certified && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Certification date (YYYY-MM-DD)"
          placeholderTextColor={colors.textSecondary}
          value={formData.certification_date}
          onChangeText={(text) => updateFormData('certification_date', text)}
        />
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Incident Details *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Incident Type *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowIncidentTypePicker(true)}
      >
        <AlertTriangle size={18} color={formData.incident_type ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.incident_type ? colors.text : colors.textSecondary }]}>
          {formData.incident_type 
            ? INCIDENT_TYPES.find(i => i.id === formData.incident_type)?.name
            : 'Select incident type'}
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

      <Text style={[styles.label, { color: colors.textSecondary }]}>Description *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe what happened in detail..."
        placeholderTextColor={colors.textSecondary}
        value={formData.description}
        onChangeText={(text) => updateFormData('description', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Injuries & Damage</Text>

      <Pressable
        style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('injuries_occurred', !formData.injuries_occurred);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.injuries_occurred ? '#EF4444' : colors.border, backgroundColor: formData.injuries_occurred ? '#EF4444' : 'transparent' }]}>
          {formData.injuries_occurred && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.toggleContent}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Injuries Occurred</Text>
          <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>Someone was injured in this incident</Text>
        </View>
      </Pressable>

      {formData.injuries_occurred && (
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Describe injuries and persons affected..."
          placeholderTextColor={colors.textSecondary}
          value={formData.injury_details}
          onChangeText={(text) => updateFormData('injury_details', text)}
          multiline
          numberOfLines={3}
        />
      )}

      <Pressable
        style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('property_damage', !formData.property_damage);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.property_damage ? '#F59E0B' : colors.border, backgroundColor: formData.property_damage ? '#F59E0B' : 'transparent' }]}>
          {formData.property_damage && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.toggleContent}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Property Damage</Text>
          <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>Equipment, facility, or product was damaged</Text>
        </View>
      </Pressable>

      {formData.property_damage && (
        <>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Describe damage to vehicles, equipment, or property..."
            placeholderTextColor={colors.textSecondary}
            value={formData.damage_details}
            onChangeText={(text) => updateFormData('damage_details', text)}
            multiline
            numberOfLines={3}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Estimated repair cost ($)"
            placeholderTextColor={colors.textSecondary}
            value={formData.estimated_cost}
            onChangeText={(text) => updateFormData('estimated_cost', text)}
          />
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Safety Compliance Check</Text>

      <View style={styles.complianceGrid}>
        <Pressable
          style={[styles.complianceItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('pre_shift_completed', !formData.pre_shift_completed);
          }}
        >
          <View style={[styles.miniCheckbox, { borderColor: formData.pre_shift_completed ? '#10B981' : '#EF4444', backgroundColor: formData.pre_shift_completed ? '#10B981' : '#EF4444' }]}>
            {formData.pre_shift_completed ? <Check size={10} color="#fff" /> : <X size={10} color="#fff" />}
          </View>
          <Text style={[styles.complianceText, { color: colors.text }]}>Pre-Shift Inspection</Text>
        </Pressable>

        <Pressable
          style={[styles.complianceItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('speed_appropriate', !formData.speed_appropriate);
          }}
        >
          <View style={[styles.miniCheckbox, { borderColor: formData.speed_appropriate ? '#10B981' : '#EF4444', backgroundColor: formData.speed_appropriate ? '#10B981' : '#EF4444' }]}>
            {formData.speed_appropriate ? <Check size={10} color="#fff" /> : <X size={10} color="#fff" />}
          </View>
          <Text style={[styles.complianceText, { color: colors.text }]}>Speed Appropriate</Text>
        </Pressable>

        <Pressable
          style={[styles.complianceItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('load_secured', !formData.load_secured);
          }}
        >
          <View style={[styles.miniCheckbox, { borderColor: formData.load_secured ? '#10B981' : '#EF4444', backgroundColor: formData.load_secured ? '#10B981' : '#EF4444' }]}>
            {formData.load_secured ? <Check size={10} color="#fff" /> : <X size={10} color="#fff" />}
          </View>
          <Text style={[styles.complianceText, { color: colors.text }]}>Load Secured</Text>
        </Pressable>

        <Pressable
          style={[styles.complianceItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('visibility_adequate', !formData.visibility_adequate);
          }}
        >
          <View style={[styles.miniCheckbox, { borderColor: formData.visibility_adequate ? '#10B981' : '#EF4444', backgroundColor: formData.visibility_adequate ? '#10B981' : '#EF4444' }]}>
            {formData.visibility_adequate ? <Check size={10} color="#fff" /> : <X size={10} color="#fff" />}
          </View>
          <Text style={[styles.complianceText, { color: colors.text }]}>Visibility Adequate</Text>
        </Pressable>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Contributing Factors</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="What factors contributed to this incident..."
        placeholderTextColor={colors.textSecondary}
        value={formData.contributing_factors}
        onChangeText={(text) => updateFormData('contributing_factors', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Response & Actions</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Immediate Actions Taken *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="What actions were taken immediately after the incident..."
        placeholderTextColor={colors.textSecondary}
        value={formData.immediate_actions}
        onChangeText={(text) => updateFormData('immediate_actions', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Recommended Corrective Actions</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Actions to prevent recurrence..."
        placeholderTextColor={colors.textSecondary}
        value={formData.corrective_actions}
        onChangeText={(text) => updateFormData('corrective_actions', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Witnesses</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Users size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Names of witnesses (comma-separated)"
          placeholderTextColor={colors.textSecondary}
          value={formData.witnesses}
          onChangeText={(text) => updateFormData('witnesses', text)}
        />
      </View>

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
          <Camera size={16} color={colors.textSecondary} />
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Photos</Text>
        </Pressable>
        <Pressable
          style={[styles.checkboxItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateFormData('police_notified', !formData.police_notified);
          }}
        >
          <View style={[styles.checkbox, { borderColor: formData.police_notified ? '#3B82F6' : colors.border, backgroundColor: formData.police_notified ? '#3B82F6' : 'transparent' }]}>
            {formData.police_notified && <Check size={12} color="#fff" />}
          </View>
          <Shield size={16} color={colors.textSecondary} />
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Police</Text>
        </Pressable>
      </View>

      {formData.police_notified && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Police report number"
          placeholderTextColor={colors.textSecondary}
          value={formData.police_report_number}
          onChangeText={(text) => updateFormData('police_report_number', text)}
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
          style={[styles.submitButton, { backgroundColor: canSubmit ? '#14B8A6' : colors.border }]}
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
          placeholder="Search incidents..."
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
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Vehicle Incident Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: colors.primary }]}>{incidents.length}</Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: '#F59E0B' }]}>
              {incidents.filter(i => i.status === 'pending_approval').length}
            </Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>
              {incidents.filter(i => i.status === 'approved').length}
            </Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Approved</Text>
          </View>
        </View>
      </View>

      {isLoading && incidents.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredIncidents.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Truck size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Incidents Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Vehicle incidents will appear here
          </Text>
        </View>
      ) : (
        filteredIncidents.map(incident => {
          const isExpanded = expandedIncident === incident.id;
          const vehicleType = VEHICLE_TYPES.find(v => v.id === incident.vehicle_type);
          const severity = SEVERITY_LEVELS.find(s => s.id === incident.severity);
          
          return (
            <Pressable
              key={incident.id}
              style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedIncident(isExpanded ? null : incident.id);
              }}
            >
              <View style={styles.historyHeader}>
                <View style={styles.historyHeaderLeft}>
                  <View style={[styles.vehicleIcon, { backgroundColor: '#14B8A620' }]}>
                    <Text style={styles.vehicleIconText}>{vehicleType?.icon || '🚜'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.historyNumber, { color: colors.text }]}>{incident.report_number}</Text>
                    <Text style={[styles.historyOperator, { color: colors.textSecondary }]}>{incident.operator_name}</Text>
                  </View>
                </View>
                <View style={styles.historyHeaderRight}>
                  <View style={[styles.severityBadge, { backgroundColor: severity?.color + '20' }]}>
                    <Text style={[styles.severityText, { color: severity?.color }]}>
                      {incident.severity.replace('_', ' ').toUpperCase()}
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
                {incident.description}
              </Text>

              <View style={styles.historyMeta}>
                <View style={styles.historyMetaItem}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{incident.date}</Text>
                </View>
                <View style={styles.historyMetaItem}>
                  <Truck size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{incident.vehicle_id}</Text>
                </View>
                <View style={styles.historyMetaItem}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{incident.location}</Text>
                </View>
              </View>

              {isExpanded && (
                <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Incident Type</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>
                      {INCIDENT_TYPES.find(i => i.id === incident.incident_type)?.name}
                    </Text>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Vehicle</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>
                      {vehicleType?.name} - {incident.vehicle_id}
                    </Text>
                  </View>
                  {incident.injuries_occurred && (
                    <View style={[styles.alertBox, { backgroundColor: '#EF444415' }]}>
                      <Text style={[styles.expandedLabel, { color: '#EF4444' }]}>Injuries Occurred</Text>
                      <Text style={[styles.expandedText, { color: colors.text }]}>{incident.injury_details}</Text>
                    </View>
                  )}
                  {incident.property_damage && (
                    <View style={[styles.alertBox, { backgroundColor: '#F59E0B15' }]}>
                      <Text style={[styles.expandedLabel, { color: '#F59E0B' }]}>Property Damage</Text>
                      <Text style={[styles.expandedText, { color: colors.text }]}>{incident.damage_details}</Text>
                      {incident.estimated_cost && (
                        <Text style={[styles.expandedText, { color: colors.text }]}>Est. Cost: {incident.estimated_cost}</Text>
                      )}
                    </View>
                  )}
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Immediate Actions</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{incident.immediate_actions}</Text>
                  </View>
                  <View style={[styles.approvalStatus, { backgroundColor: getStatusColor(incident.status) + '15' }]}>
                    <Text style={[styles.approvalStatusText, { color: getStatusColor(incident.status) }]}>
                      Status: {incident.status.replace('_', ' ').toUpperCase()}
                    </Text>
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
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: '#14B8A6', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('new')}
        >
          <Plus size={18} color={activeTab === 'new' ? '#14B8A6' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#14B8A6' : colors.textSecondary }]}>New Report</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#14B8A6', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? '#14B8A6' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#14B8A6' : colors.textSecondary }]}>
            History ({incidents.length})
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

      <Modal visible={showVehicleTypePicker} transparent animationType="slide" onRequestClose={() => setShowVehicleTypePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Vehicle Type</Text>
              <Pressable onPress={() => setShowVehicleTypePicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {VEHICLE_TYPES.map(type => (
                <Pressable
                  key={type.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.vehicle_type === type.id && { backgroundColor: '#14B8A610' }]}
                  onPress={() => { updateFormData('vehicle_type', type.id); setShowVehicleTypePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={styles.vehicleEmoji}>{type.icon}</Text>
                  <Text style={[styles.modalOptionText, { color: formData.vehicle_type === type.id ? '#14B8A6' : colors.text }]}>{type.name}</Text>
                  {formData.vehicle_type === type.id && <Check size={18} color="#14B8A6" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showIncidentTypePicker} transparent animationType="slide" onRequestClose={() => setShowIncidentTypePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Incident Type</Text>
              <Pressable onPress={() => setShowIncidentTypePicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {INCIDENT_TYPES.map(type => (
                <Pressable
                  key={type.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.incident_type === type.id && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { updateFormData('incident_type', type.id); setShowIncidentTypePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.modalOptionText, { color: formData.incident_type === type.id ? colors.primary : colors.text }]}>{type.name}</Text>
                  {formData.incident_type === type.id && <Check size={18} color={colors.primary} />}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  tabBar: { flexDirection: 'row' as const, borderBottomWidth: 1 },
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
  selectorText: { flex: 1, fontSize: 15 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 15, marginBottom: 12 },
  inputWithIcon: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 50, gap: 10, marginBottom: 12 },
  inputField: { flex: 1, fontSize: 15, height: '100%' },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12, textAlignVertical: 'top' as const, minHeight: 90 },
  toggleOption: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  toggleContent: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: '600' as const },
  toggleSubtitle: { fontSize: 12, marginTop: 2 },
  complianceGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 12 },
  complianceItem: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, gap: 8, width: '48%' },
  miniCheckbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  complianceText: { fontSize: 12, fontWeight: '500' as const },
  checkboxRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 12 },
  checkboxItem: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  checkboxLabel: { fontSize: 13, fontWeight: '500' as const },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 16 },
  resetButton: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  resetButtonText: { fontSize: 16, fontWeight: '600' as const },
  submitButton: { flex: 2, height: 50, borderRadius: 12, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  bottomPadding: { height: 40 },
  searchContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46, gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15 },
  summaryCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  summaryTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 12 },
  summaryStats: { flexDirection: 'row' as const, alignItems: 'center' as const },
  summaryStatItem: { flex: 1, alignItems: 'center' as const },
  summaryStatValue: { fontSize: 24, fontWeight: '700' as const },
  summaryStatLabel: { fontSize: 12, marginTop: 4 },
  summaryDivider: { width: 1, height: 32 },
  loadingContainer: { padding: 40, alignItems: 'center' as const },
  emptyState: { borderRadius: 12, padding: 40, alignItems: 'center' as const, borderWidth: 1 },
  emptyTitle: { fontSize: 17, fontWeight: '600' as const, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' as const },
  historyCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  historyHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, marginBottom: 10 },
  historyHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  historyHeaderRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  vehicleIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  vehicleIconText: { fontSize: 22 },
  historyNumber: { fontSize: 15, fontWeight: '700' as const },
  historyOperator: { fontSize: 13, marginTop: 2 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: '700' as const },
  historyDescription: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  historyMeta: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
  historyMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  historyMetaText: { fontSize: 12 },
  expandedContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  expandedSection: { marginBottom: 10 },
  expandedLabel: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, marginBottom: 4 },
  expandedText: { fontSize: 14, lineHeight: 20 },
  alertBox: { padding: 12, borderRadius: 8, marginBottom: 10 },
  approvalStatus: { padding: 10, borderRadius: 8 },
  approvalStatusText: { fontSize: 12, fontWeight: '600' as const, textAlign: 'center' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' as const },
  modalList: { padding: 8 },
  modalOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1, gap: 12 },
  modalOptionText: { flex: 1, fontSize: 15 },
  vehicleEmoji: { fontSize: 22 },
  severityDot: { width: 14, height: 14, borderRadius: 7 },
});
