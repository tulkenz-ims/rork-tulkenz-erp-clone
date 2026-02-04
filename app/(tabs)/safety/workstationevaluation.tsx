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
import { useWorkstationEvaluations } from '@/hooks/useErgonomics';
import {
  WorkstationEvaluation,
  WorkstationType,
  Priority,
  WORKSTATION_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/types/ergonomics';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Monitor,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  X,
} from 'lucide-react-native';

export default function WorkstationEvaluationScreen() {
  const { colors } = useTheme();
  const {
    evaluations,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useWorkstationEvaluations();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<WorkstationType | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<WorkstationEvaluation | null>(null);
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_department: '',
    location: '',
    workstation_type: 'office' as WorkstationType,
    evaluator_name: '',
    chair_height_adjustable: false,
    chair_backrest_adjustable: false,
    chair_armrests: false,
    desk_height_appropriate: false,
    monitor_at_eye_level: false,
    monitor_arm_length: false,
    keyboard_at_elbow_height: false,
    mouse_close_to_keyboard: false,
    lighting_adequate: false,
    glare_controlled: false,
    noise_level_db: '',
    temperature_f: '',
    overall_score: '',
    issues_identified: [] as string[],
    recommendations: [] as string[],
    equipment_needed: [] as string[],
    priority: 'medium' as Priority,
    notes: '',
  });
  const [newIssue, setNewIssue] = useState('');
  const [newRecommendation, setNewRecommendation] = useState('');
  

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      const matchesSearch =
        e.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.evaluation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || e.workstation_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [evaluations, searchQuery, typeFilter]);

  const stats = useMemo(() => ({
    total: evaluations.length,
    compliant: evaluations.filter(e => e.compliance_status === 'compliant').length,
    needsImprovement: evaluations.filter(e => e.compliance_status === 'needs_improvement').length,
    nonCompliant: evaluations.filter(e => e.compliance_status === 'non_compliant').length,
  }), [evaluations]);

  const resetForm = () => {
    setFormData({
      employee_name: '',
      employee_department: '',
      location: '',
      workstation_type: 'office',
      evaluator_name: '',
      chair_height_adjustable: false,
      chair_backrest_adjustable: false,
      chair_armrests: false,
      desk_height_appropriate: false,
      monitor_at_eye_level: false,
      monitor_arm_length: false,
      keyboard_at_elbow_height: false,
      mouse_close_to_keyboard: false,
      lighting_adequate: false,
      glare_controlled: false,
      noise_level_db: '',
      temperature_f: '',
      overall_score: '',
      issues_identified: [],
      recommendations: [],
      equipment_needed: [],
      priority: 'medium',
      notes: '',
    });
  };

  const calculateScore = () => {
    const checks = [
      formData.chair_height_adjustable,
      formData.chair_backrest_adjustable,
      formData.desk_height_appropriate,
      formData.monitor_at_eye_level,
      formData.monitor_arm_length,
      formData.keyboard_at_elbow_height,
      formData.mouse_close_to_keyboard,
      formData.lighting_adequate,
      formData.glare_controlled,
    ];
    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  };

  const getComplianceStatus = (score: number) => {
    if (score >= 80) return 'compliant';
    if (score >= 60) return 'needs_improvement';
    return 'non_compliant';
  };

  const handleSubmit = async () => {
    if (!formData.employee_name.trim() || !formData.location.trim() || !formData.evaluator_name.trim()) {
      Alert.alert('Error', 'Employee name, location, and evaluator name are required');
      return;
    }

    try {
      const score = formData.overall_score ? parseInt(formData.overall_score) : calculateScore();
      const complianceStatus = getComplianceStatus(score);

      const payload = {
        evaluation_number: generateNumber(),
        employee_id: null,
        employee_name: formData.employee_name,
        employee_department: formData.employee_department || null,
        facility_id: null,
        facility_name: null,
        location: formData.location,
        workstation_type: formData.workstation_type,
        evaluation_date: new Date().toISOString().split('T')[0],
        evaluator_id: null,
        evaluator_name: formData.evaluator_name,
        chair_assessment: {
          height_adjustable: formData.chair_height_adjustable,
          backrest_adjustable: formData.chair_backrest_adjustable,
          has_armrests: formData.chair_armrests,
        },
        desk_assessment: {
          height_appropriate: formData.desk_height_appropriate,
        },
        monitor_assessment: {
          at_eye_level: formData.monitor_at_eye_level,
          at_arm_length: formData.monitor_arm_length,
        },
        keyboard_mouse_assessment: {
          keyboard_at_elbow_height: formData.keyboard_at_elbow_height,
          mouse_close_to_keyboard: formData.mouse_close_to_keyboard,
        },
        lighting_assessment: {
          adequate: formData.lighting_adequate,
          glare_controlled: formData.glare_controlled,
        },
        noise_level_db: formData.noise_level_db ? parseFloat(formData.noise_level_db) : null,
        temperature_f: formData.temperature_f ? parseFloat(formData.temperature_f) : null,
        humidity_percent: null,
        ventilation_adequate: null,
        floor_condition: null,
        mat_required: null,
        anti_fatigue_mat_present: null,
        footrest_required: null,
        footrest_present: null,
        document_holder_required: null,
        document_holder_present: null,
        phone_headset_required: null,
        phone_headset_present: null,
        overall_score: score,
        compliance_status: complianceStatus,
        issues_identified: formData.issues_identified,
        recommendations: formData.recommendations,
        equipment_needed: formData.equipment_needed,
        estimated_cost: null,
        priority: formData.priority,
        action_items: [],
        follow_up_required: complianceStatus !== 'compliant',
        follow_up_date: null,
        status: 'completed' as const,
        employee_signature: null,
        employee_signed_date: null,
        supervisor_signature: null,
        supervisor_signed_date: null,
        attachments: [],
        photos: [],
        notes: formData.notes || null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Workstation evaluation created successfully');
    } catch (err) {
      console.error('Error creating evaluation:', err);
      Alert.alert('Error', 'Failed to create evaluation');
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return '#10B981';
      case 'needs_improvement': return '#F59E0B';
      case 'non_compliant': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getComplianceLabel = (status: string) => {
    switch (status) {
      case 'compliant': return 'Compliant';
      case 'needs_improvement': return 'Needs Improvement';
      case 'non_compliant': return 'Non-Compliant';
      default: return status;
    }
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
    addButton: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    employeeName: { fontSize: 16, fontWeight: '600' as const, color: colors.text, flex: 1 },
    evaluationNumber: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4, backgroundColor: colors.primary + '20' },
    typeText: { fontSize: 11, fontWeight: '600' as const, color: colors.primary },
    cardBody: { gap: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    scoreBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    scoreText: { fontSize: 11, fontWeight: '600' as const },
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
    typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    typeOptionSelected: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
    typeOptionText: { fontSize: 12, color: colors.textSecondary },
    typeOptionTextSelected: { color: colors.primary, fontWeight: '600' as const },
    checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkLabel: { fontSize: 14, color: colors.text, flex: 1 },
    prioritySelector: { flexDirection: 'row', gap: 8 },
    priorityOption: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    priorityOptionSelected: { borderWidth: 2 },
    priorityOptionText: { fontSize: 12, color: colors.textSecondary },
    addItemRow: { flexDirection: 'row', gap: 8 },
    addItemInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text },
    addItemButton: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
    addItemButtonText: { color: '#fff', fontWeight: '600' as const },
    itemList: { marginTop: 8, gap: 4 },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
    itemText: { flex: 1, fontSize: 14, color: colors.text },
    removeItemButton: { padding: 4 },
    submitButton: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16, marginBottom: 32 },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
    detailSection: { marginBottom: 20 },
    detailRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    detailLabel: { fontSize: 13, color: colors.textSecondary, width: 120 },
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
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.compliant}</Text>
          <Text style={styles.statLabel}>Compliant</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.needsImprovement}</Text>
          <Text style={styles.statLabel}>Needs Work</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.nonCompliant}</Text>
          <Text style={styles.statLabel}>Non-Comp.</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search evaluations..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
          <Filter size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {filteredEvaluations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Monitor size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Evaluations Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || typeFilter !== 'all' ? 'Try adjusting your search or filters' : 'Create your first workstation evaluation'}
            </Text>
          </View>
        ) : (
          filteredEvaluations.map(evaluation => (
            <TouchableOpacity
              key={evaluation.id}
              style={styles.card}
              onPress={() => { setSelectedEvaluation(evaluation); setShowDetailModal(true); }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.employeeName}>{evaluation.employee_name}</Text>
                  <Text style={styles.evaluationNumber}>{evaluation.evaluation_number}</Text>
                </View>
                <View style={styles.typeBadge}>
                  <Monitor size={12} color={colors.primary} />
                  <Text style={styles.typeText}>{WORKSTATION_TYPE_LABELS[evaluation.workstation_type]}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{evaluation.location}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{new Date(evaluation.evaluation_date).toLocaleDateString()}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={[styles.scoreBadge, { backgroundColor: getComplianceColor(evaluation.compliance_status) + '20' }]}>
                  {evaluation.compliance_status === 'compliant' ? (
                    <CheckCircle size={14} color={getComplianceColor(evaluation.compliance_status)} />
                  ) : (
                    <AlertTriangle size={14} color={getComplianceColor(evaluation.compliance_status)} />
                  )}
                  <Text style={[styles.scoreText, { color: getComplianceColor(evaluation.compliance_status) }]}>
                    {evaluation.overall_score}% - {getComplianceLabel(evaluation.compliance_status)}
                  </Text>
                </View>
                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View</Text>
                  <ChevronRight size={16} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowFormModal(true); }}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showFormModal} animationType="slide" transparent onRequestClose={() => setShowFormModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Workstation Evaluation</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Employee Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Employee Name *</Text>
                  <TextInput style={styles.textInput} value={formData.employee_name} onChangeText={(text) => setFormData(prev => ({ ...prev, employee_name: text }))} placeholder="Enter employee name" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Department</Text>
                  <TextInput style={styles.textInput} value={formData.employee_department} onChangeText={(text) => setFormData(prev => ({ ...prev, employee_department: text }))} placeholder="Department" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Location *</Text>
                  <TextInput style={styles.textInput} value={formData.location} onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))} placeholder="Building/Room/Area" placeholderTextColor={colors.textSecondary} />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Workstation Type</Text>
                <View style={styles.typeSelector}>
                  {(Object.keys(WORKSTATION_TYPE_LABELS) as WorkstationType[]).map(type => (
                    <TouchableOpacity key={type} style={[styles.typeOption, formData.workstation_type === type && styles.typeOptionSelected]} onPress={() => setFormData(prev => ({ ...prev, workstation_type: type }))}>
                      <Text style={[styles.typeOptionText, formData.workstation_type === type && styles.typeOptionTextSelected]}>{WORKSTATION_TYPE_LABELS[type]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Chair Assessment</Text>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, chair_height_adjustable: !prev.chair_height_adjustable }))}>
                  <View style={[styles.checkbox, formData.chair_height_adjustable && styles.checkboxChecked]}>
                    {formData.chair_height_adjustable && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>Chair height is adjustable</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, chair_backrest_adjustable: !prev.chair_backrest_adjustable }))}>
                  <View style={[styles.checkbox, formData.chair_backrest_adjustable && styles.checkboxChecked]}>
                    {formData.chair_backrest_adjustable && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>Backrest is adjustable</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, chair_armrests: !prev.chair_armrests }))}>
                  <View style={[styles.checkbox, formData.chair_armrests && styles.checkboxChecked]}>
                    {formData.chair_armrests && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>Has armrests</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Desk & Monitor</Text>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, desk_height_appropriate: !prev.desk_height_appropriate }))}>
                  <View style={[styles.checkbox, formData.desk_height_appropriate && styles.checkboxChecked]}>
                    {formData.desk_height_appropriate && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>Desk height is appropriate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, monitor_at_eye_level: !prev.monitor_at_eye_level }))}>
                  <View style={[styles.checkbox, formData.monitor_at_eye_level && styles.checkboxChecked]}>
                    {formData.monitor_at_eye_level && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>Monitor top at or below eye level</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, monitor_arm_length: !prev.monitor_arm_length }))}>
                  <View style={[styles.checkbox, formData.monitor_arm_length && styles.checkboxChecked]}>
                    {formData.monitor_arm_length && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>Monitor at arm length distance</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Keyboard & Mouse</Text>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, keyboard_at_elbow_height: !prev.keyboard_at_elbow_height }))}>
                  <View style={[styles.checkbox, formData.keyboard_at_elbow_height && styles.checkboxChecked]}>
                    {formData.keyboard_at_elbow_height && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>Keyboard at elbow height</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, mouse_close_to_keyboard: !prev.mouse_close_to_keyboard }))}>
                  <View style={[styles.checkbox, formData.mouse_close_to_keyboard && styles.checkboxChecked]}>
                    {formData.mouse_close_to_keyboard && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>Mouse close to keyboard</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Lighting</Text>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, lighting_adequate: !prev.lighting_adequate }))}>
                  <View style={[styles.checkbox, formData.lighting_adequate && styles.checkboxChecked]}>
                    {formData.lighting_adequate && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>Lighting is adequate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, glare_controlled: !prev.glare_controlled }))}>
                  <View style={[styles.checkbox, formData.glare_controlled && styles.checkboxChecked]}>
                    {formData.glare_controlled && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>Glare is controlled</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Issues Identified</Text>
                <View style={styles.addItemRow}>
                  <TextInput style={styles.addItemInput} value={newIssue} onChangeText={setNewIssue} placeholder="Add issue..." placeholderTextColor={colors.textSecondary} />
                  <TouchableOpacity style={styles.addItemButton} onPress={() => { if (newIssue.trim()) { setFormData(prev => ({ ...prev, issues_identified: [...prev.issues_identified, newIssue.trim()] })); setNewIssue(''); } }}>
                    <Text style={styles.addItemButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {formData.issues_identified.length > 0 && (
                  <View style={styles.itemList}>
                    {formData.issues_identified.map((issue, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemText}>• {issue}</Text>
                        <TouchableOpacity style={styles.removeItemButton} onPress={() => setFormData(prev => ({ ...prev, issues_identified: prev.issues_identified.filter((_, i) => i !== index) }))}>
                          <X size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
                <View style={styles.addItemRow}>
                  <TextInput style={styles.addItemInput} value={newRecommendation} onChangeText={setNewRecommendation} placeholder="Add recommendation..." placeholderTextColor={colors.textSecondary} />
                  <TouchableOpacity style={styles.addItemButton} onPress={() => { if (newRecommendation.trim()) { setFormData(prev => ({ ...prev, recommendations: [...prev.recommendations, newRecommendation.trim()] })); setNewRecommendation(''); } }}>
                    <Text style={styles.addItemButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {formData.recommendations.length > 0 && (
                  <View style={styles.itemList}>
                    {formData.recommendations.map((rec, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemText}>• {rec}</Text>
                        <TouchableOpacity style={styles.removeItemButton} onPress={() => setFormData(prev => ({ ...prev, recommendations: prev.recommendations.filter((_, i) => i !== index) }))}>
                          <X size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
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
                <Text style={styles.sectionTitle}>Evaluator</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Evaluator Name *</Text>
                  <TextInput style={styles.textInput} value={formData.evaluator_name} onChangeText={(text) => setFormData(prev => ({ ...prev, evaluator_name: text }))} placeholder="Enter evaluator name" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes</Text>
                  <TextInput style={[styles.textInput, styles.textArea]} value={formData.notes} onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))} placeholder="Additional notes..." placeholderTextColor={colors.textSecondary} multiline />
                </View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isCreating}>
                <Text style={styles.submitButtonText}>{isCreating ? 'Creating...' : 'Create Evaluation'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide" transparent onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Evaluation Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedEvaluation && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Employee Information</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Employee</Text><Text style={styles.detailValue}>{selectedEvaluation.employee_name}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Evaluation #</Text><Text style={styles.detailValue}>{selectedEvaluation.evaluation_number}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Location</Text><Text style={styles.detailValue}>{selectedEvaluation.location}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Type</Text><Text style={styles.detailValue}>{WORKSTATION_TYPE_LABELS[selectedEvaluation.workstation_type]}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{new Date(selectedEvaluation.evaluation_date).toLocaleDateString()}</Text></View>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Results</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Score</Text><Text style={styles.detailValue}>{selectedEvaluation.overall_score}%</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text><Text style={[styles.detailValue, { color: getComplianceColor(selectedEvaluation.compliance_status) }]}>{getComplianceLabel(selectedEvaluation.compliance_status)}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Priority</Text><Text style={[styles.detailValue, { color: PRIORITY_COLORS[selectedEvaluation.priority] }]}>{PRIORITY_LABELS[selectedEvaluation.priority]}</Text></View>
                  </View>
                  {selectedEvaluation.issues_identified.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Issues Identified</Text>
                      <View style={styles.detailList}>{selectedEvaluation.issues_identified.map((issue, index) => (<Text key={index} style={styles.detailListItem}>• {issue}</Text>))}</View>
                    </View>
                  )}
                  {selectedEvaluation.recommendations.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Recommendations</Text>
                      <View style={styles.detailList}>{selectedEvaluation.recommendations.map((rec, index) => (<Text key={index} style={styles.detailListItem}>• {rec}</Text>))}</View>
                    </View>
                  )}
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Evaluator</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Name</Text><Text style={styles.detailValue}>{selectedEvaluation.evaluator_name}</Text></View>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Type</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}><X size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.filterOption} onPress={() => { setTypeFilter('all'); setShowFilterModal(false); }}>
              <Text style={[styles.filterOptionText, typeFilter === 'all' && styles.filterOptionSelected]}>All Types</Text>
              {typeFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>
            {(Object.keys(WORKSTATION_TYPE_LABELS) as WorkstationType[]).map(type => (
              <TouchableOpacity key={type} style={styles.filterOption} onPress={() => { setTypeFilter(type); setShowFilterModal(false); }}>
                <Text style={[styles.filterOptionText, typeFilter === type && styles.filterOptionSelected]}>{WORKSTATION_TYPE_LABELS[type]}</Text>
                {typeFilter === type && <CheckCircle size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
