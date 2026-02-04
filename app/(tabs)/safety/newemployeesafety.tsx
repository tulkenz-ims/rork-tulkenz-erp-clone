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
  UserPlus,
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
  Phone,
  MapPin,
  HardHat,
  Flame,
  Heart,
  Bell,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const ORIENTATION_TOPICS = [
  { id: 'welcome', name: 'Company Welcome & Overview', description: 'Company history, mission, and safety commitment', category: 'General' },
  { id: 'safety_policy', name: 'Safety Policy Review', description: 'Company safety policies and expectations', category: 'Policies' },
  { id: 'rules', name: 'General Safety Rules', description: 'Facility-wide safety rules and requirements', category: 'Policies' },
  { id: 'reporting', name: 'Injury & Incident Reporting', description: 'How to report injuries and incidents', category: 'Reporting' },
  { id: 'near_miss', name: 'Near-Miss Reporting', description: 'Importance of reporting near-misses', category: 'Reporting' },
  { id: 'emergency_evac', name: 'Emergency Evacuation', description: 'Evacuation routes and assembly points', category: 'Emergency' },
  { id: 'fire_safety', name: 'Fire Safety & Extinguishers', description: 'Fire prevention and extinguisher use', category: 'Emergency' },
  { id: 'first_aid', name: 'First Aid Locations', description: 'First aid kits and AED locations', category: 'Emergency' },
  { id: 'emergency_contacts', name: 'Emergency Contacts', description: 'Who to contact in emergencies', category: 'Emergency' },
  { id: 'ppe_general', name: 'PPE Requirements', description: 'Required personal protective equipment', category: 'PPE' },
  { id: 'ppe_use', name: 'PPE Proper Use', description: 'How to properly wear and maintain PPE', category: 'PPE' },
  { id: 'hazcom', name: 'Hazard Communication', description: 'SDS, labels, and chemical awareness', category: 'Hazards' },
  { id: 'housekeeping', name: 'Housekeeping Standards', description: 'Workplace cleanliness and organization', category: 'General' },
  { id: 'walking_surfaces', name: 'Walking & Working Surfaces', description: 'Slip, trip, and fall prevention', category: 'Hazards' },
  { id: 'machine_safety', name: 'Machine Safety Basics', description: 'General machine guarding awareness', category: 'Hazards' },
  { id: 'lockout_awareness', name: 'LOTO Awareness', description: 'Lockout/tagout for affected employees', category: 'Hazards' },
  { id: 'ergonomics', name: 'Ergonomics & Lifting', description: 'Proper lifting and ergonomic practices', category: 'Health' },
  { id: 'food_safety', name: 'Food Safety Basics', description: 'GMP and food safety awareness', category: 'Quality' },
  { id: 'allergen', name: 'Allergen Awareness', description: 'Understanding allergen controls', category: 'Quality' },
];

const PPE_REQUIREMENTS = [
  { id: 'safety_glasses', name: 'Safety Glasses', required: true },
  { id: 'hearing_protection', name: 'Hearing Protection', required: true },
  { id: 'safety_shoes', name: 'Safety Shoes/Boots', required: true },
  { id: 'hard_hat', name: 'Hard Hat', required: false },
  { id: 'gloves', name: 'Work Gloves', required: false },
  { id: 'cut_gloves', name: 'Cut-Resistant Gloves', required: false },
  { id: 'hair_net', name: 'Hair Net/Beard Net', required: true },
  { id: 'smock', name: 'Smock/Uniform', required: true },
  { id: 'respirator', name: 'Respirator', required: false },
  { id: 'face_shield', name: 'Face Shield', required: false },
];

const DEPARTMENTS = [
  'Production',
  'Packaging',
  'Warehouse',
  'Shipping/Receiving',
  'Maintenance',
  'Quality',
  'Sanitation',
  'Office/Admin',
];

const SHIFTS = [
  '1st Shift (Day)',
  '2nd Shift (Evening)',
  '3rd Shift (Night)',
  'Rotating',
];

