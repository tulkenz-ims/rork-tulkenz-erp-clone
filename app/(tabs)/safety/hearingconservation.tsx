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
  Ear,
  Plus,
  Calendar,
  User,

  Check,
  ChevronDown,
  History,
  Volume2,

  AlertTriangle,
  Clock,
  Building2,
  Hash,
  ChevronRight,
  FileText,
  Stethoscope,

  TrendingDown,

} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface AudiometricResult {
  frequency: number;
  leftEar: number | null;
  rightEar: number | null;
}

const FREQUENCIES = [500, 1000, 2000, 3000, 4000, 6000, 8000];

interface HearingTestFormData {
  testDate: string;
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  testType: 'baseline' | 'annual' | 'retest' | 'exit';
  audiometerModel: string;
  audiometerCalibrationDate: string;
  examinerName: string;
  examinerCredentials: string;
  noiseExposureLevel: string;
  hearingProtectionUsed: string;
  hoursQuietBeforeTest: string;
  audiometricResults: AudiometricResult[];
  leftEarSTS: boolean;
  rightEarSTS: boolean;
  referralRequired: boolean;
  referralReason: string;
  employeeNotified: boolean;
  notificationDate: string;
  notes: string;
}

interface HearingRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  testDate: string;
  testType: string;
  stsDetected: boolean;
  referralRequired: boolean;
  examinerName: string;
  createdAt: string;
}

const TEST_TYPES = [
  { id: 'baseline', label: 'Baseline', color: '#3B82F6', description: 'Initial audiogram for new employees' },
  { id: 'annual', label: 'Annual', color: '#10B981', description: 'Yearly monitoring audiogram' },
  { id: 'retest', label: 'Retest', color: '#F59E0B', description: 'Follow-up test after STS detection' },
  { id: 'exit', label: 'Exit', color: '#8B5CF6', description: 'Audiogram when leaving noise area' },
];

const HEARING_PROTECTION = [
  'Foam Ear Plugs (NRR 29)',
  'Reusable Ear Plugs (NRR 25)',
  'Ear Muffs (NRR 27)',
  'Dual Protection (Plugs + Muffs)',
  'Custom Molded (NRR varies)',
  'None',
];

const initialResults: AudiometricResult[] = FREQUENCIES.map(freq => ({
  frequency: freq,
  leftEar: null,
  rightEar: null,
}));

const initialFormData: HearingTestFormData = {
  testDate: new Date().toISOString().split('T')[0],
  employeeName: '',
  employeeId: '',
  department: '',
  jobTitle: '',
  testType: 'annual',
  audiometerModel: '',
  audiometerCalibrationDate: '',
  examinerName: '',
  examinerCredentials: '',
  noiseExposureLevel: '',
  hearingProtectionUsed: '',
  hoursQuietBeforeTest: '',
  audiometricResults: initialResults,
  leftEarSTS: false,
  rightEarSTS: false,
  referralRequired: false,
  referralReason: '',
  employeeNotified: false,
  notificationDate: '',
  notes: '',
};

