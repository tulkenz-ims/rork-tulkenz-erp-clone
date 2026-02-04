import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Wrench, Plus, X, Save, ChevronDown, ChevronUp, CheckCircle2, Clock, Trash2, ShieldAlert, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useSafetyPermits, usePermitById } from '@/hooks/useSafetyPermits';
import { useUser } from '@/contexts/UserContext';
import { TempEquipmentPermitData, TempEquipmentType } from '@/types/safety';
import { LOTO_LEVELS } from '@/constants/lotoProgram';
import DatePickerModal from '@/components/DatePickerModal';

const EQUIPMENT_TYPES: { value: TempEquipmentType; label: string }[] = [
  { value: 'scaffold', label: 'Scaffolding' },
  { value: 'ladder', label: 'Ladder' },
  { value: 'lift', label: 'Aerial Lift/Platform' },
  { value: 'crane', label: 'Crane' },
  { value: 'hoist', label: 'Hoist/Rigging' },
  { value: 'temporary_power', label: 'Temporary Power' },
  { value: 'temporary_lighting', label: 'Temporary Lighting' },
  { value: 'other', label: 'Other' },
];

const PPE_OPTIONS = [
  { id: 'hard_hat', label: 'Hard Hat' },
  { id: 'safety_glasses', label: 'Safety Glasses' },
  { id: 'fall_harness', label: 'Fall Harness' },
  { id: 'safety_shoes', label: 'Safety Shoes' },
  { id: 'gloves', label: 'Work Gloves' },
  { id: 'high_visibility', label: 'High Visibility Vest' },
  { id: 'hearing_protection', label: 'Hearing Protection' },
];

