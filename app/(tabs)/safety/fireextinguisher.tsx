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
  Flame,
  Plus,
  Calendar,
  MapPin,
  User,
  X,
  Check,
  ChevronDown,
  History,
  AlertTriangle,
  ChevronRight,
  Gauge,
  Shield,
  Eye,
  Wrench,
  Clock,
  Building2,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  ClipboardCheck,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

type InspectionStatus = 'pass' | 'fail' | 'na';

interface ExtinguisherType {
  id: string;
  name: string;
  description: string;
  color: string;
}

const EXTINGUISHER_TYPES: ExtinguisherType[] = [
  { id: 'abc', name: 'ABC Dry Chemical', description: 'Multi-purpose', color: '#EF4444' },
  { id: 'bc', name: 'BC Dry Chemical', description: 'Flammable liquids/electrical', color: '#3B82F6' },
  { id: 'co2', name: 'CO2', description: 'Electrical/flammable liquids', color: '#6366F1' },
  { id: 'water', name: 'Water', description: 'Class A fires only', color: '#06B6D4' },
  { id: 'k', name: 'Class K', description: 'Kitchen/cooking oils', color: '#F59E0B' },
  { id: 'clean_agent', name: 'Clean Agent', description: 'Electronics/sensitive equipment', color: '#10B981' },
];

const LOCATIONS = [
  { id: 'entrance', name: 'Main Entrance' },
  { id: 'production', name: 'Production Floor' },
  { id: 'warehouse', name: 'Warehouse' },
  { id: 'shipping', name: 'Shipping/Receiving' },
  { id: 'maintenance', name: 'Maintenance Shop' },
  { id: 'kitchen', name: 'Kitchen/Break Room' },
  { id: 'office', name: 'Office Area' },
  { id: 'electrical', name: 'Electrical Room' },
  { id: 'boiler', name: 'Boiler Room' },
  { id: 'hallway', name: 'Hallway/Corridor' },
  { id: 'loading', name: 'Loading Dock' },
  { id: 'other', name: 'Other' },
];

interface InspectionCheckItem {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  critical: boolean;
}

const INSPECTION_CHECKS: InspectionCheckItem[] = [
  {
    id: 'location',
    name: 'Extinguisher in Place',
    description: 'Verify extinguisher is mounted in designated location',
    icon: MapPin,
    critical: true,
  },
  {
    id: 'accessible',
    name: 'Access Clear',
    description: 'No obstructions blocking access (3ft clearance)',
    icon: Eye,
    critical: true,
  },
  {
    id: 'signage',
    name: 'Signage Visible',
    description: 'Location sign/marker clearly visible',
    icon: AlertTriangle,
    critical: false,
  },
  {
    id: 'pressure',
    name: 'Pressure Gauge',
    description: 'Needle in green/charged zone',
    icon: Gauge,
    critical: true,
  },
  {
    id: 'seal',
    name: 'Safety Seal Intact',
    description: 'Tamper seal/pin in place and undamaged',
    icon: Shield,
    critical: true,
  },
  {
    id: 'hose',
    name: 'Hose/Nozzle Condition',
    description: 'No cracks, blockages, or damage',
    icon: Wrench,
    critical: true,
  },
  {
    id: 'body',
    name: 'Cylinder Condition',
    description: 'No dents, rust, corrosion, or damage',
    icon: Shield,
    critical: true,
  },
  {
    id: 'label',
    name: 'Label Legible',
    description: 'Operating instructions clearly readable',
    icon: FileText,
    critical: false,
  },
  {
    id: 'mounting',
    name: 'Mounting Secure',
    description: 'Bracket secure, proper height (max 5ft to handle)',
    icon: Check,
    critical: false,
  },
  {
    id: 'service_tag',
    name: 'Service Tag Current',
    description: 'Annual service within 12 months',
    icon: Calendar,
    critical: true,
  },
];

