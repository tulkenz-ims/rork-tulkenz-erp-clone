import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  DoorOpen,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  ChevronDown,
  Check,
  LogOut,
  Flag,
  Shield,
  Droplets,
  Wrench,
  Eye,
  Thermometer,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  useRoomHygieneLogQuery,
  useCreateRoomHygieneEntry,
  useCompleteRoomHygieneEntry,
  useFlagRoomHygieneEntry,
  RoomHygieneEntry,
} from '@/hooks/useRoomHygieneLog';
import { getDepartmentColor, getDepartmentName } from '@/constants/organizationCodes';
import * as Haptics from 'expo-haptics';

// ── Constants ──────────────────────────────────────────────────

const ROOMS = [
  { id: 'PROD-A', name: 'Production Hall A', line: 'Line 1, Line 2' },
  { id: 'PROD-B', name: 'Production Hall B', line: 'Line 3, Line 4' },
  { id: 'PACK-1', name: 'Packaging Area', line: 'Line 5' },
  { id: 'MIX-1', name: 'Mixing Room', line: 'Batching' },
  { id: 'RAW-1', name: 'Raw Materials Storage', line: 'N/A' },
  { id: 'COOL-1', name: 'Cooler / Cold Storage', line: 'N/A' },
  { id: 'QC-LAB', name: 'QC Lab', line: 'N/A' },
  { id: 'SANI-1', name: 'Sanitation Chemical Room', line: 'N/A' },
  { id: 'MAINT-SHOP', name: 'Maintenance Shop', line: 'N/A' },
  { id: 'LOAD-1', name: 'Loading Dock', line: 'N/A' },
];

const PURPOSES = [
  { value: 'temperature_check', label: 'Temperature Check', icon: Thermometer },
  { value: 'line_check', label: 'Line Check / Inspection', icon: Eye },
  { value: 'swab_test', label: 'Swab Test / ATP', icon: Droplets },
  { value: 'metal_detector_check', label: 'Metal Detector Check', icon: Shield },
  { value: 'equipment_repair', label: 'Equipment Repair', icon: Wrench },
  { value: 'cleaning', label: 'Cleaning / Sanitation', icon: Droplets },
  { value: 'quality_inspection', label: 'Quality Inspection', icon: Eye },
  { value: 'safety_inspection', label: 'Safety Inspection', icon: Shield },
  { value: 'pest_control', label: 'Pest Control', icon: AlertTriangle },
  { value: 'calibration', label: 'Calibration', icon: Wrench },
  { value: 'production_support', label: 'Production Support', icon: Wrench },
  { value: 'supervisor_check', label: 'Supervisor Check', icon: User },
  { value: 'chemical_application', label: 'Chemical Application', icon: AlertTriangle },
  { value: 'delivery', label: 'Delivery / Material Drop', icon: DoorOpen },
  { value: 'audit', label: 'Audit / Tour', icon: Eye },
  { value: 'emergency', label: 'Emergency Response', icon: AlertTriangle },
  { value: 'other', label: 'Other', icon: DoorOpen },
];

const PPE_OPTIONS = [
  { id: 'hairnet', label: 'Hair Net' },
  { id: 'gloves', label: 'Gloves' },
  { id: 'smock', label: 'Smock / Lab Coat' },
  { id: 'boot_covers', label: 'Boot Covers' },
  { id: 'safety_glasses', label: 'Safety Glasses' },
  { id: 'ear_plugs', label: 'Ear Plugs' },
  { id: 'face_mask', label: 'Face Mask' },
  { id: 'hard_hat', label: 'Hard Hat' },
  { id: 'apron', label: 'Apron' },
];

const CONTAMINATION_LEVELS = [
  { value: 'none', label: 'None', color: '#10B981' },
  { value: 'low', label: 'Low', color: '#F59E0B' },
  { value: 'medium', label: 'Medium', color: '#EF4444' },
  { value: 'high', label: 'High', color: '#DC2626' },
] as const;

// ── Component ──────────────────────────────────────────────────

