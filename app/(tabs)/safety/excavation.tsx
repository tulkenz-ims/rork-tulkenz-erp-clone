import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Shovel,
  Plus,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Trash2,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useSafetyPermits, usePermitById } from '@/hooks/useSafetyPermits';
import { useUser } from '@/contexts/UserContext';
import { ExcavationPermitData, SoilClassification, ShoringMethod } from '@/types/safety';
import { LOTO_LEVELS } from '@/constants/lotoProgram';
import DatePickerModal from '@/components/DatePickerModal';

const SOIL_CLASSES: { value: SoilClassification; label: string; description: string }[] = [
  { value: 'stable_rock', label: 'Stable Rock', description: 'Natural solid mineral matter' },
  { value: 'type_a', label: 'Type A', description: 'Clay, silty clay, sandy clay (unconfined compressive strength ≥ 1.5 tsf)' },
  { value: 'type_b', label: 'Type B', description: 'Silt, sandy loam, medium clay (0.5-1.5 tsf)' },
  { value: 'type_c', label: 'Type C', description: 'Gravel, sand, submerged soil (< 0.5 tsf)' },
];

const SHORING_METHODS: { value: ShoringMethod; label: string }[] = [
  { value: 'sloping', label: 'Sloping' },
  { value: 'benching', label: 'Benching' },
  { value: 'shoring', label: 'Shoring/Shielding' },
  { value: 'shielding', label: 'Trench Box' },
  { value: 'none_required', label: 'None Required (< 4 ft)' },
];

const PPE_OPTIONS = [
  { id: 'hard_hat', label: 'Hard Hat' },
  { id: 'safety_glasses', label: 'Safety Glasses' },
  { id: 'high_visibility', label: 'High Visibility Vest' },
  { id: 'safety_shoes', label: 'Safety Shoes' },
  { id: 'gloves', label: 'Work Gloves' },
  { id: 'hearing_protection', label: 'Hearing Protection' },
];

