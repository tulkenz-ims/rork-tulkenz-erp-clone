import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Target,
  Plus,
  X,
  CheckCircle2,
  Clock,
  Play,
  Calendar,
  Flag,
  User,
  Trash2,
  ListTodo,
  TrendingUp,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import {
  usePlannerTasksQuery,
  usePlannerStats,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
  type ExtendedPlannerTask,
  type TaskStatus as PlannerTaskStatus,
  type TaskPriority as PlannerTaskPriority,
} from '@/hooks/useSupabasePlanner';
import { useEmployees, type SupabaseEmployee } from '@/hooks/useSupabaseEmployees';
import * as Haptics from 'expo-haptics';

type FilterType = 'all' | 'pending' | 'in_progress' | 'completed';
type Priority = 'low' | 'medium' | 'high' | 'critical';
type Status = 'pending' | 'in_progress' | 'completed' | 'scheduled' | 'on_hold' | 'cancelled' | 'blocked';

interface FormData {
  title: string;
  description: string;
  due_date: string;
  priority: Priority;
  status: Status;
  category: string;
  assigned_to: string;
}

const initialFormData: FormData = {
  title: '',
  description: '',
  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  priority: 'medium',
  status: 'pending',
  category: 'General',
  assigned_to: '',
};

const priorityColors: Record<Priority, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

const statusConfig: Record<Status, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: '#6B7280', label: 'Pending' },
  scheduled: { icon: Calendar, color: '#8B5CF6', label: 'Scheduled' },
  in_progress: { icon: Play, color: '#3B82F6', label: 'In Progress' },
  on_hold: { icon: AlertCircle, color: '#F59E0B', label: 'On Hold' },
  completed: { icon: CheckCircle2, color: '#10B981', label: 'Completed' },
  cancelled: { icon: X, color: '#9CA3AF', label: 'Cancelled' },
  blocked: { icon: AlertCircle, color: '#EF4444', label: 'Blocked' },
};

const categories = ['General', 'Inventory', 'Maintenance', 'Planning', 'Compliance', 'Operations', 'HR', 'Production', 'Quality', 'Safety'];
const priorities: Priority[] = ['low', 'medium', 'high', 'critical'];
const statuses: Status[] = ['pending', 'scheduled', 'in_progress', 'on_hold', 'completed'];

