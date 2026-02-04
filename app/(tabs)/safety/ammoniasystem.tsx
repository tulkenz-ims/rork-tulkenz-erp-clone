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
  Snowflake,
  Calendar,
  MapPin,
  User,
  X,
  Check,
  ChevronDown,
  History,
  AlertTriangle,
  ChevronRight,
  Eye,
  Building2,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  ClipboardCheck,
  Wind,
  Gauge,
  Shield,
  ThermometerSun,
  Wrench,
  Bell,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

type InspectionStatus = 'pass' | 'fail' | 'na';

interface SystemType {
  id: string;
  name: string;
  description: string;
  color: string;
}

const SYSTEM_TYPES: SystemType[] = [
  { id: 'compressor', name: 'Compressor', description: 'Ammonia compression unit', color: '#06B6D4' },
  { id: 'condenser', name: 'Condenser', description: 'Heat rejection unit', color: '#3B82F6' },
  { id: 'evaporator', name: 'Evaporator', description: 'Cooling coil/unit cooler', color: '#8B5CF6' },
  { id: 'receiver', name: 'Receiver', description: 'Liquid ammonia storage', color: '#F59E0B' },
  { id: 'piping', name: 'Piping System', description: 'Ammonia piping and valves', color: '#10B981' },
  { id: 'engine_room', name: 'Engine Room', description: 'Complete engine room inspection', color: '#EC4899' },
];

const LOCATIONS = [
  { id: 'engine_room', name: 'Engine Room' },
  { id: 'roof', name: 'Roof/Outdoor' },
  { id: 'freezer', name: 'Freezer Area' },
  { id: 'cooler', name: 'Cooler Area' },
  { id: 'dock', name: 'Loading Dock' },
  { id: 'production', name: 'Production Floor' },
  { id: 'other', name: 'Other' },
];

interface InspectionCheckItem {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  critical: boolean;
  category: string;
}

const INSPECTION_CHECKS: InspectionCheckItem[] = [
  {
    id: 'ammonia_odor',
    name: 'Ammonia Odor Check',
    description: 'No ammonia smell detected in area',
    icon: Wind,
    critical: true,
    category: 'Leak Detection',
  },
  {
    id: 'detector_status',
    name: 'Ammonia Detectors',
    description: 'All ammonia detectors operational, no alarms',
    icon: Bell,
    critical: true,
    category: 'Leak Detection',
  },
  {
    id: 'visual_leaks',
    name: 'Visual Leak Inspection',
    description: 'No visible oil stains or frost indicating leaks',
    icon: Eye,
    critical: true,
    category: 'Leak Detection',
  },
  {
    id: 'pressure_gauges',
    name: 'Pressure Gauges',
    description: 'All gauges within normal operating range',
    icon: Gauge,
    critical: true,
    category: 'Operating Parameters',
  },
  {
    id: 'temperature_readings',
    name: 'Temperature Readings',
    description: 'Temperatures within normal operating range',
    icon: ThermometerSun,
    critical: true,
    category: 'Operating Parameters',
  },
  {
    id: 'oil_levels',
    name: 'Oil Levels',
    description: 'Compressor oil levels adequate',
    icon: Gauge,
    critical: false,
    category: 'Operating Parameters',
  },
  {
    id: 'relief_valves',
    name: 'Relief Valves',
    description: 'Relief valves unobstructed, caps in place',
    icon: Shield,
    critical: true,
    category: 'Safety Equipment',
  },
  {
    id: 'ventilation',
    name: 'Ventilation System',
    description: 'Engine room ventilation operational',
    icon: Wind,
    critical: true,
    category: 'Safety Equipment',
  },
  {
    id: 'emergency_shutoffs',
    name: 'Emergency Shutoffs',
    description: 'Emergency stop buttons accessible and labeled',
    icon: AlertTriangle,
    critical: true,
    category: 'Safety Equipment',
  },
  {
    id: 'scba_equipment',
    name: 'SCBA/Rescue Equipment',
    description: 'SCBA, suits, and rescue equipment in place',
    icon: Shield,
    critical: true,
    category: 'Safety Equipment',
  },
  {
    id: 'eyewash_shower',
    name: 'Eyewash/Safety Shower',
    description: 'Emergency eyewash and shower accessible',
    icon: Shield,
    critical: true,
    category: 'Safety Equipment',
  },
  {
    id: 'piping_insulation',
    name: 'Piping & Insulation',
    description: 'Piping and insulation in good condition',
    icon: Wrench,
    critical: false,
    category: 'Physical Condition',
  },
  {
    id: 'valve_condition',
    name: 'Valve Condition',
    description: 'Valves labeled, handles present, stems not leaking',
    icon: Wrench,
    critical: true,
    category: 'Physical Condition',
  },
  {
    id: 'housekeeping',
    name: 'Housekeeping',
    description: 'Area clean, no obstructions to equipment',
    icon: Eye,
    critical: false,
    category: 'Physical Condition',
  },
  {
    id: 'signage',
    name: 'Warning Signage',
    description: 'Ammonia warning signs posted and visible',
    icon: AlertTriangle,
    critical: false,
    category: 'Documentation',
  },
  {
    id: 'p_and_id',
    name: 'P&ID Available',
    description: 'Current P&ID diagram posted in engine room',
    icon: FileText,
    critical: false,
    category: 'Documentation',
  },
];

