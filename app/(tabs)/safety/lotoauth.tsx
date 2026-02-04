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
  Lock,
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
  Shield,
  Zap,
  Settings,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const EQUIPMENT_CATEGORIES = [
  { id: 'electrical', name: 'Electrical Equipment', description: 'Switchgear, panels, motors, transformers' },
  { id: 'mechanical', name: 'Mechanical Equipment', description: 'Conveyor systems, presses, mixers' },
  { id: 'hydraulic', name: 'Hydraulic Systems', description: 'Presses, lifts, power units' },
  { id: 'pneumatic', name: 'Pneumatic Systems', description: 'Air compressors, actuators, valves' },
  { id: 'thermal', name: 'Thermal/Steam Systems', description: 'Boilers, heat exchangers, steam lines' },
  { id: 'chemical', name: 'Chemical Systems', description: 'Tanks, piping, process equipment' },
  { id: 'ammonia', name: 'Ammonia Refrigeration', description: 'Compressors, evaporators, condensers' },
  { id: 'production', name: 'Production Equipment', description: 'Processing lines, packaging equipment' },
];

const TRAINING_TOPICS = [
  { id: 'purpose', name: 'Purpose of LOTO', description: 'Understanding why LOTO is necessary' },
  { id: 'recognition', name: 'Energy Source Recognition', description: 'Identifying all hazardous energy sources' },
  { id: 'types', name: 'Types of Energy', description: 'Electrical, mechanical, hydraulic, pneumatic, thermal, chemical' },
  { id: 'procedures', name: 'LOTO Procedures', description: 'Step-by-step lockout/tagout procedures' },
  { id: 'devices', name: 'Locks, Tags & Devices', description: 'Proper use of LOTO equipment' },
  { id: 'verification', name: 'Energy Isolation Verification', description: 'Testing for zero energy state' },
  { id: 'removal', name: 'Lock Removal Procedures', description: 'Safe removal of locks and tags' },
  { id: 'group', name: 'Group Lockout', description: 'Multi-person and shift change procedures' },
  { id: 'contractors', name: 'Contractor LOTO', description: 'Requirements for outside contractors' },
  { id: 'emergency', name: 'Emergency Removal', description: 'Procedures when employee is unavailable' },
];

const COMPETENCY_CRITERIA = [
  { id: 'identify', name: 'Identify Energy Sources', description: 'Can identify all hazardous energy sources on assigned equipment' },
  { id: 'locate', name: 'Locate Isolation Points', description: 'Knows locations of all energy isolation devices' },
  { id: 'apply', name: 'Apply LOTO Devices', description: 'Correctly applies locks and tags to isolation points' },
  { id: 'verify', name: 'Verify Zero Energy', description: 'Properly tests for absence of energy' },
  { id: 'document', name: 'Complete Documentation', description: 'Correctly fills out LOTO permits and logs' },
  { id: 'communicate', name: 'Communicate with Team', description: 'Properly notifies affected employees' },
  { id: 'remove', name: 'Safe Removal', description: 'Follows proper procedure to remove locks' },
  { id: 'emergency_proc', name: 'Emergency Procedures', description: 'Knows what to do in emergency situations' },
];

const DEPARTMENTS = [
  'Maintenance',
  'Production',
  'Engineering',
  'Facilities',
  'Quality',
  'Warehouse',
  'Sanitation',
];

const AUTHORIZATION_LEVELS = [
  { id: 'authorized', name: 'Authorized Employee', description: 'Can apply LOTO on assigned equipment' },
  { id: 'affected', name: 'Affected Employee', description: 'Works in area where LOTO is performed' },
  { id: 'supervisor', name: 'LOTO Supervisor', description: 'Can oversee group lockout procedures' },
  { id: 'trainer', name: 'LOTO Trainer', description: 'Authorized to train others on LOTO' },
];

interface AuthFormData {
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  hireDate: string;
  authorizationLevel: string;
  equipmentCategories: string[];
  specificEquipment: string;
  trainingDate: string;
  trainingHours: string;
  trainingTopics: string[];
  trainerName: string;
  trainerCertNumber: string;
  competencyDate: string;
  evaluatorName: string;
  competencyCriteria: { id: string; passed: boolean; notes: string }[];
  writtenTestScore: string;
  writtenTestPassed: boolean;
  practicalTestPassed: boolean;
  authorizationNumber: string;
  authorizationDate: string;
  expirationDate: string;
  restrictions: string;
  employeeSignature: boolean;
  evaluatorSignature: boolean;
  supervisorName: string;
  supervisorSignature: boolean;
  safetyManagerSignature: boolean;
  notes: string;
}

