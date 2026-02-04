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
  Cylinder,
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
  Tag,
  Lock,
  Shield,
  Link,
  Flame,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

type InspectionStatus = 'pass' | 'fail' | 'na';

interface GasType {
  id: string;
  name: string;
  description: string;
  color: string;
  hazard: string;
}

const GAS_TYPES: GasType[] = [
  { id: 'oxygen', name: 'Oxygen', description: 'Oxidizer - supports combustion', color: '#3B82F6', hazard: 'Oxidizer' },
  { id: 'acetylene', name: 'Acetylene', description: 'Fuel gas - highly flammable', color: '#EF4444', hazard: 'Flammable' },
  { id: 'argon', name: 'Argon', description: 'Inert shielding gas', color: '#8B5CF6', hazard: 'Inert' },
  { id: 'co2', name: 'Carbon Dioxide', description: 'Inert/shielding gas', color: '#64748B', hazard: 'Asphyxiant' },
  { id: 'nitrogen', name: 'Nitrogen', description: 'Inert gas', color: '#06B6D4', hazard: 'Asphyxiant' },
  { id: 'helium', name: 'Helium', description: 'Inert gas', color: '#F59E0B', hazard: 'Asphyxiant' },
  { id: 'propane', name: 'Propane/LP', description: 'Fuel gas - flammable', color: '#DC2626', hazard: 'Flammable' },
  { id: 'hydrogen', name: 'Hydrogen', description: 'Fuel gas - highly flammable', color: '#EC4899', hazard: 'Flammable' },
  { id: 'mixed', name: 'Mixed Gas', description: 'Welding mix gas', color: '#10B981', hazard: 'Varies' },
];

const LOCATIONS = [
  { id: 'welding', name: 'Welding Area' },
  { id: 'maintenance', name: 'Maintenance Shop' },
  { id: 'storage_indoor', name: 'Indoor Storage' },
  { id: 'storage_outdoor', name: 'Outdoor Storage' },
  { id: 'production', name: 'Production Floor' },
  { id: 'lab', name: 'Laboratory' },
  { id: 'dock', name: 'Loading Dock' },
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
    id: 'cylinder_condition',
    name: 'Cylinder Condition',
    description: 'No dents, bulges, cuts, gouges, or excessive corrosion',
    icon: Cylinder,
    critical: true,
    category: 'Physical Condition',
  },
  {
    id: 'valve_condition',
    name: 'Valve Condition',
    description: 'Valve and handwheel undamaged and operational',
    icon: Eye,
    critical: true,
    category: 'Physical Condition',
  },
  {
    id: 'valve_cap',
    name: 'Valve Cap in Place',
    description: 'Protective cap secured when not in use',
    icon: Shield,
    critical: true,
    category: 'Physical Condition',
  },
  {
    id: 'cylinder_secured',
    name: 'Cylinder Secured',
    description: 'Cylinder chained, strapped, or in approved rack',
    icon: Lock,
    critical: true,
    category: 'Storage',
  },
  {
    id: 'upright_position',
    name: 'Stored Upright',
    description: 'Cylinder stored in upright/vertical position',
    icon: Cylinder,
    critical: true,
    category: 'Storage',
  },
  {
    id: 'separation',
    name: 'Proper Separation',
    description: 'Incompatible gases separated by 20ft or firewall',
    icon: AlertTriangle,
    critical: true,
    category: 'Storage',
  },
  {
    id: 'full_empty_separated',
    name: 'Full/Empty Separated',
    description: 'Full and empty cylinders stored separately and labeled',
    icon: Tag,
    critical: false,
    category: 'Storage',
  },
  {
    id: 'contents_labeled',
    name: 'Contents Labeled',
    description: 'Cylinder contents clearly identified (label/color)',
    icon: Tag,
    critical: true,
    category: 'Labeling',
  },
  {
    id: 'hazard_labels',
    name: 'Hazard Labels',
    description: 'DOT/hazard labels present and legible',
    icon: AlertTriangle,
    critical: false,
    category: 'Labeling',
  },
  {
    id: 'hydro_test_date',
    name: 'Hydro Test Current',
    description: 'Cylinder within hydrostatic test date',
    icon: Calendar,
    critical: true,
    category: 'Compliance',
  },
  {
    id: 'no_heat_sources',
    name: 'Away from Heat',
    description: 'Cylinders away from heat sources and direct sunlight',
    icon: Flame,
    critical: true,
    category: 'Environment',
  },
  {
    id: 'ventilation',
    name: 'Adequate Ventilation',
    description: 'Storage area has adequate ventilation',
    icon: Eye,
    critical: true,
    category: 'Environment',
  },
  {
    id: 'no_combustibles',
    name: 'No Combustibles Nearby',
    description: 'No flammable materials stored within 20ft of oxidizers',
    icon: Flame,
    critical: true,
    category: 'Environment',
  },
  {
    id: 'regulator_condition',
    name: 'Regulator Condition',
    description: 'Regulator (if attached) in good condition, no damage',
    icon: Link,
    critical: false,
    category: 'Equipment',
  },
];

