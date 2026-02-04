import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  Flame,
  ArrowLeft,
  Plus,
  Search,
  X,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Building,
  ClipboardCheck,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useFireDrillLog } from '@/hooks/useSafetyEmergencyPreparedness';
import { FireDrillEntry, FireDrillType, FireDrillStatus } from '@/types/emergencyPreparedness';

const DRILL_TYPES: FireDrillType[] = ['announced', 'unannounced', 'partial_evacuation', 'night_shift', 'weekend'];
const DRILL_TYPE_LABELS: Record<FireDrillType, string> = {
  announced: 'Announced',
  unannounced: 'Unannounced',
  partial_evacuation: 'Partial Evacuation',
  night_shift: 'Night Shift',
  weekend: 'Weekend',
};

const SHIFTS = ['1st Shift', '2nd Shift', '3rd Shift', 'All Shifts'];
const FACILITIES = ['Main Building', 'Warehouse', 'Office Building', 'Production Wing', 'All Facilities'];
const ASSEMBLY_POINTS = ['Assembly Point A', 'Assembly Point B', 'Assembly Point C', 'Assembly Point D'];
const COMMON_ISSUES = [
  'Alarm not audible in all areas',
  'Exit blocked or obstructed',
  'Exit signs not illuminated',
  'Employees returned for belongings',
  'Employees used elevators',
  'Slow response time',
  'Headcount incomplete',
  'Assembly point confusion',
  'Missing floor wardens',
  'Communication breakdown',
];

