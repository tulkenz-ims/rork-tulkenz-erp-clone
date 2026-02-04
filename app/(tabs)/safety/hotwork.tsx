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
  Flame,
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
  Eye,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useSafetyPermits, usePermitById } from '@/hooks/useSafetyPermits';
import { useUser } from '@/contexts/UserContext';
import { HotWorkPermitData, HotWorkType } from '@/types/safety';
import { LOTO_LEVELS } from '@/constants/lotoProgram';
import DatePickerModal from '@/components/DatePickerModal';

const HOT_WORK_TYPES: { value: HotWorkType; label: string }[] = [
  { value: 'welding', label: 'Welding' },
  { value: 'cutting', label: 'Cutting (Torch)' },
  { value: 'brazing', label: 'Brazing' },
  { value: 'soldering', label: 'Soldering' },
  { value: 'grinding', label: 'Grinding' },
  { value: 'burning', label: 'Burning/Open Flame' },
  { value: 'other', label: 'Other Spark-Producing' },
];

const PPE_OPTIONS = [
  { id: 'welding_helmet', label: 'Welding Helmet' },
  { id: 'face_shield', label: 'Face Shield' },
  { id: 'safety_glasses', label: 'Safety Glasses' },
  { id: 'welding_gloves', label: 'Welding Gloves' },
  { id: 'leather_gloves', label: 'Leather Gloves' },
  { id: 'fire_resistant', label: 'Fire Resistant Clothing' },
  { id: 'leather_apron', label: 'Leather Apron' },
  { id: 'safety_shoes', label: 'Safety Shoes' },
  { id: 'hearing_protection', label: 'Hearing Protection' },
  { id: 'respirator', label: 'Respirator' },
  { id: 'hard_hat', label: 'Hard Hat' },
];

