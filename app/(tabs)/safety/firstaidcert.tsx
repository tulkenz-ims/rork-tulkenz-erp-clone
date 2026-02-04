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
  Heart,
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
  Shield,
  Building2,
  Activity,
  Stethoscope,
  BadgeCheck,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const CERTIFICATION_TYPES = [
  { id: 'first_aid_basic', name: 'Basic First Aid', duration: '2 years', description: 'Standard first aid response' },
  { id: 'first_aid_adv', name: 'Advanced First Aid', duration: '2 years', description: 'Advanced medical response' },
  { id: 'cpr_adult', name: 'Adult CPR', duration: '2 years', description: 'Adult cardiopulmonary resuscitation' },
  { id: 'cpr_child', name: 'Pediatric CPR', duration: '2 years', description: 'Child and infant CPR' },
  { id: 'aed', name: 'AED Operation', duration: '2 years', description: 'Automated external defibrillator' },
  { id: 'bls', name: 'BLS (Basic Life Support)', duration: '2 years', description: 'Healthcare provider level' },
  { id: 'bloodborne', name: 'Bloodborne Pathogens', duration: '1 year', description: 'BBP exposure prevention' },
  { id: 'oxygen_admin', name: 'Emergency Oxygen', duration: '2 years', description: 'Emergency oxygen administration' },
];

const TRAINING_PROVIDERS = [
  'American Red Cross',
  'American Heart Association',
  'National Safety Council',
  'ASHI (American Safety & Health Institute)',
  'ECSI (Emergency Care & Safety Institute)',
  'MEDIC First Aid',
  'In-House Certified Instructor',
  'Other',
];

const SKILL_COMPETENCIES = [
  { id: 'scene_assessment', name: 'Scene Assessment', description: 'Evaluate scene safety and victim condition' },
  { id: 'primary_survey', name: 'Primary Survey', description: 'ABC assessment (Airway, Breathing, Circulation)' },
  { id: 'cpr_technique', name: 'CPR Technique', description: 'Proper compression depth, rate, and ratio' },
  { id: 'rescue_breathing', name: 'Rescue Breathing', description: 'Proper ventilation technique with barrier device' },
  { id: 'aed_use', name: 'AED Operation', description: 'Proper AED pad placement and operation' },
  { id: 'choking_response', name: 'Choking Response', description: 'Conscious and unconscious choking victim' },
  { id: 'wound_care', name: 'Wound Care', description: 'Bleeding control and wound dressing' },
  { id: 'shock_management', name: 'Shock Management', description: 'Recognition and treatment of shock' },
  { id: 'fracture_splinting', name: 'Fracture/Splinting', description: 'Immobilization techniques' },
  { id: 'burns_treatment', name: 'Burns Treatment', description: 'Thermal, chemical, and electrical burns' },
  { id: 'medical_emergencies', name: 'Medical Emergencies', description: 'Heart attack, stroke, seizure, diabetic emergency' },
  { id: 'environmental', name: 'Environmental Emergencies', description: 'Heat/cold emergencies, poisoning' },
];

const DEPARTMENTS = [
  'Production',
  'Maintenance',
  'Warehouse',
  'Quality',
  'Sanitation',
  'Administration',
  'Shipping/Receiving',
  'Safety',
];

interface CertFormData {
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  certificationTypes: string[];
  trainingProvider: string;
  instructorName: string;
  instructorCredentials: string;
  trainingDate: string;
  trainingHours: string;
  classroomHours: string;
  practicalHours: string;
  skillCompetencies: { id: string; passed: boolean; attempts: string }[];
  writtenExamScore: string;
  writtenExamPassed: boolean;
  practicalExamPassed: boolean;
  manikinPractice: boolean;
  aedPractice: boolean;
  certificationNumber: string;
  certificationDate: string;
  expirationDate: string;
  cardIssued: boolean;
  cardNumber: string;
  designatedResponder: boolean;
  firstAidKitLocation: string;
  aedLocation: string;
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
  certificationTypes: string[];
  certificationDate: string;
  expirationDate: string;
  status: 'active' | 'expiring' | 'expired';
  trainingProvider: string;
  designatedResponder: boolean;
}