export default function FireDrillLogScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDrill, setEditingDrill] = useState<FireDrillEntry | null>(null);

  const {
    entries: drills,
    isLoading,
    isRefetching,
    createEntry,
    updateEntry,
    isCreating,
    isUpdating,
    refetch,
  } = useFireDrillLog();

  const [formData, setFormData] = useState({
    drill_date: new Date().toISOString().split('T')[0],
    drill_time: '',
    drill_type: '' as FireDrillType | '',
    shift: '',
    facility_name: '',
    alarm_activation_time: '',
    building_clear_time: '',
    total_evacuation_time: '',
    total_participants: '',
    assembly_points_used: [] as string[],
    headcount_completed: false,
    headcount_time: '',
    all_accounted_for: false,
    missing_persons: '',
    fire_extinguishers_tested: false,
    alarms_audible: false,
    exit_signs_lit: false,
    exits_unobstructed: false,
    evacuation_aids_used: [] as string[],
    issues_identified: [] as string[],
    corrective_actions: '',
    conducted_by: '',
    observer_names: '',
    weather_conditions: '',
    announcement_made: false,
    notes: '',
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const resetForm = () => {
    setFormData({
      drill_date: new Date().toISOString().split('T')[0],
      drill_time: '',
      drill_type: '',
      shift: '',
      facility_name: '',
      alarm_activation_time: '',
      building_clear_time: '',
      total_evacuation_time: '',
      total_participants: '',
      assembly_points_used: [],
      headcount_completed: false,
      headcount_time: '',
      all_accounted_for: false,
      missing_persons: '',
      fire_extinguishers_tested: false,
      alarms_audible: false,
      exit_signs_lit: false,
      exits_unobstructed: false,
      evacuation_aids_used: [],
      issues_identified: [],
      corrective_actions: '',
      conducted_by: '',
      observer_names: '',
      weather_conditions: '',
      announcement_made: false,
      notes: '',
    });
    setEditingDrill(null);
  };

  const handleAddDrill = async () => {
    if (!formData.drill_date || !formData.drill_type || !formData.facility_name) {
      Alert.alert('Required Fields', 'Please enter drill date, type, and facility.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const hasIssues = formData.issues_identified.length > 0 || !formData.all_accounted_for;
      const nextDrill = new Date(formData.drill_date);
      nextDrill.setMonth(nextDrill.getMonth() + 3);

      const status: FireDrillStatus = hasIssues ? (formData.corrective_actions ? 'corrective_pending' : 'issues_found') : 'completed';

      const drillData = {
        drill_date: formData.drill_date,
        drill_time: formData.drill_time || undefined,
        drill_type: formData.drill_type as FireDrillType,
        shift: formData.shift || undefined,
        facility_name: formData.facility_name,
        alarm_activation_time: formData.alarm_activation_time || undefined,
        building_clear_time: formData.building_clear_time || undefined,
        total_evacuation_time: formData.total_evacuation_time || undefined,
        total_participants: parseInt(formData.total_participants) || 0,
        assembly_points_used: formData.assembly_points_used,
        headcount_completed: formData.headcount_completed,
        headcount_time: formData.headcount_time || undefined,
        all_accounted_for: formData.all_accounted_for,
        missing_persons: formData.missing_persons || undefined,
        fire_extinguishers_tested: formData.fire_extinguishers_tested,
        alarms_audible: formData.alarms_audible,
        exit_signs_lit: formData.exit_signs_lit,
        exits_unobstructed: formData.exits_unobstructed,
        evacuation_aids_used: formData.evacuation_aids_used,
        issues_identified: formData.issues_identified,
        corrective_actions: formData.corrective_actions || undefined,
        conducted_by: formData.conducted_by || undefined,
        observer_names: formData.observer_names || undefined,
        weather_conditions: formData.weather_conditions || undefined,
        announcement_made: formData.announcement_made,
        status,
        next_drill_due: nextDrill.toISOString().split('T')[0],
        notes: formData.notes || undefined,
      };

      if (editingDrill) {
        await updateEntry({ id: editingDrill.id, ...drillData });
      } else {
        await createEntry(drillData);
      }

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving drill:', error);
      Alert.alert('Error', 'Failed to save drill. Please try again.');
    }
  };

  const handleEditDrill = (drill: FireDrillEntry) => {
    setEditingDrill(drill);
    setFormData({
      drill_date: drill.drill_date,
      drill_time: drill.drill_time || '',
      drill_type: drill.drill_type,
      shift: drill.shift || '',
      facility_name: drill.facility_name || '',
      alarm_activation_time: drill.alarm_activation_time || '',
      building_clear_time: drill.building_clear_time || '',
      total_evacuation_time: drill.total_evacuation_time || '',
      total_participants: drill.total_participants.toString(),
      assembly_points_used: drill.assembly_points_used || [],
      headcount_completed: drill.headcount_completed,
      headcount_time: drill.headcount_time || '',
      all_accounted_for: drill.all_accounted_for,
      missing_persons: drill.missing_persons || '',
      fire_extinguishers_tested: drill.fire_extinguishers_tested,
      alarms_audible: drill.alarms_audible,
      exit_signs_lit: drill.exit_signs_lit,
      exits_unobstructed: drill.exits_unobstructed,
      evacuation_aids_used: drill.evacuation_aids_used || [],
      issues_identified: drill.issues_identified || [],
      corrective_actions: drill.corrective_actions || '',
      conducted_by: drill.conducted_by || '',
      observer_names: drill.observer_names || '',
      weather_conditions: drill.weather_conditions || '',
      announcement_made: drill.announcement_made,
      notes: drill.notes || '',
    });
    setShowAddModal(true);
  };

  const toggleArrayItem = (field: 'assembly_points_used' | 'evacuation_aids_used' | 'issues_identified', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item],
    }));
  };

  const filteredDrills = drills.filter(drill =>
    (drill.facility_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    drill.drill_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'scheduled': return '#3B82F6';
      case 'issues_found': return '#EF4444';
      case 'corrective_pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'scheduled': return 'Scheduled';
      case 'issues_found': return 'Issues Found';
      case 'corrective_pending': return 'Corrective Pending';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Fire Drill Log' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Fire Drill Log',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search drills..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {drills.filter(d => d.status === 'completed').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Timer size={18} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {drills.length > 0 ? drills[0].total_evacuation_time || '0:00' : '0:00'}
            </Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Last Evac Time</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <AlertTriangle size={18} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {drills.filter(d => d.status === 'issues_found' || d.status === 'corrective_pending').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Issues</Text>
          </View>
        </View>

        {filteredDrills.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Flame size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Fire Drills</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Tap the + button to log a fire drill
            </Text>
          </View>
        ) : (
          filteredDrills.map((drill) => (
            <Pressable
              key={drill.id}
              style={[styles.drillCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleEditDrill(drill)}
            >
              <View style={styles.drillHeader}>
                <View style={styles.drillTitleRow}>
                  <Flame size={20} color="#F97316" />
                  <Text style={[styles.drillTitle, { color: colors.text }]}>
                    {DRILL_TYPE_LABELS[drill.drill_type]} Fire Drill
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(drill.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(drill.status) }]}>
                    {getStatusLabel(drill.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.drillDetails}>
                <View style={styles.detailRow}>
                  <Building size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.text }]}>{drill.facility_name}</Text>
                  <Text style={[styles.separator, { color: colors.textSecondary }]}>•</Text>
                  <Users size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {drill.total_participants} participants
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={[styles.metricBadge, { backgroundColor: '#10B98115' }]}>
                  <Timer size={12} color="#10B981" />
                  <Text style={[styles.metricText, { color: '#10B981' }]}>
                    Evac: {drill.total_evacuation_time || '--'}
                  </Text>
                </View>
                <View style={[styles.metricBadge, { backgroundColor: drill.all_accounted_for ? '#10B98115' : '#EF444415' }]}>
                  <ClipboardCheck size={12} color={drill.all_accounted_for ? '#10B981' : '#EF4444'} />
                  <Text style={[styles.metricText, { color: drill.all_accounted_for ? '#10B981' : '#EF4444' }]}>
                    {drill.all_accounted_for ? 'All Accounted' : 'Missing Persons'}
                  </Text>
                </View>
              </View>

              {drill.issues_identified && drill.issues_identified.length > 0 && (
                <View style={styles.issuesRow}>
                  {drill.issues_identified.slice(0, 2).map((issue, idx) => (
                    <View key={idx} style={[styles.issueBadge, { backgroundColor: '#EF444415' }]}>
                      <Text style={[styles.issueText, { color: '#EF4444' }]} numberOfLines={1}>{issue}</Text>
                    </View>
                  ))}
                  {drill.issues_identified.length > 2 && (
                    <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                      +{drill.issues_identified.length - 2}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.drillFooter}>
                <View style={styles.dateInfo}>
                  <Calendar size={12} color={colors.textSecondary} />
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    {drill.drill_date} @ {drill.drill_time || '--'}
                  </Text>
                </View>
                <View style={styles.conductorInfo}>
                  <Text style={[styles.conductorText, { color: colors.textSecondary }]}>
                    {drill.conducted_by || 'Unknown'}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#F97316' }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          resetForm();
          setShowAddModal(true);
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </Pressable>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingDrill ? 'Edit Fire Drill' : 'New Fire Drill'}
            </Text>
            <Pressable onPress={handleAddDrill} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? (
                <ActivityIndicator size="small" color="#F97316" />
              ) : (
                <Text style={[styles.saveButton, { color: '#F97316' }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Drill Date *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.drill_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, drill_date: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Drill Time</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.drill_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, drill_time: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Drill Type *</Text>
            <View style={styles.chipContainer}>
              {DRILL_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.drill_type === type ? '#F9731620' : colors.surface,
                      borderColor: formData.drill_type === type ? '#F97316' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, drill_type: type }))}
                >
                  <Text style={[styles.chipText, { color: formData.drill_type === type ? '#F97316' : colors.textSecondary }]}>
                    {DRILL_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Facility *</Text>
            <View style={styles.chipContainer}>
              {FACILITIES.map((fac) => (
                <Pressable
                  key={fac}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.facility_name === fac ? '#3B82F620' : colors.surface,
                      borderColor: formData.facility_name === fac ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, facility_name: fac }))}
                >
                  <Text style={[styles.chipText, { color: formData.facility_name === fac ? '#3B82F6' : colors.textSecondary }]}>
                    {fac}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Shift</Text>
            <View style={styles.chipContainer}>
              {SHIFTS.map((shift) => (
                <Pressable
                  key={shift}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.shift === shift ? '#8B5CF620' : colors.surface,
                      borderColor: formData.shift === shift ? '#8B5CF6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, shift }))}
                >
                  <Text style={[styles.chipText, { color: formData.shift === shift ? '#8B5CF6' : colors.textSecondary }]}>
                    {shift}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Evacuation Metrics</Text>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Evac Time (mm:ss)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g., 2:45"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.total_evacuation_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, total_evacuation_time: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Participants</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Total count"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.total_participants}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, total_participants: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Assembly Points Used</Text>
            <View style={styles.chipContainer}>
              {ASSEMBLY_POINTS.map((point) => (
                <Pressable
                  key={point}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.assembly_points_used.includes(point) ? '#10B98120' : colors.surface,
                      borderColor: formData.assembly_points_used.includes(point) ? '#10B981' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('assembly_points_used', point)}
                >
                  <Text style={[styles.chipText, { color: formData.assembly_points_used.includes(point) ? '#10B981' : colors.textSecondary }]}>
                    {point}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Headcount Completed</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.headcount_completed ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, headcount_completed: !prev.headcount_completed }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.headcount_completed ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>All Personnel Accounted For</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.all_accounted_for ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, all_accounted_for: !prev.all_accounted_for }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.all_accounted_for ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            {!formData.all_accounted_for && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Missing Persons Details</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Describe any missing persons..."
                  placeholderTextColor={colors.textSecondary}
                  value={formData.missing_persons}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, missing_persons: text }))}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </>
            )}

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Safety Equipment Check</Text>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Fire Alarms Audible</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.alarms_audible ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, alarms_audible: !prev.alarms_audible }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.alarms_audible ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Exit Signs Illuminated</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.exit_signs_lit ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, exit_signs_lit: !prev.exit_signs_lit }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.exit_signs_lit ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Exits Unobstructed</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.exits_unobstructed ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, exits_unobstructed: !prev.exits_unobstructed }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.exits_unobstructed ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Issues Identified</Text>
            <View style={styles.chipContainer}>
              {COMMON_ISSUES.map((issue) => (
                <Pressable
                  key={issue}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.issues_identified.includes(issue) ? '#EF444420' : colors.surface,
                      borderColor: formData.issues_identified.includes(issue) ? '#EF4444' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('issues_identified', issue)}
                >
                  <Text style={[styles.chipText, { color: formData.issues_identified.includes(issue) ? '#EF4444' : colors.textSecondary }]}>
                    {issue}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Corrective Actions</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe corrective actions taken or planned..."
              placeholderTextColor={colors.textSecondary}
              value={formData.corrective_actions}
              onChangeText={(text) => setFormData(prev => ({ ...prev, corrective_actions: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Conducted By</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Your name"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.conducted_by}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, conducted_by: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Weather</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Conditions"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.weather_conditions}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, weather_conditions: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Additional observations..."
              placeholderTextColor={colors.textSecondary}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  backButton: { padding: 8, marginLeft: -8 },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  statsRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center' as const,
    borderWidth: 1,
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const },
  emptyState: {
    alignItems: 'center' as const,
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center' as const, marginTop: 8 },
  drillCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  drillHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  drillTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1, gap: 8 },
  drillTitle: { fontSize: 15, fontWeight: '600' as const, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  drillDetails: { marginBottom: 8 },
  detailRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  detailText: { fontSize: 12 },
  separator: { marginHorizontal: 2 },
  metricsRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 8 },
  metricBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  metricText: { fontSize: 11, fontWeight: '500' as const },
  issuesRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginBottom: 8 },
  issueBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, maxWidth: '60%' },
  issueText: { fontSize: 10 },
  moreText: { fontSize: 10, alignSelf: 'center' as const },
  drillFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  dateInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  dateText: { fontSize: 11 },
  conductorInfo: { flexDirection: 'row' as const, alignItems: 'center' as const },
  conductorText: { fontSize: 11 },
  fab: {
    position: 'absolute' as const,
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  saveButton: { fontSize: 16, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500' as const, marginBottom: 6, marginTop: 12 },
  sectionHeader: { fontSize: 16, fontWeight: '600' as const, marginTop: 20, marginBottom: 12 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 80 },
  twoColumn: { flexDirection: 'row' as const, gap: 12 },
  halfWidth: { flex: 1 },
  chipContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 11 },
  toggleRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginTop: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  toggleButton: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' as const },
  toggleKnob: { width: 20, height: 20, borderRadius: 10 },
  modalBottomPadding: { height: 40 },
  bottomPadding: { height: 80 },
});
