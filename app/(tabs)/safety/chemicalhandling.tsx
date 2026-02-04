import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FlaskConical, Plus, X, Save, ChevronDown, ChevronUp, CheckCircle2, Clock, Trash2, ShieldAlert, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useSafetyPermits, usePermitById } from '@/hooks/useSafetyPermits';
import { useUser } from '@/contexts/UserContext';
import { ChemicalHandlingPermitData, ChemicalHazardClass } from '@/types/safety';
import { LOTO_LEVELS } from '@/constants/lotoProgram';
import DatePickerModal from '@/components/DatePickerModal';

const HAZARD_CLASSES: { value: ChemicalHazardClass; label: string; color: string }[] = [
  { value: 'flammable', label: 'Flammable', color: '#EF4444' },
  { value: 'corrosive', label: 'Corrosive', color: '#F97316' },
  { value: 'toxic', label: 'Toxic', color: '#7C3AED' },
  { value: 'oxidizer', label: 'Oxidizer', color: '#EAB308' },
  { value: 'reactive', label: 'Reactive', color: '#EC4899' },
  { value: 'compressed_gas', label: 'Compressed Gas', color: '#06B6D4' },
  { value: 'carcinogen', label: 'Carcinogen', color: '#DC2626' },
];

const PPE_OPTIONS = [
  { id: 'safety_glasses', label: 'Safety Glasses' },
  { id: 'face_shield', label: 'Face Shield' },
  { id: 'gloves_chemical', label: 'Chemical Gloves' },
  { id: 'gloves_nitrile', label: 'Nitrile Gloves' },
  { id: 'apron', label: 'Chemical Apron' },
  { id: 'coveralls', label: 'Coveralls' },
  { id: 'tyvek_suit', label: 'Tyvek Suit' },
  { id: 'respirator_half', label: 'Half-Face Respirator' },
  { id: 'respirator_full', label: 'Full-Face Respirator' },
  { id: 'safety_shoes', label: 'Safety Shoes' },
];

