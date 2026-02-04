import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Plus,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Filter,
  X,
  Repeat,
  Target,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseSanitation, SanitationSchedule, SanitationArea, SanitationTaskType } from '@/hooks/useSupabaseSanitation';
import * as Haptics from 'expo-haptics';

const AREA_LABELS: Record<SanitationArea, string> = {
  restroom: 'Restroom',
  break_room: 'Break Room',
  locker_room: 'Locker Room',
  office: 'Office',
  common_area: 'Common Area',
  floor: 'Floor Care',
  exterior: 'Exterior',
  production: 'Production',
  warehouse: 'Warehouse',
  other: 'Other',
};

const FREQUENCY_CONFIG: Record<SanitationTaskType, { label: string; color: string }> = {
  daily: { label: 'Daily', color: '#8B5CF6' },
  weekly: { label: 'Weekly', color: '#EC4899' },
  monthly: { label: 'Monthly', color: '#6366F1' },
  quarterly: { label: 'Quarterly', color: '#14B8A6' },
  annual: { label: 'Annual', color: '#F59E0B' },
  deep_clean: { label: 'Deep Clean', color: '#EF4444' },
  special: { label: 'Special', color: '#3B82F6' },
};

const ZONES = [
  { id: 'zone-a', name: 'Zone A - Production Floor', areas: ['production', 'warehouse'] },
  { id: 'zone-b', name: 'Zone B - Office Wing', areas: ['office', 'common_area'] },
  { id: 'zone-c', name: 'Zone C - Employee Areas', areas: ['break_room', 'locker_room', 'restroom'] },
  { id: 'zone-d', name: 'Zone D - Exterior/Grounds', areas: ['exterior'] },
];

const CREWS = [
  { id: 'day', name: 'Day Shift Sanitation', shift: '6:00 AM - 2:00 PM' },
  { id: 'swing', name: 'Swing Shift Sanitation', shift: '2:00 PM - 10:00 PM' },
  { id: 'night', name: 'Night Shift Sanitation', shift: '10:00 PM - 6:00 AM' },
  { id: 'weekend', name: 'Weekend Crew', shift: 'Sat-Sun' },
];

interface ScheduleItem {
  id: string;
  name: string;
  frequency: SanitationTaskType;
  area: SanitationArea;
  zone: string;
  crew: string;
  time: string;
  duration: number;
  tasks: string[];
  isActive: boolean;
  lastCompleted: string | null;
  nextDue: string;
}

const MOCK_SCHEDULES: ScheduleItem[] = [
  {
    id: '1',
    name: 'Morning Restroom Cleaning',
    frequency: 'daily',
    area: 'restroom',
    zone: 'Zone C - Employee Areas',
    crew: 'Day Shift Sanitation',
    time: '6:00 AM',
    duration: 45,
    tasks: ['Clean toilets', 'Sanitize sinks', 'Mop floors', 'Restock supplies'],
    isActive: true,
    lastCompleted: '2025-01-25',
    nextDue: '2025-01-26',
  },
  {
    id: '2',
    name: 'Break Room Cleaning',
    frequency: 'daily',
    area: 'break_room',
    zone: 'Zone C - Employee Areas',
    crew: 'Day Shift Sanitation',
    time: '10:00 AM',
    duration: 30,
    tasks: ['Wipe tables', 'Clean microwave', 'Empty trash', 'Mop floor'],
    isActive: true,
    lastCompleted: '2025-01-25',
    nextDue: '2025-01-26',
  },
  {
    id: '3',
    name: 'Weekly Floor Scrubbing',
    frequency: 'weekly',
    area: 'floor',
    zone: 'Zone B - Office Wing',
    crew: 'Night Shift Sanitation',
    time: '10:00 PM',
    duration: 120,
    tasks: ['Scrub all hallway floors', 'Apply floor finish', 'Buff high-traffic areas'],
    isActive: true,
    lastCompleted: '2025-01-20',
    nextDue: '2025-01-27',
  },
  {
    id: '4',
    name: 'Monthly Deep Clean - Production',
    frequency: 'monthly',
    area: 'production',
    zone: 'Zone A - Production Floor',
    crew: 'Weekend Crew',
    time: '6:00 AM',
    duration: 480,
    tasks: ['Deep clean equipment', 'Sanitize all surfaces', 'Clean drains', 'Pressure wash floors'],
    isActive: true,
    lastCompleted: '2025-01-01',
    nextDue: '2025-02-01',
  },
  {
    id: '5',
    name: 'Quarterly Window Cleaning',
    frequency: 'quarterly',
    area: 'common_area',
    zone: 'Zone B - Office Wing',
    crew: 'Day Shift Sanitation',
    time: '8:00 AM',
    duration: 240,
    tasks: ['Clean all interior windows', 'Clean exterior windows', 'Clean glass doors'],
    isActive: true,
    lastCompleted: '2024-10-15',
    nextDue: '2025-01-15',
  },
];

