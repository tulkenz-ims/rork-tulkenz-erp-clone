import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Home, Plus, X, Save, ChevronDown, ChevronUp, CheckCircle2, Clock, Trash2, ShieldAlert, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useSafetyPermits, usePermitById } from '@/hooks/useSafetyPermits';
import { useUser } from '@/contexts/UserContext';
import { RoofAccessPermitData, FallProtectionMethod } from '@/types/safety';
import { LOTO_LEVELS } from '@/constants/lotoProgram';
import DatePickerModal from '@/components/DatePickerModal';

const FALL_PROTECTION_METHODS: { value: FallProtectionMethod; label: string }[] = [
  { value: 'guardrails', label: 'Guardrails' },
  { value: 'personal_fall_arrest', label: 'Personal Fall Arrest' },
  { value: 'warning_line', label: 'Warning Line System' },
  { value: 'travel_restraint', label: 'Travel Restraint' },
];

const PPE_OPTIONS = [
  { id: 'hard_hat', label: 'Hard Hat (Chin Strap)' },
  { id: 'fall_harness', label: 'Full Body Harness' },
  { id: 'safety_glasses', label: 'Safety Glasses' },
  { id: 'safety_shoes', label: 'Safety Shoes' },
  { id: 'gloves', label: 'Work Gloves' },
  { id: 'high_visibility', label: 'High Visibility Vest' },
  { id: 'tool_lanyard', label: 'Tool Lanyards' },
];

