import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useWorkOrdersQuery } from '@/hooks/useSupabaseWorkOrders';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Inbox,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  X,
  User,
  MapPin,
  Calendar,
  FileText,
  Camera,
  MessageSquare,
  AlertTriangle,
  ClipboardList,
  Wrench,
  Clock,
  Factory,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useDepartmentTasksQuery, useCompleteDepartmentTask, useStartDepartmentTask, useClearProductionHold } from '@/hooks/useTaskFeedTemplates';
import { useQueryClient } from '@tanstack/react-query';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';
import { getDepartmentColor, getDepartmentName } from '@/constants/organizationCodes';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import WorkOrderCompletionForm from './WorkOrderCompletionForm';
import FormPickerModal from './FormPickerModal';
import PostFormDecisionModal from './PostFormDecisionModal';
import { SignatureVerification, useLogSignature } from '@/hooks/usePinSignature';

interface WorkOrderCompletionData {
  workPerformed: string;
  actionTaken: string;
  completionPhotos: string[];
  partsUsed: string;
  laborHours: string;
  additionalNotes: string;
  rootCause?: string;
  preventiveAction?: string;
}

interface TaskFeedInboxProps {
  departmentCode: string;
  moduleColor?: string;
  onTaskCompleted?: (task: TaskFeedDepartmentTask, moduleHistoryId?: string) => void;
  createModuleHistoryRecord?: (task: TaskFeedDepartmentTask, notes: string) => Promise<string | null>;
  createFullWorkOrder?: (task: TaskFeedDepartmentTask, data: WorkOrderCompletionData) => Promise<string | null>;
  createOpenWorkOrder?: (task: TaskFeedDepartmentTask) => Promise<string | null>;
  maxVisible?: number;
  showHeader?: boolean;
  requiresFullWorkOrder?: boolean;
}

interface PostDetails {
  id: string;
  post_number: string;
  template_name: string;
  form_data: Record<string, any>;
  photo_url?: string;
  notes?: string;
  status: string;
  created_at: string;
  created_by_name: string;
  location_name?: string;
}

const MAINTENANCE_DEPT_CODES = ['1001', '3000', 'MAINT', 'MNT'];

