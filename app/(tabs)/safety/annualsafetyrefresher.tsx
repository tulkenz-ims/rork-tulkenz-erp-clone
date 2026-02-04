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
  RefreshCw,
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
  BookOpen,
  Target,
  TrendingUp,
  MessageSquare,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const REFRESHER_TOPICS = [
  { id: 'safety_policy', name: 'Safety Policy Review', description: 'Company safety policies and expectations', category: 'Policies' },
  { id: 'policy_updates', name: 'Policy Updates/Changes', description: 'New or revised safety policies since last training', category: 'Policies' },
  { id: 'safety_goals', name: 'Safety Goals & Metrics', description: 'Annual safety objectives and performance', category: 'Performance' },
  { id: 'incident_review', name: 'Incident Review', description: 'Lessons learned from incidents in past year', category: 'Performance' },
  { id: 'near_miss', name: 'Near-Miss Analysis', description: 'Review of near-miss trends and prevention', category: 'Performance' },
  { id: 'emergency_procedures', name: 'Emergency Procedures', description: 'Evacuation, fire, and emergency response', category: 'Emergency' },
  { id: 'first_aid', name: 'First Aid & AED', description: 'First aid procedures and AED locations', category: 'Emergency' },
  { id: 'severe_weather', name: 'Severe Weather Response', description: 'Tornado, earthquake, and weather emergencies', category: 'Emergency' },
  { id: 'hazcom', name: 'Hazard Communication', description: 'SDS, labels, and chemical safety', category: 'Hazards' },
  { id: 'ppe', name: 'PPE Requirements', description: 'Personal protective equipment review', category: 'Hazards' },
  { id: 'machine_guarding', name: 'Machine Guarding', description: 'Equipment safety and guarding requirements', category: 'Hazards' },
  { id: 'loto', name: 'LOTO Awareness', description: 'Lockout/tagout procedures refresher', category: 'Hazards' },
  { id: 'ergonomics', name: 'Ergonomics & Lifting', description: 'Proper lifting and ergonomic practices', category: 'Health' },
  { id: 'slips_trips', name: 'Slips, Trips & Falls', description: 'Prevention of walking/working surface hazards', category: 'Health' },
  { id: 'reporting', name: 'Incident Reporting', description: 'How and when to report injuries/incidents', category: 'Reporting' },
  { id: 'stop_work', name: 'Stop Work Authority', description: 'Employee right to stop unsafe work', category: 'Reporting' },
  { id: 'food_safety', name: 'Food Safety/GMP', description: 'Good manufacturing practices review', category: 'Quality' },
  { id: 'allergen', name: 'Allergen Awareness', description: 'Allergen controls and prevention', category: 'Quality' },
];

const YEAR_INCIDENTS = [
  { id: 'recordable', name: 'Recordable Injuries', placeholder: 'e.g., 3' },
  { id: 'lost_time', name: 'Lost Time Injuries', placeholder: 'e.g., 1' },
  { id: 'near_miss_count', name: 'Near-Miss Reports', placeholder: 'e.g., 24' },
  { id: 'first_aid', name: 'First Aid Cases', placeholder: 'e.g., 12' },
];

const ACKNOWLEDGMENTS = [
  { id: 'understand_policies', name: 'I understand the company safety policies', required: true },
  { id: 'know_procedures', name: 'I know the emergency procedures for my work area', required: true },
  { id: 'report_hazards', name: 'I will report hazards and unsafe conditions', required: true },
  { id: 'use_ppe', name: 'I will use required PPE at all times', required: true },
  { id: 'stop_work', name: 'I understand my stop work authority', required: true },
  { id: 'ask_questions', name: 'I will ask questions if unsure about safety', required: false },
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
  'All Departments',
];

interface RefresherFormData {
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  yearsOfService: string;
  lastRefresherDate: string;
  refresherDate: string;
  refresherYear: string;
  refresherHours: string;
  refresherTopics: string[];
  yearIncidents: { id: string; value: string }[];
  lessonsLearned: string;
  safetyGoalsReviewed: boolean;
  currentYearGoals: string;
  policyChangesReviewed: boolean;
  policyChanges: string;
  questionsAsked: boolean;
  employeeQuestions: string;
  acknowledgments: string[];
  trainerName: string;
  trainingMethod: string;
  employeeSignature: boolean;
  trainerSignature: boolean;
  supervisorName: string;
  supervisorSignature: boolean;
  nextRefresherDate: string;
  notes: string;
}

