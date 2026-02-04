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
  Plus,
  X,
  Check,
  ChevronDown,
  History,
  CheckCircle2,
  Search,
  Filter,
  Building2,
  GraduationCap,
  Award,
  ArrowLeft,
  Edit3,
  Trash2,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface TrainingRequirement {
  id: string;
  name: string;
  frequency: 'annual' | 'biannual' | 'triennial' | 'one_time' | 'as_needed';
  regulatoryRef: string;
  category: string;
}

const TRAINING_REQUIREMENTS: TrainingRequirement[] = [
  { id: 'safety_orientation', name: 'Safety Orientation', frequency: 'one_time', regulatoryRef: 'OSHA 1910.1', category: 'General Safety' },
  { id: 'hazcom', name: 'Hazard Communication', frequency: 'annual', regulatoryRef: 'OSHA 1910.1200', category: 'Chemical Safety' },
  { id: 'lockout_tagout', name: 'Lockout/Tagout', frequency: 'annual', regulatoryRef: 'OSHA 1910.147', category: 'Machine Safety' },
  { id: 'forklift', name: 'Forklift/PIT Operation', frequency: 'triennial', regulatoryRef: 'OSHA 1910.178', category: 'Equipment' },
  { id: 'confined_space', name: 'Confined Space Entry', frequency: 'annual', regulatoryRef: 'OSHA 1910.146', category: 'Permit Required' },
  { id: 'first_aid_cpr', name: 'First Aid/CPR/AED', frequency: 'biannual', regulatoryRef: 'OSHA 1910.151', category: 'Emergency Response' },
  { id: 'fire_safety', name: 'Fire Safety/Extinguisher', frequency: 'annual', regulatoryRef: 'OSHA 1910.157', category: 'Fire Safety' },
  { id: 'ppe', name: 'PPE Training', frequency: 'annual', regulatoryRef: 'OSHA 1910.132', category: 'PPE' },
  { id: 'bloodborne', name: 'Bloodborne Pathogens', frequency: 'annual', regulatoryRef: 'OSHA 1910.1030', category: 'Health' },
  { id: 'electrical_safety', name: 'Electrical Safety', frequency: 'annual', regulatoryRef: 'OSHA 1910.331', category: 'Electrical' },
  { id: 'fall_protection', name: 'Fall Protection', frequency: 'annual', regulatoryRef: 'OSHA 1910.140', category: 'Fall Prevention' },
  { id: 'respiratory', name: 'Respiratory Protection', frequency: 'annual', regulatoryRef: 'OSHA 1910.134', category: 'Respiratory' },
];

const DEPARTMENTS = [
  'Production',
  'Maintenance',
  'Warehouse',
  'Quality',
  'Sanitation',
  'Administration',
  'Shipping/Receiving',
  'Engineering',
];

interface MatrixFormData {
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  hireDate: string;
  selectedTrainings: {
    requirementId: string;
    completedDate: string;
    trainerId: string;
    certificateNumber: string;
    notes: string;
  }[];
  supervisorName: string;
  supervisorSignature: boolean;
  verificationDate: string;
  notes: string;
}

interface MatrixRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  trainingsCompleted: number;
  trainingsRequired: number;
  complianceRate: number;
  lastUpdated: string;
  status: 'compliant' | 'expiring' | 'non_compliant';
}

