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
  ArrowDown,
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
  Anchor,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useSafetyPermits, usePermitById } from '@/hooks/useSafetyPermits';
import { useUser } from '@/contexts/UserContext';
import { FallProtectionPermitData, FallProtectionMethod } from '@/types/safety';
import { LOTO_LEVELS } from '@/constants/lotoProgram';
import DatePickerModal from '@/components/DatePickerModal';

const FALL_PROTECTION_METHODS: { value: FallProtectionMethod; label: string; description: string }[] = [
  { value: 'guardrails', label: 'Guardrails', description: 'Fixed or portable guardrail systems' },
  { value: 'safety_nets', label: 'Safety Nets', description: 'Personnel safety net systems' },
  { value: 'personal_fall_arrest', label: 'Personal Fall Arrest', description: 'Full body harness with lanyard/SRL' },
  { value: 'positioning_system', label: 'Positioning System', description: 'Work positioning device' },
  { value: 'travel_restraint', label: 'Travel Restraint', description: 'Prevents reaching fall hazard' },
  { value: 'controlled_access_zone', label: 'Controlled Access Zone', description: 'Restricted area with warning lines' },
  { value: 'warning_line', label: 'Warning Line System', description: 'Warning lines at least 6 feet from edge' },
];

const PPE_OPTIONS = [
  { id: 'fall_harness', label: 'Full Body Harness' },
  { id: 'shock_lanyard', label: 'Shock-Absorbing Lanyard' },
  { id: 'srl', label: 'Self-Retracting Lifeline (SRL)' },
  { id: 'rope_grab', label: 'Rope Grab & Lifeline' },
  { id: 'hard_hat', label: 'Hard Hat with Chin Strap' },
  { id: 'safety_glasses', label: 'Safety Glasses' },
  { id: 'safety_shoes', label: 'Safety Shoes' },
  { id: 'gloves', label: 'Work Gloves' },
  { id: 'high_visibility', label: 'High Visibility Vest' },
  { id: 'tool_lanyard', label: 'Tool Lanyards' },
];

const FALL_HAZARDS = [
  'Unprotected edges',
  'Floor openings',
  'Skylights',
  'Roof hatches',
  'Ladders',
  'Scaffolding',
  'Elevated platforms',
  'Leading edges',
  'Holes/Penetrations',
  'Slippery surfaces',
  'Unstable surfaces',
  'Weather conditions',
];

