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
import { Stack, useRouter } from 'expo-router';
import {
  Briefcase,
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
  Search,
  HardHat,
  Target,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

const JOB_CATEGORIES = [
  { id: 'production', name: 'Production/Manufacturing', color: '#3B82F6' },
  { id: 'maintenance', name: 'Maintenance/Repair', color: '#F97316' },
  { id: 'warehouse', name: 'Warehouse/Logistics', color: '#10B981' },
  { id: 'sanitation', name: 'Sanitation/Cleaning', color: '#8B5CF6' },
  { id: 'quality', name: 'Quality Control', color: '#EC4899' },
  { id: 'laboratory', name: 'Laboratory', color: '#6366F1' },
  { id: 'shipping', name: 'Shipping/Receiving', color: '#14B8A6' },
  { id: 'cold_storage', name: 'Cold Storage', color: '#0891B2' },
  { id: 'equipment', name: 'Equipment Operation', color: '#EAB308' },
  { id: 'chemical', name: 'Chemical Handling', color: '#EF4444' },
  { id: 'electrical', name: 'Electrical Work', color: '#F59E0B' },
  { id: 'confined_space', name: 'Confined Space Entry', color: '#7C3AED' },
];

const JOB_HAZARDS = [
  { id: 'machinery', name: 'Moving Machinery/Equipment' },
  { id: 'chemical_exposure', name: 'Chemical Exposure' },
  { id: 'slip_trip_fall', name: 'Slip, Trip, and Fall Hazards' },
  { id: 'ergonomic', name: 'Ergonomic/Repetitive Motion' },
  { id: 'noise', name: 'Noise Exposure' },
  { id: 'temperature', name: 'Temperature Extremes' },
  { id: 'electrical', name: 'Electrical Hazards' },
  { id: 'height', name: 'Working at Heights' },
  { id: 'confined_space', name: 'Confined Space Hazards' },
  { id: 'biological', name: 'Biological Hazards' },
  { id: 'radiation', name: 'Radiation' },
  { id: 'forklift', name: 'Powered Industrial Trucks' },
  { id: 'lockout', name: 'Lockout/Tagout Hazards' },
  { id: 'hot_work', name: 'Hot Work/Welding' },
  { id: 'compressed_gas', name: 'Compressed Gas' },
  { id: 'dust', name: 'Dust/Particulates' },
];

const REQUIRED_PPE = [
  { id: 'hard_hat', name: 'Hard Hat' },
  { id: 'safety_glasses', name: 'Safety Glasses' },
  { id: 'face_shield', name: 'Face Shield' },
  { id: 'hearing_protection', name: 'Hearing Protection' },
  { id: 'safety_shoes', name: 'Safety Shoes/Steel Toe' },
  { id: 'gloves', name: 'Work Gloves' },
  { id: 'chemical_gloves', name: 'Chemical-Resistant Gloves' },
  { id: 'cut_resistant', name: 'Cut-Resistant Gloves' },
  { id: 'respirator', name: 'Respirator/Dust Mask' },
  { id: 'apron', name: 'Protective Apron' },
  { id: 'coveralls', name: 'Coveralls/Smock' },
  { id: 'high_vis', name: 'High-Visibility Vest' },
  { id: 'fall_protection', name: 'Fall Protection Harness' },
  { id: 'insulated_gloves', name: 'Insulated/Electrical Gloves' },
  { id: 'bump_cap', name: 'Bump Cap' },
  { id: 'hair_net', name: 'Hair Net/Beard Cover' },
];

const COMPETENCY_ITEMS = [
  { id: 'hazard_recognition', name: 'Hazard Recognition', description: 'Identifies job-specific hazards correctly' },
  { id: 'ppe_selection', name: 'PPE Selection & Use', description: 'Selects and wears appropriate PPE' },
  { id: 'safe_procedures', name: 'Safe Work Procedures', description: 'Follows established safe work procedures' },
  { id: 'equipment_operation', name: 'Equipment Operation', description: 'Operates equipment safely and correctly' },
  { id: 'emergency_response', name: 'Emergency Response', description: 'Knows emergency procedures and locations' },
  { id: 'lockout_tagout', name: 'Lockout/Tagout', description: 'Understands LOTO requirements if applicable' },
  { id: 'chemical_handling', name: 'Chemical Handling', description: 'Handles chemicals safely (if applicable)' },
  { id: 'housekeeping', name: 'Housekeeping', description: 'Maintains clean and organized work area' },
  { id: 'reporting', name: 'Incident Reporting', description: 'Knows how to report incidents and near-misses' },
  { id: 'first_aid', name: 'First Aid Awareness', description: 'Knows location of first aid equipment' },
];

const DEPARTMENTS = [
  'Production',
  'Maintenance',
  'Quality',
  'Warehouse',
  'Sanitation',
  'Shipping/Receiving',
  'Laboratory',
  'Cold Storage',
  'Packaging',
];

interface TrainingFormData {
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  hireDate: string;
  jobCategory: string;
  specificJobDuties: string;
  jobHazards: string[];
  requiredPpe: string[];
  safeWorkProcedures: string;
  emergencyProcedures: string;
  trainingDate: string;
  trainingHours: string;
  trainingMethod: string;
  trainerName: string;
  trainerTitle: string;
  competencyDate: string;
  evaluatorName: string;
  competencyItems: { id: string; passed: boolean; notes: string }[];
  writtenTestScore: string;
  writtenTestPassed: boolean;
  practicalTestPassed: boolean;
  recordNumber: string;
  completionDate: string;
  refresherDueDate: string;
  restrictions: string;
  additionalTrainingRequired: string;
  employeeSignature: boolean;
  trainerSignature: boolean;
  supervisorName: string;
  supervisorSignature: boolean;
  notes: string;
}

interface TrainingRecord {
  id: string;
  organization_id: string;
  record_number: string;
  employee_name: string;
  employee_id: string;
  department: string;
  job_title: string;
  hire_date: string | null;
  job_category: string;
  specific_job_duties: string | null;
  job_hazards: string[];
  required_ppe: string[];
  safe_work_procedures: string | null;
  emergency_procedures: string | null;
  training_date: string;
  training_hours: number | null;
  training_method: string | null;
  trainer_name: string;
  trainer_title: string | null;
  competency_date: string | null;
  evaluator_name: string | null;
  competency_items: { id: string; passed: boolean; notes: string }[];
  written_test_score: number | null;
  written_test_passed: boolean;
  practical_test_passed: boolean;
  completion_date: string;
  refresher_due_date: string | null;
  restrictions: string | null;
  additional_training_required: string | null;
  employee_signature: boolean;
  trainer_signature: boolean;
  supervisor_name: string | null;
  supervisor_signature: boolean;
  notes: string | null;
  status: 'current' | 'expiring' | 'expired';
  created_at: string;
  updated_at: string;
}

const initialFormData: TrainingFormData = {
  employeeName: '',
  employeeId: '',
  department: '',
  jobTitle: '',
  hireDate: '',
  jobCategory: '',
  specificJobDuties: '',
  jobHazards: [],
  requiredPpe: [],
  safeWorkProcedures: '',
  emergencyProcedures: '',
  trainingDate: new Date().toISOString().split('T')[0],
  trainingHours: '',
  trainingMethod: '',
  trainerName: '',
  trainerTitle: '',
  competencyDate: new Date().toISOString().split('T')[0],
  evaluatorName: '',
  competencyItems: COMPETENCY_ITEMS.map(c => ({ id: c.id, passed: false, notes: '' })),
  writtenTestScore: '',
  writtenTestPassed: false,
  practicalTestPassed: false,
  recordNumber: '',
  completionDate: new Date().toISOString().split('T')[0],
  refresherDueDate: '',
  restrictions: '',
  additionalTrainingRequired: '',
  employeeSignature: false,
  trainerSignature: false,
  supervisorName: '',
  supervisorSignature: false,
  notes: '',
};

export default function JobSpecificSafetyScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<TrainingFormData>(initialFormData);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showJobCategoryPicker, setShowJobCategoryPicker] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('employee');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'current' | 'expiring' | 'expired'>('all');

  const organizationId = session?.user?.user_metadata?.organization_id;

  const { data: records = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['job-specific-safety-records', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      console.log('[JobSpecificSafety] Fetching records for org:', organizationId);
      
      try {
        const { data, error } = await supabase
          .from('job_specific_safety_training')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[JobSpecificSafety] Table may not exist, using empty data:', error.message);
          return [];
        }

        console.log('[JobSpecificSafety] Fetched records:', data?.length || 0);
        return (data || []) as TrainingRecord[];
      } catch (err) {
        console.warn('[JobSpecificSafety] Query failed, using empty data:', err);
        return [];
      }
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: TrainingFormData) => {
      if (!organizationId) throw new Error('No organization ID');

      const recordNumber = data.recordNumber || `JSS-${Date.now().toString(36).toUpperCase()}`;
      
      const today = new Date();
      const refresherDate = new Date(today);
      refresherDate.setFullYear(refresherDate.getFullYear() + 1);

      const record = {
        organization_id: organizationId,
        record_number: recordNumber,
        employee_name: data.employeeName,
        employee_id: data.employeeId,
        department: data.department,
        job_title: data.jobTitle,
        hire_date: data.hireDate || null,
        job_category: data.jobCategory,
        specific_job_duties: data.specificJobDuties || null,
        job_hazards: data.jobHazards,
        required_ppe: data.requiredPpe,
        safe_work_procedures: data.safeWorkProcedures || null,
        emergency_procedures: data.emergencyProcedures || null,
        training_date: data.trainingDate,
        training_hours: data.trainingHours ? parseFloat(data.trainingHours) : null,
        training_method: data.trainingMethod || null,
        trainer_name: data.trainerName,
        trainer_title: data.trainerTitle || null,
        competency_date: data.competencyDate || null,
        evaluator_name: data.evaluatorName || null,
        competency_items: data.competencyItems,
        written_test_score: data.writtenTestScore ? parseFloat(data.writtenTestScore) : null,
        written_test_passed: data.writtenTestPassed,
        practical_test_passed: data.practicalTestPassed,
        completion_date: data.completionDate,
        refresher_due_date: data.refresherDueDate || refresherDate.toISOString().split('T')[0],
        restrictions: data.restrictions || null,
        additional_training_required: data.additionalTrainingRequired || null,
        employee_signature: data.employeeSignature,
        trainer_signature: data.trainerSignature,
        supervisor_name: data.supervisorName || null,
        supervisor_signature: data.supervisorSignature,
        notes: data.notes || null,
        status: 'current' as const,
      };

      console.log('[JobSpecificSafety] Creating record:', record);

      const { data: result, error } = await supabase
        .from('job_specific_safety_training')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error('[JobSpecificSafety] Create error:', error);
        throw error;
      }

      return result;
    },
    onSuccess: (result) => {
      console.log('[JobSpecificSafety] Record created successfully:', result.id);
      queryClient.invalidateQueries({ queryKey: ['job-specific-safety-records'] });
      Alert.alert(
        'Record Created',
        `Job-specific safety training record for ${formData.employeeName} has been saved successfully.\n\nRecord #: ${result.record_number}`,
        [{ text: 'OK', onPress: () => setFormData(initialFormData) }]
      );
    },
    onError: (error: any) => {
      console.error('[JobSpecificSafety] Create mutation error:', error);
      const errorMsg = error?.message?.includes('does not exist') 
        ? 'Database table not configured yet. Please contact support.'
        : 'Failed to save record. Please try again.';
      Alert.alert('Error', errorMsg);
    },
  });

  const handleInputChange = useCallback((field: keyof TrainingFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleJobHazard = useCallback((hazardId: string) => {
    setFormData(prev => ({
      ...prev,
      jobHazards: prev.jobHazards.includes(hazardId)
        ? prev.jobHazards.filter(h => h !== hazardId)
        : [...prev.jobHazards, hazardId],
    }));
  }, []);

  const togglePpe = useCallback((ppeId: string) => {
    setFormData(prev => ({
      ...prev,
      requiredPpe: prev.requiredPpe.includes(ppeId)
        ? prev.requiredPpe.filter(p => p !== ppeId)
        : [...prev.requiredPpe, ppeId],
    }));
  }, []);

  const updateCompetencyItem = useCallback((itemId: string, field: 'passed' | 'notes', value: unknown) => {
    setFormData(prev => ({
      ...prev,
      competencyItems: prev.competencyItems.map(c =>
        c.id === itemId ? { ...c, [field]: value } : c
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
    if (!formData.jobCategory) {
      Alert.alert('Validation Error', 'Job category is required');
      return false;
    }
    if (!formData.jobTitle.trim()) {
      Alert.alert('Validation Error', 'Job title is required');
      return false;
    }
    if (formData.jobHazards.length === 0) {
      Alert.alert('Validation Error', 'At least one job hazard must be identified');
      return false;
    }
    if (formData.requiredPpe.length === 0) {
      Alert.alert('Validation Error', 'At least one PPE item must be selected');
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

  const { mutate: createJobSafety } = createMutation;

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createJobSafety(formData);
  }, [formData, validateForm, createJobSafety]);

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

  const passedCompetencyCount = formData.competencyItems.filter(c => c.passed).length;
  const selectedJobCategory = JOB_CATEGORIES.find(c => c.id === formData.jobCategory);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch = !searchQuery || 
        record.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.job_title.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, filterStatus]);

  const renderNewForm = () => (
    <View style={styles.formContainer}>
      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('employee')}
      >
        <View style={styles.sectionHeaderLeft}>
          <User size={20} color="#3B82F6" />
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
            <Text style={[styles.label, { color: colors.text }]}>Job Title *</Text>
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
        onPress={() => toggleSection('job')}
      >
        <View style={styles.sectionHeaderLeft}>
          <Briefcase size={20} color="#3B82F6" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Job Details & Hazards</Text>
          <View style={[styles.badge, { backgroundColor: formData.jobHazards.length > 0 ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: formData.jobHazards.length > 0 ? '#10B981' : '#F59E0B' }]}>
              {formData.jobHazards.length} Hazards
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'job' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'job' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Job Category *</Text>
            <Pressable
              style={[styles.picker, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowJobCategoryPicker(true)}
            >
              <Target size={18} color={selectedJobCategory?.color || colors.textSecondary} />
              <Text style={[styles.pickerText, { color: formData.jobCategory ? colors.text : colors.textSecondary }]}>
                {selectedJobCategory?.name || 'Select job category'}
              </Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Specific Job Duties</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.specificJobDuties}
              onChangeText={(value) => handleInputChange('specificJobDuties', value)}
              placeholder="Describe the specific duties and tasks performed"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <Text style={[styles.subLabel, { color: colors.text }]}>Job-Specific Hazards *</Text>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Select all hazards associated with this job
          </Text>
          
          {JOB_HAZARDS.map((hazard) => (
            <Pressable
              key={hazard.id}
              style={[styles.checkboxRow, { borderColor: colors.border }]}
              onPress={() => toggleJobHazard(hazard.id)}
            >
              {formData.jobHazards.includes(hazard.id) ? (
                <CheckCircle2 size={22} color="#EF4444" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>{hazard.name}</Text>
            </Pressable>
          ))}

          <View style={[styles.fieldGroup, { marginTop: 16 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Safe Work Procedures</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.safeWorkProcedures}
              onChangeText={(value) => handleInputChange('safeWorkProcedures', value)}
              placeholder="Key safe work procedures covered in training"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Emergency Procedures</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.emergencyProcedures}
              onChangeText={(value) => handleInputChange('emergencyProcedures', value)}
              placeholder="Job-specific emergency procedures covered"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('ppe')}
      >
        <View style={styles.sectionHeaderLeft}>
          <HardHat size={20} color="#3B82F6" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Required PPE</Text>
          <View style={[styles.badge, { backgroundColor: formData.requiredPpe.length > 0 ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: formData.requiredPpe.length > 0 ? '#10B981' : '#F59E0B' }]}>
              {formData.requiredPpe.length} Items
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'ppe' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'ppe' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Select all PPE required for this job
          </Text>
          
          {REQUIRED_PPE.map((ppe) => (
            <Pressable
              key={ppe.id}
              style={[styles.checkboxRow, { borderColor: colors.border }]}
              onPress={() => togglePpe(ppe.id)}
            >
              {formData.requiredPpe.includes(ppe.id) ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: colors.border }]} />
              )}
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>{ppe.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('training')}
      >
        <View style={styles.sectionHeaderLeft}>
          <FileText size={20} color="#3B82F6" />
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
              placeholder="e.g., Classroom, On-the-job, Hands-on Demo"
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
            <Text style={[styles.label, { color: colors.text }]}>Trainer Title/Position</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.trainerTitle}
              onChangeText={(value) => handleInputChange('trainerTitle', value)}
              placeholder="e.g., Safety Manager, Supervisor"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('competency')}
      >
        <View style={styles.sectionHeaderLeft}>
          <ClipboardCheck size={20} color="#3B82F6" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Competency Evaluation</Text>
          <View style={[styles.badge, { backgroundColor: passedCompetencyCount === COMPETENCY_ITEMS.length ? '#10B98115' : '#F59E0B15' }]}>
            <Text style={[styles.badgeText, { color: passedCompetencyCount === COMPETENCY_ITEMS.length ? '#10B981' : '#F59E0B' }]}>
              {passedCompetencyCount}/{COMPETENCY_ITEMS.length}
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
          
          {COMPETENCY_ITEMS.map((item) => {
            const evalItem = formData.competencyItems.find(c => c.id === item.id);
            return (
              <View key={item.id} style={[styles.criteriaCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Pressable
                  style={styles.criteriaHeader}
                  onPress={() => updateCompetencyItem(item.id, 'passed', !evalItem?.passed)}
                >
                  {evalItem?.passed ? (
                    <CheckCircle2 size={22} color="#10B981" />
                  ) : (
                    <View style={[styles.checkbox, { borderColor: colors.border }]} />
                  )}
                  <View style={styles.criteriaInfo}>
                    <Text style={[styles.criteriaName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.criteriaDesc, { color: colors.textSecondary }]}>{item.description}</Text>
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
          <Award size={20} color="#3B82F6" />
          <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Completion & Signatures</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: expandedSection === 'certification' ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expandedSection === 'certification' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Record #</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.recordNumber}
                onChangeText={(value) => handleInputChange('recordNumber', value)}
                placeholder="Auto-generated"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Completion Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={formData.completionDate}
                onChangeText={(value) => handleInputChange('completionDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Refresher Due Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.refresherDueDate}
              onChangeText={(value) => handleInputChange('refresherDueDate', value)}
              placeholder="YYYY-MM-DD (defaults to 1 year)"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Restrictions (if any)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.restrictions}
              onChangeText={(value) => handleInputChange('restrictions', value)}
              placeholder="e.g., Must work with experienced operator for 30 days"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Additional Training Required</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.additionalTrainingRequired}
              onChangeText={(value) => handleInputChange('additionalTrainingRequired', value)}
              placeholder="List any additional training needed before full authorization"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={[styles.warningBanner, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
            <AlertTriangle size={20} color="#3B82F6" />
            <Text style={[styles.warningText, { color: '#3B82F6' }]}>
              Job-specific training must be provided before the employee performs job tasks. Refresher training is recommended annually or when job duties change.
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
                  I acknowledge receiving job-specific safety training and understand the hazards and safe work procedures
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
                  I certify the employee has completed job-specific safety training and demonstrated competency
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
                  Supervisor acknowledgment of training completion and authorization to perform job duties
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
        style={[styles.submitButton, { backgroundColor: '#3B82F6', opacity: createMutation.isPending ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Briefcase size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Save Job-Specific Safety Training</Text>
          </>
        )}
      </Pressable>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.historyContainer}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, ID, or job title..."
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'current', 'expiring', 'expired'] as const).map((status) => (
          <Pressable
            key={status}
            style={[
              styles.filterButton,
              { backgroundColor: filterStatus === status ? '#3B82F6' : colors.surface, borderColor: colors.border }
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[styles.filterButtonText, { color: filterStatus === status ? '#FFFFFF' : colors.text }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading records...</Text>
        </View>
      ) : filteredRecords.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Briefcase size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Records Found</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Create your first job-specific safety training record'}
          </Text>
        </View>
      ) : (
        filteredRecords.map((record) => {
          const category = JOB_CATEGORIES.find(c => c.id === record.job_category);
          return (
            <Pressable
              key={record.id}
              style={[styles.recordCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.recordHeader}>
                <View style={[styles.recordIcon, { backgroundColor: (category?.color || '#3B82F6') + '15' }]}>
                  <Briefcase size={24} color={category?.color || '#3B82F6'} />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={[styles.recordName, { color: colors.text }]}>{record.employee_name}</Text>
                  <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                    {record.employee_id} • {record.job_title}
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
                  <Target size={14} color={colors.textSecondary} />
                  <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                    {category?.name || record.job_category}
                  </Text>
                </View>
                <View style={styles.recordDetail}>
                  <Shield size={14} color={colors.textSecondary} />
                  <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                    {record.job_hazards?.length || 0} hazards identified
                  </Text>
                </View>
                <View style={styles.recordDetail}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[styles.recordDetailText, { color: colors.textSecondary }]}>
                    Refresher: {record.refresher_due_date || 'Not set'}
                  </Text>
                </View>
              </View>

              <View style={styles.recordFooter}>
                <Text style={[styles.recordTrainer, { color: colors.textSecondary }]}>
                  Trainer: {record.trainer_name} • {record.department || 'No dept'}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Job-Specific Safety',
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
          style={[styles.tab, activeTab === 'new' && { backgroundColor: '#3B82F6' }]}
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
          style={[styles.tab, activeTab === 'history' && { backgroundColor: '#3B82F6' }]}
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
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
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
                  {formData.department === dept && <Check size={20} color="#3B82F6" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showJobCategoryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Job Category</Text>
              <Pressable onPress={() => setShowJobCategoryPicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {JOB_CATEGORIES.map((category) => (
                <Pressable
                  key={category.id}
                  style={[styles.modalItem, { borderColor: colors.border }]}
                  onPress={() => {
                    handleInputChange('jobCategory', category.id);
                    setShowJobCategoryPicker(false);
                  }}
                >
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{category.name}</Text>
                  {formData.jobCategory === category.id && <Check size={20} color={category.color} />}
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
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
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
    alignItems: 'flex-start' as const,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
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
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  filterContainer: {
    flexDirection: 'row' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  loadingContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  recordCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  recordHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  recordDetails: {
    gap: 6,
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
  bottomPadding: {
    height: 40,
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
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
