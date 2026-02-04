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
  FlaskConical,
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
  AlertTriangle,
  Droplets,
  Wind,
  Flame,
  Skull,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const HAZMAT_CATEGORIES = [
  { id: 'flammable', name: 'Flammable Liquids/Solids', icon: Flame, color: '#EF4444' },
  { id: 'corrosive', name: 'Corrosive Materials', icon: Droplets, color: '#F59E0B' },
  { id: 'toxic', name: 'Toxic/Poisonous', icon: Skull, color: '#8B5CF6' },
  { id: 'oxidizer', name: 'Oxidizers', icon: Wind, color: '#3B82F6' },
  { id: 'compressed', name: 'Compressed Gases', icon: Wind, color: '#10B981' },
  { id: 'reactive', name: 'Reactive Materials', icon: AlertTriangle, color: '#EC4899' },
  { id: 'biohazard', name: 'Biological Hazards', icon: FlaskConical, color: '#F97316' },
  { id: 'radioactive', name: 'Radioactive Materials', icon: AlertTriangle, color: '#6366F1' },
];

const TRAINING_MODULES = [
  { id: 'hazcom', name: 'Hazard Communication (HazCom)', description: 'GHS labels, SDS understanding, workplace labeling' },
  { id: 'sds', name: 'Safety Data Sheets', description: 'Reading and understanding SDS sections' },
  { id: 'ghs', name: 'GHS Labeling', description: 'Globally Harmonized System pictograms and signals' },
  { id: 'ppe_chem', name: 'Chemical PPE Selection', description: 'Selecting appropriate protective equipment' },
  { id: 'handling', name: 'Safe Handling Procedures', description: 'Proper techniques for handling hazmat' },
  { id: 'storage', name: 'Chemical Storage', description: 'Segregation, compatibility, containment' },
  { id: 'spill', name: 'Spill Response', description: 'Containment, cleanup, and reporting' },
  { id: 'disposal', name: 'Hazardous Waste Disposal', description: 'Proper disposal and documentation' },
  { id: 'emergency', name: 'Emergency Procedures', description: 'Evacuation, first aid, decontamination' },
  { id: 'exposure', name: 'Exposure Recognition', description: 'Signs, symptoms, and reporting' },
  { id: 'transport', name: 'Transportation Requirements', description: 'DOT regulations for hazmat transport' },
  { id: 'ammonia', name: 'Ammonia Safety', description: 'PSM compliance for ammonia systems' },
];

const COMPETENCY_CRITERIA = [
  { id: 'identify_hazards', name: 'Identify Chemical Hazards', description: 'Recognizes hazard classes and pictograms' },
  { id: 'read_sds', name: 'Read & Interpret SDS', description: 'Locates critical safety information' },
  { id: 'select_ppe', name: 'Select Correct PPE', description: 'Chooses appropriate protection for chemicals' },
  { id: 'handle_safely', name: 'Handle Chemicals Safely', description: 'Demonstrates proper handling techniques' },
  { id: 'spill_response', name: 'Respond to Spills', description: 'Knows containment and cleanup procedures' },
  { id: 'emergency_action', name: 'Emergency Actions', description: 'Knows evacuation and first aid procedures' },
  { id: 'storage_rules', name: 'Storage Requirements', description: 'Understands segregation and compatibility' },
  { id: 'waste_disposal', name: 'Proper Disposal', description: 'Follows hazardous waste procedures' },
];

const DEPARTMENTS = [
  'Maintenance',
  'Production',
  'Quality',
  'Warehouse',
  'Sanitation',
  'Laboratory',
  'Shipping/Receiving',
];

const SPECIFIC_CHEMICALS = [
  'Ammonia (Anhydrous)',
  'Chlorine',
  'Sodium Hydroxide (Caustic)',
  'Sulfuric Acid',
  'Hydrochloric Acid',
  'Nitric Acid',
  'Peracetic Acid',
  'Sodium Hypochlorite',
  'Hydrogen Peroxide',
  'Phosphoric Acid',
  'Quaternary Ammonium',
  'Lubricants/Oils',
  'Refrigerants',
  'Solvents',
];

