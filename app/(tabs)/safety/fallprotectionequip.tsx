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
  Shield,
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
  Wrench,
  Building2,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  ClipboardCheck,
  Tag,
  Link,
  CircleDot,
  Lock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

type InspectionStatus = 'pass' | 'fail' | 'na';

interface EquipmentType {
  id: string;
  name: string;
  description: string;
  color: string;
}

const EQUIPMENT_TYPES: EquipmentType[] = [
  { id: 'full_body', name: 'Full Body Harness', description: 'Complete body fall arrest harness', color: '#DC2626' },
  { id: 'lanyard', name: 'Shock-Absorbing Lanyard', description: 'Energy absorbing connecting device', color: '#F59E0B' },
  { id: 'srl', name: 'Self-Retracting Lifeline (SRL)', description: 'Retractable fall limiter', color: '#3B82F6' },
  { id: 'rope_grab', name: 'Rope Grab', description: 'Vertical lifeline connector', color: '#8B5CF6' },
  { id: 'anchor', name: 'Anchor Connector', description: 'Fixed or portable anchor point', color: '#10B981' },
  { id: 'positioning', name: 'Positioning Device', description: 'Work positioning lanyard/belt', color: '#06B6D4' },
];

const LOCATIONS = [
  { id: 'roof', name: 'Roof Access' },
  { id: 'mezzanine', name: 'Mezzanine' },
  { id: 'elevated_platform', name: 'Elevated Platform' },
  { id: 'maintenance', name: 'Maintenance Shop' },
  { id: 'warehouse', name: 'Warehouse' },
  { id: 'exterior', name: 'Exterior' },
  { id: 'tank', name: 'Tank/Vessel' },
  { id: 'equipment_room', name: 'Equipment Room' },
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
    id: 'webbing',
    name: 'Webbing/Straps',
    description: 'Check for cuts, frays, burns, chemical damage, or UV degradation',
    icon: Shield,
    critical: true,
    category: 'Harness',
  },
  {
    id: 'stitching',
    name: 'Stitching',
    description: 'Check all stitching for broken threads, pulled seams',
    icon: Eye,
    critical: true,
    category: 'Harness',
  },
  {
    id: 'd_rings',
    name: 'D-Rings',
    description: 'Check D-rings for cracks, distortion, corrosion, sharp edges',
    icon: CircleDot,
    critical: true,
    category: 'Hardware',
  },
  {
    id: 'buckles',
    name: 'Buckles',
    description: 'Check buckles engage properly, no cracks or deformation',
    icon: Lock,
    critical: true,
    category: 'Hardware',
  },
  {
    id: 'grommets',
    name: 'Grommets/Rivets',
    description: 'Check grommets and rivets are secure, not bent or missing',
    icon: CircleDot,
    critical: true,
    category: 'Hardware',
  },
  {
    id: 'snap_hooks',
    name: 'Snap Hooks/Carabiners',
    description: 'Check gate operates smoothly, locks properly, no distortion',
    icon: Link,
    critical: true,
    category: 'Connectors',
  },
  {
    id: 'shock_absorber',
    name: 'Shock Absorber Pack',
    description: 'Check pack is intact, not deployed or damaged',
    icon: Shield,
    critical: true,
    category: 'Lanyard',
  },
  {
    id: 'lanyard_webbing',
    name: 'Lanyard Webbing/Cable',
    description: 'Check for cuts, abrasion, kinks, or chemical damage',
    icon: Link,
    critical: true,
    category: 'Lanyard',
  },
  {
    id: 'labels',
    name: 'Labels Legible',
    description: 'Manufacturer label, model, capacity, and warnings readable',
    icon: Tag,
    critical: false,
    category: 'Documentation',
  },
  {
    id: 'mfg_date',
    name: 'Manufacturing Date',
    description: 'Verify equipment is within service life (typically 5 years)',
    icon: Calendar,
    critical: true,
    category: 'Documentation',
  },
  {
    id: 'previous_fall',
    name: 'No Previous Fall Arrest',
    description: 'Confirm equipment has not arrested a fall (requires replacement)',
    icon: AlertTriangle,
    critical: true,
    category: 'History',
  },
  {
    id: 'storage',
    name: 'Proper Storage',
    description: 'Equipment stored properly, not exposed to elements',
    icon: Building2,
    critical: false,
    category: 'Storage',
  },
];