const initialFormData: CertFormData = {
  employeeName: '',
  employeeId: '',
  department: '',
  jobTitle: '',
  certificationTypes: [],
  trainingProvider: '',
  instructorName: '',
  instructorCredentials: '',
  trainingDate: new Date().toISOString().split('T')[0],
  trainingHours: '',
  classroomHours: '',
  practicalHours: '',
  skillCompetencies: SKILL_COMPETENCIES.map(s => ({ id: s.id, passed: false, attempts: '1' })),
  writtenExamScore: '',
  writtenExamPassed: false,
  practicalExamPassed: false,
  manikinPractice: false,
  aedPractice: false,
  certificationNumber: '',
  certificationDate: new Date().toISOString().split('T')[0],
  expirationDate: '',
  cardIssued: false,
  cardNumber: '',
  designatedResponder: false,
  firstAidKitLocation: '',
  aedLocation: '',
  employeeSignature: false,
  instructorSignature: false,
  supervisorName: '',
  supervisorSignature: false,
  notes: '',
};

export default function FirstAidCertScreen() {
  const { colors } = useTheme();
  useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<CertFormData>(initialFormData);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('employee');

  const [records] = useState<CertRecord[]>([
    {
      id: '1',
      employeeName: 'Amanda Wilson',
      employeeId: 'EMP023',
      department: 'Safety',
      certificationTypes: ['first_aid_basic', 'cpr_adult', 'aed', 'bloodborne'],
      certificationDate: '2024-03-15',
      expirationDate: '2026-03-15',
      status: 'active',
      trainingProvider: 'American Red Cross',
      designatedResponder: true,
    },
    {
      id: '2',
      employeeName: 'David Park',
      employeeId: 'EMP089',
      department: 'Production',
      certificationTypes: ['first_aid_basic', 'cpr_adult', 'aed'],
      certificationDate: '2023-08-20',
      expirationDate: '2025-08-20',
      status: 'expiring',
      trainingProvider: 'American Heart Association',
      designatedResponder: true,
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleInputChange = useCallback((field: keyof CertFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleCertType = useCallback((typeId: string) => {
    setFormData(prev => ({
      ...prev,
      certificationTypes: prev.certificationTypes.includes(typeId)
        ? prev.certificationTypes.filter(t => t !== typeId)
        : [...prev.certificationTypes, typeId],
    }));
  }, []);

  const updateSkillCompetency = useCallback((skillId: string, field: 'passed' | 'attempts', value: any) => {
    setFormData(prev => ({
      ...prev,
      skillCompetencies: prev.skillCompetencies.map(s =>
        s.id === skillId ? { ...s, [field]: value } : s
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
    if (formData.certificationTypes.length === 0) {
      Alert.alert('Validation Error', 'At least one certification type must be selected');
      return false;
    }
    if (!formData.trainingProvider) {
      Alert.alert('Validation Error', 'Training provider is required');
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
      
      console.log('[FirstAidCert] Submitting OCR record:', formData);
      
      Alert.alert(
        'OCR Record Created',
        `First Aid/CPR certification for ${formData.employeeName} has been saved successfully. ${formData.certificationTypes.length} certification(s) documented.`,
        [{ text: 'OK', onPress: () => setFormData(initialFormData) }]
      );
    } catch (error) {
      console.error('[FirstAidCert] Submit error:', error);
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

  const passedSkillsCount = formData.skillCompetencies.filter(s => s.passed).length;

  const renderNewForm = () => (
    <View style={styles.formContainer}>
      <View style={[styles.infoBanner, { backgroundColor: '#EC489915', borderColor: '#EC489930' }]}>
        <Heart size={20} color="#EC4899" />
        <View style={styles.infoContent}>
          <Text style={[styles.infoTitle, { color: '#EC4899' }]}>OSHA 1910.151 Compliance</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Trained first aid personnel must be available when medical facilities are not reasonably accessible.
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('employee')}
      >
        <View style={styles.sectionHeaderLeft}>
          <User size={20} color="#EC4899" />
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

          <Pressable
            style={[styles.responderCard, { 
              backgroundColor: formData.designatedResponder ? '#EC489915' : colors.background,
              borderColor: formData.designatedResponder ? '#EC4899' : colors.border,
            }]}
            onPress={() => handleInputChange('designatedResponder', !formData.designatedResponder)}
          >
            {formData.designatedResponder ? (
              <CheckCircle2 size={22} color="#EC4899" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.responderContent}>
              <Text style={[styles.responderTitle, { color: colors.text }]}>Designated First Aid Responder</Text>
              <Text style={[styles.responderDesc, { color: colors.textSecondary }]}>
                Employee will serve as a designated first aid responder for their work area
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('certifications')}
      >
        <View style={styles.sectionHeaderLeft}>
          <BadgeCheck size={20} color="#EC4899" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Certification Types</Text>
          <View style={[styles.badge, { backgroundColor: formData.certificationTypes.length > 0 ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: formData.certificationTypes.length > 0 ? '#10B981' : '#F59E0B' }]}>
              {formData.certificationTypes.length} selected
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'certifications' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'certifications' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Select all certifications the employee is being trained for
          </Text>
          
          {CERTIFICATION_TYPES.map((cert) => (
            <Pressable
              key={cert.id}
              style={[styles.certCard, { 
                backgroundColor: formData.certificationTypes.includes(cert.id) ? '#EC489910' : colors.background,
                borderColor: formData.certificationTypes.includes(cert.id) ? '#EC4899' : colors.border,
              }]}
              onPress={() => toggleCertType(cert.id)}
            >
              {formData.certificationTypes.includes(cert.id) ? (
                <CheckCircle2 size={22} color="#EC4899" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.certContent}>
                <View style={styles.certHeader}>
                  <Text style={[styles.certName, { color: colors.text }]}>{cert.name}</Text>
                  <View style={[styles.durationBadge, { backgroundColor: colors.background }]}>
                    <Text style={[styles.durationText, { color: colors.textSecondary }]}>{cert.duration}</Text>
                  </View>
                </View>
                <Text style={[styles.certDesc, { color: colors.textSecondary }]}>{cert.description}</Text>
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
          <FileText size={20} color="#EC4899" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Training Details</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'training' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'training' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Training Provider *</Text>
            <Pressable
              style={[styles.picker, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowProviderPicker(true)}
            >
              <Stethoscope size={18} color={colors.textSecondary} />
              <Text style={[styles.pickerText, { color: formData.trainingProvider ? colors.text : colors.textSecondary, flex: 1 }]}>
                {formData.trainingProvider || 'Select training provider'}
              </Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

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
            <Text style={[styles.label, { color: colors.text }]}>Instructor Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.instructorName}
              onChangeText={(value) => handleInputChange('instructorName', value)}
              placeholder="Enter instructor name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Instructor Credentials</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.instructorCredentials}
              onChangeText={(value) => handleInputChange('instructorCredentials', value)}
              placeholder="e.g., AHA BLS Instructor, Red Cross Certified"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.practiceRow}>
            <Pressable
              style={[styles.practiceCard, { 
                backgroundColor: formData.manikinPractice ? '#10B98110' : colors.background,
                borderColor: formData.manikinPractice ? '#10B981' : colors.border,
              }]}
              onPress={() => handleInputChange('manikinPractice', !formData.manikinPractice)}
            >
              {formData.manikinPractice ? (
                <CheckCircle2 size={18} color="#10B981" />
              ) : (
                <View style={[styles.smallCheckbox, { borderColor: colors.border }]} />
              )}
              <Text style={[styles.practiceText, { color: formData.manikinPractice ? '#10B981' : colors.textSecondary }]}>
                Manikin Practice
              </Text>
            </Pressable>

            <Pressable
              style={[styles.practiceCard, { 
                backgroundColor: formData.aedPractice ? '#10B98110' : colors.background,
                borderColor: formData.aedPractice ? '#10B981' : colors.border,
              }]}
              onPress={() => handleInputChange('aedPractice', !formData.aedPractice)}
            >
              {formData.aedPractice ? (
                <CheckCircle2 size={18} color="#10B981" />
              ) : (
                <View style={[styles.smallCheckbox, { borderColor: colors.border }]} />
              )}
              <Text style={[styles.practiceText, { color: formData.aedPractice ? '#10B981' : colors.textSecondary }]}>
                AED Practice
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('skills')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Activity size={20} color="#EC4899" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Skills Assessment</Text>
          <View style={[styles.badge, { backgroundColor: passedSkillsCount === SKILL_COMPETENCIES.length ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: passedSkillsCount === SKILL_COMPETENCIES.length ? '#10B981' : '#F59E0B' }]}>
              {passedSkillsCount}/{SKILL_COMPETENCIES.length}
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'skills' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'skills' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Written Exam Score</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.writtenExamScore}
                onChangeText={(value) => handleInputChange('writtenExamScore', value)}
                placeholder="e.g., 92%"
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

          <Pressable
            style={[styles.practicalPassButton, { 
              backgroundColor: formData.practicalExamPassed ? '#10B98115' : colors.background,
              borderColor: formData.practicalExamPassed ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('practicalExamPassed', !formData.practicalExamPassed)}
          >
            {formData.practicalExamPassed ? (
              <CheckCircle2 size={20} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <Text style={[styles.practicalPassText, { color: formData.practicalExamPassed ? '#10B981' : colors.text }]}>
              Practical Skills Examination Passed
            </Text>
          </Pressable>

          <Text style={[styles.subLabel, { color: colors.text }]}>Skill Competencies Demonstrated</Text>
          
          {SKILL_COMPETENCIES.map((skill) => {
            const skillData = formData.skillCompetencies.find(s => s.id === skill.id);
            return (
              <Pressable
                key={skill.id}
                style={[styles.skillCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => updateSkillCompetency(skill.id, 'passed', !skillData?.passed)}
              >
                {skillData?.passed ? (
                  <CheckCircle2 size={20} color="#10B981" />
                ) : (
                  <View style={[styles.checkbox, { borderColor: colors.border }]} />
                )}
                <View style={styles.skillContent}>
                  <Text style={[styles.skillName, { color: colors.text }]}>{skill.name}</Text>
                  <Text style={[styles.skillDesc, { color: colors.textSecondary }]}>{skill.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('certification')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Award size={20} color="#EC4899" />
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
                placeholder="Provider cert #"
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

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Expiration Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.expirationDate}
                onChangeText={(value) => handleInputChange('expirationDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Card Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.cardNumber}
                onChangeText={(value) => handleInputChange('cardNumber', value)}
                placeholder="If issued"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <Pressable
            style={[styles.cardIssuedRow, { 
              backgroundColor: formData.cardIssued ? '#10B98110' : colors.background,
              borderColor: formData.cardIssued ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('cardIssued', !formData.cardIssued)}
          >
            {formData.cardIssued ? (
              <CheckCircle2 size={20} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <Text style={[styles.cardIssuedText, { color: colors.text }]}>Certification Card Issued to Employee</Text>
          </Pressable>

          {formData.designatedResponder && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.text }]}>First Aid Kit Location Assignment</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={formData.firstAidKitLocation}
                  onChangeText={(value) => handleInputChange('firstAidKitLocation', value)}
                  placeholder="e.g., Production Area B, Kit #3"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.text }]}>AED Location Assignment</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={formData.aedLocation}
                  onChangeText={(value) => handleInputChange('aedLocation', value)}
                  placeholder="e.g., Main Hallway, AED Station 1"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </>
          )}

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
                  I acknowledge completing training and am prepared to respond to emergencies
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
                  I certify the employee has successfully completed all course requirements
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
                  Acknowledgment of employee&apos;s first aid/CPR certification
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
        style={[styles.submitButton, { backgroundColor: '#EC4899', opacity: isSubmitting ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Award size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Save First Aid/CPR Certification OCR</Text>
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
            <View style={[styles.recordIcon, { backgroundColor: '#EC489915' }]}>
              <Heart size={24} color="#EC4899" />
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

          {record.designatedResponder && (
            <View style={[styles.responderBadge, { backgroundColor: '#EC489910', borderColor: '#EC489930' }]}>
              <Shield size={14} color="#EC4899" />
              <Text style={[styles.responderBadgeText, { color: '#EC4899' }]}>Designated Responder</Text>
            </View>
          )}

          <View style={styles.certTags}>
            {record.certificationTypes.slice(0, 3).map((certId) => {
              const cert = CERTIFICATION_TYPES.find(c => c.id === certId);
              return (
                <View key={certId} style={[styles.certTag, { backgroundColor: '#EC489910', borderColor: '#EC489930' }]}>
                  <Text style={[styles.certTagText, { color: '#EC4899' }]}>
                    {cert?.name || certId}
                  </Text>
                </View>
              );
            })}
            {record.certificationTypes.length > 3 && (
              <View style={[styles.certTag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.certTagText, { color: colors.textSecondary }]}>
                  +{record.certificationTypes.length - 3} more
                </Text>
              </View>
            )}
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
            <Text style={[styles.recordProvider, { color: colors.textSecondary }]}>
              Provider: {record.trainingProvider}
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
          title: 'First Aid/CPR Cert OCR',
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
          style={[styles.tab, activeTab === 'new' && { backgroundColor: '#EC4899' }]}
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
          style={[styles.tab, activeTab === 'history' && { backgroundColor: '#EC4899' }]}
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
                  {formData.department === dept && <Check size={20} color="#EC4899" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showProviderPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Training Provider</Text>
              <Pressable onPress={() => setShowProviderPicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {TRAINING_PROVIDERS.map((provider) => (
                <Pressable
                  key={provider}
                  style={[styles.modalItem, { borderColor: colors.border }]}
                  onPress={() => {
                    handleInputChange('trainingProvider', provider);
                    setShowProviderPicker(false);
                  }}
                >
                  <Stethoscope size={20} color={colors.textSecondary} />
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{provider}</Text>
                  {formData.trainingProvider === provider && <Check size={20} color="#EC4899" />}
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
  infoBanner: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  infoText: {
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
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  pickerText: {
    fontSize: 15,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
  },
  smallCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
  },
  responderCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  responderContent: {
    flex: 1,
  },
  responderTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  responderDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  certCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  certContent: {
    flex: 1,
  },
  certHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 2,
  },
  certName: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  durationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  certDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  practiceRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  practiceCard: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  practiceText: {
    fontSize: 13,
    fontWeight: '500' as const,
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
  practicalPassButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
    marginBottom: 14,
  },
  practicalPassText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  skillCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  skillContent: {
    flex: 1,
  },
  skillName: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  skillDesc: {
    fontSize: 11,
    lineHeight: 14,
  },
  cardIssuedRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
    marginBottom: 14,
  },
  cardIssuedText: {
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
    marginBottom: 10,
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
  responderBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    gap: 6,
  },
  responderBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  certTags: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 12,
  },
  certTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  certTagText: {
    fontSize: 11,
    fontWeight: '500' as const,
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
  recordProvider: {
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
