import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import {
  X,
  Wrench,
  Calendar,
  MapPin,
  Shield,
  ClipboardList,
  Clock,
  RefreshCw,
  Package,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Tag,
  User,
} from 'lucide-react-native';
import { SignatureVerification, useLogSignature } from '@/hooks/usePinSignature';
import * as Haptics from 'expo-haptics';
import PinPadModal from '@/components/PinPadModal';

interface PMWorkOrderDetailProps {
  workOrder: {
    id: string;
    workOrderNumber: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
    type: 'corrective' | 'preventive' | 'emergency' | 'request';
    source: 'manual' | 'request' | 'pm_schedule';
    sourceId?: string;
    equipment?: string;
    equipmentId?: string;
    location: string;
    facility_id: string;
    assigned_to?: string;
    assignedName?: string;
    due_date: string;
    started_at?: string;
    completed_at?: string;
    estimatedHours?: number;
    actualHours?: number;
    safety: {
      lotoRequired: boolean;
      lotoSteps: any[];
      permits: string[];
      permitNumbers: Record<string, string>;
      permitExpiry: Record<string, string>;
      ppeRequired: string[];
    };
    tasks: any[];
    attachments: any[];
    notes: string;
    completionNotes?: string;
    created_at: string;
    updated_at: string;
  };
  onClose: () => void;
  onUpdate: (id: string, updates: any) => void;
  onStartWork: (id: string) => void;
  onCompleteWork: (id: string) => void;
  canEdit: boolean;
}

interface PMScheduleData {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  equipment_name: string | null;
  equipment_tag: string | null;
  assigned_name: string | null;
  last_completed: string | null;
  next_due: string;
  estimated_hours: number | null;
  parts_required: any[] | null;
  active: boolean;
  schedule_days: string[] | null;
  schedule_time: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Open', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.15)' },
  in_progress: { label: 'In Progress', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.15)' },
  completed: { label: 'Completed', color: '#10B981', bgColor: 'rgba(16,185,129,0.15)' },
  on_hold: { label: 'On Hold', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.15)' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bgColor: 'rgba(107,114,128,0.15)' },
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annually: 'Semi-Annually',
  annually: 'Annually',
};