export default function MSSScreen() {
  const { colors } = useTheme();
  const { schedules, createSchedule, refetch, isLoading } = useSupabaseSanitation();

  const [refreshing, setRefreshing] = useState(false);
  const [filterFrequency, setFilterFrequency] = useState<SanitationTaskType | 'all'>('all');
  const [filterZone, setFilterZone] = useState<string | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);

  const [newScheduleName, setNewScheduleName] = useState('');
  const [newFrequency, setNewFrequency] = useState<SanitationTaskType>('daily');
  const [newArea, setNewArea] = useState<SanitationArea>('restroom');
  const [newCrew, setNewCrew] = useState(CREWS[0].name);

  const filteredSchedules = useMemo(() => {
    let filtered = MOCK_SCHEDULES;
    
    if (filterFrequency !== 'all') {
      filtered = filtered.filter(s => s.frequency === filterFrequency);
    }
    
    if (filterZone !== 'all') {
      filtered = filtered.filter(s => s.zone === filterZone);
    }
    
    return filtered;
  }, [filterFrequency, filterZone]);

  const scheduleStats = useMemo(() => {
    return {
      total: MOCK_SCHEDULES.length,
      active: MOCK_SCHEDULES.filter(s => s.isActive).length,
      daily: MOCK_SCHEDULES.filter(s => s.frequency === 'daily').length,
      weekly: MOCK_SCHEDULES.filter(s => s.frequency === 'weekly').length,
      monthly: MOCK_SCHEDULES.filter(s => s.frequency === 'monthly').length,
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refetch]);

  const handleAddSchedule = useCallback(() => {
    if (!newScheduleName.trim()) {
      Alert.alert('Missing Information', 'Please enter a schedule name.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Schedule Created', `"${newScheduleName}" has been added to the master schedule.`);
    
    setShowAddModal(false);
    setNewScheduleName('');
  }, [newScheduleName]);

  const renderScheduleCard = (schedule: ScheduleItem) => {
    const freqConfig = FREQUENCY_CONFIG[schedule.frequency];
    const isDue = new Date(schedule.nextDue) <= new Date();
    
    return (
      <Pressable
        key={schedule.id}
        style={[styles.scheduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setSelectedSchedule(schedule)}
      >
        <View style={styles.scheduleHeader}>
          <View style={[styles.freqBadge, { backgroundColor: freqConfig.color + '20' }]}>
            <Repeat size={12} color={freqConfig.color} />
            <Text style={[styles.freqText, { color: freqConfig.color }]}>{freqConfig.label}</Text>
          </View>
          {isDue && (
            <View style={[styles.dueBadge, { backgroundColor: '#EF444420' }]}>
              <AlertCircle size={12} color="#EF4444" />
              <Text style={[styles.dueText, { color: '#EF4444' }]}>Due</Text>
            </View>
          )}
          {schedule.isActive ? (
            <CheckCircle2 size={18} color="#10B981" />
          ) : (
            <AlertCircle size={18} color={colors.textTertiary} />
          )}
        </View>

        <Text style={[styles.scheduleName, { color: colors.text }]}>{schedule.name}</Text>

        <View style={styles.scheduleMeta}>
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{schedule.zone}</Text>
          </View>
          <View style={styles.metaItem}>
            <Users size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{schedule.crew}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{schedule.time} • {schedule.duration} min</Text>
          </View>
        </View>

        <View style={styles.scheduleFooter}>
          <View style={styles.taskCount}>
            <Target size={14} color={colors.textTertiary} />
            <Text style={[styles.taskCountText, { color: colors.textSecondary }]}>
              {schedule.tasks.length} tasks
            </Text>
          </View>
          <Text style={[styles.nextDue, { color: isDue ? '#EF4444' : colors.textSecondary }]}>
            Next: {new Date(schedule.nextDue).toLocaleDateString()}
          </Text>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
            <Calendar size={28} color="#8B5CF6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Master Sanitation Schedule</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage all recurring sanitation tasks by zone and frequency
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{scheduleStats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{scheduleStats.active}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EC4899' }]}>{scheduleStats.daily}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Daily</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#6366F1' }]}>{scheduleStats.weekly + scheduleStats.monthly}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Periodic</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Filter by Frequency</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              filterFrequency === 'all' && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
            ]}
            onPress={() => setFilterFrequency('all')}
          >
            <Text style={[styles.filterChipText, { color: filterFrequency === 'all' ? '#FFF' : colors.text }]}>
              All
            </Text>
          </Pressable>
          {(Object.keys(FREQUENCY_CONFIG) as SanitationTaskType[]).map((freq) => (
            <Pressable
              key={freq}
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                filterFrequency === freq && { backgroundColor: FREQUENCY_CONFIG[freq].color, borderColor: FREQUENCY_CONFIG[freq].color },
              ]}
              onPress={() => {
                setFilterFrequency(freq);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.filterChipText, { color: filterFrequency === freq ? '#FFF' : colors.text }]}>
                {FREQUENCY_CONFIG[freq].label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Filter by Zone</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              filterZone === 'all' && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
            ]}
            onPress={() => setFilterZone('all')}
          >
            <Text style={[styles.filterChipText, { color: filterZone === 'all' ? '#FFF' : colors.text }]}>
              All Zones
            </Text>
          </Pressable>
          {ZONES.map((zone) => (
            <Pressable
              key={zone.id}
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                filterZone === zone.name && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
              ]}
              onPress={() => {
                setFilterZone(zone.name);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.filterChipText, { color: filterZone === zone.name ? '#FFF' : colors.text }]}>
                {zone.name.split(' - ')[0]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Schedules ({filteredSchedules.length})
        </Text>

        {filteredSchedules.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Schedules Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No schedules match the selected filters.
            </Text>
          </View>
        ) : (
          filteredSchedules.map(renderScheduleCard)
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#8B5CF6' }]}
        onPress={() => setShowAddModal(true)}
      >
        <Plus size={24} color="#FFF" />
      </Pressable>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Schedule</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Schedule Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., Morning Restroom Cleaning"
              placeholderTextColor={colors.textTertiary}
              value={newScheduleName}
              onChangeText={setNewScheduleName}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Frequency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionRow}>
              {(Object.keys(FREQUENCY_CONFIG) as SanitationTaskType[]).slice(0, 5).map((freq) => (
                <Pressable
                  key={freq}
                  style={[
                    styles.optionChip,
                    { borderColor: colors.border },
                    newFrequency === freq && { backgroundColor: FREQUENCY_CONFIG[freq].color, borderColor: FREQUENCY_CONFIG[freq].color },
                  ]}
                  onPress={() => setNewFrequency(freq)}
                >
                  <Text style={[styles.optionChipText, { color: newFrequency === freq ? '#FFF' : colors.text }]}>
                    {FREQUENCY_CONFIG[freq].label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Area</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionRow}>
              {(Object.keys(AREA_LABELS) as SanitationArea[]).map((area) => (
                <Pressable
                  key={area}
                  style={[
                    styles.optionChip,
                    { borderColor: colors.border },
                    newArea === area && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
                  ]}
                  onPress={() => setNewArea(area)}
                >
                  <Text style={[styles.optionChipText, { color: newArea === area ? '#FFF' : colors.text }]}>
                    {AREA_LABELS[area]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Assigned Crew</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionRow}>
              {CREWS.map((crew) => (
                <Pressable
                  key={crew.id}
                  style={[
                    styles.optionChip,
                    { borderColor: colors.border },
                    newCrew === crew.name && { backgroundColor: '#10B981', borderColor: '#10B981' },
                  ]}
                  onPress={() => setNewCrew(crew.name)}
                >
                  <Text style={[styles.optionChipText, { color: newCrew === crew.name ? '#FFF' : colors.text }]}>
                    {crew.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.addButton, { backgroundColor: '#8B5CF6' }]}
              onPress={handleAddSchedule}
            >
              <Text style={styles.addButtonText}>Create Schedule</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedSchedule}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedSchedule(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {selectedSchedule && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedSchedule.name}</Text>
                  <Pressable onPress={() => setSelectedSchedule(null)}>
                    <X size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <View style={[styles.detailBadges]}>
                  <View style={[styles.freqBadge, { backgroundColor: FREQUENCY_CONFIG[selectedSchedule.frequency].color + '20' }]}>
                    <Text style={[styles.freqText, { color: FREQUENCY_CONFIG[selectedSchedule.frequency].color }]}>
                      {FREQUENCY_CONFIG[selectedSchedule.frequency].label}
                    </Text>
                  </View>
                  <View style={[styles.areaBadge, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.areaText, { color: colors.text }]}>{AREA_LABELS[selectedSchedule.area as SanitationArea]}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color={colors.textTertiary} />
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Zone:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSchedule.zone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Users size={16} color={colors.textTertiary} />
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Crew:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSchedule.crew}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Clock size={16} color={colors.textTertiary} />
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Time:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSchedule.time} ({selectedSchedule.duration} min)</Text>
                  </View>
                </View>

                <Text style={[styles.tasksTitle, { color: colors.text }]}>Tasks Included:</Text>
                {selectedSchedule.tasks.map((task, index) => (
                  <View key={index} style={styles.taskItem}>
                    <View style={[styles.taskDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={[styles.taskText, { color: colors.text }]}>{task}</Text>
                  </View>
                ))}

                <View style={styles.scheduleActions}>
                  <Pressable style={[styles.scheduleBtn, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.scheduleBtnText}>Generate Tasks</Text>
                  </Pressable>
                  <Pressable style={[styles.scheduleBtn, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.scheduleBtnText, { color: colors.text }]}>Edit Schedule</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
    marginTop: 8,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  scheduleCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  scheduleHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 10,
  },
  freqBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  freqText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  dueBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dueText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  scheduleMeta: {
    gap: 6,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  scheduleFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  taskCount: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  taskCountText: {
    fontSize: 12,
  },
  nextDue: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  fab: {
    position: 'absolute' as const,
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 16,
  },
  optionRow: {
    marginBottom: 16,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  addButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  detailBadges: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  areaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  areaText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  detailSection: {
    gap: 10,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    width: 50,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  tasksTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  taskItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 8,
  },
  taskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskText: {
    fontSize: 14,
  },
  scheduleActions: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 20,
  },
  scheduleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  scheduleBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 80,
  },
});
