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
  DoorOpen,
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
  Route,
  UserCheck,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useEvacuationDrill } from '@/hooks/useSafetyEmergencyPreparedness';
import { EvacuationDrillEntry, EvacuationDrillRating, EvacuationDrillStatus } from '@/types/emergencyPreparedness';

const SCENARIO_TYPES = [
  'Fire Emergency',
  'Gas Leak',
  'Chemical Spill',
  'Bomb Threat',
  'Active Shooter',
  'Structural Emergency',
  'Power Failure',
  'General Evacuation',
];

const FACILITIES = ['Main Building', 'Cold Storage Wing', 'Warehouse', 'Office Building', 'All Facilities'];
const AREAS = ['Production', 'Warehouse', 'Offices', 'Break Room', 'Cold Storage', 'Packaging', 'Shipping', 'Receiving', 'Maintenance'];
const EXITS = ['Exit A - Main Entrance', 'Exit B - Production', 'Exit C - Warehouse', 'Exit D - Cold Storage', 'Exit E - Shipping', 'Exit F - Office'];
const ASSEMBLY_POINTS = ['Assembly Point A', 'Assembly Point B', 'Assembly Point C', 'Assembly Point D'];

const COMMON_BOTTLENECKS = [
  'Narrow corridor congestion',
  'Stairwell crowding',
  'Door not opening properly',
  'Slow door release',
  'Multiple streams merging',
];

const COMMON_OBSTRUCTIONS = [
  'Equipment blocking exit',
  'Pallets in exit path',
  'Doors locked/stuck',
  'Poor visibility/lighting',
  'Debris in pathway',
];

const RATINGS: { value: EvacuationDrillRating; label: string; color: string }[] = [
  { value: 'excellent', label: 'Excellent', color: '#10B981' },
  { value: 'satisfactory', label: 'Satisfactory', color: '#3B82F6' },
  { value: 'needs_improvement', label: 'Needs Improvement', color: '#F59E0B' },
  { value: 'unsatisfactory', label: 'Unsatisfactory', color: '#EF4444' },
];