export default function FallProtectionScreen() {
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
  } = useSafetyPermits('fall_protection');
  
  const { data: existingPermit, isLoading: loadingPermit } = usePermitById(id);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'fall', 'equipment', 'rescue', 'loto', 'ppe'])
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

  const [workLocation, setWorkLocation] = useState('');
  const [workHeightFeet, setWorkHeightFeet] = useState('');
  const [fallHazards, setFallHazards] = useState<string[]>([]);
  const [protectionMethods, setProtectionMethods] = useState<FallProtectionMethod[]>([]);
  
  const [anchorPoints, setAnchorPoints] = useState<string[]>([]);
  const [newAnchorPoint, setNewAnchorPoint] = useState('');
  const [anchorPointCapacity, setAnchorPointCapacity] = useState('5000');
  const [harnessInspected, setHarnessInspected] = useState(false);
  const [lanyardInspected, setLanyardInspected] = useState(false);
  const [srlInspected, setSrlInspected] = useState(false);
  
  const [rescuePlan, setRescuePlan] = useState('');
  const [rescueEquipment, setRescueEquipment] = useState<string[]>([]);
  const [newRescueEquipment, setNewRescueEquipment] = useState('');
  const [workersTrained, setWorkersTrained] = useState(false);
  const [trainingDates, setTrainingDates] = useState('');
  
  const [leadingEdgeWork, setLeadingEdgeWork] = useState(false);
  const [holeCoversSec, setHoleCoversSec] = useState(false);

  const [lotoRequired, setLotoRequired] = useState(false);
  const [lotoLevel, setLotoLevel] = useState<number>(0);

  const [selectedPPE, setSelectedPPE] = useState<string[]>(['fall_harness', 'hard_hat', 'safety_shoes']);

  useEffect(() => {
    if (!id) {
      setPermitNumber(generatePermitNumber('fall_protection'));
    }
  }, [id, generatePermitNumber]);

  useEffect(() => {
    if (existingPermit && existingPermit.permit_type === 'fall_protection') {
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

      const permitData = existingPermit.permit_data as FallProtectionPermitData;
      if (permitData) {
        setWorkLocation(permitData.work_location || '');
        setWorkHeightFeet(permitData.work_height_feet?.toString() || '');
        setFallHazards(permitData.fall_hazards || []);
        setProtectionMethods(permitData.protection_methods || []);
        setAnchorPoints(permitData.anchor_points || []);
        setAnchorPointCapacity(permitData.anchor_point_capacity_lbs?.toString() || '5000');
        setHarnessInspected(permitData.harness_inspection_completed ?? false);
        setLanyardInspected(permitData.lanyard_inspection_completed ?? false);
        setSrlInspected(permitData.srl_inspection_completed ?? false);
        setRescuePlan(permitData.rescue_plan || '');
        setRescueEquipment(permitData.rescue_equipment || []);
        setWorkersTrained(permitData.workers_trained ?? false);
        setTrainingDates(permitData.training_dates?.join(', ') || '');
        setLeadingEdgeWork(permitData.leading_edge_work ?? false);
        setHoleCoversSec(permitData.hole_covers_secured ?? false);
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

  const toggleProtectionMethod = useCallback((method: FallProtectionMethod) => {
    setProtectionMethods(prev => 
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  }, []);

  const toggleFallHazard = useCallback((hazard: string) => {
    setFallHazards(prev => 
      prev.includes(hazard) ? prev.filter(h => h !== hazard) : [...prev, hazard]
    );
  }, []);

  const togglePPE = useCallback((ppeId: string) => {
    setSelectedPPE(prev => 
      prev.includes(ppeId) ? prev.filter(p => p !== ppeId) : [...prev, ppeId]
    );
  }, []);

  const addAnchorPoint = useCallback(() => {
    if (newAnchorPoint.trim()) {
      setAnchorPoints(prev => [...prev, newAnchorPoint.trim()]);
      setNewAnchorPoint('');
    }
  }, [newAnchorPoint]);

  const addRescueEquipment = useCallback(() => {
    if (newRescueEquipment.trim()) {
      setRescueEquipment(prev => [...prev, newRescueEquipment.trim()]);
      setNewRescueEquipment('');
    }
  }, [newRescueEquipment]);

  const handleSave = useCallback(async (status: 'draft' | 'pending_approval') => {
    if (!workDescription.trim()) {
      Alert.alert('Error', 'Work description is required');
      return;
    }
    if (!workHeightFeet.trim()) {
      Alert.alert('Error', 'Work height is required');
      return;
    }
    if (protectionMethods.length === 0) {
      Alert.alert('Error', 'Please select at least one fall protection method');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const permitData: FallProtectionPermitData = {
      work_location: workLocation,
      work_height_feet: parseInt(workHeightFeet) || 0,
      work_description: workDescription,
      fall_hazards: fallHazards,
      protection_methods: protectionMethods,
      anchor_points: anchorPoints,
      anchor_point_capacity_lbs: parseInt(anchorPointCapacity) || 5000,
      harness_inspection_completed: harnessInspected,
      lanyard_inspection_completed: lanyardInspected,
      srl_inspection_completed: srlInspected,
      rescue_plan: rescuePlan,
      rescue_equipment: rescueEquipment,
      workers_trained: workersTrained,
      training_dates: trainingDates.split(',').map(d => d.trim()).filter(Boolean),
      leading_edge_work: leadingEdgeWork,
      hole_covers_secured: holeCoversSec,
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
          permit_type: 'fall_protection',
          status,
          priority: 'high',
          facility_id: null,
          location,
          department_code: null,
          department_name: null,
          work_description: workDescription,
          hazards_identified: ['falls', ...fallHazards],
          precautions_required: ['fall_protection'],
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
      console.error('[FallProtection] Error saving permit:', error);
      Alert.alert('Error', error.message || 'Failed to save permit');
    }
  }, [
    id, existingPermit, permitNumber, location, workDescription, startDate, startTime,
    endDate, endTime, validHours, workLocation, workHeightFeet, fallHazards,
    protectionMethods, anchorPoints, anchorPointCapacity, harnessInspected,
    lanyardInspected, srlInspected, rescuePlan, rescueEquipment, workersTrained,
    trainingDates, leadingEdgeWork, holeCoversSec, selectedPPE, lotoRequired,
    lotoLevel, user, createPermit, updatePermit, router
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
        <View style={[styles.headerCard, { backgroundColor: '#0891B215', borderColor: '#0891B240' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#0891B220' }]}>
            <ArrowDown size={32} color="#0891B2" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Fall Protection Permit</Text>
          <Text style={[styles.permitNumberText, { color: '#0891B2' }]}>{permitNumber}</Text>
        </View>

        <View style={[styles.warningCard, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={[styles.warningText, { color: colors.text }]}>
            Fall protection required for work at heights of 4 feet (general) or 6 feet (construction).
          </Text>
        </View>

        {renderSectionHeader('basic', 'Basic Information', <Clock size={20} color="#0891B2" />)}
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
                placeholder="Describe the elevated work to be performed..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Working Height (feet) *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={workHeightFeet}
                onChangeText={setWorkHeightFeet}
                placeholder="Height in feet"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
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

        {renderSectionHeader('fall', 'Fall Hazards & Protection', <ArrowDown size={20} color="#0891B2" />)}
        {expandedSections.has('fall') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Fall Hazards Present</Text>
              <View style={styles.checkboxGrid}>
                {FALL_HAZARDS.map((hazard) => (
                  <Pressable
                    key={hazard}
                    style={[
                      styles.hazardChip,
                      { 
                        backgroundColor: fallHazards.includes(hazard) ? '#EF444420' : colors.background,
                        borderColor: fallHazards.includes(hazard) ? '#EF4444' : colors.border,
                      },
                    ]}
                    onPress={() => toggleFallHazard(hazard)}
                  >
                    <Text style={[
                      styles.hazardChipText,
                      { color: fallHazards.includes(hazard) ? '#EF4444' : colors.text }
                    ]}>
                      {hazard}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Fall Protection Methods *</Text>
              {FALL_PROTECTION_METHODS.map((method) => (
                <Pressable
                  key={method.value}
                  style={[
                    styles.methodOption,
                    { 
                      backgroundColor: protectionMethods.includes(method.value) ? '#0891B215' : colors.background,
                      borderColor: protectionMethods.includes(method.value) ? '#0891B2' : colors.border,
                    },
                  ]}
                  onPress={() => toggleProtectionMethod(method.value)}
                >
                  <View style={[
                    styles.checkbox,
                    { 
                      backgroundColor: protectionMethods.includes(method.value) ? '#0891B2' : 'transparent',
                      borderColor: protectionMethods.includes(method.value) ? '#0891B2' : colors.border,
                    },
                  ]}>
                    {protectionMethods.includes(method.value) && <CheckCircle2 size={12} color="#fff" />}
                  </View>
                  <View style={styles.methodContent}>
                    <Text style={[styles.methodLabel, { color: colors.text }]}>{method.label}</Text>
                    <Text style={[styles.methodDescription, { color: colors.textSecondary }]}>{method.description}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Leading Edge Work</Text>
              <Switch
                value={leadingEdgeWork}
                onValueChange={setLeadingEdgeWork}
                trackColor={{ false: colors.border, true: '#EF4444' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Hole Covers Secured</Text>
              <Switch
                value={holeCoversSec}
                onValueChange={setHoleCoversSec}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>
          </View>
        )}

        {renderSectionHeader('equipment', 'Equipment & Anchor Points', <Anchor size={20} color="#0891B2" />)}
        {expandedSections.has('equipment') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Anchor Points</Text>
              <View style={styles.tagContainer}>
                {anchorPoints.map((point, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: '#0891B220' }]}>
                    <Text style={[styles.tagText, { color: '#0891B2' }]}>{point}</Text>
                    <Pressable onPress={() => setAnchorPoints(prev => prev.filter((_, i) => i !== index))}>
                      <X size={14} color="#0891B2" />
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.addItemRow}>
                <TextInput
                  style={[styles.addItemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={newAnchorPoint}
                  onChangeText={setNewAnchorPoint}
                  placeholder="Add anchor point location..."
                  placeholderTextColor={colors.textSecondary}
                />
                <Pressable style={[styles.addItemBtn, { backgroundColor: '#0891B2' }]} onPress={addAnchorPoint}>
                  <Plus size={18} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Anchor Point Capacity (lbs)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={anchorPointCapacity}
                onChangeText={setAnchorPointCapacity}
                placeholder="5000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Minimum 5,000 lbs per person for fall arrest
              </Text>
            </View>

            <Text style={[styles.subSectionTitle, { color: colors.text }]}>Equipment Inspections</Text>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Harness Inspection Completed</Text>
              <Switch
                value={harnessInspected}
                onValueChange={setHarnessInspected}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Lanyard Inspection Completed</Text>
              <Switch
                value={lanyardInspected}
                onValueChange={setLanyardInspected}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>SRL Inspection Completed</Text>
              <Switch
                value={srlInspected}
                onValueChange={setSrlInspected}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>
          </View>
        )}

        {renderSectionHeader('rescue', 'Rescue Plan', <ShieldAlert size={20} color="#0891B2" />)}
        {expandedSections.has('rescue') && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Rescue Plan</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={rescuePlan}
                onChangeText={setRescuePlan}
                placeholder="Describe rescue procedures in case of a fall..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Rescue Equipment</Text>
              <View style={styles.tagContainer}>
                {rescueEquipment.map((equip, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: '#F59E0B20' }]}>
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
                  placeholder="Rescue ladder, retrieval system, etc."
                  placeholderTextColor={colors.textSecondary}
                />
                <Pressable style={[styles.addItemBtn, { backgroundColor: '#0891B2' }]} onPress={addRescueEquipment}>
                  <Plus size={18} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Workers Trained on Rescue</Text>
              <Switch
                value={workersTrained}
                onValueChange={setWorkersTrained}
                trackColor={{ false: colors.border, true: '#10B981' }}
              />
            </View>

            {workersTrained && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Training Dates</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={trainingDates}
                  onChangeText={setTrainingDates}
                  placeholder="Training completion dates (comma-separated)"
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
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {renderSectionHeader('ppe', 'PPE Requirements', <ShieldAlert size={20} color="#0891B2" />)}
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
                      backgroundColor: selectedPPE.includes(ppe.id) ? '#0891B215' : colors.background,
                      borderColor: selectedPPE.includes(ppe.id) ? '#0891B2' : colors.border,
                    },
                  ]}
                  onPress={() => togglePPE(ppe.id)}
                >
                  <View style={[
                    styles.ppeCheckbox,
                    { 
                      backgroundColor: selectedPPE.includes(ppe.id) ? '#0891B2' : 'transparent',
                      borderColor: selectedPPE.includes(ppe.id) ? '#0891B2' : colors.border,
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
            style={[styles.submitBtn, { backgroundColor: '#0891B2' }]}
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
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  loadingContainer: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  loadingText: { marginTop: 12, fontSize: 14 },
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
  subSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginTop: 16, marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500' as const, marginBottom: 8 },
  hint: { fontSize: 11, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' as const },
  dateRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 16 },
  dateField: { flex: 2 },
  timeField: { flex: 1 },
  dateInput: { borderWidth: 1, borderRadius: 10, padding: 12 },
  dateText: { fontSize: 15 },
  checkboxGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  hazardChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  hazardChipText: { fontSize: 12, fontWeight: '500' as const },
  methodOption: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12, marginTop: 2 },
  methodContent: { flex: 1 },
  methodLabel: { fontSize: 14, fontWeight: '600' as const, marginBottom: 2 },
  methodDescription: { fontSize: 12 },
  tagContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 8 },
  tag: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 6 },
  tagText: { fontSize: 13, fontWeight: '500' as const },
  addItemRow: { flexDirection: 'row' as const, gap: 8 },
  addItemInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  addItemBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  switchLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1, paddingRight: 12 },
  lotoLevelContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  lotoLevelOption: { width: '15%', padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
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