interface InspectionFormData {
  cylinderId: string;
  gasType: string;
  location: string;
  cylinderSize: string;
  quantity: string;
  date: string;
  inspectorName: string;
  hydroTestDate: string;
  checks: Record<string, InspectionStatus>;
  notes: string;
  deficienciesFound: string;
  actionTaken: string;
}

interface InspectionRecord {
  id: string;
  cylinderId: string;
  gasType: string;
  location: string;
  date: string;
  inspectorName: string;
  result: 'pass' | 'fail';
  failedChecks: number;
  createdAt: string;
}

const initialFormData: InspectionFormData = {
  cylinderId: '',
  gasType: '',
  location: '',
  cylinderSize: '',
  quantity: '',
  date: new Date().toISOString().split('T')[0],
  inspectorName: '',
  hydroTestDate: '',
  checks: {},
  notes: '',
  deficienciesFound: '',
  actionTaken: '',
};

export default function CompressedGasScreen() {
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
      cylinderId: 'Storage Rack A',
      gasType: 'oxygen',
      location: 'Welding Area',
      date: '2024-01-15',
      inspectorName: 'John Smith',
      result: 'pass',
      failedChecks: 0,
      createdAt: '2024-01-15T09:00:00Z',
    },
    {
      id: '2',
      cylinderId: 'Outdoor Cage',
      gasType: 'acetylene',
      location: 'Outdoor Storage',
      date: '2024-01-10',
      inspectorName: 'Jane Doe',
      result: 'fail',
      failedChecks: 2,
      createdAt: '2024-01-10T14:00:00Z',
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

  const canSubmit = formData.cylinderId.trim().length > 0 &&
    formData.gasType &&
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
        'Inspection Failed',
        'Critical safety items have failed. Cylinders must be secured or removed immediately.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit & Report', style: 'destructive', onPress: () => submitInspection() },
        ]
      );
    } else {
      Alert.alert('Submit Inspection', 'Compressed gas storage passed inspection.', [
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
        cylinderId: formData.cylinderId,
        gasType: formData.gasType,
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
        overallResult === 'pass' ? 'Inspection Passed' : 'Inspection Failed',
        overallResult === 'pass' ? 'Storage meets OSHA requirements.' : 'Corrective actions required. Work order submitted.'
      );
      setFormData(initialFormData);
      setActiveTab('history');
    } catch (error) {
      console.error('[CompressedGas] Submit error:', error);
      Alert.alert('Error', 'Failed to submit inspection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = useCallback(() => {
    if (Object.keys(formData.checks).length > 0 || formData.cylinderId) {
      Alert.alert('Clear Form', 'Are you sure you want to clear all entries?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setFormData(initialFormData) },
      ]);
    } else {
      setFormData(initialFormData);
    }
  }, [formData]);

  const getTypeColor = (typeId: string) => GAS_TYPES.find(t => t.id === typeId)?.color || colors.textSecondary;

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
        <View style={[styles.iconContainer, { backgroundColor: '#7C3AED20' }]}>
          <Cylinder size={32} color="#7C3AED" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Compressed Gas Cylinder</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Monthly inspection for cylinder storage and handling compliance</Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}>
        <AlertTriangle size={18} color="#EF4444" />
        <Text style={[styles.infoText, { color: '#991B1B' }]}>OSHA 1910.253 requires proper storage. Keep oxidizers 20ft from fuel gases or separated by firewall.</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Storage Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Storage Area/Rack ID *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Hash size={18} color={colors.textSecondary} />
        <TextInput style={[styles.inputField, { color: colors.text }]} placeholder="e.g., Rack A, Outdoor Cage" placeholderTextColor={colors.textSecondary} value={formData.cylinderId} onChangeText={(text) => updateFormData('cylinderId', text)} />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Primary Gas Type *</Text>
      <Pressable style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowTypePicker(true)}>
        {formData.gasType ? (
          <>
            <View style={[styles.typeDot, { backgroundColor: getTypeColor(formData.gasType) }]} />
            <Text style={[styles.selectorText, { color: colors.text }]}>{GAS_TYPES.find(t => t.id === formData.gasType)?.name}</Text>
            <View style={[styles.hazardBadge, { backgroundColor: getTypeColor(formData.gasType) + '20' }]}>
              <Text style={[styles.hazardText, { color: getTypeColor(formData.gasType) }]}>{GAS_TYPES.find(t => t.id === formData.gasType)?.hazard}</Text>
            </View>
          </>
        ) : (
          <>
            <Cylinder size={18} color={colors.textSecondary} />
            <Text style={[styles.selectorText, { color: colors.textSecondary }]}>Select gas type</Text>
          </>
        )}
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Cylinder Size</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="e.g., 300 cu ft" placeholderTextColor={colors.textSecondary} value={formData.cylinderSize} onChangeText={(text) => updateFormData('cylinderSize', text)} />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Quantity</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="# of cylinders" placeholderTextColor={colors.textSecondary} value={formData.quantity} onChangeText={(text) => updateFormData('quantity', text)} keyboardType="numeric" />
        </View>
      </View>

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
          <Text style={[styles.label, { color: colors.textSecondary }]}>Action Taken</Text>
          <TextInput style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Secured cylinders, separated gases, removed damaged, etc." placeholderTextColor={colors.textSecondary} value={formData.actionTaken} onChangeText={(text) => updateFormData('actionTaken', text)} multiline numberOfLines={2} />
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
                <Text style={[styles.resultTitle, { color: '#10B981' }]}>STORAGE COMPLIANT</Text>
                <Text style={[styles.resultSubtitle, { color: '#065F46' }]}>Meets OSHA cylinder storage requirements</Text>
              </View>
            </>
          ) : (
            <>
              <XCircle size={24} color="#EF4444" />
              <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: '#EF4444' }]}>VIOLATIONS FOUND</Text>
                <Text style={[styles.resultSubtitle, { color: '#991B1B' }]}>Immediate corrective action required</Text>
              </View>
            </>
          )}
        </View>
      )}

      <View style={styles.actionButtons}>
        <Pressable style={[styles.resetButton, { borderColor: colors.border }]} onPress={resetForm}>
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable style={[styles.submitButton, { backgroundColor: canSubmit ? '#7C3AED' : colors.border }]} onPress={handleSubmit} disabled={!canSubmit || submitting}>
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
          <Cylinder size={48} color={colors.textSecondary} />
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
            const gasType = GAS_TYPES.find(t => t.id === record.gasType);
            return (
              <Pressable key={record.id} style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }, record.result === 'fail' && { borderLeftColor: '#EF4444', borderLeftWidth: 3 }, record.result === 'pass' && { borderLeftColor: '#10B981', borderLeftWidth: 3 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedRecord(isExpanded ? null : record.id); }}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyHeaderLeft}>
                    <View style={[styles.cylinderIcon, { backgroundColor: (gasType?.color || '#7C3AED') + '20' }]}>
                      <Cylinder size={20} color={gasType?.color || '#7C3AED'} />
                    </View>
                    <View>
                      <Text style={[styles.historyId, { color: colors.text }]}>{record.cylinderId}</Text>
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
                        <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Gas Type</Text>
                        <Text style={[styles.expandedValue, { color: colors.text }]}>{gasType?.name || 'N/A'}</Text>
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
        <Pressable style={[styles.tab, activeTab === 'inspect' && { borderBottomColor: '#7C3AED', borderBottomWidth: 2 }]} onPress={() => setActiveTab('inspect')}>
          <ClipboardCheck size={18} color={activeTab === 'inspect' ? '#7C3AED' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'inspect' ? '#7C3AED' : colors.textSecondary }]}>Inspect</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#7C3AED', borderBottomWidth: 2 }]} onPress={() => setActiveTab('history')}>
          <History size={18} color={activeTab === 'history' ? '#7C3AED' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#7C3AED' : colors.textSecondary }]}>History ({inspectionHistory.length})</Text>
        </Pressable>
      </View>
      {activeTab === 'inspect' ? renderInspectTab() : renderHistoryTab()}

      <Modal visible={showTypePicker} transparent animationType="slide" onRequestClose={() => setShowTypePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Gas Type</Text>
              <Pressable onPress={() => setShowTypePicker(false)} hitSlop={8}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {GAS_TYPES.map((type) => (
                <Pressable key={type.id} style={[styles.typeOption, { borderBottomColor: colors.border }, formData.gasType === type.id && { backgroundColor: type.color + '10' }]} onPress={() => { updateFormData('gasType', type.id); setShowTypePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <View style={[styles.typeOptionDot, { backgroundColor: type.color }]} />
                  <View style={styles.typeOptionContent}>
                    <View style={styles.typeOptionHeader}>
                      <Text style={[styles.typeOptionName, { color: colors.text }]}>{type.name}</Text>
                      <View style={[styles.hazardBadge, { backgroundColor: type.color + '20' }]}>
                        <Text style={[styles.hazardText, { color: type.color }]}>{type.hazard}</Text>
                      </View>
                    </View>
                    <Text style={[styles.typeOptionDesc, { color: colors.textSecondary }]}>{type.description}</Text>
                  </View>
                  {formData.gasType === type.id && <Check size={18} color={type.color} />}
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
  hazardBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  hazardText: { fontSize: 10, fontWeight: '600' as const },
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
  cylinderIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
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
  typeOptionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  typeOptionName: { fontSize: 15, fontWeight: '500' as const },
  typeOptionDesc: { fontSize: 12, marginTop: 2 },
  modalOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1, gap: 12 },
  modalOptionText: { flex: 1, fontSize: 15 },
});