interface TrainingFormData {
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  hireDate: string;
  hazmatCategories: string[];
  specificChemicals: string[];
  otherChemicals: string;
  trainingDate: string;
  trainingHours: string;
  trainingModules: string[];
  trainingMethod: string;
  trainerName: string;
  trainerCredentials: string;
  competencyDate: string;
  evaluatorName: string;
  competencyCriteria: { id: string; passed: boolean; notes: string }[];
  writtenTestScore: string;
  writtenTestPassed: boolean;
  practicalTestPassed: boolean;
  certificateNumber: string;
  trainingCompleteDate: string;
  refresherDueDate: string;
  restrictions: string;
  employeeSignature: boolean;
  trainerSignature: boolean;
  supervisorName: string;
  supervisorSignature: boolean;
  notes: string;
}

interface TrainingRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  hazmatCategories: string[];
  trainingDate: string;
  refresherDueDate: string;
  status: 'current' | 'expiring' | 'expired';
  trainerName: string;
}

const initialFormData: TrainingFormData = {
  employeeName: '',
  employeeId: '',
  department: '',
  jobTitle: '',
  hireDate: '',
  hazmatCategories: [],
  specificChemicals: [],
  otherChemicals: '',
  trainingDate: new Date().toISOString().split('T')[0],
  trainingHours: '',
  trainingModules: [],
  trainingMethod: '',
  trainerName: '',
  trainerCredentials: '',
  competencyDate: new Date().toISOString().split('T')[0],
  evaluatorName: '',
  competencyCriteria: COMPETENCY_CRITERIA.map(c => ({ id: c.id, passed: false, notes: '' })),
  writtenTestScore: '',
  writtenTestPassed: false,
  practicalTestPassed: false,
  certificateNumber: '',
  trainingCompleteDate: new Date().toISOString().split('T')[0],
  refresherDueDate: '',
  restrictions: '',
  employeeSignature: false,
  trainerSignature: false,
  supervisorName: '',
  supervisorSignature: false,
  notes: '',
};