export default function TempEquipmentScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useUser();
  
  const { createPermit, updatePermit, deletePermit, generatePermitNumber, isCreating, isUpdating, isDeleting } = useSafetyPermits('temporary_equipment');
  const { data: existingPermit, isLoading: loadingPermit } = usePermitById(id);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'equipment', 'inspection', 'loto', 'ppe']));
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | 'install' | 'removal' | null>(null);

  const [permitNumber, setPermitNumber] = useState('');
  const [location, setLocation] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('07:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('17:00');

  const [equipmentType, setEquipmentType] = useState<TempEquipmentType>('scaffold');
  const [equipmentDescription, setEquipmentDescription] = useState('');
  const [equipmentLocation, setEquipmentLocation] = useState('');
  const [installationDate, setInstallationDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedRemovalDate, setExpectedRemovalDate] = useState('');
  const [loadCapacity, setLoadCapacity] = useState('');
  const [actualLoad, setActualLoad] = useState('');

  const [inspectionCompleted, setInspectionCompleted] = useState(false);
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectedBy, setInspectedBy] = useState('');
  const [manufacturerGuidelinesFollowed, setManufacturerGuidelinesFollowed] = useState(false);
  const [groundingRequired, setGroundingRequired] = useState(false);
  const [groundingVerified, setGroundingVerified] = useState(false);
  const [guardrailsRequired, setGuardrailsRequired] = useState(false);
  const [guardrailsInstalled, setGuardrailsInstalled] = useState(false);
  const [accessRestrictions, setAccessRestrictions] = useState<string[]>([]);
  const [newRestriction, setNewRestriction] = useState('');
  const [warningSignsPosted, setWarningSignsPosted] = useState(false);
  const [dailyInspectionRequired, setDailyInspectionRequired] = useState(false);

  const [lotoRequired, setLotoRequired] = useState(false);
  const [lotoLevel, setLotoLevel] = useState<number>(0);
  const [selectedPPE, setSelectedPPE] = useState<string[]>(['hard_hat', 'safety_glasses', 'safety_shoes']);

  useEffect(() => { if (!id) setPermitNumber(generatePermitNumber('temporary_equipment')); }, [id, generatePermitNumber]);

  useEffect(() => {
    if (existingPermit && existingPermit.permit_type === 'temporary_equipment') {
      setPermitNumber(existingPermit.permit_number);
      setLocation(existingPermit.location || '');
      setWorkDescription(existingPermit.work_description);
      setStartDate(existingPermit.start_date);
      setSelectedPPE(existingPermit.ppe_required || []);
      setLotoRequired((existingPermit as any).loto_required || false);
      setLotoLevel((existingPermit as any).loto_level || 0);
      const pd = existingPermit.permit_data as TempEquipmentPermitData;
      if (pd) {
        setEquipmentType(pd.equipment_type || 'scaffold');
        setEquipmentDescription(pd.equipment_description || '');
        setEquipmentLocation(pd.equipment_location || '');
        setInstallationDate(pd.installation_date || startDate);
        setExpectedRemovalDate(pd.expected_removal_date || '');
        setLoadCapacity(pd.load_capacity || '');
        setActualLoad(pd.actual_load || '');
        setInspectionCompleted(pd.inspection_completed ?? false);
        setInspectionDate(pd.inspection_date || startDate);
        setInspectedBy(pd.inspected_by || '');
        setManufacturerGuidelinesFollowed(pd.manufacturer_guidelines_followed ?? false);
        setGroundingRequired(pd.grounding_required ?? false);
        setGroundingVerified(pd.grounding_verified ?? false);
        setGuardrailsRequired(pd.guardrails_required ?? false);
        setGuardrailsInstalled(pd.guardrails_installed ?? false);
        setAccessRestrictions(pd.access_restrictions || []);
        setWarningSignsPosted(pd.warning_signs_posted ?? false);
        setDailyInspectionRequired(pd.daily_inspection_required ?? false);
      }
    }
  }, [existingPermit]);

  const toggleSection = useCallback((s: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedSections(prev => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; }); }, []);
  const togglePPE = useCallback((p: string) => { setSelectedPPE(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]); }, []);
  const addRestriction = useCallback(() => { if (newRestriction.trim()) { setAccessRestrictions(prev => [...prev, newRestriction.trim()]); setNewRestriction(''); } }, [newRestriction]);

  const handleSave = useCallback(async (status: 'draft' | 'pending_approval') => {
    if (!workDescription.trim() || !equipmentDescription.trim()) { Alert.alert('Error', 'Work description and equipment description required'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permitData: TempEquipmentPermitData = { equipment_type: equipmentType, equipment_description: equipmentDescription, equipment_location: equipmentLocation, installation_date: installationDate, expected_removal_date: expectedRemovalDate, load_capacity: loadCapacity, actual_load: actualLoad, inspection_completed: inspectionCompleted, inspection_date: inspectionDate, inspected_by: inspectedBy, manufacturer_guidelines_followed: manufacturerGuidelinesFollowed, grounding_required: groundingRequired, grounding_verified: groundingVerified, guardrails_required: guardrailsRequired, guardrails_installed: guardrailsInstalled, access_restrictions: accessRestrictions, warning_signs_posted: warningSignsPosted, daily_inspection_required: dailyInspectionRequired, inspection_checklist: [] };
    const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown';
    try {
      if (id && existingPermit) {
        await updatePermit({ id, permit_number: permitNumber, status, location, work_description: workDescription, start_date: startDate, start_time: startTime, end_date: endDate, end_time: endTime, valid_hours: 8, ppe_required: selectedPPE, permit_data: permitData, loto_required: lotoRequired, loto_level: lotoRequired ? lotoLevel : null } as any);
      } else {
        await createPermit({ permit_number: permitNumber, permit_type: 'temporary_equipment', status, priority: 'medium', facility_id: null, location, department_code: null, department_name: null, work_description: workDescription, hazards_identified: guardrailsRequired ? ['falls'] : [], precautions_required: ['barriers', 'warning_signs'], ppe_required: selectedPPE, start_date: startDate, start_time: startTime, end_date: endDate, end_time: endTime, valid_hours: 8, requested_by: userName, requested_by_id: user?.id || null, requested_date: new Date().toISOString(), approved_by: null, approved_by_id: null, approved_date: null, supervisor_name: null, supervisor_id: null, contractor_name: null, contractor_company: null, emergency_contact: null, emergency_phone: null, workers: [], permit_data: permitData, completed_by: null, completed_by_id: null, completed_date: null, completion_notes: null, cancellation_reason: null, cancelled_by: null, cancelled_date: null, attachments: [], notes: null, loto_required: lotoRequired, loto_level: lotoRequired ? lotoLevel : null } as any);
      }
      Alert.alert('Success', 'Permit saved'); router.back();
    } catch (error: any) { Alert.alert('Error', error.message || 'Failed'); }
  }, [id, existingPermit, permitNumber, location, workDescription, startDate, startTime, endDate, endTime, equipmentType, equipmentDescription, equipmentLocation, installationDate, expectedRemovalDate, loadCapacity, actualLoad, inspectionCompleted, inspectionDate, inspectedBy, manufacturerGuidelinesFollowed, groundingRequired, groundingVerified, guardrailsRequired, guardrailsInstalled, accessRestrictions, warningSignsPosted, dailyInspectionRequired, selectedPPE, lotoRequired, lotoLevel, user, createPermit, updatePermit, router]);

  const handleDelete = useCallback(() => { if (!id) return; Alert.alert('Delete?', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await deletePermit(id); router.back(); } catch { Alert.alert('Error', 'Failed'); } } }]); }, [id, deletePermit, router]);

  const renderSectionHeader = (s: string, t: string, icon: React.ReactNode) => (
    <Pressable style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => toggleSection(s)}>
      <View style={styles.sectionHeaderLeft}>{icon}<Text style={[styles.sectionTitle, { color: colors.text }]}>{t}</Text></View>
      {expandedSections.has(s) ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
    </Pressable>
  );

  if (loadingPermit && id) return <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF640' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}><Wrench size={32} color="#8B5CF6" /></View>
          <Text style={[styles.title, { color: colors.text }]}>Temporary Equipment Permit</Text>
          <Text style={[styles.permitNumberText, { color: '#8B5CF6' }]}>{permitNumber}</Text>
        </View>

        <View style={[styles.warningCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
          <AlertTriangle size={20} color="#F59E0B" />
          <Text style={[styles.warningText, { color: colors.text }]}>Equipment must be inspected before use and daily during operation.</Text>
        </View>

        {renderSectionHeader('basic', 'Basic Information', <Clock size={20} color="#8B5CF6" />)}
        {expandedSections.has('basic') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Location *</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={location} onChangeText={setLocation} placeholder="Building, area" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Work Description *</Text><TextInput style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={workDescription} onChangeText={setWorkDescription} placeholder="Describe purpose..." placeholderTextColor={colors.textSecondary} multiline numberOfLines={3} /></View>
            <View style={styles.dateRow}><View style={styles.dateField}><Text style={[styles.label, { color: colors.text }]}>Start Date</Text><Pressable style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setShowDatePicker('start')}><Text style={[styles.dateText, { color: colors.text }]}>{startDate}</Text></Pressable></View><View style={styles.timeField}><Text style={[styles.label, { color: colors.text }]}>Time</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={startTime} onChangeText={setStartTime} placeholder="HH:MM" placeholderTextColor={colors.textSecondary} /></View></View>
          </View>
        )}

        {renderSectionHeader('equipment', 'Equipment Details', <Wrench size={20} color="#8B5CF6" />)}
        {expandedSections.has('equipment') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Equipment Type</Text>
              <View style={styles.typeGrid}>{EQUIPMENT_TYPES.map((t) => (<Pressable key={t.value} style={[styles.typeOption, { backgroundColor: equipmentType === t.value ? '#8B5CF615' : colors.background, borderColor: equipmentType === t.value ? '#8B5CF6' : colors.border }]} onPress={() => setEquipmentType(t.value)}><Text style={[styles.typeLabel, { color: equipmentType === t.value ? '#8B5CF6' : colors.text }]}>{t.label}</Text></Pressable>))}</View>
            </View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Equipment Description *</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={equipmentDescription} onChangeText={setEquipmentDescription} placeholder="Brand, model, size" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Equipment Location</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={equipmentLocation} onChangeText={setEquipmentLocation} placeholder="Specific installation location" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.rowInputs}><View style={styles.smallInput}><Text style={[styles.label, { color: colors.text }]}>Load Capacity</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={loadCapacity} onChangeText={setLoadCapacity} placeholder="500 lbs" placeholderTextColor={colors.textSecondary} /></View><View style={styles.smallInput}><Text style={[styles.label, { color: colors.text }]}>Actual Load</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={actualLoad} onChangeText={setActualLoad} placeholder="300 lbs" placeholderTextColor={colors.textSecondary} /></View></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Expected Removal Date</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={expectedRemovalDate} onChangeText={setExpectedRemovalDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} /></View>
          </View>
        )}

        {renderSectionHeader('inspection', 'Inspection & Safety', <ShieldAlert size={20} color="#8B5CF6" />)}
        {expandedSections.has('inspection') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Pre-Use Inspection Completed</Text><Switch value={inspectionCompleted} onValueChange={setInspectionCompleted} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            {inspectionCompleted && (<View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Inspected By</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={inspectedBy} onChangeText={setInspectedBy} placeholder="Inspector name" placeholderTextColor={colors.textSecondary} /></View>)}
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Manufacturer Guidelines Followed</Text><Switch value={manufacturerGuidelinesFollowed} onValueChange={setManufacturerGuidelinesFollowed} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Grounding Required</Text><Switch value={groundingRequired} onValueChange={setGroundingRequired} trackColor={{ false: colors.border, true: '#F59E0B' }} /></View>
            {groundingRequired && (<View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Grounding Verified</Text><Switch value={groundingVerified} onValueChange={setGroundingVerified} trackColor={{ false: colors.border, true: '#10B981' }} /></View>)}
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Guardrails Required</Text><Switch value={guardrailsRequired} onValueChange={setGuardrailsRequired} trackColor={{ false: colors.border, true: '#F59E0B' }} /></View>
            {guardrailsRequired && (<View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Guardrails Installed</Text><Switch value={guardrailsInstalled} onValueChange={setGuardrailsInstalled} trackColor={{ false: colors.border, true: '#10B981' }} /></View>)}
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Warning Signs Posted</Text><Switch value={warningSignsPosted} onValueChange={setWarningSignsPosted} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Daily Inspection Required</Text><Switch value={dailyInspectionRequired} onValueChange={setDailyInspectionRequired} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Access Restrictions</Text>
              <View style={styles.tagContainer}>{accessRestrictions.map((r, i) => (<View key={i} style={[styles.tag, { backgroundColor: '#8B5CF620' }]}><Text style={[styles.tagText, { color: '#8B5CF6' }]}>{r}</Text><Pressable onPress={() => setAccessRestrictions(prev => prev.filter((_, idx) => idx !== i))}><X size={14} color="#8B5CF6" /></Pressable></View>))}</View>
              <View style={styles.addItemRow}><TextInput style={[styles.addItemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={newRestriction} onChangeText={setNewRestriction} placeholder="Authorized personnel only" placeholderTextColor={colors.textSecondary} /><Pressable style={[styles.addItemBtn, { backgroundColor: '#8B5CF6' }]} onPress={addRestriction}><Plus size={18} color="#fff" /></Pressable></View>
            </View>
          </View>
        )}

        {renderSectionHeader('loto', 'LOTO Requirements', <ShieldAlert size={20} color="#DC2626" />)}
        {expandedSections.has('loto') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>LOTO Required</Text><Switch value={lotoRequired} onValueChange={setLotoRequired} trackColor={{ false: colors.border, true: '#DC2626' }} /></View>
            {lotoRequired && (<View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>LOTO Level</Text><View style={styles.lotoLevelContainer}>{Object.values(LOTO_LEVELS).map((l) => (<Pressable key={l.level} style={[styles.lotoLevelOption, { backgroundColor: lotoLevel === l.level ? l.color + '20' : colors.background, borderColor: lotoLevel === l.level ? l.color : colors.border }]} onPress={() => setLotoLevel(l.level)}><Text style={[styles.lotoLevelNumber, { color: lotoLevel === l.level ? l.color : colors.text }]}>{l.level}</Text></Pressable>))}</View></View>)}
          </View>
        )}

        {renderSectionHeader('ppe', 'PPE Requirements', <ShieldAlert size={20} color="#8B5CF6" />)}
        {expandedSections.has('ppe') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.ppeGrid}>{PPE_OPTIONS.map((p) => (<Pressable key={p.id} style={[styles.ppeOption, { backgroundColor: selectedPPE.includes(p.id) ? '#8B5CF615' : colors.background, borderColor: selectedPPE.includes(p.id) ? '#8B5CF6' : colors.border }]} onPress={() => togglePPE(p.id)}><View style={[styles.ppeCheckbox, { backgroundColor: selectedPPE.includes(p.id) ? '#8B5CF6' : 'transparent', borderColor: selectedPPE.includes(p.id) ? '#8B5CF6' : colors.border }]}>{selectedPPE.includes(p.id) && <CheckCircle2 size={12} color="#fff" />}</View><Text style={[styles.ppeLabel, { color: colors.text }]}>{p.label}</Text></Pressable>))}</View>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleSave('draft')} disabled={isCreating || isUpdating}><Save size={18} color={colors.text} /><Text style={[styles.saveBtnText, { color: colors.text }]}>Save Draft</Text></Pressable>
          <Pressable style={[styles.submitBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => handleSave('pending_approval')} disabled={isCreating || isUpdating}><CheckCircle2 size={18} color="#fff" /><Text style={styles.submitBtnText}>Submit</Text></Pressable>
        </View>
        {id && (<Pressable style={[styles.deleteBtn, { backgroundColor: '#EF444420' }]} onPress={handleDelete}><Trash2 size={18} color="#EF4444" /><Text style={[styles.deleteBtnText, { color: '#EF4444' }]}>Delete</Text></Pressable>)}
        <View style={styles.bottomPadding} />
      </ScrollView>
      {showDatePicker && (<DatePickerModal visible={true} date={new Date(showDatePicker === 'start' ? startDate : endDate)} onConfirm={(d) => { if (showDatePicker === 'start') setStartDate(d.toISOString().split('T')[0]); else setEndDate(d.toISOString().split('T')[0]); setShowDatePicker(null); }} onCancel={() => setShowDatePicker(null)} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, scrollView: { flex: 1 }, content: { padding: 16 }, loadingContainer: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  headerCard: { borderRadius: 16, padding: 24, alignItems: 'center' as const, borderWidth: 1, marginBottom: 16 }, iconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 16 }, title: { fontSize: 20, fontWeight: '700' as const, marginBottom: 8 }, permitNumberText: { fontSize: 14, fontWeight: '600' as const },
  warningCard: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16, gap: 12 }, warningText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 }, sectionHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 }, sectionTitle: { fontSize: 16, fontWeight: '600' as const }, sectionContent: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  inputGroup: { marginBottom: 16 }, label: { fontSize: 14, fontWeight: '500' as const, marginBottom: 8 }, input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 }, textArea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' as const },
  dateRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 16 }, dateField: { flex: 2 }, timeField: { flex: 1 }, dateInput: { borderWidth: 1, borderRadius: 10, padding: 12 }, dateText: { fontSize: 15 },
  rowInputs: { flexDirection: 'row' as const, gap: 12, marginBottom: 16 }, smallInput: { flex: 1 },
  typeGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 }, typeOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 }, typeLabel: { fontSize: 13, fontWeight: '500' as const },
  tagContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 8 }, tag: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 6 }, tagText: { fontSize: 13, fontWeight: '500' as const },
  addItemRow: { flexDirection: 'row' as const, gap: 8 }, addItemInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 }, addItemBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }, switchLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  lotoLevelContainer: { flexDirection: 'row' as const, gap: 8 }, lotoLevelOption: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const }, lotoLevelNumber: { fontSize: 18, fontWeight: '700' as const },
  ppeGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 }, ppeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, width: '48%', gap: 8 }, ppeCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const }, ppeLabel: { fontSize: 12, flex: 1 },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 8 }, saveBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 }, saveBtnText: { fontSize: 15, fontWeight: '600' as const }, submitBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, gap: 8 }, submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  deleteBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, marginTop: 12, gap: 8 }, deleteBtnText: { fontSize: 15, fontWeight: '600' as const }, bottomPadding: { height: 32 },
});
