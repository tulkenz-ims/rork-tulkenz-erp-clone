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
  Zap,
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
import { ElectricalPermitData, VoltageClass, ElectricalWorkType } from '@/types/safety';
import { LOTO_LEVELS } from '@/constants/lotoProgram';
import DatePickerModal from '@/components/DatePickerModal';

const VOLTAGE_CLASSES: { value: VoltageClass; label: string; range: string }[] = [
  { value: 'low', label: 'Low Voltage', range: '≤ 600V' },
  { value: 'medium', label: 'Medium Voltage', range: '601V - 35kV' },
  { value: 'high', label: 'High Voltage', range: '35kV - 230kV' },
  { value: 'extra_high', label: 'Extra High Voltage', range: '> 230kV' },
];

const WORK_TYPES: { value: ElectricalWorkType; label: string }[] = [
  { value: 'de_energized', label: 'De-energized Work' },
  { value: 'energized', label: 'Energized Work (Live)' },
  { value: 'testing', label: 'Testing/Troubleshooting' },
  { value: 'troubleshooting', label: 'Diagnostics Only' },
];

const PPE_OPTIONS = [
  { id: 'arc_flash_suit', label: 'Arc Flash Suit' },
  { id: 'face_shield', label: 'Arc-Rated Face Shield' },
  { id: 'safety_glasses', label: 'Safety Glasses' },
  { id: 'gloves_insulated', label: 'Insulated Gloves' },
  { id: 'leather_protectors', label: 'Leather Protectors' },
  { id: 'hard_hat', label: 'Hard Hat (Non-conductive)' },
  { id: 'safety_shoes', label: 'Safety Shoes (EH Rated)' },
  { id: 'hearing_protection', label: 'Hearing Protection' },
  { id: 'arc_rated_clothing', label: 'Arc-Rated Clothing' },
];

