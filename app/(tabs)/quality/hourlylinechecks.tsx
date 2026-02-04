import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseQualityTasks, QualityTask, ReminderStatus } from '@/hooks/useSupabaseQualityTasks';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Timer,
  Thermometer,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertCircle,
  Bell,
  Calendar,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function HourlyLineChecksScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<QualityTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const {
    todaysTasks,
    getTaskReminderStatus,
    getReminderMessage,
    startTask,
    completeTask,
    refetch,
    isLoading,
  } = useSupabaseQualityTasks();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const scheduledTasks = useMemo(() => {
    return todaysTasks.filter(t => 
      t.task_type === 'temp_check' || t.task_type === 'line_check'
    ).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  }, [todaysTasks]);

  const tasksByStatus = useMemo(() => {
    const available: QualityTask[] = [];
    const upcoming: QualityTask[] = [];
    const completed: QualityTask[] = [];
    const missed: QualityTask[] = [];

    scheduledTasks.forEach(task => {
      if (task.status === 'completed') {
        completed.push(task);
      } else if (task.status === 'missed' || task.status === 'skipped') {
        missed.push(task);
      } else {
        const status = getTaskReminderStatus(task);
        if (status === 'can_start' || status === 'due_now' || status === 'almost_late') {
          available.push(task);
        } else if (status === 'overdue') {
          missed.push(task);
        } else {
          upcoming.push(task);
        }
      }
    });

    return { available, upcoming, completed, missed };
  }, [scheduledTasks, getTaskReminderStatus, currentTime]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refetch]);

  const getStatusColor = (status: ReminderStatus): string => {
    switch (status) {
      case 'can_start': return '#10B981';
      case 'due_now': return '#F59E0B';
      case 'almost_late': return '#EF4444';
      case 'overdue': return '#DC2626';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: ReminderStatus) => {
    switch (status) {
      case 'can_start': return Play;
      case 'due_now': return Bell;
      case 'almost_late': return AlertTriangle;
      case 'overdue': return AlertCircle;
      default: return Clock;
    }
  };

  const getStatusLabel = (status: ReminderStatus): string => {
    switch (status) {
      case 'can_start': return 'Available Now';
      case 'due_now': return 'Due Now';
      case 'almost_late': return '5 min left!';
      case 'overdue': return 'Overdue';
      case 'upcoming': return 'Upcoming';
      default: return 'Scheduled';
    }
  };

  const handleStartTask = useCallback(async (task: QualityTask) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startTask({
        id: task.id,
        startedBy: 'Current User',
        startedById: 'USER001',
      });
      
      const initialChecklist: Record<string, boolean> = {};
      task.checklist_items.forEach(item => {
        initialChecklist[item.id] = item.completed;
      });
      setChecklistState(initialChecklist);
      setParameterValues({});
      setNotes('');
      setSelectedTask(task);
      setShowTaskModal(true);
    } catch (error) {
      console.error('[HourlyLineChecks] Error starting task:', error);
      Alert.alert('Error', 'Failed to start task. Please try again.');
    }
  }, [startTask]);

  const handleCompleteTask = useCallback(async () => {
    if (!selectedTask) return;

    const allChecklistComplete = selectedTask.checklist_items.every(
      item => !item.required || checklistState[item.id]
    );

    const allParametersEntered = (selectedTask as any).parameters_to_record?.every(
      (param: any) => !param.required || parameterValues[param.id]
    ) ?? true;

    if (!allChecklistComplete) {
      Alert.alert('Incomplete', 'Please complete all required checklist items.');
      return;
    }

    if (!allParametersEntered) {
      Alert.alert('Incomplete', 'Please enter all required parameters.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const recorded_parameters = Object.entries(parameterValues).map(([id, value]) => {
        const param = (selectedTask as any).parameters_to_record?.find((p: any) => p.id === id);
        const numValue = parseFloat(value);
        const inSpec = param ? 
          (param.min_value === null || numValue >= param.min_value) &&
          (param.max_value === null || numValue <= param.max_value) : true;
        
        return {
          id,
          name: param?.name || id,
          value: numValue,
          unit: param?.unit || '',
          in_spec: inSpec,
          recorded_at: new Date().toISOString(),
        };
      });

      const hasOutOfSpec = recorded_parameters.some(p => !p.in_spec);
      const result = hasOutOfSpec ? 'fail' : 'pass';

      await completeTask({
        id: selectedTask.id,
        completedBy: 'Current User',
        completedById: 'USER001',
        result,
        checklist_items: selectedTask.checklist_items.map(item => ({
          ...item,
          completed: checklistState[item.id] || false,
        })),
        recorded_parameters,
        ncr_required: hasOutOfSpec,
        notes: notes || undefined,
      });

      setShowTaskModal(false);
      setSelectedTask(null);
      
      if (hasOutOfSpec) {
        Alert.alert(
          'Out of Spec Readings',
          'One or more readings were out of specification. An NCR may be required.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[HourlyLineChecks] Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    }
  }, [selectedTask, checklistState, parameterValues, notes, completeTask]);

  const toggleChecklist = useCallback((itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecklistState(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }, []);

  const toggleTaskExpand = useCallback((taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedTaskId(prev => prev === taskId ? null : taskId);
  }, []);

  const renderTaskCard = (task: QualityTask, showActions: boolean = true) => {
    const status = getTaskReminderStatus(task);
    const statusColor = getStatusColor(status);
    const StatusIcon = getStatusIcon(status);
    const isExpanded = expandedTaskId === task.id;
    const isCompleted = task.status === 'completed';
    const isMissed = task.status === 'missed' || status === 'overdue';

    return (
      <View
        key={task.id}
        style={[
          styles.taskCard,
          { 
            backgroundColor: colors.surface, 
            borderColor: isCompleted ? '#10B981' : isMissed ? '#EF4444' : statusColor,
            borderLeftWidth: 4,
          },
        ]}
      >
        <Pressable
          style={styles.taskHeader}
          onPress={() => toggleTaskExpand(task.id)}
        >
          <View style={styles.taskHeaderLeft}>
            <View style={[styles.timeBox, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.timeText, { color: colors.text }]}>{task.scheduled_time}</Text>
            </View>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>
                {task.title}
              </Text>
              <Text style={[styles.taskMeta, { color: colors.textSecondary }]}>
                Window: {task.window_start} - {task.window_end}
              </Text>
            </View>
          </View>
          <View style={styles.taskHeaderRight}>
            {isCompleted ? (
              <View style={[styles.statusBadge, { backgroundColor: '#10B981' + '20' }]}>
                <CheckCircle2 size={14} color="#10B981" />
                <Text style={[styles.statusText, { color: '#10B981' }]}>Done</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <StatusIcon size={14} color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {getStatusLabel(status)}
                </Text>
              </View>
            )}
            {isExpanded ? (
              <ChevronUp size={20} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={colors.textSecondary} />
            )}
          </View>
        </Pressable>

        {isExpanded && (
          <View style={[styles.taskDetails, { borderTopColor: colors.border }]}>
            {task.line_name && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Line:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{task.line_name}</Text>
              </View>
            )}
            {task.location && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{task.location}</Text>
              </View>
            )}
            {task.description && (
              <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                {task.description}
              </Text>
            )}

            {isCompleted && task.recorded_parameters.length > 0 && (
              <View style={styles.recordedParams}>
                <Text style={[styles.paramsTitle, { color: colors.text }]}>Recorded Values:</Text>
                {task.recorded_parameters.map((param, idx) => (
                  <View key={idx} style={styles.paramRow}>
                    <Text style={[styles.paramName, { color: colors.textSecondary }]}>
                      {param.name}:
                    </Text>
                    <Text style={[
                      styles.paramValue, 
                      { color: param.in_spec ? '#10B981' : '#EF4444' }
                    ]}>
                      {param.value} {param.unit}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {showActions && !isCompleted && !isMissed && (
              <Pressable
                style={({ pressed }) => [
                  styles.startButton,
                  { backgroundColor: statusColor, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => handleStartTask(task)}
              >
                <Play size={18} color="#FFF" />
                <Text style={styles.startButtonText}>Start Check</Text>
              </Pressable>
            )}

            {isMissed && !isCompleted && (
              <View style={[styles.missedBanner, { backgroundColor: '#EF4444' + '15' }]}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={[styles.missedText, { color: '#EF4444' }]}>
                  This check was missed. Contact supervisor if needed.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderSection = (title: string, tasks: QualityTask[], icon: React.ComponentType<any>, iconColor: string, showActions: boolean = true) => {
    if (tasks.length === 0) return null;
    const IconComp = icon;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <IconComp size={18} color={iconColor} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          <View style={[styles.countBadge, { backgroundColor: iconColor + '20' }]}>
            <Text style={[styles.countText, { color: iconColor }]}>{tasks.length}</Text>
          </View>
        </View>
        {tasks.map(task => renderTaskCard(task, showActions))}
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
          <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' + '20' }]}>
            <Thermometer size={32} color="#3B82F6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Hourly Line Checks</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Scheduled quality checks with time windows
          </Text>
          <View style={styles.currentTimeRow}>
            <Clock size={14} color={colors.textTertiary} />
            <Text style={[styles.currentTime, { color: colors.textTertiary }]}>
              Current Time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
                {tasksByStatus.available.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Available</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>
                {tasksByStatus.upcoming.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Upcoming</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {tasksByStatus.completed.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Completed</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                {tasksByStatus.missed.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Missed</Text>
            </View>
          </View>
        </View>

        {renderSection('Action Required', tasksByStatus.available, Bell, '#F59E0B', true)}
        {renderSection('Upcoming Checks', tasksByStatus.upcoming, Calendar, '#3B82F6', false)}
        {renderSection('Completed', tasksByStatus.completed, CheckCircle2, '#10B981', false)}
        {renderSection('Missed', tasksByStatus.missed, AlertCircle, '#EF4444', false)}

        {scheduledTasks.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Checks Scheduled</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              There are no hourly checks scheduled for today.
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showTaskModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowTaskModal(false)} style={styles.modalClose}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedTask?.title}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedTask && (
              <>
                <View style={[styles.modalSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Task Details</Text>
                  <View style={styles.modalDetailRow}>
                    <Text style={[styles.modalDetailLabel, { color: colors.textSecondary }]}>Time Window:</Text>
                    <Text style={[styles.modalDetailValue, { color: colors.text }]}>
                      {selectedTask.window_start} - {selectedTask.window_end}
                    </Text>
                  </View>
                  {selectedTask.line_name && (
                    <View style={styles.modalDetailRow}>
                      <Text style={[styles.modalDetailLabel, { color: colors.textSecondary }]}>Line:</Text>
                      <Text style={[styles.modalDetailValue, { color: colors.text }]}>{selectedTask.line_name}</Text>
                    </View>
                  )}
                  {selectedTask.instructions && (
                    <Text style={[styles.instructions, { color: colors.textSecondary }]}>
                      {selectedTask.instructions}
                    </Text>
                  )}
                </View>

                {selectedTask.checklist_items.length > 0 && (
                  <View style={[styles.modalSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Checklist</Text>
                    {selectedTask.checklist_items.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.checklistItem}
                        onPress={() => toggleChecklist(item.id)}
                      >
                        <View style={[
                          styles.checkbox,
                          { 
                            borderColor: checklistState[item.id] ? '#10B981' : colors.border,
                            backgroundColor: checklistState[item.id] ? '#10B981' : 'transparent',
                          }
                        ]}>
                          {checklistState[item.id] && <Check size={14} color="#FFF" />}
                        </View>
                        <Text style={[
                          styles.checklistText,
                          { 
                            color: colors.text,
                            textDecorationLine: checklistState[item.id] ? 'line-through' : 'none',
                          }
                        ]}>
                          {item.item}
                          {item.required && <Text style={{ color: '#EF4444' }}> *</Text>}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {(selectedTask as any).parameters_to_record?.length > 0 && (
                  <View style={[styles.modalSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Record Parameters</Text>
                    {(selectedTask as any).parameters_to_record.map((param: any) => {
                      const value = parameterValues[param.id];
                      const numValue = value ? parseFloat(value) : null;
                      const isOutOfSpec = numValue !== null && (
                        (param.min_value !== null && numValue < param.min_value) ||
                        (param.max_value !== null && numValue > param.max_value)
                      );

                      return (
                        <View key={param.id} style={styles.parameterInput}>
                          <View style={styles.parameterHeader}>
                            <Text style={[styles.parameterLabel, { color: colors.text }]}>
                              {param.name}
                              {param.required && <Text style={{ color: '#EF4444' }}> *</Text>}
                            </Text>
                            {param.min_value !== null && param.max_value !== null && (
                              <Text style={[styles.parameterRange, { color: colors.textTertiary }]}>
                                Range: {param.min_value} - {param.max_value} {param.unit}
                              </Text>
                            )}
                          </View>
                          <View style={styles.inputRow}>
                            <TextInput
                              style={[
                                styles.parameterTextInput,
                                { 
                                  backgroundColor: colors.backgroundSecondary,
                                  color: colors.text,
                                  borderColor: isOutOfSpec ? '#EF4444' : colors.border,
                                }
                              ]}
                              placeholder={`Enter ${param.name.toLowerCase()}`}
                              placeholderTextColor={colors.textTertiary}
                              keyboardType="decimal-pad"
                              value={value || ''}
                              onChangeText={(text) => setParameterValues(prev => ({
                                ...prev,
                                [param.id]: text,
                              }))}
                            />
                            <Text style={[styles.unitText, { color: colors.textSecondary }]}>
                              {param.unit}
                            </Text>
                          </View>
                          {isOutOfSpec && (
                            <View style={styles.outOfSpecWarning}>
                              <AlertTriangle size={14} color="#EF4444" />
                              <Text style={styles.outOfSpecText}>Out of specification!</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={[styles.modalSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Notes (Optional)</Text>
                  <TextInput
                    style={[
                      styles.notesInput,
                      { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }
                    ]}
                    placeholder="Add any observations or notes..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.completeButton,
                    { opacity: pressed ? 0.8 : 1 }
                  ]}
                  onPress={handleCompleteTask}
                >
                  <CheckCircle2 size={20} color="#FFF" />
                  <Text style={styles.completeButtonText}>Complete Check</Text>
                </Pressable>

                <View style={styles.modalBottomPadding} />
              </>
            )}
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
    marginBottom: 12,
  },
  currentTimeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  currentTime: {
    fontSize: 13,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
  },
  summaryItem: {
    alignItems: 'center' as const,
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  taskCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden' as const,
  },
  taskHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
  },
  taskHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  timeBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  taskMeta: {
    fontSize: 12,
  },
  taskHeaderRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  taskDetails: {
    padding: 14,
    borderTopWidth: 1,
  },
  detailRow: {
    flexDirection: 'row' as const,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    width: 70,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  taskDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  recordedParams: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paramsTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  paramRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  paramName: {
    fontSize: 13,
  },
  paramValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  startButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  missedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  missedText: {
    fontSize: 13,
    flex: 1,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
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
    height: 32,
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
    flex: 1,
    textAlign: 'center' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 8,
  },
  modalDetailLabel: {
    fontSize: 14,
  },
  modalDetailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  instructions: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  checklistItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  checklistText: {
    fontSize: 14,
    flex: 1,
  },
  parameterInput: {
    marginBottom: 16,
  },
  parameterHeader: {
    marginBottom: 8,
  },
  parameterLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  parameterRange: {
    fontSize: 12,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  parameterTextInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  unitText: {
    fontSize: 14,
    width: 40,
  },
  outOfSpecWarning: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 6,
  },
  outOfSpecText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500' as const,
  },
  notesInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    borderWidth: 1,
  },
  completeButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalBottomPadding: {
    height: 40,
  },
});