export default function ChemicalHandlingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useUser();
  
  const { createPermit, updatePermit, deletePermit, generatePermitNumber, isCreating, isUpdating, isDeleting } = useSafetyPermits('chemical_handling');
  const { data: existingPermit, isLoading: loadingPermit } = usePermitById(id);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'chemical', 'safety', 'loto', 'ppe']));
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  const [permitNumber, setPermitNumber] = useState('');
  const [location, setLocation] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('07:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('17:00');

  const [chemicalName, setChemicalName] = useState('');
  const [casNumber, setCasNumber] = useState('');
  const [sdsNumber, setSdsNumber] = useState('');
  const [sdsReviewed, setSdsReviewed] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('gallons');
  const [hazardClasses, setHazardClasses] = useState<ChemicalHazardClass[]>([]);
  const [handlingProcedure, setHandlingProcedure] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [storageRequirements, setStorageRequirements] = useState<string[]>([]);
  const [newStorageReq, setNewStorageReq] = useState('');
  const [incompatibleMaterials, setIncompatibleMaterials] = useState<string[]>([]);
  const [newIncompatible, setNewIncompatible] = useState('');

  const [ventilationRequired, setVentilationRequired] = useState(false);
  const [ventilationType, setVentilationType] = useState('');
  const [spillKitLocation, setSpillKitLocation] = useState('');
  const [spillProcedure, setSpillProcedure] = useState('');
  const [fireExtinguisherType, setFireExtinguisherType] = useState('');
  const [firstAidProcedures, setFirstAidProcedures] = useState('');
  const [emergencyShowerLocation, setEmergencyShowerLocation] = useState('');
  const [eyewashLocation, setEyewashLocation] = useState('');
  const [disposalMethod, setDisposalMethod] = useState('');

  const [lotoRequired, setLotoRequired] = useState(false);
  const [lotoLevel, setLotoLevel] = useState<number>(0);
  const [selectedPPE, setSelectedPPE] = useState<string[]>(['safety_glasses', 'gloves_chemical']);

  useEffect(() => { if (!id) setPermitNumber(generatePermitNumber('chemical_handling')); }, [id, generatePermitNumber]);

  useEffect(() => {
    if (existingPermit && existingPermit.permit_type === 'chemical_handling') {
      setPermitNumber(existingPermit.permit_number);
      setLocation(existingPermit.location || '');
      setWorkDescription(existingPermit.work_description);
      setStartDate(existingPermit.start_date);
      setSelectedPPE(existingPermit.ppe_required || []);
      setLotoRequired((existingPermit as any).loto_required || false);
      setLotoLevel((existingPermit as any).loto_level || 0);
      const pd = existingPermit.permit_data as ChemicalHandlingPermitData;
      if (pd) {
        setChemicalName(pd.chemical_name || '');
        setCasNumber(pd.chemical_cas_number || '');
        setSdsNumber(pd.sds_number || '');
        setSdsReviewed(pd.sds_reviewed ?? false);
        setQuantity(pd.quantity?.toString() || '');
        setQuantityUnit(pd.quantity_unit || 'gallons');
        setHazardClasses(pd.hazard_classes || []);
        setHandlingProcedure(pd.handling_procedure || '');
        setStorageLocation(pd.storage_location || '');
        setStorageRequirements(pd.storage_requirements || []);
        setIncompatibleMaterials(pd.incompatible_materials || []);
        setVentilationRequired(pd.ventilation_required ?? false);
        setVentilationType(pd.ventilation_type || '');
        setSpillKitLocation(pd.spill_kit_location || '');
        setSpillProcedure(pd.spill_procedure || '');
        setFireExtinguisherType(pd.fire_extinguisher_type || '');
        setFirstAidProcedures(pd.first_aid_procedures || '');
        setEmergencyShowerLocation(pd.emergency_shower_location || '');
        setEyewashLocation(pd.eyewash_location || '');
        setDisposalMethod(pd.disposal_method || '');
      }
    }
  }, [existingPermit]);

  const toggleSection = useCallback((s: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedSections(prev => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; }); }, []);
  const togglePPE = useCallback((p: string) => { setSelectedPPE(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]); }, []);
  const toggleHazardClass = useCallback((h: ChemicalHazardClass) => { setHazardClasses(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]); }, []);
  const addStorageReq = useCallback(() => { if (newStorageReq.trim()) { setStorageRequirements(prev => [...prev, newStorageReq.trim()]); setNewStorageReq(''); } }, [newStorageReq]);
  const addIncompatible = useCallback(() => { if (newIncompatible.trim()) { setIncompatibleMaterials(prev => [...prev, newIncompatible.trim()]); setNewIncompatible(''); } }, [newIncompatible]);

  const handleSave = useCallback(async (status: 'draft' | 'pending_approval') => {
    if (!workDescription.trim() || !chemicalName.trim()) { Alert.alert('Error', 'Work description and chemical name required'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permitData: ChemicalHandlingPermitData = { chemical_name: chemicalName, chemical_cas_number: casNumber, sds_number: sdsNumber, sds_reviewed: sdsReviewed, quantity: parseFloat(quantity) || 0, quantity_unit: quantityUnit, hazard_classes: hazardClasses, handling_procedure: handlingProcedure, storage_location: storageLocation, storage_requirements: storageRequirements, incompatible_materials: incompatibleMaterials, ppe_required: selectedPPE, ventilation_required: ventilationRequired, ventilation_type: ventilationType, spill_kit_location: spillKitLocation, spill_procedure: spillProcedure, fire_extinguisher_type: fireExtinguisherType, first_aid_procedures: firstAidProcedures, emergency_shower_location: emergencyShowerLocation, eyewash_location: eyewashLocation, disposal_method: disposalMethod, waste_classification: '' };
    const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown';
    try {
      if (id && existingPermit) {
        await updatePermit({ id, permit_number: permitNumber, status, location, work_description: workDescription, start_date: startDate, start_time: startTime, end_date: endDate, end_time: endTime, valid_hours: 8, ppe_required: selectedPPE, permit_data: permitData, loto_required: lotoRequired, loto_level: lotoRequired ? lotoLevel : null } as any);
      } else {
        await createPermit({ permit_number: permitNumber, permit_type: 'chemical_handling', status, priority: hazardClasses.includes('toxic') || hazardClasses.includes('carcinogen') ? 'critical' : 'high', facility_id: null, location, department_code: null, department_name: null, work_description: workDescription, hazards_identified: ['chemical_exposure'], precautions_required: ['spill_containment'], ppe_required: selectedPPE, start_date: startDate, start_time: startTime, end_date: endDate, end_time: endTime, valid_hours: 8, requested_by: userName, requested_by_id: user?.id || null, requested_date: new Date().toISOString(), approved_by: null, approved_by_id: null, approved_date: null, supervisor_name: null, supervisor_id: null, contractor_name: null, contractor_company: null, emergency_contact: null, emergency_phone: null, workers: [], permit_data: permitData, completed_by: null, completed_by_id: null, completed_date: null, completion_notes: null, cancellation_reason: null, cancelled_by: null, cancelled_date: null, attachments: [], notes: null, loto_required: lotoRequired, loto_level: lotoRequired ? lotoLevel : null } as any);
      }
      Alert.alert('Success', 'Permit saved'); router.back();
    } catch (error: any) { Alert.alert('Error', error.message || 'Failed'); }
  }, [id, existingPermit, permitNumber, location, workDescription, startDate, startTime, endDate, endTime, chemicalName, casNumber, sdsNumber, sdsReviewed, quantity, quantityUnit, hazardClasses, handlingProcedure, storageLocation, storageRequirements, incompatibleMaterials, ventilationRequired, ventilationType, spillKitLocation, spillProcedure, fireExtinguisherType, firstAidProcedures, emergencyShowerLocation, eyewashLocation, disposalMethod, selectedPPE, lotoRequired, lotoLevel, user, createPermit, updatePermit, router]);

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
        <View style={[styles.headerCard, { backgroundColor: '#EC489915', borderColor: '#EC489940' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#EC489920' }]}><FlaskConical size={32} color="#EC4899" /></View>
          <Text style={[styles.title, { color: colors.text }]}>Chemical Handling Permit</Text>
          <Text style={[styles.permitNumberText, { color: '#EC4899' }]}>{permitNumber}</Text>
        </View>

        <View style={[styles.warningCard, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={[styles.warningText, { color: colors.text }]}>Review SDS before handling. Know emergency procedures and spill response.</Text>
        </View>

        {renderSectionHeader('basic', 'Basic Information', <Clock size={20} color="#EC4899" />)}
        {expandedSections.has('basic') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Location *</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={location} onChangeText={setLocation} placeholder="Lab, storage area, etc." placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Work Description *</Text><TextInput style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={workDescription} onChangeText={setWorkDescription} placeholder="Describe chemical handling..." placeholderTextColor={colors.textSecondary} multiline numberOfLines={3} /></View>
            <View style={styles.dateRow}><View style={styles.dateField}><Text style={[styles.label, { color: colors.text }]}>Start Date</Text><Pressable style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setShowDatePicker('start')}><Text style={[styles.dateText, { color: colors.text }]}>{startDate}</Text></Pressable></View><View style={styles.timeField}><Text style={[styles.label, { color: colors.text }]}>Time</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={startTime} onChangeText={setStartTime} placeholder="HH:MM" placeholderTextColor={colors.textSecondary} /></View></View>
          </View>
        )}

        {renderSectionHeader('chemical', 'Chemical Information', <FlaskConical size={20} color="#EC4899" />)}
        {expandedSections.has('chemical') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Chemical Name *</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={chemicalName} onChangeText={setChemicalName} placeholder="Sulfuric Acid, Ammonia, etc." placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.rowInputs}><View style={styles.smallInput}><Text style={[styles.label, { color: colors.text }]}>CAS Number</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={casNumber} onChangeText={setCasNumber} placeholder="7664-93-9" placeholderTextColor={colors.textSecondary} /></View><View style={styles.smallInput}><Text style={[styles.label, { color: colors.text }]}>SDS Number</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={sdsNumber} onChangeText={setSdsNumber} placeholder="SDS-001" placeholderTextColor={colors.textSecondary} /></View></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>SDS Reviewed</Text><Switch value={sdsReviewed} onValueChange={setSdsReviewed} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.rowInputs}><View style={styles.smallInput}><Text style={[styles.label, { color: colors.text }]}>Quantity</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="5" placeholderTextColor={colors.textSecondary} /></View><View style={styles.smallInput}><Text style={[styles.label, { color: colors.text }]}>Unit</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={quantityUnit} onChangeText={setQuantityUnit} placeholder="gallons, liters" placeholderTextColor={colors.textSecondary} /></View></View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Hazard Classes</Text>
              <View style={styles.hazardGrid}>{HAZARD_CLASSES.map((h) => (<Pressable key={h.value} style={[styles.hazardChip, { backgroundColor: hazardClasses.includes(h.value) ? h.color + '20' : colors.background, borderColor: hazardClasses.includes(h.value) ? h.color : colors.border }]} onPress={() => toggleHazardClass(h.value)}><Text style={[styles.hazardChipText, { color: hazardClasses.includes(h.value) ? h.color : colors.text }]}>{h.label}</Text></Pressable>))}</View>
            </View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Handling Procedure</Text><TextInput style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={handlingProcedure} onChangeText={setHandlingProcedure} placeholder="Safe handling steps..." placeholderTextColor={colors.textSecondary} multiline numberOfLines={3} /></View>
          </View>
        )}

        {renderSectionHeader('safety', 'Safety & Emergency', <ShieldAlert size={20} color="#EC4899" />)}
        {expandedSections.has('safety') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Ventilation Required</Text><Switch value={ventilationRequired} onValueChange={setVentilationRequired} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            {ventilationRequired && (<View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Ventilation Type</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={ventilationType} onChangeText={setVentilationType} placeholder="Fume hood, local exhaust" placeholderTextColor={colors.textSecondary} /></View>)}
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Spill Kit Location</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={spillKitLocation} onChangeText={setSpillKitLocation} placeholder="Location of nearest spill kit" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Emergency Shower Location</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={emergencyShowerLocation} onChangeText={setEmergencyShowerLocation} placeholder="Nearest emergency shower" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Eyewash Location</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={eyewashLocation} onChangeText={setEyewashLocation} placeholder="Nearest eyewash station" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Disposal Method</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={disposalMethod} onChangeText={setDisposalMethod} placeholder="Hazardous waste pickup, neutralization" placeholderTextColor={colors.textSecondary} /></View>
          </View>
        )}

        {renderSectionHeader('loto', 'LOTO Requirements', <ShieldAlert size={20} color="#DC2626" />)}
        {expandedSections.has('loto') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>LOTO Required</Text><Switch value={lotoRequired} onValueChange={setLotoRequired} trackColor={{ false: colors.border, true: '#DC2626' }} /></View>
            {lotoRequired && (<View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>LOTO Level</Text><View style={styles.lotoLevelContainer}>{Object.values(LOTO_LEVELS).map((l) => (<Pressable key={l.level} style={[styles.lotoLevelOption, { backgroundColor: lotoLevel === l.level ? l.color + '20' : colors.background, borderColor: lotoLevel === l.level ? l.color : colors.border }]} onPress={() => setLotoLevel(l.level)}><Text style={[styles.lotoLevelNumber, { color: lotoLevel === l.level ? l.color : colors.text }]}>{l.level}</Text></Pressable>))}</View></View>)}
          </View>
        )}

        {renderSectionHeader('ppe', 'PPE Requirements', <ShieldAlert size={20} color="#EC4899" />)}
        {expandedSections.has('ppe') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.ppeGrid}>{PPE_OPTIONS.map((p) => (<Pressable key={p.id} style={[styles.ppeOption, { backgroundColor: selectedPPE.includes(p.id) ? '#EC489915' : colors.background, borderColor: selectedPPE.includes(p.id) ? '#EC4899' : colors.border }]} onPress={() => togglePPE(p.id)}><View style={[styles.ppeCheckbox, { backgroundColor: selectedPPE.includes(p.id) ? '#EC4899' : 'transparent', borderColor: selectedPPE.includes(p.id) ? '#EC4899' : colors.border }]}>{selectedPPE.includes(p.id) && <CheckCircle2 size={12} color="#fff" />}</View><Text style={[styles.ppeLabel, { color: colors.text }]}>{p.label}</Text></Pressable>))}</View>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleSave('draft')} disabled={isCreating || isUpdating}><Save size={18} color={colors.text} /><Text style={[styles.saveBtnText, { color: colors.text }]}>Save Draft</Text></Pressable>
          <Pressable style={[styles.submitBtn, { backgroundColor: '#EC4899' }]} onPress={() => handleSave('pending_approval')} disabled={isCreating || isUpdating}><CheckCircle2 size={18} color="#fff" /><Text style={styles.submitBtnText}>Submit</Text></Pressable>
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
  hazardGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 }, hazardChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 }, hazardChipText: { fontSize: 12, fontWeight: '500' as const },
  switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }, switchLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  lotoLevelContainer: { flexDirection: 'row' as const, gap: 8 }, lotoLevelOption: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const }, lotoLevelNumber: { fontSize: 18, fontWeight: '700' as const },
  ppeGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 }, ppeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, width: '48%', gap: 8 }, ppeCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const }, ppeLabel: { fontSize: 11, flex: 1 },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 8 }, saveBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 }, saveBtnText: { fontSize: 15, fontWeight: '600' as const }, submitBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, gap: 8 }, submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  deleteBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, marginTop: 12, gap: 8 }, deleteBtnText: { fontSize: 15, fontWeight: '600' as const }, bottomPadding: { height: 32 },
});