export default function ElectricalSafeWorkScreen() {
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
  } = useSafetyPermits('electrical');
  
  const { data: existingPermit, isLoading: loadingPermit } = usePermitById(id);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'electrical', 'boundaries', 'loto', 'ppe'])
  );
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  const [permitNumber, setPermitNumber] = useState('');
  const [location, setLocation] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('07:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('17:00');

  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [voltageClass, setVoltageClass] = useState<VoltageClass>('low');
  const [voltageLevel, setVoltageLevel] = useState('');
  const [workType, setWorkType] = useState<ElectricalWorkType>('de_energized');
  
  const [arcFlashBoundary, setArcFlashBoundary] = useState('');
  const [limitedApproach, setLimitedApproach] = useState('');
  const [restrictedApproach, setRestrictedApproach] = useState('');
  const [prohibitedApproach, setProhibitedApproach] = useState('');
  const [ppeCategory, setPpeCategory] = useState('2');
  
  const [arcFlashSuitRequired, setArcFlashSuitRequired] = useState(false);
  const [faceShieldRequired, setFaceShieldRequired] = useState(true);
  const [insulatedGlovesClass, setInsulatedGlovesClass] = useState('00');
  const [insulatedToolsRequired, setInsulatedToolsRequired] = useState(false);
  const [voltageTestPerformed, setVoltageTestPerformed] = useState(false);
  const [voltageTestResult, setVoltageTestResult] = useState('');
  const [groundsInstalled, setGroundsInstalled] = useState(false);
  const [energizedWorkJustified, setEnergizedWorkJustified] = useState(false);
  const [energizedWorkJustification, setEnergizedWorkJustification] = useState('');

  const [lotoRequired, setLotoRequired] = useState(true);
  const [lotoLevel, setLotoLevel] = useState<number>(2);

  const [selectedPPE, setSelectedPPE] = useState<string[]>(['safety_glasses', 'gloves_insulated', 'hard_hat', 'safety_shoes']);

  useEffect(() => {
    if (!id) {
      setPermitNumber(generatePermitNumber('electrical'));
    }
  }, [id, generatePermitNumber]);

  useEffect(() => {
    if (existingPermit && existingPermit.permit_type === 'electrical') {
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

      const permitData = existingPermit.permit_data as ElectricalPermitData;
      if (permitData) {
        setEquipmentName(permitData.equipment_name || '');
        setEquipmentId(permitData.equipment_id || '');
        setVoltageClass(permitData.voltage_class || 'low');
        setVoltageLevel(permitData.voltage_level?.toString() || '');
        setWorkType(permitData.work_type || 'de_energized');
        setArcFlashBoundary(permitData.arc_flash_boundary_inches?.toString() || '');
        setLimitedApproach(permitData.limited_approach_inches?.toString() || '');
        setRestrictedApproach(permitData.restricted_approach_inches?.toString() || '');
        setProhibitedApproach(permitData.prohibited_approach_inches?.toString() || '');
        setPpeCategory(permitData.ppe_category?.toString() || '2');
        setArcFlashSuitRequired(permitData.arc_flash_suit_required ?? false);
        setFaceShieldRequired(permitData.face_shield_required ?? true);
        setInsulatedGlovesClass(permitData.insulated_gloves_class || '00');
        setInsulatedToolsRequired(permitData.insulated_tools_required ?? false);
        setVoltageTestPerformed(permitData.voltage_test_performed ?? false);
        setVoltageTestResult(permitData.voltage_test_result || '');
        setGroundsInstalled(permitData.grounds_installed ?? false);
        setEnergizedWorkJustified(permitData.energized_work_justified ?? false);
        setEnergizedWorkJustification(permitData.energized_work_justification || '');
      }
    }
  }, [existingPermit]);

  const toggleSection = useCallback((sectionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const togglePPE = useCallback((ppeId: string) => {
    setSelectedPPE(prev => 
      prev.includes(ppeId) ? prev.filter(p => p !== ppeId) : [...prev, ppeId]
    );
  }, []);

  const handleSave = useCallback(async (status: 'draft' | 'pending_approval') => {
    if (!workDescription.trim()) {
      Alert.alert('Error', 'Work description is required');
      return;
    }
    if (!equipmentName.trim()) {
      Alert.alert('Error', 'Equipment name is required');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const permitData: ElectricalPermitData = {
      equipment_name: equipmentName,
      equipment_id: equipmentId,
      voltage_class: voltageClass,
      voltage_level: parseInt(voltageLevel) || 0,
      work_type: workType,
      work_description: workDescription,
      arc_flash_boundary_inches: parseInt(arcFlashBoundary) || 0,
      limited_approach_inches: parseInt(limitedApproach) || 0,
      restricted_approach_inches: parseInt(restrictedApproach) || 0,
      prohibited_approach_inches: parseInt(prohibitedApproach) || 0,
      ppe_category: parseInt(ppeCategory) || 2,
      arc_flash_suit_required: arcFlashSuitRequired,
      face_shield_required: faceShieldRequired,
      insulated_gloves_class: insulatedGlovesClass,
      insulated_tools_required: insulatedToolsRequired,
      voltage_test_performed: voltageTestPerformed,
      voltage_test_result: voltageTestResult,
      grounds_installed: groundsInstalled,
      ground_locations: [],
      energized_work_justified: energizedWorkJustified,
      energized_work_justification: energizedWorkJustification,
      shock_hazard_analysis_completed: true,
      arc_flash_analysis_completed: true,
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
          permit_type: 'electrical',
          status,
          priority: 'high',
          facility_id: null,
          location,
          department_code: null,
          department_name: null,
          work_description: workDescription,
          hazards_identified: ['electrical_shock', 'arc_flash'],
          precautions_required: ['lockout_tagout', 'zero_energy'],
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
      console.error('[Electrical] Error saving permit:', error);
      Alert.alert('Error', error.message || 'Failed to save permit');
    }
  }, [
    id, existingPermit, permitNumber, location, workDescription, startDate, startTime,
    endDate, endTime, equipmentName, equipmentId, voltageClass, voltageLevel, workType,
    arcFlashBoundary, limitedApproach, restrictedApproach, prohibitedApproach, ppeCategory,
    arcFlashSuitRequired, faceShieldRequired, insulatedGlovesClass, insulatedToolsRequired,
    voltageTestPerformed, voltageTestResult, groundsInstalled, energizedWorkJustified,
    energizedWorkJustification, selectedPPE, lotoRequired, lotoLevel, user,
    createPermit, updatePermit, router
  ]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    Alert.alert('Delete Permit', 'Are you sure you want to delete this permit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePermit(id);
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete permit');
          }
        },
      },
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
      {expandedSections.has(sectionId) ? (
        <ChevronUp size={20} color={colors.textSecondary} />
      ) : (
        <ChevronDown size={20} color={colors.textSecondary} />
      )}
    </Pressable>
  );

  if (loadingPermit && id) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, { backgroundColor: '#EAB30815', borderColor: '#EAB30840' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#EAB30820' }]}>
            <Zap size={32} color="#EAB308" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Electrical Safe Work Permit</Text>
          <Text style={[styles.permitNumberText, { color: '#EAB308' }]}>{permitNumber}</Text>
        </View>

        <View style={[styles.warningCard, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={[styles.warningText, { color: colors.text }]}>
            Arc flash and shock hazard analysis must be completed before work begins.
          </Text>
        </View>

        {renderSectionHeader('basic', 'Basic Information', <Clock size={20} color="#EAB308" />)}
        {expandedSections.has('basic') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Location *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={location}
                onChangeText={setLocation}
                placeholder="MCC, Panel, Equipment location"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Work Description *</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={workDescription}
                onChangeText={setWorkDescription}
                placeholder="Describe the electrical work..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.label, { color: colors.text }]}>Start Date</Text>
                <Pressable
                  style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => setShowDatePicker('start')}
                >
                  <Text style={[styles.dateText, { color: colors.text }]}>{startDate}</Text>
                </Pressable>
              </View>
              <View style={styles.timeField}>
                <Text style={[styles.label, { color: colors.text }]}>Time</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
          </View>
        )}

        {renderSectionHeader('electrical', 'Electrical Details', <Zap size={20} color="#EAB308" />)}
        {expandedSections.has('electrical') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Equipment Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={equipmentName}
                onChangeText={setEquipmentName}
                placeholder="MCC-1A, Panel LP-3, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Equipment ID</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={equipmentId}
                onChangeText={setEquipmentId}
                placeholder="Asset tag or ID number"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Voltage Class</Text>
              <View style={styles.optionGrid}>
                {VOLTAGE_CLASSES.map((vc) => (
                  <Pressable
                    key={vc.value}
                    style={[
                      styles.optionCard,
                      { 
                        backgroundColor: voltageClass === vc.value ? '#EAB30815' : colors.background,
                        borderColor: voltageClass === vc.value ? '#EAB308' : colors.border,
                      },
                    ]}
                    onPress={() => setVoltageClass(vc.value)}
                  >
                    <Text style={[styles.optionLabel, { color: voltageClass === vc.value ? '#EAB308' : colors.text }]}>
                      {vc.label}
                    </Text>
                    <Text style={[styles.optionSublabel, { color: colors.textSecondary }]}>{vc.range}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Voltage Level (V)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={voltageLevel}
                onChangeText={setVoltageLevel}
                placeholder="480"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Work Type</Text>
              {WORK_TYPES.map((wt) => (
                <Pressable
                  key={wt.value}
                  style={[
                    styles.radioOption,
                    { 
                      backgroundColor: workType === wt.value ? '#EAB30810' : 'transparent',
                      borderColor: workType === wt.value ? '#EAB308' : colors.border,
                    },
                  ]}
                  onPress={() => setWorkType(wt.value)}
                >
                  <View style={[styles.radioCircle, { borderColor: workType === wt.value ? '#EAB308' : colors.border }]}>
                    {workType === wt.value && <View style={[styles.radioSelected, { backgroundColor: '#EAB308' }]} />}
                  </View>
                  <Text style={[styles.radioLabel, { color: colors.text }]}>{wt.label}</Text>
                </Pressable>
              ))}
            </View>

            {workType === 'energized' && (
              <>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Energized Work Justified</Text>
                  <Switch
                    value={energizedWorkJustified}
                    onValueChange={setEnergizedWorkJustified}
                    trackColor={{ false: colors.border, true: '#EAB308' }}
                  />
                </View>
                {energizedWorkJustified && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Justification</Text>
                    <TextInput
                      style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={energizedWorkJustification}
                      onChangeText={setEnergizedWorkJustification}
                      placeholder="Why de-energizing is not feasible..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                    />
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {renderSectionHeader('boundaries', 'Approach Boundaries', <ShieldAlert size={20} color="#EAB308" />)}
        {expandedSections.has('boundaries') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Arc Flash Boundary (inches)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={arcFlashBoundary}
                onChangeText={setArcFlashBoundary}
                placeholder="From arc flash label"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>PPE Category</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={ppeCategory}
                onChangeText={setPpeCategory}
                placeholder="1, 2, 3, or 4"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Insulated Gloves Class</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={insulatedGlovesClass}
                onChangeText={setInsulatedGlovesClass}
                placeholder="00, 0, 1, 2, 3, 4"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Voltage Test Performed (LOTO)</Text>
              <Switch
                value={voltageTestPerformed}
                onValueChange={setVoltageTestPerformed}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Safety Grounds Installed</Text>
              <Switch
                value={groundsInstalled}
                onValueChange={setGroundsInstalled}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>
          </View>
        )}

        {renderSectionHeader('loto', 'LOTO Requirements', <ShieldAlert size={20} color="#DC2626" />)}
        {expandedSections.has('loto') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>LOTO Required</Text>
              <Switch
                value={lotoRequired}
                onValueChange={setLotoRequired}
                trackColor={{ false: colors.border, true: '#DC2626' }}
              />
            </View>
            {lotoRequired && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>LOTO Level (0-5)</Text>
                <View style={styles.lotoLevelContainer}>
                  {Object.values(LOTO_LEVELS).map((level) => (
                    <Pressable
                      key={level.level}
                      style={[
                        styles.lotoLevelOption,
                        { 
                          backgroundColor: lotoLevel === level.level ? level.color + '20' : colors.background,
                          borderColor: lotoLevel === level.level ? level.color : colors.border,
                        },
                      ]}
                      onPress={() => setLotoLevel(level.level)}
                    >
                      <Text style={[styles.lotoLevelNumber, { color: lotoLevel === level.level ? level.color : colors.text }]}>
                        {level.level}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {renderSectionHeader('ppe', 'PPE Requirements', <ShieldAlert size={20} color="#EAB308" />)}
        {expandedSections.has('ppe') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.ppeGrid}>
              {PPE_OPTIONS.map((ppe) => (
                <Pressable
                  key={ppe.id}
                  style={[
                    styles.ppeOption,
                    { 
                      backgroundColor: selectedPPE.includes(ppe.id) ? '#EAB30815' : colors.background,
                      borderColor: selectedPPE.includes(ppe.id) ? '#EAB308' : colors.border,
                    },
                  ]}
                  onPress={() => togglePPE(ppe.id)}
                >
                  <View style={[
                    styles.ppeCheckbox,
                    { 
                      backgroundColor: selectedPPE.includes(ppe.id) ? '#EAB308' : 'transparent',
                      borderColor: selectedPPE.includes(ppe.id) ? '#EAB308' : colors.border,
                    },
                  ]}>
                    {selectedPPE.includes(ppe.id) && <CheckCircle2 size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.ppeLabel, { color: colors.text }]}>{ppe.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleSave('draft')}
            disabled={isCreating || isUpdating}
          >
            <Save size={18} color={colors.text} />
            <Text style={[styles.saveBtnText, { color: colors.text }]}>Save Draft</Text>
          </Pressable>
          <Pressable
            style={[styles.submitBtn, { backgroundColor: '#EAB308' }]}
            onPress={() => handleSave('pending_approval')}
            disabled={isCreating || isUpdating}
          >
            <CheckCircle2 size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Submit</Text>
          </Pressable>
        </View>

        {id && (
          <Pressable style={[styles.deleteBtn, { backgroundColor: '#EF444420' }]} onPress={handleDelete}>
            <Trash2 size={18} color="#EF4444" />
            <Text style={[styles.deleteBtnText, { color: '#EF4444' }]}>Delete Permit</Text>
          </Pressable>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {showDatePicker && (
        <DatePickerModal
          visible={true}
          date={new Date(showDatePicker === 'start' ? startDate : endDate)}
          onConfirm={(date) => {
            const dateStr = date.toISOString().split('T')[0];
            if (showDatePicker === 'start') setStartDate(dateStr);
            else setEndDate(dateStr);
            setShowDatePicker(null);
          }}
          onCancel={() => setShowDatePicker(null)}
        />
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
  optionGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  optionCard: { width: '48%', padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  optionLabel: { fontSize: 13, fontWeight: '600' as const },
  optionSublabel: { fontSize: 11, marginTop: 2 },
  radioOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12 },
  radioSelected: { width: 10, height: 10, borderRadius: 5 },
  radioLabel: { fontSize: 14 },
  switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  switchLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  lotoLevelContainer: { flexDirection: 'row' as const, gap: 8 },
  lotoLevelOption: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  lotoLevelNumber: { fontSize: 18, fontWeight: '700' as const },
  ppeGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  ppeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, width: '48%', gap: 8 },
  ppeCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  ppeLabel: { fontSize: 11, flex: 1 },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 8 },
  saveBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '600' as const },
  submitBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, gap: 8 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  deleteBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 14, borderRadius: 12, marginTop: 12, gap: 8 },
  deleteBtnText: { fontSize: 15, fontWeight: '600' as const },
  bottomPadding: { height: 32 },
});