interface InspectionFormData {
  equipmentId: string;
  equipmentType: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  location: string;
  manufacturingDate: string;
  date: string;
  inspectorName: string;
  assignedTo: string;
  checks: Record<string, InspectionStatus>;
  notes: string;
  deficienciesFound: string;
  actionTaken: string;
}

interface InspectionRecord {
  id: string;
  equipmentId: string;
  equipmentType: string;
  location: string;
  date: string;
  inspectorName: string;
  result: 'pass' | 'fail';
  failedChecks: number;
  createdAt: string;
}

const initialFormData: InspectionFormData = {
  equipmentId: '',
  equipmentType: '',
  manufacturer: '',
  modelNumber: '',
  serialNumber: '',
  location: '',
  manufacturingDate: '',
  date: new Date().toISOString().split('T')[0],
  inspectorName: '',
  assignedTo: '',
  checks: {},
  notes: '',
  deficienciesFound: '',
  actionTaken: '',
};

export default function FallProtectionEquipScreen() {
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
      equipmentId: 'FP-H-001',
      equipmentType: 'full_body',
      location: 'Roof Access',
      date: '2024-01-15',
      inspectorName: 'John Smith',
      result: 'pass',
      failedChecks: 0,
      createdAt: '2024-01-15T08:00:00Z',
    },
    {
      id: '2',
      equipmentId: 'FP-L-012',
      equipmentType: 'lanyard',
      location: 'Maintenance Shop',
      date: '2024-01-10',
      inspectorName: 'Jane Doe',
      result: 'fail',
      failedChecks: 1,
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
    return 'pass';
  }, [inspectionStats]);

  const canSubmit = formData.equipmentId.trim().length > 0 &&
    formData.equipmentType &&
    formData.inspectorName.trim().length > 0 &&
    inspectionStats.completed === inspectionStats.total;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete all required fields and all inspection checks');
      return;
    }

    if (overallResult === 'fail') {
      Alert.alert(
        'Equipment Failed Inspection',
        'This fall protection equipment has failed critical inspection items and MUST be immediately removed from service. Do NOT use this equipment.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit & Remove',
            style: 'destructive',
            onPress: () => submitInspection(),
          },
        ]
      );
    } else {
      Alert.alert(
        'Submit Inspection',
        'Fall protection equipment passed inspection and is approved for use.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: () => submitInspection() },
        ]
      );
    }
  }, [canSubmit, overallResult]);

  const submitInspection = async () => {
    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newRecord: InspectionRecord = {
        id: Date.now().toString(),
        equipmentId: formData.equipmentId,
        equipmentType: formData.equipmentType,
        location: LOCATIONS.find(l => l.id === formData.location)?.name || formData.location || 'N/A',
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
        overallResult === 'pass' ? 'Inspection Passed' : 'Equipment Removed from Service',
        overallResult === 'pass'
          ? 'Equipment is approved for fall protection use.'
          : 'Equipment has been tagged out and removed from service.'
      );

      setFormData(initialFormData);
      setActiveTab('history');
    } catch (error) {
      console.error('[FallProtectionEquip] Submit error:', error);
      Alert.alert('Error', 'Failed to submit inspection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = useCallback(() => {
    if (Object.keys(formData.checks).length > 0 || formData.equipmentId) {
      Alert.alert('Clear Form', 'Are you sure you want to clear all entries?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setFormData(initialFormData) },
      ]);
    } else {
      setFormData(initialFormData);
    }
  }, [formData]);

  const getTypeColor = (typeId: string) => {
    return EQUIPMENT_TYPES.find(t => t.id === typeId)?.color || colors.textSecondary;
  };

  const groupedChecks = useMemo(() => {
    const groups: Record<string, InspectionCheckItem[]> = {};
    INSPECTION_CHECKS.forEach(check => {
      if (!groups[check.category]) groups[check.category] = [];
      groups[check.category].push(check);
    });
    return groups;
  }, []);

  const renderInspectTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#DC262620' }]}>
          <Shield size={32} color="#DC2626" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Fall Protection Equipment</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Pre-use inspection for harnesses, lanyards, and fall arrest systems
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}>
        <AlertTriangle size={18} color="#EF4444" />
        <Text style={[styles.infoText, { color: '#991B1B' }]}>
          OSHA requires inspection before each use. Failed equipment must be immediately destroyed or removed from service.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Equipment ID *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Hash size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="e.g., FP-H-001"
          placeholderTextColor={colors.textSecondary}
          value={formData.equipmentId}
          onChangeText={(text) => updateFormData('equipmentId', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Equipment Type *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowTypePicker(true)}
      >
        {formData.equipmentType ? (
          <>
            <View style={[styles.typeDot, { backgroundColor: getTypeColor(formData.equipmentType) }]} />
            <Text style={[styles.selectorText, { color: colors.text }]}>
              {EQUIPMENT_TYPES.find(t => t.id === formData.equipmentType)?.name}
            </Text>
          </>
        ) : (
          <>
            <Shield size={18} color={colors.textSecondary} />
            <Text style={[styles.selectorText, { color: colors.textSecondary }]}>Select equipment type</Text>
          </>
        )}
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Manufacturer</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g., 3M, Miller"
            placeholderTextColor={colors.textSecondary}
            value={formData.manufacturer}
            onChangeText={(text) => updateFormData('manufacturer', text)}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Model Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Model #"
            placeholderTextColor={colors.textSecondary}
            value={formData.modelNumber}
            onChangeText={(text) => updateFormData('modelNumber', text)}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Serial Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Serial #"
            placeholderTextColor={colors.textSecondary}
            value={formData.serialNumber}
            onChangeText={(text) => updateFormData('serialNumber', text)}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Mfg Date</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="MM/YYYY"
            placeholderTextColor={colors.textSecondary}
            value={formData.manufacturingDate}
            onChangeText={(text) => updateFormData('manufacturingDate', text)}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Location</Text>
          <Pressable
            style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowLocationPicker(true)}
          >
            <MapPin size={18} color={formData.location ? colors.primary : colors.textSecondary} />
            <Text style={[styles.selectorText, { color: formData.location ? colors.text : colors.textSecondary }]} numberOfLines={1}>
              {formData.location ? LOCATIONS.find(l => l.id === formData.location)?.name : 'Select'}
            </Text>
            <ChevronDown size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
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
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Assigned To (Employee)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Employee name (if assigned)"
        placeholderTextColor={colors.textSecondary}
        value={formData.assignedTo}
        onChangeText={(text) => updateFormData('assignedTo', text)}
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
                        {check.critical && (
                          <View style={[styles.criticalBadge, { backgroundColor: '#EF444420' }]}>
                            <Text style={styles.criticalText}>Critical</Text>
                          </View>
                        )}
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
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: '#EF444440', color: colors.text }]}
            placeholder="Describe all defects found in detail..."
            placeholderTextColor={colors.textSecondary}
            value={formData.deficienciesFound}
            onChangeText={(text) => updateFormData('deficienciesFound', text)}
            multiline
            numberOfLines={3}
          />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Action Taken</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Destroyed, removed from service, returned to manufacturer, etc."
            placeholderTextColor={colors.textSecondary}
            value={formData.actionTaken}
            onChangeText={(text) => updateFormData('actionTaken', text)}
            multiline
            numberOfLines={2}
          />
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Notes</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Any additional observations..."
        placeholderTextColor={colors.textSecondary}
        value={formData.notes}
        onChangeText={(text) => updateFormData('notes', text)}
        multiline
        numberOfLines={3}
      />

      {inspectionStats.completed === inspectionStats.total && (
        <View style={[styles.resultCard, { backgroundColor: overallResult === 'pass' ? '#10B98120' : '#EF444420' }, { borderColor: overallResult === 'pass' ? '#10B981' : '#EF4444' }]}>
          {overallResult === 'pass' ? (
            <>
              <CheckCircle size={24} color="#10B981" />
              <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: '#10B981' }]}>APPROVED FOR USE</Text>
                <Text style={[styles.resultSubtitle, { color: '#065F46' }]}>Equipment passed all inspection criteria</Text>
              </View>
            </>
          ) : (
            <>
              <XCircle size={24} color="#EF4444" />
              <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: '#EF4444' }]}>REMOVE FROM SERVICE</Text>
                <Text style={[styles.resultSubtitle, { color: '#991B1B' }]}>Equipment must be destroyed or returned for repair</Text>
              </View>
            </>
          )}
        </View>
      )}

      <View style={styles.actionButtons}>
        <Pressable style={[styles.resetButton, { borderColor: colors.border }]} onPress={resetForm}>
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable style={[styles.submitButton, { backgroundColor: canSubmit ? '#DC2626' : colors.border }]} onPress={handleSubmit} disabled={!canSubmit || submitting}>
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
          <Shield size={48} color={colors.textSecondary} />
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
            const equipType = EQUIPMENT_TYPES.find(t => t.id === record.equipmentType);
            return (
              <Pressable key={record.id} style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }, record.result === 'fail' && { borderLeftColor: '#EF4444', borderLeftWidth: 3 }, record.result === 'pass' && { borderLeftColor: '#10B981', borderLeftWidth: 3 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedRecord(isExpanded ? null : record.id); }}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyHeaderLeft}>
                    <View style={[styles.equipIcon, { backgroundColor: (equipType?.color || '#DC2626') + '20' }]}>
                      <Shield size={20} color={equipType?.color || '#DC2626'} />
                    </View>
                    <View>
                      <Text style={[styles.historyId, { color: colors.text }]}>{record.equipmentId}</Text>
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
                        <Text style={[styles.expandedValue, { color: colors.text }]}>{equipType?.name || 'N/A'}</Text>
                      </View>
                      <View style={styles.expandedItem}>
                        <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Failed Checks</Text>
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
        <Pressable style={[styles.tab, activeTab === 'inspect' && { borderBottomColor: '#DC2626', borderBottomWidth: 2 }]} onPress={() => setActiveTab('inspect')}>
          <ClipboardCheck size={18} color={activeTab === 'inspect' ? '#DC2626' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'inspect' ? '#DC2626' : colors.textSecondary }]}>Inspect</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#DC2626', borderBottomWidth: 2 }]} onPress={() => setActiveTab('history')}>
          <History size={18} color={activeTab === 'history' ? '#DC2626' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#DC2626' : colors.textSecondary }]}>History ({inspectionHistory.length})</Text>
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
              {EQUIPMENT_TYPES.map((type) => (
                <Pressable key={type.id} style={[styles.typeOption, { borderBottomColor: colors.border }, formData.equipmentType === type.id && { backgroundColor: type.color + '10' }]} onPress={() => { updateFormData('equipmentType', type.id); setShowTypePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <View style={[styles.typeOptionDot, { backgroundColor: type.color }]} />
                  <View style={styles.typeOptionContent}>
                    <Text style={[styles.typeOptionName, { color: colors.text }]}>{type.name}</Text>
                    <Text style={[styles.typeOptionDesc, { color: colors.textSecondary }]}>{type.description}</Text>
                  </View>
                  {formData.equipmentType === type.id && <Check size={18} color={type.color} />}
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
  equipIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
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