export default function HotWorkScreen() {
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
  } = useSafetyPermits('hot_work');
  
  const { data: existingPermit, isLoading: loadingPermit } = usePermitById(id);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'hotwork', 'fire', 'loto', 'ppe'])
  );
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  const [permitNumber, setPermitNumber] = useState('');
  const [location, setLocation] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('07:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('17:00');
  const [validHours, setValidHours] = useState('8');

  const [hotWorkTypes, setHotWorkTypes] = useState<HotWorkType[]>([]);
  const [workLocation, setWorkLocation] = useState('');
  const [fireHazards, setFireHazards] = useState<string[]>([]);
  const [newFireHazard, setNewFireHazard] = useState('');
  
  const [combustiblesWithin35ft, setCombustiblesWithin35ft] = useState(false);
  const [combustiblesRemoved, setCombustiblesRemoved] = useState(false);
  const [combustiblesProtected, setCombustiblesProtected] = useState(false);
  const [protectionMethod, setProtectionMethod] = useState('');
  
  const [fireWatchRequired, setFireWatchRequired] = useState(true);
  const [fireWatchName, setFireWatchName] = useState('');
  const [fireWatchDuration, setFireWatchDuration] = useState('60');
  const [fireExtinguisherType, setFireExtinguisherType] = useState('');
  const [fireExtinguisherLocation, setFireExtinguisherLocation] = useState('');
  
  const [sprinklerSystemActive, setSprinklerSystemActive] = useState(true);
  const [fireAlarmNotified, setFireAlarmNotified] = useState(false);
  const [smokeDetectorsCovered, setSmokeDetectorsCovered] = useState(false);
  const [ventilationAdequate, setVentilationAdequate] = useState(true);
  const [confinedSpacePermitRequired, setConfinedSpacePermitRequired] = useState(false);
  const [confinedSpacePermitNumber, setConfinedSpacePermitNumber] = useState('');
  const [hotSurfaceWarningPosted, setHotSurfaceWarningPosted] = useState(false);
  const [weldingScreensInPlace, setWeldingScreensInPlace] = useState(false);
  const [gasCylindersSecured, setGasCylindersSecured] = useState(false);
  const [flashbackArrestorsInstalled, setFlashbackArrestorsInstalled] = useState(false);

  const [lotoRequired, setLotoRequired] = useState(false);
  const [lotoLevel, setLotoLevel] = useState<number>(0);

  const [selectedPPE, setSelectedPPE] = useState<string[]>(['welding_helmet', 'welding_gloves', 'safety_glasses', 'fire_resistant']);

  useEffect(() => {
    if (!id) {
      setPermitNumber(generatePermitNumber('hot_work'));
    }
  }, [id, generatePermitNumber]);

  useEffect(() => {
    if (existingPermit && existingPermit.permit_type === 'hot_work') {
      setPermitNumber(existingPermit.permit_number);
      setLocation(existingPermit.location || '');
      setWorkDescription(existingPermit.work_description);
      setStartDate(existingPermit.start_date);
      setStartTime(existingPermit.start_time || '07:00');
      setEndDate(existingPermit.end_date);
      setEndTime(existingPermit.end_time || '17:00');
      setValidHours(existingPermit.valid_hours.toString());
      setSelectedPPE(existingPermit.ppe_required || []);
      setLotoRequired((existingPermit as any).loto_required || false);
      setLotoLevel((existingPermit as any).loto_level || 0);

      const permitData = existingPermit.permit_data as HotWorkPermitData;
      if (permitData) {
        setHotWorkTypes(permitData.hot_work_type || []);
        setWorkLocation(permitData.work_location || '');
        setFireHazards(permitData.fire_hazards_identified || []);
        setCombustiblesWithin35ft(permitData.combustibles_within_35ft ?? false);
        setCombustiblesRemoved(permitData.combustibles_removed ?? false);
        setCombustiblesProtected(permitData.combustibles_protected ?? false);
        setProtectionMethod(permitData.protection_method || '');
        setFireWatchRequired(permitData.fire_watch_required ?? true);
        setFireWatchName(permitData.fire_watch_name || '');
        setFireWatchDuration(permitData.fire_watch_duration_minutes?.toString() || '60');
        setFireExtinguisherType(permitData.fire_extinguisher_type || '');
        setFireExtinguisherLocation(permitData.fire_extinguisher_location || '');
        setSprinklerSystemActive(permitData.sprinkler_system_active ?? true);
        setFireAlarmNotified(permitData.fire_alarm_notified ?? false);
        setSmokeDetectorsCovered(permitData.smoke_detectors_covered ?? false);
        setVentilationAdequate(permitData.ventilation_adequate ?? true);
        setConfinedSpacePermitRequired(permitData.confined_space_permit_required ?? false);
        setConfinedSpacePermitNumber(permitData.confined_space_permit_number || '');
        setHotSurfaceWarningPosted(permitData.hot_surface_warning_posted ?? false);
        setWeldingScreensInPlace(permitData.welding_screens_in_place ?? false);
        setGasCylindersSecured(permitData.gas_cylinders_secured ?? false);
        setFlashbackArrestorsInstalled(permitData.flashback_arrestors_installed ?? false);
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

  const toggleHotWorkType = useCallback((type: HotWorkType) => {
    setHotWorkTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const togglePPE = useCallback((ppeId: string) => {
    setSelectedPPE(prev => 
      prev.includes(ppeId) ? prev.filter(p => p !== ppeId) : [...prev, ppeId]
    );
  }, []);

  const addFireHazard = useCallback(() => {
    if (newFireHazard.trim()) {
      setFireHazards(prev => [...prev, newFireHazard.trim()]);
      setNewFireHazard('');
    }
  }, [newFireHazard]);

  const handleSave = useCallback(async (status: 'draft' | 'pending_approval') => {
    if (!workDescription.trim()) {
      Alert.alert('Error', 'Work description is required');
      return;
    }
    if (hotWorkTypes.length === 0) {
      Alert.alert('Error', 'Please select at least one type of hot work');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const permitData: HotWorkPermitData = {
      hot_work_type: hotWorkTypes,
      work_location: workLocation,
      work_description: workDescription,
      fire_hazards_identified: fireHazards,
      combustibles_within_35ft: combustiblesWithin35ft,
      combustibles_removed: combustiblesRemoved,
      combustibles_protected: combustiblesProtected,
      protection_method: protectionMethod,
      fire_watch_required: fireWatchRequired,
      fire_watch_name: fireWatchName,
      fire_watch_duration_minutes: parseInt(fireWatchDuration) || 60,
      fire_extinguisher_type: fireExtinguisherType,
      fire_extinguisher_location: fireExtinguisherLocation,
      sprinkler_system_active: sprinklerSystemActive,
      fire_alarm_notified: fireAlarmNotified,
      smoke_detectors_covered: smokeDetectorsCovered,
      ventilation_adequate: ventilationAdequate,
      confined_space_permit_required: confinedSpacePermitRequired,
      confined_space_permit_number: confinedSpacePermitNumber,
      hot_surface_warning_posted: hotSurfaceWarningPosted,
      welding_screens_in_place: weldingScreensInPlace,
      gas_cylinders_secured: gasCylindersSecured,
      flashback_arrestors_installed: flashbackArrestorsInstalled,
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
          valid_hours: parseInt(validHours) || 8,
          ppe_required: selectedPPE,
          permit_data: permitData,
          loto_required: lotoRequired,
          loto_level: lotoRequired ? lotoLevel : null,
        } as any);
        Alert.alert('Success', 'Permit updated successfully');
      } else {
        await createPermit({
          permit_number: permitNumber,
          permit_type: 'hot_work',
          status,
          priority: 'high',
          facility_id: null,
          location,
          department_code: null,
          department_name: null,
          work_description: workDescription,
          hazards_identified: ['fire', 'heat_burns', ...fireHazards],
          precautions_required: ['fire_watch', 'fire_extinguisher'],
          ppe_required: selectedPPE,
          start_date: startDate,
          start_time: startTime,
          end_date: endDate,
          end_time: endTime,
          valid_hours: parseInt(validHours) || 8,
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
          workers: fireWatchName ? [fireWatchName] : [],
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
      console.error('[HotWork] Error saving permit:', error);
      Alert.alert('Error', error.message || 'Failed to save permit');
    }
  }, [
    id, existingPermit, permitNumber, location, workDescription, startDate, startTime,
    endDate, endTime, validHours, hotWorkTypes, workLocation, fireHazards,
    combustiblesWithin35ft, combustiblesRemoved, combustiblesProtected, protectionMethod,
    fireWatchRequired, fireWatchName, fireWatchDuration, fireExtinguisherType,
    fireExtinguisherLocation, sprinklerSystemActive, fireAlarmNotified, smokeDetectorsCovered,
    ventilationAdequate, confinedSpacePermitRequired, confinedSpacePermitNumber,
    hotSurfaceWarningPosted, weldingScreensInPlace, gasCylindersSecured, flashbackArrestorsInstalled,
    selectedPPE, lotoRequired, lotoLevel, user, createPermit, updatePermit, router
  ]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    
    Alert.alert(
      'Delete Permit',
      'Are you sure you want to delete this permit? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePermit(id);
              Alert.alert('Success', 'Permit deleted');
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete permit');
            }
          },
        },
      ]
    );
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading permit...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, { backgroundColor: '#F9731615', borderColor: '#F9731640' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#F9731620' }]}>
            <Flame size={32} color="#F97316" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Hot Work Permit</Text>
          <Text style={[styles.permitNumberText, { color: '#F97316' }]}>{permitNumber}</Text>
        </View>

        <View style={[styles.warningCard, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={[styles.warningText, { color: colors.text }]}>
            Fire watch must remain for minimum 60 minutes after hot work is completed.
          </Text>
        </View>

        {renderSectionHeader('basic', 'Basic Information', <Clock size={20} color="#F97316" />)}
        {expandedSections.has('basic') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Location *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={location}
                onChangeText={setLocation}
                placeholder="Building, area, or equipment location"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Work Description *</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={workDescription}
                onChangeText={setWorkDescription}
                placeholder="Describe the hot work to be performed..."
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

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.label, { color: colors.text }]}>End Date</Text>
                <Pressable
                  style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => setShowDatePicker('end')}
                >
                  <Text style={[styles.dateText, { color: colors.text }]}>{endDate}</Text>
                </Pressable>
              </View>
              <View style={styles.timeField}>
                <Text style={[styles.label, { color: colors.text }]}>Time</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
          </View>
        )}

        {renderSectionHeader('hotwork', 'Hot Work Details', <Flame size={20} color="#F97316" />)}
        {expandedSections.has('hotwork') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Type of Hot Work *</Text>
              <View style={styles.checkboxGrid}>
                {HOT_WORK_TYPES.map((type) => (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.checkboxOption,
                      { 
                        backgroundColor: hotWorkTypes.includes(type.value) ? '#F9731615' : colors.background,
                        borderColor: hotWorkTypes.includes(type.value) ? '#F97316' : colors.border,
                      },
                    ]}
                    onPress={() => toggleHotWorkType(type.value)}
                  >
                    <View style={[
                      styles.checkbox,
                      { 
                        backgroundColor: hotWorkTypes.includes(type.value) ? '#F97316' : 'transparent',
                        borderColor: hotWorkTypes.includes(type.value) ? '#F97316' : colors.border,
                      },
                    ]}>
                      {hotWorkTypes.includes(type.value) && <CheckCircle2 size={12} color="#fff" />}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>{type.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Specific Work Location</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={workLocation}
                onChangeText={setWorkLocation}
                placeholder="Maintenance Shop Bay 2, Tank T-101, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Fire Hazards Identified</Text>
              <View style={styles.tagContainer}>
                {fireHazards.map((hazard, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: '#EF444420' }]}>
                    <Text style={[styles.tagText, { color: '#EF4444' }]}>{hazard}</Text>
                    <Pressable onPress={() => setFireHazards(prev => prev.filter((_, i) => i !== index))}>
                      <X size={14} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.addItemRow}>
                <TextInput
                  style={[styles.addItemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={newFireHazard}
                  onChangeText={setNewFireHazard}
                  placeholder="Add fire hazard..."
                  placeholderTextColor={colors.textSecondary}
                />
                <Pressable style={[styles.addItemBtn, { backgroundColor: '#F97316' }]} onPress={addFireHazard}>
                  <Plus size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {renderSectionHeader('fire', 'Fire Prevention & Watch', <Eye size={20} color="#EF4444" />)}
        {expandedSections.has('fire') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Combustibles within 35 feet?</Text>
              <Switch
                value={combustiblesWithin35ft}
                onValueChange={setCombustiblesWithin35ft}
                trackColor={{ false: colors.border, true: '#F97316' }}
              />
            </View>

            {combustiblesWithin35ft && (
              <>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Combustibles Removed</Text>
                  <Switch
                    value={combustiblesRemoved}
                    onValueChange={setCombustiblesRemoved}
                    trackColor={{ false: colors.border, true: '#10B981' }}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Combustibles Protected/Covered</Text>
                  <Switch
                    value={combustiblesProtected}
                    onValueChange={setCombustiblesProtected}
                    trackColor={{ false: colors.border, true: '#10B981' }}
                  />
                </View>

                {combustiblesProtected && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Protection Method</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={protectionMethod}
                      onChangeText={setProtectionMethod}
                      placeholder="Fire blankets, wet down, barriers, etc."
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                )}
              </>
            )}

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Fire Watch Required</Text>
              <Switch
                value={fireWatchRequired}
                onValueChange={setFireWatchRequired}
                trackColor={{ false: colors.border, true: '#F97316' }}
              />
            </View>

            {fireWatchRequired && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Fire Watch Name</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={fireWatchName}
                    onChangeText={setFireWatchName}
                    placeholder="Name of fire watch personnel"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Fire Watch Duration After Work (minutes)</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={fireWatchDuration}
                    onChangeText={setFireWatchDuration}
                    placeholder="60"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Fire Extinguisher Type</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={fireExtinguisherType}
                onChangeText={setFireExtinguisherType}
                placeholder="ABC - 20lb, CO2, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Fire Extinguisher Location</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={fireExtinguisherLocation}
                onChangeText={setFireExtinguisherLocation}
                placeholder="Location of nearest fire extinguisher"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <Text style={[styles.subSectionTitle, { color: colors.text }]}>Safety Checklist</Text>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Sprinkler System Active</Text>
              <Switch
                value={sprinklerSystemActive}
                onValueChange={setSprinklerSystemActive}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Fire Alarm/Monitoring Notified</Text>
              <Switch
                value={fireAlarmNotified}
                onValueChange={setFireAlarmNotified}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Smoke Detectors Covered (if needed)</Text>
              <Switch
                value={smokeDetectorsCovered}
                onValueChange={setSmokeDetectorsCovered}
                trackColor={{ false: colors.border, true: '#F97316' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Adequate Ventilation</Text>
              <Switch
                value={ventilationAdequate}
                onValueChange={setVentilationAdequate}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Hot Surface Warnings Posted</Text>
              <Switch
                value={hotSurfaceWarningPosted}
                onValueChange={setHotSurfaceWarningPosted}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Welding Screens/Curtains in Place</Text>
              <Switch
                value={weldingScreensInPlace}
                onValueChange={setWeldingScreensInPlace}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Gas Cylinders Secured</Text>
              <Switch
                value={gasCylindersSecured}
                onValueChange={setGasCylindersSecured}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Flashback Arrestors Installed</Text>
              <Switch
                value={flashbackArrestorsInstalled}
                onValueChange={setFlashbackArrestorsInstalled}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Confined Space Permit Required</Text>
              <Switch
                value={confinedSpacePermitRequired}
                onValueChange={setConfinedSpacePermitRequired}
                trackColor={{ false: colors.border, true: '#7C3AED' }}
              />
            </View>

            {confinedSpacePermitRequired && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Confined Space Permit Number</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={confinedSpacePermitNumber}
                  onChangeText={setConfinedSpacePermitNumber}
                  placeholder="CSE-XXXXXX"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}
          </View>
        )}

        {renderSectionHeader('loto', 'LOTO Requirements', <ShieldAlert size={20} color="#DC2626" />)}
        {expandedSections.has('loto') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>LOTO Required for this Work</Text>
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
                      <Text style={[styles.lotoLevelName, { color: colors.textSecondary }]} numberOfLines={1}>
                        {level.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {renderSectionHeader('ppe', 'PPE Requirements', <ShieldAlert size={20} color="#F97316" />)}
        {expandedSections.has('ppe') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.text }]}>Required PPE (Select all that apply)</Text>
            <View style={styles.ppeGrid}>
              {PPE_OPTIONS.map((ppe) => (
                <Pressable
                  key={ppe.id}
                  style={[
                    styles.ppeOption,
                    { 
                      backgroundColor: selectedPPE.includes(ppe.id) ? '#F9731615' : colors.background,
                      borderColor: selectedPPE.includes(ppe.id) ? '#F97316' : colors.border,
                    },
                  ]}
                  onPress={() => togglePPE(ppe.id)}
                >
                  <View style={[
                    styles.ppeCheckbox,
                    { 
                      backgroundColor: selectedPPE.includes(ppe.id) ? '#F97316' : 'transparent',
                      borderColor: selectedPPE.includes(ppe.id) ? '#F97316' : colors.border,
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
            {(isCreating || isUpdating) ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <Save size={18} color={colors.text} />
                <Text style={[styles.saveBtnText, { color: colors.text }]}>Save Draft</Text>
              </>
            )}
          </Pressable>
          
          <Pressable
            style={[styles.submitBtn, { backgroundColor: '#F97316' }]}
            onPress={() => handleSave('pending_approval')}
            disabled={isCreating || isUpdating}
          >
            {(isCreating || isUpdating) ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CheckCircle2 size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit for Approval</Text>
              </>
            )}
          </Pressable>
        </View>

        {id && (
          <Pressable
            style={[styles.deleteBtn, { backgroundColor: '#EF444420' }]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Trash2 size={18} color="#EF4444" />
                <Text style={[styles.deleteBtnText, { color: '#EF4444' }]}>Delete Permit</Text>
              </>
            )}
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
            if (showDatePicker === 'start') {
              setStartDate(dateStr);
            } else {
              setEndDate(dateStr);
            }
            setShowDatePicker(null);
          }}
          onCancel={() => setShowDatePicker(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  permitNumberText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  warningCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  sectionContent: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  dateRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 16,
  },
  dateField: {
    flex: 2,
  },
  timeField: {
    flex: 1,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  dateText: {
    fontSize: 15,
  },
  checkboxGrid: {
    gap: 8,
  },
  checkboxOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  tagContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  addItemRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  addItemBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  switchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
    paddingRight: 12,
  },
  lotoLevelContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  lotoLevelOption: {
    width: '31%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  lotoLevelNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  lotoLevelName: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center' as const,
  },
  ppeGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  ppeOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    width: '48%',
    gap: 8,
  },
  ppeCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ppeLabel: {
    fontSize: 12,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 8,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  deleteBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 32,
  },
});