interface InspectionFormData {
  systemId: string;
  systemType: string;
  location: string;
  specificLocation: string;
  date: string;
  inspectorName: string;
  highSidePressure: string;
  lowSidePressure: string;
  suctionTemp: string;
  dischargeTemp: string;
  checks: Record<string, InspectionStatus>;
  notes: string;
  deficienciesFound: string;
  actionTaken: string;
}

interface InspectionRecord {
  id: string;
  systemId: string;
  systemType: string;
  location: string;
  date: string;
  inspectorName: string;
  result: 'pass' | 'fail';
  failedChecks: number;
  createdAt: string;
}

const initialFormData: InspectionFormData = {
  systemId: '',
  systemType: '',
  location: '',
  specificLocation: '',
  date: new Date().toISOString().split('T')[0],
  inspectorName: '',
  highSidePressure: '',
  lowSidePressure: '',
  suctionTemp: '',
  dischargeTemp: '',
  checks: {},
  notes: '',
  deficienciesFound: '',
  actionTaken: '',
};

export default function AmmoniaSystemScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'inspect' | 'history'>('inspect');
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState<InspectionFormData>(initialFormData);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const [inspectionHistory, setInspectionHistory] = useState<InspectionRecord[]>([
    {
      id: '1',
      systemId: 'COMP-1',
      systemType: 'compressor',
      location: 'Engine Room',
      date: '2024-01-15',
      inspectorName: 'John Smith',
      result: 'pass',
      failedChecks: 0,
      createdAt: '2024-01-15T06:00:00Z',
    },
    {
      id: '2',
      systemId: 'EVAP-3',
      systemType: 'evaporator',
      location: 'Freezer Area',
      date: '2024-01-14',
      inspectorName: 'Jane Doe',
      result: 'fail',
      failedChecks: 1,
      createdAt: '2024-01-14T06:30:00Z',
    },
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const updateFormData = useCallback((key: keyof InspectionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const setCheckStatus = useCallback((checkId: string, status: InspectionStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData(prev => ({
      ...prev,
      checks: { ...prev.checks, [checkId]: status },
    }));
  }, []);

  const inspectionStats = useMemo(() => {
    const checks = formData.checks;
    const total = INSPECTION_CHECKS.length;
    const completed = Object.keys(checks).length;
    const passed = Object.values(checks).filter(s => s === 'pass').length;
    const failed = Object.values(checks).filter(s => s === 'fail').length;
    const criticalFailed = INSPECTION_CHECKS.filter(c => c.critical && checks[c.id] === 'fail').length;
    return { total, completed, passed, failed, criticalFailed };
  }, [formData.checks]);

  const overallResult = useMemo(() => {
    if (inspectionStats.completed < inspectionStats.total) return 'incomplete';
    if (inspectionStats.criticalFailed > 0) return 'fail';
    if (inspectionStats.failed > 2) return 'fail';
    return 'pass';
  }, [inspectionStats]);

  const canSubmit = formData.systemId.trim().length > 0 &&
    formData.systemType &&
    formData.location &&
    formData.inspectorName.trim().length > 0 &&
    inspectionStats.completed === inspectionStats.total;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete all required fields and all inspection checks');
      return;
    }

    if (overallResult === 'fail') {
      Alert.alert(
        'System Failed Inspection',
        'Critical safety items have failed. Immediate action required per PSM requirements. Notify maintenance and safety immediately.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit & Escalate', style: 'destructive', onPress: () => submitInspection() },
        ]
      );
    } else {
      Alert.alert('Submit Inspection', 'Ammonia system passed inspection.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => submitInspection() },
      ]);
    }
  }, [canSubmit, overallResult]);

  const submitInspection = async () => {
    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const newRecord: InspectionRecord = {
        id: Date.now().toString(),
        systemId: formData.systemId,
        systemType: formData.systemType,
        location: LOCATIONS.find(l => l.id === formData.location)?.name || formData.location,
        date: formData.date,
        inspectorName: formData.inspectorName,
        result: overallResult === 'pass' ? 'pass' : 'fail',
        failedChecks: inspectionStats.failed,
        createdAt: new Date().toISOString(),
      };
      setInspectionHistory(prev => [newRecord, ...prev]);
      Haptics.notificationAsync(overallResult === 'pass' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        overallResult === 'pass' ? 'Inspection Passed' : 'Inspection Failed - Escalated',
        overallResult === 'pass' ? 'System operating within safe parameters.' : 'Safety and maintenance have been notified.'
      );
      setFormData(initialFormData);
      setActiveTab('history');
    } catch (error) {
      console.error('[AmmoniaSystem] Submit error:', error);
      Alert.alert('Error', 'Failed to submit inspection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = useCallback(() => {
    if (Object.keys(formData.checks).length > 0 || formData.systemId) {
      Alert.alert('Clear Form', 'Are you sure you want to clear all entries?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setFormData(initialFormData) },
      ]);
    } else {
      setFormData(initialFormData);
    }
  }, [formData]);

  const getTypeColor = (typeId: string) => SYSTEM_TYPES.find(t => t.id === typeId)?.color || colors.textSecondary;

  const groupedChecks = useMemo(() => {
    const groups: Record<string, InspectionCheckItem[]> = {};
    INSPECTION_CHECKS.forEach(check => {
      if (!groups[check.category]) groups[check.category] = [];
      groups[check.category].push(check);
    });
    return groups;
  }, []);

  const renderInspectTab = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} keyboardShouldPersistTaps="handled">
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#06B6D420' }]}>
          <Snowflake size={32} color="#06B6D4" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Ammonia System Inspection</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Weekly PSM compliance inspection for ammonia refrigeration systems</Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}>
        <AlertTriangle size={18} color="#EF4444" />
        <Text style={[styles.infoText, { color: '#991B1B' }]}>OSHA PSM and EPA RMP require regular inspections. Report any ammonia odor or leak immediately.</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Equipment ID *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Hash size={18} color={colors.textSecondary} />
        <TextInput style={[styles.inputField, { color: colors.text }]} placeholder="e.g., COMP-1, EVAP-3" placeholderTextColor={colors.textSecondary} value={formData.systemId} onChangeText={(text) => updateFormData('systemId', text)} />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Equipment Type *</Text>
      <Pressable style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowTypePicker(true)}>
        {formData.systemType ? (
          <>
            <View style={[styles.typeDot, { backgroundColor: getTypeColor(formData.systemType) }]} />
            <Text style={[styles.selectorText, { color: colors.text }]}>{SYSTEM_TYPES.find(t => t.id === formData.systemType)?.name}</Text>
          </>
        ) : (
          <>
            <Snowflake size={18} color={colors.textSecondary} />
            <Text style={[styles.selectorText, { color: colors.textSecondary }]}>Select equipment type</Text>
          </>
        )}
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Location *</Text>
          <Pressable style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowLocationPicker(true)}>
            <MapPin size={18} color={formData.location ? colors.primary : colors.textSecondary} />
            <Text style={[styles.selectorText, { color: formData.location ? colors.text : colors.textSecondary }]} numberOfLines={1}>{formData.location ? LOCATIONS.find(l => l.id === formData.location)?.name : 'Select'}</Text>
            <ChevronDown size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date *</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput style={[styles.dateInput, { color: colors.text }]} value={formData.date} onChangeText={(text) => updateFormData('date', text)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} />
          </View>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Inspector Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput style={[styles.inputField, { color: colors.text }]} placeholder="Your full name" placeholderTextColor={colors.textSecondary} value={formData.inspectorName} onChangeText={(text) => updateFormData('inspectorName', text)} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Operating Parameters</Text>
      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>High Side Pressure</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="PSI" placeholderTextColor={colors.textSecondary} value={formData.highSidePressure} onChangeText={(text) => updateFormData('highSidePressure', text)} keyboardType="numeric" />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Low Side Pressure</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="PSI" placeholderTextColor={colors.textSecondary} value={formData.lowSidePressure} onChangeText={(text) => updateFormData('lowSidePressure', text)} keyboardType="numeric" />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Suction Temp</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="°F" placeholderTextColor={colors.textSecondary} value={formData.suctionTemp} onChangeText={(text) => updateFormData('suctionTemp', text)} keyboardType="numeric" />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Discharge Temp</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="°F" placeholderTextColor={colors.textSecondary} value={formData.dischargeTemp} onChangeText={(text) => updateFormData('dischargeTemp', text)} keyboardType="numeric" />
        </View>
      </View>

      <View style={styles.checksHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Inspection Checklist</Text>
        <View style={[styles.progressBadge, { backgroundColor: colors.surface }]}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>{inspectionStats.completed}/{inspectionStats.total}</Text>
        </View>
      </View>

      <View style={[styles.checklistStats, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.checkStatItem}>
          <CheckCircle size={16} color="#10B981" />
          <Text style={[styles.checkStatValue, { color: '#10B981' }]}>{inspectionStats.passed}</Text>
          <Text style={[styles.checkStatLabel, { color: colors.textSecondary }]}>Pass</Text>
        </View>
        <View style={styles.checkStatItem}>
          <XCircle size={16} color="#EF4444" />
          <Text style={[styles.checkStatValue, { color: '#EF4444' }]}>{inspectionStats.failed}</Text>
          <Text style={[styles.checkStatLabel, { color: colors.textSecondary }]}>Fail</Text>
        </View>
        <View style={styles.checkStatItem}>
          <AlertCircle size={16} color="#64748B" />
          <Text style={[styles.checkStatValue, { color: '#64748B' }]}>{Object.values(formData.checks).filter(s => s === 'na').length}</Text>
          <Text style={[styles.checkStatLabel, { color: colors.textSecondary }]}>N/A</Text>
        </View>
      </View>

      {Object.entries(groupedChecks).map(([category, checks]) => (
        <View key={category}>
          <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>{category}</Text>
          {checks.map((check) => {
            const CheckIcon = check.icon;
            const status = formData.checks[check.id];
            return (
              <View key={check.id} style={[styles.checkCard, { backgroundColor: colors.surface, borderColor: colors.border }, status === 'fail' && { borderColor: '#EF444440' }, status === 'pass' && { borderColor: '#10B98140' }]}>
                <View style={styles.checkHeader}>
                  <View style={styles.checkTitleRow}>
                    <View style={[styles.checkIconContainer, { backgroundColor: colors.background }]}>
                      <CheckIcon size={18} color={colors.textSecondary} />
                    </View>
                    <View style={styles.checkTitleContent}>
                      <View style={styles.checkTitleWithBadge}>
                        <Text style={[styles.checkTitle, { color: colors.text }]}>{check.name}</Text>
                        {check.critical && (<View style={[styles.criticalBadge, { backgroundColor: '#EF444420' }]}><Text style={styles.criticalText}>Critical</Text></View>)}
                      </View>
                      <Text style={[styles.checkDescription, { color: colors.textSecondary }]}>{check.description}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.checkButtons}>
                  <Pressable style={[styles.checkButton, { borderColor: colors.border }, status === 'pass' && { backgroundColor: '#10B98120', borderColor: '#10B981' }]} onPress={() => setCheckStatus(check.id, 'pass')}>
                    <CheckCircle size={18} color={status === 'pass' ? '#10B981' : colors.textSecondary} />
                    <Text style={[styles.checkButtonText, { color: status === 'pass' ? '#10B981' : colors.textSecondary }]}>Pass</Text>
                  </Pressable>
                  <Pressable style={[styles.checkButton, { borderColor: colors.border }, status === 'fail' && { backgroundColor: '#EF444420', borderColor: '#EF4444' }]} onPress={() => setCheckStatus(check.id, 'fail')}>
                    <XCircle size={18} color={status === 'fail' ? '#EF4444' : colors.textSecondary} />
                    <Text style={[styles.checkButtonText, { color: status === 'fail' ? '#EF4444' : colors.textSecondary }]}>Fail</Text>
                  </Pressable>
                  <Pressable style={[styles.checkButton, styles.checkButtonSmall, { borderColor: colors.border }, status === 'na' && { backgroundColor: '#64748B20', borderColor: '#64748B' }]} onPress={() => setCheckStatus(check.id, 'na')}>
                    <Text style={[styles.checkButtonText, { color: status === 'na' ? '#64748B' : colors.textSecondary }]}>N/A</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ))}

      {inspectionStats.failed > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Deficiencies Found</Text>
          <TextInput style={[styles.textArea, { backgroundColor: colors.surface, borderColor: '#EF444440', color: colors.text }]} placeholder="Describe all issues found..." placeholderTextColor={colors.textSecondary} value={formData.deficienciesFound} onChangeText={(text) => updateFormData('deficienciesFound', text)} multiline numberOfLines={3} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Immediate Action Taken</Text>
          <TextInput style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Notified supervisor, evacuated area, work order submitted, etc." placeholderTextColor={colors.textSecondary} value={formData.actionTaken} onChangeText={(text) => updateFormData('actionTaken', text)} multiline numberOfLines={2} />
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Notes</Text>
      <TextInput style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Any additional observations..." placeholderTextColor={colors.textSecondary} value={formData.notes} onChangeText={(text) => updateFormData('notes', text)} multiline numberOfLines={3} />

      {inspectionStats.completed === inspectionStats.total && (
        <View style={[styles.resultCard, { backgroundColor: overallResult === 'pass' ? '#10B98120' : '#EF444420' }, { borderColor: overallResult === 'pass' ? '#10B981' : '#EF4444' }]}>
          {overallResult === 'pass' ? (
            <>
              <CheckCircle size={24} color="#10B981" />
              <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: '#10B981' }]}>SYSTEM OPERATING SAFELY</Text>
                <Text style={[styles.resultSubtitle, { color: '#065F46' }]}>All PSM checks passed</Text>
              </View>
            </>
          ) : (
            <>
              <XCircle size={24} color="#EF4444" />
              <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: '#EF4444' }]}>IMMEDIATE ACTION REQUIRED</Text>
                <Text style={[styles.resultSubtitle, { color: '#991B1B' }]}>Critical safety issue - Notify supervisor</Text>
              </View>
            </>
          )}
        </View>
      )}

      <View style={styles.actionButtons}>
        <Pressable style={[styles.resetButton, { borderColor: colors.border }]} onPress={resetForm}>
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable style={[styles.submitButton, { backgroundColor: canSubmit ? '#06B6D4' : colors.border }]} onPress={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <ClipboardCheck size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Inspection</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      {inspectionHistory.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Snowflake size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Inspection Records</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Complete your first inspection to see history</Text>
        </View>
      ) : (
        <>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Inspection Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: colors.primary }]}>{inspectionHistory.length}</Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Total</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>{inspectionHistory.filter(r => r.result === 'pass').length}</Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Passed</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#EF4444' }]}>{inspectionHistory.filter(r => r.result === 'fail').length}</Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Failed</Text>
              </View>
            </View>
          </View>
          {inspectionHistory.map((record) => {
            const isExpanded = expandedRecord === record.id;
            const systemType = SYSTEM_TYPES.find(t => t.id === record.systemType);
            return (
              <Pressable key={record.id} style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }, record.result === 'fail' && { borderLeftColor: '#EF4444', borderLeftWidth: 3 }, record.result === 'pass' && { borderLeftColor: '#10B981', borderLeftWidth: 3 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedRecord(isExpanded ? null : record.id); }}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyHeaderLeft}>
                    <View style={[styles.systemIcon, { backgroundColor: (systemType?.color || '#06B6D4') + '20' }]}>
                      <Snowflake size={20} color={systemType?.color || '#06B6D4'} />
                    </View>
                    <View>
                      <Text style={[styles.historyId, { color: colors.text }]}>{record.systemId}</Text>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                  </View>
                  <View style={styles.historyHeaderRight}>
                    <View style={[styles.resultBadge, { backgroundColor: record.result === 'pass' ? '#10B98120' : '#EF444420' }]}>
                      {record.result === 'pass' ? <CheckCircle size={14} color="#10B981" /> : <XCircle size={14} color="#EF4444" />}
                      <Text style={[styles.resultBadgeText, { color: record.result === 'pass' ? '#10B981' : '#EF4444' }]}>{record.result.toUpperCase()}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.textSecondary} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
                  </View>
                </View>
                <View style={styles.historyMeta}>
                  <View style={styles.historyMetaItem}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{record.location}</Text>
                  </View>
                  <View style={styles.historyMetaItem}>
                    <User size={14} color={colors.textSecondary} />
                    <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{record.inspectorName}</Text>
                  </View>
                </View>
                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                    <View style={styles.expandedRow}>
                      <View style={styles.expandedItem}>
                        <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Type</Text>
                        <Text style={[styles.expandedValue, { color: colors.text }]}>{systemType?.name || 'N/A'}</Text>
                      </View>
                      <View style={styles.expandedItem}>
                        <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Failed Items</Text>
                        <Text style={[styles.expandedValue, { color: record.failedChecks > 0 ? '#EF4444' : '#10B981' }]}>{record.failedChecks}</Text>
                      </View>
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
        <Pressable style={[styles.tab, activeTab === 'inspect' && { borderBottomColor: '#06B6D4', borderBottomWidth: 2 }]} onPress={() => setActiveTab('inspect')}>
          <ClipboardCheck size={18} color={activeTab === 'inspect' ? '#06B6D4' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'inspect' ? '#06B6D4' : colors.textSecondary }]}>Inspect</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#06B6D4', borderBottomWidth: 2 }]} onPress={() => setActiveTab('history')}>
          <History size={18} color={activeTab === 'history' ? '#06B6D4' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#06B6D4' : colors.textSecondary }]}>History ({inspectionHistory.length})</Text>
        </Pressable>
      </View>
      {activeTab === 'inspect' ? renderInspectTab() : renderHistoryTab()}

      <Modal visible={showTypePicker} transparent animationType="slide" onRequestClose={() => setShowTypePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Equipment Type</Text>
              <Pressable onPress={() => setShowTypePicker(false)} hitSlop={8}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {SYSTEM_TYPES.map((type) => (
                <Pressable key={type.id} style={[styles.typeOption, { borderBottomColor: colors.border }, formData.systemType === type.id && { backgroundColor: type.color + '10' }]} onPress={() => { updateFormData('systemType', type.id); setShowTypePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <View style={[styles.typeOptionDot, { backgroundColor: type.color }]} />
                  <View style={styles.typeOptionContent}>
                    <Text style={[styles.typeOptionName, { color: colors.text }]}>{type.name}</Text>
                    <Text style={[styles.typeOptionDesc, { color: colors.textSecondary }]}>{type.description}</Text>
                  </View>
                  {formData.systemType === type.id && <Check size={18} color={type.color} />}
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
              <Pressable onPress={() => setShowLocationPicker(false)} hitSlop={8}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {LOCATIONS.map((location) => (
                <Pressable key={location.id} style={[styles.modalOption, { borderBottomColor: colors.border }, formData.location === location.id && { backgroundColor: colors.primary + '10' }]} onPress={() => { updateFormData('location', location.id); setShowLocationPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Building2 size={18} color={formData.location === location.id ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.modalOptionText, { color: formData.location === location.id ? colors.primary : colors.text }]}>{location.name}</Text>
                  {formData.location === location.id && <Check size={18} color={colors.primary} />}
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
  tab: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 12, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  headerCard: { borderRadius: 16, padding: 24, alignItems: 'center' as const, borderWidth: 1, marginBottom: 16 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700' as const, marginBottom: 4, textAlign: 'center' as const },
  subtitle: { fontSize: 14, textAlign: 'center' as const },
  infoCard: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 20, gap: 10 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '600' as const, marginBottom: 12, marginTop: 8 },
  categoryTitle: { fontSize: 13, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '500' as const, marginBottom: 6 },
  input: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, marginBottom: 12 },
  textArea: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top' as const, marginBottom: 12 },
  row: { flexDirection: 'row' as const, gap: 12, marginBottom: 12 },
  halfField: { flex: 1 },
  dateField: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, gap: 10 },
  dateInput: { flex: 1, paddingVertical: 14, fontSize: 15 },
  selector: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  selectorText: { flex: 1, fontSize: 15 },
  typeDot: { width: 12, height: 12, borderRadius: 6 },
  inputWithIcon: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12, gap: 10 },
  inputField: { flex: 1, paddingVertical: 14, fontSize: 15 },
  checksHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginTop: 16, marginBottom: 12 },
  progressBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  progressText: { fontSize: 13, fontWeight: '600' as const },
  checklistStats: { flexDirection: 'row' as const, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12, justifyContent: 'space-around' as const },
  checkStatItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  checkStatValue: { fontSize: 16, fontWeight: '700' as const },
  checkStatLabel: { fontSize: 12 },
  checkCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  checkHeader: { marginBottom: 12 },
  checkTitleRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12 },
  checkIconContainer: { width: 36, height: 36, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const },
  checkTitleContent: { flex: 1 },
  checkTitleWithBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, flexWrap: 'wrap' as const },
  checkTitle: { fontSize: 15, fontWeight: '600' as const },
  criticalBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  criticalText: { fontSize: 10, fontWeight: '600' as const, color: '#EF4444' },
  checkDescription: { fontSize: 13, marginTop: 2 },
  checkButtons: { flexDirection: 'row' as const, gap: 8 },
  checkButton: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 10, borderRadius: 8, borderWidth: 1, gap: 6 },
  checkButtonSmall: { flex: 0.6 },
  checkButtonText: { fontSize: 13, fontWeight: '600' as const },
  resultCard: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 16, gap: 12 },
  resultContent: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: '700' as const },
  resultSubtitle: { fontSize: 13, marginTop: 2 },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 20 },
  resetButton: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  resetButtonText: { fontSize: 15, fontWeight: '600' as const },
  submitButton: { flex: 2, flexDirection: 'row' as const, paddingVertical: 14, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  submitButtonText: { fontSize: 15, fontWeight: '600' as const, color: '#fff' },
  bottomPadding: { height: 40 },
  emptyState: { alignItems: 'center' as const, padding: 32, borderRadius: 16, borderWidth: 1 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' as const, marginTop: 8 },
  summaryCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12 },
  summaryStats: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-around' as const },
  summaryStatItem: { alignItems: 'center' as const },
  summaryStatValue: { fontSize: 24, fontWeight: '700' as const },
  summaryStatLabel: { fontSize: 12, marginTop: 2 },
  summaryDivider: { width: 1, height: 32 },
  historyCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  historyHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  historyHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  systemIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  historyId: { fontSize: 15, fontWeight: '600' as const },
  historyDate: { fontSize: 12, marginTop: 2 },
  historyHeaderRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  resultBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  resultBadgeText: { fontSize: 11, fontWeight: '600' as const },
  historyMeta: { flexDirection: 'row' as const, marginTop: 10, gap: 16 },
  historyMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  historyMetaText: { fontSize: 12 },
  expandedContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  expandedRow: { flexDirection: 'row' as const, gap: 16 },
  expandedItem: { flex: 1 },
  expandedLabel: { fontSize: 11, marginBottom: 2 },
  expandedValue: { fontSize: 14, fontWeight: '500' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  modalList: { padding: 8 },
  typeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1, gap: 12 },
  typeOptionDot: { width: 12, height: 12, borderRadius: 6 },
  typeOptionContent: { flex: 1 },
  typeOptionName: { fontSize: 15, fontWeight: '500' as const },
  typeOptionDesc: { fontSize: 12, marginTop: 2 },
  modalOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1, gap: 12 },
  modalOptionText: { flex: 1, fontSize: 15 },
});
