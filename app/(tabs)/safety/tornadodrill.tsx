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
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  CloudLightning,
  ArrowLeft,
  Plus,
  Search,
  X,
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Building,
  Shield,
  Radio,
  Volume2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface SevereWeatherDrillEntry {
  id: string;
  drillDate: string;
  drillTime: string;
  drillType: string;
  weatherScenario: string;
  facility: string;
  shift: string;
  warningInitiatedTime: string;
  shelterReachedTime: string;
  totalResponseTime: string;
  totalParticipants: number;
  shelterAreasUsed: string[];
  headcountCompleted: boolean;
  headcountTime: string;
  allAccountedFor: boolean;
  missingPersons: string;
  warningSystemWorked: boolean;
  paAnnouncementClear: boolean;
  weatherRadioTested: boolean;
  shelterSuppliesChecked: boolean;
  shelterCapacityAdequate: boolean;
  accessibilityAccommodations: string[];
  issuesIdentified: string[];
  correctiveActions: string;
  conductedBy: string;
  observerNames: string;
  actualWeatherConditions: string;
  notes: string;
  status: 'completed' | 'issues_found' | 'corrective_pending';
  nextDrillDue: string;
}

const INITIAL_DRILLS: SevereWeatherDrillEntry[] = [
  {
    id: '1',
    drillDate: '2024-12-10',
    drillTime: '13:00',
    drillType: 'Unannounced',
    weatherScenario: 'Tornado Warning',
    facility: 'Main Building',
    shift: '1st Shift',
    warningInitiatedTime: '13:00:00',
    shelterReachedTime: '13:02:45',
    totalResponseTime: '2:45',
    totalParticipants: 78,
    shelterAreasUsed: ['Interior Hallway A', 'Basement Storage', 'Restrooms - Interior'],
    headcountCompleted: true,
    headcountTime: '13:04:00',
    allAccountedFor: true,
    missingPersons: '',
    warningSystemWorked: true,
    paAnnouncementClear: true,
    weatherRadioTested: true,
    shelterSuppliesChecked: true,
    shelterCapacityAdequate: true,
    accessibilityAccommodations: ['Elevator used for mobility-impaired employee'],
    issuesIdentified: [],
    correctiveActions: '',
    conductedBy: 'Sarah Williams',
    observerNames: 'John Martinez',
    actualWeatherConditions: 'Clear skies, drill only',
    notes: 'All employees reached shelter areas within target time. Excellent response.',
    status: 'completed',
    nextDrillDue: '2025-03-10',
  },
  {
    id: '2',
    drillDate: '2024-06-15',
    drillTime: '14:30',
    weatherScenario: 'Tornado Watch Escalation',
    drillType: 'Announced',
    facility: 'All Facilities',
    shift: '2nd Shift',
    warningInitiatedTime: '14:30:00',
    shelterReachedTime: '14:34:30',
    totalResponseTime: '4:30',
    totalParticipants: 62,
    shelterAreasUsed: ['Interior Hallway A', 'Interior Hallway B', 'Basement Storage'],
    headcountCompleted: true,
    headcountTime: '14:36:00',
    allAccountedFor: false,
    missingPersons: '3 employees found in warehouse loading dock area',
    warningSystemWorked: true,
    paAnnouncementClear: false,
    weatherRadioTested: true,
    shelterSuppliesChecked: true,
    shelterCapacityAdequate: true,
    accessibilityAccommodations: [],
    issuesIdentified: ['PA system not audible in warehouse', 'Loading dock personnel unaware of drill', 'Response time exceeded 3-minute target'],
    correctiveActions: 'Install additional PA speakers in warehouse. Conduct refresher training for loading dock team.',
    conductedBy: 'Mike Thompson',
    observerNames: '',
    actualWeatherConditions: 'Partly cloudy',
    notes: 'Need to improve communication to warehouse area.',
    status: 'corrective_pending',
    nextDrillDue: '2024-09-15',
  },
];