export default function RoofAccessScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useUser();
  
  const { createPermit, updatePermit, deletePermit, generatePermitNumber, isCreating, isUpdating, isDeleting } = useSafetyPermits('roof_access');
  const { data: existingPermit, isLoading: loadingPermit } = usePermitById(id);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'roof', 'weather', 'loto', 'ppe']));
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  const [permitNumber, setPermitNumber] = useState('');
  const [location, setLocation] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('07:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('17:00');

  const [buildingName, setBuildingName] = useState('');
  const [roofLocation, setRoofLocation] = useState('');
  const [accessPoint, setAccessPoint] = useState('');
  const [roofType, setRoofType] = useState('');
  const [roofCondition, setRoofCondition] = useState('');
  const [fallHazards, setFallHazards] = useState<string[]>([]);
  const [newFallHazard, setNewFallHazard] = useState('');
  const [fallProtectionMethod, setFallProtectionMethod] = useState<FallProtectionMethod[]>(['personal_fall_arrest']);

  const [skylightsProtected, setSkylightsProtected] = useState(false);
  const [roofOpeningsProtected, setRoofOpeningsProtected] = useState(false);
  const [weatherAcceptable, setWeatherAcceptable] = useState(true);
  const [windSpeedMph, setWindSpeedMph] = useState('');
  const [maxWindAllowed, setMaxWindAllowed] = useState('25');
  const [wetConditions, setWetConditions] = useState(false);
  const [lightningRisk, setLightningRisk] = useState(false);
  const [materialsSecured, setMaterialsSecured] = useState(false);
  const [toolsTethered, setToolsTethered] = useState(false);
  const [emergencyRoute, setEmergencyRoute] = useState('');
  const [communicationMethod, setCommunicationMethod] = useState('');

  const [lotoRequired, setLotoRequired] = useState(false);
  const [lotoLevel, setLotoLevel] = useState<number>(0);
  const [selectedPPE, setSelectedPPE] = useState<string[]>(['hard_hat', 'fall_harness', 'safety_shoes']);

  useEffect(() => { if (!id) setPermitNumber(generatePermitNumber('roof_access')); }, [id, generatePermitNumber]);

  useEffect(() => {
    if (existingPermit && existingPermit.permit_type === 'roof_access') {
      setPermitNumber(existingPermit.permit_number);
      setLocation(existingPermit.location || '');
      setWorkDescription(existingPermit.work_description);
      setStartDate(existingPermit.start_date);
      setStartTime(existingPermit.start_time || '07:00');
      setEndDate(existingPermit.end_date || new Date().toISOString().split('T')[0]);
      setEndTime(existingPermit.end_time || '17:00');
      setSelectedPPE(existingPermit.ppe_required || []);
      setLotoRequired((existingPermit as any).loto_required || false);
      setLotoLevel((existingPermit as any).loto_level || 0);
      const pd = existingPermit.permit_data as RoofAccessPermitData;
      if (pd) {
        setBuildingName(pd.building_name || '');
        setRoofLocation(pd.roof_location || '');
        setAccessPoint(pd.access_point || '');
        setRoofType(pd.roof_type || '');
        setRoofCondition(pd.roof_condition || '');
        setFallHazards(pd.fall_hazards || []);
        setFallProtectionMethod(pd.fall_protection_method || ['personal_fall_arrest']);
        setSkylightsProtected(pd.skylights_protected ?? false);
        setRoofOpeningsProtected(pd.roof_openings_protected ?? false);
        setWeatherAcceptable(pd.weather_conditions_acceptable ?? true);
        setWindSpeedMph(pd.wind_speed_mph?.toString() || '');
        setMaxWindAllowed(pd.max_wind_speed_allowed?.toString() || '25');
        setWetConditions(pd.wet_conditions ?? false);
        setLightningRisk(pd.lightning_risk ?? false);
        setMaterialsSecured(pd.materials_secured ?? false);
        setToolsTethered(pd.tools_tethered ?? false);
        setEmergencyRoute(pd.emergency_access_route || '');
        setCommunicationMethod(pd.communication_method || '');
      }
    }
  }, [existingPermit]);

  const toggleSection = useCallback((s: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedSections(prev => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; }); }, []);
  const togglePPE = useCallback((p: string) => { setSelectedPPE(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]); }, []);
  const toggleFallProtection = useCallback((m: FallProtectionMethod) => { setFallProtectionMethod(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]); }, []);
  const addFallHazard = useCallback(() => { if (newFallHazard.trim()) { setFallHazards(prev => [...prev, newFallHazard.trim()]); setNewFallHazard(''); } }, [newFallHazard]);

  const handleSave = useCallback(async (status: 'draft' | 'pending_approval') => {
    if (!workDescription.trim() || !buildingName.trim()) { Alert.alert('Error', 'Work description and building name required'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permitData: RoofAccessPermitData = { building_name: buildingName, roof_location: roofLocation, access_point: accessPoint, work_description: workDescription, roof_type: roofType, roof_condition: roofCondition, fall_hazards: fallHazards, fall_protection_method: fallProtectionMethod, skylights_protected: skylightsProtected, roof_openings_protected: roofOpeningsProtected, weather_conditions_acceptable: weatherAcceptable, wind_speed_mph: parseFloat(windSpeedMph) || 0, max_wind_speed_allowed: parseFloat(maxWindAllowed) || 25, wet_conditions: wetConditions, lightning_risk: lightningRisk, materials_secured: materialsSecured, tools_tethered: toolsTethered, emergency_access_route: emergencyRoute, communication_method: communicationMethod };
    const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown';
    try {
      if (id && existingPermit) {
        await updatePermit({ id, permit_number: permitNumber, status, location, work_description: workDescription, start_date: startDate, start_time: startTime, end_date: endDate, end_time: endTime, valid_hours: 8, ppe_required: selectedPPE, permit_data: permitData, loto_required: lotoRequired, loto_level: lotoRequired ? lotoLevel : null } as any);
      } else {
        await createPermit({ permit_number: permitNumber, permit_type: 'roof_access', status, priority: 'high', facility_id: null, location, department_code: null, department_name: null, work_description: workDescription, hazards_identified: ['falls', ...fallHazards], precautions_required: ['fall_protection'], ppe_required: selectedPPE, start_date: startDate, start_time: startTime, end_date: endDate, end_time: endTime, valid_hours: 8, requested_by: userName, requested_by_id: user?.id || null, requested_date: new Date().toISOString(), approved_by: null, approved_by_id: null, approved_date: null, supervisor_name: null, supervisor_id: null, contractor_name: null, contractor_company: null, emergency_contact: null, emergency_phone: null, workers: [], permit_data: permitData, completed_by: null, completed_by_id: null, completed_date: null, completion_notes: null, cancellation_reason: null, cancelled_by: null, cancelled_date: null, attachments: [], notes: null, loto_required: lotoRequired, loto_level: lotoRequired ? lotoLevel : null } as any);
      }
      Alert.alert('Success', 'Permit saved'); router.back();
    } catch (error: any) { Alert.alert('Error', error.message || 'Failed'); }
  }, [id, existingPermit, permitNumber, location, workDescription, startDate, startTime, endDate, endTime, buildingName, roofLocation, accessPoint, roofType, roofCondition, fallHazards, fallProtectionMethod, skylightsProtected, roofOpeningsProtected, weatherAcceptable, windSpeedMph, maxWindAllowed, wetConditions, lightningRisk, materialsSecured, toolsTethered, emergencyRoute, communicationMethod, selectedPPE, lotoRequired, lotoLevel, user, createPermit, updatePermit, router]);

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
        <View style={[styles.headerCard, { backgroundColor: '#14B8A615', borderColor: '#14B8A640' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#14B8A620' }]}><Home size={32} color="#14B8A6" /></View>
          <Text style={[styles.title, { color: colors.text }]}>Roof Access Permit</Text>
          <Text style={[styles.permitNumberText, { color: '#14B8A6' }]}>{permitNumber}</Text>
        </View>

        <View style={[styles.warningCard, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={[styles.warningText, { color: colors.text }]}>Check weather conditions. Do not access roof during storms or high winds.</Text>
        </View>

        {renderSectionHeader('basic', 'Basic Information', <Clock size={20} color="#14B8A6" />)}
        {expandedSections.has('basic') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Building Name *</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={buildingName} onChangeText={setBuildingName} placeholder="Building A, Warehouse 2" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Work Description *</Text><TextInput style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={workDescription} onChangeText={setWorkDescription} placeholder="Describe work..." placeholderTextColor={colors.textSecondary} multiline numberOfLines={3} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Access Point</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={accessPoint} onChangeText={setAccessPoint} placeholder="Roof hatch, ladder, etc." placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.dateRow}><View style={styles.dateField}><Text style={[styles.label, { color: colors.text }]}>Start Date</Text><Pressable style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setShowDatePicker('start')}><Text style={[styles.dateText, { color: colors.text }]}>{startDate}</Text></Pressable></View><View style={styles.timeField}><Text style={[styles.label, { color: colors.text }]}>Start Time</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={startTime} onChangeText={setStartTime} placeholder="HH:MM" placeholderTextColor={colors.textSecondary} /></View></View>
            <View style={styles.dateRow}><View style={styles.dateField}><Text style={[styles.label, { color: colors.text }]}>End Date</Text><Pressable style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setShowDatePicker('end')}><Text style={[styles.dateText, { color: colors.text }]}>{endDate}</Text></Pressable></View><View style={styles.timeField}><Text style={[styles.label, { color: colors.text }]}>End Time</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={endTime} onChangeText={setEndTime} placeholder="HH:MM" placeholderTextColor={colors.textSecondary} /></View></View>
          </View>
        )}

        {renderSectionHeader('roof', 'Roof & Fall Protection', <Home size={20} color="#14B8A6" />)}
        {expandedSections.has('roof') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Roof Type</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={roofType} onChangeText={setRoofType} placeholder="Metal, membrane, built-up" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Roof Condition</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={roofCondition} onChangeText={setRoofCondition} placeholder="Good, needs repair, etc." placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Fall Hazards</Text>
              <View style={styles.tagContainer}>{fallHazards.map((h, i) => (<View key={i} style={[styles.tag, { backgroundColor: '#EF444420' }]}><Text style={[styles.tagText, { color: '#EF4444' }]}>{h}</Text><Pressable onPress={() => setFallHazards(prev => prev.filter((_, idx) => idx !== i))}><X size={14} color="#EF4444" /></Pressable></View>))}</View>
              <View style={styles.addItemRow}><TextInput style={[styles.addItemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={newFallHazard} onChangeText={setNewFallHazard} placeholder="Skylights, edges, openings..." placeholderTextColor={colors.textSecondary} /><Pressable style={[styles.addItemBtn, { backgroundColor: '#14B8A6' }]} onPress={addFallHazard}><Plus size={18} color="#fff" /></Pressable></View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Fall Protection Methods</Text>
              {FALL_PROTECTION_METHODS.map((m) => (<Pressable key={m.value} style={[styles.checkboxOption, { backgroundColor: fallProtectionMethod.includes(m.value) ? '#14B8A610' : 'transparent', borderColor: fallProtectionMethod.includes(m.value) ? '#14B8A6' : colors.border }]} onPress={() => toggleFallProtection(m.value)}><View style={[styles.checkbox, { backgroundColor: fallProtectionMethod.includes(m.value) ? '#14B8A6' : 'transparent', borderColor: fallProtectionMethod.includes(m.value) ? '#14B8A6' : colors.border }]}>{fallProtectionMethod.includes(m.value) && <CheckCircle2 size={12} color="#fff" />}</View><Text style={[styles.checkboxLabel, { color: colors.text }]}>{m.label}</Text></Pressable>))}
            </View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Skylights Protected/Guarded</Text><Switch value={skylightsProtected} onValueChange={setSkylightsProtected} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Roof Openings Protected</Text><Switch value={roofOpeningsProtected} onValueChange={setRoofOpeningsProtected} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Materials Secured</Text><Switch value={materialsSecured} onValueChange={setMaterialsSecured} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Tools Tethered</Text><Switch value={toolsTethered} onValueChange={setToolsTethered} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
          </View>
        )}

        {renderSectionHeader('weather', 'Weather & Safety', <AlertTriangle size={20} color="#14B8A6" />)}
        {expandedSections.has('weather') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Weather Conditions Acceptable</Text><Switch value={weatherAcceptable} onValueChange={setWeatherAcceptable} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.rowInputs}><View style={styles.smallInput}><Text style={[styles.label, { color: colors.text }]}>Wind Speed (mph)</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={windSpeedMph} onChangeText={setWindSpeedMph} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} /></View><View style={styles.smallInput}><Text style={[styles.label, { color: colors.text }]}>Max Allowed (mph)</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={maxWindAllowed} onChangeText={setMaxWindAllowed} keyboardType="numeric" placeholder="25" placeholderTextColor={colors.textSecondary} /></View></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Wet/Slippery Conditions</Text><Switch value={wetConditions} onValueChange={setWetConditions} trackColor={{ false: colors.border, true: '#F59E0B' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Lightning Risk</Text><Switch value={lightningRisk} onValueChange={setLightningRisk} trackColor={{ false: colors.border, true: '#EF4444' }} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Emergency Access Route</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={emergencyRoute} onChangeText={setEmergencyRoute} placeholder="Describe emergency exit" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>Communication Method</Text><TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={communicationMethod} onChangeText={setCommunicationMethod} placeholder="Radio, phone, etc." placeholderTextColor={colors.textSecondary} /></View>
          </View>
        )}

        {renderSectionHeader('loto', 'LOTO Requirements', <ShieldAlert size={20} color="#DC2626" />)}
        {expandedSections.has('loto') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>LOTO Required</Text><Switch value={lotoRequired} onValueChange={setLotoRequired} trackColor={{ false: colors.border, true: '#DC2626' }} /></View>
            {lotoRequired && (<View style={styles.inputGroup}><Text style={[styles.label, { color: colors.text }]}>LOTO Level</Text><View style={styles.lotoLevelContainer}>{Object.values(LOTO_LEVELS).map((l) => (<Pressable key={l.level} style={[styles.lotoLevelOption, { backgroundColor: lotoLevel === l.level ? l.color + '20' : colors.background, borderColor: lotoLevel === l.level ? l.color : colors.border }]} onPress={() => setLotoLevel(l.level)}><Text style={[styles.lotoLevelNumber, { color: lotoLevel === l.level ? l.color : colors.text }]}>{l.level}</Text></Pressable>))}</View></View>)}
          </View>
        )}

        {renderSectionHeader('ppe', 'PPE Requirements', <ShieldAlert size={20} color="#14B8A6" />)}
        {expandedSections.has('ppe') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.ppeGrid}>{PPE_OPTIONS.map((p) => (<Pressable key={p.id} style={[styles.ppeOption, { backgroundColor: selectedPPE.includes(p.id) ? '#14B8A615' : colors.background, borderColor: selectedPPE.includes(p.id) ? '#14B8A6' : colors.border }]} onPress={() => togglePPE(p.id)}><View style={[styles.ppeCheckbox, { backgroundColor: selectedPPE.includes(p.id) ? '#14B8A6' : 'transparent', borderColor: selectedPPE.includes(p.id) ? '#14B8A6' : colors.border }]}>{selectedPPE.includes(p.id) && <CheckCircle2 size={12} color="#fff" />}</View><Text style={[styles.ppeLabel, { color: colors.text }]}>{p.label}</Text></Pressable>))}</View>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleSave('draft')} disabled={isCreating || isUpdating}><Save size={18} color={colors.text} /><Text style={[styles.saveBtnText, { color: colors.text }]}>Save Draft</Text></Pressable>
        </View>
        <Pressable style={[styles.submitForApprovalBtn, { backgroundColor: '#14B8A6' }]} onPress={() => handleSave('pending_approval')} disabled={isCreating || isUpdating}><CheckCircle2 size={20} color="#fff" /><Text style={styles.submitForApprovalText}>Submit for Approval</Text></Pressable>
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
  checkboxOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 }, checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12 }, checkboxLabel: { fontSize: 14 },
  tagContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 8 }, tag: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 6 }, tagText: { fontSize: 13, fontWeight: '500' as const },
  addItemRow: { flexDirection: 'row' as const, gap: 8 }, addItemInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 }, addItemBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }, switchLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  lotoLevelContainer: { flexDirection: 'row' as const, gap: 8 }, lotoLevelOption: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const }, lotoLevelNumber: { fontSize: 18, fontWeight: '700' as const },
  ppeGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 }, ppeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, width: '48%', gap: 8 }, ppeCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const }, ppeLabel: { fontSize: 12, flex: 1 },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 8 }, saveBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 }, saveBtnText: { fontSize: 15, fontWeight: '600' as const }, submitForApprovalBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 16, borderRadius: 12, gap: 10, marginTop: 12 }, submitForApprovalText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  deleteBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, marginTop: 12, gap: 8 }, deleteBtnText: { fontSize: 15, fontWeight: '600' as const }, bottomPadding: { height: 32 },
});
