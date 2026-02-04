import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseQualityTasks, QualityTaskSchedule, QualityTaskFrequency, QualityTaskType, QualityTaskPriority } from '@/hooks/useSupabaseQualityTasks';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  X,
  Settings,
  Bell,
  Repeat,
  Timer,
  ChevronRight,
  Play,
  Pause,
  Trash2,
  Edit3,
  AlertCircle,
  MapPin,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const FREQUENCIES: { value: QualityTaskFrequency; label: string; description: string }[] = [
  { value: 'hourly', label: 'Hourly', description: 'Every hour during operating hours' },
  { value: 'daily', label: 'Daily', description: 'Once per day' },
  { value: 'weekly', label: 'Weekly', description: 'Once per week' },
  { value: 'monthly', label: 'Monthly', description: 'Once per month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
  { value: 'annual', label: 'Annual', description: 'Once per year' },
  { value: 'one_time', label: 'One-Time', description: 'Single occurrence' },
];

const TASK_TYPES: { value: QualityTaskType; label: string; color: string }[] = [
  { value: 'temp_check', label: 'Temperature Check', color: '#3B82F6' },
  { value: 'line_check', label: 'Line Check', color: '#10B981' },
  { value: 'inspection', label: 'Inspection', color: '#8B5CF6' },
  { value: 'calibration', label: 'Calibration', color: '#F59E0B' },
  { value: 'verification', label: 'Verification', color: '#06B6D4' },
  { value: 'swab_test', label: 'Swab Test', color: '#EC4899' },
  { value: 'sign_off', label: 'Sign-off', color: '#F97316' },
  { value: 'audit', label: 'Audit', color: '#EF4444' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

const PRIORITIES: { value: QualityTaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#6B7280' },
  { value: 'medium', label: 'Medium', color: '#3B82F6' },
  { value: 'high', label: 'High', color: '#F59E0B' },
  { value: 'critical', label: 'Critical', color: '#EF4444' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function TaskSetupScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<QualityTaskSchedule | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(true);

  const [newSchedule, setNewSchedule] = useState({
    schedule_name: '',
    task_type: 'temp_check' as QualityTaskType,
    frequency: 'hourly' as QualityTaskFrequency,
    priority: 'high' as QualityTaskPriority,
    location: '',
    line_name: '',
    description: '',
    instructions: '',
    start_time: '06:00',
    end_time: '18:00',
    grace_period_before: '15',
    grace_period_after: '15',
    days_of_week: [1, 2, 3, 4, 5] as number[],
    assigned_role: '',
    requires_sign_off: false,
    notify_on_available: true,
    notify_on_due: true,
    notify_before_late_minutes: '5',
  });

  const {
    schedules,
    createSchedule,
    updateSchedule,
    generateScheduleNumber,
    refetch,
    isLoading,
  } = useSupabaseQualityTasks();

  const filteredSchedules = useMemo(() => {
    if (filterActive === null) return schedules;
    return schedules.filter(s => s.is_active === filterActive);
  }, [schedules, filterActive]);

  const scheduleStats = useMemo(() => {
    const active = schedules.filter(s => s.is_active).length;
    const inactive = schedules.filter(s => !s.is_active).length;
    const hourly = schedules.filter(s => s.frequency === 'hourly' && s.is_active).length;
    const daily = schedules.filter(s => s.frequency === 'daily' && s.is_active).length;
    return { active, inactive, hourly, daily, total: schedules.length };
  }, [schedules]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refetch]);

  const handleCreateSchedule = useCallback(async () => {
    if (!newSchedule.schedule_name.trim()) {
      Alert.alert('Required', 'Please enter a schedule name.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createSchedule({
        schedule_number: generateScheduleNumber(),
        schedule_name: newSchedule.schedule_name,
        task_type: newSchedule.task_type,
        frequency: newSchedule.frequency,
        priority: newSchedule.priority,
        facility_id: 'FAC001',
        department_code: 'QA',
        department_name: 'Quality Assurance',
        location: newSchedule.location || null,
        line_id: null,
        line_name: newSchedule.line_name || null,
        description: newSchedule.description || null,
        instructions: newSchedule.instructions || null,
        checklist_items: [],
        parameters_to_record: [],
        start_time: newSchedule.start_time,
        end_time: newSchedule.frequency === 'hourly' ? newSchedule.end_time : null,
        grace_period_before_minutes: parseInt(newSchedule.grace_period_before) || 15,
        grace_period_after_minutes: parseInt(newSchedule.grace_period_after) || 15,
        days_of_week: newSchedule.frequency === 'hourly' || newSchedule.frequency === 'daily' 
          ? newSchedule.days_of_week 
          : null,
        days_of_month: null,
        months_of_year: null,
        assigned_role: newSchedule.assigned_role || null,
        assigned_to: null,
        assigned_to_id: null,
        requires_sign_off: newSchedule.requires_sign_off,
        sign_off_role: newSchedule.requires_sign_off ? 'Supervisor' : null,
        cross_department_required: false,
        cross_department_type: null,
        is_active: true,
        effective_date: new Date().toISOString().split('T')[0],
        end_date: null,
        notification_settings: {
          notify_on_available: newSchedule.notify_on_available,
          notify_on_due: newSchedule.notify_on_due,
          notify_before_late_minutes: parseInt(newSchedule.notify_before_late_minutes) || 5,
          notify_on_missed: true,
          escalate_to_supervisor: true,
          escalation_delay_minutes: 30,
        },
      });

      setShowNewScheduleModal(false);
      resetForm();
      Alert.alert('Success', 'Task schedule created successfully.');
    } catch (error) {
      console.error('[TaskSetup] Error creating schedule:', error);
      Alert.alert('Error', 'Failed to create schedule.');
    }
  }, [newSchedule, createSchedule, generateScheduleNumber]);

  const handleToggleActive = useCallback(async (schedule: QualityTaskSchedule) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateSchedule({
        id: schedule.id,
        is_active: !schedule.is_active,
      });
    } catch (error) {
      console.error('[TaskSetup] Error toggling schedule:', error);
      Alert.alert('Error', 'Failed to update schedule.');
    }
  }, [updateSchedule]);

  const resetForm = () => {
    setNewSchedule({
      schedule_name: '',
      task_type: 'temp_check',
      frequency: 'hourly',
      priority: 'high',
      location: '',
      line_name: '',
      description: '',
      instructions: '',
      start_time: '06:00',
      end_time: '18:00',
      grace_period_before: '15',
      grace_period_after: '15',
      days_of_week: [1, 2, 3, 4, 5],
      assigned_role: '',
      requires_sign_off: false,
      notify_on_available: true,
      notify_on_due: true,
      notify_before_late_minutes: '5',
    });
  };

  const toggleDayOfWeek = (day: number) => {
    setNewSchedule(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort(),
    }));
  };

  const getFrequencyLabel = (freq: QualityTaskFrequency) => {
    return FREQUENCIES.find(f => f.value === freq)?.label || freq;
  };

  const getTaskTypeInfo = (type: QualityTaskType) => {
    return TASK_TYPES.find(t => t.value === type) || { label: type, color: '#6B7280' };
  };

  const getPriorityInfo = (priority: QualityTaskPriority) => {
    return PRIORITIES.find(p => p.value === priority) || { label: priority, color: '#6B7280' };
  };

  const renderScheduleCard = (schedule: QualityTaskSchedule) => {
    const taskType = getTaskTypeInfo(schedule.task_type);
    const priority = getPriorityInfo(schedule.priority);

    return (
      <View
        key={schedule.id}
        style={[
          styles.scheduleCard,
          { 
            backgroundColor: colors.surface, 
            borderColor: colors.border,
            opacity: schedule.is_active ? 1 : 0.6,
          }
        ]}
      >
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleHeaderLeft}>
            <Text style={[styles.scheduleName, { color: colors.text }]} numberOfLines={1}>
              {schedule.schedule_name}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: taskType.color + '20' }]}>
                <Text style={[styles.typeText, { color: taskType.color }]}>{taskType.label}</Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: priority.color + '20' }]}>
                <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
              </View>
            </View>
          </View>
          <Pressable
            style={[
              styles.activeToggle,
              { backgroundColor: schedule.is_active ? '#10B981' + '20' : colors.backgroundSecondary }
            ]}
            onPress={() => handleToggleActive(schedule)}
          >
            {schedule.is_active ? (
              <Play size={16} color="#10B981" />
            ) : (
              <Pause size={16} color={colors.textSecondary} />
            )}
          </Pressable>
        </View>

        <View style={styles.scheduleDetails}>
          <View style={styles.detailItem}>
            <Repeat size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {getFrequencyLabel(schedule.frequency)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {schedule.start_time}
              {schedule.end_time && ` - ${schedule.end_time}`}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Timer size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              ±{schedule.grace_period_before_minutes} min window
            </Text>
          </View>
        </View>

        {schedule.location && (
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textTertiary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {schedule.location}
              {schedule.line_name && ` • ${schedule.line_name}`}
            </Text>
          </View>
        )}

        {schedule.days_of_week && schedule.days_of_week.length > 0 && (
          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map(day => (
              <View
                key={day.value}
                style={[
                  styles.dayIndicator,
                  { 
                    backgroundColor: schedule.days_of_week?.includes(day.value) 
                      ? colors.primary + '20' 
                      : colors.backgroundSecondary,
                  }
                ]}
              >
                <Text style={[
                  styles.dayText,
                  { 
                    color: schedule.days_of_week?.includes(day.value) 
                      ? colors.primary 
                      : colors.textTertiary,
                  }
                ]}>
                  {day.label[0]}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.scheduleFooter}>
          <View style={styles.notificationIcons}>
            {schedule.notification_settings.notify_on_available && (
              <Bell size={14} color="#10B981" />
            )}
            {schedule.requires_sign_off && (
              <CheckCircle2 size={14} color="#8B5CF6" />
            )}
          </View>
          <Text style={[styles.scheduleNumber, { color: colors.textTertiary }]}>
            {schedule.schedule_number}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
            <Calendar size={32} color="#8B5CF6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Task Schedule Setup</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Configure scheduled quality checks with time windows and reminders
          </Text>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{scheduleStats.active}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#3B82F6' }]}>{scheduleStats.hourly}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Hourly</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{scheduleStats.daily}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Daily</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>{scheduleStats.inactive}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Inactive</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          {[
            { value: true, label: 'Active' },
            { value: false, label: 'Inactive' },
            { value: null, label: 'All' },
          ].map(filter => (
            <Pressable
              key={String(filter.value)}
              style={[
                styles.filterChip,
                { 
                  backgroundColor: filterActive === filter.value ? colors.primary : colors.surface,
                  borderColor: filterActive === filter.value ? colors.primary : colors.border,
                }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterActive(filter.value);
              }}
            >
              <Text style={[
                styles.filterText,
                { color: filterActive === filter.value ? '#FFF' : colors.text }
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.scheduleList}>
          {filteredSchedules.map(schedule => renderScheduleCard(schedule))}
        </View>

        {filteredSchedules.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Schedules</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Create a new task schedule to get started.
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed ? 0.8 : 1 }
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          resetForm();
          setShowNewScheduleModal(true);
        }}
      >
        <Plus size={24} color="#FFF" />
      </Pressable>

      <Modal
        visible={showNewScheduleModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewScheduleModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowNewScheduleModal(false)} style={styles.modalClose}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Task Schedule</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Schedule Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Hourly Temperature Check - Line 1"
                placeholderTextColor={colors.textTertiary}
                value={newSchedule.schedule_name}
                onChangeText={(text) => setNewSchedule(prev => ({ ...prev, schedule_name: text }))}
              />
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Task Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeGrid}>
                  {TASK_TYPES.map(type => (
                    <Pressable
                      key={type.value}
                      style={[
                        styles.typeOption,
                        { 
                          backgroundColor: newSchedule.task_type === type.value ? type.color + '20' : colors.backgroundSecondary,
                          borderColor: newSchedule.task_type === type.value ? type.color : colors.border,
                        }
                      ]}
                      onPress={() => setNewSchedule(prev => ({ ...prev, task_type: type.value }))}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        { color: newSchedule.task_type === type.value ? type.color : colors.text }
                      ]}>
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Frequency *</Text>
              <View style={styles.frequencyList}>
                {FREQUENCIES.map(freq => (
                  <Pressable
                    key={freq.value}
                    style={[
                      styles.frequencyOption,
                      { 
                        backgroundColor: newSchedule.frequency === freq.value ? colors.primary + '15' : 'transparent',
                        borderColor: newSchedule.frequency === freq.value ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setNewSchedule(prev => ({ ...prev, frequency: freq.value }))}
                  >
                    <View style={[
                      styles.radioOuter,
                      { borderColor: newSchedule.frequency === freq.value ? colors.primary : colors.border }
                    ]}>
                      {newSchedule.frequency === freq.value && (
                        <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                    <View style={styles.frequencyInfo}>
                      <Text style={[styles.frequencyLabel, { color: colors.text }]}>{freq.label}</Text>
                      <Text style={[styles.frequencyDesc, { color: colors.textSecondary }]}>{freq.description}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Priority *</Text>
              <View style={styles.priorityGrid}>
                {PRIORITIES.map(p => (
                  <Pressable
                    key={p.value}
                    style={[
                      styles.priorityOption,
                      { 
                        backgroundColor: newSchedule.priority === p.value ? p.color + '20' : colors.backgroundSecondary,
                        borderColor: newSchedule.priority === p.value ? p.color : colors.border,
                      }
                    ]}
                    onPress={() => setNewSchedule(prev => ({ ...prev, priority: p.value }))}
                  >
                    <Text style={[
                      styles.priorityOptionText,
                      { color: newSchedule.priority === p.value ? p.color : colors.text }
                    ]}>
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Time Settings</Text>
              
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Start Time</Text>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    placeholder="06:00"
                    placeholderTextColor={colors.textTertiary}
                    value={newSchedule.start_time}
                    onChangeText={(text) => setNewSchedule(prev => ({ ...prev, start_time: text }))}
                  />
                </View>
                {newSchedule.frequency === 'hourly' && (
                  <View style={styles.timeField}>
                    <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>End Time</Text>
                    <TextInput
                      style={[styles.timeInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      placeholder="18:00"
                      placeholderTextColor={colors.textTertiary}
                      value={newSchedule.end_time}
                      onChangeText={(text) => setNewSchedule(prev => ({ ...prev, end_time: text }))}
                    />
                  </View>
                )}
              </View>

              <View style={styles.graceRow}>
                <View style={styles.graceField}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Grace Before (min)</Text>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    placeholder="15"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="number-pad"
                    value={newSchedule.grace_period_before}
                    onChangeText={(text) => setNewSchedule(prev => ({ ...prev, grace_period_before: text }))}
                  />
                </View>
                <View style={styles.graceField}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Grace After (min)</Text>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    placeholder="15"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="number-pad"
                    value={newSchedule.grace_period_after}
                    onChangeText={(text) => setNewSchedule(prev => ({ ...prev, grace_period_after: text }))}
                  />
                </View>
              </View>
            </View>

            {(newSchedule.frequency === 'hourly' || newSchedule.frequency === 'daily') && (
              <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Days of Week</Text>
                <View style={styles.daysGrid}>
                  {DAYS_OF_WEEK.map(day => (
                    <Pressable
                      key={day.value}
                      style={[
                        styles.dayOption,
                        { 
                          backgroundColor: newSchedule.days_of_week.includes(day.value) 
                            ? colors.primary 
                            : colors.backgroundSecondary,
                          borderColor: newSchedule.days_of_week.includes(day.value) 
                            ? colors.primary 
                            : colors.border,
                        }
                      ]}
                      onPress={() => toggleDayOfWeek(day.value)}
                    >
                      <Text style={[
                        styles.dayOptionText,
                        { color: newSchedule.days_of_week.includes(day.value) ? '#FFF' : colors.text }
                      ]}>
                        {day.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Location (Optional)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Production Floor"
                placeholderTextColor={colors.textTertiary}
                value={newSchedule.location}
                onChangeText={(text) => setNewSchedule(prev => ({ ...prev, location: text }))}
              />
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border, marginTop: 10 }]}
                placeholder="Line/Equipment Name (optional)"
                placeholderTextColor={colors.textTertiary}
                value={newSchedule.line_name}
                onChangeText={(text) => setNewSchedule(prev => ({ ...prev, line_name: text }))}
              />
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Notifications</Text>
              
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Notify when available</Text>
                  <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                    Alert when task window opens
                  </Text>
                </View>
                <Switch
                  value={newSchedule.notify_on_available}
                  onValueChange={(value) => setNewSchedule(prev => ({ ...prev, notify_on_available: value }))}
                  trackColor={{ false: colors.border, true: colors.primary + '50' }}
                  thumbColor={newSchedule.notify_on_available ? colors.primary : colors.textTertiary}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Notify when due</Text>
                  <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                    Alert at scheduled time
                  </Text>
                </View>
                <Switch
                  value={newSchedule.notify_on_due}
                  onValueChange={(value) => setNewSchedule(prev => ({ ...prev, notify_on_due: value }))}
                  trackColor={{ false: colors.border, true: colors.primary + '50' }}
                  thumbColor={newSchedule.notify_on_due ? colors.primary : colors.textTertiary}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Requires sign-off</Text>
                  <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                    Supervisor approval needed
                  </Text>
                </View>
                <Switch
                  value={newSchedule.requires_sign_off}
                  onValueChange={(value) => setNewSchedule(prev => ({ ...prev, requires_sign_off: value }))}
                  trackColor={{ false: colors.border, true: '#8B5CF6' + '50' }}
                  thumbColor={newSchedule.requires_sign_off ? '#8B5CF6' : colors.textTertiary}
                />
              </View>

              <View style={styles.lateWarningRow}>
                <Text style={[styles.lateWarningLabel, { color: colors.textSecondary }]}>
                  Warn before late (minutes):
                </Text>
                <TextInput
                  style={[styles.lateWarningInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="5"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  value={newSchedule.notify_before_late_minutes}
                  onChangeText={(text) => setNewSchedule(prev => ({ ...prev, notify_before_late_minutes: text }))}
                />
              </View>
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Instructions (Optional)</Text>
              <TextInput
                style={[styles.textAreaInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Step-by-step instructions for completing this task..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={newSchedule.instructions}
                onChangeText={(text) => setNewSchedule(prev => ({ ...prev, instructions: text }))}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: '#8B5CF6', opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={handleCreateSchedule}
            >
              <Calendar size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Create Schedule</Text>
            </Pressable>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>
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
    fontSize: 14,
    textAlign: 'center' as const,
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
  },
  statItem: {
    alignItems: 'center' as const,
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  scheduleList: {
    gap: 12,
  },
  scheduleCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  scheduleHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  scheduleHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  scheduleName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  activeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scheduleDetails: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12,
  },
  daysRow: {
    flexDirection: 'row' as const,
    gap: 4,
    marginBottom: 10,
  },
  dayIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dayText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  scheduleFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB20',
  },
  notificationIcons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  scheduleNumber: {
    fontSize: 11,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    position: 'absolute' as const,
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
  modalClose: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  textInput: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  textAreaInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
  },
  typeGrid: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  frequencyList: {
    gap: 8,
  },
  frequencyOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  frequencyInfo: {
    flex: 1,
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  frequencyDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  priorityGrid: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  timeRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 12,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  timeInput: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    borderWidth: 1,
    textAlign: 'center' as const,
  },
  graceRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  graceField: {
    flex: 1,
  },
  daysGrid: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  dayOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
  },
  dayOptionText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  switchRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  switchDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  lateWarningRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB20',
  },
  lateWarningLabel: {
    fontSize: 13,
  },
  lateWarningInput: {
    width: 60,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    borderWidth: 1,
    textAlign: 'center' as const,
  },
  submitButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalBottomPadding: {
    height: 40,
  },
});