export default function ExcavationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useUser();
  
  const { createPermit, updatePermit, deletePermit, generatePermitNumber, isCreating, isUpdating, isDeleting } = useSafetyPermits('excavation');
  const { data: existingPermit, isLoading: loadingPermit } = usePermitById(id);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'excavation', 'protection', 'loto', 'ppe']));
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  const [permitNumber, setPermitNumber] = useState('');
  const [location, setLocation] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('07:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('17:00');

  const [excavationLocation, setExcavationLocation] = useState('');
  const [excavationPurpose, setExcavationPurpose] = useState('');
  const [depthFeet, setDepthFeet] = useState('');
  const [widthFeet, setWidthFeet] = useState('');
  const [lengthFeet, setLengthFeet] = useState('');
  const [soilClassification, setSoilClassification] = useState<SoilClassification>('type_b');
  const [soilTestedBy, setSoilTestedBy] = useState('');
  const [shoringMethod, setShoringMethod] = useState<ShoringMethod>('shoring');
  
  const [utilitiesMarked, setUtilitiesMarked] = useState(false);
  const [utilityTicketNumber, setUtilityTicketNumber] = useState('');
  const [utilitiesPresent, setUtilitiesPresent] = useState<string[]>([]);
  const [newUtility, setNewUtility] = useState('');
  
  const [waterAccumulationControls, setWaterAccumulationControls] = useState(false);
  const [trafficControlRequired, setTrafficControlRequired] = useState(false);
  const [atmosphericTestingRequired, setAtmosphericTestingRequired] = useState(false);
  const [protectiveSystemInspected, setProtectiveSystemInspected] = useState(false);
  const [spoilPileDistance, setSpoilPileDistance] = useState('2');

  const [lotoRequired, setLotoRequired] = useState(false);
  const [lotoLevel, setLotoLevel] = useState<number>(0);
  const [selectedPPE, setSelectedPPE] = useState<string[]>(['hard_hat', 'safety_glasses', 'high_visibility', 'safety_shoes']);

  useEffect(() => {
    if (!id) setPermitNumber(generatePermitNumber('excavation'));
  }, [id, generatePermitNumber]);

  useEffect(() => {
    if (existingPermit && existingPermit.permit_type === 'excavation') {
      setPermitNumber(existingPermit.permit_number);
      setLocation(existingPermit.location || '');
      setWorkDescription(existingPermit.work_description);
      setStartDate(existingPermit.start_date);
      setStartTime(existingPermit.start_time || '07:00');
      setEndDate(existingPermit.end_date);
      setEndTime(existingPermit.end_time || '17:00');
      setSelectedPPE(existingPermit.ppe_required || []);
      setLotoRequired((existingPermit as any).loto_required || false);
      setLotoLevel((existingPermit as any).loto_level || 0);

      const permitData = existingPermit.permit_data as ExcavationPermitData;
      if (permitData) {
        setExcavationLocation(permitData.excavation_location || '');
        setExcavationPurpose(permitData.excavation_purpose || '');
        setDepthFeet(permitData.excavation_depth_feet?.toString() || '');
        setWidthFeet(permitData.excavation_width_feet?.toString() || '');
        setLengthFeet(permitData.excavation_length_feet?.toString() || '');
        setSoilClassification(permitData.soil_classification || 'type_b');
        setSoilTestedBy(permitData.soil_tested_by || '');
        setShoringMethod(permitData.shoring_method || 'shoring');
        setUtilitiesMarked(permitData.underground_utilities_marked ?? false);
        setUtilityTicketNumber(permitData.utility_locate_ticket_number || '');
        setUtilitiesPresent(permitData.utilities_present || []);
        setWaterAccumulationControls(permitData.water_accumulation_controls ?? false);
        setTrafficControlRequired(permitData.traffic_control_required ?? false);
        setAtmosphericTestingRequired(permitData.atmospheric_testing_required ?? false);
        setProtectiveSystemInspected(permitData.protective_system_inspected ?? false);
        setSpoilPileDistance(permitData.spoil_pile_distance_feet?.toString() || '2');
      }
    }
  }, [existingPermit]);

  const toggleSection = useCallback((sectionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) newSet.delete(sectionId);
      else newSet.add(sectionId);
      return newSet;
    });
  }, []);

  const togglePPE = useCallback((ppeId: string) => {
    setSelectedPPE(prev => prev.includes(ppeId) ? prev.filter(p => p !== ppeId) : [...prev, ppeId]);
  }, []);

  const addUtility = useCallback(() => {
    if (newUtility.trim()) {
      setUtilitiesPresent(prev => [...prev, newUtility.trim()]);
      setNewUtility('');
    }
  }, [newUtility]);

  const handleSave = useCallback(async (status: 'draft' | 'pending_approval') => {
    if (!workDescription.trim() || !depthFeet.trim()) {
      Alert.alert('Error', 'Work description and depth are required');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const permitData: ExcavationPermitData = {
      excavation_location: excavationLocation,
      excavation_purpose: excavationPurpose,
      excavation_depth_feet: parseFloat(depthFeet) || 0,
      excavation_width_feet: parseFloat(widthFeet) || 0,
      excavation_length_feet: parseFloat(lengthFeet) || 0,
      soil_classification: soilClassification,
      soil_tested_by: soilTestedBy,
      soil_test_date: startDate,
      shoring_method: shoringMethod,
      underground_utilities_marked: utilitiesMarked,
      utility_locate_ticket_number: utilityTicketNumber,
      utilities_present: utilitiesPresent,
      water_accumulation_controls: waterAccumulationControls,
      access_egress_points: [],
      spoil_pile_distance_feet: parseFloat(spoilPileDistance) || 2,
      traffic_control_required: trafficControlRequired,
      atmospheric_testing_required: atmosphericTestingRequired,
      protective_system_inspected: protectiveSystemInspected,
      inspection_frequency: 'Daily and after rain events',
    };

    const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown';

    try {
      if (id && existingPermit) {
        await updatePermit({ id, permit_number: permitNumber, status, location, work_description: workDescription, start_date: startDate, start_time: startTime, end_date: endDate, end_time: endTime, valid_hours: 8, ppe_required: selectedPPE, permit_data: permitData, loto_required: lotoRequired, loto_level: lotoRequired ? lotoLevel : null } as any);
        Alert.alert('Success', 'Permit updated');
      } else {
        await createPermit({ permit_number: permitNumber, permit_type: 'excavation', status, priority: 'high', facility_id: null, location, department_code: null, department_name: null, work_description: workDescription, hazards_identified: ['excavation_collapse', 'falling_objects'], precautions_required: ['barriers'], ppe_required: selectedPPE, start_date: startDate, start_time: startTime, end_date: endDate, end_time: endTime, valid_hours: 8, requested_by: userName, requested_by_id: user?.id || null, requested_date: new Date().toISOString(), approved_by: null, approved_by_id: null, approved_date: null, supervisor_name: null, supervisor_id: null, contractor_name: null, contractor_company: null, emergency_contact: null, emergency_phone: null, workers: [], permit_data: permitData, completed_by: null, completed_by_id: null, completed_date: null, completion_notes: null, cancellation_reason: null, cancelled_by: null, cancelled_date: null, attachments: [], notes: null, loto_required: lotoRequired, loto_level: lotoRequired ? lotoLevel : null } as any);
        Alert.alert('Success', 'Permit created');
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save permit');
    }
  }, [id, existingPermit, permitNumber, location, workDescription, startDate, startTime, endDate, endTime, excavationLocation, excavationPurpose, depthFeet, widthFeet, lengthFeet, soilClassification, soilTestedBy, shoringMethod, utilitiesMarked, utilityTicketNumber, utilitiesPresent, waterAccumulationControls, trafficControlRequired, atmosphericTestingRequired, protectiveSystemInspected, spoilPileDistance, selectedPPE, lotoRequired, lotoLevel, user, createPermit, updatePermit, router]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    Alert.alert('Delete Permit', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await deletePermit(id); router.back(); } catch { Alert.alert('Error', 'Failed'); } } }]);
  }, [id, deletePermit, router]);

  const renderSectionHeader = (sectionId: string, title: string, icon: React.ReactNode) => (
    <Pressable style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => toggleSection(sectionId)}>
      <View style={styles.sectionHeaderLeft}>{icon}<Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text></View>
      {expandedSections.has(sectionId) ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
    </Pressable>
  );

  if (loadingPermit && id) return <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, { backgroundColor: '#84CC1615', borderColor: '#84CC1640' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#84CC1620' }]}><Shovel size={32} color="#84CC16" /></View>
          <Text style={[styles.title, { color: colors.text }]}>Excavation Permit</Text>
          <Text style={[styles.permitNumberText, { color: '#84CC16' }]}>{permitNumber}</Text>
        </View>

        <View style={[styles.warningCard, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={[styles.warningText, { color: colors.text }]}>Call 811 before you dig. Underground utilities must be located.</Text>
        </View>

        {renderSectionHeader('basic', 'Basic Information', <Clock size={20} color="#84CC16" />)}
        {expandedSections.has('basic') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Location *</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={location} onChangeText={setLocation} placeholder="Excavation area" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Work Description *</Text><TextInput style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={workDescription} onChangeText={setWorkDescription} placeholder="Purpose of excavation..." placeholderTextColor={colors.textSecondary} multiline numberOfLines={3} /></View>
            <View style={styles.dateRow}>
              <View style={styles.dateField}><Text style={[styles.label, { color: colors.text }]}>Start Date</Text><Pressable style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setShowDatePicker('start')}><Text style={[styles.dateText, { color: colors.text }]}>{startDate}</Text></Pressable></View>
              <View style={styles.timeField}><Text style={[styles.label, { color: colors.text }]}>Time</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={startTime} onChangeText={setStartTime} placeholder="HH:MM" placeholderTextColor={colors.textSecondary} /></View>
            </View>
          </View>
        )}

        {renderSectionHeader('excavation', 'Excavation Details', <Shovel size={20} color="#84CC16" />)}
        {expandedSections.has('excavation') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowInputs}>
              <View style={styles.smallInput}><Text style={[styles.label, { color: colors.text }]}>Depth (ft) *</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={depthFeet} onChangeText={setDepthFeet} keyboardType="numeric" placeholder="6" placeholderTextColor={colors.textSecondary} /></View>
              <View style={styles.smallInput}><Text style={[styles.label, { color: colors.text }]}>Width (ft)</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={widthFeet} onChangeText={setWidthFeet} keyboardType="numeric" placeholder="4" placeholderTextColor={colors.textSecondary} /></View>
              <View style={styles.smallInput}><Text style={[styles.label, { color: colors.text }]}>Length (ft)</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={lengthFeet} onChangeText={setLengthFeet} keyboardType="numeric" placeholder="20" placeholderTextColor={colors.textSecondary} /></View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Soil Classification</Text>
              {SOIL_CLASSES.map((sc) => (
                <Pressable key={sc.value} style={[styles.radioOption, { backgroundColor: soilClassification === sc.value ? '#84CC1610' : 'transparent', borderColor: soilClassification === sc.value ? '#84CC16' : colors.border }]} onPress={() => setSoilClassification(sc.value)}>
                  <View style={[styles.radioCircle, { borderColor: soilClassification === sc.value ? '#84CC16' : colors.border }]}>{soilClassification === sc.value && <View style={[styles.radioSelected, { backgroundColor: '#84CC16' }]} />}</View>
                  <View style={{ flex: 1 }}><Text style={[styles.radioLabel, { color: colors.text }]}>{sc.label}</Text><Text style={[styles.radioDesc, { color: colors.textSecondary }]}>{sc.description}</Text></View>
                </Pressable>
              ))}
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Shoring Method</Text>
              <View style={styles.optionGrid}>
                {SHORING_METHODS.map((sm) => (
                  <Pressable key={sm.value} style={[styles.optionCard, { backgroundColor: shoringMethod === sm.value ? '#84CC1615' : colors.background, borderColor: shoringMethod === sm.value ? '#84CC16' : colors.border }]} onPress={() => setShoringMethod(sm.value)}>
                    <Text style={[styles.optionLabel, { color: shoringMethod === sm.value ? '#84CC16' : colors.text }]}>{sm.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {renderSectionHeader('protection', 'Utilities & Protection', <ShieldAlert size={20} color="#84CC16" />)}
        {expandedSections.has('protection') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Underground Utilities Located (811)</Text><Switch value={utilitiesMarked} onValueChange={setUtilitiesMarked} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            {utilitiesMarked && (
              <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Utility Locate Ticket #</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={utilityTicketNumber} onChangeText={setUtilityTicketNumber} placeholder="Ticket number" placeholderTextColor={colors.textSecondary} /></View>
            )}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Utilities Present</Text>
              <View style={styles.tagContainer}>
                {utilitiesPresent.map((u, i) => (<View key={i} style={[styles.tag, { backgroundColor: '#84CC1620' }]}><Text style={[styles.tagText, { color: '#84CC16' }]}>{u}</Text><Pressable onPress={() => setUtilitiesPresent(prev => prev.filter((_, idx) => idx !== i))}><X size={14} color="#84CC16" /></Pressable></View>))}
              </View>
              <View style={styles.addItemRow}><TextInput style={[styles.addItemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={newUtility} onChangeText={setNewUtility} placeholder="Gas, Electric, Water, etc." placeholderTextColor={colors.textSecondary} /><Pressable style={[styles.addItemBtn, { backgroundColor: '#84CC16' }]} onPress={addUtility}><Plus size={18} color="#fff" /></Pressable></View>
            </View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Water Accumulation Controls</Text><Switch value={waterAccumulationControls} onValueChange={setWaterAccumulationControls} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Traffic Control Required</Text><Switch value={trafficControlRequired} onValueChange={setTrafficControlRequired} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Protective System Inspected</Text><Switch value={protectiveSystemInspected} onValueChange={setProtectiveSystemInspected} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Spoil Pile Distance (ft from edge)</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={spoilPileDistance} onChangeText={setSpoilPileDistance} keyboardType="numeric" placeholder="2" placeholderTextColor={colors.textSecondary} /></View>
          </View>
        )}

        {renderSectionHeader('loto', 'LOTO Requirements', <ShieldAlert size={20} color="#DC2626" />)}
        {expandedSections.has('loto') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>LOTO Required</Text><Switch value={lotoRequired} onValueChange={setLotoRequired} trackColor={{ false: colors.border, true: '#DC2626' }} /></View>
            {lotoRequired && (
              <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>LOTO Level</Text>
                <View style={styles.lotoLevelContainer}>{Object.values(LOTO_LEVELS).map((level) => (<Pressable key={level.level} style={[styles.lotoLevelOption, { backgroundColor: lotoLevel === level.level ? level.color + '20' : colors.background, borderColor: lotoLevel === level.level ? level.color : colors.border }]} onPress={() => setLotoLevel(level.level)}><Text style={[styles.lotoLevelNumber, { color: lotoLevel === level.level ? level.color : colors.text }]}>{level.level}</Text></Pressable>))}</View>
              </View>
            )}
          </View>
        )}

        {renderSectionHeader('ppe', 'PPE Requirements', <ShieldAlert size={20} color="#84CC16" />)}
        {expandedSections.has('ppe') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.ppeGrid}>{PPE_OPTIONS.map((ppe) => (<Pressable key={ppe.id} style={[styles.ppeOption, { backgroundColor: selectedPPE.includes(ppe.id) ? '#84CC1615' : colors.background, borderColor: selectedPPE.includes(ppe.id) ? '#84CC16' : colors.border }]} onPress={() => togglePPE(ppe.id)}><View style={[styles.ppeCheckbox, { backgroundColor: selectedPPE.includes(ppe.id) ? '#84CC16' : 'transparent', borderColor: selectedPPE.includes(ppe.id) ? '#84CC16' : colors.border }]}>{selectedPPE.includes(ppe.id) && <CheckCircle2 size={12} color="#fff" />}</View><Text style={[styles.ppeLabel, { color: colors.text }]}>{ppe.label}</Text></Pressable>))}</View>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleSave('draft')} disabled={isCreating || isUpdating}><Save size={18} color={colors.text} /><Text style={[styles.saveBtnText, { color: colors.text }]}>Save Draft</Text></Pressable>
          <Pressable style={[styles.submitBtn, { backgroundColor: '#84CC16' }]} onPress={() => handleSave('pending_approval')} disabled={isCreating || isUpdating}><CheckCircle2 size={18} color="#fff" /><Text style={styles.submitBtnText}>Submit</Text></Pressable>
        </View>

        {id && (<Pressable style={[styles.deleteBtn, { backgroundColor: '#EF444420' }]} onPress={handleDelete}><Trash2 size={18} color="#EF4444" /><Text style={[styles.deleteBtnText, { color: '#EF4444' }]}>Delete Permit</Text></Pressable>)}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {showDatePicker && (<DatePickerModal visible={true} date={new Date(showDatePicker === 'start' ? startDate : endDate)} onConfirm={(date) => { if (showDatePicker === 'start') setStartDate(date.toISOString().split('T')[0]); else setEndDate(date.toISOString().split('T')[0]); setShowDatePicker(null); }} onCancel={() => setShowDatePicker(null)} />)}
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
  radioOption: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 }, radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12, marginTop: 2 }, radioSelected: { width: 10, height: 10, borderRadius: 5 }, radioLabel: { fontSize: 14, fontWeight: '600' as const }, radioDesc: { fontSize: 11, marginTop: 2 },
  optionGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 }, optionCard: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 }, optionLabel: { fontSize: 13, fontWeight: '500' as const },
  tagContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 8 }, tag: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 6 }, tagText: { fontSize: 13, fontWeight: '500' as const },
  addItemRow: { flexDirection: 'row' as const, gap: 8 }, addItemInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 }, addItemBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }, switchLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  lotoLevelContainer: { flexDirection: 'row' as const, gap: 8 }, lotoLevelOption: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const }, lotoLevelNumber: { fontSize: 18, fontWeight: '700' as const },
  ppeGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 }, ppeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, width: '48%', gap: 8 }, ppeCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const }, ppeLabel: { fontSize: 12, flex: 1 },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 8 }, saveBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 }, saveBtnText: { fontSize: 15, fontWeight: '600' as const }, submitBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, gap: 8 }, submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  deleteBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, marginTop: 12, gap: 8 }, deleteBtnText: { fontSize: 15, fontWeight: '600' as const }, bottomPadding: { height: 32 },
});
