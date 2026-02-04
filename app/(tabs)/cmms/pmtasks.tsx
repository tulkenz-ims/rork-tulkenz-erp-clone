import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import {
  Search,
  Plus,
  ClipboardList,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Circle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePMSchedulesQuery, type ExtendedPMSchedule } from '@/hooks/useSupabasePMSchedules';
import * as Haptics from 'expo-haptics';

interface TaskTemplate {
  id: string;
  description: string;
  category: string;
  required: boolean;
  estimatedMinutes: number;
}

const TASK_CATEGORIES = [
  'Inspection',
  'Lubrication',
  'Cleaning',
  'Calibration',
  'Replacement',
  'Testing',
  'Safety Check',
  'Documentation',
  'Other',
];



export default function PMTasksScreen() {
  const { colors } = useTheme();
  const { data: pmSchedules = [], refetch } = usePMSchedulesQuery();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);

  const derivedTaskTemplates = useMemo(() => {
    const templatesFromPM: TaskTemplate[] = [];
    const seenDescriptions = new Set<string>();
    
    pmSchedules.forEach((pm: ExtendedPMSchedule) => {
      const tasks = ((pm as unknown as { tasks?: Array<{ id: string; description: string; required: boolean; order: number }> }).tasks || []);
      tasks.forEach(task => {
        const descLower = task.description.toLowerCase();
        if (!seenDescriptions.has(descLower)) {
          seenDescriptions.add(descLower);
          const category = inferCategory(task.description);
          templatesFromPM.push({
            id: `derived-${task.id}`,
            description: task.description,
            category,
            required: task.required,
            estimatedMinutes: 15,
          });
        }
      });
    });
    
    return templatesFromPM;
  }, [pmSchedules]);

  useEffect(() => {
    if (derivedTaskTemplates.length > 0 && taskTemplates.length === 0) {
      setTaskTemplates(derivedTaskTemplates);
    }
  }, [derivedTaskTemplates]);

  const inferCategory = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('inspect') || desc.includes('check') || desc.includes('verify')) return 'Inspection';
    if (desc.includes('lubricat') || desc.includes('oil') || desc.includes('grease')) return 'Lubrication';
    if (desc.includes('clean') || desc.includes('filter')) return 'Cleaning';
    if (desc.includes('calibrat')) return 'Calibration';
    if (desc.includes('replac')) return 'Replacement';
    if (desc.includes('test')) return 'Testing';
    if (desc.includes('safety') || desc.includes('emergency')) return 'Safety Check';
    if (desc.includes('record') || desc.includes('document')) return 'Documentation';
    return 'Other';
  };
  
  const [newTask, setNewTask] = useState({
    description: '',
    category: 'Inspection',
    required: true,
    estimatedMinutes: 15,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const filteredTasks = useMemo(() => {
    return taskTemplates.filter(task => {
      const matchesSearch = searchQuery === '' ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [taskTemplates, searchQuery, categoryFilter]);

  const taskUsageCount = useMemo(() => {
    const counts: Record<string, number> = {};
    pmSchedules.forEach((pm: ExtendedPMSchedule) => {
      const pmWithTasks = pm as unknown as { tasks?: Array<{ id: string; description: string; required: boolean; order: number }> };
      const tasks = pmWithTasks.tasks || [];
      tasks.forEach(task => {
        const matchingTemplate = taskTemplates.find(t => 
          t.description.toLowerCase() === task.description.toLowerCase()
        );
        if (matchingTemplate) {
          counts[matchingTemplate.id] = (counts[matchingTemplate.id] || 0) + 1;
        }
      });
    });
    return counts;
  }, [pmSchedules, taskTemplates]);

  const stats = useMemo(() => ({
    total: taskTemplates.length,
    required: taskTemplates.filter(t => t.required).length,
    categories: new Set(taskTemplates.map(t => t.category)).size,
    inUse: Object.keys(taskUsageCount).length,
  }), [taskTemplates, taskUsageCount]);

  const handleAddTask = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewTask({
      description: '',
      category: 'Inspection',
      required: true,
      estimatedMinutes: 15,
    });
    setEditingTask(null);
    setShowAddModal(true);
  }, []);

  const handleEditTask = useCallback((task: TaskTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingTask(task);
    setNewTask({
      description: task.description,
      category: task.category,
      required: task.required,
      estimatedMinutes: task.estimatedMinutes,
    });
    setShowAddModal(true);
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task template?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setTaskTemplates(prev => prev.filter(t => t.id !== taskId));
          },
        },
      ]
    );
  }, []);

  const handleSaveTask = useCallback(() => {
    if (!newTask.description.trim()) {
      Alert.alert('Error', 'Please enter a task description');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingTask) {
      setTaskTemplates(prev => prev.map(t => 
        t.id === editingTask.id 
          ? { ...t, ...newTask }
          : t
      ));
    } else {
      const newTaskTemplate: TaskTemplate = {
        id: `tpl-${Date.now()}`,
        ...newTask,
      };
      setTaskTemplates(prev => [...prev, newTaskTemplate]);
    }

    setShowAddModal(false);
    setEditingTask(null);
  }, [newTask, editingTask]);

  const renderTaskCard = useCallback((task: TaskTemplate) => {
    const usageCount = taskUsageCount[task.id] || 0;
    
    return (
      <View
        key={task.id}
        style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskIconContainer}>
            {task.required ? (
              <CheckCircle size={20} color="#10B981" />
            ) : (
              <Circle size={20} color={colors.textSecondary} />
            )}
          </View>
          <View style={styles.taskInfo}>
            <Text style={[styles.taskDescription, { color: colors.text }]}>
              {task.description}
            </Text>
            <View style={styles.taskMeta}>
              <View style={[styles.categoryBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                  {task.category}
                </Text>
              </View>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                ~{task.estimatedMinutes} min
              </Text>
              {usageCount > 0 && (
                <Text style={[styles.usageText, { color: colors.primary }]}>
                  Used in {usageCount} PM{usageCount > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.taskActions}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => handleEditTask(task)}
            >
              <Edit2 size={16} color={colors.text} />
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: '#EF444415' }]}
              onPress={() => handleDeleteTask(task.id)}
            >
              <Trash2 size={16} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }, [colors, taskUsageCount, handleEditTask, handleDeleteTask]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search tasks..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={styles.actionRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <Pressable
            style={[
              styles.categoryChip,
              { 
                backgroundColor: categoryFilter === 'all' ? colors.primary : colors.surface,
                borderColor: categoryFilter === 'all' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setCategoryFilter('all')}
          >
            <Text style={[
              styles.categoryChipText,
              { color: categoryFilter === 'all' ? '#FFFFFF' : colors.text },
            ]}>
              All
            </Text>
          </Pressable>
          {TASK_CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: categoryFilter === cat ? colors.primary : colors.surface,
                  borderColor: categoryFilter === cat ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text style={[
                styles.categoryChipText,
                { color: categoryFilter === cat ? '#FFFFFF' : colors.text },
              ]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddTask}
        >
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.required}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Required</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.categories}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Categories</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.inUse}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Use</Text>
        </View>
      </View>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredTasks.length > 0 ? (
          filteredTasks.map(renderTaskCard)
        ) : (
          <View style={styles.emptyState}>
            <ClipboardList size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Tasks Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create a task template to get started'}
            </Text>
          </View>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowAddModal(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingTask ? 'Edit Task' : 'New Task Template'}
              </Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Task Description *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="Enter task description..."
                  placeholderTextColor={colors.textSecondary}
                  value={newTask.description}
                  onChangeText={(text) => setNewTask(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryOptions}>
                    {TASK_CATEGORIES.map(cat => (
                      <Pressable
                        key={cat}
                        style={[
                          styles.categoryOption,
                          { 
                            backgroundColor: newTask.category === cat ? colors.primary : colors.backgroundSecondary,
                            borderColor: newTask.category === cat ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setNewTask(prev => ({ ...prev, category: cat }))}
                      >
                        <Text style={[
                          styles.categoryOptionText,
                          { color: newTask.category === cat ? '#FFFFFF' : colors.text },
                        ]}>
                          {cat}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Estimated Time (minutes)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="15"
                  placeholderTextColor={colors.textSecondary}
                  value={newTask.estimatedMinutes.toString()}
                  onChangeText={(text) => setNewTask(prev => ({ ...prev, estimatedMinutes: parseInt(text) || 0 }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>Required Task</Text>
                  <Switch
                    value={newTask.required}
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, required: value }))}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <Text style={[styles.formHint, { color: colors.textSecondary }]}>
                  Required tasks must be completed for PM to be marked done
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveTask}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  {editingTask ? 'Save Changes' : 'Add Task'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  categoryScroll: {
    flex: 1,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  taskCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskDescription: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  timeText: {
    fontSize: 11,
  },
  usageText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalBody: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  categoryOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formHint: {
    fontSize: 12,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