export default function EvacuationDrillScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDrill, setEditingDrill] = useState<EvacuationDrillEntry | null>(null);

  const {
    entries: drills,
    isLoading,
    isRefetching,
    createEntry,
    updateEntry,
    isCreating,
    isUpdating,
    refetch,
  } = useEvacuationDrill();

  const [formData, setFormData] = useState({
    drill_date: new Date().toISOString().split('T')[0],
    drill_time: '',
    scenario_type: '',
    scenario_description: '',
    facility_name: '',
    areas_evacuated: [] as string[],
    shift: '',
    total_evacuation_time: '',
    total_employees: '',
    employees_evacuated: '',
    visitors_evacuated: '',
    contractors_evacuated: '',
    exits_used: [] as string[],
    assembly_points: [] as string[],
    wardens_performed: false,
    communication_effective: false,
    pa_system_worked: false,
    emergency_lighting: false,
    bottlenecks: [] as string[],
    exit_obstructions: [] as string[],
    lessons_learned: '',
    recommendations: '',
    conducted_by: '',
    observers: '',
    overall_rating: '' as EvacuationDrillRating | '',
    notes: '',
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const resetForm = () => {
    setFormData({
      drill_date: new Date().toISOString().split('T')[0],
      drill_time: '',
      scenario_type: '',
      scenario_description: '',
      facility_name: '',
      areas_evacuated: [],
      shift: '',
      total_evacuation_time: '',
      total_employees: '',
      employees_evacuated: '',
      visitors_evacuated: '',
      contractors_evacuated: '',
      exits_used: [],
      assembly_points: [],
      wardens_performed: false,
      communication_effective: false,
      pa_system_worked: false,
      emergency_lighting: false,
      bottlenecks: [],
      exit_obstructions: [],
      lessons_learned: '',
      recommendations: '',
      conducted_by: '',
      observers: '',
      overall_rating: '',
      notes: '',
    });
    setEditingDrill(null);
  };

  const handleAddDrill = async () => {
    if (!formData.drill_date || !formData.scenario_type || !formData.facility_name) {
      Alert.alert('Required Fields', 'Please enter drill date, scenario type, and facility.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const hasIssues = formData.bottlenecks.length > 0 || formData.exit_obstructions.length > 0;
      const rating = formData.overall_rating || 'satisfactory';
      const status: EvacuationDrillStatus = hasIssues ? 'action_required' : 'completed';

      const drillData = {
        drill_date: formData.drill_date,
        drill_time: formData.drill_time || undefined,
        scenario_type: formData.scenario_type,
        scenario_description: formData.scenario_description || undefined,
        facility_name: formData.facility_name,
        areas_evacuated: formData.areas_evacuated,
        shift: formData.shift || undefined,
        total_evacuation_time: formData.total_evacuation_time || undefined,
        total_employees: parseInt(formData.total_employees) || 0,
        employees_evacuated: parseInt(formData.employees_evacuated) || 0,
        visitors_evacuated: parseInt(formData.visitors_evacuated) || 0,
        contractors_evacuated: parseInt(formData.contractors_evacuated) || 0,
        exits_used: formData.exits_used,
        assembly_points: formData.assembly_points,
        headcount_results: formData.assembly_points.map(point => ({
          point,
          expected: 0,
          actual: 0,
          accountedFor: true,
        })),
        floor_wardens: [],
        wardens_performed: formData.wardens_performed,
        communication_effective: formData.communication_effective,
        pa_system_worked: formData.pa_system_worked,
        emergency_lighting: formData.emergency_lighting,
        mobility_assistance: [],
        bottlenecks: formData.bottlenecks,
        exit_obstructions: formData.exit_obstructions,
        lessons_learned: formData.lessons_learned ? [formData.lessons_learned] : [],
        recommendations: formData.recommendations ? [formData.recommendations] : [],
        conducted_by: formData.conducted_by || undefined,
        observers: formData.observers || undefined,
        overall_rating: rating as EvacuationDrillRating,
        status,
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

  const handleEditDrill = (drill: EvacuationDrillEntry) => {
    setEditingDrill(drill);
    setFormData({
      drill_date: drill.drill_date,
      drill_time: drill.drill_time || '',
      scenario_type: drill.scenario_type,
      scenario_description: drill.scenario_description || '',
      facility_name: drill.facility_name || '',
      areas_evacuated: drill.areas_evacuated || [],
      shift: drill.shift || '',
      total_evacuation_time: drill.total_evacuation_time || '',
      total_employees: drill.total_employees.toString(),
      employees_evacuated: drill.employees_evacuated.toString(),
      visitors_evacuated: drill.visitors_evacuated.toString(),
      contractors_evacuated: drill.contractors_evacuated.toString(),
      exits_used: drill.exits_used || [],
      assembly_points: drill.assembly_points || [],
      wardens_performed: drill.wardens_performed,
      communication_effective: drill.communication_effective,
      pa_system_worked: drill.pa_system_worked,
      emergency_lighting: drill.emergency_lighting,
      bottlenecks: drill.bottlenecks || [],
      exit_obstructions: drill.exit_obstructions || [],
      lessons_learned: (drill.lessons_learned || []).join('; '),
      recommendations: (drill.recommendations || []).join('; '),
      conducted_by: drill.conducted_by || '',
      observers: drill.observers || '',
      overall_rating: drill.overall_rating || '',
      notes: drill.notes || '',
    });
    setShowAddModal(true);
  };

  const toggleArrayItem = (field: 'areas_evacuated' | 'exits_used' | 'assembly_points' | 'bottlenecks' | 'exit_obstructions', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item],
    }));
  };

  const filteredDrills = drills.filter(drill =>
    drill.scenario_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (drill.facility_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'review_pending': return '#3B82F6';
      case 'action_required': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'review_pending': return 'Review Pending';
      case 'action_required': return 'Action Required';
      default: return status;
    }
  };

  const getRatingColor = (rating: string) => {
    const found = RATINGS.find(r => r.value === rating);
    return found?.color || '#6B7280';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Evacuation Drill Report' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Evacuation Drill Report',
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
          <View style={[styles.statCard, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
            <Timer size={18} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>
              {drills.length > 0 ? drills[0].total_evacuation_time || '0:00' : '0:00'}
            </Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Last Time</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <AlertTriangle size={18} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {drills.filter(d => d.status === 'action_required').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Actions Due</Text>
          </View>
        </View>

        {filteredDrills.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DoorOpen size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Evacuation Drills</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Tap the + button to log an evacuation drill
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
                  <DoorOpen size={20} color="#059669" />
                  <Text style={[styles.drillTitle, { color: colors.text }]}>
                    {drill.scenario_type}
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
                    {drill.employees_evacuated} evacuated
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={[styles.metricBadge, { backgroundColor: '#10B98115' }]}>
                  <Timer size={12} color="#10B981" />
                  <Text style={[styles.metricText, { color: '#10B981' }]}>
                    Time: {drill.total_evacuation_time || '--'}
                  </Text>
                </View>
                {drill.overall_rating && (
                  <View style={[styles.metricBadge, { backgroundColor: getRatingColor(drill.overall_rating) + '15' }]}>
                    <FileText size={12} color={getRatingColor(drill.overall_rating)} />
                    <Text style={[styles.metricText, { color: getRatingColor(drill.overall_rating) }]}>
                      {RATINGS.find(r => r.value === drill.overall_rating)?.label || drill.overall_rating}
                    </Text>
                  </View>
                )}
              </View>

              {drill.areas_evacuated && drill.areas_evacuated.length > 0 && (
                <View style={styles.areasRow}>
                  <Route size={12} color={colors.textSecondary} />
                  <Text style={[styles.areasText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {drill.areas_evacuated.join(', ')}
                  </Text>
                </View>
              )}

              {((drill.bottlenecks && drill.bottlenecks.length > 0) || (drill.exit_obstructions && drill.exit_obstructions.length > 0)) && (
                <View style={styles.issuesRow}>
                  {(drill.bottlenecks || []).slice(0, 1).map((issue, idx) => (
                    <View key={idx} style={[styles.issueBadge, { backgroundColor: '#F59E0B15' }]}>
                      <Text style={[styles.issueText, { color: '#F59E0B' }]} numberOfLines={1}>{issue}</Text>
                    </View>
                  ))}
                  {(drill.exit_obstructions || []).slice(0, 1).map((issue, idx) => (
                    <View key={idx} style={[styles.issueBadge, { backgroundColor: '#EF444415' }]}>
                      <Text style={[styles.issueText, { color: '#EF4444' }]} numberOfLines={1}>{issue}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.drillFooter}>
                <View style={styles.dateInfo}>
                  <Calendar size={12} color={colors.textSecondary} />
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    {drill.drill_date}
                  </Text>
                </View>
                <View style={styles.conductorInfo}>
                  <UserCheck size={12} color={colors.textSecondary} />
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
        style={[styles.fab, { backgroundColor: '#059669' }]}
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
              {editingDrill ? 'Edit Evacuation Drill' : 'New Evacuation Drill'}
            </Text>
            <Pressable onPress={handleAddDrill} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Text style={[styles.saveButton, { color: '#059669' }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Date *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.drill_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, drill_date: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Time</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.drill_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, drill_time: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Scenario Type *</Text>
            <View style={styles.chipContainer}>
              {SCENARIO_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.scenario_type === type ? '#05966920' : colors.surface,
                      borderColor: formData.scenario_type === type ? '#059669' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, scenario_type: type }))}
                >
                  <Text style={[styles.chipText, { color: formData.scenario_type === type ? '#059669' : colors.textSecondary }]}>
                    {type}
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

            <Text style={[styles.inputLabel, { color: colors.text }]}>Areas Evacuated</Text>
            <View style={styles.chipContainer}>
              {AREAS.map((area) => (
                <Pressable
                  key={area}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.areas_evacuated.includes(area) ? '#8B5CF620' : colors.surface,
                      borderColor: formData.areas_evacuated.includes(area) ? '#8B5CF6' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('areas_evacuated', area)}
                >
                  <Text style={[styles.chipText, { color: formData.areas_evacuated.includes(area) ? '#8B5CF6' : colors.textSecondary }]}>
                    {area}
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
                  placeholder="e.g., 2:30"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.total_evacuation_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, total_evacuation_time: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Total Employees</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Count"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.total_employees}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, total_employees: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Evacuated</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Count"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.employees_evacuated}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, employees_evacuated: text }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Visitors</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Count"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.visitors_evacuated}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, visitors_evacuated: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Exits Used</Text>
            <View style={styles.chipContainer}>
              {EXITS.map((exit) => (
                <Pressable
                  key={exit}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.exits_used.includes(exit) ? '#10B98120' : colors.surface,
                      borderColor: formData.exits_used.includes(exit) ? '#10B981' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('exits_used', exit)}
                >
                  <Text style={[styles.chipText, { color: formData.exits_used.includes(exit) ? '#10B981' : colors.textSecondary }]}>
                    {exit}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Assembly Points</Text>
            <View style={styles.chipContainer}>
              {ASSEMBLY_POINTS.map((point) => (
                <Pressable
                  key={point}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.assembly_points.includes(point) ? '#F9731620' : colors.surface,
                      borderColor: formData.assembly_points.includes(point) ? '#F97316' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('assembly_points', point)}
                >
                  <Text style={[styles.chipText, { color: formData.assembly_points.includes(point) ? '#F97316' : colors.textSecondary }]}>
                    {point}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Systems Check</Text>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Floor Wardens Performed Duties</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.wardens_performed ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, wardens_performed: !prev.wardens_performed }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.wardens_performed ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Communication Effective</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.communication_effective ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, communication_effective: !prev.communication_effective }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.communication_effective ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>PA System Worked</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.pa_system_worked ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, pa_system_worked: !prev.pa_system_worked }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.pa_system_worked ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Emergency Lighting Worked</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.emergency_lighting ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, emergency_lighting: !prev.emergency_lighting }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.emergency_lighting ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Bottlenecks Identified</Text>
            <View style={styles.chipContainer}>
              {COMMON_BOTTLENECKS.map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.bottlenecks.includes(item) ? '#F59E0B20' : colors.surface,
                      borderColor: formData.bottlenecks.includes(item) ? '#F59E0B' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('bottlenecks', item)}
                >
                  <Text style={[styles.chipText, { color: formData.bottlenecks.includes(item) ? '#F59E0B' : colors.textSecondary }]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Exit Obstructions</Text>
            <View style={styles.chipContainer}>
              {COMMON_OBSTRUCTIONS.map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.exit_obstructions.includes(item) ? '#EF444420' : colors.surface,
                      borderColor: formData.exit_obstructions.includes(item) ? '#EF4444' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('exit_obstructions', item)}
                >
                  <Text style={[styles.chipText, { color: formData.exit_obstructions.includes(item) ? '#EF4444' : colors.textSecondary }]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Overall Rating</Text>
            <View style={styles.chipContainer}>
              {RATINGS.map((rating) => (
                <Pressable
                  key={rating.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.overall_rating === rating.value ? rating.color + '20' : colors.surface,
                      borderColor: formData.overall_rating === rating.value ? rating.color : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, overall_rating: rating.value }))}
                >
                  <Text style={[styles.chipText, { color: formData.overall_rating === rating.value ? rating.color : colors.textSecondary }]}>
                    {rating.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Lessons Learned</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Key lessons from this drill..."
              placeholderTextColor={colors.textSecondary}
              value={formData.lessons_learned}
              onChangeText={(text) => setFormData(prev => ({ ...prev, lessons_learned: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Recommendations</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Recommendations for improvement..."
              placeholderTextColor={colors.textSecondary}
              value={formData.recommendations}
              onChangeText={(text) => setFormData(prev => ({ ...prev, recommendations: text }))}
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
                <Text style={[styles.inputLabel, { color: colors.text }]}>Observers</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Names"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.observers}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, observers: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Additional notes..."
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
  areasRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 8 },
  areasText: { fontSize: 11, flex: 1 },
  issuesRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginBottom: 8 },
  issueBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, maxWidth: '60%' },
  issueText: { fontSize: 10 },
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
  conductorInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
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