export default function HazmatTrainingScreen() {
  const { colors } = useTheme();
  useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<TrainingFormData>(initialFormData);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showChemicalPicker, setShowChemicalPicker] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('employee');

  const [records] = useState<TrainingRecord[]>([
    {
      id: '1',
      employeeName: 'David Martinez',
      employeeId: 'EMP056',
      department: 'Sanitation',
      hazmatCategories: ['corrosive', 'toxic', 'oxidizer'],
      trainingDate: '2024-07-20',
      refresherDueDate: '2025-07-20',
      status: 'current',
      trainerName: 'Lisa Chen',
    },
    {
      id: '2',
      employeeName: 'Angela Thompson',
      employeeId: 'EMP072',
      department: 'Maintenance',
      hazmatCategories: ['flammable', 'compressed', 'corrosive'],
      trainingDate: '2024-01-15',
      refresherDueDate: '2025-01-15',
      status: 'expiring',
      trainerName: 'Lisa Chen',
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleInputChange = useCallback((field: keyof TrainingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleHazmatCategory = useCallback((categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      hazmatCategories: prev.hazmatCategories.includes(categoryId)
        ? prev.hazmatCategories.filter(c => c !== categoryId)
        : [...prev.hazmatCategories, categoryId],
    }));
  }, []);

  const toggleSpecificChemical = useCallback((chemical: string) => {
    setFormData(prev => ({
      ...prev,
      specificChemicals: prev.specificChemicals.includes(chemical)
        ? prev.specificChemicals.filter(c => c !== chemical)
        : [...prev.specificChemicals, chemical],
    }));
  }, []);

  const toggleTrainingModule = useCallback((moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      trainingModules: prev.trainingModules.includes(moduleId)
        ? prev.trainingModules.filter(m => m !== moduleId)
        : [...prev.trainingModules, moduleId],
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
    if (formData.hazmatCategories.length === 0) {
      Alert.alert('Validation Error', 'At least one hazmat category must be selected');
      return false;
    }
    if (formData.trainingModules.length === 0) {
      Alert.alert('Validation Error', 'At least one training module must be completed');
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
    if (!formData.trainerSignature) {
      Alert.alert('Validation Error', 'Trainer signature is required');
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
      
      console.log('[HazmatTraining] Submitting OCR record:', formData);
      
      Alert.alert(
        'OCR Record Created',
        `Hazmat training record for ${formData.employeeName} has been saved successfully. Certificate #: ${formData.certificateNumber || 'Auto-generated'}`,
        [{ text: 'OK', onPress: () => setFormData(initialFormData) }]
      );
    } catch (error) {
      console.error('[HazmatTraining] Submit error:', error);
      Alert.alert('Error', 'Failed to save record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'current': return '#10B981';
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
  const modulesCompleted = formData.trainingModules.length;

  const renderNewForm = () => (
    <View style={styles.formContainer}>
      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('employee')}
      >
        <View style={styles.sectionHeaderLeft}>
          <User size={20} color="#F59E0B" />
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
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('chemicals')}
      >
        <View style={styles.sectionHeaderLeft}>
          <FlaskConical size={20} color="#F59E0B" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Chemical Exposure</Text>
          <View style={[styles.badge, { backgroundColor: formData.hazmatCategories.length > 0 ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: formData.hazmatCategories.length > 0 ? '#10B981' : '#F59E0B' }]}>
              {formData.hazmatCategories.length} Categories
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'chemicals' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'chemicals' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Hazardous Material Categories *</Text>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Select all hazmat categories the employee will work with
          </Text>
          
          <View style={styles.categoryGrid}>
            {HAZMAT_CATEGORIES.map((category) => {
              const IconComponent = category.icon;
              const isSelected = formData.hazmatCategories.includes(category.id);
              return (
                <Pressable
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    { 
                      backgroundColor: isSelected ? category.color + '15' : colors.background,
                      borderColor: isSelected ? category.color : colors.border,
                    }
                  ]}
                  onPress={() => toggleHazmatCategory(category.id)}
                >
                  <IconComponent size={24} color={category.color} />
                  <Text style={[styles.categoryLabel, { color: isSelected ? category.color : colors.text }]}>
                    {category.name}
                  </Text>
                  {isSelected && <CheckCircle2 size={16} color={category.color} style={styles.categoryCheck} />}
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.fieldGroup, { marginTop: 16 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Specific Chemicals</Text>
            <Pressable
              style={[styles.picker, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowChemicalPicker(true)}
            >
              <FlaskConical size={18} color={colors.textSecondary} />
              <Text style={[styles.pickerText, { color: formData.specificChemicals.length > 0 ? colors.text : colors.textSecondary }]}>
                {formData.specificChemicals.length > 0 
                  ? `${formData.specificChemicals.length} chemicals selected`
                  : 'Select specific chemicals'}
              </Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Other Chemicals (not listed)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.otherChemicals}
              onChangeText={(value) => handleInputChange('otherChemicals', value)}
              placeholder="List any additional chemicals not in the standard list"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('training')}
      >
        <View style={styles.sectionHeaderLeft}>
          <FileText size={20} color="#F59E0B" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Training Details</Text>
          <View style={[styles.badge, { backgroundColor: modulesCompleted === TRAINING_MODULES.length ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: modulesCompleted === TRAINING_MODULES.length ? '#10B981' : '#F59E0B' }]}>
              {modulesCompleted}/{TRAINING_MODULES.length}
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
                placeholder="e.g., 4"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Training Method</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.trainingMethod}
              onChangeText={(value) => handleInputChange('trainingMethod', value)}
              placeholder="e.g., Classroom, Online, Hands-on"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Trainer Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.trainerName}
              onChangeText={(value) => handleInputChange('trainerName', value)}
              placeholder="Enter trainer name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Trainer Credentials</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.trainerCredentials}
              onChangeText={(value) => handleInputChange('trainerCredentials', value)}
              placeholder="e.g., OSHA 40-Hour HAZWOPER, CIH"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <Text style={[styles.subLabel, { color: colors.text }]}>Training Modules Completed *</Text>
          
          {TRAINING_MODULES.map((module) => (
            <Pressable
              key={module.id}
              style={[styles.checkboxRow, { borderColor: colors.border }]}
              onPress={() => toggleTrainingModule(module.id)}
            >
              {formData.trainingModules.includes(module.id) ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.checkboxContent}>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>{module.name}</Text>
                <Text style={[styles.checkboxMeta, { color: colors.textSecondary }]}>{module.description}</Text>
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
          <ClipboardCheck size={20} color="#F59E0B" />
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
              Practical Demonstration {formData.practicalTestPassed ? 'Passed' : 'Not Passed'}
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('certification')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Award size={20} color="#F59E0B" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Certification & Signatures</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'certification' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'certification' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Certificate #</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.certificateNumber}
                onChangeText={(value) => handleInputChange('certificateNumber', value)}
                placeholder="Auto-generated"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Completion Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.trainingCompleteDate}
                onChangeText={(value) => handleInputChange('trainingCompleteDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Annual Refresher Due Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.refresherDueDate}
              onChangeText={(value) => handleInputChange('refresherDueDate', value)}
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
              placeholder="e.g., No ammonia exposure, supervised handling only, etc."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={[styles.warningBanner, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <AlertTriangle size={20} color="#F59E0B" />
            <Text style={[styles.warningText, { color: '#F59E0B' }]}>
              Annual refresher training is required. Additional training required when new hazards are introduced.
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
                  I acknowledge receiving hazmat training and understand the hazards
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.signatureBox, { 
                backgroundColor: formData.trainerSignature ? '#10B98115' : colors.background,
                borderColor: formData.trainerSignature ? '#10B981' : colors.border,
              }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleInputChange('trainerSignature', !formData.trainerSignature);
              }}
            >
              {formData.trainerSignature ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.signatureContent}>
                <Text style={[styles.signatureLabel, { color: colors.text }]}>Trainer Signature *</Text>
                <Text style={[styles.signatureSubtext, { color: colors.textSecondary }]}>
                  I certify the employee has completed hazmat training and demonstrated competency
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
                  Supervisor acknowledgment of training completion
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
        style={[styles.submitButton, { backgroundColor: '#F59E0B', opacity: isSubmitting ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <FlaskConical size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Save Hazmat Training OCR</Text>
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
            <View style={[styles.recordIcon, { backgroundColor: '#F59E0B15' }]}>
              <FlaskConical size={24} color="#F59E0B" />
            </View>
            <View style={styles.recordInfo}>
              <Text style={[styles.recordName, { color: colors.text }]}>{record.employeeName}</Text>
              <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                {record.employeeId} • {record.department}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + '15' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                {record.status === 'current' ? 'Current' : record.status === 'expiring' ? 'Expiring' : 'Expired'}
              </Text>
            </View>
          </View>

          <View style={styles.recordDetails}>
            <View style={styles.recordDetail}>
              <Shield size={14} color={colors.textSecondary} />
              <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                {record.hazmatCategories.length} hazmat categories
              </Text>
            </View>
            <View style={styles.recordDetail}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                Refresher Due: {record.refresherDueDate}
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
          title: 'Hazmat Training Record OCR',
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
          style={[styles.tab, activeTab === 'new' && { backgroundColor: '#F59E0B' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('new');
          }}
        >
          <Plus size={18} color={activeTab === 'new' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#FFFFFF' : colors.textSecondary }]}>
            New Record
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { backgroundColor: '#F59E0B' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('history');
          }}
        >
          <History size={18} color={activeTab === 'history' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#FFFFFF' : colors.textSecondary }]}>
            Records
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
                  {formData.department === dept && <Check size={20} color="#F59E0B" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showChemicalPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Chemicals</Text>
              <Pressable onPress={() => setShowChemicalPicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {SPECIFIC_CHEMICALS.map((chemical) => (
                <Pressable
                  key={chemical}
                  style={[styles.modalItem, { borderColor: colors.border }]}
                  onPress={() => toggleSpecificChemical(chemical)}
                >
                  <FlaskConical size={20} color={colors.textSecondary} />
                  <Text style={[styles.modalItemText, { color: colors.text, flex: 1 }]}>{chemical}</Text>
                  {formData.specificChemicals.includes(chemical) && <CheckCircle2 size={20} color="#F59E0B" />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.modalDoneButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => setShowChemicalPicker(false)}
            >
              <Text style={styles.modalDoneButtonText}>Done ({formData.specificChemicals.length} selected)</Text>
            </Pressable>
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
  categoryGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 8,
  },
  categoryCard: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
    gap: 6,
    position: 'relative' as const,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  categoryCheck: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
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
  modalItemText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  modalDoneButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  modalDoneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