export default function TaskFeedInbox({
  departmentCode,
  moduleColor,
  onTaskCompleted,
  createModuleHistoryRecord,
  createFullWorkOrder,
  createOpenWorkOrder,
  maxVisible = 5,
  showHeader = true,
  requiresFullWorkOrder,
}: TaskFeedInboxProps) {
  const { colors } = useTheme();
  const { user } = useUser();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: workOrders = [] } = useWorkOrdersQuery();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<(TaskFeedDepartmentTask & { post?: PostDetails }) | null>(null);
  const [showPostDetailModal, setShowPostDetailModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showNotInvolved, setShowNotInvolved] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const isMaintenanceDept = requiresFullWorkOrder !== undefined 
    ? requiresFullWorkOrder 
    : MAINTENANCE_DEPT_CODES.includes(departmentCode);

  const accentColor = moduleColor || getDepartmentColor(departmentCode) || colors.primary;

  const { data: rawTasks = [], isLoading, refetch } = useDepartmentTasksQuery({
    departmentCode,
    statusIn: ['pending', 'in_progress'],
  });

  const pendingTasks = useMemo(() => {
    return rawTasks.map((task: any) => ({
      ...task,
      // Map snake_case DB fields to camelCase for component use
      formCompletions: task.form_completions || [],
      suggestedForms: task.suggested_forms || [],
      formsCompleted: task.forms_completed || 0,
      formsSuggested: task.forms_suggested || 0,
      formType: task.form_type || '',
      formRoute: task.form_route || '',
      isProductionHold: task.task_feed_posts?.is_production_hold || false,
      post: task.task_feed_posts ? {
        id: task.task_feed_posts.id,
        post_number: task.task_feed_posts.post_number,
        template_name: task.task_feed_posts.template_name,
        form_data: task.task_feed_posts.form_data || {},
        photo_url: task.task_feed_posts.photo_url,
        notes: task.task_feed_posts.notes,
        status: task.task_feed_posts.status,
        created_at: task.task_feed_posts.created_at,
        created_by_name: task.task_feed_posts.created_by_name,
        location_name: task.task_feed_posts.location_name,
        is_production_hold: task.task_feed_posts.is_production_hold || false,
        isProductionHold: task.task_feed_posts.is_production_hold || false,
        hold_status: task.task_feed_posts.hold_status || 'none',
        holdStatus: task.task_feed_posts.hold_status || 'none',
      } : undefined,
    }));
  }, [rawTasks]);

  const completeMutation = useCompleteDepartmentTask({
    onSuccess: (data) => {
      console.log('[TaskFeedInbox] Task completed successfully:', data.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
    },
    onError: (error) => {
      console.error('[TaskFeedInbox] Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    },
  });

  const startTaskMutation = useStartDepartmentTask({
    onSuccess: (data) => {
      console.log('[TaskFeedInbox] Task started:', data.id);
      refetch();
    },
    onError: (error) => {
      console.error('[TaskFeedInbox] Error starting task:', error);
    },
  });

  const logSignature = useLogSignature({
    onSuccess: (data) => {
      console.log('[TaskFeedInbox] Signature logged:', data.id);
    },
    onError: (error) => {
      console.error('[TaskFeedInbox] Error logging signature:', error);
    },
  });

  const clearHoldMutation = useClearProductionHold({
    onSuccess: (data) => {
      console.log('[TaskFeedInbox] Production hold cleared for post:', data.postNumber);
    },
    onError: (error) => {
      console.error('[TaskFeedInbox] Error clearing hold:', error);
    },
  });

  const visibleTasks = showAllTasks ? pendingTasks : pendingTasks.slice(0, maxVisible);
  const hasMoreTasks = pendingTasks.length > maxVisible;

  const handleStartComplete = useCallback(async (task: TaskFeedDepartmentTask & { post?: PostDetails }) => {
    setSelectedTask(task);
    setCompletionNotes('');
    
    if (isMaintenanceDept) {
      const linkedWO = workOrders.find(wo =>
        (wo.description || '').includes(task.postNumber) ||
        (wo.title || '').includes(task.postNumber)
      );
      if (linkedWO) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/(tabs)/cmms/work-orders/${linkedWO.id}`);
        return;
      }
      // Create an OPEN work order and navigate to the full detail screen
      if (createOpenWorkOrder) {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const workOrderId = await createOpenWorkOrder(task);
          if (workOrderId) {
            // Link WO to department task and mark as in_progress
            try {
              await supabase
                .from('task_feed_department_tasks')
                .update({
                  status: 'in_progress',
                  started_at: new Date().toISOString(),
                  module_reference_type: 'work_order',
                  module_reference_id: workOrderId,
                })
                .eq('id', task.id)
                .eq('organization_id', organizationId);
            } catch (linkErr) {
              console.error('[TaskFeedInbox] Error linking WO to dept task:', linkErr);
            }
            queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
            queryClient.invalidateQueries({ queryKey: ['work_orders'] });
            router.push(`/(tabs)/cmms/work-orders/${workOrderId}`);
            return;
          }
        } catch (err) {
          console.error('[TaskFeedInbox] Error creating open WO:', err);
          Alert.alert('Error', 'Failed to create work order. Please try again.');
          return;
        }
      } else if (createFullWorkOrder) {
        setShowWorkOrderModal(true);
      } else {
        setShowCompleteModal(true);
      }
    } else if (task.status === 'in_progress') {
      // Task already started — show decision modal
      setShowDecisionModal(true);
    } else {
      // Pending task — show form picker to start
      setShowFormPicker(true);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isMaintenanceDept, createFullWorkOrder, createOpenWorkOrder, workOrders, router, organizationId, queryClient]);

  const handleNotInvolvedPress = useCallback((task: TaskFeedDepartmentTask & { post?: PostDetails }) => {
    setSelectedTask(task);
    setShowNotInvolved(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleFormSelected = useCallback((form: { id: string; label: string; route: string }) => {
    if (!selectedTask) return;
    
    // Start the task with form info
    startTaskMutation.mutate({
      taskId: selectedTask.id,
      formType: form.label,
      formRoute: form.route,
    });

    setShowFormPicker(false);
    setShowDecisionModal(false);
    
    // Navigate to the form
    router.push(form.route as any);
  }, [selectedTask, startTaskMutation, router]);

  const handleFormPickerClose = useCallback(() => {
    setShowFormPicker(false);
    // Always show decision modal (has line restore, signature, etc.)
    // regardless of whether task is pending or in_progress
    setShowDecisionModal(true);
  }, []);

  const handleDecisionResolve = useCallback(async (data: {
    lineOperational: boolean;
    completionNotes: string;
    signature: SignatureVerification;
    rootCauseDepartment?: string;
    rootCauseDepartmentName?: string;
  }) => {
    if (!selectedTask) return;

    setIsCompleting(true);
    try {
      // Complete the department task
      await completeMutation.mutateAsync({
        taskId: selectedTask.id,
        completionNotes: data.completionNotes,
      });

      // Log the signature
      logSignature.mutate({
        verification: data.signature,
        formType: 'Task Completion',
        referenceType: 'task_feed_post',
        referenceId: selectedTask.postId,
        referenceNumber: selectedTask.postNumber,
      });

      // Clear production hold — ONLY Quality (1004) can release the line
      if (data.lineOperational && selectedTask.post?.is_production_hold && departmentCode === '1004') {
        const holdStatus = selectedTask.post?.hold_status || 'active';
        if (holdStatus === 'active' || holdStatus === 'reinstated') {
          try {
            await clearHoldMutation.mutateAsync({
              postId: selectedTask.postId,
              clearedByName: data.signature.employeeName,
              clearedById: data.signature.employeeId,
              departmentCode,
              departmentName: getDepartmentName(departmentCode),
              notes: data.completionNotes,
              signatureStamp: data.signature.signatureStamp,
              rootCauseDepartment: data.rootCauseDepartment,
              rootCauseDepartmentName: data.rootCauseDepartmentName,
            });
            console.log('[TaskFeedInbox] Production hold cleared successfully');
          } catch (holdErr) {
            console.error('[TaskFeedInbox] Failed to clear hold:', holdErr);
            Alert.alert('Warning', 'Task completed but production hold could not be cleared. Please try clearing it manually.');
          }
        }
      }

      onTaskCompleted?.(selectedTask);
      setShowDecisionModal(false);
      setSelectedTask(null);

      // Force refresh post detail
      queryClient.invalidateQueries({ queryKey: ['task_feed_post_detail'] });

      Alert.alert(
        'Task Resolved',
        `${getDepartmentName(departmentCode)} has completed their task for ${selectedTask.postNumber}.${data.lineOperational && selectedTask.post?.is_production_hold && departmentCode === '1004' ? '\n\nProduction hold has been cleared.' : ''}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[TaskFeedInbox] Error resolving task:', error);
      Alert.alert('Error', 'Failed to resolve task.');
    } finally {
      setIsCompleting(false);
    }
  }, [selectedTask, completeMutation, clearHoldMutation, logSignature, onTaskCompleted, departmentCode, queryClient]);

  const handleNotInvolvedConfirm = useCallback(async (data: {
    reason: string;
    signature: SignatureVerification;
  }) => {
    if (!selectedTask) return;

    setIsCompleting(true);
    try {
      // Complete with "not involved" notes
      await completeMutation.mutateAsync({
        taskId: selectedTask.id,
        completionNotes: `NOT INVOLVED: ${data.reason}\n\nVerified by: ${data.signature.signatureStamp}`,
      });

      // Log the signature
      logSignature.mutate({
        verification: data.signature,
        formType: 'Not Involved Verification',
        referenceType: 'task_feed_post',
        referenceId: selectedTask.postId,
        referenceNumber: selectedTask.postNumber,
      });

      onTaskCompleted?.(selectedTask);
      setShowNotInvolved(false);
      setSelectedTask(null);

      Alert.alert(
        'Verified',
        `${getDepartmentName(departmentCode)} confirmed not involved in ${selectedTask.postNumber}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[TaskFeedInbox] Error confirming not involved:', error);
      Alert.alert('Error', 'Failed to confirm.');
    } finally {
      setIsCompleting(false);
    }
  }, [selectedTask, completeMutation, logSignature, onTaskCompleted, departmentCode]);

  const handleDecisionEscalate = useCallback(() => {
    // Close decision, the parent page handles escalation
    setShowDecisionModal(false);
    // Navigate to post detail where escalation modal lives
    if (selectedTask?.postId) {
      router.push(`/(tabs)/taskfeed/${selectedTask.postId}`);
    }
  }, [selectedTask, router]);

  const handleDecisionAnotherForm = useCallback(() => {
    // Close decision, open form picker
    setShowDecisionModal(false);
    setShowFormPicker(true);
  }, []);

  const handleConfirmComplete = useCallback(async () => {
    if (!selectedTask) return;

    setIsCompleting(true);
    try {
      let moduleHistoryId: string | null = null;

      if (createModuleHistoryRecord) {
        moduleHistoryId = await createModuleHistoryRecord(selectedTask, completionNotes);
        console.log('[TaskFeedInbox] Module history record created:', moduleHistoryId);
      }

      await completeMutation.mutateAsync({
        taskId: selectedTask.id,
        completionNotes: completionNotes.trim() || undefined,
      });

      onTaskCompleted?.(selectedTask, moduleHistoryId || undefined);

      setShowCompleteModal(false);
      setSelectedTask(null);
      setCompletionNotes('');

      Alert.alert(
        'Task Completed',
        `Task ${selectedTask.postNumber} has been marked as complete for ${getDepartmentName(departmentCode)}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[TaskFeedInbox] Error in complete flow:', error);
    } finally {
      setIsCompleting(false);
    }
  }, [selectedTask, completionNotes, completeMutation, createModuleHistoryRecord, onTaskCompleted, departmentCode]);

  const handleWorkOrderComplete = useCallback(async (data: WorkOrderCompletionData) => {
    if (!selectedTask || !createFullWorkOrder) return;

    setIsCompleting(true);
    try {
      console.log('[TaskFeedInbox] Creating full work order for task:', selectedTask.postNumber);
      
      // Step 1: Create the work order (sets source_id = postId, department = '1001')
      const workOrderId = await createFullWorkOrder(selectedTask, data);
      console.log('[TaskFeedInbox] Work order created:', workOrderId);

      // Step 2: Link WO to department task BEFORE completing (so cache invalidation picks it up)
      if (workOrderId) {
        try {
          const { error: linkError } = await supabase
            .from('task_feed_department_tasks')
            .update({
              module_reference_type: 'work_order',
              module_reference_id: workOrderId,
            })
            .eq('id', selectedTask.id)
            .eq('organization_id', organizationId);
          
          if (linkError) {
            console.error('[TaskFeedInbox] Error linking WO to dept task:', linkError.message);
          } else {
            console.log('[TaskFeedInbox] Linked WO', workOrderId, 'to dept task', selectedTask.id);
          }
        } catch (linkErr) {
          console.error('[TaskFeedInbox] Failed to link WO:', linkErr);
        }
      }

      // Step 3: Complete the department task (triggers cache invalidation)
      const notesForTaskFeed = `Work Order Completed\n\nWork Performed: ${data.workPerformed}\nAction Taken: ${data.actionTaken}${data.partsUsed ? `\nParts Used: ${data.partsUsed}` : ''}${data.laborHours ? `\nLabor Hours: ${data.laborHours}` : ''}${data.rootCause ? `\nRoot Cause: ${data.rootCause}` : ''}${data.additionalNotes ? `\nNotes: ${data.additionalNotes}` : ''}`;

      await completeMutation.mutateAsync({
        taskId: selectedTask.id,
        completionNotes: notesForTaskFeed,
      });

      // Note: Production hold is NOT auto-cleared by maintenance WO completion.
      // Only Quality (1004) can release the line via the decision modal.

      // Step 4: Force re-invalidate post detail so linked WO shows up
      queryClient.invalidateQueries({ queryKey: ['task_feed_post_detail'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts_with_tasks'] });

      onTaskCompleted?.(selectedTask, workOrderId || undefined);

      setShowWorkOrderModal(false);
      setSelectedTask(null);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Work Order Completed',
        `Work order for ${selectedTask.postNumber} has been completed and recorded in CMMS history.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[TaskFeedInbox] Error creating work order:', error);
      Alert.alert('Error', 'Failed to complete work order. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }, [selectedTask, createFullWorkOrder, completeMutation, onTaskCompleted, departmentCode, user, organizationId, queryClient]);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  const formatTimeAgo = useCallback((dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading tasks...</Text>
        </View>
      </View>
    );
  }

  if (pendingTasks.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {showHeader && (
        <TouchableOpacity
          style={styles.header}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: accentColor + '20' }]}>
              <Inbox size={18} color={accentColor} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Task Feed Inbox</Text>
              <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
                {pendingTasks.length} pending task{pendingTasks.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.countBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.countBadgeText}>{pendingTasks.length}</Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={20} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>
      )}

      {isExpanded && (
        <View style={styles.taskList}>
          {visibleTasks.map((task, index) => (
            <View
              key={task.id}
              style={[
                styles.taskItem,
                index < visibleTasks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.taskMain}>
                <View style={styles.taskInfo}>
                  <View style={styles.taskHeader}>
                    <Text style={[styles.postNumber, { color: accentColor }]}>
                      {task.postNumber}
                    </Text>
                    {task.post?.is_production_hold && (
                      <View style={[styles.holdIndicator, {
                        backgroundColor: task.post?.hold_status === 'cleared' ? '#10B98120' : '#EF444420',
                      }]}>
                        <Factory size={9} color={task.post?.hold_status === 'cleared' ? '#10B981' : '#EF4444'} />
                        <Text style={[styles.holdIndicatorText, {
                          color: task.post?.hold_status === 'cleared' ? '#10B981' : '#EF4444',
                        }]}>
                          {task.post?.hold_status === 'cleared' ? 'RELEASED' : 'HOLD'}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
                      {formatTimeAgo(task.assignedAt)}
                    </Text>
                  </View>
                  <Text style={[styles.templateName, { color: colors.text }]} numberOfLines={1}>
                    {task.post?.template_name || 'Task'}
                  </Text>
                  {/* Status indicator for in-progress tasks */}
                  {task.status === 'in_progress' && (
                    <View style={styles.inProgressRow}>
                      <View style={[styles.inProgressBadge, { backgroundColor: '#F59E0B20' }]}>
                        <Clock size={10} color="#F59E0B" />
                        <Text style={styles.inProgressText}>In Progress</Text>
                      </View>
                      {(task.formsCompleted || 0) > 0 && (
                        <View style={[styles.inProgressBadge, { backgroundColor: '#10B98120' }]}>
                          <FileText size={10} color="#10B981" />
                          <Text style={[styles.formCountText, { color: '#10B981' }]}>{task.formsCompleted} form{task.formsCompleted !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {task.post?.location_name && (
                    <View style={styles.locationRow}>
                      <MapPin size={12} color={colors.textSecondary} />
                      <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {task.post.location_name}
                      </Text>
                    </View>
                  )}
                  {task.post?.created_by_name && (
                    <View style={styles.createdByRow}>
                      <User size={12} color={colors.textTertiary} />
                      <Text style={[styles.createdByText, { color: colors.textTertiary }]}>
                        {task.post.created_by_name}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.taskActions}>
                  {/* Not Involved button — only for pending tasks */}
                  {task.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => handleNotInvolvedPress(task)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.textSecondary, fontSize: 11 }]}>Not{'\n'}Involved</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton, { backgroundColor: accentColor }]}
                    onPress={() => handleStartComplete(task)}
                    activeOpacity={0.7}
                  >
                    {isMaintenanceDept ? (
                      <>
                        <Wrench size={16} color="#fff" />
                        <Text style={[styles.actionButtonText, { color: '#fff' }]}>Complete WO</Text>
                      </>
                    ) : task.status === 'in_progress' ? (
                      <>
                        <ClipboardList size={16} color="#fff" />
                        <Text style={[styles.actionButtonText, { color: '#fff' }]}>Continue</Text>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} color="#fff" />
                        <Text style={[styles.actionButtonText, { color: '#fff' }]}>Start</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {hasMoreTasks && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowAllTasks(!showAllTasks)}
              activeOpacity={0.7}
            >
              <Text style={[styles.showMoreText, { color: accentColor }]}>
                {showAllTasks ? 'Show Less' : `Show ${pendingTasks.length - maxVisible} More`}
              </Text>
              {showAllTasks ? (
                <ChevronUp size={16} color={accentColor} />
              ) : (
                <ChevronDown size={16} color={accentColor} />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Post Detail Modal */}
      <Modal visible={showPostDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderLeft}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Original Post</Text>
                {selectedTask && (
                  <Text style={[styles.modalPostNumber, { color: accentColor }]}>
                    {selectedTask.postNumber}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowPostDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedTask?.post && (
                <>
                  <View style={[styles.detailSection, { backgroundColor: colors.background }]}>
                    <View style={styles.detailRow}>
                      <ClipboardList size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Template</Text>
                    </View>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedTask.post.template_name}
                    </Text>
                  </View>

                  <View style={[styles.detailSection, { backgroundColor: colors.background }]}>
                    <View style={styles.detailRow}>
                      <User size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created By</Text>
                    </View>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedTask.post.created_by_name}
                    </Text>
                  </View>

                  <View style={[styles.detailSection, { backgroundColor: colors.background }]}>
                    <View style={styles.detailRow}>
                      <Calendar size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created At</Text>
                    </View>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(selectedTask.post.created_at)}
                    </Text>
                  </View>

                  {selectedTask.post.location_name && (
                    <View style={[styles.detailSection, { backgroundColor: colors.background }]}>
                      <View style={styles.detailRow}>
                        <MapPin size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                      </View>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {selectedTask.post.location_name}
                      </Text>
                    </View>
                  )}

                  {selectedTask.post.photo_url && (
                    <View style={[styles.detailSection, { backgroundColor: colors.background }]}>
                      <View style={styles.detailRow}>
                        <Camera size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Photo</Text>
                      </View>
                      <Image
                        source={{ uri: selectedTask.post.photo_url }}
                        style={styles.postImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {Object.keys(selectedTask.post.form_data).length > 0 && (
                    <View style={[styles.detailSection, { backgroundColor: colors.background }]}>
                      <View style={styles.detailRow}>
                        <FileText size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Form Data</Text>
                      </View>
                      {Object.entries(selectedTask.post.form_data).map(([key, value]) => {
                        const formatLabel = (str: string) => {
                          return str
                            .replace(/_/g, ' ')
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (s) => s.toUpperCase())
                            .trim();
                        };

                        const formatValue = (val: any): string => {
                          if (val === null || val === undefined) return '-';
                          if (typeof val === 'boolean') return val ? 'Yes' : 'No';
                          if (typeof val === 'number') return val.toString();
                          if (typeof val === 'string') return val || '-';
                          if (Array.isArray(val)) return val.join(', ') || '-';
                          if (typeof val === 'object') {
                            return Object.entries(val)
                              .map(([k, v]) => `${formatLabel(k)}: ${formatValue(v)}`)
                              .join(', ');
                          }
                          return String(val);
                        };

                        const displayValue = formatValue(value);
                        const isLongValue = displayValue.length > 50;

                        return (
                          <View key={key} style={isLongValue ? styles.formDataRowStacked : styles.formDataRow}>
                            <Text style={[styles.formDataKey, { color: colors.textSecondary }]}>
                              {formatLabel(key)}:
                            </Text>
                            <Text style={[styles.formDataValue, { color: colors.text }]} numberOfLines={isLongValue ? 3 : 1}>
                              {displayValue}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {selectedTask.post.notes && (
                    <View style={[styles.detailSection, { backgroundColor: colors.background }]}>
                      <View style={styles.detailRow}>
                        <MessageSquare size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes</Text>
                      </View>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {selectedTask.post.notes}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.assignedDeptBanner, { backgroundColor: accentColor + '15' }]}>
                    <AlertTriangle size={16} color={accentColor} />
                    <Text style={[styles.assignedDeptText, { color: accentColor }]}>
                      Assigned to {getDepartmentName(departmentCode)} for action
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowPostDetailModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.completeModalButton, { backgroundColor: accentColor }]}
                onPress={() => {
                  setShowPostDetailModal(false);
                  if (selectedTask) handleStartComplete(selectedTask);
                }}
              >
                {isMaintenanceDept ? (
                  <>
                    <Wrench size={18} color="#fff" />
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Complete Work Order</Text>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#fff" />
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Mark Complete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Task Modal */}
      <Modal visible={showCompleteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.completeModalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderLeft}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Complete Task</Text>
                {selectedTask && (
                  <Text style={[styles.modalPostNumber, { color: accentColor }]}>
                    {selectedTask.postNumber}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowCompleteModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.completeModalContent}>
              <View style={[styles.taskSummary, { backgroundColor: colors.background }]}>
                <Text style={[styles.taskSummaryTitle, { color: colors.text }]}>
                  {selectedTask?.post?.template_name || 'Task'}
                </Text>
                {selectedTask?.post?.location_name && (
                  <Text style={[styles.taskSummaryLocation, { color: colors.textSecondary }]}>
                    {selectedTask.post.location_name}
                  </Text>
                )}
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Completion Notes (Optional)</Text>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Add notes about how you completed this task..."
                placeholderTextColor={colors.textTertiary}
                value={completionNotes}
                onChangeText={setCompletionNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={[styles.completionInfo, { backgroundColor: accentColor + '10' }]}>
                <CheckCircle2 size={16} color={accentColor} />
                <Text style={[styles.completionInfoText, { color: accentColor }]}>
                  This will mark the task complete for {getDepartmentName(departmentCode)}
                  {createModuleHistoryRecord && ' and create a record in module history'}
                </Text>
              </View>
            </View>

            <View style={[styles.modalFooter, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowCompleteModal(false)}
                disabled={isCompleting}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.completeModalButton, { backgroundColor: isCompleting ? colors.border : accentColor }]}
                onPress={handleConfirmComplete}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#fff" />
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Complete Task</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Work Order Completion Modal for Maintenance */}
      <Modal visible={showWorkOrderModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.workOrderModalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.workOrderModalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity 
              onPress={() => {
                setShowWorkOrderModal(false);
                setSelectedTask(null);
              }}
              disabled={isCompleting}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.workOrderModalTitleContainer}>
              <Wrench size={20} color={accentColor} />
              <Text style={[styles.workOrderModalTitle, { color: colors.text }]}>Complete Work Order</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          {selectedTask && (
            <WorkOrderCompletionForm
              task={selectedTask}
              onComplete={handleWorkOrderComplete}
              onCancel={() => {
                setShowWorkOrderModal(false);
                setSelectedTask(null);
              }}
              isSubmitting={isCompleting}
              accentColor={accentColor}
            />
          )}
        </View>
      </Modal>

      {/* Form Picker Modal */}
      <FormPickerModal
        visible={showFormPicker}
        onClose={handleFormPickerClose}
        departmentCode={departmentCode}
        departmentName={getDepartmentName(departmentCode)}
        taskPostNumber={selectedTask?.postNumber}
        templateName={selectedTask?.post?.template_name}
        onFormSelected={handleFormSelected}
        completedForms={(selectedTask?.formCompletions || []).map(f => ({
          formId: f.formId,
          formType: f.formType,
          completedAt: f.completedAt,
          completedByName: f.completedByName,
        }))}
      />

      {/* Post-Form Decision Modal */}
      <PostFormDecisionModal
        visible={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        task={selectedTask}
        departmentCode={departmentCode}
        departmentName={getDepartmentName(departmentCode)}
        onAnotherForm={handleDecisionAnotherForm}
        onEscalate={handleDecisionEscalate}
        onMarkResolved={handleDecisionResolve}
        onNotInvolved={handleNotInvolvedConfirm}
        isSubmitting={isCompleting}
      />

      {/* Not Involved Modal */}
      <PostFormDecisionModal
        visible={showNotInvolved}
        onClose={() => setShowNotInvolved(false)}
        task={selectedTask}
        departmentCode={departmentCode}
        departmentName={getDepartmentName(departmentCode)}
        onAnotherForm={() => {}}
        onEscalate={() => {}}
        onMarkResolved={() => {}}
        onNotInvolved={handleNotInvolvedConfirm}
        notInvolvedMode={true}
        isSubmitting={isCompleting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  headerCount: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  taskList: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  taskItem: {
    paddingVertical: 12,
  },
  taskMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  postNumber: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  timeAgo: {
    fontSize: 11,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  inProgressRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 4,
  },
  inProgressBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inProgressText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#F59E0B',
  },
  formCountText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  holdIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  holdIndicatorText: {
    fontSize: 8,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    flex: 1,
  },
  createdByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  createdByText: {
    fontSize: 11,
  },
  taskActions: {
    flexDirection: 'column',
    gap: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  completeButton: {},
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  completeModalContainer: {
    maxHeight: '60%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  modalPostNumber: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  modalContent: {
    padding: 16,
    maxHeight: 400,
  },
  completeModalContent: {
    padding: 16,
  },
  detailSection: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 8,
  },
  formDataRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 6,
  },
  formDataRowStacked: {
    flexDirection: 'column',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 6,
    gap: 4,
  },
  formDataKey: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginRight: 6,
    minWidth: 80,
  },
  formDataValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  assignedDeptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
    gap: 10,
  },
  assignedDeptText: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  taskSummary: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  taskSummaryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  taskSummaryLocation: {
    fontSize: 13,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  notesInput: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
    marginBottom: 16,
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  completionInfoText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  completeModalButton: {
    borderWidth: 0,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  workOrderModalContainer: {
    flex: 1,
  },
  workOrderModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  workOrderModalTitleContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  workOrderModalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
});
