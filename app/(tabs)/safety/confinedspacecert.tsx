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
  ShieldAlert,
  Plus,
  Calendar,
  User,
  X,
  Check,
  ChevronDown,
  History,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Award,
  FileText,
  Shield,
  Eye,
  Building2,
  Users,
  Radio,
  Wind,
  Thermometer,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const AUTHORIZATION_LEVELS = [
  { id: 'entrant', name: 'Authorized Entrant', description: 'Authorized to enter permit-required confined spaces' },
  { id: 'attendant', name: 'Attendant', description: 'Monitors entrants and maintains communication' },
  { id: 'entry_supervisor', name: 'Entry Supervisor', description: 'Authorizes entry and oversees operations' },
  { id: 'rescue', name: 'Rescue Team Member', description: 'Trained in confined space rescue operations' },
];

const TRAINING_TOPICS = [
  { id: 'hazard_recognition', name: 'Hazard Recognition', description: 'Identifying confined space hazards' },
  { id: 'atmospheric_testing', name: 'Atmospheric Testing', description: 'Use of gas detection equipment' },
  { id: 'ventilation', name: 'Ventilation Procedures', description: 'Proper ventilation setup and monitoring' },
  { id: 'entry_procedures', name: 'Entry/Exit Procedures', description: 'Safe entry and exit protocols' },
  { id: 'communication', name: 'Communication Systems', description: 'Radio and signal communication' },
  { id: 'ppe_equipment', name: 'PPE & Equipment', description: 'Required PPE and safety equipment' },
  { id: 'emergency_response', name: 'Emergency Response', description: 'Emergency and rescue procedures' },
  { id: 'permit_system', name: 'Permit System', description: 'Understanding the permit process' },
  { id: 'lockout_tagout', name: 'LOTO for Confined Space', description: 'Energy isolation procedures' },
  { id: 'retrieval_systems', name: 'Retrieval Systems', description: 'Non-entry rescue equipment' },
];

const CONFINED_SPACE_TYPES = [
  'Storage Tanks',
  'Process Vessels',
  'Silos/Bins',
  'Pits/Sumps',
  'Manholes',
  'Tunnels',
  'Pipelines',
  'Boilers',
  'Ductwork',
  'Vaults',
];

const DEPARTMENTS = [
  'Maintenance',
  'Production',
  'Utilities',
  'Sanitation',
  'Engineering',
  'Contractors',
];

interface CertFormData {
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  authorizationLevels: string[];
  spaceTypes: string[];
  trainingDate: string;
  trainingHours: string;
  instructorName: string;
  instructorCredentials: string;
  trainingTopics: { id: string; completed: boolean; score: string }[];
  writtenExamScore: string;
  writtenExamPassed: boolean;
  practicalDemoCompleted: boolean;
  atmosphericTestingDemo: boolean;
  rescueDrillParticipation: boolean;
  equipmentProficiency: boolean;
  certificationNumber: string;
  certificationDate: string;
  expirationDate: string;
  medicalClearance: boolean;
  medicalClearanceDate: string;
  respiratoryFitTest: boolean;
  respiratoryFitTestDate: string;
  restrictions: string;
  employeeSignature: boolean;
  instructorSignature: boolean;
  supervisorName: string;
  supervisorSignature: boolean;
  notes: string;
}

interface CertRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  authorizationLevels: string[];
  certificationDate: string;
  expirationDate: string;
  status: 'active' | 'expiring' | 'expired';
  instructorName: string;
}

