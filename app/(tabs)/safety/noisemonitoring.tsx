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
import { useNoiseMonitoring } from '@/hooks/useErgonomics';
import {
  NoiseMonitoring,
  MonitoringType,
  MONITORING_TYPE_LABELS,
} from '@/types/ergonomics';
import {
  Plus,
  Search,
  Calendar,
  Volume2,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  X,
  Clock,
  User,
} from 'lucide-react-native';

export default function NoiseMonitoringScreen() {
  const { colors } = useTheme();
  const {
    records,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = useNoiseMonitoring();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<NoiseMonitoring | null>(null);
  const [formData, setFormData] = useState({
    location: '',
    area_description: '',
    monitoring_type: 'area' as MonitoringType,
    equipment_used: '',
    start_time: '',
    end_time: '',
    employee_name: '',
    job_title: '',
    twa_db: '',
    max_db: '',
    peak_db: '',
    dose_percent: '',
    noise_sources: [] as string[],
    hearing_protection_required: false,
    current_hearing_protection: '',
    recommended_hearing_protection: '',
    corrective_actions: [] as string[],
    monitored_by: '',
    notes: '',
  });
  const [newNoiseSource, setNewNoiseSource] = useState('');
  const [newAction, setNewAction] = useState('');

  const filteredRecords = useMemo(() => {
    return records.filter(r =>
      r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.monitoring_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.employee_name && r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()))
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
      monitoring_type: 'area',
      equipment_used: '',
      start_time: '',
      end_time: '',
      employee_name: '',
      job_title: '',
      twa_db: '',
      max_db: '',
      peak_db: '',
      dose_percent: '',
      noise_sources: [],
      hearing_protection_required: false,
      current_hearing_protection: '',
      recommended_hearing_protection: '',
      corrective_actions: [],
      monitored_by: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.location.trim() || !formData.twa_db.trim() || !formData.monitored_by.trim()) {
      Alert.alert('Error', 'Location, TWA reading, and monitored by are required');
      return;
    }

    try {
      const twa = parseFloat(formData.twa_db);
      const exceedsAction = twa >= 85;
      const exceedsPEL = twa >= 90;

      const payload = {
        monitoring_number: generateNumber(),
        facility_id: null,
        facility_name: null,
        location: formData.location,
        area_description: formData.area_description || null,
        monitoring_date: new Date().toISOString().split('T')[0],
        monitoring_type: formData.monitoring_type,
        equipment_used: formData.equipment_used || 'Sound Level Meter',
        equipment_serial: null,
        calibration_date: null,
        calibration_due: null,
        start_time: formData.start_time || '08:00',
        end_time: formData.end_time || '16:00',
        duration_minutes: null,
        employee_id: null,
        employee_name: formData.employee_name || null,
        job_title: formData.job_title || null,
        tasks_monitored: [],
        twa_db: twa,
        max_db: formData.max_db ? parseFloat(formData.max_db) : null,
        min_db: null,
        peak_db: formData.peak_db ? parseFloat(formData.peak_db) : null,
        dose_percent: formData.dose_percent ? parseFloat(formData.dose_percent) : null,
        exchange_rate: 5,
        criterion_level: 90,
        threshold_level: 80,
        action_level: 85,
        exceeds_action_level: exceedsAction,
        exceeds_pel: exceedsPEL,
        hearing_protection_required: formData.hearing_protection_required || exceedsAction,
        current_hearing_protection: formData.current_hearing_protection || null,
        recommended_hearing_protection: formData.recommended_hearing_protection || null,
        nrr_required: null,
        engineering_controls_present: [],
        engineering_controls_recommended: [],
        administrative_controls_present: [],
        administrative_controls_recommended: [],
        noise_sources: formData.noise_sources,
        weather_conditions: null,
        background_noise_db: null,
        monitored_by: formData.monitored_by,
        monitored_by_id: null,
        reviewed_by: null,
        reviewed_by_id: null,
        reviewed_date: null,
        status: 'completed' as const,
        compliance_status: exceedsPEL ? 'non_compliant' : exceedsAction ? 'action_required' : 'compliant',
        corrective_actions: formData.corrective_actions,
        follow_up_required: exceedsAction,
        follow_up_date: null,
        attachments: [],
        notes: formData.notes || null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Noise monitoring record created successfully');
    } catch (err) {
      console.error('Error creating record:', err);
      Alert.alert('Error', 'Failed to create record');
    }
  };

  const getComplianceColor = (record: NoiseMonitoring) => {
    if (record.exceeds_pel) return '#EF4444';
    if (record.exceeds_action_level) return '#F59E0B';
    return '#10B981';
  };

  const getComplianceLabel = (record: NoiseMonitoring) => {
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
    addButton: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    locationName: { fontSize: 16, fontWeight: '600' as const, color: colors.text, flex: 1 },
    monitoringNumber: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    dbBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
    dbText: { fontSize: 14, fontWeight: '700' as const },
    dbUnit: { fontSize: 11, fontWeight: '500' as const },
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
    limitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    limitLabel: { fontSize: 13, color: colors.textSecondary },
    limitValue: { fontSize: 14, fontWeight: '600' as const },
  });

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.exceedsPEL}</Text>
          <Text style={styles.statLabel}>Exceeds PEL</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.exceedsAction}</Text>
          <Text style={styles.statLabel}>Action Level</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.compliant}</Text>
          <Text style={styles.statLabel}>Compliant</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search records..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Volume2 size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptyText}>Create your first noise monitoring record</Text>
          </View>
        ) : (
          filteredRecords.map(record => (
            <TouchableOpacity
              key={record.id}
              style={styles.card}
              onPress={() => { setSelectedRecord(record); setShowDetailModal(true); }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>{record.location}</Text>
                  <Text style={styles.monitoringNumber}>{record.monitoring_number}</Text>
                </View>
                <View style={[styles.dbBadge, { backgroundColor: getComplianceColor(record) + '20' }]}>
                  <Volume2 size={14} color={getComplianceColor(record)} />
                  <Text style={[styles.dbText, { color: getComplianceColor(record) }]}>{record.twa_db}</Text>
                  <Text style={[styles.dbUnit, { color: getComplianceColor(record) }]}>dB</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{new Date(record.monitoring_date).toLocaleDateString()}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Clock size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{record.start_time} - {record.end_time}</Text>
                </View>
                {record.employee_name && (
                  <View style={styles.infoRow}>
                    <User size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{record.employee_name}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, { backgroundColor: getComplianceColor(record) + '20' }]}>
                  {record.exceeds_pel || record.exceeds_action_level ? (
                    <AlertTriangle size={14} color={getComplianceColor(record)} />
                  ) : (
                    <CheckCircle size={14} color={getComplianceColor(record)} />
                  )}
                  <Text style={[styles.statusText, { color: getComplianceColor(record) }]}>{getComplianceLabel(record)}</Text>
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
              <Text style={styles.modalTitle}>New Noise Monitoring</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}><X size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Location *</Text>
                  <TextInput style={styles.textInput} value={formData.location} onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))} placeholder="Building/Area/Room" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Area Description</Text>
                  <TextInput style={styles.textInput} value={formData.area_description} onChangeText={(text) => setFormData(prev => ({ ...prev, area_description: text }))} placeholder="Describe the area" placeholderTextColor={colors.textSecondary} />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Monitoring Type</Text>
                <View style={styles.typeSelector}>
                  {(Object.keys(MONITORING_TYPE_LABELS) as MonitoringType[]).map(type => (
                    <TouchableOpacity key={type} style={[styles.typeOption, formData.monitoring_type === type && styles.typeOptionSelected]} onPress={() => setFormData(prev => ({ ...prev, monitoring_type: type }))}>
                      <Text style={[styles.typeOptionText, formData.monitoring_type === type && styles.typeOptionTextSelected]}>{MONITORING_TYPE_LABELS[type]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {formData.monitoring_type === 'personal' && (
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Employee Information</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Employee Name</Text>
                    <TextInput style={styles.textInput} value={formData.employee_name} onChangeText={(text) => setFormData(prev => ({ ...prev, employee_name: text }))} placeholder="Employee name" placeholderTextColor={colors.textSecondary} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Job Title</Text>
                    <TextInput style={styles.textInput} value={formData.job_title} onChangeText={(text) => setFormData(prev => ({ ...prev, job_title: text }))} placeholder="Job title" placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>
              )}

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Measurements</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.thirdWidth}>
                    <Text style={styles.inputLabel}>TWA (dB) *</Text>
                    <TextInput style={styles.textInput} value={formData.twa_db} onChangeText={(text) => setFormData(prev => ({ ...prev, twa_db: text }))} placeholder="85" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.thirdWidth}>
                    <Text style={styles.inputLabel}>Max (dB)</Text>
                    <TextInput style={styles.textInput} value={formData.max_db} onChangeText={(text) => setFormData(prev => ({ ...prev, max_db: text }))} placeholder="95" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.thirdWidth}>
                    <Text style={styles.inputLabel}>Peak (dB)</Text>
                    <TextInput style={styles.textInput} value={formData.peak_db} onChangeText={(text) => setFormData(prev => ({ ...prev, peak_db: text }))} placeholder="115" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" />
                  </View>
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Dose (%)</Text>
                    <TextInput style={styles.textInput} value={formData.dose_percent} onChangeText={(text) => setFormData(prev => ({ ...prev, dose_percent: text }))} placeholder="50" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Equipment Used</Text>
                    <TextInput style={styles.textInput} value={formData.equipment_used} onChangeText={(text) => setFormData(prev => ({ ...prev, equipment_used: text }))} placeholder="Sound Level Meter" placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Start Time</Text>
                    <TextInput style={styles.textInput} value={formData.start_time} onChangeText={(text) => setFormData(prev => ({ ...prev, start_time: text }))} placeholder="08:00" placeholderTextColor={colors.textSecondary} />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>End Time</Text>
                    <TextInput style={styles.textInput} value={formData.end_time} onChangeText={(text) => setFormData(prev => ({ ...prev, end_time: text }))} placeholder="16:00" placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Noise Sources</Text>
                <View style={styles.addItemRow}>
                  <TextInput style={styles.addItemInput} value={newNoiseSource} onChangeText={setNewNoiseSource} placeholder="Add noise source..." placeholderTextColor={colors.textSecondary} />
                  <TouchableOpacity style={styles.addItemButton} onPress={() => { if (newNoiseSource.trim()) { setFormData(prev => ({ ...prev, noise_sources: [...prev.noise_sources, newNoiseSource.trim()] })); setNewNoiseSource(''); } }}>
                    <Text style={styles.addItemButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {formData.noise_sources.length > 0 && (
                  <View style={styles.itemList}>
                    {formData.noise_sources.map((source, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemText}>• {source}</Text>
                        <TouchableOpacity style={styles.removeItemButton} onPress={() => setFormData(prev => ({ ...prev, noise_sources: prev.noise_sources.filter((_, i) => i !== index) }))}><X size={16} color={colors.textSecondary} /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Hearing Protection</Text>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, hearing_protection_required: !prev.hearing_protection_required }))}>
                  <View style={[styles.checkbox, formData.hearing_protection_required && styles.checkboxChecked]}>
                    {formData.hearing_protection_required && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>Hearing protection required</Text>
                </TouchableOpacity>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Protection</Text>
                  <TextInput style={styles.textInput} value={formData.current_hearing_protection} onChangeText={(text) => setFormData(prev => ({ ...prev, current_hearing_protection: text }))} placeholder="e.g., Foam earplugs NRR 29" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Recommended Protection</Text>
                  <TextInput style={styles.textInput} value={formData.recommended_hearing_protection} onChangeText={(text) => setFormData(prev => ({ ...prev, recommended_hearing_protection: text }))} placeholder="e.g., Dual protection (plugs + muffs)" placeholderTextColor={colors.textSecondary} />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Corrective Actions</Text>
                <View style={styles.addItemRow}>
                  <TextInput style={styles.addItemInput} value={newAction} onChangeText={setNewAction} placeholder="Add corrective action..." placeholderTextColor={colors.textSecondary} />
                  <TouchableOpacity style={styles.addItemButton} onPress={() => { if (newAction.trim()) { setFormData(prev => ({ ...prev, corrective_actions: [...prev.corrective_actions, newAction.trim()] })); setNewAction(''); } }}>
                    <Text style={styles.addItemButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {formData.corrective_actions.length > 0 && (
                  <View style={styles.itemList}>
                    {formData.corrective_actions.map((action, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemText}>• {action}</Text>
                        <TouchableOpacity style={styles.removeItemButton} onPress={() => setFormData(prev => ({ ...prev, corrective_actions: prev.corrective_actions.filter((_, i) => i !== index) }))}><X size={16} color={colors.textSecondary} /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Monitored By</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput style={styles.textInput} value={formData.monitored_by} onChangeText={(text) => setFormData(prev => ({ ...prev, monitored_by: text }))} placeholder="Technician name" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes</Text>
                  <TextInput style={[styles.textInput, styles.textArea]} value={formData.notes} onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))} placeholder="Additional notes..." placeholderTextColor={colors.textSecondary} multiline />
                </View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isCreating}>
                <Text style={styles.submitButtonText}>{isCreating ? 'Creating...' : 'Create Record'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide" transparent onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Monitoring Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}><X size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedRecord && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Location</Text><Text style={styles.detailValue}>{selectedRecord.location}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Monitoring #</Text><Text style={styles.detailValue}>{selectedRecord.monitoring_number}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{new Date(selectedRecord.monitoring_date).toLocaleDateString()}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Time</Text><Text style={styles.detailValue}>{selectedRecord.start_time} - {selectedRecord.end_time}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Type</Text><Text style={styles.detailValue}>{MONITORING_TYPE_LABELS[selectedRecord.monitoring_type]}</Text></View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Measurements</Text>
                    <View style={styles.limitRow}><Text style={styles.limitLabel}>TWA (8-hr)</Text><Text style={[styles.limitValue, { color: getComplianceColor(selectedRecord) }]}>{selectedRecord.twa_db} dB</Text></View>
                    {selectedRecord.max_db && <View style={styles.limitRow}><Text style={styles.limitLabel}>Maximum</Text><Text style={styles.limitValue}>{selectedRecord.max_db} dB</Text></View>}
                    {selectedRecord.peak_db && <View style={styles.limitRow}><Text style={styles.limitLabel}>Peak</Text><Text style={styles.limitValue}>{selectedRecord.peak_db} dB</Text></View>}
                    {selectedRecord.dose_percent && <View style={styles.limitRow}><Text style={styles.limitLabel}>Dose</Text><Text style={styles.limitValue}>{selectedRecord.dose_percent}%</Text></View>}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>OSHA Limits</Text>
                    <View style={styles.limitRow}><Text style={styles.limitLabel}>Action Level</Text><Text style={styles.limitValue}>85 dB</Text></View>
                    <View style={styles.limitRow}><Text style={styles.limitLabel}>PEL</Text><Text style={styles.limitValue}>90 dB</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text><Text style={[styles.detailValue, { color: getComplianceColor(selectedRecord) }]}>{getComplianceLabel(selectedRecord)}</Text></View>
                  </View>

                  {selectedRecord.noise_sources.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Noise Sources</Text>
                      <View style={styles.detailList}>{selectedRecord.noise_sources.map((source, index) => (<Text key={index} style={styles.detailListItem}>• {source}</Text>))}</View>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Hearing Protection</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Required</Text><Text style={styles.detailValue}>{selectedRecord.hearing_protection_required ? 'Yes' : 'No'}</Text></View>
                    {selectedRecord.current_hearing_protection && <View style={styles.detailRow}><Text style={styles.detailLabel}>Current</Text><Text style={styles.detailValue}>{selectedRecord.current_hearing_protection}</Text></View>}
                    {selectedRecord.recommended_hearing_protection && <View style={styles.detailRow}><Text style={styles.detailLabel}>Recommended</Text><Text style={styles.detailValue}>{selectedRecord.recommended_hearing_protection}</Text></View>}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Monitored By</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Name</Text><Text style={styles.detailValue}>{selectedRecord.monitored_by}</Text></View>
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
