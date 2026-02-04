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
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  BoxSelect,
  Plus,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Wind,
  Users,
  ShieldAlert,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useSafetyPermits, usePermitById } from '@/hooks/useSafetyPermits';
import { useUser } from '@/contexts/UserContext';
import {
  ConfinedSpacePermitData,
  AtmosphericReading,
  ConfinedSpaceClass,
  AtmosphericHazard,
} from '@/types/safety';
import { LOTO_LEVELS } from '@/constants/lotoProgram';
import DatePickerModal from '@/components/DatePickerModal';

const SPACE_CLASSES: { value: ConfinedSpaceClass; label: string; description: string }[] = [
  { value: 'permit_required', label: 'Permit Required', description: 'Contains or has potential to contain hazardous atmosphere' },
  { value: 'non_permit', label: 'Non-Permit', description: 'No hazardous atmosphere or other serious hazards' },
  { value: 'alternate_entry', label: 'Alternate Entry', description: 'Permit-required space that can be made safe through controls' },
];

const ATMOSPHERIC_HAZARDS: { value: AtmosphericHazard; label: string }[] = [
  { value: 'oxygen_deficiency', label: 'Oxygen Deficiency (<19.5%)' },
  { value: 'oxygen_enrichment', label: 'Oxygen Enrichment (>23.5%)' },
  { value: 'flammable', label: 'Flammable Atmosphere (>10% LEL)' },
  { value: 'toxic', label: 'Toxic Atmosphere' },
  { value: 'none', label: 'No Atmospheric Hazards' },
];

const ADDITIONAL_PPE_OPTIONS = [
  { id: 'hard_hat', label: 'Hard Hat' },
  { id: 'safety_glasses', label: 'Safety Glasses' },
  { id: 'face_shield', label: 'Face Shield' },
  { id: 'hearing_protection', label: 'Hearing Protection' },
  { id: 'safety_shoes', label: 'Safety Shoes' },
  { id: 'fall_harness', label: 'Fall Protection Harness' },
  { id: 'respirator_n95', label: 'N95 Respirator' },
  { id: 'respirator_half', label: 'Half-Face Respirator' },
  { id: 'respirator_full', label: 'Full-Face Respirator' },
  { id: 'scba', label: 'SCBA' },
  { id: 'coveralls', label: 'Coveralls' },
  { id: 'tyvek_suit', label: 'Tyvek Suit' },
  { id: 'gloves_nitrile', label: 'Nitrile Gloves' },
  { id: 'gloves_chemical', label: 'Chemical Resistant Gloves' },
];

