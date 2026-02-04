import React, { useState, useCallback } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import {
  Forklift,
  Plus,
  Calendar,
  User,
  X,
  Check,
  ChevronDown,
  History,
  CheckCircle2,
  ArrowLeft,
  Award,
  FileText,
  ClipboardCheck,
  Building2,
  Truck,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const FORKLIFT_TYPES = [
  { id: 'sit_down_counterbalance', name: 'Class I - Sit-Down Counterbalance (Electric)', category: 'Electric Motor Rider' },
  { id: 'narrow_aisle', name: 'Class II - Narrow Aisle (Electric)', category: 'Electric Motor Narrow Aisle' },
  { id: 'electric_hand', name: 'Class III - Electric Hand Trucks', category: 'Electric Motor Hand' },
  { id: 'cushion_ic', name: 'Class IV - Cushion Tire IC', category: 'Internal Combustion Engine' },
  { id: 'pneumatic_ic', name: 'Class V - Pneumatic Tire IC', category: 'Internal Combustion Engine' },
  { id: 'electric_sit_rider', name: 'Class VI - Electric Sit-Down Rider', category: 'Electric Tow Tractors' },
  { id: 'rough_terrain', name: 'Class VII - Rough Terrain', category: 'Rough Terrain' },
  { id: 'pallet_jack', name: 'Electric Pallet Jack', category: 'Pallet Equipment' },
  { id: 'order_picker', name: 'Order Picker', category: 'Warehouse Equipment' },
  { id: 'reach_truck', name: 'Reach Truck', category: 'Warehouse Equipment' },
];

const EVALUATION_CRITERIA = [
  { id: 'pre_op', name: 'Pre-Operation Inspection', description: 'Demonstrates proper daily inspection procedures' },
  { id: 'startup', name: 'Startup Procedure', description: 'Follows correct startup sequence and safety checks' },
  { id: 'travel_unloaded', name: 'Travel - Unloaded', description: 'Safe operation while traveling without load' },
  { id: 'travel_loaded', name: 'Travel - Loaded', description: 'Safe operation while traveling with load' },
  { id: 'picking', name: 'Load Picking', description: 'Proper approach, lift, and securing of loads' },
  { id: 'stacking', name: 'Load Stacking', description: 'Safe stacking and placement of loads' },
  { id: 'pedestrian', name: 'Pedestrian Safety', description: 'Awareness and yielding to pedestrians' },
  { id: 'ramp_dock', name: 'Ramp/Dock Operation', description: 'Safe operation on ramps and loading docks' },
  { id: 'narrow_aisle_op', name: 'Narrow Aisle Navigation', description: 'Maneuvering in confined spaces' },
  { id: 'parking', name: 'Parking Procedure', description: 'Proper shutdown and parking procedures' },
  { id: 'refueling', name: 'Refueling/Charging', description: 'Safe refueling or battery charging' },
  { id: 'emergency', name: 'Emergency Procedures', description: 'Response to tip-over, fire, or malfunction' },
];

const DEPARTMENTS = [
  'Warehouse',
  'Shipping/Receiving',
  'Production',
  'Maintenance',
  'Quality',
  'Cold Storage',
];

interface CertFormData {
  operatorName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  hireDate: string;
  forkliftTypes: string[];
  trainingDate: string;
  trainingHours: string;
  classroomHours: string;
  practicalHours: string;
  trainerName: string;
  trainerCertNumber: string;
  evaluationDate: string;
  evaluatorName: string;
  evaluationCriteria: { id: string; passed: boolean; notes: string }[];
  writtenTestScore: string;
  writtenTestPassed: boolean;
  practicalTestPassed: boolean;
  certificationNumber: string;
  certificationDate: string;
  expirationDate: string;
  restrictions: string;
  operatorSignature: boolean;
  evaluatorSignature: boolean;
  supervisorName: string;
  supervisorSignature: boolean;
  notes: string;
}

interface CertRecord {
  id: string;
  operatorName: string;
  employeeId: string;
  department: string;
  forkliftTypes: string[];
  certificationDate: string;
  expirationDate: string;
  status: 'active' | 'expiring' | 'expired';
  trainerName: string;
}

const initialFormData: CertFormData = {
  operatorName: '',
  employeeId: '',
  department: '',
  jobTitle: '',
  hireDate: '',
  forkliftTypes: [],
  trainingDate: new Date().toISOString().split('T')[0],
  trainingHours: '',
  classroomHours: '',
  practicalHours: '',
  trainerName: '',
  trainerCertNumber: '',
  evaluationDate: new Date().toISOString().split('T')[0],
  evaluatorName: '',
  evaluationCriteria: EVALUATION_CRITERIA.map(c => ({ id: c.id, passed: false, notes: '' })),
  writtenTestScore: '',
  writtenTestPassed: false,
  practicalTestPassed: false,
  certificationNumber: '',
  certificationDate: new Date().toISOString().split('T')[0],
  expirationDate: '',
  restrictions: '',
  operatorSignature: false,
  evaluatorSignature: false,
  supervisorName: '',
  supervisorSignature: false,
  notes: '',
};

export default function ForkliftCertScreen() {
  const { colors } = useTheme();
  useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<CertFormData>(initialFormData);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  
  const [expandedSection, setExpandedSection] = useState<string | null>('operator');

  const [records] = useState<CertRecord[]>([
    {
      id: '1',
      operatorName: 'Carlos Rodriguez',
      employeeId: 'EMP045',
      department: 'Warehouse',
      forkliftTypes: ['sit_down_counterbalance', 'pallet_jack'],
      certificationDate: '2024-08-15',
      expirationDate: '2027-08-15',
      status: 'active',
      trainerName: 'Mike Thompson',
    },
    {
      id: '2',
      operatorName: 'Jennifer Lee',
      employeeId: 'EMP078',
      department: 'Shipping/Receiving',
      forkliftTypes: ['reach_truck', 'order_picker'],
      certificationDate: '2022-03-20',
      expirationDate: '2025-03-20',
      status: 'expiring',
      trainerName: 'Mike Thompson',
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleInputChange = useCallback((field: keyof CertFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleForkliftType = useCallback((typeId: string) => {
    setFormData(prev => ({
      ...prev,
      forkliftTypes: prev.forkliftTypes.includes(typeId)
        ? prev.forkliftTypes.filter(t => t !== typeId)
        : [...prev.forkliftTypes, typeId],
    }));
  }, []);

  const updateEvaluationCriteria = useCallback((criteriaId: string, field: 'passed' | 'notes', value: any) => {
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: prev.evaluationCriteria.map(c =>
        c.id === criteriaId ? { ...c, [field]: value } : c
      ),
    }));
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!formData.operatorName.trim()) {
      Alert.alert('Validation Error', 'Operator name is required');
      return false;
    }
    if (!formData.employeeId.trim()) {
      Alert.alert('Validation Error', 'Employee ID is required');
      return false;
    }
    if (formData.forkliftTypes.length === 0) {
      Alert.alert('Validation Error', 'At least one forklift type must be selected');
      return false;
    }
    if (!formData.trainerName.trim()) {
      Alert.alert('Validation Error', 'Trainer name is required');
      return false;
    }
    if (!formData.operatorSignature) {
      Alert.alert('Validation Error', 'Operator signature is required');
      return false;
    }
    if (!formData.evaluatorSignature) {
      Alert.alert('Validation Error', 'Evaluator signature is required');
      return false;
    }
    return true;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('[ForkliftCert] Submitting OCR record:', formData);
      
      Alert.alert(
        'OCR Record Created',
        `Forklift certification for ${formData.operatorName} has been saved successfully. Certificate #: ${formData.certificationNumber || 'Auto-generated'}`,
        [{ text: 'OK', onPress: () => setFormData(initialFormData) }]
      );
    } catch (error) {
      console.error('[ForkliftCert] Submit error:', error);
      Alert.alert('Error', 'Failed to save record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'expiring': return '#F59E0B';
      case 'expired': return '#EF4444';
      default: return '#6B7280';
    }
  }, []);

  const toggleSection = useCallback((section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSection(prev => prev === section ? null : section);
  }, []);

  const passedCriteriaCount = formData.evaluationCriteria.filter(c => c.passed).length;

  const renderNewForm = () => (
    <View style={styles.formContainer}>
      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('operator')}
      >
        <View style={styles.sectionHeaderLeft}>
          <User size={20} color="#F97316" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Operator Information</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'operator' ? '180deg' : '0deg' }] }} />
      </Pressable>
      
      {expandedSection === 'operator' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Operator Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.operatorName}
              onChangeText={(value) => handleInputChange('operatorName', value)}
              placeholder="Enter operator full name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Employee ID *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.employeeId}
                onChangeText={(value) => handleInputChange('employeeId', value)}
                placeholder="EMP-XXXX"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Hire Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.hireDate}
                onChangeText={(value) => handleInputChange('hireDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Department</Text>
            <Pressable
              style={[styles.picker, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowDepartmentPicker(true)}
            >
              <Building2 size={18} color={colors.textSecondary} />
              <Text style={[styles.pickerText, { color: formData.department ? colors.text : colors.textSecondary }]}>
                {formData.department || 'Select department'}
              </Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Job Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.jobTitle}
              onChangeText={(value) => handleInputChange('jobTitle', value)}
              placeholder="Enter job title"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('equipment')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Forklift size={20} color="#F97316" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Equipment Authorization</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'equipment' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'equipment' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Forklift Types Authorized *</Text>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Select all equipment types the operator is being certified to operate
          </Text>
          
          {FORKLIFT_TYPES.map((type) => (
            <Pressable
              key={type.id}
              style={[styles.checkboxRow, { borderColor: colors.border }]}
              onPress={() => toggleForkliftType(type.id)}
            >
              {formData.forkliftTypes.includes(type.id) ? (
                <CheckCircle2 size={22} color="#F97316" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.checkboxContent}>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>{type.name}</Text>
                <Text style={[styles.checkboxMeta, { color: colors.textSecondary }]}>{type.category}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('training')}
      >
        <View style={styles.sectionHeaderLeft}>
          <FileText size={20} color="#F97316" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Training Details</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'training' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'training' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Training Date *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.trainingDate}
                onChangeText={(value) => handleInputChange('trainingDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Total Hours</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.trainingHours}
                onChangeText={(value) => handleInputChange('trainingHours', value)}
                placeholder="e.g., 8"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Classroom Hours</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.classroomHours}
                onChangeText={(value) => handleInputChange('classroomHours', value)}
                placeholder="e.g., 4"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Practical Hours</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.practicalHours}
                onChangeText={(value) => handleInputChange('practicalHours', value)}
                placeholder="e.g., 4"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Trainer Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.trainerName}
              onChangeText={(value) => handleInputChange('trainerName', value)}
              placeholder="Enter certified trainer name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Trainer Certification #</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.trainerCertNumber}
              onChangeText={(value) => handleInputChange('trainerCertNumber', value)}
              placeholder="Trainer's certification number"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('evaluation')}
      >
        <View style={styles.sectionHeaderLeft}>
          <ClipboardCheck size={20} color="#F97316" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Practical Evaluation</Text>
          <View style={[styles.badge, { backgroundColor: passedCriteriaCount === EVALUATION_CRITERIA.length ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: passedCriteriaCount === EVALUATION_CRITERIA.length ? '#10B981' : '#F59E0B' }]}>
              {passedCriteriaCount}/{EVALUATION_CRITERIA.length}
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'evaluation' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'evaluation' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Evaluation Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.evaluationDate}
                onChangeText={(value) => handleInputChange('evaluationDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Evaluator Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.evaluatorName}
                onChangeText={(value) => handleInputChange('evaluatorName', value)}
                placeholder="Enter name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <Text style={[styles.subLabel, { color: colors.text }]}>Evaluation Criteria</Text>
          
          {EVALUATION_CRITERIA.map((criteria) => {
            const evalItem = formData.evaluationCriteria.find(c => c.id === criteria.id);
            return (
              <View key={criteria.id} style={[styles.criteriaCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Pressable
                  style={styles.criteriaHeader}
                  onPress={() => updateEvaluationCriteria(criteria.id, 'passed', !evalItem?.passed)}
                >
                  {evalItem?.passed ? (
                    <CheckCircle2 size={22} color="#10B981" />
                  ) : (
                    <View style={[styles.checkbox, { borderColor: colors.border }]} />
                  )}
                  <View style={styles.criteriaInfo}>
                    <Text style={[styles.criteriaName, { color: colors.text }]}>{criteria.name}</Text>
                    <Text style={[styles.criteriaDesc, { color: colors.textSecondary }]}>{criteria.description}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Written Test Score</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.writtenTestScore}
                onChangeText={(value) => handleInputChange('writtenTestScore', value)}
                placeholder="e.g., 85%"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Pressable
                style={[styles.passFailButton, { 
                  backgroundColor: formData.writtenTestPassed ? '#10B98115' : colors.background,
                  borderColor: formData.writtenTestPassed ? '#10B981' : colors.border,
                }]}
                onPress={() => handleInputChange('writtenTestPassed', !formData.writtenTestPassed)}
              >
                {formData.writtenTestPassed ? (
                  <CheckCircle2 size={18} color="#10B981" />
                ) : (
                  <X size={18} color={colors.textSecondary} />
                )}
                <Text style={[styles.passFailText, { color: formData.writtenTestPassed ? '#10B981' : colors.textSecondary }]}>
                  {formData.writtenTestPassed ? 'Passed' : 'Not Passed'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.passFailButton, { 
              backgroundColor: formData.practicalTestPassed ? '#10B98115' : colors.background,
              borderColor: formData.practicalTestPassed ? '#10B981' : colors.border,
              marginTop: 8,
            }]}
            onPress={() => handleInputChange('practicalTestPassed', !formData.practicalTestPassed)}
          >
            {formData.practicalTestPassed ? (
              <CheckCircle2 size={18} color="#10B981" />
            ) : (
              <X size={18} color={colors.textSecondary} />
            )}
            <Text style={[styles.passFailText, { color: formData.practicalTestPassed ? '#10B981' : colors.textSecondary }]}>
              Practical Evaluation {formData.practicalTestPassed ? 'Passed' : 'Not Passed'}
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('certification')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Award size={20} color="#F97316" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Certification & Signatures</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'certification' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'certification' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Certification #</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.certificationNumber}
                onChangeText={(value) => handleInputChange('certificationNumber', value)}
                placeholder="Auto-generated"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Cert. Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.certificationDate}
                onChangeText={(value) => handleInputChange('certificationDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Expiration Date (3 years from cert)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.expirationDate}
              onChangeText={(value) => handleInputChange('expirationDate', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Restrictions (if any)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.restrictions}
              onChangeText={(value) => handleInputChange('restrictions', value)}
              placeholder="e.g., Indoor use only, No propane units, etc."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={[styles.signatureSection, { borderColor: colors.border }]}>
            <Text style={[styles.signatureSectionTitle, { color: colors.text }]}>Required Signatures</Text>
            
            <Pressable
              style={[styles.signatureBox, { 
                backgroundColor: formData.operatorSignature ? '#10B98115' : colors.background,
                borderColor: formData.operatorSignature ? '#10B981' : colors.border,
              }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleInputChange('operatorSignature', !formData.operatorSignature);
              }}
            >
              {formData.operatorSignature ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.signatureContent}>
                <Text style={[styles.signatureLabel, { color: colors.text }]}>Operator Signature *</Text>
                <Text style={[styles.signatureSubtext, { color: colors.textSecondary }]}>
                  I acknowledge receiving training and agree to operate equipment safely
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.signatureBox, { 
                backgroundColor: formData.evaluatorSignature ? '#10B98115' : colors.background,
                borderColor: formData.evaluatorSignature ? '#10B981' : colors.border,
              }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleInputChange('evaluatorSignature', !formData.evaluatorSignature);
              }}
            >
              {formData.evaluatorSignature ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.signatureContent}>
                <Text style={[styles.signatureLabel, { color: colors.text }]}>Evaluator Signature *</Text>
                <Text style={[styles.signatureSubtext, { color: colors.textSecondary }]}>
                  I certify the operator has completed required training and demonstrated competency
                </Text>
              </View>
            </Pressable>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Supervisor Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.supervisorName}
                onChangeText={(value) => handleInputChange('supervisorName', value)}
                placeholder="Enter supervisor name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <Pressable
              style={[styles.signatureBox, { 
                backgroundColor: formData.supervisorSignature ? '#10B98115' : colors.background,
                borderColor: formData.supervisorSignature ? '#10B981' : colors.border,
              }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleInputChange('supervisorSignature', !formData.supervisorSignature);
              }}
            >
              {formData.supervisorSignature ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.signatureContent}>
                <Text style={[styles.signatureLabel, { color: colors.text }]}>Supervisor Signature</Text>
                <Text style={[styles.signatureSubtext, { color: colors.textSecondary }]}>
                  Supervisor authorization for operator certification
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Additional Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.notes}
              onChangeText={(value) => handleInputChange('notes', value)}
              placeholder="Any additional comments or observations"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      )}

      <Pressable
        style={[styles.submitButton, { backgroundColor: '#F97316', opacity: isSubmitting ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Award size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Save Forklift Certification OCR</Text>
          </>
        )}
      </Pressable>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.historyContainer}>
      {records.map((record) => (
        <Pressable
          key={record.id}
          style={[styles.recordCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.recordHeader}>
            <View style={[styles.recordIcon, { backgroundColor: '#F9731615' }]}>
              <Forklift size={24} color="#F97316" />
            </View>
            <View style={styles.recordInfo}>
              <Text style={[styles.recordName, { color: colors.text }]}>{record.operatorName}</Text>
              <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                {record.employeeId} • {record.department}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + '15' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                {record.status === 'active' ? 'Active' : record.status === 'expiring' ? 'Expiring' : 'Expired'}
              </Text>
            </View>
          </View>

          <View style={styles.recordDetails}>
            <View style={styles.recordDetail}>
              <Truck size={14} color={colors.textSecondary} />
              <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                {record.forkliftTypes.length} equipment type(s)
              </Text>
            </View>
            <View style={styles.recordDetail}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                Expires: {record.expirationDate}
              </Text>
            </View>
          </View>

          <View style={styles.recordFooter}>
            <Text style={[styles.recordTrainer, { color: colors.textSecondary }]}>
              Trainer: {record.trainerName}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Forklift Certification OCR',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'new' && { backgroundColor: '#F97316' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('new');
          }}
        >
          <Plus size={18} color={activeTab === 'new' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#FFFFFF' : colors.textSecondary }]}>
            New Certification
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { backgroundColor: '#F97316' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('history');
          }}
        >
          <History size={18} color={activeTab === 'history' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#FFFFFF' : colors.textSecondary }]}>
            Certifications
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {activeTab === 'new' ? renderNewForm() : renderHistory()}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showDepartmentPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Department</Text>
              <Pressable onPress={() => setShowDepartmentPicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {DEPARTMENTS.map((dept) => (
                <Pressable
                  key={dept}
                  style={[styles.modalItem, { borderColor: colors.border }]}
                  onPress={() => {
                    handleInputChange('department', dept);
                    setShowDepartmentPicker(false);
                  }}
                >
                  <Building2 size={20} color={colors.textSecondary} />
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{dept}</Text>
                  {formData.department === dept && <Check size={20} color="#F97316" />}
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
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  tabContainer: {
    flexDirection: 'row' as const,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  formContainer: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginTop: -8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 70,
    textAlignVertical: 'top' as const,
  },
  row: {
    flexDirection: 'row' as const,
  },
  picker: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
  },
  checkboxRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  checkboxMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  criteriaCard: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  criteriaHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  criteriaInfo: {
    flex: 1,
  },
  criteriaName: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  criteriaDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  passFailButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginTop: 20,
  },
  passFailText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  signatureSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
  },
  signatureSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  signatureBox: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  signatureContent: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  signatureSubtext: {
    fontSize: 12,
    lineHeight: 16,
  },
  submitButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  historyContainer: {
    gap: 12,
  },
  recordCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  recordHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  recordMeta: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  recordDetails: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 10,
  },
  recordDetail: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  recordDetailText: {
    fontSize: 13,
  },
  recordFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  recordTrainer: {
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
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalList: {
    padding: 16,
  },
  modalItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  bottomPadding: {
    height: 32,
  },
});