export default function RoomHygieneLogScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const { organizationId } = useOrganization();
  const todayStr = new Date().toISOString().split('T')[0];

  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<typeof ROOMS[0] | null>(null);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [showPurposePicker, setShowPurposePicker] = useState(false);
  const [purposeDetail, setPurposeDetail] = useState('');
  const [actionsPerformed, setActionsPerformed] = useState('');
  const [equipmentTouched, setEquipmentTouched] = useState('');
  const [chemicalsUsed, setChemicalsUsed] = useState('');
  const [toolsBroughtIn, setToolsBroughtIn] = useState('');
  const [handwashOnEntry, setHandwashOnEntry] = useState(true);
  const [selectedPPE, setSelectedPPE] = useState<Set<string>>(new Set(['hairnet', 'gloves', 'smock']));
  const [contaminationRisk, setContaminationRisk] = useState<string>('none');
  const [contaminationNotes, setContaminationNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [filterRoom, setFilterRoom] = useState<string | undefined>(undefined);

  // Data
  const { data: entries = [], isLoading, refetch } = useRoomHygieneLogQuery({
    date: todayStr,
    roomId: filterRoom,
    limit: 50,
  });

  const createEntry = useCreateRoomHygieneEntry({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      setShowAddModal(false);
      Alert.alert('Entry Logged', 'Room entry has been recorded.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const completeEntry = useCompleteRoomHygieneEntry({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Exit Logged', 'Room exit has been recorded.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const flagEntry = useFlagRoomHygieneEntry({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Entry Flagged', 'This entry has been flagged for review.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const resetForm = useCallback(() => {
    setSelectedRoom(null);
    setSelectedPurpose('');
    setPurposeDetail('');
    setActionsPerformed('');
    setEquipmentTouched('');
    setChemicalsUsed('');
    setToolsBroughtIn('');
    setHandwashOnEntry(true);
    setSelectedPPE(new Set(['hairnet', 'gloves', 'smock']));
    setContaminationRisk('none');
    setContaminationNotes('');
    setNotes('');
  }, []);

  const togglePPE = (id: string) => {
    setSelectedPPE(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const validateAndSubmit = () => {
    if (!selectedRoom) { Alert.alert('Required', 'Select a room.'); return; }
    if (!selectedPurpose) { Alert.alert('Required', 'Select a purpose.'); return; }
    if (!actionsPerformed.trim()) { Alert.alert('Required', 'Describe actions performed.'); return; }
    if (!purposeDetail.trim()) { Alert.alert('Required', 'Provide purpose details.'); return; }
    if (!equipmentTouched.trim()) { Alert.alert('Required', 'List equipment touched or enter N/A.'); return; }
    if (!chemicalsUsed.trim()) { Alert.alert('Required', 'List chemicals used or enter N/A.'); return; }
    if (!toolsBroughtIn.trim()) { Alert.alert('Required', 'List tools brought in or enter N/A.'); return; }
    if (contaminationRisk !== 'none' && !contaminationNotes.trim()) { Alert.alert('Required', 'Describe contamination concern.'); return; }
    if (!notes.trim()) { Alert.alert('Required', 'Add notes or enter N/A.'); return; }

    createEntry.mutate({
      roomId: selectedRoom.id,
      roomName: selectedRoom.name,
      productionLine: selectedRoom.line,
      purpose: selectedPurpose,
      purposeDetail: purposeDetail.trim(),
      actionsPerformed: actionsPerformed.trim(),
      equipmentTouched: equipmentTouched.trim().split(',').map(s => s.trim()).filter(Boolean),
      chemicalsUsed: chemicalsUsed.trim().split(',').map(s => s.trim()).filter(Boolean),
      toolsBroughtIn: toolsBroughtIn.trim().split(',').map(s => s.trim()).filter(Boolean),
      handwashOnEntry,
      ppeWorn: Array.from(selectedPPE),
      hairnet: selectedPPE.has('hairnet'),
      gloves: selectedPPE.has('gloves'),
      smock: selectedPPE.has('smock'),
      bootCovers: selectedPPE.has('boot_covers'),
      contaminationRisk: contaminationRisk as any,
      contaminationNotes: contaminationNotes.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleExit = (entry: RoomHygieneEntry) => {
    Alert.alert('Log Exit', `Confirm exit from ${entry.roomName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Exit', onPress: () => completeEntry.mutate({ entryId: entry.id }) },
    ]);
  };

  const handleFlag = (entry: RoomHygieneEntry) => {
    Alert.alert('Flag Entry', 'This will flag the entry for review.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Flag', style: 'destructive', onPress: () => {
        flagEntry.mutate({ entryId: entry.id, contaminationRisk: 'high', notes: 'Flagged for review' });
      }},
    ]);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const activeEntries = entries.filter(e => e.status === 'active');
  const completedEntries = entries.filter(e => e.status !== 'active');
  const purposeLabel = PURPOSES.find(p => p.value === selectedPurpose)?.label || '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <DoorOpen size={22} color="#8B5CF6" />
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Room Hygiene Log</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                {todayStr} — {entries.length} entries today
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.addBtn, { backgroundColor: '#8B5CF6' }]}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.addBtnText}>Log Entry</Text>
          </Pressable>
        </View>

        {/* Room filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, { backgroundColor: !filterRoom ? '#8B5CF620' : colors.background, borderColor: !filterRoom ? '#8B5CF6' : colors.border }]}
            onPress={() => setFilterRoom(undefined)}
          >
            <Text style={[styles.filterChipText, { color: !filterRoom ? '#8B5CF6' : colors.textSecondary }]}>All Rooms</Text>
          </Pressable>
          {ROOMS.slice(0, 6).map(room => (
            <Pressable
              key={room.id}
              style={[styles.filterChip, { backgroundColor: filterRoom === room.id ? '#8B5CF620' : colors.background, borderColor: filterRoom === room.id ? '#8B5CF6' : colors.border }]}
              onPress={() => setFilterRoom(filterRoom === room.id ? undefined : room.id)}
            >
              <Text style={[styles.filterChipText, { color: filterRoom === room.id ? '#8B5CF6' : colors.textSecondary }]}>
                {room.name.split(' ').slice(0, 2).join(' ')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Entries list */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {/* Active entries (currently in room) */}
        {activeEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: '#F59E0B' }]}>CURRENTLY IN ROOM ({activeEntries.length})</Text>
            {activeEntries.map(entry => (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: colors.surface, borderLeftColor: '#F59E0B' }]}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryHeaderLeft}>
                    <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.entryRoom, { color: colors.text }]}>{entry.roomName}</Text>
                  </View>
                  <Text style={[styles.entryTime, { color: '#F59E0B' }]}>{formatTime(entry.entryTime)}</Text>
                </View>
                <View style={styles.entryDetails}>
                  <View style={[styles.deptBadge, { backgroundColor: getDepartmentColor(entry.departmentCode) + '20' }]}>
                    <Text style={[styles.deptBadgeText, { color: getDepartmentColor(entry.departmentCode) }]}>
                      {getDepartmentName(entry.departmentCode)}
                    </Text>
                  </View>
                  <Text style={[styles.entryPerson, { color: colors.textSecondary }]}>{entry.enteredByName}</Text>
                </View>
                <Text style={[styles.entryPurpose, { color: colors.text }]}>
                  {PURPOSES.find(p => p.value === entry.purpose)?.label || entry.purpose}
                </Text>
                <Text style={[styles.entryActions, { color: colors.textSecondary }]}>{entry.actionsPerformed}</Text>
                <View style={styles.entryActions2}>
                  <Pressable style={[styles.exitBtn, { backgroundColor: '#10B98120', borderColor: '#10B981' }]} onPress={() => handleExit(entry)}>
                    <LogOut size={14} color="#10B981" />
                    <Text style={[styles.exitBtnText, { color: '#10B981' }]}>Log Exit</Text>
                  </Pressable>
                  <Pressable style={[styles.flagBtn, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]} onPress={() => handleFlag(entry)}>
                    <Flag size={14} color="#EF4444" />
                    <Text style={[styles.flagBtnText, { color: '#EF4444' }]}>Flag</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Completed entries */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            LOG HISTORY ({completedEntries.length})
          </Text>
          {completedEntries.length === 0 && !isLoading && (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <DoorOpen size={32} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No entries logged today</Text>
            </View>
          )}
          {completedEntries.map(entry => {
            const isFlagged = entry.status === 'flagged';
            return (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: colors.surface, borderLeftColor: isFlagged ? '#EF4444' : '#10B981' }]}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryHeaderLeft}>
                    <View style={[styles.statusDot, { backgroundColor: isFlagged ? '#EF4444' : '#10B981' }]} />
                    <Text style={[styles.entryRoom, { color: colors.text }]}>{entry.roomName}</Text>
                    {isFlagged && (
                      <View style={styles.flaggedBadge}>
                        <Flag size={10} color="#EF4444" />
                        <Text style={styles.flaggedText}>FLAGGED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.entryTime, { color: colors.textSecondary }]}>
                    {formatTime(entry.entryTime)}{entry.exitTime ? ` — ${formatTime(entry.exitTime)}` : ''}
                  </Text>
                </View>
                <View style={styles.entryDetails}>
                  <View style={[styles.deptBadge, { backgroundColor: getDepartmentColor(entry.departmentCode) + '20' }]}>
                    <Text style={[styles.deptBadgeText, { color: getDepartmentColor(entry.departmentCode) }]}>
                      {getDepartmentName(entry.departmentCode)}
                    </Text>
                  </View>
                  <Text style={[styles.entryPerson, { color: colors.textSecondary }]}>{entry.enteredByName}</Text>
                  {entry.durationMinutes != null && (
                    <Text style={[styles.entryDuration, { color: colors.textTertiary }]}>{entry.durationMinutes}min</Text>
                  )}
                </View>
                <Text style={[styles.entryPurpose, { color: colors.text }]}>
                  {PURPOSES.find(p => p.value === entry.purpose)?.label || entry.purpose}
                </Text>
                <Text style={[styles.entryActions, { color: colors.textSecondary }]} numberOfLines={2}>{entry.actionsPerformed}</Text>
              </View>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Add Entry Modal ────────────────────────────────── */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderLeft}>
                <DoorOpen size={20} color="#8B5CF6" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Log Room Entry</Text>
              </View>
              <Pressable onPress={() => { resetForm(); setShowAddModal(false); }}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Auto-filled info */}
              <View style={[styles.autoFillRow, { backgroundColor: colors.background }]}>
                <User size={14} color={colors.textSecondary} />
                <Text style={[styles.autoFillText, { color: colors.text }]}>
                  {user ? `${user.first_name} ${user.last_name}` : 'Unknown'} — {user?.departmentName || 'Quality'}
                </Text>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.autoFillText, { color: colors.text }]}>
                  {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>

              {/* Room selector */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Room *</Text>
              <Pressable
                style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowRoomPicker(true)}
              >
                <Text style={[styles.pickerBtnText, { color: selectedRoom ? colors.text : colors.textTertiary }]}>
                  {selectedRoom ? selectedRoom.name : 'Select room...'}
                </Text>
                <ChevronDown size={16} color={colors.textTertiary} />
              </Pressable>

              {/* Purpose selector */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Purpose *</Text>
              <Pressable
                style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowPurposePicker(true)}
              >
                <Text style={[styles.pickerBtnText, { color: selectedPurpose ? colors.text : colors.textTertiary }]}>
                  {purposeLabel || 'Select purpose...'}
                </Text>
                <ChevronDown size={16} color={colors.textTertiary} />
              </Pressable>

              {/* Purpose detail */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Purpose Details *</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Describe specifically what you are doing..."
                placeholderTextColor={colors.textTertiary}
                value={purposeDetail}
                onChangeText={setPurposeDetail}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              {/* Actions performed */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Actions Performed *</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Describe all actions taken in the room..."
                placeholderTextColor={colors.textTertiary}
                value={actionsPerformed}
                onChangeText={setActionsPerformed}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Equipment touched */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Equipment Touched *</Text>
              <TextInput
                style={[styles.textInputSmall, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Conveyor belt, mixer panel, etc. or N/A"
                placeholderTextColor={colors.textTertiary}
                value={equipmentTouched}
                onChangeText={setEquipmentTouched}
              />

              {/* Chemicals used */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Chemicals Used *</Text>
              <TextInput
                style={[styles.textInputSmall, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Sanitizer, degreaser, etc. or N/A"
                placeholderTextColor={colors.textTertiary}
                value={chemicalsUsed}
                onChangeText={setChemicalsUsed}
              />

              {/* Tools brought in */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Tools Brought In *</Text>
              <TextInput
                style={[styles.textInputSmall, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Wrench, thermometer, swab kit, etc. or N/A"
                placeholderTextColor={colors.textTertiary}
                value={toolsBroughtIn}
                onChangeText={setToolsBroughtIn}
              />

              {/* Handwash */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Handwash on Entry *</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  style={[styles.toggleBtn, { backgroundColor: handwashOnEntry ? '#10B98120' : colors.background, borderColor: handwashOnEntry ? '#10B981' : colors.border }]}
                  onPress={() => setHandwashOnEntry(true)}
                >
                  <Check size={14} color={handwashOnEntry ? '#10B981' : colors.textTertiary} />
                  <Text style={[styles.toggleText, { color: handwashOnEntry ? '#10B981' : colors.textSecondary }]}>Yes</Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleBtn, { backgroundColor: !handwashOnEntry ? '#EF444420' : colors.background, borderColor: !handwashOnEntry ? '#EF4444' : colors.border }]}
                  onPress={() => setHandwashOnEntry(false)}
                >
                  <X size={14} color={!handwashOnEntry ? '#EF4444' : colors.textTertiary} />
                  <Text style={[styles.toggleText, { color: !handwashOnEntry ? '#EF4444' : colors.textSecondary }]}>No</Text>
                </Pressable>
              </View>

              {/* PPE */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>PPE Worn *</Text>
              <View style={styles.ppeGrid}>
                {PPE_OPTIONS.map(ppe => {
                  const selected = selectedPPE.has(ppe.id);
                  return (
                    <Pressable
                      key={ppe.id}
                      style={[styles.ppeChip, { backgroundColor: selected ? '#8B5CF620' : colors.background, borderColor: selected ? '#8B5CF6' : colors.border }]}
                      onPress={() => togglePPE(ppe.id)}
                    >
                      {selected && <Check size={12} color="#8B5CF6" strokeWidth={3} />}
                      <Text style={[styles.ppeText, { color: selected ? '#8B5CF6' : colors.textSecondary }]}>{ppe.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Contamination risk */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Contamination Risk *</Text>
              <View style={styles.riskRow}>
                {CONTAMINATION_LEVELS.map(level => {
                  const active = contaminationRisk === level.value;
                  return (
                    <Pressable
                      key={level.value}
                      style={[styles.riskChip, { backgroundColor: active ? level.color + '20' : colors.background, borderColor: active ? level.color : colors.border }]}
                      onPress={() => setContaminationRisk(level.value)}
                    >
                      <View style={[styles.riskDot, { backgroundColor: level.color }]} />
                      <Text style={[styles.riskText, { color: active ? level.color : colors.textSecondary }]}>{level.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {contaminationRisk !== 'none' && (
                <>
                  <Text style={[styles.fieldLabel, { color: '#EF4444' }]}>Contamination Details *</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, backgroundColor: '#EF444410', borderColor: '#EF444440' }]}
                    placeholder="Describe the contamination concern..."
                    placeholderTextColor={colors.textTertiary}
                    value={contaminationNotes}
                    onChangeText={setContaminationNotes}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </>
              )}

              {/* Notes */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Notes *</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Additional observations or N/A..."
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Submit */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => { resetForm(); setShowAddModal(false); }}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, { backgroundColor: '#8B5CF6' }]}
                onPress={validateAndSubmit}
                disabled={createEntry.isPending}
              >
                {createEntry.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <DoorOpen size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Log Entry</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Room Picker */}
      <Modal visible={showRoomPicker} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setShowRoomPicker(false)}>
          <View style={[styles.pickerList, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pickerListTitle, { color: colors.text }]}>Select Room</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {ROOMS.map(room => (
                <Pressable
                  key={room.id}
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setSelectedRoom(room); setShowRoomPicker(false); }}
                >
                  <View>
                    <Text style={[styles.pickerItemLabel, { color: colors.text }]}>{room.name}</Text>
                    <Text style={[styles.pickerItemSub, { color: colors.textSecondary }]}>{room.line}</Text>
                  </View>
                  {selectedRoom?.id === room.id && <Check size={18} color="#8B5CF6" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Purpose Picker */}
      <Modal visible={showPurposePicker} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setShowPurposePicker(false)}>
          <View style={[styles.pickerList, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pickerListTitle, { color: colors.text }]}>Select Purpose</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {PURPOSES.map(purpose => {
                const Icon = purpose.icon;
                return (
                  <Pressable
                    key={purpose.value}
                    style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                    onPress={() => { setSelectedPurpose(purpose.value); setShowPurposePicker(false); }}
                  >
                    <View style={styles.pickerItemRow}>
                      <Icon size={16} color={colors.textSecondary} />
                      <Text style={[styles.pickerItemLabel, { color: colors.text }]}>{purpose.label}</Text>
                    </View>
                    {selectedPurpose === purpose.value && <Check size={18} color="#8B5CF6" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 6 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  list: { flex: 1, padding: 16 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  entryCard: { borderLeftWidth: 3, borderRadius: 10, padding: 14, marginBottom: 8, gap: 6 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  entryRoom: { fontSize: 14, fontWeight: '700' },
  entryTime: { fontSize: 12, fontWeight: '600' },
  entryDetails: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  deptBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  deptBadgeText: { fontSize: 11, fontWeight: '600' },
  entryPerson: { fontSize: 12 },
  entryDuration: { fontSize: 11 },
  entryPurpose: { fontSize: 13, fontWeight: '600' },
  entryActions: { fontSize: 12, lineHeight: 18 },
  entryActions2: { flexDirection: 'row', gap: 8, marginTop: 4 },
  exitBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  exitBtnText: { fontSize: 12, fontWeight: '600' },
  flagBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  flagBtnText: { fontSize: 12, fontWeight: '600' },
  flaggedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EF444420', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  flaggedText: { fontSize: 9, fontWeight: '800', color: '#EF4444', letterSpacing: 0.3 },
  emptyState: { alignItems: 'center', padding: 32, borderRadius: 12, gap: 8 },
  emptyText: { fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalBody: { paddingHorizontal: 20, paddingTop: 12 },
  autoFillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginBottom: 14, flexWrap: 'wrap' },
  autoFillText: { fontSize: 13, fontWeight: '500' },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 8 },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1 },
  pickerBtnText: { fontSize: 14 },
  textInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 60 },
  textInputSmall: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  toggleText: { fontSize: 14, fontWeight: '600' },
  ppeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ppeChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, gap: 6 },
  ppeText: { fontSize: 13, fontWeight: '500' },
  riskRow: { flexDirection: 'row', gap: 8 },
  riskChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  riskText: { fontSize: 12, fontWeight: '600' },
  modalFooter: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  submitBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Picker modals
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pickerList: { width: '85%', borderRadius: 16, padding: 16, maxHeight: '70%' },
  pickerListTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5 },
  pickerItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerItemLabel: { fontSize: 15, fontWeight: '500' },
  pickerItemSub: { fontSize: 12, marginTop: 2 },
});