const DRILL_TYPES = ['Announced', 'Unannounced', 'Tabletop Exercise', 'Full-Scale'];
const WEATHER_SCENARIOS = [
  'Tornado Warning',
  'Tornado Watch Escalation',
  'Severe Thunderstorm',
  'Flash Flood Warning',
  'Winter Storm',
  'High Wind Advisory',
  'Lightning Threat',
];
const FACILITIES = ['Main Building', 'Warehouse', 'Cold Storage', 'Office Building', 'All Facilities'];
const SHIFTS = ['1st Shift', '2nd Shift', '3rd Shift', 'All Shifts'];

const SHELTER_AREAS = [
  'Interior Hallway A',
  'Interior Hallway B',
  'Basement Storage',
  'Restrooms - Interior',
  'Conference Room A (Interior)',
  'Storm Shelter',
  'Reinforced Storage Room',
];

const ACCESSIBILITY_OPTIONS = [
  'Elevator used for mobility-impaired employee',
  'Wheelchair accessible route used',
  'Hearing impaired notification system activated',
  'Buddy system for vision impaired',
  'Service animal accommodated',
];

const COMMON_ISSUES = [
  'PA system not audible in all areas',
  'Response time exceeded target',
  'Shelter area overcrowded',
  'Missing floor wardens',
  'Weather radio malfunction',
  'Employees unfamiliar with shelter location',
  'Shelter supplies missing or expired',
  'Door blocked or locked',
  'Communication breakdown',
  'Headcount incomplete',
];