interface OrientationFormData {
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  shift: string;
  hireDate: string;
  startDate: string;
  supervisorName: string;
  orientationDate: string;
  orientationHours: string;
  orientationTopics: string[];
  facilityTourCompleted: boolean;
  emergencyExitIdentified: boolean;
  assemblyPointIdentified: boolean;
  firstAidLocated: boolean;
  supervisorIntroduced: boolean;
  ppeIssued: string[];
  ppeIssuedDate: string;
  ppeAcknowledged: boolean;
  jobHazardsReviewed: boolean;
  specificHazards: string;
  questionsAnswered: boolean;
  trainerName: string;
  employeeSignature: boolean;
  trainerSignature: boolean;
  supervisorSignature: boolean;
  hrSignature: boolean;
  followUpDate: string;
  notes: string;
}

interface OrientationRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  hireDate: string;
  orientationDate: string;
  status: 'complete' | 'pending' | 'incomplete';
  trainerName: string;
}

const initialFormData: OrientationFormData = {
  employeeName: '',
  employeeId: '',
  department: '',
  jobTitle: '',
  shift: '',
  hireDate: new Date().toISOString().split('T')[0],
  startDate: new Date().toISOString().split('T')[0],
  supervisorName: '',
  orientationDate: new Date().toISOString().split('T')[0],
  orientationHours: '',
  orientationTopics: [],
  facilityTourCompleted: false,
  emergencyExitIdentified: false,
  assemblyPointIdentified: false,
  firstAidLocated: false,
  supervisorIntroduced: false,
  ppeIssued: [],
  ppeIssuedDate: new Date().toISOString().split('T')[0],
  ppeAcknowledged: false,
  jobHazardsReviewed: false,
  specificHazards: '',
  questionsAnswered: false,
  trainerName: '',
  employeeSignature: false,
  trainerSignature: false,
  supervisorSignature: false,
  hrSignature: false,
  followUpDate: '',
  notes: '',
};