export default function HearingConservationScreen() {
  const { colors } = useTheme();
  useAuth();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState<HearingTestFormData>(initialFormData);
  const [showTestTypePicker, setShowTestTypePicker] = useState(false);
  const [showProtectionPicker, setShowProtectionPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const [testHistory, setTestHistory] = useState<HearingRecord[]>([
    {
      id: '1',
      employeeName: 'John Smith',
      employeeId: 'EMP001',
      department: 'Manufacturing',
      testDate: '2024-01-15',
      testType: 'annual',
      stsDetected: false,
      referralRequired: false,
      examinerName: 'Dr. Sarah Johnson',
      createdAt: '2024-01-15T09:00:00Z',
    },
    {
      id: '2',
      employeeName: 'Mike Johnson',
      employeeId: 'EMP023',
      department: 'Production',
      testDate: '2024-01-10',
      testType: 'annual',
      stsDetected: true,
      referralRequired: true,
      examinerName: 'Dr. Sarah Johnson',
      createdAt: '2024-01-10T10:00:00Z',
    },
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const updateFormData = useCallback((key: keyof HearingTestFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateAudiometricResult = useCallback((frequency: number, ear: 'leftEar' | 'rightEar', value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    setFormData(prev => ({
      ...prev,
      audiometricResults: prev.audiometricResults.map(r =>
        r.frequency === frequency ? { ...r, [ear]: isNaN(numValue as number) ? null : numValue } : r
      ),
    }));
  }, []);

  const calculatePTA = useCallback((ear: 'leftEar' | 'rightEar') => {
    const relevantFreqs = [500, 1000, 2000, 3000];
    const results = formData.audiometricResults.filter(r => relevantFreqs.includes(r.frequency));
    const values = results.map(r => r[ear]).filter(v => v !== null) as number[];
    if (values.length === 0) return null;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [formData.audiometricResults]);

  const leftPTA = useMemo(() => calculatePTA('leftEar'), [calculatePTA]);
  const rightPTA = useMemo(() => calculatePTA('rightEar'), [calculatePTA]);

  const getHearingLevel = (pta: number | null) => {
    if (pta === null) return { label: 'N/A', color: '#64748B' };
    if (pta <= 25) return { label: 'Normal', color: '#10B981' };
    if (pta <= 40) return { label: 'Mild Loss', color: '#F59E0B' };
    if (pta <= 55) return { label: 'Moderate', color: '#F97316' };
    if (pta <= 70) return { label: 'Mod-Severe', color: '#EF4444' };
    return { label: 'Severe', color: '#DC2626' };
  };

  const canSubmit = formData.employeeName.trim().length > 0 &&
    formData.examinerName.trim().length > 0 &&
    formData.audiometricResults.some(r => r.leftEar !== null || r.rightEar !== null);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete:\n• Employee Name\n• Examiner Name\n• At least one audiometric result');
      return;
    }

    const stsDetected = formData.leftEarSTS || formData.rightEarSTS;
    const message = stsDetected
      ? 'STS has been detected. Ensure proper follow-up procedures are initiated. Submit this record?'
      : 'Submit this hearing conservation record?';

    Alert.alert(
      'Submit Hearing Test',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await new Promise(resolve => setTimeout(resolve, 1500));

              const newRecord: HearingRecord = {
                id: Date.now().toString(),
                employeeName: formData.employeeName,
                employeeId: formData.employeeId,
                department: formData.department,
                testDate: formData.testDate,
                testType: formData.testType,
                stsDetected: formData.leftEarSTS || formData.rightEarSTS,
                referralRequired: formData.referralRequired,
                examinerName: formData.examinerName,
                createdAt: new Date().toISOString(),
              };

              setTestHistory(prev => [newRecord, ...prev]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Hearing conservation record submitted successfully.');
              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[HearingConservation] Submit error:', error);
              Alert.alert('Error', 'Failed to submit. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }, [canSubmit, formData]);

  const getTestTypeColor = (typeId: string) => {
    return TEST_TYPES.find(t => t.id === typeId)?.color || colors.textSecondary;
  };

  const renderNewTab = () => (
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
          <Ear size={32} color="#F59E0B" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Hearing Conservation</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          OSHA 29 CFR 1910.95 requires audiometric testing for employees exposed to ≥85 dBA TWA
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Test Information</Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Test Date *</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.testDate}
              onChangeText={(text) => updateFormData('testDate', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Test Type *</Text>
          <Pressable
            style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 0 }]}
            onPress={() => setShowTestTypePicker(true)}
          >
            <View style={[styles.typeDot, { backgroundColor: getTestTypeColor(formData.testType) }]} />
            <Text style={[styles.selectorText, { color: colors.text }]}>
              {TEST_TYPES.find(t => t.id === formData.testType)?.label}
            </Text>
            <ChevronDown size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Employee Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Employee Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Full name"
          placeholderTextColor={colors.textSecondary}
          value={formData.employeeName}
          onChangeText={(text) => updateFormData('employeeName', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Employee ID</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 0 }]}>
            <Hash size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.inputField, { color: colors.text }]}
              placeholder="ID Number"
              placeholderTextColor={colors.textSecondary}
              value={formData.employeeId}
              onChangeText={(text) => updateFormData('employeeId', text)}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Department</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 0 }]}>
            <Building2 size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.inputField, { color: colors.text }]}
              placeholder="Department"
              placeholderTextColor={colors.textSecondary}
              value={formData.department}
              onChangeText={(text) => updateFormData('department', text)}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Noise Exposure Level (dBA TWA)</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Volume2 size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="e.g., 88 dBA"
          placeholderTextColor={colors.textSecondary}
          value={formData.noiseExposureLevel}
          onChangeText={(text) => updateFormData('noiseExposureLevel', text)}
          keyboardType="numeric"
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Hearing Protection Used</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowProtectionPicker(true)}
      >
        <Ear size={18} color={formData.hearingProtectionUsed ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.hearingProtectionUsed ? colors.text : colors.textSecondary }]}>
          {formData.hearingProtectionUsed || 'Select hearing protection type'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Hours Quiet Before Test</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Clock size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Minimum 14 hours recommended"
          placeholderTextColor={colors.textSecondary}
          value={formData.hoursQuietBeforeTest}
          onChangeText={(text) => updateFormData('hoursQuietBeforeTest', text)}
          keyboardType="numeric"
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Examiner Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Examiner Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Stethoscope size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Name of audiometric technician"
          placeholderTextColor={colors.textSecondary}
          value={formData.examinerName}
          onChangeText={(text) => updateFormData('examinerName', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Credentials</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginBottom: 0 }]}
            placeholder="e.g., CAOHC"
            placeholderTextColor={colors.textSecondary}
            value={formData.examinerCredentials}
            onChangeText={(text) => updateFormData('examinerCredentials', text)}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Audiometer Model</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginBottom: 0 }]}
            placeholder="Model #"
            placeholderTextColor={colors.textSecondary}
            value={formData.audiometerModel}
            onChangeText={(text) => updateFormData('audiometerModel', text)}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Audiometric Results (dB HL)</Text>

      <View style={[styles.audiogramCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.audiogramHeader}>
          <View style={styles.audiogramHeaderCell}>
            <Text style={[styles.audiogramHeaderText, { color: colors.textSecondary }]}>Hz</Text>
          </View>
          <View style={[styles.audiogramHeaderCell, { backgroundColor: '#3B82F610' }]}>
            <Text style={[styles.audiogramHeaderText, { color: '#3B82F6' }]}>Left</Text>
          </View>
          <View style={[styles.audiogramHeaderCell, { backgroundColor: '#EF444410' }]}>
            <Text style={[styles.audiogramHeaderText, { color: '#EF4444' }]}>Right</Text>
          </View>
        </View>

        {formData.audiometricResults.map((result) => (
          <View key={result.frequency} style={[styles.audiogramRow, { borderTopColor: colors.border }]}>
            <View style={styles.audiogramFreqCell}>
              <Text style={[styles.audiogramFreqText, { color: colors.text }]}>{result.frequency}</Text>
            </View>
            <View style={styles.audiogramInputCell}>
              <TextInput
                style={[styles.audiogramInput, { backgroundColor: colors.background, borderColor: colors.border, color: '#3B82F6' }]}
                placeholder="-"
                placeholderTextColor={colors.textSecondary}
                value={result.leftEar?.toString() || ''}
                onChangeText={(text) => updateAudiometricResult(result.frequency, 'leftEar', text)}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            <View style={styles.audiogramInputCell}>
              <TextInput
                style={[styles.audiogramInput, { backgroundColor: colors.background, borderColor: colors.border, color: '#EF4444' }]}
                placeholder="-"
                placeholderTextColor={colors.textSecondary}
                value={result.rightEar?.toString() || ''}
                onChangeText={(text) => updateAudiometricResult(result.frequency, 'rightEar', text)}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>
        ))}

        <View style={[styles.ptaRow, { borderTopColor: colors.border }]}>
          <View style={styles.ptaCell}>
            <Text style={[styles.ptaLabel, { color: colors.textSecondary }]}>PTA (500-3000 Hz)</Text>
          </View>
          <View style={styles.ptaResultCell}>
            <Text style={[styles.ptaValue, { color: '#3B82F6' }]}>{leftPTA ?? '-'}</Text>
            <View style={[styles.ptaBadge, { backgroundColor: getHearingLevel(leftPTA).color + '15' }]}>
              <Text style={[styles.ptaBadgeText, { color: getHearingLevel(leftPTA).color }]}>
                {getHearingLevel(leftPTA).label}
              </Text>
            </View>
          </View>
          <View style={styles.ptaResultCell}>
            <Text style={[styles.ptaValue, { color: '#EF4444' }]}>{rightPTA ?? '-'}</Text>
            <View style={[styles.ptaBadge, { backgroundColor: getHearingLevel(rightPTA).color + '15' }]}>
              <Text style={[styles.ptaBadgeText, { color: getHearingLevel(rightPTA).color }]}>
                {getHearingLevel(rightPTA).label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Standard Threshold Shift (STS)</Text>

      <View style={[styles.stsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.stsBanner, { backgroundColor: '#F59E0B15' }]}>
          <AlertTriangle size={16} color="#F59E0B" />
          <Text style={[styles.stsBannerText, { color: '#F59E0B' }]}>
            STS = 10 dB average shift at 2000, 3000, and 4000 Hz
          </Text>
        </View>

        <View style={styles.stsCheckboxes}>
          <Pressable
            style={[
              styles.stsCheckbox,
              { backgroundColor: formData.leftEarSTS ? '#EF444410' : colors.background, borderColor: formData.leftEarSTS ? '#EF4444' : colors.border },
            ]}
            onPress={() => {
              updateFormData('leftEarSTS', !formData.leftEarSTS);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View style={[styles.stsCheckboxIcon, { backgroundColor: formData.leftEarSTS ? '#EF4444' : colors.border }]}>
              {formData.leftEarSTS && <Check size={12} color="#fff" />}
            </View>
            <Text style={[styles.stsCheckboxLabel, { color: formData.leftEarSTS ? '#EF4444' : colors.text }]}>
              Left Ear STS
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.stsCheckbox,
              { backgroundColor: formData.rightEarSTS ? '#EF444410' : colors.background, borderColor: formData.rightEarSTS ? '#EF4444' : colors.border },
            ]}
            onPress={() => {
              updateFormData('rightEarSTS', !formData.rightEarSTS);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View style={[styles.stsCheckboxIcon, { backgroundColor: formData.rightEarSTS ? '#EF4444' : colors.border }]}>
              {formData.rightEarSTS && <Check size={12} color="#fff" />}
            </View>
            <Text style={[styles.stsCheckboxLabel, { color: formData.rightEarSTS ? '#EF4444' : colors.text }]}>
              Right Ear STS
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[
          styles.checkboxRow,
          { backgroundColor: colors.surface, borderColor: formData.referralRequired ? '#F97316' : colors.border },
        ]}
        onPress={() => {
          updateFormData('referralRequired', !formData.referralRequired);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View style={[
          styles.checkbox,
          { backgroundColor: formData.referralRequired ? '#F97316' : colors.background, borderColor: formData.referralRequired ? '#F97316' : colors.border },
        ]}>
          {formData.referralRequired && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.checkboxContent}>
          <Text style={[styles.checkboxTitle, { color: colors.text }]}>Referral Required</Text>
          <Text style={[styles.checkboxSubtitle, { color: colors.textSecondary }]}>
            Employee requires referral to physician/audiologist
          </Text>
        </View>
      </Pressable>

      {formData.referralRequired && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Reason for referral..."
          placeholderTextColor={colors.textSecondary}
          value={formData.referralReason}
          onChangeText={(text) => updateFormData('referralReason', text)}
        />
      )}

      <Pressable
        style={[
          styles.checkboxRow,
          { backgroundColor: colors.surface, borderColor: formData.employeeNotified ? '#10B981' : colors.border },
        ]}
        onPress={() => {
          updateFormData('employeeNotified', !formData.employeeNotified);
          if (!formData.employeeNotified) {
            updateFormData('notificationDate', new Date().toISOString().split('T')[0]);
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View style={[
          styles.checkbox,
          { backgroundColor: formData.employeeNotified ? '#10B981' : colors.background, borderColor: formData.employeeNotified ? '#10B981' : colors.border },
        ]}>
          {formData.employeeNotified && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.checkboxContent}>
          <Text style={[styles.checkboxTitle, { color: colors.text }]}>Employee Notified of Results</Text>
          <Text style={[styles.checkboxSubtitle, { color: colors.textSecondary }]}>
            Required within 21 days of determination
          </Text>
        </View>
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Additional notes..."
        placeholderTextColor={colors.textSecondary}
        value={formData.notes}
        onChangeText={(text) => updateFormData('notes', text)}
        multiline
        numberOfLines={3}
      />

      <View style={styles.actionButtons}>
        <Pressable
          style={[styles.resetButton, { borderColor: colors.border }]}
          onPress={() => setFormData(initialFormData)}
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
              <FileText size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Record</Text>
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
      {testHistory.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ear size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Test Records</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Submit your first hearing test to see it here
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Testing Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: colors.primary }]}>{testHistory.length}</Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Tests</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#EF4444' }]}>
                  {testHistory.filter(r => r.stsDetected).length}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>STS Detected</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#F97316' }]}>
                  {testHistory.filter(r => r.referralRequired).length}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Referrals</Text>
              </View>
            </View>
          </View>

          {testHistory.map((record) => (
            <Pressable
              key={record.id}
              style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedRecord(expandedRecord === record.id ? null : record.id);
              }}
            >
              <View style={styles.historyHeader}>
                <View style={styles.historyHeaderLeft}>
                  <View style={[styles.historyIcon, { backgroundColor: '#F59E0B20' }]}>
                    <Ear size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.historyTitleContainer}>
                    <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
                      {record.employeeName}
                    </Text>
                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                      {new Date(record.testDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyHeaderRight}>
                  {record.stsDetected && (
                    <View style={[styles.stsBadge, { backgroundColor: '#EF444415' }]}>
                      <TrendingDown size={12} color="#EF4444" />
                      <Text style={[styles.stsBadgeText, { color: '#EF4444' }]}>STS</Text>
                    </View>
                  )}
                  <ChevronRight
                    size={18}
                    color={colors.textSecondary}
                    style={{ transform: [{ rotate: expandedRecord === record.id ? '90deg' : '0deg' }] }}
                  />
                </View>
              </View>

              <View style={styles.historyMeta}>
                <View style={styles.historyMetaItem}>
                  <View style={[styles.typeDot, { backgroundColor: getTestTypeColor(record.testType), width: 8, height: 8 }]} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                    {TEST_TYPES.find(t => t.id === record.testType)?.label}
                  </Text>
                </View>
                <View style={styles.historyMetaItem}>
                  <Building2 size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                    {record.department || 'N/A'}
                  </Text>
                </View>
              </View>

              {expandedRecord === record.id && (
                <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                  <View style={styles.expandedRow}>
                    <View style={styles.expandedItem}>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Employee ID</Text>
                      <Text style={[styles.expandedValue, { color: colors.text }]}>{record.employeeId || 'N/A'}</Text>
                    </View>
                    <View style={styles.expandedItem}>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Examiner</Text>
                      <Text style={[styles.expandedValue, { color: colors.text }]}>{record.examinerName}</Text>
                    </View>
                  </View>
                  <View style={styles.expandedRow}>
                    <View style={styles.expandedItem}>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Referral</Text>
                      <Text style={[styles.expandedValue, { color: record.referralRequired ? '#F97316' : '#10B981' }]}>
                        {record.referralRequired ? 'Required' : 'Not Required'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </Pressable>
          ))}
        </>
      )}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: '#F59E0B', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('new')}
        >
          <Plus size={18} color={activeTab === 'new' ? '#F59E0B' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#F59E0B' : colors.textSecondary }]}>
            New Test
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#F59E0B', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? '#F59E0B' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#F59E0B' : colors.textSecondary }]}>
            History ({testHistory.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'new' ? renderNewTab() : renderHistoryTab()}

      <Modal
        visible={showTestTypePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTestTypePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTestTypePicker(false)}>
          <View style={[styles.typeModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.typeModalTitle, { color: colors.text }]}>Test Type</Text>
            {TEST_TYPES.map((type) => (
              <Pressable
                key={type.id}
                style={[styles.typeOption, { borderBottomColor: colors.border }]}
                onPress={() => {
                  updateFormData('testType', type.id as any);
                  setShowTestTypePicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.typeDot, { backgroundColor: type.color }]} />
                <View style={styles.typeOptionContent}>
                  <Text style={[styles.typeOptionLabel, { color: colors.text }]}>{type.label}</Text>
                  <Text style={[styles.typeOptionDesc, { color: colors.textSecondary }]}>{type.description}</Text>
                </View>
                {formData.testType === type.id && <Check size={18} color={type.color} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showProtectionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProtectionPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowProtectionPicker(false)}>
          <View style={[styles.protectionModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.protectionModalTitle, { color: colors.text }]}>Hearing Protection</Text>
            <ScrollView style={styles.protectionList}>
              {HEARING_PROTECTION.map((item) => (
                <Pressable
                  key={item}
                  style={[styles.protectionOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    updateFormData('hearingProtectionUsed', item);
                    setShowProtectionPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.protectionOptionText, { color: colors.text }]}>{item}</Text>
                  {formData.hearingProtectionUsed === item && <Check size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
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
  title: { fontSize: 22, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' as const },
  subtitle: { fontSize: 13, textAlign: 'center' as const, lineHeight: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '600' as const, marginBottom: 12, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '500' as const, marginBottom: 6 },
  input: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, marginBottom: 12 },
  textArea: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top' as const, marginBottom: 12 },
  row: { flexDirection: 'row' as const, gap: 12, marginBottom: 12 },
  halfField: { flex: 1 },
  dateField: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, gap: 10 },
  dateInput: { flex: 1, paddingVertical: 14, fontSize: 15 },
  inputWithIcon: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12, gap: 10 },
  inputField: { flex: 1, paddingVertical: 14, fontSize: 15 },
  selector: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  selectorText: { flex: 1, fontSize: 15 },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  audiogramCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' as const, marginBottom: 16 },
  audiogramHeader: { flexDirection: 'row' as const, backgroundColor: 'rgba(0,0,0,0.03)' },
  audiogramHeaderCell: { flex: 1, paddingVertical: 10, alignItems: 'center' as const },
  audiogramHeaderText: { fontSize: 13, fontWeight: '600' as const },
  audiogramRow: { flexDirection: 'row' as const, borderTopWidth: 1 },
  audiogramFreqCell: { flex: 1, paddingVertical: 8, alignItems: 'center' as const, justifyContent: 'center' as const },
  audiogramFreqText: { fontSize: 13, fontWeight: '500' as const },
  audiogramInputCell: { flex: 1, padding: 6, alignItems: 'center' as const },
  audiogramInput: { width: 50, height: 36, borderRadius: 6, borderWidth: 1, textAlign: 'center' as const, fontSize: 14, fontWeight: '600' as const },
  ptaRow: { flexDirection: 'row' as const, borderTopWidth: 1, paddingVertical: 10 },
  ptaCell: { flex: 1, justifyContent: 'center' as const, paddingLeft: 12 },
  ptaLabel: { fontSize: 12, fontWeight: '500' as const },
  ptaResultCell: { flex: 1, alignItems: 'center' as const },
  ptaValue: { fontSize: 18, fontWeight: '700' as const },
  ptaBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  ptaBadgeText: { fontSize: 9, fontWeight: '600' as const },
  stsCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' as const, marginBottom: 12 },
  stsBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 10, gap: 8 },
  stsBannerText: { fontSize: 12, fontWeight: '500' as const },
  stsCheckboxes: { flexDirection: 'row' as const, gap: 10, padding: 12 },
  stsCheckbox: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderRadius: 8, borderWidth: 1, gap: 10 },
  stsCheckboxIcon: { width: 20, height: 20, borderRadius: 4, alignItems: 'center' as const, justifyContent: 'center' as const },
  stsCheckboxLabel: { fontSize: 13, fontWeight: '600' as const },
  checkboxRow: { flexDirection: 'row' as const, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12, marginTop: 2 },
  checkboxContent: { flex: 1 },
  checkboxTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 2 },
  checkboxSubtitle: { fontSize: 12, lineHeight: 16 },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 16 },
  resetButton: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  resetButtonText: { fontSize: 15, fontWeight: '600' as const },
  submitButton: { flex: 2, flexDirection: 'row' as const, paddingVertical: 14, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  emptyState: { borderRadius: 16, padding: 48, alignItems: 'center' as const, borderWidth: 1, marginTop: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' as const },
  summaryCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12, textAlign: 'center' as const },
  summaryStats: { flexDirection: 'row' as const, alignItems: 'center' as const },
  summaryStatItem: { flex: 1, alignItems: 'center' as const },
  summaryStatValue: { fontSize: 22, fontWeight: '700' as const },
  summaryStatLabel: { fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, height: 30 },
  historyCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  historyHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 8 },
  historyHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1 },
  historyIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12 },
  historyTitleContainer: { flex: 1 },
  historyTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 2 },
  historyDate: { fontSize: 12 },
  historyHeaderRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  stsBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 4 },
  stsBadgeText: { fontSize: 10, fontWeight: '600' as const },
  historyMeta: { flexDirection: 'row' as const, gap: 16 },
  historyMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  historyMetaText: { fontSize: 12 },
  expandedContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  expandedRow: { flexDirection: 'row' as const, gap: 20, marginBottom: 8 },
  expandedItem: { flex: 1 },
  expandedLabel: { fontSize: 11, marginBottom: 2 },
  expandedValue: { fontSize: 14, fontWeight: '500' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const, alignItems: 'center' as const },
  typeModal: { width: '85%', borderRadius: 12, padding: 16 },
  typeModalTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12, textAlign: 'center' as const },
  typeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  typeOptionContent: { flex: 1 },
  typeOptionLabel: { fontSize: 15, fontWeight: '500' as const },
  typeOptionDesc: { fontSize: 12, marginTop: 2 },
  protectionModal: { width: '85%', maxHeight: '60%', borderRadius: 12, padding: 16 },
  protectionModalTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12, textAlign: 'center' as const },
  protectionList: { maxHeight: 300 },
  protectionOption: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 12, borderBottomWidth: 1 },
  protectionOptionText: { fontSize: 15 },
  bottomPadding: { height: 32 },
});
