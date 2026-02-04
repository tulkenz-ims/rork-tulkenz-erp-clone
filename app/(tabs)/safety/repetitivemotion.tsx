import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRepetitiveMotionAssessments } from '@/hooks/useErgonomics';
import {
  RepetitiveMotionAssessment,
  AssessmentType,
  RiskLevel,
  AssessmentStatus,
  ForceLevel,
  RepetitionRate,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  BODY_PARTS,
  COMMON_SYMPTOMS,
  Priority,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/types/ergonomics';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  X,
  Activity,
  Repeat,
  Hand,
} from 'lucide-react-native';

const FORCE_LEVEL_LABELS: Record<ForceLevel, string> = {
  light: 'Light',
  moderate: 'Moderate',
  heavy: 'Heavy',
  very_heavy: 'Very Heavy',
};

const REPETITION_RATE_LABELS: Record<RepetitionRate, string> = {
  low: 'Low (<10/min)',
  moderate: 'Moderate (10-20/min)',
  high: 'High (20-30/min)',
  very_high: 'Very High (>30/min)',
};

export default function RepetitiveMotionScreen() {
  const { colors } = useTheme();
  const {
    assessments,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useRepetitiveMotionAssessments();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<RepetitiveMotionAssessment | null>(null);
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_department: '',
    employee_job_title: '',
    work_area: '',
    job_task: '',
    assessment_type: 'initial' as AssessmentType,
    task_duration_hours: '',
    cycle_time_seconds: '',
    cycles_per_shift: '',
    force_level: 'moderate' as ForceLevel,
    repetition_rate: 'moderate' as RepetitionRate,
    body_parts_affected: [] as string[],
    employee_symptoms: [] as string[],
    overall_risk_level: 'moderate' as RiskLevel,
    recommended_engineering_controls: [] as string[],
    recommended_administrative_controls: [] as string[],
    job_rotation_recommended: false,
    stretching_program: false,
    priority: 'medium' as Priority,
    assessor_name: '',
    notes: '',
  });
  const [newEngControl, setNewEngControl] = useState('');
  const [newAdminControl, setNewAdminControl] = useState('');

  const filteredAssessments = useMemo(() => {
    return assessments.filter(a => {
      const matchesSearch =
        a.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.assessment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.job_task.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [assessments, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: assessments.length,
    highRisk: assessments.filter(a => a.overall_risk_level === 'high' || a.overall_risk_level === 'very_high').length,
    actionRequired: assessments.filter(a => a.status === 'action_required').length,
    completed: assessments.filter(a => a.status === 'completed' || a.status === 'closed').length,
  }), [assessments]);

  const resetForm = () => {
    setFormData({
      employee_name: '',
      employee_department: '',
      employee_job_title: '',
      work_area: '',
      job_task: '',
      assessment_type: 'initial',
      task_duration_hours: '',
      cycle_time_seconds: '',
      cycles_per_shift: '',
      force_level: 'moderate',
      repetition_rate: 'moderate',
      body_parts_affected: [],
      employee_symptoms: [],
      overall_risk_level: 'moderate',
      recommended_engineering_controls: [],
      recommended_administrative_controls: [],
      job_rotation_recommended: false,
      stretching_program: false,
      priority: 'medium',
      assessor_name: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.employee_name.trim() || !formData.job_task.trim() || !formData.assessor_name.trim()) {
      Alert.alert('Error', 'Employee name, job task, and assessor name are required');
      return;
    }

    try {
      const payload = {
        assessment_number: generateNumber(),
        employee_id: null,
        employee_name: formData.employee_name,
        employee_department: formData.employee_department || null,
        employee_job_title: formData.employee_job_title || null,
        facility_id: null,
        facility_name: null,
        work_area: formData.work_area || 'Not specified',
        job_task: formData.job_task,
        assessment_date: new Date().toISOString().split('T')[0],
        assessment_type: formData.assessment_type,
        assessor_id: null,
        assessor_name: formData.assessor_name,
        task_duration_hours: formData.task_duration_hours ? parseFloat(formData.task_duration_hours) : null,
        cycle_time_seconds: formData.cycle_time_seconds ? parseInt(formData.cycle_time_seconds) : null,
        cycles_per_shift: formData.cycles_per_shift ? parseInt(formData.cycles_per_shift) : null,
        force_level: formData.force_level,
        force_description: null,
        repetition_rate: formData.repetition_rate,
        awkward_postures: {},
        contact_stress: {},
        vibration_exposure: {},
        static_postures: {},
        body_parts_affected: formData.body_parts_affected,
        strain_index_score: null,
        rula_score: null,
        reba_score: null,
        ocra_index: null,
        hal_tlv_score: null,
        overall_risk_level: formData.overall_risk_level,
        current_controls: [],
        recommended_engineering_controls: formData.recommended_engineering_controls,
        recommended_administrative_controls: formData.recommended_administrative_controls,
        recommended_ppe: [],
        tool_modifications: [],
        workstation_modifications: [],
        work_practice_changes: [],
        job_rotation_recommended: formData.job_rotation_recommended,
        rotation_schedule: null,
        rest_breaks_recommended: null,
        stretching_program: formData.stretching_program,
        employee_symptoms: formData.employee_symptoms,
        symptom_body_parts: formData.body_parts_affected,
        symptom_duration: null,
        symptom_frequency: null,
        previous_msd_history: null,
        medical_restrictions: null,
        priority: formData.priority,
        implementation_timeline: null,
        estimated_cost: null,
        follow_up_required: formData.overall_risk_level === 'high' || formData.overall_risk_level === 'very_high',
        follow_up_date: null,
        reviewed_by: null,
        reviewed_by_id: null,
        reviewed_date: null,
        status: 'completed' as AssessmentStatus,
        attachments: [],
        photos: [],
        videos: [],
        notes: formData.notes || null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Repetitive motion assessment created successfully');
    } catch (err) {
      console.error('Error creating assessment:', err);
      Alert.alert('Error', 'Failed to create assessment');
    }
  };

  const toggleBodyPart = (part: string) => {
    setFormData(prev => ({
      ...prev,
      body_parts_affected: prev.body_parts_affected.includes(part)
        ? prev.body_parts_affected.filter(p => p !== part)
        : [...prev.body_parts_affected, part],
    }));
  };

  const toggleSymptom = (symptom: string) => {
    setFormData(prev => ({
      ...prev,
      employee_symptoms: prev.employee_symptoms.includes(symptom)
        ? prev.employee_symptoms.filter(s => s !== symptom)
        : [...prev.employee_symptoms, symptom],
    }));
  };

  const getRiskIcon = (level: RiskLevel) => {
    if (level === 'high' || level === 'very_high') {
      return <AlertTriangle size={14} color={RISK_LEVEL_COLORS[level]} />;
    }
    return <Activity size={14} color={RISK_LEVEL_COLORS[level]} />;
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    statsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
    statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    searchContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
    searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, height: 44 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: colors.text },
    filterButton: { width: 44, height: 44, backgroundColor: colors.surface, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    addButton: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    employeeName: { fontSize: 16, fontWeight: '600' as const, color: colors.text, flex: 1 },
    assessmentNumber: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    statusText: { fontSize: 11, fontWeight: '600' as const },
    cardBody: { gap: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    riskBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    riskText: { fontSize: 11, fontWeight: '600' as const },
    viewButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    viewButtonText: { fontSize: 13, color: colors.primary, fontWeight: '500' as const },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '600' as const, color: colors.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
    modalBody: { padding: 16 },
    formSection: { marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: '600' as const, color: colors.text, marginBottom: 12 },
    inputGroup: { marginBottom: 12 },
    inputLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
    textInput: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    row: { flexDirection: 'row', gap: 12 },
    halfWidth: { flex: 1 },
    thirdWidth: { flex: 1 },
    typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    typeOptionSelected: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
    typeOptionText: { fontSize: 12, color: colors.textSecondary },
    typeOptionTextSelected: { color: colors.primary, fontWeight: '600' as const },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    chipSelected: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
    chipText: { fontSize: 12, color: colors.textSecondary },
    chipTextSelected: { color: colors.primary, fontWeight: '500' as const },
    riskSelector: { flexDirection: 'row', gap: 8 },
    riskOption: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    riskOptionSelected: { borderWidth: 2 },
    riskOptionText: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
    checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkLabel: { fontSize: 14, color: colors.text, flex: 1 },
    addItemRow: { flexDirection: 'row', gap: 8 },
    addItemInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text },
    addItemButton: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
    addItemButtonText: { color: '#fff', fontWeight: '600' as const },
    itemList: { marginTop: 8, gap: 4 },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
    itemText: { flex: 1, fontSize: 14, color: colors.text },
    removeItemButton: { padding: 4 },
    prioritySelector: { flexDirection: 'row', gap: 8 },
    priorityOption: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    priorityOptionSelected: { borderWidth: 2 },
    priorityOptionText: { fontSize: 12, color: colors.textSecondary },
    submitButton: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16, marginBottom: 32 },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
    detailSection: { marginBottom: 20 },
    detailRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    detailLabel: { fontSize: 13, color: colors.textSecondary, width: 130 },
    detailValue: { fontSize: 14, color: colors.text, flex: 1 },
    detailList: { marginTop: 8, gap: 4 },
    detailListItem: { fontSize: 14, color: colors.text, paddingLeft: 12 },
    filterModalContent: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
    filterOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    filterOptionText: { fontSize: 15, color: colors.text, flex: 1 },
    filterOptionSelected: { color: colors.primary, fontWeight: '600' as const },
  });

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}><Text style={styles.statValue}>{stats.total}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}><Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.highRisk}</Text><Text style={styles.statLabel}>High Risk</Text></View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}><Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.actionRequired}</Text><Text style={styles.statLabel}>Action Req.</Text></View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}><Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completed}</Text><Text style={styles.statLabel}>Completed</Text></View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}><Search size={20} color={colors.textSecondary} /><TextInput style={styles.searchInput} placeholder="Search assessments..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} /></View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}><Filter size={20} color={colors.text} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        {filteredAssessments.length === 0 ? (
          <View style={styles.emptyState}><View style={styles.emptyIcon}><Repeat size={40} color={colors.textSecondary} /></View><Text style={styles.emptyTitle}>No Assessments Found</Text><Text style={styles.emptyText}>{searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Create your first repetitive motion assessment'}</Text></View>
        ) : (
          filteredAssessments.map(assessment => (
            <TouchableOpacity key={assessment.id} style={styles.card} onPress={() => { setSelectedAssessment(assessment); setShowDetailModal(true); }}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}><Text style={styles.employeeName}>{assessment.employee_name}</Text><Text style={styles.assessmentNumber}>{assessment.assessment_number}</Text></View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[assessment.status] + '20' }]}><Text style={[styles.statusText, { color: STATUS_COLORS[assessment.status] }]}>{STATUS_LABELS[assessment.status]}</Text></View>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.infoRow}><Repeat size={14} color={colors.textSecondary} /><Text style={styles.infoText}>{assessment.job_task}</Text></View>
                <View style={styles.infoRow}><Calendar size={14} color={colors.textSecondary} /><Text style={styles.infoText}>{new Date(assessment.assessment_date).toLocaleDateString()}</Text></View>
                {assessment.body_parts_affected.length > 0 && (<View style={styles.infoRow}><Hand size={14} color={colors.textSecondary} /><Text style={styles.infoText}>{assessment.body_parts_affected.slice(0, 3).join(', ')}{assessment.body_parts_affected.length > 3 ? ` +${assessment.body_parts_affected.length - 3}` : ''}</Text></View>)}
              </View>
              <View style={styles.cardFooter}>
                <View style={[styles.riskBadge, { backgroundColor: RISK_LEVEL_COLORS[assessment.overall_risk_level] + '20' }]}>{getRiskIcon(assessment.overall_risk_level)}<Text style={[styles.riskText, { color: RISK_LEVEL_COLORS[assessment.overall_risk_level] }]}>{RISK_LEVEL_LABELS[assessment.overall_risk_level]}</Text></View>
                <View style={styles.viewButton}><Text style={styles.viewButtonText}>View Details</Text><ChevronRight size={16} color={colors.primary} /></View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowFormModal(true); }}><Plus size={24} color="#fff" /></TouchableOpacity>

      <Modal visible={showFormModal} animationType="slide" transparent onRequestClose={() => setShowFormModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>New Repetitive Motion Assessment</Text><TouchableOpacity onPress={() => setShowFormModal(false)}><X size={24} color={colors.text} /></TouchableOpacity></View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Employee Information</Text>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Employee Name *</Text><TextInput style={styles.textInput} value={formData.employee_name} onChangeText={(text) => setFormData(prev => ({ ...prev, employee_name: text }))} placeholder="Enter employee name" placeholderTextColor={colors.textSecondary} /></View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}><Text style={styles.inputLabel}>Department</Text><TextInput style={styles.textInput} value={formData.employee_department} onChangeText={(text) => setFormData(prev => ({ ...prev, employee_department: text }))} placeholder="Department" placeholderTextColor={colors.textSecondary} /></View>
                  <View style={styles.halfWidth}><Text style={styles.inputLabel}>Job Title</Text><TextInput style={styles.textInput} value={formData.employee_job_title} onChangeText={(text) => setFormData(prev => ({ ...prev, employee_job_title: text }))} placeholder="Job title" placeholderTextColor={colors.textSecondary} /></View>
                </View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Work Area</Text><TextInput style={styles.textInput} value={formData.work_area} onChangeText={(text) => setFormData(prev => ({ ...prev, work_area: text }))} placeholder="Work area/location" placeholderTextColor={colors.textSecondary} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Job Task *</Text><TextInput style={styles.textInput} value={formData.job_task} onChangeText={(text) => setFormData(prev => ({ ...prev, job_task: text }))} placeholder="Describe the repetitive task" placeholderTextColor={colors.textSecondary} /></View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Task Details</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.thirdWidth}><Text style={styles.inputLabel}>Duration (hrs)</Text><TextInput style={styles.textInput} value={formData.task_duration_hours} onChangeText={(text) => setFormData(prev => ({ ...prev, task_duration_hours: text }))} placeholder="4" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" /></View>
                  <View style={styles.thirdWidth}><Text style={styles.inputLabel}>Cycle Time (sec)</Text><TextInput style={styles.textInput} value={formData.cycle_time_seconds} onChangeText={(text) => setFormData(prev => ({ ...prev, cycle_time_seconds: text }))} placeholder="30" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" /></View>
                  <View style={styles.thirdWidth}><Text style={styles.inputLabel}>Cycles/Shift</Text><TextInput style={styles.textInput} value={formData.cycles_per_shift} onChangeText={(text) => setFormData(prev => ({ ...prev, cycles_per_shift: text }))} placeholder="500" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" /></View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Force Level</Text>
                <View style={styles.typeSelector}>
                  {(Object.keys(FORCE_LEVEL_LABELS) as ForceLevel[]).map(level => (
                    <TouchableOpacity key={level} style={[styles.typeOption, formData.force_level === level && styles.typeOptionSelected]} onPress={() => setFormData(prev => ({ ...prev, force_level: level }))}>
                      <Text style={[styles.typeOptionText, formData.force_level === level && styles.typeOptionTextSelected]}>{FORCE_LEVEL_LABELS[level]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Repetition Rate</Text>
                <View style={styles.typeSelector}>
                  {(Object.keys(REPETITION_RATE_LABELS) as RepetitionRate[]).map(rate => (
                    <TouchableOpacity key={rate} style={[styles.typeOption, formData.repetition_rate === rate && styles.typeOptionSelected]} onPress={() => setFormData(prev => ({ ...prev, repetition_rate: rate }))}>
                      <Text style={[styles.typeOptionText, formData.repetition_rate === rate && styles.typeOptionTextSelected]}>{REPETITION_RATE_LABELS[rate]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Body Parts Affected</Text>
                <View style={styles.chipContainer}>
                  {BODY_PARTS.map(part => (
                    <TouchableOpacity key={part} style={[styles.chip, formData.body_parts_affected.includes(part) && styles.chipSelected]} onPress={() => toggleBodyPart(part)}>
                      <Text style={[styles.chipText, formData.body_parts_affected.includes(part) && styles.chipTextSelected]}>{part}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Employee Symptoms</Text>
                <View style={styles.chipContainer}>
                  {COMMON_SYMPTOMS.map(symptom => (
                    <TouchableOpacity key={symptom} style={[styles.chip, formData.employee_symptoms.includes(symptom) && styles.chipSelected]} onPress={() => toggleSymptom(symptom)}>
                      <Text style={[styles.chipText, formData.employee_symptoms.includes(symptom) && styles.chipTextSelected]}>{symptom}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Overall Risk Level *</Text>
                <View style={styles.riskSelector}>
                  {(['low', 'moderate', 'high', 'very_high'] as RiskLevel[]).map(level => (
                    <TouchableOpacity key={level} style={[styles.riskOption, formData.overall_risk_level === level && [styles.riskOptionSelected, { borderColor: RISK_LEVEL_COLORS[level] }]]} onPress={() => setFormData(prev => ({ ...prev, overall_risk_level: level }))}>
                      {getRiskIcon(level)}
                      <Text style={[styles.riskOptionText, formData.overall_risk_level === level && { color: RISK_LEVEL_COLORS[level], fontWeight: '600' as const }]}>{RISK_LEVEL_LABELS[level].replace(' Risk', '')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Engineering Controls</Text>
                <View style={styles.addItemRow}>
                  <TextInput style={styles.addItemInput} value={newEngControl} onChangeText={setNewEngControl} placeholder="Add engineering control..." placeholderTextColor={colors.textSecondary} />
                  <TouchableOpacity style={styles.addItemButton} onPress={() => { if (newEngControl.trim()) { setFormData(prev => ({ ...prev, recommended_engineering_controls: [...prev.recommended_engineering_controls, newEngControl.trim()] })); setNewEngControl(''); } }}><Text style={styles.addItemButtonText}>Add</Text></TouchableOpacity>
                </View>
                {formData.recommended_engineering_controls.length > 0 && (<View style={styles.itemList}>{formData.recommended_engineering_controls.map((control, index) => (<View key={index} style={styles.itemRow}><Text style={styles.itemText}>• {control}</Text><TouchableOpacity style={styles.removeItemButton} onPress={() => setFormData(prev => ({ ...prev, recommended_engineering_controls: prev.recommended_engineering_controls.filter((_, i) => i !== index) }))}><X size={16} color={colors.textSecondary} /></TouchableOpacity></View>))}</View>)}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Administrative Controls</Text>
                <View style={styles.addItemRow}>
                  <TextInput style={styles.addItemInput} value={newAdminControl} onChangeText={setNewAdminControl} placeholder="Add administrative control..." placeholderTextColor={colors.textSecondary} />
                  <TouchableOpacity style={styles.addItemButton} onPress={() => { if (newAdminControl.trim()) { setFormData(prev => ({ ...prev, recommended_administrative_controls: [...prev.recommended_administrative_controls, newAdminControl.trim()] })); setNewAdminControl(''); } }}><Text style={styles.addItemButtonText}>Add</Text></TouchableOpacity>
                </View>
                {formData.recommended_administrative_controls.length > 0 && (<View style={styles.itemList}>{formData.recommended_administrative_controls.map((control, index) => (<View key={index} style={styles.itemRow}><Text style={styles.itemText}>• {control}</Text><TouchableOpacity style={styles.removeItemButton} onPress={() => setFormData(prev => ({ ...prev, recommended_administrative_controls: prev.recommended_administrative_controls.filter((_, i) => i !== index) }))}><X size={16} color={colors.textSecondary} /></TouchableOpacity></View>))}</View>)}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Additional Recommendations</Text>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, job_rotation_recommended: !prev.job_rotation_recommended }))}><View style={[styles.checkbox, formData.job_rotation_recommended && styles.checkboxChecked]}>{formData.job_rotation_recommended && <CheckCircle size={16} color="#fff" />}</View><Text style={styles.checkLabel}>Job rotation recommended</Text></TouchableOpacity>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, stretching_program: !prev.stretching_program }))}><View style={[styles.checkbox, formData.stretching_program && styles.checkboxChecked]}>{formData.stretching_program && <CheckCircle size={16} color="#fff" />}</View><Text style={styles.checkLabel}>Stretching program recommended</Text></TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Priority</Text>
                <View style={styles.prioritySelector}>
                  {(['low', 'medium', 'high', 'critical'] as Priority[]).map(priority => (
                    <TouchableOpacity key={priority} style={[styles.priorityOption, formData.priority === priority && [styles.priorityOptionSelected, { borderColor: PRIORITY_COLORS[priority] }]]} onPress={() => setFormData(prev => ({ ...prev, priority }))}>
                      <Text style={[styles.priorityOptionText, formData.priority === priority && { color: PRIORITY_COLORS[priority], fontWeight: '600' as const }]}>{PRIORITY_LABELS[priority]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Assessor Information</Text>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Assessor Name *</Text><TextInput style={styles.textInput} value={formData.assessor_name} onChangeText={(text) => setFormData(prev => ({ ...prev, assessor_name: text }))} placeholder="Enter assessor name" placeholderTextColor={colors.textSecondary} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Notes</Text><TextInput style={[styles.textInput, styles.textArea]} value={formData.notes} onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))} placeholder="Additional notes..." placeholderTextColor={colors.textSecondary} multiline /></View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isCreating}><Text style={styles.submitButtonText}>{isCreating ? 'Creating...' : 'Create Assessment'}</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide" transparent onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Assessment Details</Text><TouchableOpacity onPress={() => setShowDetailModal(false)}><X size={24} color={colors.text} /></TouchableOpacity></View>
            <ScrollView style={styles.modalBody}>
              {selectedAssessment && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Employee Information</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Employee</Text><Text style={styles.detailValue}>{selectedAssessment.employee_name}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Assessment #</Text><Text style={styles.detailValue}>{selectedAssessment.assessment_number}</Text></View>
                    {selectedAssessment.employee_department && <View style={styles.detailRow}><Text style={styles.detailLabel}>Department</Text><Text style={styles.detailValue}>{selectedAssessment.employee_department}</Text></View>}
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Job Task</Text><Text style={styles.detailValue}>{selectedAssessment.job_task}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{new Date(selectedAssessment.assessment_date).toLocaleDateString()}</Text></View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Risk Assessment</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Risk Level</Text><Text style={[styles.detailValue, { color: RISK_LEVEL_COLORS[selectedAssessment.overall_risk_level] }]}>{RISK_LEVEL_LABELS[selectedAssessment.overall_risk_level]}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text><Text style={[styles.detailValue, { color: STATUS_COLORS[selectedAssessment.status] }]}>{STATUS_LABELS[selectedAssessment.status]}</Text></View>
                    {selectedAssessment.force_level && <View style={styles.detailRow}><Text style={styles.detailLabel}>Force Level</Text><Text style={styles.detailValue}>{FORCE_LEVEL_LABELS[selectedAssessment.force_level]}</Text></View>}
                    {selectedAssessment.repetition_rate && <View style={styles.detailRow}><Text style={styles.detailLabel}>Repetition Rate</Text><Text style={styles.detailValue}>{REPETITION_RATE_LABELS[selectedAssessment.repetition_rate]}</Text></View>}
                  </View>

                  {selectedAssessment.body_parts_affected.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Body Parts Affected</Text>
                      <View style={styles.detailList}>{selectedAssessment.body_parts_affected.map((part, index) => (<Text key={index} style={styles.detailListItem}>• {part}</Text>))}</View>
                    </View>
                  )}

                  {selectedAssessment.employee_symptoms.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Symptoms</Text>
                      <View style={styles.detailList}>{selectedAssessment.employee_symptoms.map((symptom, index) => (<Text key={index} style={styles.detailListItem}>• {symptom}</Text>))}</View>
                    </View>
                  )}

                  {selectedAssessment.recommended_engineering_controls.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Engineering Controls</Text>
                      <View style={styles.detailList}>{selectedAssessment.recommended_engineering_controls.map((control, index) => (<Text key={index} style={styles.detailListItem}>• {control}</Text>))}</View>
                    </View>
                  )}

                  {selectedAssessment.recommended_administrative_controls.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Administrative Controls</Text>
                      <View style={styles.detailList}>{selectedAssessment.recommended_administrative_controls.map((control, index) => (<Text key={index} style={styles.detailListItem}>• {control}</Text>))}</View>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Additional Recommendations</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Job Rotation</Text><Text style={styles.detailValue}>{selectedAssessment.job_rotation_recommended ? 'Recommended' : 'Not Required'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Stretching</Text><Text style={styles.detailValue}>{selectedAssessment.stretching_program ? 'Recommended' : 'Not Required'}</Text></View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Assessor</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Name</Text><Text style={styles.detailValue}>{selectedAssessment.assessor_name}</Text></View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Filter by Status</Text><TouchableOpacity onPress={() => setShowFilterModal(false)}><X size={24} color={colors.text} /></TouchableOpacity></View>
            <TouchableOpacity style={styles.filterOption} onPress={() => { setStatusFilter('all'); setShowFilterModal(false); }}><Text style={[styles.filterOptionText, statusFilter === 'all' && styles.filterOptionSelected]}>All Assessments</Text>{statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}</TouchableOpacity>
            {(Object.keys(STATUS_LABELS) as AssessmentStatus[]).map(status => (
              <TouchableOpacity key={status} style={styles.filterOption} onPress={() => { setStatusFilter(status); setShowFilterModal(false); }}><Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>{STATUS_LABELS[status]}</Text>{statusFilter === status && <CheckCircle size={20} color={colors.primary} />}</TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