const initialFormData: CertFormData = {
  employeeName: '',
  employeeId: '',
  department: '',
  jobTitle: '',
  authorizationLevels: [],
  spaceTypes: [],
  trainingDate: new Date().toISOString().split('T')[0],
  trainingHours: '',
  instructorName: '',
  instructorCredentials: '',
  trainingTopics: TRAINING_TOPICS.map(t => ({ id: t.id, completed: false, score: '' })),
  writtenExamScore: '',
  writtenExamPassed: false,
  practicalDemoCompleted: false,
  atmosphericTestingDemo: false,
  rescueDrillParticipation: false,
  equipmentProficiency: false,
  certificationNumber: '',
  certificationDate: new Date().toISOString().split('T')[0],
  expirationDate: '',
  medicalClearance: false,
  medicalClearanceDate: '',
  respiratoryFitTest: false,
  respiratoryFitTestDate: '',
  restrictions: '',
  employeeSignature: false,
  instructorSignature: false,
  supervisorName: '',
  supervisorSignature: false,
  notes: '',
};

export default function ConfinedSpaceCertScreen() {
  const { colors } = useTheme();
  useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<CertFormData>(initialFormData);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('employee');

  const [records] = useState<CertRecord[]>([
    {
      id: '1',
      employeeName: 'Michael Torres',
      employeeId: 'EMP034',
      department: 'Maintenance',
      authorizationLevels: ['entrant', 'attendant'],
      certificationDate: '2024-06-15',
      expirationDate: '2025-06-15',
      status: 'active',
      instructorName: 'Safety Solutions Inc.',
    },
    {
      id: '2',
      employeeName: 'Sarah Chen',
      employeeId: 'EMP056',
      department: 'Utilities',
      authorizationLevels: ['entrant', 'attendant', 'entry_supervisor'],
      certificationDate: '2024-02-20',
      expirationDate: '2025-02-20',
      status: 'expiring',
      instructorName: 'Safety Solutions Inc.',
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleInputChange = useCallback((field: keyof CertFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleAuthLevel = useCallback((levelId: string) => {
    setFormData(prev => ({
      ...prev,
      authorizationLevels: prev.authorizationLevels.includes(levelId)
        ? prev.authorizationLevels.filter(l => l !== levelId)
        : [...prev.authorizationLevels, levelId],
    }));
  }, []);

  const toggleSpaceType = useCallback((type: string) => {
    setFormData(prev => ({
      ...prev,
      spaceTypes: prev.spaceTypes.includes(type)
        ? prev.spaceTypes.filter(t => t !== type)
        : [...prev.spaceTypes, type],
    }));
  }, []);

  const updateTrainingTopic = useCallback((topicId: string, field: 'completed' | 'score', value: any) => {
    setFormData(prev => ({
      ...prev,
      trainingTopics: prev.trainingTopics.map(t =>
        t.id === topicId ? { ...t, [field]: value } : t
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
    if (formData.authorizationLevels.length === 0) {
      Alert.alert('Validation Error', 'At least one authorization level must be selected');
      return false;
    }
    if (!formData.instructorName.trim()) {
      Alert.alert('Validation Error', 'Instructor name is required');
      return false;
    }
    if (!formData.employeeSignature) {
      Alert.alert('Validation Error', 'Employee signature is required');
      return false;
    }
    if (!formData.instructorSignature) {
      Alert.alert('Validation Error', 'Instructor signature is required');
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
      
      console.log('[ConfinedSpaceCert] Submitting OCR record:', formData);
      
      Alert.alert(
        'OCR Record Created',
        `Confined space certification for ${formData.employeeName} has been saved successfully. Authorization level(s): ${formData.authorizationLevels.length}`,
        [{ text: 'OK', onPress: () => setFormData(initialFormData) }]
      );
    } catch (error) {
      console.error('[ConfinedSpaceCert] Submit error:', error);
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

  const completedTopicsCount = formData.trainingTopics.filter(t => t.completed).length;

  const renderNewForm = () => (
    <View style={styles.formContainer}>
      <View style={[styles.warningBanner, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
        <AlertTriangle size={20} color="#EF4444" />
        <View style={styles.warningContent}>
          <Text style={[styles.warningTitle, { color: '#EF4444' }]}>OSHA 1910.146 Compliance</Text>
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            Confined space entry requires proper training, medical clearance, and equipment proficiency before authorization.
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('employee')}
      >
        <View style={styles.sectionHeaderLeft}>
          <User size={20} color="#EF4444" />
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
              <Text style={[styles.label, { color: colors.text }]}>Department</Text>
              <Pressable
                style={[styles.picker, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowDepartmentPicker(true)}
              >
                <Text style={[styles.pickerText, { color: formData.department ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                  {formData.department || 'Select'}
                </Text>
                <ChevronDown size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
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
        onPress={() => toggleSection('authorization')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Shield size={20} color="#EF4444" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Authorization Level</Text>
          <View style={[styles.badge, { backgroundColor: formData.authorizationLevels.length > 0 ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: formData.authorizationLevels.length > 0 ? '#10B981' : '#F59E0B' }]}>
              {formData.authorizationLevels.length} selected
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'authorization' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'authorization' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Select all authorization levels the employee is being certified for
          </Text>
          
          {AUTHORIZATION_LEVELS.map((level) => (
            <Pressable
              key={level.id}
              style={[styles.authCard, { 
                backgroundColor: formData.authorizationLevels.includes(level.id) ? '#EF444410' : colors.background,
                borderColor: formData.authorizationLevels.includes(level.id) ? '#EF4444' : colors.border,
              }]}
              onPress={() => toggleAuthLevel(level.id)}
            >
              {formData.authorizationLevels.includes(level.id) ? (
                <CheckCircle2 size={22} color="#EF4444" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.authContent}>
                <Text style={[styles.authName, { color: colors.text }]}>{level.name}</Text>
                <Text style={[styles.authDesc, { color: colors.textSecondary }]}>{level.description}</Text>
              </View>
            </Pressable>
          ))}

          <Text style={[styles.subLabel, { color: colors.text, marginTop: 16 }]}>Authorized Space Types</Text>
          <View style={styles.tagsContainer}>
            {CONFINED_SPACE_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[styles.tag, { 
                  backgroundColor: formData.spaceTypes.includes(type) ? '#EF444415' : colors.background,
                  borderColor: formData.spaceTypes.includes(type) ? '#EF4444' : colors.border,
                }]}
                onPress={() => toggleSpaceType(type)}
              >
                <Text style={[styles.tagText, { color: formData.spaceTypes.includes(type) ? '#EF4444' : colors.textSecondary }]}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('training')}
      >
        <View style={styles.sectionHeaderLeft}>
          <FileText size={20} color="#EF4444" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Training Completion</Text>
          <View style={[styles.badge, { backgroundColor: completedTopicsCount === TRAINING_TOPICS.length ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: completedTopicsCount === TRAINING_TOPICS.length ? '#10B981' : '#F59E0B' }]}>
              {completedTopicsCount}/{TRAINING_TOPICS.length}
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

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Instructor/Training Provider *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.instructorName}
              onChangeText={(value) => handleInputChange('instructorName', value)}
              placeholder="Enter instructor or company name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Instructor Credentials</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.instructorCredentials}
              onChangeText={(value) => handleInputChange('instructorCredentials', value)}
              placeholder="CSP, CIH, OSHA Authorized, etc."
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <Text style={[styles.subLabel, { color: colors.text }]}>Training Topics Completed</Text>
          
          {TRAINING_TOPICS.map((topic) => {
            const topicData = formData.trainingTopics.find(t => t.id === topic.id);
            return (
              <Pressable
                key={topic.id}
                style={[styles.topicCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => updateTrainingTopic(topic.id, 'completed', !topicData?.completed)}
              >
                {topicData?.completed ? (
                  <CheckCircle2 size={20} color="#10B981" />
                ) : (
                  <View style={[styles.checkbox, { borderColor: colors.border }]} />
                )}
                <View style={styles.topicContent}>
                  <Text style={[styles.topicName, { color: colors.text }]}>{topic.name}</Text>
                  <Text style={[styles.topicDesc, { color: colors.textSecondary }]}>{topic.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('evaluation')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Eye size={20} color="#EF4444" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Evaluation & Demos</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'evaluation' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'evaluation' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Written Exam Score</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.writtenExamScore}
                onChangeText={(value) => handleInputChange('writtenExamScore', value)}
                placeholder="e.g., 90%"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Pressable
                style={[styles.passButton, { 
                  backgroundColor: formData.writtenExamPassed ? '#10B98115' : colors.background,
                  borderColor: formData.writtenExamPassed ? '#10B981' : colors.border,
                }]}
                onPress={() => handleInputChange('writtenExamPassed', !formData.writtenExamPassed)}
              >
                {formData.writtenExamPassed ? (
                  <CheckCircle2 size={18} color="#10B981" />
                ) : (
                  <X size={18} color={colors.textSecondary} />
                )}
                <Text style={[styles.passText, { color: formData.writtenExamPassed ? '#10B981' : colors.textSecondary }]}>
                  {formData.writtenExamPassed ? 'Passed' : 'Not Passed'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.subLabel, { color: colors.text }]}>Practical Demonstrations</Text>

          <Pressable
            style={[styles.demoCard, { 
              backgroundColor: formData.practicalDemoCompleted ? '#10B98110' : colors.background,
              borderColor: formData.practicalDemoCompleted ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('practicalDemoCompleted', !formData.practicalDemoCompleted)}
          >
            {formData.practicalDemoCompleted ? (
              <CheckCircle2 size={20} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.demoContent}>
              <Text style={[styles.demoName, { color: colors.text }]}>Entry/Exit Procedure Demonstration</Text>
              <Text style={[styles.demoDesc, { color: colors.textSecondary }]}>Proper use of harness, retrieval system, and entry procedures</Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.demoCard, { 
              backgroundColor: formData.atmosphericTestingDemo ? '#10B98110' : colors.background,
              borderColor: formData.atmosphericTestingDemo ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('atmosphericTestingDemo', !formData.atmosphericTestingDemo)}
          >
            {formData.atmosphericTestingDemo ? (
              <CheckCircle2 size={20} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.demoContent}>
              <Wind size={16} color={colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.demoName, { color: colors.text }]}>Atmospheric Testing Proficiency</Text>
                <Text style={[styles.demoDesc, { color: colors.textSecondary }]}>Gas detection equipment calibration and use</Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            style={[styles.demoCard, { 
              backgroundColor: formData.rescueDrillParticipation ? '#10B98110' : colors.background,
              borderColor: formData.rescueDrillParticipation ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('rescueDrillParticipation', !formData.rescueDrillParticipation)}
          >
            {formData.rescueDrillParticipation ? (
              <CheckCircle2 size={20} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.demoContent}>
              <Users size={16} color={colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.demoName, { color: colors.text }]}>Rescue Drill Participation</Text>
                <Text style={[styles.demoDesc, { color: colors.textSecondary }]}>Participated in simulated rescue scenario</Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            style={[styles.demoCard, { 
              backgroundColor: formData.equipmentProficiency ? '#10B98110' : colors.background,
              borderColor: formData.equipmentProficiency ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('equipmentProficiency', !formData.equipmentProficiency)}
          >
            {formData.equipmentProficiency ? (
              <CheckCircle2 size={20} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.demoContent}>
              <Radio size={16} color={colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.demoName, { color: colors.text }]}>Equipment Proficiency</Text>
                <Text style={[styles.demoDesc, { color: colors.textSecondary }]}>Communication, ventilation, and monitoring equipment</Text>
              </View>
            </View>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('medical')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Thermometer size={20} color="#EF4444" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Medical & Certification</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'medical' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'medical' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.medicalCard, { 
              backgroundColor: formData.medicalClearance ? '#10B98110' : colors.background,
              borderColor: formData.medicalClearance ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('medicalClearance', !formData.medicalClearance)}
          >
            {formData.medicalClearance ? (
              <CheckCircle2 size={20} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <Text style={[styles.medicalText, { color: colors.text }]}>Medical Clearance Obtained</Text>
          </Pressable>

          {formData.medicalClearance && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Medical Clearance Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.medicalClearanceDate}
                onChangeText={(value) => handleInputChange('medicalClearanceDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}

          <Pressable
            style={[styles.medicalCard, { 
              backgroundColor: formData.respiratoryFitTest ? '#10B98110' : colors.background,
              borderColor: formData.respiratoryFitTest ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('respiratoryFitTest', !formData.respiratoryFitTest)}
          >
            {formData.respiratoryFitTest ? (
              <CheckCircle2 size={20} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <Text style={[styles.medicalText, { color: colors.text }]}>Respiratory Fit Test Current</Text>
          </Pressable>

          {formData.respiratoryFitTest && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Fit Test Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.respiratoryFitTestDate}
                onChangeText={(value) => handleInputChange('respiratoryFitTestDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}

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
            <Text style={[styles.label, { color: colors.text }]}>Expiration Date (Annual)</Text>
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
              placeholder="e.g., Entrant only, No IDLH atmospheres, etc."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
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
                  I acknowledge receiving training and understand confined space hazards
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.signatureBox, { 
                backgroundColor: formData.instructorSignature ? '#10B98115' : colors.background,
                borderColor: formData.instructorSignature ? '#10B981' : colors.border,
              }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleInputChange('instructorSignature', !formData.instructorSignature);
              }}
            >
              {formData.instructorSignature ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.signatureContent}>
                <Text style={[styles.signatureLabel, { color: colors.text }]}>Instructor Signature *</Text>
                <Text style={[styles.signatureSubtext, { color: colors.textSecondary }]}>
                  I certify the employee has completed all required training components
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
                  Authorization for confined space entry privileges
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
        style={[styles.submitButton, { backgroundColor: '#EF4444', opacity: isSubmitting ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Award size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Save Confined Space Certification OCR</Text>
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
            <View style={[styles.recordIcon, { backgroundColor: '#EF444415' }]}>
              <ShieldAlert size={24} color="#EF4444" />
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

          <View style={styles.authLevelTags}>
            {record.authorizationLevels.map((level) => {
              const levelInfo = AUTHORIZATION_LEVELS.find(l => l.id === level);
              return (
                <View key={level} style={[styles.authTag, { backgroundColor: '#EF444410', borderColor: '#EF444430' }]}>
                  <Text style={[styles.authTagText, { color: '#EF4444' }]}>
                    {levelInfo?.name || level}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.recordDetails}>
            <View style={styles.recordDetail}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                Expires: {record.expirationDate}
              </Text>
            </View>
          </View>

          <View style={styles.recordFooter}>
            <Text style={[styles.recordTrainer, { color: colors.textSecondary }]}>
              Trainer: {record.instructorName}
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
          title: 'Confined Space Cert OCR',
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
          style={[styles.tab, activeTab === 'new' && { backgroundColor: '#EF4444' }]}
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
          style={[styles.tab, activeTab === 'history' && { backgroundColor: '#EF4444' }]}
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
                  {formData.department === dept && <Check size={20} color="#EF4444" />}
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
  warningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 16,
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
    justifyContent: 'space-between' as const,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 20,
  },
  pickerText: {
    fontSize: 15,
    flex: 1,
  },
  authCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  authContent: {
    flex: 1,
  },
  authName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  authDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
  },
  tagsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  topicCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  topicContent: {
    flex: 1,
  },
  topicName: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  topicDesc: {
    fontSize: 11,
    lineHeight: 14,
  },
  passButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginTop: 20,
  },
  passText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  demoCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  demoContent: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
  },
  demoName: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  demoDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  medicalCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  medicalText: {
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
  authLevelTags: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 12,
  },
  authTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  authTagText: {
    fontSize: 11,
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
