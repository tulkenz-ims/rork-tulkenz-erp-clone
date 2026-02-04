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
  ClipboardList,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  User,
  Plus,
  Filter,
  ChevronRight,
  Play,
  Pause,
  CheckCheck,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseSanitation, SanitationTask, SanitationTaskStatus, SanitationArea } from '@/hooks/useSupabaseSanitation';
import { useAuth } from '@/contexts/AuthContext';
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

const STATUS_CONFIG: Record<SanitationTaskStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: '#F59E0B', bgColor: '#F59E0B15' },
  in_progress: { label: 'In Progress', color: '#3B82F6', bgColor: '#3B82F615' },
  completed: { label: 'Completed', color: '#10B981', bgColor: '#10B98115' },
  skipped: { label: 'Skipped', color: '#6B7280', bgColor: '#6B728015' },
  overdue: { label: 'Overdue', color: '#EF4444', bgColor: '#EF444415' },
};

export default function DailyTasksScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { 
    tasks, 
    getTodaysTasks,
    updateTask, 
    completeTask,
    createTask,
    generateTaskNumber,
    refetch, 
    isLoading 
  } = useSupabaseSanitation();

  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<SanitationTaskStatus | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<SanitationTask | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskArea, setNewTaskArea] = useState<SanitationArea>('restroom');
  const [newTaskLocation, setNewTaskLocation] = useState('');

  const todaysTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let filtered = tasks.filter(t => 
      t.task_type === 'daily' && 
      (t.scheduled_date === today || t.status === 'in_progress')
    );
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    
    return filtered.sort((a, b) => {
      const statusOrder: Record<SanitationTaskStatus, number> = {
        overdue: 0,
        in_progress: 1,
        pending: 2,
        completed: 3,
        skipped: 4,
      };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [tasks, filterStatus]);

  const taskStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const dailyTasks = tasks.filter(t => t.task_type === 'daily' && t.scheduled_date === today);
    return {
      total: dailyTasks.length,
      completed: dailyTasks.filter(t => t.status === 'completed').length,
      inProgress: dailyTasks.filter(t => t.status === 'in_progress').length,
      pending: dailyTasks.filter(t => t.status === 'pending').length,
      overdue: dailyTasks.filter(t => t.status === 'overdue').length,
    };
  }, [tasks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refetch]);

  const handleStartTask = useCallback(async (task: SanitationTask) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateTask({
        id: task.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        assigned_to: user?.displayName || task.assigned_to,
        assigned_to_id: user?.id || task.assigned_to_id,
      });
      Alert.alert('Task Started', `Started: ${task.title}`);
    } catch (error) {
      console.error('[DailyTasks] Start error:', error);
      Alert.alert('Error', 'Failed to start task');
    }
  }, [updateTask, user]);

  const handleCompleteTask = useCallback(async (task: SanitationTask) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await completeTask({
        id: task.id,
        completedBy: user?.displayName || 'Unknown',
        completedById: user?.id,
        result: 'pass',
      });
      Alert.alert('Task Completed', `Completed: ${task.title}`);
    } catch (error) {
      console.error('[DailyTasks] Complete error:', error);
      Alert.alert('Error', 'Failed to complete task');
    }
  }, [completeTask, user]);

  const handleAddTask = useCallback(async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Missing Information', 'Please enter a task title.');
      return;
    }

    try {
      await createTask({
        task_number: generateTaskNumber(),
        task_type: 'daily',
        status: 'pending',
        area: newTaskArea,
        location: newTaskLocation || 'Not specified',
        facility_id: null,
        title: newTaskTitle,
        description: null,
        instructions: null,
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: null,
        due_date: new Date().toISOString().split('T')[0],
        assigned_to: null,
        assigned_to_id: null,
        assigned_crew: null,
        started_at: null,
        completed_at: null,
        completed_by: null,
        completed_by_id: null,
        duration_minutes: null,
        result: null,
        checklist_items: [],
        supplies_used: [],
        issues_found: null,
        corrective_action: null,
        photos: [],
        notes: null,
        verified_by: null,
        verified_by_id: null,
        verified_at: null,
        recurring: true,
        recurrence_pattern: 'daily',
        parent_task_id: null,
      });

      setShowAddModal(false);
      setNewTaskTitle('');
      setNewTaskLocation('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Task added successfully');
    } catch (error) {
      console.error('[DailyTasks] Add error:', error);
      Alert.alert('Error', 'Failed to add task');
    }
  }, [newTaskTitle, newTaskArea, newTaskLocation, createTask, generateTaskNumber]);

  const renderTaskCard = (task: SanitationTask) => {
    const statusConfig = STATUS_CONFIG[task.status];
    
    return (
      <Pressable
        key={task.id}
        style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setSelectedTask(task)}
      >
        <View style={styles.taskHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <Text style={[styles.taskTime, { color: colors.textSecondary }]}>
            {task.scheduled_time || 'Anytime'}
          </Text>
        </View>
        
        <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
        
        <View style={styles.taskMeta}>
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{task.location}</Text>
          </View>
          {task.assigned_to && (
            <View style={styles.metaItem}>
              <User size={14} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{task.assigned_to}</Text>
            </View>
          )}
        </View>

        <View style={styles.taskActions}>
          {task.status === 'pending' && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => handleStartTask(task)}
            >
              <Play size={14} color="#FFF" />
              <Text style={styles.actionButtonText}>Start</Text>
            </Pressable>
          )}
          {task.status === 'in_progress' && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
              onPress={() => handleCompleteTask(task)}
            >
              <CheckCheck size={14} color="#FFF" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </Pressable>
          )}
          {task.status === 'completed' && (
            <View style={styles.completedInfo}>
              <CheckCircle2 size={14} color="#10B981" />
              <Text style={[styles.completedText, { color: '#10B981' }]}>
                {task.completed_at ? new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Done'}
              </Text>
            </View>
          )}
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
            <ClipboardList size={28} color="#8B5CF6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Daily Sanitation Tasks</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{taskStats.completed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{taskStats.inProgress}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{taskStats.pending}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{taskStats.overdue}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overdue</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'pending', 'in_progress', 'completed', 'overdue'] as const).map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  filterStatus === status && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
                ]}
                onPress={() => {
                  setFilterStatus(status);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: filterStatus === status ? '#FFF' : colors.text },
                ]}>
                  {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {todaysTasks.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ClipboardList size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Tasks Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filterStatus === 'all' 
                ? 'No daily tasks scheduled for today.' 
                : `No ${STATUS_CONFIG[filterStatus as SanitationTaskStatus].label.toLowerCase()} tasks.`}
            </Text>
          </View>
        ) : (
          todaysTasks.map(renderTaskCard)
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Daily Task</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Task Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter task title"
              placeholderTextColor={colors.textTertiary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Area</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.areaSelector}>
              {(Object.keys(AREA_LABELS) as SanitationArea[]).map((area) => (
                <Pressable
                  key={area}
                  style={[
                    styles.areaChip,
                    { borderColor: colors.border },
                    newTaskArea === area && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
                  ]}
                  onPress={() => setNewTaskArea(area)}
                >
                  <Text style={[
                    styles.areaChipText,
                    { color: newTaskArea === area ? '#FFF' : colors.text },
                  ]}>
                    {AREA_LABELS[area]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter location (optional)"
              placeholderTextColor={colors.textTertiary}
              value={newTaskLocation}
              onChangeText={setNewTaskLocation}
            />

            <Pressable
              style={[styles.addButton, { backgroundColor: '#8B5CF6' }]}
              onPress={handleAddTask}
            >
              <Text style={styles.addButtonText}>Add Task</Text>
            </Pressable>
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
    fontSize: 14,
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
  filterRow: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  taskCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  taskTime: {
    fontSize: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  taskMeta: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  taskActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  completedInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  completedText: {
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
  areaSelector: {
    marginBottom: 16,
  },
  areaChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  areaChipText: {
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
  bottomPadding: {
    height: 80,
  },
});