interface AuthRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  authorizationLevel: string;
  equipmentCategories: string[];
  authorizationDate: string;
  expirationDate: string;
  status: 'active' | 'expiring' | 'expired';
  trainerName: string;
}

const initialFormData: AuthFormData = {
  employeeName: '',
  employeeId: '',
  department: '',
  jobTitle: '',
  hireDate: '',
  authorizationLevel: '',
  equipmentCategories: [],
  specificEquipment: '',
  trainingDate: new Date().toISOString().split('T')[0],
  trainingHours: '',
  trainingTopics: [],
  trainerName: '',
  trainerCertNumber: '',
  competencyDate: new Date().toISOString().split('T')[0],
  evaluatorName: '',
  competencyCriteria: COMPETENCY_CRITERIA.map(c => ({ id: c.id, passed: false, notes: '' })),
  writtenTestScore: '',
  writtenTestPassed: false,
  practicalTestPassed: false,
  authorizationNumber: '',
  authorizationDate: new Date().toISOString().split('T')[0],
  expirationDate: '',
  restrictions: '',
  employeeSignature: false,
  evaluatorSignature: false,
  supervisorName: '',
  supervisorSignature: false,
  safetyManagerSignature: false,
  notes: '',
};

export default function LOTOAuthScreen() {
  const { colors } = useTheme();
  useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<AuthFormData>(initialFormData);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('employee');

  const [records] = useState<AuthRecord[]>([
    {
      id: '1',
      employeeName: 'Michael Thompson',
      employeeId: 'EMP032',
      department: 'Maintenance',
      authorizationLevel: 'authorized',
      equipmentCategories: ['electrical', 'mechanical', 'pneumatic'],
      authorizationDate: '2024-06-15',
      expirationDate: '2025-06-15',
      status: 'active',
      trainerName: 'Robert Chen',
    },
    {
      id: '2',
      employeeName: 'Sarah Williams',
      employeeId: 'EMP089',
      department: 'Production',
      authorizationLevel: 'authorized',
      equipmentCategories: ['production', 'mechanical'],
      authorizationDate: '2024-02-10',
      expirationDate: '2025-02-10',
      status: 'expiring',
      trainerName: 'Robert Chen',
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleInputChange = useCallback((field: keyof AuthFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleEquipmentCategory = useCallback((categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      equipmentCategories: prev.equipmentCategories.includes(categoryId)
        ? prev.equipmentCategories.filter(c => c !== categoryId)
        : [...prev.equipmentCategories, categoryId],
    }));
  }, []);

  const toggleTrainingTopic = useCallback((topicId: string) => {
    setFormData(prev => ({
      ...prev,
      trainingTopics: prev.trainingTopics.includes(topicId)
        ? prev.trainingTopics.filter(t => t !== topicId)
        : [...prev.trainingTopics, topicId],
    }));
  }, []);

  const updateCompetencyCriteria = useCallback((criteriaId: string, field: 'passed' | 'notes', value: any) => {
    setFormData(prev => ({
      ...prev,
      competencyCriteria: prev.competencyCriteria.map(c =>
        c.id === criteriaId ? { ...c, [field]: value } : c
      ),
    }));
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!formData.employeeName.trim()) {
      Alert.alert('Validation Error', 'Employee name is required');
      return false;
    }
    if (!formData.employeeId.trim()) {
      Alert.alert('Validation Error', 'Employee ID is required');
      return false;
    }
    if (!formData.authorizationLevel) {
      Alert.alert('Validation Error', 'Authorization level must be selected');
      return false;
    }
    if (formData.equipmentCategories.length === 0) {
      Alert.alert('Validation Error', 'At least one equipment category must be selected');
      return false;
    }
    if (!formData.trainerName.trim()) {
      Alert.alert('Validation Error', 'Trainer name is required');
      return false;
    }
    if (!formData.employeeSignature) {
      Alert.alert('Validation Error', 'Employee signature is required');
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
      
      console.log('[LOTOAuth] Submitting OCR record:', formData);
      
      Alert.alert(
        'OCR Record Created',
        `LOTO Authorization for ${formData.employeeName} has been saved successfully. Authorization #: ${formData.authorizationNumber || 'Auto-generated'}`,
        [{ text: 'OK', onPress: () => setFormData(initialFormData) }]
      );
    } catch (error) {
      console.error('[LOTOAuth] Submit error:', error);
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

  const passedCriteriaCount = formData.competencyCriteria.filter(c => c.passed).length;
  const topicsCompleted = formData.trainingTopics.length;

  const renderNewForm = () => (
    <View style={styles.formContainer}>
      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('employee')}
      >
        <View style={styles.sectionHeaderLeft}>
          <User size={20} color="#DC2626" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Employee Information</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'employee' ? '180deg' : '0deg' }] }} />
      </Pressable>
      
      {expandedSection === 'employee' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Employee Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.employeeName}
              onChangeText={(value) => handleInputChange('employeeName', value)}
              placeholder="Enter employee full name"
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

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Authorization Level *</Text>
            <Pressable
              style={[styles.picker, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowLevelPicker(true)}
            >
              <Shield size={18} color={colors.textSecondary} />
              <Text style={[styles.pickerText, { color: formData.authorizationLevel ? colors.text : colors.textSecondary }]}>
                {AUTHORIZATION_LEVELS.find(l => l.id === formData.authorizationLevel)?.name || 'Select authorization level'}
              </Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('equipment')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Settings size={20} color="#DC2626" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Equipment Authorization</Text>
          <View style={[styles.badge, { backgroundColor: formData.equipmentCategories.length > 0 ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: formData.equipmentCategories.length > 0 ? '#10B981' : '#F59E0B' }]}>
              {formData.equipmentCategories.length} Selected
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'equipment' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'equipment' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Equipment Categories *</Text>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Select all equipment categories the employee is authorized to perform LOTO on
          </Text>
          
          {EQUIPMENT_CATEGORIES.map((category) => (
            <Pressable
              key={category.id}
              style={[styles.checkboxRow, { borderColor: colors.border }]}
              onPress={() => toggleEquipmentCategory(category.id)}
            >
              {formData.equipmentCategories.includes(category.id) ? (
                <CheckCircle2 size={22} color="#DC2626" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.checkboxContent}>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>{category.name}</Text>
                <Text style={[styles.checkboxMeta, { color: colors.textSecondary }]}>{category.description}</Text>
              </View>
            </Pressable>
          ))}

          <View style={[styles.fieldGroup, { marginTop: 16 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Specific Equipment (if applicable)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.specificEquipment}
              onChangeText={(value) => handleInputChange('specificEquipment', value)}
              placeholder="List specific equipment IDs or names this authorization covers"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('training')}
      >
        <View style={styles.sectionHeaderLeft}>
          <FileText size={20} color="#DC2626" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Training Details</Text>
          <View style={[styles.badge, { backgroundColor: topicsCompleted === TRAINING_TOPICS.length ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: topicsCompleted === TRAINING_TOPICS.length ? '#10B981' : '#F59E0B' }]}>
              {topicsCompleted}/{TRAINING_TOPICS.length}
            </Text>
          </View>
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
              <Text style={[styles.label, { color: colors.text }]}>Training Hours</Text>
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

          <Text style={[styles.subLabel, { color: colors.text }]}>Training Topics Covered</Text>
          
          {TRAINING_TOPICS.map((topic) => (
            <Pressable
              key={topic.id}
              style={[styles.checkboxRow, { borderColor: colors.border }]}
              onPress={() => toggleTrainingTopic(topic.id)}
            >
              {formData.trainingTopics.includes(topic.id) ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.checkboxContent}>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>{topic.name}</Text>
                <Text style={[styles.checkboxMeta, { color: colors.textSecondary }]}>{topic.description}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('competency')}
      >
        <View style={styles.sectionHeaderLeft}>
          <ClipboardCheck size={20} color="#DC2626" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Competency Evaluation</Text>
          <View style={[styles.badge, { backgroundColor: passedCriteriaCount === COMPETENCY_CRITERIA.length ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: passedCriteriaCount === COMPETENCY_CRITERIA.length ? '#10B981' : '#F59E0B' }]}>
              {passedCriteriaCount}/{COMPETENCY_CRITERIA.length}
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'competency' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'competency' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Evaluation Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.competencyDate}
                onChangeText={(value) => handleInputChange('competencyDate', value)}
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

          <Text style={[styles.subLabel, { color: colors.text }]}>Competency Criteria</Text>
          
          {COMPETENCY_CRITERIA.map((criteria) => {
            const evalItem = formData.competencyCriteria.find(c => c.id === criteria.id);
            return (
              <View key={criteria.id} style={[styles.criteriaCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Pressable
                  style={styles.criteriaHeader}
                  onPress={() => updateCompetencyCriteria(criteria.id, 'passed', !evalItem?.passed)}
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
                placeholder="e.g., 90%"
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
        onPress={() => toggleSection('authorization')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Award size={20} color="#DC2626" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Authorization & Signatures</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'authorization' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'authorization' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Authorization #</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.authorizationNumber}
                onChangeText={(value) => handleInputChange('authorizationNumber', value)}
                placeholder="Auto-generated"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Auth. Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.authorizationDate}
                onChangeText={(value) => handleInputChange('authorizationDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Expiration Date (annual review required)</Text>
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
              placeholder="e.g., Specific equipment only, Supervised for 90 days, etc."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={[styles.warningBanner, { backgroundColor: '#DC262615', borderColor: '#DC262630' }]}>
            <AlertTriangle size={20} color="#DC2626" />
            <Text style={[styles.warningText, { color: '#DC2626' }]}>
              LOTO authorization must be reviewed annually and revalidated if procedures change.
            </Text>
          </View>

          <View style={[styles.signatureSection, { borderColor: colors.border }]}>
            <Text style={[styles.signatureSectionTitle, { color: colors.text }]}>Required Signatures</Text>
            
            <Pressable
              style={[styles.signatureBox, { 
                backgroundColor: formData.employeeSignature ? '#10B98115' : colors.background,
                borderColor: formData.employeeSignature ? '#10B981' : colors.border,
              }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleInputChange('employeeSignature', !formData.employeeSignature);
              }}
            >
              {formData.employeeSignature ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.signatureContent}>
                <Text style={[styles.signatureLabel, { color: colors.text }]}>Employee Signature *</Text>
                <Text style={[styles.signatureSubtext, { color: colors.textSecondary }]}>
                  I have received LOTO training and understand the procedures
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
                <Text style={[styles.signatureLabel, { color: colors.text }]}>Evaluator/Trainer Signature *</Text>
                <Text style={[styles.signatureSubtext, { color: colors.textSecondary }]}>
                  I certify the employee has demonstrated competency in LOTO procedures
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
                  Supervisor authorization for LOTO authorization
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.signatureBox, { 
                backgroundColor: formData.safetyManagerSignature ? '#10B98115' : colors.background,
                borderColor: formData.safetyManagerSignature ? '#10B981' : colors.border,
              }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleInputChange('safetyManagerSignature', !formData.safetyManagerSignature);
              }}
            >
              {formData.safetyManagerSignature ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.signatureContent}>
                <Text style={[styles.signatureLabel, { color: colors.text }]}>Safety Manager Signature</Text>
                <Text style={[styles.signatureSubtext, { color: colors.textSecondary }]}>
                  Safety department approval for authorization
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
        style={[styles.submitButton, { backgroundColor: '#DC2626', opacity: isSubmitting ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Lock size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Save LOTO Authorization OCR</Text>
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
            <View style={[styles.recordIcon, { backgroundColor: '#DC262615' }]}>
              <Lock size={24} color="#DC2626" />
            </View>
            <View style={styles.recordInfo}>
              <Text style={[styles.recordName, { color: colors.text }]}>{record.employeeName}</Text>
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
              <Shield size={14} color={colors.textSecondary} />
              <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                {AUTHORIZATION_LEVELS.find(l => l.id === record.authorizationLevel)?.name}
              </Text>
            </View>
            <View style={styles.recordDetail}>
              <Settings size={14} color={colors.textSecondary} />
              <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                {record.equipmentCategories.length} equipment categories
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
          title: 'LOTO Authorization OCR',
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
          style={[styles.tab, activeTab === 'new' && { backgroundColor: '#DC2626' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('new');
          }}
        >
          <Plus size={18} color={activeTab === 'new' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#FFFFFF' : colors.textSecondary }]}>
            New Authorization
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { backgroundColor: '#DC2626' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('history');
          }}
        >
          <History size={18} color={activeTab === 'history' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#FFFFFF' : colors.textSecondary }]}>
            Authorizations
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
                  {formData.department === dept && <Check size={20} color="#DC2626" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showLevelPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Authorization Level</Text>
              <Pressable onPress={() => setShowLevelPicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {AUTHORIZATION_LEVELS.map((level) => (
                <Pressable
                  key={level.id}
                  style={[styles.modalItem, { borderColor: colors.border }]}
                  onPress={() => {
                    handleInputChange('authorizationLevel', level.id);
                    setShowLevelPicker(false);
                  }}
                >
                  <Shield size={20} color={colors.textSecondary} />
                  <View style={styles.modalItemContent}>
                    <Text style={[styles.modalItemText, { color: colors.text }]}>{level.name}</Text>
                    <Text style={[styles.modalItemDesc, { color: colors.textSecondary }]}>{level.description}</Text>
                  </View>
                  {formData.authorizationLevel === level.id && <Check size={20} color="#DC2626" />}
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
  warningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
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
    borderRadius: 12,
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
    gap: 6,
    marginBottom: 12,
  },
  recordDetail: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  recordDetailText: {
    fontSize: 13,
  },
  recordFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  recordTrainer: {
    fontSize: 12,
  },
  bottomPadding: {
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalList: {
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  modalItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