export default function PlannerScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const { canCreate, canEdit, canDelete, canAssign } = useModulePermissions('preventive_maintenance');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ExtendedPlannerTask | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const statusFilter = useMemo(() => {
    if (filter === 'all') return undefined;
    if (filter === 'pending') return ['pending', 'scheduled'] as PlannerTaskStatus[];
    return filter as PlannerTaskStatus;
  }, [filter]);

  const { data: tasks = [], isLoading, refetch, isRefetching } = usePlannerTasksQuery({
    status: statusFilter,
    orderBy: { column: 'due_date', ascending: true },
  });

  const { data: plannerStats } = usePlannerStats();
  const { data: employees = [] } = useEmployees();

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const updateStatusMutation = useUpdateTaskStatus();
  const deleteTaskMutation = useDeleteTask();

  const tasksByPriority = useMemo(() => ({
    high: plannerStats?.byPriority?.high || 0,
    medium: plannerStats?.byPriority?.medium || 0,
    low: plannerStats?.byPriority?.low || 0,
    critical: plannerStats?.byPriority?.critical || 0,
  }), [plannerStats]);

  const completionRate = plannerStats?.completionRate || 0;
  const pendingCount = plannerStats?.pendingTasks || 0;
  const inProgressCount = plannerStats?.inProgressTasks || 0;
  const completedCount = plannerStats?.completedTasks || 0;
  const totalActive = pendingCount + inProgressCount;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleOpenModal = useCallback((item?: ExtendedPlannerTask) => {
    if (item && !canEdit) {
      Alert.alert('Access Denied', 'You do not have permission to edit tasks.');
      return;
    }
    if (!item && !canCreate) {
      Alert.alert('Access Denied', 'You do not have permission to create tasks.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title || '',
        description: item.description || '',
        due_date: item.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: (item.priority || 'medium') as Priority,
        status: (item.status || 'pending') as Status,
        category: item.category || 'General',
        assigned_to: item.assigned_to || '',
      });
    } else {
      setEditingItem(null);
      setFormData(initialFormData);
    }
    setShowModal(true);
  }, [canEdit, canCreate]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(initialFormData);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    const assignee = employees.find((e: SupabaseEmployee) => e.id === formData.assigned_to);
    const assigneeName = assignee ? `${assignee.first_name} ${assignee.last_name}` : undefined;

    try {
      if (editingItem) {
        await updateTaskMutation.mutateAsync({
          id: editingItem.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          due_date: formData.due_date,
          priority: formData.priority as PlannerTaskPriority,
          status: formData.status as PlannerTaskStatus,
          category: formData.category,
          assigned_to: formData.assigned_to || null,
          assigned_to_name: assigneeName || null,
        });
      } else {
        await createTaskMutation.mutateAsync({
          title: formData.title.trim(),
          description: formData.description.trim(),
          due_date: formData.due_date,
          priority: formData.priority as PlannerTaskPriority,
          status: formData.status as PlannerTaskStatus,
          category: formData.category,
          assigned_to: formData.assigned_to || undefined,
          assigned_to_name: assigneeName,
          created_by: user ? `${user.first_name} ${user.last_name}` : 'System',
          created_by_id: user?.id,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleCloseModal();
    } catch (error) {
      console.error('[PlannerScreen] Save error:', error);
      Alert.alert('Error', 'Failed to save task. Please try again.');
    }
  }, [formData, editingItem, employees, user, createTaskMutation, updateTaskMutation, handleCloseModal]);

  const handleStatusChange = useCallback(async (task: ExtendedPlannerTask, newStatus: Status) => {
    if (!canEdit) {
      Alert.alert('Access Denied', 'You do not have permission to update task status.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateStatusMutation.mutateAsync({
        id: task.id,
        status: newStatus as PlannerTaskStatus,
        completedBy: newStatus === 'completed' ? user?.id : undefined,
        completedByName: newStatus === 'completed' && user ? `${user.first_name} ${user.last_name}` : undefined,
      });
    } catch (error) {
      console.error('[PlannerScreen] Status change error:', error);
      Alert.alert('Error', 'Failed to update task status.');
    }
  }, [canEdit, updateStatusMutation, user]);

  const handleDelete = useCallback((task: ExtendedPlannerTask) => {
    if (!canDelete) {
      Alert.alert('Access Denied', 'You do not have permission to delete tasks.');
      return;
    }
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            try {
              await deleteTaskMutation.mutateAsync(task.id);
            } catch (error) {
              console.error('[PlannerScreen] Delete error:', error);
              Alert.alert('Error', 'Failed to delete task.');
            }
          },
        },
      ]
    );
  }, [canDelete, deleteTaskMutation]);

  const getAssigneeName = useCallback((assigneeId: string | null | undefined, assigneeName?: string | null) => {
    if (assigneeName) return assigneeName;
    if (!assigneeId) return 'Unassigned';
    const employee = employees.find((e: SupabaseEmployee) => e.id === assigneeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unassigned';
  }, [employees]);

  const renderFormField = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    options?: { placeholder?: string; multiline?: boolean }
  ) => (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.formInput, 
          { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border },
          options?.multiline && styles.multilineInput,
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={options?.placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 3 : 1}
      />
    </View>
  );

  const renderPickerField = (
    label: string, 
    value: string, 
    options: { value: string; label: string; color?: string }[], 
    onChange: (val: string) => void
  ) => (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.pickerOption,
              { 
                backgroundColor: value === opt.value ? (opt.color || colors.primary) : colors.backgroundSecondary,
                borderColor: value === opt.value ? (opt.color || colors.primary) : colors.border,
              },
            ]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.pickerText, { color: value === opt.value ? '#FFFFFF' : colors.text }]}>{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.overviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.overviewHeader}>
            <View style={[styles.overviewIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Target size={28} color={colors.primary} />
            </View>
            <View style={styles.overviewInfo}>
              <Text style={[styles.overviewTitle, { color: colors.text }]}>Task Planner</Text>
              <Text style={[styles.overviewSubtitle, { color: colors.textSecondary }]}>
                {totalActive} active tasks
              </Text>
            </View>
            <View style={styles.completionBadge}>
              <TrendingUp size={16} color={colors.success} />
              <Text style={[styles.completionText, { color: colors.success }]}>{completionRate}%</Text>
            </View>
          </View>

          <View style={styles.priorityBars}>
            <View style={styles.priorityBar}>
              <View style={styles.priorityBarHeader}>
                <Flag size={12} color={priorityColors.critical} />
                <Text style={[styles.priorityBarLabel, { color: colors.textSecondary }]}>Critical</Text>
                <Text style={[styles.priorityBarCount, { color: colors.text }]}>{tasksByPriority.critical}</Text>
              </View>
              <View style={[styles.priorityBarTrack, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.priorityBarFill, { backgroundColor: priorityColors.critical, width: `${Math.min((tasksByPriority.critical / (plannerStats?.total || 1)) * 100, 100)}%` }]} />
              </View>
            </View>
            <View style={styles.priorityBar}>
              <View style={styles.priorityBarHeader}>
                <Flag size={12} color={priorityColors.high} />
                <Text style={[styles.priorityBarLabel, { color: colors.textSecondary }]}>High</Text>
                <Text style={[styles.priorityBarCount, { color: colors.text }]}>{tasksByPriority.high}</Text>
              </View>
              <View style={[styles.priorityBarTrack, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.priorityBarFill, { backgroundColor: priorityColors.high, width: `${Math.min((tasksByPriority.high / (plannerStats?.total || 1)) * 100, 100)}%` }]} />
              </View>
            </View>
            <View style={styles.priorityBar}>
              <View style={styles.priorityBarHeader}>
                <Flag size={12} color={priorityColors.medium} />
                <Text style={[styles.priorityBarLabel, { color: colors.textSecondary }]}>Medium</Text>
                <Text style={[styles.priorityBarCount, { color: colors.text }]}>{tasksByPriority.medium}</Text>
              </View>
              <View style={[styles.priorityBarTrack, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.priorityBarFill, { backgroundColor: priorityColors.medium, width: `${Math.min((tasksByPriority.medium / (plannerStats?.total || 1)) * 100, 100)}%` }]} />
              </View>
            </View>
            <View style={styles.priorityBar}>
              <View style={styles.priorityBarHeader}>
                <Flag size={12} color={priorityColors.low} />
                <Text style={[styles.priorityBarLabel, { color: colors.textSecondary }]}>Low</Text>
                <Text style={[styles.priorityBarCount, { color: colors.text }]}>{tasksByPriority.low}</Text>
              </View>
              <View style={[styles.priorityBarTrack, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.priorityBarFill, { backgroundColor: priorityColors.low, width: `${Math.min((tasksByPriority.low / (plannerStats?.total || 1)) * 100, 100)}%` }]} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: `${statusConfig.pending.color}15` }]}>
            <Clock size={20} color={statusConfig.pending.color} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{pendingCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: `${statusConfig.in_progress.color}15` }]}>
            <Play size={20} color={statusConfig.in_progress.color} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{inProgressCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: `${statusConfig.completed.color}15` }]}>
            <CheckCircle2 size={20} color={statusConfig.completed.color} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{completedCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
        </View>

        <View style={styles.headerRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(['all', 'pending', 'in_progress', 'completed'] as FilterType[]).map((f) => (
              <Pressable
                key={f}
                style={[
                  styles.filterChip,
                  { backgroundColor: filter === f ? colors.primary : colors.surface, borderColor: colors.border },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(f);
                }}
              >
                <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : colors.textSecondary }]}>
                  {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {canCreate && (
            <Pressable 
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => handleOpenModal()}
            >
              <Plus size={18} color="#FFFFFF" />
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          {isLoading ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 12 }]}>Loading tasks...</Text>
            </View>
          ) : tasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ListTodo size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No tasks found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {filter === 'all' ? 'Create your first task' : `No ${filter.replace('_', ' ')} tasks`}
              </Text>
            </View>
          ) : (
            tasks.map((task) => {
              const taskStatus = (task.status || 'pending') as Status;
              const taskPriority = (task.priority || 'medium') as Priority;
              const statusInfo = statusConfig[taskStatus] || statusConfig.pending;
              const StatusIcon = statusInfo.icon;
              const priorityColor = priorityColors[taskPriority] || priorityColors.medium;
              
              return (
                <Pressable
                  key={task.id}
                  style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => canEdit && handleOpenModal(task)}
                  disabled={!canEdit}
                >
                  <View style={styles.taskHeader}>
                    <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
                    <View style={styles.taskInfo}>
                      <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title || 'Untitled'}</Text>
                      <View style={styles.taskMeta}>
                        <View style={[styles.categoryBadge, { backgroundColor: `${colors.primary}15` }]}>
                          <Text style={[styles.categoryText, { color: colors.primary }]}>{task.category || 'General'}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15` }]}>
                          <StatusIcon size={12} color={statusInfo.color} />
                          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {task.description && (
                    <Text style={[styles.taskDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                      {task.description}
                    </Text>
                  )}

                  <View style={styles.taskFooter}>
                    <View style={styles.taskFooterLeft}>
                      <View style={styles.footerItem}>
                        <Calendar size={12} color={colors.textTertiary} />
                        <Text style={[styles.footerText, { color: colors.textTertiary }]}>{task.due_date || 'No date'}</Text>
                      </View>
                      <View style={styles.footerItem}>
                        <User size={12} color={colors.textTertiary} />
                        <Text style={[styles.footerText, { color: colors.textTertiary }]}>{getAssigneeName(task.assigned_to, task.assigned_to_name)}</Text>
                      </View>
                    </View>
                    <View style={styles.taskActions}>
                      {canEdit && (taskStatus === 'pending' || taskStatus === 'scheduled') && (
                        <Pressable 
                          style={[styles.actionBtn, { backgroundColor: `${statusConfig.in_progress.color}15` }]}
                          onPress={() => handleStatusChange(task, 'in_progress')}
                        >
                          <Play size={14} color={statusConfig.in_progress.color} />
                        </Pressable>
                      )}
                      {canEdit && taskStatus === 'in_progress' && (
                        <Pressable 
                          style={[styles.actionBtn, { backgroundColor: `${statusConfig.completed.color}15` }]}
                          onPress={() => handleStatusChange(task, 'completed')}
                        >
                          <CheckCircle2 size={14} color={statusConfig.completed.color} />
                        </Pressable>
                      )}
                      {canDelete && (
                        <Pressable 
                          style={[styles.actionBtn, { backgroundColor: `${colors.error}15` }]}
                          onPress={() => handleDelete(task)}
                        >
                          <Trash2 size={14} color={colors.error} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView 
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingItem ? 'Edit Task' : 'New Task'}
            </Text>
            <Pressable onPress={handleCloseModal} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {renderFormField('Title *', formData.title, (text) => setFormData(prev => ({ ...prev, title: text })), { placeholder: 'Task title' })}
            {renderFormField('Description', formData.description, (text) => setFormData(prev => ({ ...prev, description: text })), { placeholder: 'Task description', multiline: true })}
            {renderFormField('Due Date', formData.due_date, (text) => setFormData(prev => ({ ...prev, due_date: text })), { placeholder: 'YYYY-MM-DD' })}
            
            {renderPickerField(
              'Priority',
              formData.priority,
              priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1), color: priorityColors[p] })),
              (val) => setFormData(prev => ({ ...prev, priority: val as Priority }))
            )}
            
            {renderPickerField(
              'Status',
              formData.status,
              statuses.map(s => ({ value: s, label: statusConfig[s].label, color: statusConfig[s].color })),
              (val) => setFormData(prev => ({ ...prev, status: val as Status }))
            )}

            {renderPickerField(
              'Category',
              formData.category,
              categories.map(c => ({ value: c, label: c })),
              (val) => setFormData(prev => ({ ...prev, category: val }))
            )}

            {canAssign && (
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Assign To</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                  {employees.map((emp: SupabaseEmployee) => (
                    <Pressable
                      key={emp.id}
                      style={[
                        styles.pickerOption,
                        { 
                          backgroundColor: formData.assigned_to === emp.id ? colors.primary : colors.backgroundSecondary,
                          borderColor: formData.assigned_to === emp.id ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, assigned_to: emp.id }))}
                    >
                      <Text style={[styles.pickerText, { color: formData.assigned_to === emp.id ? '#FFFFFF' : colors.text }]}>
                        {emp.first_name} {emp.last_name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable 
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>{editingItem ? 'Update' : 'Create'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  overviewCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  overviewIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewInfo: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  overviewSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completionText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  priorityBars: {
    gap: 10,
  },
  priorityBar: {
    gap: 4,
  },
  priorityBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityBarLabel: {
    flex: 1,
    fontSize: 12,
  },
  priorityBarCount: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  priorityBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  priorityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    gap: 10,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  taskCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  taskHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityIndicator: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  taskInfo: {
    flex: 1,
    gap: 6,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  taskDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 16,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 16,
  },
  taskFooterLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  formInput: {
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  pickerScroll: {
    flexDirection: 'row',
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
  },
  pickerText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