export default function ConfinedSpaceScreen() {
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
  } = useSafetyPermits('confined_space');
  
  const { data: existingPermit, isLoading: loadingPermit } = usePermitById(id);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'space', 'atmosphere', 'personnel', 'loto', 'ppe'])
  );
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [showReadingModal, setShowReadingModal] = useState(false);

  const [permitNumber, setPermitNumber] = useState('');
  const [location, setLocation] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('07:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('17:00');
  const [validHours, setValidHours] = useState('8');

  const [spaceName, setSpaceName] = useState('');
  const [spaceLocation, setSpaceLocation] = useState('');
  const [spaceClass, setSpaceClass] = useState<ConfinedSpaceClass>('permit_required');
  const [purposeOfEntry, setPurposeOfEntry] = useState('');
  const [hazardsIdentified, setHazardsIdentified] = useState<string[]>([]);
  const [atmosphericHazards, setAtmosphericHazards] = useState<AtmosphericHazard[]>([]);
  const [physicalHazards, setPhysicalHazards] = useState<string[]>([]);
  const [newPhysicalHazard, setNewPhysicalHazard] = useState('');

  const [atmosphericReadings, setAtmosphericReadings] = useState<AtmosphericReading[]>([]);
  const [continuousMonitoring, setContinuousMonitoring] = useState(true);
  const [monitoringEquipment, setMonitoringEquipment] = useState('');
  const [ventilationRequired, setVentilationRequired] = useState(false);
  const [ventilationMethod, setVentilationMethod] = useState('');

  const [entrants, setEntrants] = useState<string[]>([]);
  const [newEntrant, setNewEntrant] = useState('');
  const [attendants, setAttendants] = useState<string[]>([]);
  const [newAttendant, setNewAttendant] = useState('');
  const [entrySupervisor, setEntrySupervisor] = useState('');
  const [rescueTeam, setRescueTeam] = useState('');
  const [rescueEquipment, setRescueEquipment] = useState<string[]>([]);
  const [newRescueEquipment, setNewRescueEquipment] = useState('');
  const [communicationMethod, setCommunicationMethod] = useState('');
  const [communicationSignals, setCommunicationSignals] = useState('');
  const [entryProcedures, setEntryProcedures] = useState('');
  const [exitProcedures, setExitProcedures] = useState('');
  const [emergencyProcedures, setEmergencyProcedures] = useState('');

  const [lotoRequired, setLotoRequired] = useState(false);
  const [lotoLevel, setLotoLevel] = useState<number>(0);

  const [selectedPPE, setSelectedPPE] = useState<string[]>([]);

  const [newReadingTime, setNewReadingTime] = useState('');
  const [newReadingO2, setNewReadingO2] = useState('20.9');
  const [newReadingLEL, setNewReadingLEL] = useState('0');
  const [newReadingH2S, setNewReadingH2S] = useState('0');
  const [newReadingCO, setNewReadingCO] = useState('0');
  const [newReadingLocation, setNewReadingLocation] = useState('');

  useEffect(() => {
    if (!id) {
      setPermitNumber(generatePermitNumber('confined_space'));
    }
  }, [id, generatePermitNumber]);

  useEffect(() => {
    if (existingPermit && existingPermit.permit_type === 'confined_space') {
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

      const permitData = existingPermit.permit_data as ConfinedSpacePermitData;
      if (permitData) {
        setSpaceName(permitData.space_name || '');
        setSpaceLocation(permitData.space_location || '');
        setSpaceClass(permitData.space_class || 'permit_required');
        setPurposeOfEntry(permitData.purpose_of_entry || '');
        setHazardsIdentified(permitData.hazards_identified || []);
        setAtmosphericHazards(permitData.atmospheric_hazards || []);
        setPhysicalHazards(permitData.physical_hazards || []);
        setAtmosphericReadings(permitData.atmospheric_readings || []);
        setContinuousMonitoring(permitData.continuous_monitoring ?? true);
        setMonitoringEquipment(permitData.monitoring_equipment || '');
        setVentilationRequired(permitData.ventilation_required ?? false);
        setVentilationMethod(permitData.ventilation_method || '');
        setEntrants(permitData.entrants || []);
        setAttendants(permitData.attendants || []);
        setEntrySupervisor(permitData.entry_supervisor || '');
        setRescueTeam(permitData.rescue_team || '');
        setRescueEquipment(permitData.rescue_equipment || []);
        setCommunicationMethod(permitData.communication_method || '');
        setCommunicationSignals(permitData.communication_signals || '');
        setEntryProcedures(permitData.entry_procedures || '');
        setExitProcedures(permitData.exit_procedures || '');
        setEmergencyProcedures(permitData.emergency_procedures || '');
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

  const toggleAtmosphericHazard = useCallback((hazard: AtmosphericHazard) => {
    setAtmosphericHazards(prev => 
      prev.includes(hazard) ? prev.filter(h => h !== hazard) : [...prev, hazard]
    );
  }, []);

  const togglePPE = useCallback((ppeId: string) => {
    setSelectedPPE(prev => 
      prev.includes(ppeId) ? prev.filter(p => p !== ppeId) : [...prev, ppeId]
    );
  }, []);

  const addPhysicalHazard = useCallback(() => {
    if (newPhysicalHazard.trim()) {
      setPhysicalHazards(prev => [...prev, newPhysicalHazard.trim()]);
      setNewPhysicalHazard('');
    }
  }, [newPhysicalHazard]);

  const addEntrant = useCallback(() => {
    if (newEntrant.trim()) {
      setEntrants(prev => [...prev, newEntrant.trim()]);
      setNewEntrant('');
    }
  }, [newEntrant]);

  const addAttendant = useCallback(() => {
    if (newAttendant.trim()) {
      setAttendants(prev => [...prev, newAttendant.trim()]);
      setNewAttendant('');
    }
  }, [newAttendant]);

  const addRescueEquipment = useCallback(() => {
    if (newRescueEquipment.trim()) {
      setRescueEquipment(prev => [...prev, newRescueEquipment.trim()]);
      setNewRescueEquipment('');
    }
  }, [newRescueEquipment]);

  const addAtmosphericReading = useCallback(() => {
    const o2 = parseFloat(newReadingO2);
    const lel = parseFloat(newReadingLEL);
    const h2s = parseFloat(newReadingH2S);
    const co = parseFloat(newReadingCO);
    
    const acceptable = o2 >= 19.5 && o2 <= 23.5 && lel < 10 && h2s < 10 && co < 35;

    const reading: AtmosphericReading = {
      id: Date.now().toString(),
      reading_time: newReadingTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      oxygen_percent: o2,
      lel_percent: lel,
      h2s_ppm: h2s,
      co_ppm: co,
      location: newReadingLocation,
      taken_by: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown',
      acceptable,
    };

    setAtmosphericReadings(prev => [...prev, reading]);
    setShowReadingModal(false);
    setNewReadingTime('');
    setNewReadingO2('20.9');
    setNewReadingLEL('0');
    setNewReadingH2S('0');
    setNewReadingCO('0');
    setNewReadingLocation('');
  }, [newReadingTime, newReadingO2, newReadingLEL, newReadingH2S, newReadingCO, newReadingLocation, user]);

  const handleSave = useCallback(async (status: 'draft' | 'pending_approval') => {
    if (!workDescription.trim()) {
      Alert.alert('Error', 'Work description is required');
      return;
    }
    if (!spaceName.trim()) {
      Alert.alert('Error', 'Space name is required');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const permitData: ConfinedSpacePermitData = {
      space_name: spaceName,
      space_location: spaceLocation,
      space_class: spaceClass,
      purpose_of_entry: purposeOfEntry,
      hazards_identified: hazardsIdentified,
      atmospheric_hazards: atmosphericHazards,
      physical_hazards: physicalHazards,
      atmospheric_readings: atmosphericReadings,
      continuous_monitoring: continuousMonitoring,
      monitoring_equipment: monitoringEquipment,
      ventilation_required: ventilationRequired,
      ventilation_method: ventilationMethod,
      entrants,
      attendants,
      entry_supervisor: entrySupervisor,
      rescue_team: rescueTeam,
      rescue_equipment: rescueEquipment,
      communication_method: communicationMethod,
      communication_signals: communicationSignals,
      entry_procedures: entryProcedures,
      exit_procedures: exitProcedures,
      emergency_procedures: emergencyProcedures,
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
          permit_type: 'confined_space',
          status,
          priority: 'high',
          facility_id: null,
          location,
          department_code: null,
          department_name: null,
          work_description: workDescription,
          hazards_identified: hazardsIdentified,
          precautions_required: [],
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
          supervisor_name: entrySupervisor || null,
          supervisor_id: null,
          contractor_name: null,
          contractor_company: null,
          emergency_contact: null,
          emergency_phone: null,
          workers: entrants,
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
      console.error('[ConfinedSpace] Error saving permit:', error);
      Alert.alert('Error', error.message || 'Failed to save permit');
    }
  }, [
    id, existingPermit, permitNumber, location, workDescription, startDate, startTime,
    endDate, endTime, validHours, spaceName, spaceLocation, spaceClass, purposeOfEntry,
    hazardsIdentified, atmosphericHazards, physicalHazards, atmosphericReadings,
    continuousMonitoring, monitoringEquipment, ventilationRequired, ventilationMethod,
    entrants, attendants, entrySupervisor, rescueTeam, rescueEquipment,
    communicationMethod, communicationSignals, entryProcedures, exitProcedures,
    emergencyProcedures, selectedPPE, lotoRequired, lotoLevel, user,
    createPermit, updatePermit, router
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
        <View style={[styles.headerCard, { backgroundColor: '#7C3AED15', borderColor: '#7C3AED40' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#7C3AED20' }]}>
            <BoxSelect size={32} color="#7C3AED" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Confined Space Entry Permit</Text>
          <Text style={[styles.permitNumberText, { color: '#7C3AED' }]}>{permitNumber}</Text>
        </View>

        {renderSectionHeader('basic', 'Basic Information', <Clock size={20} color="#7C3AED" />)}
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
                placeholder="Describe the work to be performed..."
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

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Valid Hours</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={validHours}
                onChangeText={setValidHours}
                placeholder="8"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {renderSectionHeader('space', 'Confined Space Details', <BoxSelect size={20} color="#7C3AED" />)}
        {expandedSections.has('space') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Space Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={spaceName}
                onChangeText={setSpaceName}
                placeholder="Tank T-101, Silo S-3, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Space Location</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={spaceLocation}
                onChangeText={setSpaceLocation}
                placeholder="Building, floor, area"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Space Classification</Text>
              {SPACE_CLASSES.map((cls) => (
                <Pressable
                  key={cls.value}
                  style={[
                    styles.radioOption,
                    { 
                      backgroundColor: spaceClass === cls.value ? '#7C3AED15' : colors.background,
                      borderColor: spaceClass === cls.value ? '#7C3AED' : colors.border,
                    },
                  ]}
                  onPress={() => setSpaceClass(cls.value)}
                >
                  <View style={[styles.radioCircle, { borderColor: spaceClass === cls.value ? '#7C3AED' : colors.border }]}>
                    {spaceClass === cls.value && <View style={[styles.radioSelected, { backgroundColor: '#7C3AED' }]} />}
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={[styles.radioLabel, { color: colors.text }]}>{cls.label}</Text>
                    <Text style={[styles.radioDescription, { color: colors.textSecondary }]}>{cls.description}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Purpose of Entry</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={purposeOfEntry}
                onChangeText={setPurposeOfEntry}
                placeholder="Inspection, cleaning, maintenance, etc."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Physical Hazards</Text>
              <View style={styles.tagContainer}>
                {physicalHazards.map((hazard, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: '#EF444420' }]}>
                    <Text style={[styles.tagText, { color: '#EF4444' }]}>{hazard}</Text>
                    <Pressable onPress={() => setPhysicalHazards(prev => prev.filter((_, i) => i !== index))}>
                      <X size={14} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.addItemRow}>
                <TextInput
                  style={[styles.addItemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={newPhysicalHazard}
                  onChangeText={setNewPhysicalHazard}
                  placeholder="Add physical hazard..."
                  placeholderTextColor={colors.textSecondary}
                />
                <Pressable style={[styles.addItemBtn, { backgroundColor: '#7C3AED' }]} onPress={addPhysicalHazard}>
                  <Plus size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {renderSectionHeader('atmosphere', 'Atmospheric Monitoring', <Wind size={20} color="#7C3AED" />)}
        {expandedSections.has('atmosphere') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Atmospheric Hazards</Text>
              {ATMOSPHERIC_HAZARDS.map((hazard) => (
                <Pressable
                  key={hazard.value}
                  style={[
                    styles.checkboxOption,
                    { 
                      backgroundColor: atmosphericHazards.includes(hazard.value) ? '#7C3AED10' : 'transparent',
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => toggleAtmosphericHazard(hazard.value)}
                >
                  <View style={[
                    styles.checkbox,
                    { 
                      backgroundColor: atmosphericHazards.includes(hazard.value) ? '#7C3AED' : 'transparent',
                      borderColor: atmosphericHazards.includes(hazard.value) ? '#7C3AED' : colors.border,
                    },
                  ]}>
                    {atmosphericHazards.includes(hazard.value) && <CheckCircle2 size={14} color="#fff" />}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: colors.text }]}>{hazard.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.text }]}>Atmospheric Readings</Text>
                <Pressable
                  style={[styles.addReadingBtn, { backgroundColor: '#7C3AED' }]}
                  onPress={() => setShowReadingModal(true)}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.addReadingBtnText}>Add Reading</Text>
                </Pressable>
              </View>
              
              {atmosphericReadings.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No atmospheric readings recorded
                </Text>
              ) : (
                atmosphericReadings.map((reading, index) => (
                  <View key={reading.id} style={[styles.readingCard, { backgroundColor: colors.background, borderColor: reading.acceptable ? '#10B98140' : '#EF444440' }]}>
                    <View style={styles.readingHeader}>
                      <Text style={[styles.readingTime, { color: colors.text }]}>{reading.reading_time}</Text>
                      <View style={[styles.readingStatus, { backgroundColor: reading.acceptable ? '#10B98120' : '#EF444420' }]}>
                        {reading.acceptable ? (
                          <CheckCircle2 size={12} color="#10B981" />
                        ) : (
                          <AlertTriangle size={12} color="#EF4444" />
                        )}
                        <Text style={{ color: reading.acceptable ? '#10B981' : '#EF4444', fontSize: 11 }}>
                          {reading.acceptable ? 'SAFE' : 'UNSAFE'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.readingValues}>
                      <View style={styles.readingValue}>
                        <Text style={[styles.readingLabel, { color: colors.textSecondary }]}>O₂</Text>
                        <Text style={[styles.readingNumber, { color: colors.text }]}>{reading.oxygen_percent}%</Text>
                      </View>
                      <View style={styles.readingValue}>
                        <Text style={[styles.readingLabel, { color: colors.textSecondary }]}>LEL</Text>
                        <Text style={[styles.readingNumber, { color: colors.text }]}>{reading.lel_percent}%</Text>
                      </View>
                      <View style={styles.readingValue}>
                        <Text style={[styles.readingLabel, { color: colors.textSecondary }]}>H₂S</Text>
                        <Text style={[styles.readingNumber, { color: colors.text }]}>{reading.h2s_ppm} ppm</Text>
                      </View>
                      <View style={styles.readingValue}>
                        <Text style={[styles.readingLabel, { color: colors.textSecondary }]}>CO</Text>
                        <Text style={[styles.readingNumber, { color: colors.text }]}>{reading.co_ppm} ppm</Text>
                      </View>
                    </View>
                    <Text style={[styles.readingLocation, { color: colors.textSecondary }]}>
                      Location: {reading.location} • By: {reading.taken_by}
                    </Text>
                    <Pressable
                      style={styles.removeReadingBtn}
                      onPress={() => setAtmosphericReadings(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Continuous Monitoring Required</Text>
              <Switch
                value={continuousMonitoring}
                onValueChange={setContinuousMonitoring}
                trackColor={{ false: colors.border, true: '#7C3AED' }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Monitoring Equipment</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={monitoringEquipment}
                onChangeText={setMonitoringEquipment}
                placeholder="MSA Altair 4XR, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Ventilation Required</Text>
              <Switch
                value={ventilationRequired}
                onValueChange={setVentilationRequired}
                trackColor={{ false: colors.border, true: '#7C3AED' }}
              />
            </View>

            {ventilationRequired && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Ventilation Method</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={ventilationMethod}
                  onChangeText={setVentilationMethod}
                  placeholder="Forced air, natural draft, etc."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}
          </View>
        )}

        {renderSectionHeader('personnel', 'Personnel & Rescue', <Users size={20} color="#7C3AED" />)}
        {expandedSections.has('personnel') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Entry Supervisor</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={entrySupervisor}
                onChangeText={setEntrySupervisor}
                placeholder="Name of entry supervisor"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Authorized Entrants</Text>
              <View style={styles.tagContainer}>
                {entrants.map((entrant, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: '#3B82F620' }]}>
                    <Text style={[styles.tagText, { color: '#3B82F6' }]}>{entrant}</Text>
                    <Pressable onPress={() => setEntrants(prev => prev.filter((_, i) => i !== index))}>
                      <X size={14} color="#3B82F6" />
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.addItemRow}>
                <TextInput
                  style={[styles.addItemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={newEntrant}
                  onChangeText={setNewEntrant}
                  placeholder="Add entrant name..."
                  placeholderTextColor={colors.textSecondary}
                />
                <Pressable style={[styles.addItemBtn, { backgroundColor: '#7C3AED' }]} onPress={addEntrant}>
                  <Plus size={18} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Attendants</Text>
              <View style={styles.tagContainer}>
                {attendants.map((attendant, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: '#10B98120' }]}>
                    <Text style={[styles.tagText, { color: '#10B981' }]}>{attendant}</Text>
                    <Pressable onPress={() => setAttendants(prev => prev.filter((_, i) => i !== index))}>
                      <X size={14} color="#10B981" />
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.addItemRow}>
                <TextInput
                  style={[styles.addItemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={newAttendant}
                  onChangeText={setNewAttendant}
                  placeholder="Add attendant name..."
                  placeholderTextColor={colors.textSecondary}
                />
                <Pressable style={[styles.addItemBtn, { backgroundColor: '#7C3AED' }]} onPress={addAttendant}>
                  <Plus size={18} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Rescue Team</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={rescueTeam}
                onChangeText={setRescueTeam}
                placeholder="On-site team, fire dept, contractor, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Rescue Equipment</Text>
              <View style={styles.tagContainer}>
                {rescueEquipment.map((equip, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: '#F5920B20' }]}>
                    <Text style={[styles.tagText, { color: '#F59E0B' }]}>{equip}</Text>
                    <Pressable onPress={() => setRescueEquipment(prev => prev.filter((_, i) => i !== index))}>
                      <X size={14} color="#F59E0B" />
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.addItemRow}>
                <TextInput
                  style={[styles.addItemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={newRescueEquipment}
                  onChangeText={setNewRescueEquipment}
                  placeholder="Tripod, winch, harness, etc."
                  placeholderTextColor={colors.textSecondary}
                />
                <Pressable style={[styles.addItemBtn, { backgroundColor: '#7C3AED' }]} onPress={addRescueEquipment}>
                  <Plus size={18} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Communication Method</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={communicationMethod}
                onChangeText={setCommunicationMethod}
                placeholder="Two-way radio, verbal, visual, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Communication Signals</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={communicationSignals}
                onChangeText={setCommunicationSignals}
                placeholder="Check-in frequency, emergency signals..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>
        )}

        {renderSectionHeader('loto', 'LOTO Requirements', <ShieldAlert size={20} color="#DC2626" />)}
        {expandedSections.has('loto') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>LOTO Required for this Entry</Text>
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
                {lotoLevel > 0 && (
                  <View style={[styles.lotoInfo, { backgroundColor: LOTO_LEVELS[lotoLevel].color + '10', borderColor: LOTO_LEVELS[lotoLevel].color + '40' }]}>
                    <Text style={[styles.lotoInfoTitle, { color: LOTO_LEVELS[lotoLevel].color }]}>
                      Level {lotoLevel}: {LOTO_LEVELS[lotoLevel].name}
                    </Text>
                    <Text style={[styles.lotoInfoText, { color: colors.textSecondary }]}>
                      {LOTO_LEVELS[lotoLevel].energyDescription}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {renderSectionHeader('ppe', 'PPE Requirements', <ShieldAlert size={20} color="#7C3AED" />)}
        {expandedSections.has('ppe') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.text }]}>Required PPE (Select all that apply)</Text>
            <View style={styles.ppeGrid}>
              {ADDITIONAL_PPE_OPTIONS.map((ppe) => (
                <Pressable
                  key={ppe.id}
                  style={[
                    styles.ppeOption,
                    { 
                      backgroundColor: selectedPPE.includes(ppe.id) ? '#7C3AED15' : colors.background,
                      borderColor: selectedPPE.includes(ppe.id) ? '#7C3AED' : colors.border,
                    },
                  ]}
                  onPress={() => togglePPE(ppe.id)}
                >
                  <View style={[
                    styles.ppeCheckbox,
                    { 
                      backgroundColor: selectedPPE.includes(ppe.id) ? '#7C3AED' : 'transparent',
                      borderColor: selectedPPE.includes(ppe.id) ? '#7C3AED' : colors.border,
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
            style={[styles.submitBtn, { backgroundColor: '#7C3AED' }]}
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

      <Modal visible={showReadingModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Atmospheric Reading</Text>
            <Pressable onPress={() => setShowReadingModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Time</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={newReadingTime}
                onChangeText={setNewReadingTime}
                placeholder="HH:MM (leave blank for current time)"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Location</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={newReadingLocation}
                onChangeText={setNewReadingLocation}
                placeholder="Top manway, bottom, middle, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.readingInputRow}>
              <View style={styles.readingInputField}>
                <Text style={[styles.label, { color: colors.text }]}>O₂ %</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={newReadingO2}
                  onChangeText={setNewReadingO2}
                  keyboardType="decimal-pad"
                  placeholder="20.9"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.readingHint, { color: colors.textSecondary }]}>Safe: 19.5-23.5%</Text>
              </View>
              <View style={styles.readingInputField}>
                <Text style={[styles.label, { color: colors.text }]}>LEL %</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={newReadingLEL}
                  onChangeText={setNewReadingLEL}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.readingHint, { color: colors.textSecondary }]}>Safe: &lt;10%</Text>
              </View>
            </View>
            <View style={styles.readingInputRow}>
              <View style={styles.readingInputField}>
                <Text style={[styles.label, { color: colors.text }]}>H₂S (ppm)</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={newReadingH2S}
                  onChangeText={setNewReadingH2S}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.readingHint, { color: colors.textSecondary }]}>Safe: &lt;10 ppm</Text>
              </View>
              <View style={styles.readingInputField}>
                <Text style={[styles.label, { color: colors.text }]}>CO (ppm)</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={newReadingCO}
                  onChangeText={setNewReadingCO}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.readingHint, { color: colors.textSecondary }]}>Safe: &lt;35 ppm</Text>
              </View>
            </View>
            <Pressable
              style={[styles.addReadingSubmitBtn, { backgroundColor: '#7C3AED' }]}
              onPress={addAtmosphericReading}
            >
              <Plus size={18} color="#fff" />
              <Text style={styles.addReadingSubmitBtnText}>Add Reading</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
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
  radioOption: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
    marginTop: 2,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  radioDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  checkboxOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
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
  addReadingBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addReadingBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    paddingVertical: 16,
  },
  readingCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    position: 'relative' as const,
  },
  readingHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  readingTime: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  readingStatus: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  readingValues: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 8,
  },
  readingValue: {
    alignItems: 'center' as const,
  },
  readingLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  readingNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  readingLocation: {
    fontSize: 11,
  },
  removeReadingBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    padding: 4,
  },
  switchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
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
  lotoInfo: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  lotoInfoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  lotoInfoText: {
    fontSize: 12,
    lineHeight: 16,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  readingInputRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  readingInputField: {
    flex: 1,
    marginBottom: 16,
  },
  readingHint: {
    fontSize: 11,
    marginTop: 4,
  },
  addReadingSubmitBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  addReadingSubmitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
