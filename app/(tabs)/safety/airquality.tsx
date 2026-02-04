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
import { useAirQualityMonitoring } from '@/hooks/useErgonomics';
import {
  AirQualityMonitoring,
  AirMonitoringType,
  SampleType,
  ContaminantType,
  CONTAMINANT_TYPE_LABELS,
} from '@/types/ergonomics';
import {
  Plus,
  Search,
  Calendar,
  Wind,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  X,
  Beaker,
} from 'lucide-react-native';

const AIR_MONITORING_TYPE_LABELS: Record<AirMonitoringType, string> = {
  routine: 'Routine',
  complaint: 'Complaint',
  incident: 'Incident',
  baseline: 'Baseline',
  follow_up: 'Follow-Up',
  exposure_assessment: 'Exposure Assessment',
};

const SAMPLE_TYPE_LABELS: Record<SampleType, string> = {
  area: 'Area',
  personal: 'Personal',
  grab: 'Grab',
  continuous: 'Continuous',
};

export default function AirQualityScreen() {
  const { colors } = useTheme();
  const { records, isRefetching, create, isCreating, generateNumber, refetch } = useAirQualityMonitoring();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AirQualityMonitoring | null>(null);
  const [formData, setFormData] = useState({
    location: '',
    area_description: '',
    monitoring_type: 'routine' as AirMonitoringType,
    sample_type: 'area' as SampleType,
    start_time: '',
    end_time: '',
    employee_name: '',
    job_task: '',
    contaminant_type: 'particulate' as ContaminantType,
    contaminant_name: '',
    sampling_method: '',
    equipment_used: '',
    result_value: '',
    result_unit: 'mg/m³',
    osha_pel: '',
    percent_of_pel: '',
    respiratory_protection_required: false,
    recommended_respirator: '',
    corrective_actions: [] as string[],
    sampled_by: '',
    notes: '',
  });
  const [newAction, setNewAction] = useState('');

  const filteredRecords = useMemo(() => {
    return records.filter(r =>
      r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.monitoring_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contaminant_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [records, searchQuery]);

  const stats = useMemo(() => ({
    total: records.length,
    exceedsPEL: records.filter(r => r.exceeds_pel).length,
    exceedsAction: records.filter(r => r.exceeds_action_level && !r.exceeds_pel).length,
    compliant: records.filter(r => !r.exceeds_action_level).length,
  }), [records]);

  const resetForm = () => {
    setFormData({
      location: '',
      area_description: '',
      monitoring_type: 'routine',
      sample_type: 'area',
      start_time: '',
      end_time: '',
      employee_name: '',
      job_task: '',
      contaminant_type: 'particulate',
      contaminant_name: '',
      sampling_method: '',
      equipment_used: '',
      result_value: '',
      result_unit: 'mg/m³',
      osha_pel: '',
      percent_of_pel: '',
      respiratory_protection_required: false,
      recommended_respirator: '',
      corrective_actions: [],
      sampled_by: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.location.trim() || !formData.contaminant_name.trim() || !formData.sampled_by.trim()) {
      Alert.alert('Error', 'Location, contaminant name, and sampled by are required');
      return;
    }

    try {
      const resultValue = formData.result_value ? parseFloat(formData.result_value) : null;
      const pel = formData.osha_pel ? parseFloat(formData.osha_pel) : null;
      let percentOfPel: number | null = null;
      let exceedsAction = false;
      let exceedsPel = false;

      if (resultValue && pel) {
        percentOfPel = (resultValue / pel) * 100;
        exceedsAction = percentOfPel >= 50;
        exceedsPel = percentOfPel >= 100;
      }

      const payload = {
        monitoring_number: generateNumber(),
        facility_id: null,
        facility_name: null,
        location: formData.location,
        area_description: formData.area_description || null,
        monitoring_date: new Date().toISOString().split('T')[0],
        monitoring_type: formData.monitoring_type,
        sample_type: formData.sample_type,
        start_time: formData.start_time || '08:00',
        end_time: formData.end_time || '16:00',
        duration_minutes: null,
        employee_id: null,
        employee_name: formData.employee_name || null,
        job_task: formData.job_task || null,
        contaminant_type: formData.contaminant_type,
        contaminant_name: formData.contaminant_name,
        cas_number: null,
        sampling_method: formData.sampling_method || 'Direct Reading',
        equipment_used: formData.equipment_used || 'Air Sampling Pump',
        equipment_serial: null,
        calibration_date: null,
        flow_rate_lpm: null,
        sample_volume_liters: null,
        lab_sample_id: null,
        lab_name: null,
        analysis_method: null,
        result_value: resultValue,
        result_unit: formData.result_unit,
        detection_limit: null,
        osha_pel: pel,
        osha_pel_unit: formData.result_unit,
        acgih_tlv: null,
        acgih_tlv_unit: null,
        niosh_rel: null,
        niosh_rel_unit: null,
        stel_value: null,
        ceiling_value: null,
        percent_of_pel: percentOfPel,
        exceeds_action_level: exceedsAction,
        exceeds_pel: exceedsPel,
        exceeds_stel: false,
        respiratory_protection_required: formData.respiratory_protection_required || exceedsAction,
        current_respirator: null,
        recommended_respirator: formData.recommended_respirator || null,
        ventilation_type: null,
        ventilation_adequate: null,
        engineering_controls: [],
        administrative_controls: [],
        recommended_controls: [],
        weather_conditions: null,
        temperature_f: null,
        humidity_percent: null,
        barometric_pressure: null,
        sampled_by: formData.sampled_by,
        sampled_by_id: null,
        reviewed_by: null,
        reviewed_by_id: null,
        reviewed_date: null,
        status: 'completed' as const,
        compliance_status: exceedsPel ? 'non_compliant' : exceedsAction ? 'action_required' : 'compliant',
        corrective_actions: formData.corrective_actions,
        follow_up_required: exceedsAction,
        follow_up_date: null,
        attachments: [],
        notes: formData.notes || null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Air quality monitoring record created successfully');
    } catch (err) {
      console.error('Error creating record:', err);
      Alert.alert('Error', 'Failed to create record');
    }
  };

  const getComplianceColor = (record: AirQualityMonitoring) => {
    if (record.exceeds_pel) return '#EF4444';
    if (record.exceeds_action_level) return '#F59E0B';
    return '#10B981';
  };

  const getComplianceLabel = (record: AirQualityMonitoring) => {
    if (record.exceeds_pel) return 'Exceeds PEL';
    if (record.exceeds_action_level) return 'Exceeds Action Level';
    return 'Compliant';
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    statsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
    statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
    searchContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
    searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, height: 44 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: colors.text },
    addButton: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    locationName: { fontSize: 16, fontWeight: '600' as const, color: colors.text, flex: 1 },
    monitoringNumber: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    contaminantBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4, backgroundColor: colors.primary + '20' },
    contaminantText: { fontSize: 11, fontWeight: '600' as const, color: colors.primary },
    cardBody: { gap: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    statusText: { fontSize: 11, fontWeight: '600' as const },
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
    submitButton: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16, marginBottom: 32 },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
    detailSection: { marginBottom: 20 },
    detailRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    detailLabel: { fontSize: 13, color: colors.textSecondary, width: 130 },
    detailValue: { fontSize: 14, color: colors.text, flex: 1 },
    detailList: { marginTop: 8, gap: 4 },
    detailListItem: { fontSize: 14, color: colors.text, paddingLeft: 12 },
    resultCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginTop: 8, alignItems: 'center' },
    resultValue: { fontSize: 32, fontWeight: '700' as const },
    resultUnit: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    resultPercent: { fontSize: 16, fontWeight: '600' as const, marginTop: 8 },
  });

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}><Text style={styles.statValue}>{stats.total}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}><Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.exceedsPEL}</Text><Text style={styles.statLabel}>Exceeds PEL</Text></View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}><Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.exceedsAction}</Text><Text style={styles.statLabel}>Action Level</Text></View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}><Text style={[styles.statValue, { color: '#10B981' }]}>{stats.compliant}</Text><Text style={styles.statLabel}>Compliant</Text></View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}><Search size={20} color={colors.textSecondary} /><TextInput style={styles.searchInput} placeholder="Search records..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} /></View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyState}><View style={styles.emptyIcon}><Wind size={40} color={colors.textSecondary} /></View><Text style={styles.emptyTitle}>No Records Found</Text><Text style={styles.emptyText}>Create your first air quality monitoring record</Text></View>
        ) : (
          filteredRecords.map(record => (
            <TouchableOpacity key={record.id} style={styles.card} onPress={() => { setSelectedRecord(record); setShowDetailModal(true); }}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>{record.location}</Text>
                  <Text style={styles.monitoringNumber}>{record.monitoring_number}</Text>
                </View>
                <View style={styles.contaminantBadge}><Beaker size={12} color={colors.primary} /><Text style={styles.contaminantText}>{CONTAMINANT_TYPE_LABELS[record.contaminant_type]}</Text></View>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.infoRow}><Wind size={14} color={colors.textSecondary} /><Text style={styles.infoText}>{record.contaminant_name}</Text></View>
                <View style={styles.infoRow}><Calendar size={14} color={colors.textSecondary} /><Text style={styles.infoText}>{new Date(record.monitoring_date).toLocaleDateString()}</Text></View>
                {record.result_value && (<View style={styles.infoRow}><Beaker size={14} color={colors.textSecondary} /><Text style={styles.infoText}>Result: {record.result_value} {record.result_unit}</Text></View>)}
              </View>
              <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, { backgroundColor: getComplianceColor(record) + '20' }]}>
                  {record.exceeds_pel || record.exceeds_action_level ? <AlertTriangle size={14} color={getComplianceColor(record)} /> : <CheckCircle size={14} color={getComplianceColor(record)} />}
                  <Text style={[styles.statusText, { color: getComplianceColor(record) }]}>{getComplianceLabel(record)}</Text>
                </View>
                <View style={styles.viewButton}><Text style={styles.viewButtonText}>View</Text><ChevronRight size={16} color={colors.primary} /></View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowFormModal(true); }}><Plus size={24} color="#fff" /></TouchableOpacity>

      <Modal visible={showFormModal} animationType="slide" transparent onRequestClose={() => setShowFormModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>New Air Quality Monitoring</Text><TouchableOpacity onPress={() => setShowFormModal(false)}><X size={24} color={colors.text} /></TouchableOpacity></View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Location *</Text><TextInput style={styles.textInput} value={formData.location} onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))} placeholder="Building/Area" placeholderTextColor={colors.textSecondary} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Area Description</Text><TextInput style={styles.textInput} value={formData.area_description} onChangeText={(text) => setFormData(prev => ({ ...prev, area_description: text }))} placeholder="Describe the area" placeholderTextColor={colors.textSecondary} /></View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Monitoring Type</Text>
                <View style={styles.typeSelector}>
                  {(Object.keys(AIR_MONITORING_TYPE_LABELS) as AirMonitoringType[]).map(type => (
                    <TouchableOpacity key={type} style={[styles.typeOption, formData.monitoring_type === type && styles.typeOptionSelected]} onPress={() => setFormData(prev => ({ ...prev, monitoring_type: type }))}>
                      <Text style={[styles.typeOptionText, formData.monitoring_type === type && styles.typeOptionTextSelected]}>{AIR_MONITORING_TYPE_LABELS[type]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Sample Type</Text>
                <View style={styles.typeSelector}>
                  {(Object.keys(SAMPLE_TYPE_LABELS) as SampleType[]).map(type => (
                    <TouchableOpacity key={type} style={[styles.typeOption, formData.sample_type === type && styles.typeOptionSelected]} onPress={() => setFormData(prev => ({ ...prev, sample_type: type }))}>
                      <Text style={[styles.typeOptionText, formData.sample_type === type && styles.typeOptionTextSelected]}>{SAMPLE_TYPE_LABELS[type]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Contaminant</Text>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Contaminant Type</Text>
                  <View style={styles.typeSelector}>
                    {(Object.keys(CONTAMINANT_TYPE_LABELS) as ContaminantType[]).map(type => (
                      <TouchableOpacity key={type} style={[styles.typeOption, formData.contaminant_type === type && styles.typeOptionSelected]} onPress={() => setFormData(prev => ({ ...prev, contaminant_type: type }))}>
                        <Text style={[styles.typeOptionText, formData.contaminant_type === type && styles.typeOptionTextSelected]}>{CONTAMINANT_TYPE_LABELS[type]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Contaminant Name *</Text><TextInput style={styles.textInput} value={formData.contaminant_name} onChangeText={(text) => setFormData(prev => ({ ...prev, contaminant_name: text }))} placeholder="e.g., Total Dust, Silica" placeholderTextColor={colors.textSecondary} /></View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Results</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}><Text style={styles.inputLabel}>Result Value</Text><TextInput style={styles.textInput} value={formData.result_value} onChangeText={(text) => setFormData(prev => ({ ...prev, result_value: text }))} placeholder="0.5" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" /></View>
                  <View style={styles.halfWidth}><Text style={styles.inputLabel}>Unit</Text><TextInput style={styles.textInput} value={formData.result_unit} onChangeText={(text) => setFormData(prev => ({ ...prev, result_unit: text }))} placeholder="mg/m³" placeholderTextColor={colors.textSecondary} /></View>
                </View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>OSHA PEL</Text><TextInput style={styles.textInput} value={formData.osha_pel} onChangeText={(text) => setFormData(prev => ({ ...prev, osha_pel: text }))} placeholder="Enter PEL value" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" /></View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Sampling</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}><Text style={styles.inputLabel}>Start Time</Text><TextInput style={styles.textInput} value={formData.start_time} onChangeText={(text) => setFormData(prev => ({ ...prev, start_time: text }))} placeholder="08:00" placeholderTextColor={colors.textSecondary} /></View>
                  <View style={styles.halfWidth}><Text style={styles.inputLabel}>End Time</Text><TextInput style={styles.textInput} value={formData.end_time} onChangeText={(text) => setFormData(prev => ({ ...prev, end_time: text }))} placeholder="16:00" placeholderTextColor={colors.textSecondary} /></View>
                </View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Sampling Method</Text><TextInput style={styles.textInput} value={formData.sampling_method} onChangeText={(text) => setFormData(prev => ({ ...prev, sampling_method: text }))} placeholder="e.g., NIOSH 0500" placeholderTextColor={colors.textSecondary} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Equipment Used</Text><TextInput style={styles.textInput} value={formData.equipment_used} onChangeText={(text) => setFormData(prev => ({ ...prev, equipment_used: text }))} placeholder="Air sampling pump" placeholderTextColor={colors.textSecondary} /></View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Respiratory Protection</Text>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, respiratory_protection_required: !prev.respiratory_protection_required }))}><View style={[styles.checkbox, formData.respiratory_protection_required && styles.checkboxChecked]}>{formData.respiratory_protection_required && <CheckCircle size={16} color="#fff" />}</View><Text style={styles.checkLabel}>Respiratory protection required</Text></TouchableOpacity>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Recommended Respirator</Text><TextInput style={styles.textInput} value={formData.recommended_respirator} onChangeText={(text) => setFormData(prev => ({ ...prev, recommended_respirator: text }))} placeholder="e.g., N95, Half-face APR" placeholderTextColor={colors.textSecondary} /></View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Corrective Actions</Text>
                <View style={styles.addItemRow}>
                  <TextInput style={styles.addItemInput} value={newAction} onChangeText={setNewAction} placeholder="Add corrective action..." placeholderTextColor={colors.textSecondary} />
                  <TouchableOpacity style={styles.addItemButton} onPress={() => { if (newAction.trim()) { setFormData(prev => ({ ...prev, corrective_actions: [...prev.corrective_actions, newAction.trim()] })); setNewAction(''); } }}><Text style={styles.addItemButtonText}>Add</Text></TouchableOpacity>
                </View>
                {formData.corrective_actions.length > 0 && (<View style={styles.itemList}>{formData.corrective_actions.map((action, index) => (<View key={index} style={styles.itemRow}><Text style={styles.itemText}>• {action}</Text><TouchableOpacity style={styles.removeItemButton} onPress={() => setFormData(prev => ({ ...prev, corrective_actions: prev.corrective_actions.filter((_, i) => i !== index) }))}><X size={16} color={colors.textSecondary} /></TouchableOpacity></View>))}</View>)}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Sampled By</Text>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Name *</Text><TextInput style={styles.textInput} value={formData.sampled_by} onChangeText={(text) => setFormData(prev => ({ ...prev, sampled_by: text }))} placeholder="Technician name" placeholderTextColor={colors.textSecondary} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Notes</Text><TextInput style={[styles.textInput, styles.textArea]} value={formData.notes} onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))} placeholder="Additional notes..." placeholderTextColor={colors.textSecondary} multiline /></View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isCreating}><Text style={styles.submitButtonText}>{isCreating ? 'Creating...' : 'Create Record'}</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide" transparent onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Monitoring Details</Text><TouchableOpacity onPress={() => setShowDetailModal(false)}><X size={24} color={colors.text} /></TouchableOpacity></View>
            <ScrollView style={styles.modalBody}>
              {selectedRecord && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Location</Text><Text style={styles.detailValue}>{selectedRecord.location}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Monitoring #</Text><Text style={styles.detailValue}>{selectedRecord.monitoring_number}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{new Date(selectedRecord.monitoring_date).toLocaleDateString()}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Type</Text><Text style={styles.detailValue}>{AIR_MONITORING_TYPE_LABELS[selectedRecord.monitoring_type]}</Text></View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Contaminant</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Name</Text><Text style={styles.detailValue}>{selectedRecord.contaminant_name}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Type</Text><Text style={styles.detailValue}>{CONTAMINANT_TYPE_LABELS[selectedRecord.contaminant_type]}</Text></View>
                  </View>

                  {selectedRecord.result_value && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Results</Text>
                      <View style={[styles.resultCard, { borderWidth: 2, borderColor: getComplianceColor(selectedRecord) }]}>
                        <Text style={[styles.resultValue, { color: getComplianceColor(selectedRecord) }]}>{selectedRecord.result_value}</Text>
                        <Text style={styles.resultUnit}>{selectedRecord.result_unit}</Text>
                        {selectedRecord.percent_of_pel && (<Text style={[styles.resultPercent, { color: getComplianceColor(selectedRecord) }]}>{selectedRecord.percent_of_pel.toFixed(1)}% of PEL</Text>)}
                      </View>
                      {selectedRecord.osha_pel && (<View style={styles.detailRow}><Text style={styles.detailLabel}>OSHA PEL</Text><Text style={styles.detailValue}>{selectedRecord.osha_pel} {selectedRecord.osha_pel_unit}</Text></View>)}
                      <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text><Text style={[styles.detailValue, { color: getComplianceColor(selectedRecord) }]}>{getComplianceLabel(selectedRecord)}</Text></View>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Respiratory Protection</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Required</Text><Text style={styles.detailValue}>{selectedRecord.respiratory_protection_required ? 'Yes' : 'No'}</Text></View>
                    {selectedRecord.recommended_respirator && <View style={styles.detailRow}><Text style={styles.detailLabel}>Recommended</Text><Text style={styles.detailValue}>{selectedRecord.recommended_respirator}</Text></View>}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Sampled By</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Name</Text><Text style={styles.detailValue}>{selectedRecord.sampled_by}</Text></View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
