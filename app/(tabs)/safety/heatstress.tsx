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
import { useHeatStressMonitoring } from '@/hooks/useErgonomics';
import {
  HeatStressMonitoring,
  HeatMonitoringType,
  MetabolicRate,
  HeatIndex,
  AcclimatizationStatus,
  HEAT_INDEX_LABELS,
  HEAT_INDEX_COLORS,
} from '@/types/ergonomics';
import {
  Plus,
  Search,
  Calendar,
  Thermometer,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  X,
  Droplets,
} from 'lucide-react-native';

const METABOLIC_RATE_LABELS: Record<MetabolicRate, string> = {
  light: 'Light',
  moderate: 'Moderate',
  heavy: 'Heavy',
  very_heavy: 'Very Heavy',
};

const HEAT_MONITORING_TYPES: Record<HeatMonitoringType, string> = {
  routine: 'Routine',
  hot_weather: 'Hot Weather',
  incident_response: 'Incident Response',
  baseline: 'Baseline',
  follow_up: 'Follow-Up',
};

export default function HeatStressScreen() {
  const { colors } = useTheme();
  const { records, isRefetching, create, isCreating, generateNumber, refetch } = useHeatStressMonitoring();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HeatStressMonitoring | null>(null);
  const [formData, setFormData] = useState({
    location: '',
    work_area: '',
    monitoring_type: 'routine' as HeatMonitoringType,
    dry_bulb_temp_f: '',
    wet_bulb_temp_f: '',
    globe_temp_f: '',
    relative_humidity: '',
    air_velocity_fpm: '',
    metabolic_rate: 'moderate' as MetabolicRate,
    employee_name: '',
    job_task: '',
    hydration_available: true,
    shade_available: false,
    cooling_available: false,
    cooling_type: '',
    acclimatization_status: 'acclimatized' as AcclimatizationStatus,
    symptoms_reported: [] as string[],
    recommended_controls: [] as string[],
    monitored_by: '',
    notes: '',
  });
  const [newSymptom, setNewSymptom] = useState('');
  

  const filteredRecords = useMemo(() => {
    return records.filter(r =>
      r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.monitoring_number.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [records, searchQuery]);

  const stats = useMemo(() => ({
    total: records.length,
    danger: records.filter(r => r.heat_index === 'danger' || r.heat_index === 'extreme_danger').length,
    caution: records.filter(r => r.heat_index === 'caution' || r.heat_index === 'extreme_caution').length,
    safe: records.filter(r => r.heat_index === 'safe').length,
  }), [records]);

  const calculateWBGT = (wetBulb: number, globeTemp: number, dryBulb: number) => {
    return (0.7 * wetBulb) + (0.2 * globeTemp) + (0.1 * dryBulb);
  };

  const getHeatIndex = (wbgt: number): HeatIndex => {
    if (wbgt >= 32.2) return 'extreme_danger';
    if (wbgt >= 29.4) return 'danger';
    if (wbgt >= 26.7) return 'extreme_caution';
    if (wbgt >= 25) return 'caution';
    return 'safe';
  };

  const resetForm = () => {
    setFormData({
      location: '',
      work_area: '',
      monitoring_type: 'routine',
      dry_bulb_temp_f: '',
      wet_bulb_temp_f: '',
      globe_temp_f: '',
      relative_humidity: '',
      air_velocity_fpm: '',
      metabolic_rate: 'moderate',
      employee_name: '',
      job_task: '',
      hydration_available: true,
      shade_available: false,
      cooling_available: false,
      cooling_type: '',
      acclimatization_status: 'acclimatized',
      symptoms_reported: [],
      recommended_controls: [],
      monitored_by: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.location.trim() || !formData.monitored_by.trim()) {
      Alert.alert('Error', 'Location and monitored by are required');
      return;
    }

    try {
      const dryBulb = formData.dry_bulb_temp_f ? parseFloat(formData.dry_bulb_temp_f) : null;
      const wetBulb = formData.wet_bulb_temp_f ? parseFloat(formData.wet_bulb_temp_f) : null;
      const globeTemp = formData.globe_temp_f ? parseFloat(formData.globe_temp_f) : null;
      
      let wbgt: number | null = null;
      let heatIndex: HeatIndex | null = null;
      
      if (wetBulb && globeTemp && dryBulb) {
        wbgt = calculateWBGT(wetBulb, globeTemp, dryBulb);
        heatIndex = getHeatIndex(wbgt);
      }

      const payload = {
        monitoring_number: generateNumber(),
        facility_id: null,
        facility_name: null,
        location: formData.location,
        work_area: formData.work_area || null,
        monitoring_date: new Date().toISOString().split('T')[0],
        monitoring_time: new Date().toTimeString().slice(0, 5),
        monitoring_type: formData.monitoring_type,
        dry_bulb_temp_f: dryBulb,
        wet_bulb_temp_f: wetBulb,
        globe_temp_f: globeTemp,
        wbgt_index: wbgt,
        relative_humidity: formData.relative_humidity ? parseFloat(formData.relative_humidity) : null,
        air_velocity_fpm: formData.air_velocity_fpm ? parseFloat(formData.air_velocity_fpm) : null,
        radiant_heat_source: null,
        clothing_adjustment: 0,
        metabolic_rate: formData.metabolic_rate,
        work_rest_regime: null,
        recommended_work_rest: null,
        employee_id: null,
        employee_name: formData.employee_name || null,
        job_task: formData.job_task || null,
        exposure_duration_minutes: null,
        hydration_available: formData.hydration_available,
        hydration_frequency: null,
        shade_available: formData.shade_available,
        cooling_available: formData.cooling_available,
        cooling_type: formData.cooling_type || null,
        ppe_worn: [],
        acclimatization_status: formData.acclimatization_status,
        heat_index: heatIndex,
        action_limit_exceeded: wbgt ? wbgt >= 25 : false,
        threshold_limit_exceeded: wbgt ? wbgt >= 28 : false,
        symptoms_reported: formData.symptoms_reported,
        first_aid_provided: false,
        first_aid_details: null,
        engineering_controls: [],
        administrative_controls: [],
        recommended_controls: formData.recommended_controls,
        monitored_by: formData.monitored_by,
        monitored_by_id: null,
        reviewed_by: null,
        reviewed_by_id: null,
        reviewed_date: null,
        status: 'completed' as const,
        follow_up_required: heatIndex === 'danger' || heatIndex === 'extreme_danger',
        follow_up_date: null,
        attachments: [],
        notes: formData.notes || null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Heat stress monitoring record created successfully');
    } catch (err) {
      console.error('Error creating record:', err);
      Alert.alert('Error', 'Failed to create record');
    }
  };

  const getHeatColor = (index: HeatIndex | null) => {
    if (!index) return colors.textSecondary;
    return HEAT_INDEX_COLORS[index];
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
    addButton: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    locationName: { fontSize: 16, fontWeight: '600' as const, color: colors.text, flex: 1 },
    monitoringNumber: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    tempBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
    tempText: { fontSize: 14, fontWeight: '700' as const },
    tempUnit: { fontSize: 11, fontWeight: '500' as const },
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
    tempGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
    tempCard: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: 8, padding: 12, alignItems: 'center' },
    tempCardLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
    tempCardValue: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
    tempCardUnit: { fontSize: 12, color: colors.textSecondary },
  });

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.danger}</Text>
          <Text style={styles.statLabel}>Danger</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.caution}</Text>
          <Text style={styles.statLabel}>Caution</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.safe}</Text>
          <Text style={styles.statLabel}>Safe</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search records..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Thermometer size={40} color={colors.textSecondary} /></View>
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptyText}>Create your first heat stress monitoring record</Text>
          </View>
        ) : (
          filteredRecords.map(record => (
            <TouchableOpacity key={record.id} style={styles.card} onPress={() => { setSelectedRecord(record); setShowDetailModal(true); }}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>{record.location}</Text>
                  <Text style={styles.monitoringNumber}>{record.monitoring_number}</Text>
                </View>
                {record.wbgt_index && (
                  <View style={[styles.tempBadge, { backgroundColor: getHeatColor(record.heat_index) + '20' }]}>
                    <Thermometer size={14} color={getHeatColor(record.heat_index)} />
                    <Text style={[styles.tempText, { color: getHeatColor(record.heat_index) }]}>{record.wbgt_index.toFixed(1)}</Text>
                    <Text style={[styles.tempUnit, { color: getHeatColor(record.heat_index) }]}>WBGT</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}><Calendar size={14} color={colors.textSecondary} /><Text style={styles.infoText}>{new Date(record.monitoring_date).toLocaleDateString()} at {record.monitoring_time}</Text></View>
                {record.dry_bulb_temp_f && (<View style={styles.infoRow}><Thermometer size={14} color={colors.textSecondary} /><Text style={styles.infoText}>Dry Bulb: {record.dry_bulb_temp_f}°F</Text></View>)}
                {record.relative_humidity && (<View style={styles.infoRow}><Droplets size={14} color={colors.textSecondary} /><Text style={styles.infoText}>Humidity: {record.relative_humidity}%</Text></View>)}
              </View>

              <View style={styles.cardFooter}>
                {record.heat_index && (
                  <View style={[styles.statusBadge, { backgroundColor: getHeatColor(record.heat_index) + '20' }]}>
                    {record.heat_index === 'safe' ? <CheckCircle size={14} color={getHeatColor(record.heat_index)} /> : <AlertTriangle size={14} color={getHeatColor(record.heat_index)} />}
                    <Text style={[styles.statusText, { color: getHeatColor(record.heat_index) }]}>{HEAT_INDEX_LABELS[record.heat_index]}</Text>
                  </View>
                )}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Heat Stress Monitoring</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}><X size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Location *</Text><TextInput style={styles.textInput} value={formData.location} onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))} placeholder="Building/Area" placeholderTextColor={colors.textSecondary} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Work Area</Text><TextInput style={styles.textInput} value={formData.work_area} onChangeText={(text) => setFormData(prev => ({ ...prev, work_area: text }))} placeholder="Specific work area" placeholderTextColor={colors.textSecondary} /></View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Monitoring Type</Text>
                <View style={styles.typeSelector}>
                  {(Object.keys(HEAT_MONITORING_TYPES) as HeatMonitoringType[]).map(type => (
                    <TouchableOpacity key={type} style={[styles.typeOption, formData.monitoring_type === type && styles.typeOptionSelected]} onPress={() => setFormData(prev => ({ ...prev, monitoring_type: type }))}>
                      <Text style={[styles.typeOptionText, formData.monitoring_type === type && styles.typeOptionTextSelected]}>{HEAT_MONITORING_TYPES[type]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Temperature Readings (°F)</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.thirdWidth}><Text style={styles.inputLabel}>Dry Bulb</Text><TextInput style={styles.textInput} value={formData.dry_bulb_temp_f} onChangeText={(text) => setFormData(prev => ({ ...prev, dry_bulb_temp_f: text }))} placeholder="95" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" /></View>
                  <View style={styles.thirdWidth}><Text style={styles.inputLabel}>Wet Bulb</Text><TextInput style={styles.textInput} value={formData.wet_bulb_temp_f} onChangeText={(text) => setFormData(prev => ({ ...prev, wet_bulb_temp_f: text }))} placeholder="78" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" /></View>
                  <View style={styles.thirdWidth}><Text style={styles.inputLabel}>Globe</Text><TextInput style={styles.textInput} value={formData.globe_temp_f} onChangeText={(text) => setFormData(prev => ({ ...prev, globe_temp_f: text }))} placeholder="100" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" /></View>
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}><Text style={styles.inputLabel}>Humidity (%)</Text><TextInput style={styles.textInput} value={formData.relative_humidity} onChangeText={(text) => setFormData(prev => ({ ...prev, relative_humidity: text }))} placeholder="65" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" /></View>
                  <View style={styles.halfWidth}><Text style={styles.inputLabel}>Air Velocity (fpm)</Text><TextInput style={styles.textInput} value={formData.air_velocity_fpm} onChangeText={(text) => setFormData(prev => ({ ...prev, air_velocity_fpm: text }))} placeholder="100" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" /></View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Work Activity</Text>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Metabolic Rate</Text>
                  <View style={styles.typeSelector}>
                    {(Object.keys(METABOLIC_RATE_LABELS) as MetabolicRate[]).map(rate => (
                      <TouchableOpacity key={rate} style={[styles.typeOption, formData.metabolic_rate === rate && styles.typeOptionSelected]} onPress={() => setFormData(prev => ({ ...prev, metabolic_rate: rate }))}>
                        <Text style={[styles.typeOptionText, formData.metabolic_rate === rate && styles.typeOptionTextSelected]}>{METABOLIC_RATE_LABELS[rate]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}><Text style={styles.inputLabel}>Employee Name</Text><TextInput style={styles.textInput} value={formData.employee_name} onChangeText={(text) => setFormData(prev => ({ ...prev, employee_name: text }))} placeholder="Optional" placeholderTextColor={colors.textSecondary} /></View>
                  <View style={styles.halfWidth}><Text style={styles.inputLabel}>Job Task</Text><TextInput style={styles.textInput} value={formData.job_task} onChangeText={(text) => setFormData(prev => ({ ...prev, job_task: text }))} placeholder="Task description" placeholderTextColor={colors.textSecondary} /></View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Controls Available</Text>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, hydration_available: !prev.hydration_available }))}><View style={[styles.checkbox, formData.hydration_available && styles.checkboxChecked]}>{formData.hydration_available && <CheckCircle size={16} color="#fff" />}</View><Text style={styles.checkLabel}>Hydration available</Text></TouchableOpacity>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, shade_available: !prev.shade_available }))}><View style={[styles.checkbox, formData.shade_available && styles.checkboxChecked]}>{formData.shade_available && <CheckCircle size={16} color="#fff" />}</View><Text style={styles.checkLabel}>Shade available</Text></TouchableOpacity>
                <TouchableOpacity style={styles.checkRow} onPress={() => setFormData(prev => ({ ...prev, cooling_available: !prev.cooling_available }))}><View style={[styles.checkbox, formData.cooling_available && styles.checkboxChecked]}>{formData.cooling_available && <CheckCircle size={16} color="#fff" />}</View><Text style={styles.checkLabel}>Cooling available</Text></TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Symptoms Reported</Text>
                <View style={styles.addItemRow}>
                  <TextInput style={styles.addItemInput} value={newSymptom} onChangeText={setNewSymptom} placeholder="Add symptom..." placeholderTextColor={colors.textSecondary} />
                  <TouchableOpacity style={styles.addItemButton} onPress={() => { if (newSymptom.trim()) { setFormData(prev => ({ ...prev, symptoms_reported: [...prev.symptoms_reported, newSymptom.trim()] })); setNewSymptom(''); } }}><Text style={styles.addItemButtonText}>Add</Text></TouchableOpacity>
                </View>
                {formData.symptoms_reported.length > 0 && (<View style={styles.itemList}>{formData.symptoms_reported.map((symptom, index) => (<View key={index} style={styles.itemRow}><Text style={styles.itemText}>• {symptom}</Text><TouchableOpacity style={styles.removeItemButton} onPress={() => setFormData(prev => ({ ...prev, symptoms_reported: prev.symptoms_reported.filter((_, i) => i !== index) }))}><X size={16} color={colors.textSecondary} /></TouchableOpacity></View>))}</View>)}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Monitored By</Text>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Name *</Text><TextInput style={styles.textInput} value={formData.monitored_by} onChangeText={(text) => setFormData(prev => ({ ...prev, monitored_by: text }))} placeholder="Technician name" placeholderTextColor={colors.textSecondary} /></View>
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
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Date/Time</Text><Text style={styles.detailValue}>{new Date(selectedRecord.monitoring_date).toLocaleDateString()} {selectedRecord.monitoring_time}</Text></View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Temperature Readings</Text>
                    <View style={styles.tempGrid}>
                      {selectedRecord.dry_bulb_temp_f && (<View style={styles.tempCard}><Text style={styles.tempCardLabel}>Dry Bulb</Text><Text style={styles.tempCardValue}>{selectedRecord.dry_bulb_temp_f}</Text><Text style={styles.tempCardUnit}>°F</Text></View>)}
                      {selectedRecord.wet_bulb_temp_f && (<View style={styles.tempCard}><Text style={styles.tempCardLabel}>Wet Bulb</Text><Text style={styles.tempCardValue}>{selectedRecord.wet_bulb_temp_f}</Text><Text style={styles.tempCardUnit}>°F</Text></View>)}
                      {selectedRecord.globe_temp_f && (<View style={styles.tempCard}><Text style={styles.tempCardLabel}>Globe</Text><Text style={styles.tempCardValue}>{selectedRecord.globe_temp_f}</Text><Text style={styles.tempCardUnit}>°F</Text></View>)}
                      {selectedRecord.wbgt_index && (<View style={[styles.tempCard, { backgroundColor: getHeatColor(selectedRecord.heat_index) + '20' }]}><Text style={styles.tempCardLabel}>WBGT Index</Text><Text style={[styles.tempCardValue, { color: getHeatColor(selectedRecord.heat_index) }]}>{selectedRecord.wbgt_index.toFixed(1)}</Text><Text style={styles.tempCardUnit}>°F</Text></View>)}
                    </View>
                  </View>

                  {selectedRecord.heat_index && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Heat Index</Text>
                      <View style={styles.detailRow}><Text style={styles.detailLabel}>Risk Level</Text><Text style={[styles.detailValue, { color: getHeatColor(selectedRecord.heat_index) }]}>{HEAT_INDEX_LABELS[selectedRecord.heat_index]}</Text></View>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Controls</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Hydration</Text><Text style={styles.detailValue}>{selectedRecord.hydration_available ? 'Available' : 'Not Available'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Shade</Text><Text style={styles.detailValue}>{selectedRecord.shade_available ? 'Available' : 'Not Available'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Cooling</Text><Text style={styles.detailValue}>{selectedRecord.cooling_available ? 'Available' : 'Not Available'}</Text></View>
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