export default function NewEmployeeSafetyScreen() {
  const { colors } = useTheme();
  useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<OrientationFormData>(initialFormData);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('employee');

  const [records] = useState<OrientationRecord[]>([
    {
      id: '1',
      employeeName: 'James Wilson',
      employeeId: 'EMP101',
      department: 'Production',
      hireDate: '2025-01-15',
      orientationDate: '2025-01-15',
      status: 'complete',
      trainerName: 'Maria Santos',
    },
    {
      id: '2',
      employeeName: 'Emily Chen',
      employeeId: 'EMP102',
      department: 'Quality',
      hireDate: '2025-01-20',
      orientationDate: '2025-01-20',
      status: 'complete',
      trainerName: 'Maria Santos',
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleInputChange = useCallback((field: keyof OrientationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleOrientationTopic = useCallback((topicId: string) => {
    setFormData(prev => ({
      ...prev,
      orientationTopics: prev.orientationTopics.includes(topicId)
        ? prev.orientationTopics.filter(t => t !== topicId)
        : [...prev.orientationTopics, topicId],
    }));
  }, []);

  const togglePPE = useCallback((ppeId: string) => {
    setFormData(prev => ({
      ...prev,
      ppeIssued: prev.ppeIssued.includes(ppeId)
        ? prev.ppeIssued.filter(p => p !== ppeId)
        : [...prev.ppeIssued, ppeId],
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
    if (!formData.department) {
      Alert.alert('Validation Error', 'Department must be selected');
      return false;
    }
    if (formData.orientationTopics.length < 10) {
      Alert.alert('Validation Error', 'At least 10 orientation topics must be completed');
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
      
      console.log('[NewEmployeeSafety] Submitting OCR record:', formData);
      
      Alert.alert(
        'OCR Record Created',
        `New employee safety orientation for ${formData.employeeName} has been saved successfully.`,
        [{ text: 'OK', onPress: () => setFormData(initialFormData) }]
      );
    } catch (error) {
      console.error('[NewEmployeeSafety] Submit error:', error);
      Alert.alert('Error', 'Failed to save record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'complete': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'incomplete': return '#EF4444';
      default: return '#6B7280';
    }
  }, []);

  const toggleSection = useCallback((section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSection(prev => prev === section ? null : section);
  }, []);

  const topicsCompleted = formData.orientationTopics.length;
  const ppeCount = formData.ppeIssued.length;

  const groupedTopics = ORIENTATION_TOPICS.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = [];
    }
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, typeof ORIENTATION_TOPICS>);

  const renderNewForm = () => (
    <View style={styles.formContainer}>
      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('employee')}
      >
        <View style={styles.sectionHeaderLeft}>
          <User size={20} color="#10B981" />
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
              placeholder="Enter new employee full name"
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
              <Text style={[styles.label, { color: colors.text }]}>Hire Date *</Text>
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
            <Text style={[styles.label, { color: colors.text }]}>Department *</Text>
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

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Job Title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.jobTitle}
                onChangeText={(value) => handleInputChange('jobTitle', value)}
                placeholder="Enter job title"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Shift</Text>
              <Pressable
                style={[styles.picker, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowShiftPicker(true)}
              >
                <Text style={[styles.pickerText, { color: formData.shift ? colors.text : colors.textSecondary }]}>
                  {formData.shift || 'Select'}
                </Text>
                <ChevronDown size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

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
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('orientation')}
      >
        <View style={styles.sectionHeaderLeft}>
          <FileText size={20} color="#10B981" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Orientation Training</Text>
          <View style={[styles.badge, { backgroundColor: topicsCompleted >= 10 ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: topicsCompleted >= 10 ? '#10B981' : '#F59E0B' }]}>
              {topicsCompleted}/{ORIENTATION_TOPICS.length}
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'orientation' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'orientation' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Orientation Date *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.orientationDate}
                onChangeText={(value) => handleInputChange('orientationDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Hours</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.orientationHours}
                onChangeText={(value) => handleInputChange('orientationHours', value)}
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
              placeholder="Enter trainer name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <Text style={[styles.subLabel, { color: colors.text }]}>Topics Covered (minimum 10 required) *</Text>
          
          {Object.entries(groupedTopics).map(([category, topics]) => (
            <View key={category} style={styles.topicCategory}>
              <Text style={[styles.categoryTitle, { color: colors.primary }]}>{category}</Text>
              {topics.map((topic) => (
                <Pressable
                  key={topic.id}
                  style={[styles.checkboxRow, { borderColor: colors.border }]}
                  onPress={() => toggleOrientationTopic(topic.id)}
                >
                  {formData.orientationTopics.includes(topic.id) ? (
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
          ))}
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('facility')}
      >
        <View style={styles.sectionHeaderLeft}>
          <MapPin size={20} color="#10B981" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Facility Orientation</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'facility' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'facility' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.checkItem, { 
              backgroundColor: formData.facilityTourCompleted ? '#10B98115' : colors.background,
              borderColor: formData.facilityTourCompleted ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('facilityTourCompleted', !formData.facilityTourCompleted)}
          >
            {formData.facilityTourCompleted ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.checkItemContent}>
              <Text style={[styles.checkItemTitle, { color: colors.text }]}>Facility Tour Completed</Text>
              <Text style={[styles.checkItemDesc, { color: colors.textSecondary }]}>
                Employee was given a complete tour of the facility
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.checkItem, { 
              backgroundColor: formData.emergencyExitIdentified ? '#10B98115' : colors.background,
              borderColor: formData.emergencyExitIdentified ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('emergencyExitIdentified', !formData.emergencyExitIdentified)}
          >
            {formData.emergencyExitIdentified ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.checkItemContent}>
              <Text style={[styles.checkItemTitle, { color: colors.text }]}>Emergency Exits Identified</Text>
              <Text style={[styles.checkItemDesc, { color: colors.textSecondary }]}>
                All emergency exits in work area were shown
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.checkItem, { 
              backgroundColor: formData.assemblyPointIdentified ? '#10B98115' : colors.background,
              borderColor: formData.assemblyPointIdentified ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('assemblyPointIdentified', !formData.assemblyPointIdentified)}
          >
            {formData.assemblyPointIdentified ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.checkItemContent}>
              <Text style={[styles.checkItemTitle, { color: colors.text }]}>Assembly Point Shown</Text>
              <Text style={[styles.checkItemDesc, { color: colors.textSecondary }]}>
                Employee knows where to go during evacuation
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.checkItem, { 
              backgroundColor: formData.firstAidLocated ? '#10B98115' : colors.background,
              borderColor: formData.firstAidLocated ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('firstAidLocated', !formData.firstAidLocated)}
          >
            {formData.firstAidLocated ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.checkItemContent}>
              <Text style={[styles.checkItemTitle, { color: colors.text }]}>First Aid/AED Locations</Text>
              <Text style={[styles.checkItemDesc, { color: colors.textSecondary }]}>
                First aid stations and AED locations identified
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.checkItem, { 
              backgroundColor: formData.supervisorIntroduced ? '#10B98115' : colors.background,
              borderColor: formData.supervisorIntroduced ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('supervisorIntroduced', !formData.supervisorIntroduced)}
          >
            {formData.supervisorIntroduced ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.checkItemContent}>
              <Text style={[styles.checkItemTitle, { color: colors.text }]}>Introduced to Supervisor</Text>
              <Text style={[styles.checkItemDesc, { color: colors.textSecondary }]}>
                Employee met their direct supervisor
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('ppe')}
      >
        <View style={styles.sectionHeaderLeft}>
          <HardHat size={20} color="#10B981" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>PPE Issued</Text>
          <View style={[styles.badge, { backgroundColor: ppeCount > 0 ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: ppeCount > 0 ? '#10B981' : '#F59E0B' }]}>
              {ppeCount} Items
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'ppe' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'ppe' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>PPE Issue Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.ppeIssuedDate}
              onChangeText={(value) => handleInputChange('ppeIssuedDate', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <Text style={[styles.subLabel, { color: colors.text }]}>PPE Items Issued</Text>
          
          {PPE_REQUIREMENTS.map((ppe) => (
            <Pressable
              key={ppe.id}
              style={[styles.checkboxRow, { borderColor: colors.border }]}
              onPress={() => togglePPE(ppe.id)}
            >
              {formData.ppeIssued.includes(ppe.id) ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <Text style={[styles.checkboxLabel, { color: colors.text, flex: 1 }]}>{ppe.name}</Text>
              {ppe.required && (
                <View style={[styles.requiredBadge, { backgroundColor: '#EF444415' }]}>
                  <Text style={[styles.requiredText, { color: '#EF4444' }]}>Required</Text>
                </View>
              )}
            </Pressable>
          ))}

          <Pressable
            style={[styles.checkItem, { 
              backgroundColor: formData.ppeAcknowledged ? '#10B98115' : colors.background,
              borderColor: formData.ppeAcknowledged ? '#10B981' : colors.border,
              marginTop: 12,
            }]}
            onPress={() => handleInputChange('ppeAcknowledged', !formData.ppeAcknowledged)}
          >
            {formData.ppeAcknowledged ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.checkItemContent}>
              <Text style={[styles.checkItemTitle, { color: colors.text }]}>PPE Training Provided</Text>
              <Text style={[styles.checkItemDesc, { color: colors.textSecondary }]}>
                Employee trained on proper use and maintenance of PPE
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('hazards')}
      >
        <View style={styles.sectionHeaderLeft}>
          <AlertTriangle size={20} color="#10B981" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Job-Specific Hazards</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'hazards' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'hazards' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.checkItem, { 
              backgroundColor: formData.jobHazardsReviewed ? '#10B98115' : colors.background,
              borderColor: formData.jobHazardsReviewed ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('jobHazardsReviewed', !formData.jobHazardsReviewed)}
          >
            {formData.jobHazardsReviewed ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.checkItemContent}>
              <Text style={[styles.checkItemTitle, { color: colors.text }]}>Job Hazards Reviewed</Text>
              <Text style={[styles.checkItemDesc, { color: colors.textSecondary }]}>
                Specific hazards for the job position were discussed
              </Text>
            </View>
          </Pressable>

          <View style={[styles.fieldGroup, { marginTop: 12 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Specific Hazards Identified</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.specificHazards}
              onChangeText={(value) => handleInputChange('specificHazards', value)}
              placeholder="List specific hazards discussed for this position"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <Pressable
            style={[styles.checkItem, { 
              backgroundColor: formData.questionsAnswered ? '#10B98115' : colors.background,
              borderColor: formData.questionsAnswered ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('questionsAnswered', !formData.questionsAnswered)}
          >
            {formData.questionsAnswered ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.checkItemContent}>
              <Text style={[styles.checkItemTitle, { color: colors.text }]}>Questions Answered</Text>
              <Text style={[styles.checkItemDesc, { color: colors.textSecondary }]}>
                Employee had opportunity to ask questions
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('signatures')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Award size={20} color="#10B981" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Acknowledgment & Signatures</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'signatures' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'signatures' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>30-Day Follow-Up Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.followUpDate}
              onChangeText={(value) => handleInputChange('followUpDate', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={[styles.warningBanner, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <Bell size={20} color="#10B981" />
            <Text style={[styles.warningText, { color: '#10B981' }]}>
              A follow-up review should be conducted within 30 days to ensure understanding of safety requirements.
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
                  I have received new employee safety orientation and understand the safety requirements
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
                  I certify that orientation training was provided as documented
                </Text>
              </View>
            </Pressable>

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
                  Department supervisor acknowledgment
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.signatureBox, { 
                backgroundColor: formData.hrSignature ? '#10B98115' : colors.background,
                borderColor: formData.hrSignature ? '#10B981' : colors.border,
              }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleInputChange('hrSignature', !formData.hrSignature);
              }}
            >
              {formData.hrSignature ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <View style={styles.signatureContent}>
                <Text style={[styles.signatureLabel, { color: colors.text }]}>HR Representative Signature</Text>
                <Text style={[styles.signatureSubtext, { color: colors.textSecondary }]}>
                  Human Resources acknowledgment and file placement
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
        style={[styles.submitButton, { backgroundColor: '#10B981', opacity: isSubmitting ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <UserPlus size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Save New Employee Safety OCR</Text>
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
            <View style={[styles.recordIcon, { backgroundColor: '#10B98115' }]}>
              <UserPlus size={24} color="#10B981" />
            </View>
            <View style={styles.recordInfo}>
              <Text style={[styles.recordName, { color: colors.text }]}>{record.employeeName}</Text>
              <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                {record.employeeId} • {record.department}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + '15' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                {record.status === 'complete' ? 'Complete' : record.status === 'pending' ? 'Pending' : 'Incomplete'}
              </Text>
            </View>
          </View>

          <View style={styles.recordDetails}>
            <View style={styles.recordDetail}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                Hire Date: {record.hireDate}
              </Text>
            </View>
            <View style={styles.recordDetail}>
              <ClipboardCheck size={14} color={colors.textSecondary} />
              <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                Orientation: {record.orientationDate}
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
          title: 'New Employee Safety OCR',
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
          style={[styles.tab, activeTab === 'new' && { backgroundColor: '#10B981' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('new');
          }}
        >
          <Plus size={18} color={activeTab === 'new' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#FFFFFF' : colors.textSecondary }]}>
            New Orientation
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { backgroundColor: '#10B981' }]}
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
                  {formData.department === dept && <Check size={20} color="#10B981" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showShiftPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Shift</Text>
              <Pressable onPress={() => setShowShiftPicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {SHIFTS.map((shift) => (
                <Pressable
                  key={shift}
                  style={[styles.modalItem, { borderColor: colors.border }]}
                  onPress={() => {
                    handleInputChange('shift', shift);
                    setShowShiftPicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{shift}</Text>
                  {formData.shift === shift && <Check size={20} color="#10B981" />}
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
  topicCategory: {
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
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
  checkItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  checkItemContent: {
    flex: 1,
  },
  checkItemTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  checkItemDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '600' as const,
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
    flex: 1,
  },
});