export default function TornadoDrillScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [drills, setDrills] = useState<SevereWeatherDrillEntry[]>(INITIAL_DRILLS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDrill, setEditingDrill] = useState<SevereWeatherDrillEntry | null>(null);

  const [formData, setFormData] = useState({
    drillDate: new Date().toISOString().split('T')[0],
    drillTime: '',
    drillType: '',
    weatherScenario: '',
    facility: '',
    shift: '',
    totalResponseTime: '',
    totalParticipants: '',
    shelterAreasUsed: [] as string[],
    headcountCompleted: false,
    allAccountedFor: false,
    missingPersons: '',
    warningSystemWorked: false,
    paAnnouncementClear: false,
    weatherRadioTested: false,
    shelterSuppliesChecked: false,
    shelterCapacityAdequate: false,
    accessibilityAccommodations: [] as string[],
    issuesIdentified: [] as string[],
    correctiveActions: '',
    conductedBy: '',
    observerNames: '',
    actualWeatherConditions: '',
    notes: '',
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const resetForm = () => {
    setFormData({
      drillDate: new Date().toISOString().split('T')[0],
      drillTime: '',
      drillType: '',
      weatherScenario: '',
      facility: '',
      shift: '',
      totalResponseTime: '',
      totalParticipants: '',
      shelterAreasUsed: [],
      headcountCompleted: false,
      allAccountedFor: false,
      missingPersons: '',
      warningSystemWorked: false,
      paAnnouncementClear: false,
      weatherRadioTested: false,
      shelterSuppliesChecked: false,
      shelterCapacityAdequate: false,
      accessibilityAccommodations: [],
      issuesIdentified: [],
      correctiveActions: '',
      conductedBy: '',
      observerNames: '',
      actualWeatherConditions: '',
      notes: '',
    });
    setEditingDrill(null);
  };

  const handleAddDrill = () => {
    if (!formData.drillDate || !formData.weatherScenario || !formData.facility) {
      Alert.alert('Required Fields', 'Please enter drill date, weather scenario, and facility.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const hasIssues = formData.issuesIdentified.length > 0 || !formData.allAccountedFor;
    const nextDrill = new Date(formData.drillDate);
    nextDrill.setMonth(nextDrill.getMonth() + 3);

    const newDrill: SevereWeatherDrillEntry = {
      id: editingDrill?.id || Date.now().toString(),
      drillDate: formData.drillDate,
      drillTime: formData.drillTime,
      drillType: formData.drillType,
      weatherScenario: formData.weatherScenario,
      facility: formData.facility,
      shift: formData.shift,
      warningInitiatedTime: '',
      shelterReachedTime: '',
      totalResponseTime: formData.totalResponseTime,
      totalParticipants: parseInt(formData.totalParticipants) || 0,
      shelterAreasUsed: formData.shelterAreasUsed,
      headcountCompleted: formData.headcountCompleted,
      headcountTime: '',
      allAccountedFor: formData.allAccountedFor,
      missingPersons: formData.missingPersons,
      warningSystemWorked: formData.warningSystemWorked,
      paAnnouncementClear: formData.paAnnouncementClear,
      weatherRadioTested: formData.weatherRadioTested,
      shelterSuppliesChecked: formData.shelterSuppliesChecked,
      shelterCapacityAdequate: formData.shelterCapacityAdequate,
      accessibilityAccommodations: formData.accessibilityAccommodations,
      issuesIdentified: formData.issuesIdentified,
      correctiveActions: formData.correctiveActions,
      conductedBy: formData.conductedBy || 'Current User',
      observerNames: formData.observerNames,
      actualWeatherConditions: formData.actualWeatherConditions,
      notes: formData.notes,
      status: hasIssues ? (formData.correctiveActions ? 'corrective_pending' : 'issues_found') : 'completed',
      nextDrillDue: nextDrill.toISOString().split('T')[0],
    };

    if (editingDrill) {
      setDrills(prev => prev.map(d => d.id === editingDrill.id ? newDrill : d));
    } else {
      setDrills(prev => [newDrill, ...prev]);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditDrill = (drill: SevereWeatherDrillEntry) => {
    setEditingDrill(drill);
    setFormData({
      drillDate: drill.drillDate,
      drillTime: drill.drillTime,
      drillType: drill.drillType,
      weatherScenario: drill.weatherScenario,
      facility: drill.facility,
      shift: drill.shift,
      totalResponseTime: drill.totalResponseTime,
      totalParticipants: drill.totalParticipants.toString(),
      shelterAreasUsed: drill.shelterAreasUsed,
      headcountCompleted: drill.headcountCompleted,
      allAccountedFor: drill.allAccountedFor,
      missingPersons: drill.missingPersons,
      warningSystemWorked: drill.warningSystemWorked,
      paAnnouncementClear: drill.paAnnouncementClear,
      weatherRadioTested: drill.weatherRadioTested,
      shelterSuppliesChecked: drill.shelterSuppliesChecked,
      shelterCapacityAdequate: drill.shelterCapacityAdequate,
      accessibilityAccommodations: drill.accessibilityAccommodations,
      issuesIdentified: drill.issuesIdentified,
      correctiveActions: drill.correctiveActions,
      conductedBy: drill.conductedBy,
      observerNames: drill.observerNames,
      actualWeatherConditions: drill.actualWeatherConditions,
      notes: drill.notes,
    });
    setShowAddModal(true);
  };

  const toggleArrayItem = (field: 'shelterAreasUsed' | 'accessibilityAccommodations' | 'issuesIdentified', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item],
    }));
  };

  const filteredDrills = drills.filter(drill =>
    drill.weatherScenario.toLowerCase().includes(searchQuery.toLowerCase()) ||
    drill.facility.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'issues_found': return '#EF4444';
      case 'corrective_pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'issues_found': return 'Issues Found';
      case 'corrective_pending': return 'Corrective Pending';
      default: return status;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Severe Weather Drill',
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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
          <View style={[styles.statCard, { backgroundColor: '#6366F115', borderColor: '#6366F130' }]}>
            <Timer size={18} color="#6366F1" />
            <Text style={[styles.statValue, { color: '#6366F1' }]}>
              {drills.length > 0 ? drills[0].totalResponseTime : '0:00'}
            </Text>
            <Text style={[styles.statLabel, { color: '#6366F1' }]}>Last Response</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <AlertTriangle size={18} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {drills.filter(d => d.status === 'issues_found' || d.status === 'corrective_pending').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Issues</Text>
          </View>
        </View>

        {filteredDrills.map((drill) => (
          <Pressable
            key={drill.id}
            style={[styles.drillCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleEditDrill(drill)}
          >
            <View style={styles.drillHeader}>
              <View style={styles.drillTitleRow}>
                <CloudLightning size={20} color="#6366F1" />
                <Text style={[styles.drillTitle, { color: colors.text }]}>
                  {drill.weatherScenario}
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
                <Text style={[styles.detailText, { color: colors.text }]}>{drill.facility}</Text>
                <Text style={[styles.separator, { color: colors.textSecondary }]}>•</Text>
                <Users size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {drill.totalParticipants} participants
                </Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.metricBadge, { backgroundColor: '#6366F115' }]}>
                <Timer size={12} color="#6366F1" />
                <Text style={[styles.metricText, { color: '#6366F1' }]}>
                  Response: {drill.totalResponseTime}
                </Text>
              </View>
              <View style={[styles.metricBadge, { backgroundColor: drill.allAccountedFor ? '#10B98115' : '#EF444415' }]}>
                <Shield size={12} color={drill.allAccountedFor ? '#10B981' : '#EF4444'} />
                <Text style={[styles.metricText, { color: drill.allAccountedFor ? '#10B981' : '#EF4444' }]}>
                  {drill.allAccountedFor ? 'All Accounted' : 'Missing Persons'}
                </Text>
              </View>
            </View>

            <View style={styles.systemsRow}>
              <View style={[styles.systemBadge, { backgroundColor: drill.warningSystemWorked ? '#10B98115' : '#EF444415' }]}>
                <Volume2 size={10} color={drill.warningSystemWorked ? '#10B981' : '#EF4444'} />
                <Text style={[styles.systemText, { color: drill.warningSystemWorked ? '#10B981' : '#EF4444' }]}>
                  Warning {drill.warningSystemWorked ? '✓' : '✗'}
                </Text>
              </View>
              <View style={[styles.systemBadge, { backgroundColor: drill.paAnnouncementClear ? '#10B98115' : '#EF444415' }]}>
                <Radio size={10} color={drill.paAnnouncementClear ? '#10B981' : '#EF4444'} />
                <Text style={[styles.systemText, { color: drill.paAnnouncementClear ? '#10B981' : '#EF4444' }]}>
                  PA {drill.paAnnouncementClear ? '✓' : '✗'}
                </Text>
              </View>
              <View style={[styles.systemBadge, { backgroundColor: drill.shelterCapacityAdequate ? '#10B98115' : '#EF444415' }]}>
                <MapPin size={10} color={drill.shelterCapacityAdequate ? '#10B981' : '#EF4444'} />
                <Text style={[styles.systemText, { color: drill.shelterCapacityAdequate ? '#10B981' : '#EF4444' }]}>
                  Capacity {drill.shelterCapacityAdequate ? '✓' : '✗'}
                </Text>
              </View>
            </View>

            {drill.issuesIdentified.length > 0 && (
              <View style={styles.issuesRow}>
                {drill.issuesIdentified.slice(0, 2).map((issue, idx) => (
                  <View key={idx} style={[styles.issueBadge, { backgroundColor: '#EF444415' }]}>
                    <Text style={[styles.issueText, { color: '#EF4444' }]} numberOfLines={1}>{issue}</Text>
                  </View>
                ))}
                {drill.issuesIdentified.length > 2 && (
                  <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                    +{drill.issuesIdentified.length - 2}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.drillFooter}>
              <View style={styles.dateInfo}>
                <Calendar size={12} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  {drill.drillDate} @ {drill.drillTime}
                </Text>
              </View>
              <View style={styles.conductorInfo}>
                <Text style={[styles.conductorText, { color: colors.textSecondary }]}>
                  {drill.conductedBy}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#6366F1' }]}
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
              {editingDrill ? 'Edit Weather Drill' : 'New Severe Weather Drill'}
            </Text>
            <Pressable onPress={handleAddDrill}>
              <Text style={[styles.saveButton, { color: '#6366F1' }]}>Save</Text>
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
                  value={formData.drillDate}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, drillDate: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Drill Time</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.drillTime}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, drillTime: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Weather Scenario *</Text>
            <View style={styles.chipContainer}>
              {WEATHER_SCENARIOS.map((scenario) => (
                <Pressable
                  key={scenario}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.weatherScenario === scenario ? '#6366F120' : colors.surface,
                      borderColor: formData.weatherScenario === scenario ? '#6366F1' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, weatherScenario: scenario }))}
                >
                  <Text style={[styles.chipText, { color: formData.weatherScenario === scenario ? '#6366F1' : colors.textSecondary }]}>
                    {scenario}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Drill Type</Text>
            <View style={styles.chipContainer}>
              {DRILL_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.drillType === type ? '#F9731620' : colors.surface,
                      borderColor: formData.drillType === type ? '#F97316' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, drillType: type }))}
                >
                  <Text style={[styles.chipText, { color: formData.drillType === type ? '#F97316' : colors.textSecondary }]}>
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
                      backgroundColor: formData.facility === fac ? '#3B82F620' : colors.surface,
                      borderColor: formData.facility === fac ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, facility: fac }))}
                >
                  <Text style={[styles.chipText, { color: formData.facility === fac ? '#3B82F6' : colors.textSecondary }]}>
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

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Response Metrics</Text>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Response Time (mm:ss)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g., 2:45"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.totalResponseTime}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, totalResponseTime: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Participants</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Total count"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.totalParticipants}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, totalParticipants: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Shelter Areas Used</Text>
            <View style={styles.chipContainer}>
              {SHELTER_AREAS.map((area) => (
                <Pressable
                  key={area}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.shelterAreasUsed.includes(area) ? '#10B98120' : colors.surface,
                      borderColor: formData.shelterAreasUsed.includes(area) ? '#10B981' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('shelterAreasUsed', area)}
                >
                  <Text style={[styles.chipText, { color: formData.shelterAreasUsed.includes(area) ? '#10B981' : colors.textSecondary }]}>
                    {area}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Headcount Completed</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.headcountCompleted ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, headcountCompleted: !prev.headcountCompleted }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.headcountCompleted ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>All Personnel Accounted For</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.allAccountedFor ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, allAccountedFor: !prev.allAccountedFor }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.allAccountedFor ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            {!formData.allAccountedFor && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Missing Persons Details</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Describe any missing persons..."
                  placeholderTextColor={colors.textSecondary}
                  value={formData.missingPersons}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, missingPersons: text }))}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </>
            )}

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Systems Check</Text>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Warning System Worked</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.warningSystemWorked ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, warningSystemWorked: !prev.warningSystemWorked }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.warningSystemWorked ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>PA Announcement Clear</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.paAnnouncementClear ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, paAnnouncementClear: !prev.paAnnouncementClear }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.paAnnouncementClear ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Weather Radio Tested</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.weatherRadioTested ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, weatherRadioTested: !prev.weatherRadioTested }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.weatherRadioTested ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Shelter Supplies Checked</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.shelterSuppliesChecked ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, shelterSuppliesChecked: !prev.shelterSuppliesChecked }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.shelterSuppliesChecked ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Shelter Capacity Adequate</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.shelterCapacityAdequate ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, shelterCapacityAdequate: !prev.shelterCapacityAdequate }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.shelterCapacityAdequate ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Accessibility Accommodations</Text>
            <View style={styles.chipContainer}>
              {ACCESSIBILITY_OPTIONS.map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.accessibilityAccommodations.includes(item) ? '#8B5CF620' : colors.surface,
                      borderColor: formData.accessibilityAccommodations.includes(item) ? '#8B5CF6' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('accessibilityAccommodations', item)}
                >
                  <Text style={[styles.chipText, { color: formData.accessibilityAccommodations.includes(item) ? '#8B5CF6' : colors.textSecondary }]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Issues Identified</Text>
            <View style={styles.chipContainer}>
              {COMMON_ISSUES.map((issue) => (
                <Pressable
                  key={issue}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.issuesIdentified.includes(issue) ? '#EF444420' : colors.surface,
                      borderColor: formData.issuesIdentified.includes(issue) ? '#EF4444' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('issuesIdentified', issue)}
                >
                  <Text style={[styles.chipText, { color: formData.issuesIdentified.includes(issue) ? '#EF4444' : colors.textSecondary }]}>
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
              value={formData.correctiveActions}
              onChangeText={(text) => setFormData(prev => ({ ...prev, correctiveActions: text }))}
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
                  value={formData.conductedBy}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, conductedBy: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Weather</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Actual conditions"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.actualWeatherConditions}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, actualWeatherConditions: text }))}
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
  systemsRow: { flexDirection: 'row' as const, gap: 6, marginBottom: 8, flexWrap: 'wrap' as const },
  systemBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, gap: 3 },
  systemText: { fontSize: 9, fontWeight: '500' as const },
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