export default function PMWorkOrderDetail({
  workOrder,
  onClose,
  onUpdate,
  onStartWork,
  onCompleteWork,
  canEdit,
}: PMWorkOrderDetailProps) {
  const { colors } = useTheme();
  const { user } = useUser();
  const { organizationId } = useOrganization();
  const router = useRouter();
  const statusConfig = STATUS_CONFIG[workOrder.status] || STATUS_CONFIG.open;
  const priorityColor = PRIORITY_COLORS[workOrder.priority] || '#F59E0B';

  // ── PM Schedule data ──
  const [pmSchedule, setPmSchedule] = useState<PMScheduleData | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  useEffect(() => {
    if (workOrder.source === 'pm_schedule' && workOrder.sourceId) {
      setIsLoadingSchedule(true);
      supabase
        .from('pm_schedules')
        .select('id, name, description, frequency, equipment_name, equipment_tag, assigned_name, last_completed, next_due, estimated_hours, parts_required, active, schedule_days, schedule_time')
        .eq('id', workOrder.sourceId)
        .eq('organization_id', organizationId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('[PMWorkOrderDetail] Error fetching PM schedule:', error);
          } else if (data) {
            console.log('[PMWorkOrderDetail] Loaded PM schedule:', data.name, '| Frequency:', data.frequency);
            setPmSchedule(data as PMScheduleData);
          }
          setIsLoadingSchedule(false);
        });
    }
  }, [workOrder.sourceId, workOrder.source, organizationId]);

  // ── Task completion state ──
  const [taskStates, setTaskStates] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    (workOrder.tasks || []).forEach((task: any, index: number) => {
      initial[index] = task.completed || false;
    });
    return initial;
  });

  const completedCount = Object.values(taskStates).filter(Boolean).length;
  const totalTasks = workOrder.tasks?.length || 0;
  const allTasksComplete = totalTasks > 0 && completedCount === totalTasks;

  // ── Start Work modal state ──
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStartPinPad, setShowStartPinPad] = useState(false);
  const [startSignature, setStartSignature] = useState<SignatureVerification | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // ── Complete PM modal state ──
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCompletePinPad, setShowCompletePinPad] = useState(false);
  const [completeSignature, setCompleteSignature] = useState<SignatureVerification | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const logSignature = useLogSignature({
    onSuccess: (data) => {
      console.log('[PMWorkOrderDetail] Signature logged:', data.id);
    },
    onError: (error) => {
      console.error('[PMWorkOrderDetail] Error logging signature:', error);
    },
  });

  // ── Task toggle handler ──
  const handleToggleTask = useCallback((index: number) => {
    setTaskStates(prev => {
      const updated = { ...prev, [index]: !prev[index] };

      const updatedTasks = (workOrder.tasks || []).map((task: any, i: number) => ({
        ...task,
        completed: updated[i] || false,
        completedAt: updated[i] ? new Date().toISOString() : null,
      }));
      onUpdate(workOrder.id, { tasks: updatedTasks });

      return updated;
    });
  }, [workOrder.tasks, workOrder.id, onUpdate]);

  // ── Start Work Flow ──
  const handleStartPress = useCallback(() => {
    const issues: string[] = [];
    if (!workOrder.equipment) issues.push('Equipment not specified');
    if (!workOrder.location || workOrder.location === 'Main Facility') issues.push('Location not specified');
    if (!workOrder.assignedName) issues.push('No technician assigned');
    if (!workOrder.due_date) issues.push('No due date set');

    if (issues.length > 0) {
      Alert.alert(
        'Pre-Start Warning',
        `The following items are missing:\n\n• ${issues.join('\n• ')}\n\nYou can still start work, but these should be filled in.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Anyway', onPress: () => setShowStartModal(true) },
        ]
      );
      return;
    }
    setShowStartModal(true);
  }, [workOrder]);

  const handleStartPinVerified = useCallback((verification: SignatureVerification) => {
    setStartSignature(verification);
    setShowStartPinPad(false);
  }, []);

  const handleConfirmStart = useCallback(async () => {
    if (!startSignature) {
      Alert.alert('PPN Required', 'Please verify your PPN signature before starting work.');
      return;
    }

    setIsStarting(true);
    try {
      logSignature.mutate({
        verification: startSignature,
        formType: 'PM Work Order Start',
        referenceType: 'work_order',
        referenceId: workOrder.id,
        referenceNumber: workOrder.workOrderNumber,
      });

      const auditNote = `\n\n--- PM Work Started ---\nStarted by: ${startSignature.employeeName}\nPPN: ${startSignature.signatureStamp}\nDate: ${new Date().toLocaleString()}\nSafety reviewed: Yes`;
      onUpdate(workOrder.id, {
        notes: (workOrder.notes || '') + auditNote,
      });

      onStartWork(workOrder.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowStartModal(false);
      setStartSignature(null);
    } catch (error) {
      console.error('[PMWorkOrderDetail] Error starting work:', error);
      Alert.alert('Error', 'Failed to start work order.');
    } finally {
      setIsStarting(false);
    }
  }, [startSignature, workOrder, onStartWork, onUpdate, logSignature]);

  // ── Complete PM Flow ──
  const handleCompletePress = useCallback(() => {
    if (!allTasksComplete && totalTasks > 0) {
      Alert.alert(
        'Incomplete Tasks',
        `${completedCount} of ${totalTasks} tasks are complete. Are you sure you want to finish this PM?`,
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Complete Anyway', onPress: () => setShowCompleteModal(true) },
        ]
      );
      return;
    }
    setShowCompleteModal(true);
  }, [allTasksComplete, totalTasks, completedCount]);

  const handleCompletePinVerified = useCallback((verification: SignatureVerification) => {
    setCompleteSignature(verification);
    setShowCompletePinPad(false);
  }, []);

  const handleConfirmComplete = useCallback(async () => {
    if (!completeSignature) {
      Alert.alert('PPN Required', 'Please verify your PPN signature before completing this PM.');
      return;
    }
    if (!completionNotes.trim()) {
      Alert.alert('Notes Required', 'Please enter completion notes describing the work performed.');
      return;
    }

    setIsCompleting(true);
    try {
      logSignature.mutate({
        verification: completeSignature,
        formType: 'PM Work Order Completion',
        referenceType: 'work_order',
        referenceId: workOrder.id,
        referenceNumber: workOrder.workOrderNumber,
      });

      const auditNote = `\n\n--- PM Completed ---\nCompleted by: ${completeSignature.employeeName}\nPPN: ${completeSignature.signatureStamp}\nDate: ${new Date().toLocaleString()}\nTasks: ${completedCount}/${totalTasks} complete\nNotes: ${completionNotes.trim()}`;
      onUpdate(workOrder.id, {
        notes: (workOrder.notes || '') + auditNote,
        completionNotes: completionNotes.trim(),
      });

      onCompleteWork(workOrder.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCompleteModal(false);
      setCompleteSignature(null);
      setCompletionNotes('');
    } catch (error) {
      console.error('[PMWorkOrderDetail] Error completing PM:', error);
      Alert.alert('Error', 'Failed to complete PM work order.');
    } finally {
      setIsCompleting(false);
    }
  }, [completeSignature, completionNotes, workOrder, onCompleteWork, onUpdate, logSignature, completedCount, totalTasks]);

  // ── Navigate to parent PM schedule ──
  const handleViewSchedule = useCallback(() => {
    if (pmSchedule?.id) {
      router.push(`/(tabs)/cmms/pmschedule` as any);
    }
  }, [pmSchedule, router]);

  // ── Helpers ──
  const formatDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const getDaysUntil = useCallback((dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ════════════ Header ════════════ */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <RefreshCw size={18} color="#10B981" />
            <Text style={[styles.headerLabel, { color: '#10B981' }]}>Preventive Maintenance</Text>
          </View>
          <Text style={[styles.headerWONumber, { color: colors.text }]}>{workOrder.workOrderNumber}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* ════════════ Body ════════════ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status + Priority Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusConfig.bgColor }]}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '25' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)} Priority
            </Text>
          </View>
        </View>

        {/* Title & Description */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.woTitle, { color: colors.text }]}>{workOrder.title}</Text>
          {workOrder.description ? (
            <Text style={[styles.woDescription, { color: colors.textSecondary }]}>{workOrder.description}</Text>
          ) : null}
        </View>

        {/* ════════════ PM Schedule Metadata ════════════ */}
        {workOrder.source === 'pm_schedule' && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: '#10B981' + '40' }]}>
            <View style={styles.sectionHeader}>
              <RefreshCw size={16} color="#10B981" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>PM Schedule</Text>
              {pmSchedule?.active === false && (
                <View style={[styles.inactiveBadge, { backgroundColor: '#EF444420' }]}>
                  <Text style={styles.inactiveBadgeText}>Inactive</Text>
                </View>
              )}
            </View>

            {isLoadingSchedule ? (
              <View style={styles.scheduleLoading}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={[styles.scheduleLoadingText, { color: colors.textSecondary }]}>Loading schedule...</Text>
              </View>
            ) : pmSchedule ? (
              <View style={styles.scheduleContent}>
                {/* Schedule Name */}
                <View style={[styles.scheduleNameRow, { backgroundColor: '#10B98110' }]}>
                  <ClipboardList size={14} color="#10B981" />
                  <Text style={[styles.scheduleNameText, { color: colors.text }]}>{pmSchedule.name}</Text>
                </View>

                {/* Frequency */}
                <View style={styles.scheduleRow}>
                  <RefreshCw size={14} color={colors.textSecondary} />
                  <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Frequency</Text>
                  <View style={[styles.frequencyBadge, { backgroundColor: '#3B82F620' }]}>
                    <Text style={[styles.frequencyBadgeText, { color: '#3B82F6' }]}>
                      {FREQUENCY_LABELS[pmSchedule.frequency] || pmSchedule.frequency}
                    </Text>
                  </View>
                </View>

                {/* Schedule Days & Time */}
                {(pmSchedule.schedule_days && pmSchedule.schedule_days.length > 0) && (
                  <View style={styles.scheduleRow}>
                    <Calendar size={14} color={colors.textSecondary} />
                    <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Schedule</Text>
                    <Text style={[styles.scheduleValue, { color: colors.text }]}>
                      {pmSchedule.schedule_days.join(', ')}{pmSchedule.schedule_time ? ` at ${pmSchedule.schedule_time}` : ''}
                    </Text>
                  </View>
                )}

                {/* Equipment Tag */}
                {pmSchedule.equipment_tag && (
                  <View style={styles.scheduleRow}>
                    <Tag size={14} color={colors.textSecondary} />
                    <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Asset Tag</Text>
                    <Text style={[styles.scheduleValue, { color: colors.text }]}>{pmSchedule.equipment_tag}</Text>
                  </View>
                )}

                {/* Last Completed */}
                <View style={styles.scheduleRow}>
                  <CheckCircle2 size={14} color={pmSchedule.last_completed ? '#10B981' : colors.textTertiary} />
                  <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Last Completed</Text>
                  <Text style={[styles.scheduleValue, { color: pmSchedule.last_completed ? colors.text : '#EF4444' }]}>
                    {pmSchedule.last_completed ? formatDate(pmSchedule.last_completed) : 'Never'}
                  </Text>
                </View>

                {/* Next Due */}
                <View style={styles.scheduleRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Next Due</Text>
                  <Text style={[styles.scheduleValue, { color: colors.text }]}>
                    {formatDate(pmSchedule.next_due)}
                    {(() => {
                      const days = getDaysUntil(pmSchedule.next_due);
                      if (days < 0) return ` (${Math.abs(days)}d overdue)`;
                      if (days === 0) return ' (Today)';
                      if (days <= 7) return ` (${days}d)`;
                      return '';
                    })()}
                  </Text>
                </View>

                {/* Assigned Technician from Schedule */}
                {pmSchedule.assigned_name && (
                  <View style={styles.scheduleRow}>
                    <User size={14} color={colors.textSecondary} />
                    <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Default Tech</Text>
                    <Text style={[styles.scheduleValue, { color: colors.text }]}>{pmSchedule.assigned_name}</Text>
                  </View>
                )}

                {/* View Schedule Link */}
                <TouchableOpacity
                  style={[styles.viewScheduleButton, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}
                  onPress={handleViewSchedule}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={14} color="#10B981" />
                  <Text style={styles.viewScheduleText}>View PM Schedule</Text>
                  <ChevronRight size={16} color="#10B981" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.scheduleNotFound, { color: colors.textTertiary }]}>
                PM schedule not found (ID: {workOrder.sourceId || 'N/A'})
              </Text>
            )}
          </View>
        )}

        {/* Work Order Info */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Wrench size={16} color="#3B82F6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Work Order Info</Text>
          </View>
          <View style={styles.infoGrid}>
            {workOrder.equipment && (
              <View style={styles.infoRow}>
                <Wrench size={14} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Equipment</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.equipment}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Location</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Due Date</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.due_date}</Text>
            </View>
            {workOrder.assignedName && (
              <View style={styles.infoRow}>
                <User size={14} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Assigned To</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.assignedName}</Text>
              </View>
            )}
            {workOrder.estimatedHours && (
              <View style={styles.infoRow}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Est. Hours</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.estimatedHours}h</Text>
              </View>
            )}
          </View>
        </View>

        {/* ════════════ Parts Required ════════════ */}
        {pmSchedule?.parts_required && Array.isArray(pmSchedule.parts_required) && pmSchedule.parts_required.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Package size={16} color="#8B5CF6" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Parts Required ({pmSchedule.parts_required.length})
              </Text>
            </View>
            {pmSchedule.parts_required.map((part: any, index: number) => (
              <View key={index} style={[styles.partRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.partIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Package size={12} color="#8B5CF6" />
                </View>
                <View style={styles.partContent}>
                  <Text style={[styles.partName, { color: colors.text }]}>
                    {part.name || part.part_name || part.description || `Part ${index + 1}`}
                  </Text>
                  {(part.part_number || part.partNumber) && (
                    <Text style={[styles.partNumber, { color: colors.textTertiary }]}>
                      #{part.part_number || part.partNumber}
                    </Text>
                  )}
                </View>
                {(part.quantity || part.qty) && (
                  <View style={[styles.partQtyBadge, { backgroundColor: '#8B5CF620' }]}>
                    <Text style={[styles.partQtyText, { color: '#8B5CF6' }]}>
                      ×{part.quantity || part.qty}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ════════════ Tasks Checklist ════════════ */}
        {workOrder.tasks && workOrder.tasks.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={16} color="#3B82F6" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                PM Tasks ({completedCount}/{totalTasks})
              </Text>
              {allTasksComplete && (
                <View style={[styles.allCompleteBadge, { backgroundColor: '#10B98120' }]}>
                  <Text style={styles.allCompleteText}>✓ All Complete</Text>
                </View>
              )}
            </View>
            {/* Progress bar */}
            <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
              <View style={[styles.progressBarFill, { width: totalTasks > 0 ? `${(completedCount / totalTasks) * 100}%` : '0%' }]} />
            </View>
            {workOrder.tasks.map((task: any, index: number) => {
              const isChecked = taskStates[index] || false;
              return (
                <TouchableOpacity
                  key={task.id || index}
                  style={[styles.taskRow, { borderBottomColor: colors.border }]}
                  onPress={() => handleToggleTask(index)}
                  activeOpacity={0.6}
                  disabled={workOrder.status === 'completed' || workOrder.status === 'cancelled'}
                >
                  <View style={[styles.taskCheckbox, {
                    backgroundColor: isChecked ? '#10B981' : 'transparent',
                    borderColor: isChecked ? '#10B981' : colors.border,
                  }]}>
                    {isChecked && <Text style={styles.taskCheckmark}>✓</Text>}
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={[
                      styles.taskName,
                      { color: colors.text },
                      isChecked && styles.taskNameCompleted,
                    ]}>
                      {task.name || task.title || `Task ${index + 1}`}
                    </Text>
                    {task.description && (
                      <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>{task.description}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ════════════ Safety Requirements ════════════ */}
        {(workOrder.safety.lotoRequired || workOrder.safety.permits.length > 0 || workOrder.safety.ppeRequired.length > 0) && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Shield size={16} color="#EF4444" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Safety Requirements</Text>
            </View>

            {workOrder.safety.lotoRequired && (
              <View style={[styles.safetyBanner, { backgroundColor: '#EF444415' }]}>
                <Text style={[styles.safetyBannerText, { color: '#EF4444' }]}>
                  ⚠️ LOTO REQUIRED — {workOrder.safety.lotoSteps.length} step{workOrder.safety.lotoSteps.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {workOrder.safety.lotoSteps.length > 0 && (
              <View style={styles.lotoStepsContainer}>
                {workOrder.safety.lotoSteps.map((step: any, index: number) => (
                  <View key={index} style={[styles.lotoStep, { backgroundColor: colors.background }]}>
                    <View style={[styles.lotoStepNumber, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.lotoStepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.lotoStepText, { color: colors.text }]}>
                      {typeof step === 'string' ? step : step.description || step.step || `Step ${index + 1}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {workOrder.safety.permits.length > 0 && (
              <View style={styles.safetySubSection}>
                <Text style={[styles.safetySubTitle, { color: colors.textSecondary }]}>Required Permits</Text>
                <View style={styles.tagRow}>
                  {workOrder.safety.permits.map((permit: string, index: number) => (
                    <View key={index} style={[styles.tag, { backgroundColor: '#F59E0B20' }]}>
                      <Text style={[styles.tagText, { color: '#F59E0B' }]}>{permit}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {workOrder.safety.ppeRequired.length > 0 && (
              <View style={styles.safetySubSection}>
                <Text style={[styles.safetySubTitle, { color: colors.textSecondary }]}>Required PPE</Text>
                <View style={styles.tagRow}>
                  {workOrder.safety.ppeRequired.map((ppe: string, index: number) => (
                    <View key={index} style={[styles.tag, { backgroundColor: '#3B82F620' }]}>
                      <Text style={[styles.tagText, { color: '#3B82F6' }]}>
                        {ppe.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ════════════ Notes ════════════ */}
        {workOrder.notes ? (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={16} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            </View>
            <Text style={[styles.notesText, { color: colors.text }]}>{workOrder.notes}</Text>
          </View>
        ) : null}

        {/* Bottom spacer for footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ════════════ Footer Actions ════════════ */}
      {workOrder.status !== 'completed' && workOrder.status !== 'cancelled' && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {workOrder.status === 'open' && (
            <TouchableOpacity
              style={[styles.footerButton, { backgroundColor: '#10B981' }]}
              onPress={handleStartPress}
              activeOpacity={0.7}
            >
              <Wrench size={18} color="#fff" />
              <Text style={styles.footerButtonText}>Start PM Work</Text>
            </TouchableOpacity>
          )}
          {workOrder.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.footerButton, { backgroundColor: allTasksComplete ? '#10B981' : '#F59E0B' }]}
              onPress={handleCompletePress}
              activeOpacity={0.7}
            >
              <ClipboardList size={18} color="#fff" />
              <Text style={styles.footerButtonText}>
                {allTasksComplete ? 'Complete PM' : `Complete PM (${completedCount}/${totalTasks})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ════════════ Start Work Modal ════════════ */}
      <Modal visible={showStartModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Start PM Work</Text>
              <TouchableOpacity onPress={() => { setShowStartModal(false); setStartSignature(null); }}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* WO Summary */}
              <View style={[styles.modalInfoCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.modalInfoLabel, { color: colors.textSecondary }]}>{workOrder.workOrderNumber}</Text>
                <Text style={[styles.modalInfoValue, { color: colors.text }]}>{workOrder.title}</Text>
                {pmSchedule && (
                  <View style={[styles.modalFrequencyTag, { backgroundColor: '#10B98120' }]}>
                    <RefreshCw size={10} color="#10B981" />
                    <Text style={styles.modalFrequencyText}>
                      {FREQUENCY_LABELS[pmSchedule.frequency] || pmSchedule.frequency}
                    </Text>
                  </View>
                )}
              </View>

              {/* Pre-Start Checklist */}
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Pre-Start Checklist</Text>
              {[
                { label: 'Equipment', value: workOrder.equipment, ok: !!workOrder.equipment },
                { label: 'Location', value: workOrder.location, ok: !!workOrder.location },
                { label: 'Assigned To', value: workOrder.assignedName, ok: !!workOrder.assignedName },
                { label: 'Due Date', value: workOrder.due_date, ok: !!workOrder.due_date },
                { label: 'LOTO Reviewed', value: workOrder.safety.lotoRequired ? `${workOrder.safety.lotoSteps.length} steps` : 'Not required', ok: true },
                { label: 'Safety Reviewed', value: `${workOrder.safety.ppeRequired.length} PPE, ${workOrder.safety.permits.length} permits`, ok: true },
              ].map((item, index) => (
                <View key={index} style={[styles.checklistRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.checklistDot, { backgroundColor: item.ok ? '#10B981' : '#EF4444' }]} />
                  <Text style={[styles.checklistLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[styles.checklistValue, { color: item.ok ? colors.text : '#EF4444' }]} numberOfLines={1}>
                    {item.value || 'Not specified'}
                  </Text>
                </View>
              ))}

              {/* PPN Signature */}
              <Text style={[styles.modalSectionTitle, { color: colors.text, marginTop: 16 }]}>PPN Verification</Text>
              {startSignature ? (
                <View style={[styles.signatureConfirmed, { backgroundColor: '#10B98115' }]}>
                  <Text style={styles.signatureConfirmedText}>✓ Verified: {startSignature.employeeName}</Text>
                  <TouchableOpacity onPress={() => { setStartSignature(null); setShowStartPinPad(true); }}>
                    <Text style={styles.signatureChangeText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.signatureButton, { borderColor: colors.border }]}
                  onPress={() => setShowStartPinPad(true)}
                >
                  <Text style={[styles.signatureButtonText, { color: colors.primary }]}>Tap to Verify PPN</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[styles.modalFooterBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => { setShowStartModal(false); setStartSignature(null); }}
                disabled={isStarting}
              >
                <Text style={[styles.modalFooterBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalFooterBtn, { backgroundColor: startSignature ? '#10B981' : colors.border }]}
                onPress={handleConfirmStart}
                disabled={!startSignature || isStarting}
                activeOpacity={0.7}
              >
                {isStarting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalFooterBtnText, { color: '#fff' }]}>Confirm & Start</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════ Complete PM Modal ════════════ */}
      <Modal visible={showCompleteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Finish & Sign Off</Text>
              <TouchableOpacity onPress={() => { setShowCompleteModal(false); setCompleteSignature(null); setCompletionNotes(''); }}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Task Summary */}
              <View style={[styles.modalInfoCard, { backgroundColor: allTasksComplete ? '#10B98115' : '#F59E0B15' }]}>
                <Text style={[styles.modalInfoLabel, { color: allTasksComplete ? '#10B981' : '#F59E0B' }]}>
                  Tasks: {completedCount}/{totalTasks} Complete
                </Text>
                {!allTasksComplete && (
                  <Text style={[styles.modalInfoWarning, { color: '#F59E0B' }]}>
                    ⚠️ Not all tasks are checked off
                  </Text>
                )}
              </View>

              {/* Completion Notes */}
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Completion Notes *</Text>
              <TextInput
                style={[styles.completionNotesInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Describe the work performed, any findings, parts used..."
                placeholderTextColor={colors.textTertiary}
                value={completionNotes}
                onChangeText={setCompletionNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* PPN Signature */}
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>PPN Verification</Text>
              {completeSignature ? (
                <View style={[styles.signatureConfirmed, { backgroundColor: '#10B98115' }]}>
                  <Text style={styles.signatureConfirmedText}>✓ Verified: {completeSignature.employeeName}</Text>
                  <TouchableOpacity onPress={() => { setCompleteSignature(null); setShowCompletePinPad(true); }}>
                    <Text style={styles.signatureChangeText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.signatureButton, { borderColor: colors.border }]}
                  onPress={() => setShowCompletePinPad(true)}
                >
                  <Text style={[styles.signatureButtonText, { color: colors.primary }]}>Tap to Verify PPN</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[styles.modalFooterBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => { setShowCompleteModal(false); setCompleteSignature(null); setCompletionNotes(''); }}
                disabled={isCompleting}
              >
                <Text style={[styles.modalFooterBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalFooterBtn, {
                  backgroundColor: completeSignature && completionNotes.trim() ? '#10B981' : colors.border,
                }]}
                onPress={handleConfirmComplete}
                disabled={!completeSignature || !completionNotes.trim() || isCompleting}
                activeOpacity={0.7}
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalFooterBtnText, { color: '#fff' }]}>Confirm Completion</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════ PPN Pin Pads ════════════ */}
      <PinPadModal
        visible={showStartPinPad}
        onClose={() => setShowStartPinPad(false)}
        onVerified={handleStartPinVerified}
        title="Verify PPN — Start PM"
      />
      <PinPadModal
        visible={showCompletePinPad}
        onClose={() => setShowCompletePinPad(false)}
        onVerified={handleCompletePinVerified}
        title="Verify PPN — Complete PM"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerWONumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  woTitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  woDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoGrid: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 90,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // ── PM Schedule Styles ──
  scheduleLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  scheduleLoadingText: {
    fontSize: 13,
  },
  scheduleContent: {
    gap: 8,
  },
  scheduleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  scheduleNameText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  scheduleLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 100,
  },
  scheduleValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  frequencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  frequencyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inactiveBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inactiveBadgeText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  scheduleNotFound: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  viewScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  viewScheduleText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  // ── Parts Required Styles ──
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  partIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partContent: {
    flex: 1,
    gap: 1,
  },
  partName: {
    fontSize: 14,
    fontWeight: '500',
  },
  partNumber: {
    fontSize: 11,
  },
  partQtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  partQtyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Task Styles ──
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  taskCheckmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
    gap: 2,
  },
  taskName: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskNameCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  allCompleteBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  allCompleteText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  // ── Safety Styles ──
  safetyBanner: {
    padding: 10,
    borderRadius: 8,
  },
  safetyBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  lotoStepsContainer: {
    gap: 8,
  },
  lotoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
  },
  lotoStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotoStepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  lotoStepText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  safetySubSection: {
    gap: 6,
    marginTop: 4,
  },
  safetySubTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Notes ──
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // ── Footer ──
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // ── Modal Styles ──
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalInfoCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 4,
  },
  modalInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalInfoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalInfoWarning: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  modalFrequencyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  modalFrequencyText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  checklistDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checklistLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 100,
  },
  checklistValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  signatureConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  signatureConfirmedText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  signatureChangeText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
  },
  signatureButton: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 8,
  },
  signatureButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  completionNotesInput: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modalFooterBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  modalFooterBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