interface RefresherRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  refresherDate: string;
  refresherYear: string;
  nextDueDate: string;
  status: 'current' | 'due_soon' | 'overdue';
  trainerName: string;
}

const currentYear = new Date().getFullYear().toString();

const initialFormData: RefresherFormData = {
  employeeName: '',
  employeeId: '',
  department: '',
  jobTitle: '',
  yearsOfService: '',
  lastRefresherDate: '',
  refresherDate: new Date().toISOString().split('T')[0],
  refresherYear: currentYear,
  refresherHours: '',
  refresherTopics: [],
  yearIncidents: YEAR_INCIDENTS.map(i => ({ id: i.id, value: '' })),
  lessonsLearned: '',
  safetyGoalsReviewed: false,
  currentYearGoals: '',
  policyChangesReviewed: false,
  policyChanges: '',
  questionsAsked: false,
  employeeQuestions: '',
  acknowledgments: [],
  trainerName: '',
  trainingMethod: '',
  employeeSignature: false,
  trainerSignature: false,
  supervisorName: '',
  supervisorSignature: false,
  nextRefresherDate: '',
  notes: '',
};

export default function AnnualSafetyRefresherScreen() {
  const { colors } = useTheme();
  useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<RefresherFormData>(initialFormData);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('employee');

  const [records] = useState<RefresherRecord[]>([
    {
      id: '1',
      employeeName: 'Robert Johnson',
      employeeId: 'EMP023',
      department: 'Production',
      refresherDate: '2025-01-10',
      refresherYear: '2025',
      nextDueDate: '2026-01-10',
      status: 'current',
      trainerName: 'Safety Team',
    },
    {
      id: '2',
      employeeName: 'Lisa Martinez',
      employeeId: 'EMP045',
      department: 'Warehouse',
      refresherDate: '2024-01-15',
      refresherYear: '2024',
      nextDueDate: '2025-01-15',
      status: 'due_soon',
      trainerName: 'Safety Team',
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleInputChange = useCallback((field: keyof RefresherFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleRefresherTopic = useCallback((topicId: string) => {
    setFormData(prev => ({
      ...prev,
      refresherTopics: prev.refresherTopics.includes(topicId)
        ? prev.refresherTopics.filter(t => t !== topicId)
        : [...prev.refresherTopics, topicId],
    }));
  }, []);

  const toggleAcknowledgment = useCallback((ackId: string) => {
    setFormData(prev => ({
      ...prev,
      acknowledgments: prev.acknowledgments.includes(ackId)
        ? prev.acknowledgments.filter(a => a !== ackId)
        : [...prev.acknowledgments, ackId],
    }));
  }, []);

  const updateIncidentValue = useCallback((incidentId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      yearIncidents: prev.yearIncidents.map(i =>
        i.id === incidentId ? { ...i, value } : i
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
    if (!formData.department) {
      Alert.alert('Validation Error', 'Department must be selected');
      return false;
    }
    if (formData.refresherTopics.length < 8) {
      Alert.alert('Validation Error', 'At least 8 refresher topics must be completed');
      return false;
    }
    const requiredAcks = ACKNOWLEDGMENTS.filter(a => a.required).map(a => a.id);
    const hasAllRequired = requiredAcks.every(id => formData.acknowledgments.includes(id));
    if (!hasAllRequired) {
      Alert.alert('Validation Error', 'All required acknowledgments must be accepted');
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
      
      console.log('[AnnualSafetyRefresher] Submitting OCR record:', formData);
      
      Alert.alert(
        'OCR Record Created',
        `Annual safety refresher for ${formData.employeeName} (${formData.refresherYear}) has been saved successfully.`,
        [{ text: 'OK', onPress: () => setFormData(initialFormData) }]
      );
    } catch (error) {
      console.error('[AnnualSafetyRefresher] Submit error:', error);
      Alert.alert('Error', 'Failed to save record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'current': return '#10B981';
      case 'due_soon': return '#F59E0B';
      case 'overdue': return '#EF4444';
      default: return '#6B7280';
    }
  }, []);

  const toggleSection = useCallback((section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSection(prev => prev === section ? null : section);
  }, []);

  const topicsCompleted = formData.refresherTopics.length;
  const acksCompleted = formData.acknowledgments.length;

  const groupedTopics = REFRESHER_TOPICS.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = [];
    }
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, typeof REFRESHER_TOPICS>);

  const renderNewForm = () => (
    <View style={styles.formContainer}>
      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('employee')}
      >
        <View style={styles.sectionHeaderLeft}>
          <User size={20} color="#6366F1" />
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
              <Text style={[styles.label, { color: colors.text }]}>Years of Service</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.yearsOfService}
                onChangeText={(value) => handleInputChange('yearsOfService', value)}
                placeholder="e.g., 5"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
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
              <Text style={[styles.label, { color: colors.text }]}>Last Refresher</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.lastRefresherDate}
                onChangeText={(value) => handleInputChange('lastRefresherDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('training')}
      >
        <View style={styles.sectionHeaderLeft}>
          <BookOpen size={20} color="#6366F1" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Refresher Training</Text>
          <View style={[styles.badge, { backgroundColor: topicsCompleted >= 8 ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: topicsCompleted >= 8 ? '#10B981' : '#F59E0B' }]}>
              {topicsCompleted}/{REFRESHER_TOPICS.length}
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'training' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'training' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Refresher Date *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.refresherDate}
                onChangeText={(value) => handleInputChange('refresherDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Year</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.refresherYear}
                onChangeText={(value) => handleInputChange('refresherYear', value)}
                placeholder={currentYear}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Training Hours</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.refresherHours}
                onChangeText={(value) => handleInputChange('refresherHours', value)}
                placeholder="e.g., 2"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Training Method</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.trainingMethod}
                onChangeText={(value) => handleInputChange('trainingMethod', value)}
                placeholder="e.g., Classroom"
                placeholderTextColor={colors.textSecondary}
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

          <Text style={[styles.subLabel, { color: colors.text }]}>Topics Covered (minimum 8 required) *</Text>
          
          {Object.entries(groupedTopics).map(([category, topics]) => (
            <View key={category} style={styles.topicCategory}>
              <Text style={[styles.categoryTitle, { color: colors.primary }]}>{category}</Text>
              {topics.map((topic) => (
                <Pressable
                  key={topic.id}
                  style={[styles.checkboxRow, { borderColor: colors.border }]}
                  onPress={() => toggleRefresherTopic(topic.id)}
                >
                  {formData.refresherTopics.includes(topic.id) ? (
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
        onPress={() => toggleSection('performance')}
      >
        <View style={styles.sectionHeaderLeft}>
          <TrendingUp size={20} color="#6366F1" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Safety Performance Review</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'performance' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'performance' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.subLabel, { color: colors.text }]}>Prior Year Safety Statistics</Text>
          
          <View style={styles.statsGrid}>
            {YEAR_INCIDENTS.map((incident) => {
              const currentValue = formData.yearIncidents.find(i => i.id === incident.id)?.value || '';
              return (
                <View key={incident.id} style={[styles.statInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{incident.name}</Text>
                  <TextInput
                    style={[styles.statValue, { color: colors.text }]}
                    value={currentValue}
                    onChangeText={(value) => updateIncidentValue(incident.id, value)}
                    placeholder={incident.placeholder}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              );
            })}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Lessons Learned from Incidents</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.lessonsLearned}
              onChangeText={(value) => handleInputChange('lessonsLearned', value)}
              placeholder="Key takeaways from incidents reviewed during training"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <Pressable
            style={[styles.checkItem, { 
              backgroundColor: formData.safetyGoalsReviewed ? '#10B98115' : colors.background,
              borderColor: formData.safetyGoalsReviewed ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('safetyGoalsReviewed', !formData.safetyGoalsReviewed)}
          >
            {formData.safetyGoalsReviewed ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.checkItemContent}>
              <Text style={[styles.checkItemTitle, { color: colors.text }]}>Safety Goals Reviewed</Text>
              <Text style={[styles.checkItemDesc, { color: colors.textSecondary }]}>
                Current year safety goals were discussed
              </Text>
            </View>
          </Pressable>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Current Year Safety Goals</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.currentYearGoals}
              onChangeText={(value) => handleInputChange('currentYearGoals', value)}
              placeholder="Key safety objectives for the current year"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('updates')}
      >
        <View style={styles.sectionHeaderLeft}>
          <FileText size={20} color="#6366F1" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Policy Updates & Questions</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'updates' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'updates' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.checkItem, { 
              backgroundColor: formData.policyChangesReviewed ? '#10B98115' : colors.background,
              borderColor: formData.policyChangesReviewed ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('policyChangesReviewed', !formData.policyChangesReviewed)}
          >
            {formData.policyChangesReviewed ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.checkItemContent}>
              <Text style={[styles.checkItemTitle, { color: colors.text }]}>Policy Changes Reviewed</Text>
              <Text style={[styles.checkItemDesc, { color: colors.textSecondary }]}>
                New or updated policies were discussed
              </Text>
            </View>
          </Pressable>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Policy Changes/Updates</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.policyChanges}
              onChangeText={(value) => handleInputChange('policyChanges', value)}
              placeholder="List any new or changed policies discussed"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          <Pressable
            style={[styles.checkItem, { 
              backgroundColor: formData.questionsAsked ? '#10B98115' : colors.background,
              borderColor: formData.questionsAsked ? '#10B981' : colors.border,
            }]}
            onPress={() => handleInputChange('questionsAsked', !formData.questionsAsked)}
          >
            {formData.questionsAsked ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: colors.border }]} />
            )}
            <View style={styles.checkItemContent}>
              <Text style={[styles.checkItemTitle, { color: colors.text }]}>Questions Addressed</Text>
              <Text style={[styles.checkItemDesc, { color: colors.textSecondary }]}>
                Employee had opportunity to ask questions
              </Text>
            </View>
          </Pressable>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Employee Questions/Concerns</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.employeeQuestions}
              onChangeText={(value) => handleInputChange('employeeQuestions', value)}
              placeholder="Record any questions or concerns raised"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('acknowledgment')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Award size={20} color="#6366F1" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Acknowledgment & Signatures</Text>
          <View style={[styles.badge, { backgroundColor: acksCompleted >= 5 ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: acksCompleted >= 5 ? '#10B981' : '#F59E0B' }]}>
              {acksCompleted}/{ACKNOWLEDGMENTS.length}
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'acknowledgment' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'acknowledgment' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.subLabel, { color: colors.text }]}>Employee Acknowledgments</Text>
          
          {ACKNOWLEDGMENTS.map((ack) => (
            <Pressable
              key={ack.id}
              style={[styles.checkboxRow, { borderColor: colors.border }]}
              onPress={() => toggleAcknowledgment(ack.id)}
            >
              {formData.acknowledgments.includes(ack.id) ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <Text style={[styles.checkboxLabel, { color: colors.text, flex: 1 }]}>{ack.name}</Text>
              {ack.required && (
                <View style={[styles.requiredBadge, { backgroundColor: '#EF444415' }]}>
                  <Text style={[styles.requiredText, { color: '#EF4444' }]}>Required</Text>
                </View>
              )}
            </Pressable>
          ))}

          <View style={[styles.fieldGroup, { marginTop: 16 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Next Refresher Due Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.nextRefresherDate}
              onChangeText={(value) => handleInputChange('nextRefresherDate', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={[styles.warningBanner, { backgroundColor: '#6366F115', borderColor: '#6366F130' }]}>
            <RefreshCw size={20} color="#6366F1" />
            <Text style={[styles.warningText, { color: '#6366F1' }]}>
              Annual safety refresher training must be completed every 12 months.
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
                  I have received annual safety refresher training and understand my responsibilities
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
                  I certify that refresher training was provided as documented
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
        style={[styles.submitButton, { backgroundColor: '#6366F1', opacity: isSubmitting ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <RefreshCw size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Save Annual Safety Refresher OCR</Text>
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
            <View style={[styles.recordIcon, { backgroundColor: '#6366F115' }]}>
              <RefreshCw size={24} color="#6366F1" />
            </View>
            <View style={styles.recordInfo}>
              <Text style={[styles.recordName, { color: colors.text }]}>{record.employeeName}</Text>
              <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                {record.employeeId} • {record.department}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + '15' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                {record.status === 'current' ? 'Current' : record.status === 'due_soon' ? 'Due Soon' : 'Overdue'}
              </Text>
            </View>
          </View>

          <View style={styles.recordDetails}>
            <View style={styles.recordDetail}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                {record.refresherYear} Refresher: {record.refresherDate}
              </Text>
            </View>
            <View style={styles.recordDetail}>
              <RefreshCw size={14} color={colors.textSecondary} />
              <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                Next Due: {record.nextDueDate}
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
          title: 'Annual Safety Refresher OCR',
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
          style={[styles.tab, activeTab === 'new' && { backgroundColor: '#6366F1' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('new');
          }}
        >
          <Plus size={18} color={activeTab === 'new' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#FFFFFF' : colors.textSecondary }]}>
            New Refresher
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { backgroundColor: '#6366F1' }]}
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
                  {formData.department === dept && <Check size={20} color="#6366F1" />}
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
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 16,
  },
  statInput: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600' as const,
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