interface InspectionFormData {
  extinguisherId: string;
  extinguisherType: string;
  location: string;
  specificLocation: string;
  size: string;
  date: string;
  inspectorName: string;
  checks: Record<string, InspectionStatus>;
  notes: string;
  lastAnnualService: string;
  nextAnnualService: string;
  deficienciesFound: string;
  correctiveActionTaken: string;
}

interface InspectionRecord {
  id: string;
  extinguisherId: string;
  extinguisherType: string;
  location: string;
  date: string;
  inspectorName: string;
  result: 'pass' | 'fail';
  failedChecks: number;
  createdAt: string;
}

const initialFormData: InspectionFormData = {
  extinguisherId: '',
  extinguisherType: '',
  location: '',
  specificLocation: '',
  size: '',
  date: new Date().toISOString().split('T')[0],
  inspectorName: '',
  checks: {},
  notes: '',
  lastAnnualService: '',
  nextAnnualService: '',
  deficienciesFound: '',
  correctiveActionTaken: '',
};

export default function FireExtinguisherScreen() {
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
      extinguisherId: 'FE-001',
      extinguisherType: 'abc',
      location: 'Main Entrance',
      date: '2024-01-15',
      inspectorName: 'John Smith',
      result: 'pass',
      failedChecks: 0,
      createdAt: '2024-01-15T09:00:00Z',
    },
    {
      id: '2',
      extinguisherId: 'FE-012',
      extinguisherType: 'k',
      location: 'Kitchen/Break Room',
      date: '2024-01-14',
      inspectorName: 'Jane Doe',
      result: 'fail',
      failedChecks: 2,
      createdAt: '2024-01-14T10:30:00Z',
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

  const canSubmit = formData.extinguisherId.trim().length > 0 &&
    formData.extinguisherType &&
    formData.location &&
    formData.inspectorName.trim().length > 0 &&
    inspectionStats.completed === inspectionStats.total;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete all fields:\n• Extinguisher ID\n• Type\n• Location\n• Inspector Name\n• All inspection checks');
      return;
    }

    const resultMessage = overallResult === 'pass'
      ? 'Extinguisher PASSED all inspection checks.'
      : `Extinguisher FAILED inspection with ${inspectionStats.failed} failed check(s).`;

    Alert.alert(
      'Submit Inspection',
      `${resultMessage}\n\nSubmit this inspection record?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await new Promise(resolve => setTimeout(resolve, 1500));

              const newRecord: InspectionRecord = {
                id: Date.now().toString(),
                extinguisherId: formData.extinguisherId,
                extinguisherType: formData.extinguisherType,
                location: LOCATIONS.find(l => l.id === formData.location)?.name || formData.location,
                date: formData.date,
                inspectorName: formData.inspectorName,
                result: overallResult === 'pass' ? 'pass' : 'fail',
                failedChecks: inspectionStats.failed,
                createdAt: new Date().toISOString(),
              };

              setInspectionHistory(prev => [newRecord, ...prev]);

              Haptics.notificationAsync(
                overallResult === 'pass'
                  ? Haptics.NotificationFeedbackType.Success
                  : Haptics.NotificationFeedbackType.Warning
              );

              Alert.alert(
                overallResult === 'pass' ? 'Inspection Passed' : 'Inspection Failed',
                overallResult === 'pass'
                  ? 'Fire extinguisher passed all checks.'
                  : 'Fire extinguisher requires attention. Work order may be needed.'
              );

              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[FireExtinguisher] Submit error:', error);
              Alert.alert('Error', 'Failed to submit inspection. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }, [canSubmit, formData, overallResult, inspectionStats]);

  const resetForm = useCallback(() => {
    if (Object.keys(formData.checks).length > 0 || formData.extinguisherId) {
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
    } else {
      setFormData(initialFormData);
    }
  }, [formData]);

  const getTypeColor = (typeId: string) => {
    return EXTINGUISHER_TYPES.find(t => t.id === typeId)?.color || colors.textSecondary;
  };

  const getStatusIcon = (status: InspectionStatus | undefined) => {
    switch (status) {
      case 'pass': return { icon: CheckCircle, color: '#10B981' };
      case 'fail': return { icon: XCircle, color: '#EF4444' };
      case 'na': return { icon: AlertCircle, color: '#64748B' };
      default: return { icon: AlertCircle, color: colors.border };
    }
  };

  const renderInspectTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#DC262620' }]}>
          <Flame size={32} color="#DC2626" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Fire Extinguisher Inspection</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Monthly inspection for fire extinguisher readiness
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B40' }]}>
        <AlertTriangle size={18} color="#F59E0B" />
        <Text style={[styles.infoText, { color: '#92400E' }]}>
          OSHA requires monthly visual inspections. Document all findings accurately.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Extinguisher Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Extinguisher ID/Number *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Hash size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="e.g., FE-001, A-12"
          placeholderTextColor={colors.textSecondary}
          value={formData.extinguisherId}
          onChangeText={(text) => updateFormData('extinguisherId', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Extinguisher Type *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowTypePicker(true)}
      >
        {formData.extinguisherType ? (
          <>
            <View style={[styles.typeDot, { backgroundColor: getTypeColor(formData.extinguisherType) }]} />
            <Text style={[styles.selectorText, { color: colors.text }]}>
              {EXTINGUISHER_TYPES.find(t => t.id === formData.extinguisherType)?.name}
            </Text>
          </>
        ) : (
          <>
            <Flame size={18} color={colors.textSecondary} />
            <Text style={[styles.selectorText, { color: colors.textSecondary }]}>Select type</Text>
          </>
        )}
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Size/Weight</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g., 10 lb"
            placeholderTextColor={colors.textSecondary}
            value={formData.size}
            onChangeText={(text) => updateFormData('size', text)}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Inspection Date *</Text>
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
        placeholder="Specific location (wall, column #, near...)"
        placeholderTextColor={colors.textSecondary}
        value={formData.specificLocation}
        onChangeText={(text) => updateFormData('specificLocation', text)}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Inspector Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Your full name"
          placeholderTextColor={colors.textSecondary}
          value={formData.inspectorName}
          onChangeText={(text) => updateFormData('inspectorName', text)}
        />
      </View>

      <View style={styles.checksHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
          Inspection Checklist
        </Text>
        <View style={[styles.progressBadge, { backgroundColor: colors.surface }]}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {inspectionStats.completed}/{inspectionStats.total}
          </Text>
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
          <Text style={[styles.checkStatValue, { color: '#64748B' }]}>
            {Object.values(formData.checks).filter(s => s === 'na').length}
          </Text>
          <Text style={[styles.checkStatLabel, { color: colors.textSecondary }]}>N/A</Text>
        </View>
      </View>

      {INSPECTION_CHECKS.map((check) => {
        const CheckIcon = check.icon;
        const status = formData.checks[check.id];
        const StatusInfo = getStatusIcon(status);

        return (
          <View
            key={check.id}
            style={[
              styles.checkCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              status === 'fail' && { borderColor: '#EF444440' },
              status === 'pass' && { borderColor: '#10B98140' },
            ]}
          >
            <View style={styles.checkHeader}>
              <View style={styles.checkTitleRow}>
                <View style={[styles.checkIconContainer, { backgroundColor: colors.background }]}>
                  <CheckIcon size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.checkTitleContent}>
                  <View style={styles.checkTitleWithBadge}>
                    <Text style={[styles.checkTitle, { color: colors.text }]}>{check.name}</Text>
                    {check.critical && (
                      <View style={[styles.criticalBadge, { backgroundColor: '#EF444420' }]}>
                        <Text style={styles.criticalText}>Critical</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.checkDescription, { color: colors.textSecondary }]}>
                    {check.description}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.checkButtons}>
              <Pressable
                style={[
                  styles.checkButton,
                  { borderColor: colors.border },
                  status === 'pass' && { backgroundColor: '#10B98120', borderColor: '#10B981' },
                ]}
                onPress={() => setCheckStatus(check.id, 'pass')}
              >
                <CheckCircle size={18} color={status === 'pass' ? '#10B981' : colors.textSecondary} />
                <Text style={[styles.checkButtonText, { color: status === 'pass' ? '#10B981' : colors.textSecondary }]}>
                  Pass
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.checkButton,
                  { borderColor: colors.border },
                  status === 'fail' && { backgroundColor: '#EF444420', borderColor: '#EF4444' },
                ]}
                onPress={() => setCheckStatus(check.id, 'fail')}
              >
                <XCircle size={18} color={status === 'fail' ? '#EF4444' : colors.textSecondary} />
                <Text style={[styles.checkButtonText, { color: status === 'fail' ? '#EF4444' : colors.textSecondary }]}>
                  Fail
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.checkButton,
                  styles.checkButtonSmall,
                  { borderColor: colors.border },
                  status === 'na' && { backgroundColor: '#64748B20', borderColor: '#64748B' },
                ]}
                onPress={() => setCheckStatus(check.id, 'na')}
              >
                <Text style={[styles.checkButtonText, { color: status === 'na' ? '#64748B' : colors.textSecondary }]}>
                  N/A
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Information</Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Last Annual Service</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.lastAnnualService}
              onChangeText={(text) => updateFormData('lastAnnualService', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Next Service Due</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.nextAnnualService}
              onChangeText={(text) => updateFormData('nextAnnualService', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      </View>

      {inspectionStats.failed > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Deficiencies Found</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: '#EF444440', color: colors.text }]}
            placeholder="Describe all deficiencies found..."
            placeholderTextColor={colors.textSecondary}
            value={formData.deficienciesFound}
            onChangeText={(text) => updateFormData('deficienciesFound', text)}
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Corrective Action Taken</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Describe any immediate corrective actions taken..."
            placeholderTextColor={colors.textSecondary}
            value={formData.correctiveActionTaken}
            onChangeText={(text) => updateFormData('correctiveActionTaken', text)}
            multiline
            numberOfLines={2}
          />
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Notes</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Any additional observations or comments..."
        placeholderTextColor={colors.textSecondary}
        value={formData.notes}
        onChangeText={(text) => updateFormData('notes', text)}
        multiline
        numberOfLines={3}
      />

      {inspectionStats.completed === inspectionStats.total && (
        <View style={[
          styles.resultCard,
          { backgroundColor: overallResult === 'pass' ? '#10B98120' : '#EF444420' },
          { borderColor: overallResult === 'pass' ? '#10B981' : '#EF4444' },
        ]}>
          {overallResult === 'pass' ? (
            <>
              <CheckCircle size={24} color="#10B981" />
              <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: '#10B981' }]}>INSPECTION PASSED</Text>
                <Text style={[styles.resultSubtitle, { color: '#065F46' }]}>
                  All checks completed successfully
                </Text>
              </View>
            </>
          ) : (
            <>
              <XCircle size={24} color="#EF4444" />
              <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: '#EF4444' }]}>INSPECTION FAILED</Text>
                <Text style={[styles.resultSubtitle, { color: '#991B1B' }]}>
                  {inspectionStats.failed} check(s) failed - Requires attention
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      <View style={styles.actionButtons}>
        <Pressable
          style={[styles.resetButton, { borderColor: colors.border }]}
          onPress={resetForm}
        >
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, { backgroundColor: canSubmit ? '#DC2626' : colors.border }]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
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
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {inspectionHistory.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Flame size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Inspection Records</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Complete your first inspection to see history here
          </Text>
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
                <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>
                  {inspectionHistory.filter(r => r.result === 'pass').length}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Passed</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#EF4444' }]}>
                  {inspectionHistory.filter(r => r.result === 'fail').length}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Failed</Text>
              </View>
            </View>
          </View>

          {inspectionHistory.map((record) => {
            const isExpanded = expandedRecord === record.id;
            const extType = EXTINGUISHER_TYPES.find(t => t.id === record.extinguisherType);

            return (
              <Pressable
                key={record.id}
                style={[
                  styles.historyCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  record.result === 'fail' && { borderLeftColor: '#EF4444', borderLeftWidth: 3 },
                  record.result === 'pass' && { borderLeftColor: '#10B981', borderLeftWidth: 3 },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExpandedRecord(isExpanded ? null : record.id);
                }}
              >
                <View style={styles.historyHeader}>
                  <View style={styles.historyHeaderLeft}>
                    <View style={[styles.extinguisherIcon, { backgroundColor: (extType?.color || '#DC2626') + '20' }]}>
                      <Flame size={20} color={extType?.color || '#DC2626'} />
                    </View>
                    <View>
                      <Text style={[styles.historyId, { color: colors.text }]}>{record.extinguisherId}</Text>
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
                    <View style={[
                      styles.resultBadge,
                      { backgroundColor: record.result === 'pass' ? '#10B98120' : '#EF444420' },
                    ]}>
                      {record.result === 'pass' ? (
                        <CheckCircle size={14} color="#10B981" />
                      ) : (
                        <XCircle size={14} color="#EF4444" />
                      )}
                      <Text style={[
                        styles.resultBadgeText,
                        { color: record.result === 'pass' ? '#10B981' : '#EF4444' },
                      ]}>
                        {record.result.toUpperCase()}
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
                        <Text style={[styles.expandedValue, { color: colors.text }]}>{extType?.name || 'N/A'}</Text>
                      </View>
                      <View style={styles.expandedItem}>
                        <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Failed Checks</Text>
                        <Text style={[styles.expandedValue, { color: record.failedChecks > 0 ? '#EF4444' : '#10B981' }]}>
                          {record.failedChecks}
                        </Text>
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
        <Pressable
          style={[styles.tab, activeTab === 'inspect' && { borderBottomColor: '#DC2626', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('inspect')}
        >
          <ClipboardCheck size={18} color={activeTab === 'inspect' ? '#DC2626' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'inspect' ? '#DC2626' : colors.textSecondary }]}>
            Inspect
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#DC2626', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? '#DC2626' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#DC2626' : colors.textSecondary }]}>
            History ({inspectionHistory.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'inspect' ? renderInspectTab() : renderHistoryTab()}

      {/* Type Picker Modal */}
      <Modal
        visible={showTypePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Extinguisher Type</Text>
              <Pressable onPress={() => setShowTypePicker(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {EXTINGUISHER_TYPES.map((type) => (
                <Pressable
                  key={type.id}
                  style={[
                    styles.typeOption,
                    { borderBottomColor: colors.border },
                    formData.extinguisherType === type.id && { backgroundColor: type.color + '10' },
                  ]}
                  onPress={() => {
                    updateFormData('extinguisherType', type.id);
                    setShowTypePicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={[styles.typeOptionDot, { backgroundColor: type.color }]} />
                  <View style={styles.typeOptionContent}>
                    <Text style={[styles.typeOptionName, { color: colors.text }]}>{type.name}</Text>
                    <Text style={[styles.typeOptionDesc, { color: colors.textSecondary }]}>{type.description}</Text>
                  </View>
                  {formData.extinguisherType === type.id && <Check size={18} color={type.color} />}
                </Pressable>
              ))}
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
    textAlign: 'center' as const,
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
  typeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  checksHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 16,
    marginBottom: 12,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  checklistStats: {
    flexDirection: 'row' as const,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'space-around' as const,
  },
  checkStatItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  checkStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  checkStatLabel: {
    fontSize: 12,
  },
  checkCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  checkHeader: {
    marginBottom: 12,
  },
  checkTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
  },
  checkIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkTitleContent: {
    flex: 1,
  },
  checkTitleWithBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  checkTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  criticalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  criticalText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#EF4444',
  },
  checkDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  checkButtons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  checkButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  checkButtonSmall: {
    flex: 0.6,
  },
  checkButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  resultCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    gap: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  resultSubtitle: {
    fontSize: 13,
    marginTop: 2,
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
  },
  extinguisherIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  historyId: {
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
  resultBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  resultBadgeText: {
    fontSize: 11,
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
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
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
  typeOptionDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
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
});