const initialFormData: MatrixFormData = {
  employeeName: '',
  employeeId: '',
  department: '',
  jobTitle: '',
  hireDate: new Date().toISOString().split('T')[0],
  selectedTrainings: [],
  supervisorName: '',
  supervisorSignature: false,
  verificationDate: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function TrainingMatrixScreen() {
  const { colors } = useTheme();
  useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<MatrixFormData>(initialFormData);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showTrainingPicker, setShowTrainingPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment] = useState('');

  const [records] = useState<MatrixRecord[]>([
    {
      id: '1',
      employeeName: 'John Smith',
      employeeId: 'EMP001',
      department: 'Production',
      trainingsCompleted: 10,
      trainingsRequired: 12,
      complianceRate: 83,
      lastUpdated: '2025-01-28',
      status: 'expiring',
    },
    {
      id: '2',
      employeeName: 'Maria Garcia',
      employeeId: 'EMP002',
      department: 'Maintenance',
      trainingsCompleted: 12,
      trainingsRequired: 12,
      complianceRate: 100,
      lastUpdated: '2025-01-25',
      status: 'compliant',
    },
    {
      id: '3',
      employeeName: 'Robert Johnson',
      employeeId: 'EMP003',
      department: 'Warehouse',
      trainingsCompleted: 8,
      trainingsRequired: 12,
      complianceRate: 67,
      lastUpdated: '2025-01-20',
      status: 'non_compliant',
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleInputChange = useCallback((field: keyof MatrixFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const addTraining = useCallback((requirementId: string) => {
    const existing = formData.selectedTrainings.find(t => t.requirementId === requirementId);
    if (!existing) {
      setFormData(prev => ({
        ...prev,
        selectedTrainings: [
          ...prev.selectedTrainings,
          {
            requirementId,
            completedDate: new Date().toISOString().split('T')[0],
            trainerId: '',
            certificateNumber: '',
            notes: '',
          },
        ],
      }));
    }
    setShowTrainingPicker(false);
  }, [formData.selectedTrainings]);

  const removeTraining = useCallback((requirementId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTrainings: prev.selectedTrainings.filter(t => t.requirementId !== requirementId),
    }));
  }, []);

  const updateTraining = useCallback((requirementId: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTrainings: prev.selectedTrainings.map(t =>
        t.requirementId === requirementId ? { ...t, [field]: value } : t
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
      Alert.alert('Validation Error', 'Department is required');
      return false;
    }
    if (formData.selectedTrainings.length === 0) {
      Alert.alert('Validation Error', 'At least one training must be selected');
      return false;
    }
    if (!formData.supervisorSignature) {
      Alert.alert('Validation Error', 'Supervisor signature is required');
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
      
      console.log('[TrainingMatrix] Submitting OCR record:', formData);
      
      Alert.alert(
        'OCR Record Created',
        `Training matrix record for ${formData.employeeName} has been saved successfully with ${formData.selectedTrainings.length} training(s) documented.`,
        [{ text: 'OK', onPress: () => setFormData(initialFormData) }]
      );
    } catch (error) {
      console.error('[TrainingMatrix] Submit error:', error);
      Alert.alert('Error', 'Failed to save record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'compliant': return '#10B981';
      case 'expiring': return '#F59E0B';
      case 'non_compliant': return '#EF4444';
      default: return '#6B7280';
    }
  }, []);

  const getFrequencyLabel = useCallback((frequency: string) => {
    switch (frequency) {
      case 'annual': return 'Annual';
      case 'biannual': return 'Every 2 Years';
      case 'triennial': return 'Every 3 Years';
      case 'one_time': return 'One Time';
      case 'as_needed': return 'As Needed';
      default: return frequency;
    }
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch = searchQuery === '' || 
        record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = filterDepartment === '' || record.department === filterDepartment;
      return matchesSearch && matchesDept;
    });
  }, [records, searchQuery, filterDepartment]);

  const renderNewForm = () => (
    <View style={styles.formContainer}>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Employee Information</Text>

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

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Records</Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: '#8B5CF615' }]}
            onPress={() => setShowTrainingPicker(true)}
          >
            <Plus size={16} color="#8B5CF6" />
            <Text style={[styles.addButtonText, { color: '#8B5CF6' }]}>Add Training</Text>
          </Pressable>
        </View>

        {formData.selectedTrainings.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <GraduationCap size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No trainings added yet. Tap &quot;Add Training&quot; to document completed training.
            </Text>
          </View>
        ) : (
          formData.selectedTrainings.map((training) => {
            const requirement = TRAINING_REQUIREMENTS.find(r => r.id === training.requirementId);
            if (!requirement) return null;
            return (
              <View key={training.requirementId} style={[styles.trainingCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.trainingCardHeader}>
                  <View style={styles.trainingInfo}>
                    <Text style={[styles.trainingName, { color: colors.text }]}>{requirement.name}</Text>
                    <Text style={[styles.trainingMeta, { color: colors.textSecondary }]}>
                      {requirement.regulatoryRef} • {getFrequencyLabel(requirement.frequency)}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeTraining(training.requirementId)}>
                    <Trash2 size={18} color="#EF4444" />
                  </Pressable>
                </View>
                
                <View style={styles.trainingFields}>
                  <View style={styles.row}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Completion Date</Text>
                      <TextInput
                        style={[styles.smallInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        value={training.completedDate}
                        onChangeText={(value) => updateTraining(training.requirementId, 'completedDate', value)}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Certificate #</Text>
                      <TextInput
                        style={[styles.smallInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        value={training.certificateNumber}
                        onChangeText={(value) => updateTraining(training.requirementId, 'certificateNumber', value)}
                        placeholder="Optional"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Trainer/Instructor</Text>
                    <TextInput
                      style={[styles.smallInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                      value={training.trainerId}
                      onChangeText={(value) => updateTraining(training.requirementId, 'trainerId', value)}
                      placeholder="Trainer name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Supervisor Verification</Text>

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
            <CheckCircle2 size={24} color="#10B981" />
          ) : (
            <View style={[styles.checkbox, { borderColor: colors.border }]} />
          )}
          <View style={styles.signatureContent}>
            <Text style={[styles.signatureText, { color: colors.text }]}>
              Supervisor Verification Signature
            </Text>
            <Text style={[styles.signatureSubtext, { color: colors.textSecondary }]}>
              I verify that the training records above are accurate and complete
            </Text>
          </View>
        </Pressable>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Verification Date</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={formData.verificationDate}
            onChangeText={(value) => handleInputChange('verificationDate', value)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={formData.notes}
            onChangeText={(value) => handleInputChange('notes', value)}
            placeholder="Additional notes or comments"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <Pressable
        style={[styles.submitButton, { backgroundColor: '#8B5CF6', opacity: isSubmitting ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Save Training Matrix OCR</Text>
          </>
        )}
      </Pressable>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.historyContainer}>
      <View style={styles.searchFilterRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search employees..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <Pressable
          style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowDepartmentPicker(true)}
        >
          <Filter size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {filteredRecords.map((record) => (
        <Pressable
          key={record.id}
          style={[styles.recordCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.recordHeader}>
            <View style={styles.recordInfo}>
              <Text style={[styles.recordName, { color: colors.text }]}>{record.employeeName}</Text>
              <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                {record.employeeId} • {record.department}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + '15' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                {record.status === 'compliant' ? 'Compliant' : record.status === 'expiring' ? 'Expiring' : 'Non-Compliant'}
              </Text>
            </View>
          </View>
          
          <View style={styles.recordStats}>
            <View style={styles.recordStat}>
              <CheckCircle2 size={16} color="#10B981" />
              <Text style={[styles.recordStatText, { color: colors.text }]}>
                {record.trainingsCompleted}/{record.trainingsRequired} Complete
              </Text>
            </View>
            <View style={styles.recordStat}>
              <Award size={16} color="#8B5CF6" />
              <Text style={[styles.recordStatText, { color: colors.text }]}>
                {record.complianceRate}% Compliance
              </Text>
            </View>
          </View>

          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: getStatusColor(record.status),
                  width: `${record.complianceRate}%`,
                }
              ]} 
            />
          </View>

          <View style={styles.recordFooter}>
            <Text style={[styles.recordDate, { color: colors.textSecondary }]}>
              Updated: {record.lastUpdated}
            </Text>
            <View style={styles.recordActions}>
              <Pressable style={styles.actionButton}>
                <Edit3 size={16} color="#3B82F6" />
              </Pressable>
              <Pressable style={styles.actionButton}>
                <RefreshCw size={16} color="#F59E0B" />
              </Pressable>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Training Record Matrix OCR',
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
          style={[styles.tab, activeTab === 'new' && { backgroundColor: '#8B5CF6' }]}
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
          style={[styles.tab, activeTab === 'history' && { backgroundColor: '#8B5CF6' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('history');
          }}
        >
          <History size={18} color={activeTab === 'history' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#FFFFFF' : colors.textSecondary }]}>
            Matrix View
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
                  {formData.department === dept && <Check size={20} color="#8B5CF6" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showTrainingPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Training Record</Text>
              <Pressable onPress={() => setShowTrainingPicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {TRAINING_REQUIREMENTS.map((req) => {
                const isSelected = formData.selectedTrainings.some(t => t.requirementId === req.id);
                return (
                  <Pressable
                    key={req.id}
                    style={[styles.trainingOption, { borderColor: colors.border, opacity: isSelected ? 0.5 : 1 }]}
                    onPress={() => !isSelected && addTraining(req.id)}
                    disabled={isSelected}
                  >
                    <View style={styles.trainingOptionInfo}>
                      <Text style={[styles.trainingOptionName, { color: colors.text }]}>{req.name}</Text>
                      <Text style={[styles.trainingOptionMeta, { color: colors.textSecondary }]}>
                        {req.regulatoryRef} • {req.category} • {getFrequencyLabel(req.frequency)}
                      </Text>
                    </View>
                    {isSelected ? (
                      <CheckCircle2 size={20} color="#10B981" />
                    ) : (
                      <Plus size={20} color="#8B5CF6" />
                    )}
                  </Pressable>
                );
              })}
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
    gap: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  smallInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 80,
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
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    padding: 24,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderRadius: 12,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  trainingCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  trainingCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  trainingInfo: {
    flex: 1,
  },
  trainingName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  trainingMeta: {
    fontSize: 12,
  },
  trainingFields: {
    gap: 8,
  },
  signatureBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
  },
  signatureContent: {
    flex: 1,
  },
  signatureText: {
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
  searchFilterRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 4,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  recordCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  recordHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
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
  recordStats: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 12,
  },
  recordStat: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  recordStatText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  recordFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  recordDate: {
    fontSize: 12,
  },
  recordActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  actionButton: {
    padding: 4,
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
  trainingOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  trainingOptionInfo: {
    flex: 1,
  },
  trainingOptionName: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  trainingOptionMeta: {
    fontSize: 12,
  },
  bottomPadding: {
    height: 32,
  },
});
