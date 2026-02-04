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
  Link2,
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
  Droplets,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useSafetyPermits, usePermitById } from '@/hooks/useSafetyPermits';
import { useUser } from '@/contexts/UserContext';
import { LineBreakPermitData, LineContent } from '@/types/safety';
import { LOTO_LEVELS } from '@/constants/lotoProgram';
import DatePickerModal from '@/components/DatePickerModal';

const LINE_CONTENTS: { value: LineContent; label: string; color: string }[] = [
  { value: 'water', label: 'Water', color: '#3B82F6' },
  { value: 'steam', label: 'Steam', color: '#EF4444' },
  { value: 'chemicals', label: 'Chemicals', color: '#EC4899' },
  { value: 'compressed_air', label: 'Compressed Air', color: '#0EA5E9' },
  { value: 'natural_gas', label: 'Natural Gas', color: '#F97316' },
  { value: 'oil', label: 'Oil/Lubricants', color: '#78716C' },
  { value: 'refrigerant', label: 'Refrigerant', color: '#06B6D4' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

const PPE_OPTIONS = [
  { id: 'face_shield', label: 'Face Shield' },
  { id: 'safety_glasses', label: 'Safety Glasses' },
  { id: 'gloves_chemical', label: 'Chemical Gloves' },
  { id: 'gloves_leather', label: 'Leather Gloves' },
  { id: 'coveralls', label: 'Coveralls' },
  { id: 'tyvek_suit', label: 'Tyvek Suit' },
  { id: 'apron', label: 'Chemical Apron' },
  { id: 'respirator', label: 'Respirator' },
  { id: 'hard_hat', label: 'Hard Hat' },
  { id: 'safety_shoes', label: 'Safety Shoes' },
];

export default function LineBreakScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useUser();
  
  const {
    createPermit,
    updatePermit,
    deletePermit,
    generatePermitNumber,
    isCreating,
    isUpdating,
    isDeleting,
  } = useSafetyPermits('line_break');
  
  const { data: existingPermit, isLoading: loadingPermit } = usePermitById(id);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'line', 'isolation', 'loto', 'ppe'])
  );
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  const [permitNumber, setPermitNumber] = useState('');
  const [location, setLocation] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('07:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('17:00');

  const [lineDescription, setLineDescription] = useState('');
  const [lineLocation, setLineLocation] = useState('');
  const [lineContent, setLineContent] = useState<LineContent>('water');
  const [lineContentOther, setLineContentOther] = useState('');
  const [lineSizeInches, setLineSizeInches] = useState('');
  const [linePressurePsi, setLinePressurePsi] = useState('');
  const [lineTemperatureF, setLineTemperatureF] = useState('');

  const [isolationPoints, setIsolationPoints] = useState<string[]>([]);
  const [newIsolationPoint, setNewIsolationPoint] = useState('');
  const [drainPoints, setDrainPoints] = useState<string[]>([]);
  const [newDrainPoint, setNewDrainPoint] = useState('');
  
  const [lineFlushed, setLineFlushed] = useState(false);
  const [lineDepressurized, setLineDepressurized] = useState(false);
  const [lineDrained, setLineDrained] = useState(false);
  const [lineVented, setLineVented] = useState(false);
  const [blindInstalled, setBlindInstalled] = useState(false);
  const [blindLocation, setBlindLocation] = useState('');
  
  const [hazardousMaterial, setHazardousMaterial] = useState(false);
  const [sdsReviewed, setSdsReviewed] = useState(false);
  const [spillContainment, setSpillContainment] = useState(false);
  const [containmentMethod, setContainmentMethod] = useState('');
  const [respiratoryRequired, setRespiratoryRequired] = useState(false);
  const [respiratoryType, setRespiratoryType] = useState('');

  const [lotoRequired, setLotoRequired] = useState(true);
  const [lotoLevel, setLotoLevel] = useState<number>(2);

  const [selectedPPE, setSelectedPPE] = useState<string[]>(['face_shield', 'gloves_chemical', 'safety_glasses']);

  useEffect(() => {
    if (!id) {
      setPermitNumber(generatePermitNumber('line_break'));
    }
  }, [id, generatePermitNumber]);

  useEffect(() => {
    if (existingPermit && existingPermit.permit_type === 'line_break') {
      setPermitNumber(existingPermit.permit_number);
      setLocation(existingPermit.location || '');
      setWorkDescription(existingPermit.work_description);
      setStartDate(existingPermit.start_date);
      setStartTime(existingPermit.start_time || '07:00');
      setEndDate(existingPermit.end_date);
      setEndTime(existingPermit.end_time || '17:00');
      setSelectedPPE(existingPermit.ppe_required || []);
      setLotoRequired((existingPermit as any).loto_required ?? true);
      setLotoLevel((existingPermit as any).loto_level || 2);

      const permitData = existingPermit.permit_data as LineBreakPermitData;
      if (permitData) {
        setLineDescription(permitData.line_description || '');
        setLineLocation(permitData.line_location || '');
        setLineContent(permitData.line_content || 'water');
        setLineContentOther(permitData.line_content_other || '');
        setLineSizeInches(permitData.line_size_inches?.toString() || '');
        setLinePressurePsi(permitData.line_pressure_psi?.toString() || '');
        setLineTemperatureF(permitData.line_temperature_f?.toString() || '');
        setIsolationPoints(permitData.isolation_points || []);
        setDrainPoints(permitData.drain_points || []);
        setLineFlushed(permitData.line_flushed ?? false);
        setLineDepressurized(permitData.line_depressurized ?? false);
        setLineDrained(permitData.line_drained ?? false);
        setLineVented(permitData.line_vented ?? false);
        setBlindInstalled(permitData.blind_installed ?? false);
        setBlindLocation(permitData.blind_location || '');
        setHazardousMaterial(permitData.hazardous_material ?? false);
        setSdsReviewed(permitData.sds_reviewed ?? false);
        setSpillContainment(permitData.spill_containment ?? false);
        setContainmentMethod(permitData.containment_method || '');
        setRespiratoryRequired(permitData.respiratory_required ?? false);
        setRespiratoryType(permitData.respiratory_type || '');
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

  const addIsolationPoint = useCallback(() => {
    if (newIsolationPoint.trim()) {
      setIsolationPoints(prev => [...prev, newIsolationPoint.trim()]);
      setNewIsolationPoint('');
    }
  }, [newIsolationPoint]);

  const addDrainPoint = useCallback(() => {
    if (newDrainPoint.trim()) {
      setDrainPoints(prev => [...prev, newDrainPoint.trim()]);
      setNewDrainPoint('');
    }
  }, [newDrainPoint]);

  const handleSave = useCallback(async (status: 'draft' | 'pending_approval') => {
    if (!workDescription.trim()) {
      Alert.alert('Error', 'Work description is required');
      return;
    }
    if (!lineDescription.trim()) {
      Alert.alert('Error', 'Line description is required');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const permitData: LineBreakPermitData = {
      line_description: lineDescription,
      line_location: lineLocation,
      line_content: lineContent,
      line_content_other: lineContentOther,
      line_size_inches: parseFloat(lineSizeInches) || 0,
      line_pressure_psi: parseFloat(linePressurePsi) || 0,
      line_temperature_f: parseFloat(lineTemperatureF) || 0,
      isolation_points: isolationPoints,
      drain_points: drainPoints,
      vent_points: [],
      line_flushed: lineFlushed,
      line_depressurized: lineDepressurized,
      line_drained: lineDrained,
      line_vented: lineVented,
      blind_installed: blindInstalled,
      blind_location: blindLocation,
      hazardous_material: hazardousMaterial,
      sds_reviewed: sdsReviewed,
      spill_containment: spillContainment,
      containment_method: containmentMethod,
      respiratory_required: respiratoryRequired,
      respiratory_type: respiratoryType,
    };

    const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown';

    try {
      if (id && existingPermit) {
        await updatePermit({
          id,
          permit_number: permitNumber,
          status,
          location,
          work_description: workDescription,
          start_date: startDate,
          start_time: startTime,
          end_date: endDate,
          end_time: endTime,
          valid_hours: 8,
          ppe_required: selectedPPE,
          permit_data: permitData,
          loto_required: lotoRequired,
          loto_level: lotoRequired ? lotoLevel : null,
        } as any);
        Alert.alert('Success', 'Permit updated successfully');
      } else {
        await createPermit({
          permit_number: permitNumber,
          permit_type: 'line_break',
          status,
          priority: 'high',
          facility_id: null,
          location,
          department_code: null,
          department_name: null,
          work_description: workDescription,
          hazards_identified: hazardousMaterial ? ['chemical_exposure'] : [],
          precautions_required: ['line_isolated', 'spill_containment'],
          ppe_required: selectedPPE,
          start_date: startDate,
          start_time: startTime,
          end_date: endDate,
          end_time: endTime,
          valid_hours: 8,
          requested_by: userName,
          requested_by_id: user?.id || null,
          requested_date: new Date().toISOString(),
          approved_by: null,
          approved_by_id: null,
          approved_date: null,
          supervisor_name: null,
          supervisor_id: null,
          contractor_name: null,
          contractor_company: null,
          emergency_contact: null,
          emergency_phone: null,
          workers: [],
          permit_data: permitData,
          completed_by: null,
          completed_by_id: null,
          completed_date: null,
          completion_notes: null,
          cancellation_reason: null,
          cancelled_by: null,
          cancelled_date: null,
          attachments: [],
          notes: null,
          loto_required: lotoRequired,
          loto_level: lotoRequired ? lotoLevel : null,
        } as any);
        Alert.alert('Success', 'Permit created successfully');
      }
      router.back();
    } catch (error: any) {
      console.error('[LineBreak] Error saving permit:', error);
      Alert.alert('Error', error.message || 'Failed to save permit');
    }
  }, [
    id, existingPermit, permitNumber, location, workDescription, startDate, startTime,
    endDate, endTime, lineDescription, lineLocation, lineContent, lineContentOther,
    lineSizeInches, linePressurePsi, lineTemperatureF, isolationPoints, drainPoints,
    lineFlushed, lineDepressurized, lineDrained, lineVented, blindInstalled, blindLocation,
    hazardousMaterial, sdsReviewed, spillContainment, containmentMethod, respiratoryRequired,
    respiratoryType, selectedPPE, lotoRequired, lotoLevel, user, createPermit, updatePermit, router
  ]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    Alert.alert('Delete Permit', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deletePermit(id); router.back(); } catch { Alert.alert('Error', 'Failed'); }
      }},
    ]);
  }, [id, deletePermit, router]);

  const renderSectionHeader = (sectionId: string, title: string, icon: React.ReactNode) => (
    <Pressable
      style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => toggleSection(sectionId)}
    >
      <View style={styles.sectionHeaderLeft}>
        {icon}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {expandedSections.has(sectionId) ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
    </Pressable>
  );

  if (loadingPermit && id) {
    return <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, { backgroundColor: '#6366F115', borderColor: '#6366F140' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#6366F120' }]}>
            <Link2 size={32} color="#6366F1" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Line Break Permit</Text>
          <Text style={[styles.permitNumberText, { color: '#6366F1' }]}>{permitNumber}</Text>
        </View>

        <View style={[styles.warningCard, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={[styles.warningText, { color: colors.text }]}>
            Ensure line is isolated, drained, depressurized, and verified before breaking.
          </Text>
        </View>

        {renderSectionHeader('basic', 'Basic Information', <Clock size={20} color="#6366F1" />)}
        {expandedSections.has('basic') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Location *</Text>
              <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={location} onChangeText={setLocation} placeholder="Pipe rack, building, area" placeholderTextColor={colors.textSecondary} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Work Description *</Text>
              <TextInput style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={workDescription} onChangeText={setWorkDescription} placeholder="Describe work..." placeholderTextColor={colors.textSecondary} multiline numberOfLines={3} />
            </View>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.label, { color: colors.text }]}>Start Date</Text>
                <Pressable style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setShowDatePicker('start')}>
                  <Text style={[styles.dateText, { color: colors.text }]}>{startDate}</Text>
                </Pressable>
              </View>
              <View style={styles.timeField}>
                <Text style={[styles.label, { color: colors.text }]}>Time</Text>
                <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={startTime} onChangeText={setStartTime} placeholder="HH:MM" placeholderTextColor={colors.textSecondary} />
              </View>
            </View>
          </View>
        )}

        {renderSectionHeader('line', 'Line Information', <Droplets size={20} color="#6366F1" />)}
        {expandedSections.has('line') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Line Description *</Text>
              <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={lineDescription} onChangeText={setLineDescription} placeholder="4 inch Steam Line to HX-101" placeholderTextColor={colors.textSecondary} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Line Contents</Text>
              <View style={styles.contentGrid}>
                {LINE_CONTENTS.map((lc) => (
                  <Pressable key={lc.value} style={[styles.contentOption, { backgroundColor: lineContent === lc.value ? lc.color + '20' : colors.background, borderColor: lineContent === lc.value ? lc.color : colors.border }]} onPress={() => setLineContent(lc.value)}>
                    <Text style={[styles.contentLabel, { color: lineContent === lc.value ? lc.color : colors.text }]}>{lc.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.rowInputs}>
              <View style={styles.smallInput}>
                <Text style={[styles.label, { color: colors.text }]}>Size (in)</Text>
                <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={lineSizeInches} onChangeText={setLineSizeInches} keyboardType="numeric" placeholder="4" placeholderTextColor={colors.textSecondary} />
              </View>
              <View style={styles.smallInput}>
                <Text style={[styles.label, { color: colors.text }]}>Pressure (PSI)</Text>
                <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={linePressurePsi} onChangeText={setLinePressurePsi} keyboardType="numeric" placeholder="150" placeholderTextColor={colors.textSecondary} />
              </View>
              <View style={styles.smallInput}>
                <Text style={[styles.label, { color: colors.text }]}>Temp (°F)</Text>
                <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={lineTemperatureF} onChangeText={setLineTemperatureF} keyboardType="numeric" placeholder="350" placeholderTextColor={colors.textSecondary} />
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Hazardous Material</Text>
              <Switch value={hazardousMaterial} onValueChange={setHazardousMaterial} trackColor={{ false: colors.border, true: '#EF4444' }} />
            </View>
            {hazardousMaterial && (
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>SDS Reviewed</Text>
                <Switch value={sdsReviewed} onValueChange={setSdsReviewed} trackColor={{ false: colors.border, true: '#10B981' }} />
              </View>
            )}
          </View>
        )}

        {renderSectionHeader('isolation', 'Isolation & Verification', <ShieldAlert size={20} color="#6366F1" />)}
        {expandedSections.has('isolation') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Isolation Points</Text>
              <View style={styles.tagContainer}>
                {isolationPoints.map((point, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: '#6366F120' }]}>
                    <Text style={[styles.tagText, { color: '#6366F1' }]}>{point}</Text>
                    <Pressable onPress={() => setIsolationPoints(prev => prev.filter((_, i) => i !== index))}><X size={14} color="#6366F1" /></Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.addItemRow}>
                <TextInput style={[styles.addItemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={newIsolationPoint} onChangeText={setNewIsolationPoint} placeholder="Valve V-101, etc." placeholderTextColor={colors.textSecondary} />
                <Pressable style={[styles.addItemBtn, { backgroundColor: '#6366F1' }]} onPress={addIsolationPoint}><Plus size={18} color="#fff" /></Pressable>
              </View>
            </View>

            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Line Depressurized</Text><Switch value={lineDepressurized} onValueChange={setLineDepressurized} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Line Drained</Text><Switch value={lineDrained} onValueChange={setLineDrained} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Line Vented</Text><Switch value={lineVented} onValueChange={setLineVented} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Line Flushed</Text><Switch value={lineFlushed} onValueChange={setLineFlushed} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Blind/Blank Installed</Text><Switch value={blindInstalled} onValueChange={setBlindInstalled} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
            {blindInstalled && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Blind Location</Text>
                <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={blindLocation} onChangeText={setBlindLocation} placeholder="Location of installed blind" placeholderTextColor={colors.textSecondary} />
              </View>
            )}
            <View style={styles.switchRow}><Text style={[styles.switchLabel, { color: colors.text }]}>Spill Containment in Place</Text><Switch value={spillContainment} onValueChange={setSpillContainment} trackColor={{ false: colors.border, true: '#10B981' }} /></View>
          </View>
        )}

        {renderSectionHeader('loto', 'LOTO Requirements', <ShieldAlert size={20} color="#DC2626" />)}
        {expandedSections.has('loto') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>LOTO Required</Text>
              <Switch value={lotoRequired} onValueChange={setLotoRequired} trackColor={{ false: colors.border, true: '#DC2626' }} />
            </View>
            {lotoRequired && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>LOTO Level (0-5)</Text>
                <View style={styles.lotoLevelContainer}>
                  {Object.values(LOTO_LEVELS).map((level) => (
                    <Pressable key={level.level} style={[styles.lotoLevelOption, { backgroundColor: lotoLevel === level.level ? level.color + '20' : colors.background, borderColor: lotoLevel === level.level ? level.color : colors.border }]} onPress={() => setLotoLevel(level.level)}>
                      <Text style={[styles.lotoLevelNumber, { color: lotoLevel === level.level ? level.color : colors.text }]}>{level.level}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {renderSectionHeader('ppe', 'PPE Requirements', <ShieldAlert size={20} color="#6366F1" />)}
        {expandedSections.has('ppe') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.ppeGrid}>
              {PPE_OPTIONS.map((ppe) => (
                <Pressable key={ppe.id} style={[styles.ppeOption, { backgroundColor: selectedPPE.includes(ppe.id) ? '#6366F115' : colors.background, borderColor: selectedPPE.includes(ppe.id) ? '#6366F1' : colors.border }]} onPress={() => togglePPE(ppe.id)}>
                  <View style={[styles.ppeCheckbox, { backgroundColor: selectedPPE.includes(ppe.id) ? '#6366F1' : 'transparent', borderColor: selectedPPE.includes(ppe.id) ? '#6366F1' : colors.border }]}>
                    {selectedPPE.includes(ppe.id) && <CheckCircle2 size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.ppeLabel, { color: colors.text }]}>{ppe.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleSave('draft')} disabled={isCreating || isUpdating}>
            <Save size={18} color={colors.text} /><Text style={[styles.saveBtnText, { color: colors.text }]}>Save Draft</Text>
          </Pressable>
          <Pressable style={[styles.submitBtn, { backgroundColor: '#6366F1' }]} onPress={() => handleSave('pending_approval')} disabled={isCreating || isUpdating}>
            <CheckCircle2 size={18} color="#fff" /><Text style={styles.submitBtnText}>Submit</Text>
          </Pressable>
        </View>

        {id && (
          <Pressable style={[styles.deleteBtn, { backgroundColor: '#EF444420' }]} onPress={handleDelete}>
            <Trash2 size={18} color="#EF4444" /><Text style={[styles.deleteBtnText, { color: '#EF4444' }]}>Delete Permit</Text>
          </Pressable>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {showDatePicker && (
        <DatePickerModal visible={true} date={new Date(showDatePicker === 'start' ? startDate : endDate)} onConfirm={(date) => { if (showDatePicker === 'start') setStartDate(date.toISOString().split('T')[0]); else setEndDate(date.toISOString().split('T')[0]); setShowDatePicker(null); }} onCancel={() => setShowDatePicker(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  loadingContainer: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  headerCard: { borderRadius: 16, padding: 24, alignItems: 'center' as const, borderWidth: 1, marginBottom: 16 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700' as const, marginBottom: 8 },
  permitNumberText: { fontSize: 14, fontWeight: '600' as const },
  warningCard: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16, gap: 12 },
  warningText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  sectionHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const },
  sectionContent: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500' as const, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' as const },
  dateRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 16 },
  dateField: { flex: 2 },
  timeField: { flex: 1 },
  dateInput: { borderWidth: 1, borderRadius: 10, padding: 12 },
  dateText: { fontSize: 15 },
  contentGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  contentOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  contentLabel: { fontSize: 13, fontWeight: '500' as const },
  rowInputs: { flexDirection: 'row' as const, gap: 12 },
  smallInput: { flex: 1 },
  tagContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 8 },
  tag: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 6 },
  tagText: { fontSize: 13, fontWeight: '500' as const },
  addItemRow: { flexDirection: 'row' as const, gap: 8 },
  addItemInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  addItemBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  switchLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  lotoLevelContainer: { flexDirection: 'row' as const, gap: 8 },
  lotoLevelOption: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  lotoLevelNumber: { fontSize: 18, fontWeight: '700' as const },
  ppeGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  ppeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, width: '48%', gap: 8 },
  ppeCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  ppeLabel: { fontSize: 12, flex: 1 },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 8 },
  saveBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '600' as const },
  submitBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, gap: 8 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  deleteBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, marginTop: 12, gap: 8 },
  deleteBtnText: { fontSize: 15, fontWeight: '600' as const },
  bottomPadding: { height: 32 },
});
