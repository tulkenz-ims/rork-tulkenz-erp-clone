import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Play,
  Square,
  Plus,
  Clock,
  User,
  Trash2,
  X,
  Timer,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useEmployees } from '@/hooks/useSupabaseEmployees';
import {
  useLaborEntriesForWorkOrder,
  useActiveTimers,
  useStartTimer,
  useStopTimer,
  useAddManualLaborEntry,
  useDeleteLaborEntry,
  useLaborSummary,
} from '@/hooks/useSupabaseLaborEntries';

interface LaborTimerProps {
  workOrderId: string;
  workOrderNumber: string;
  workType?: string;
}

// ============================================================================
// Live Elapsed Time Display
// ============================================================================
function ElapsedTime({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState('00:00:00');
  const { colors } = useTheme();

  useEffect(() => {
    const update = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, now - start);

      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      setElapsed(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <Text style={[styles.timerText, { color: '#10B981' }]}>
      {elapsed}
    </Text>
  );
}

// ============================================================================
// Main LaborTimer Component
// ============================================================================
export default function LaborTimer({ workOrderId, workOrderNumber, workType = 'corrective' }: LaborTimerProps) {
  const { colors } = useTheme();
  const { data: employees = [] } = useEmployees();
  const { data: entries = [], isLoading } = useLaborEntriesForWorkOrder(workOrderId);
  const { data: activeTimers = [] } = useActiveTimers(workOrderId);
  const summary = useLaborSummary(workOrderId);

  const startTimerMutation = useStartTimer();
  const stopTimerMutation = useStopTimer();
  const addManualMutation = useAddManualLaborEntry();
  const deleteMutation = useDeleteLaborEntry();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [taskDescription, setTaskDescription] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Filter employees for picker
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.employee_code || '').toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  // Get employee name by ID
  const getEmployeeName = useCallback((id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown';
  }, [employees]);

  const getEmployeeCode = useCallback((id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp?.employee_code || '';
  }, [employees]);

  // Check if employee already has an active timer on this WO
  const hasActiveTimer = useCallback((employeeId: string) => {
    return activeTimers.some(t => t.employee_id === employeeId);
  }, [activeTimers]);

  // ========== ACTIONS ==========

  const handleStartTimer = useCallback(async () => {
    if (!selectedEmployee) {
      Alert.alert('Select Employee', 'Please select who is working on this.');
      return;
    }

    if (hasActiveTimer(selectedEmployee)) {
      Alert.alert('Timer Running', 'This person already has an active timer on this work order.');
      return;
    }

    try {
      await startTimerMutation.mutateAsync({
        work_order_id: workOrderId,
        work_order_number: workOrderNumber,
        employee_id: selectedEmployee,
        employee_name: getEmployeeName(selectedEmployee),
        employee_code: getEmployeeCode(selectedEmployee),
        work_type: workType,
        task_description: taskDescription || undefined,
      });

      setShowAddModal(false);
      setSelectedEmployee(null);
      setTaskDescription('');
      setEmployeeSearch('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not start timer');
    }
  }, [selectedEmployee, workOrderId, workOrderNumber, workType, taskDescription, hasActiveTimer]);

  const handleStopTimer = useCallback(async (entryId: string, employeeName: string) => {
    Alert.alert(
      'Stop Timer',
      `Stop timer for ${employeeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopTimerMutation.mutateAsync({ entry_id: entryId });
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not stop timer');
            }
          },
        },
      ]
    );
  }, []);

  const handleAddManual = useCallback(async () => {
    if (!selectedEmployee) {
      Alert.alert('Select Employee', 'Please select who performed the work.');
      return;
    }

    const hours = parseFloat(manualHours);
    if (isNaN(hours) || hours <= 0) {
      Alert.alert('Invalid Hours', 'Please enter a valid number of hours.');
      return;
    }

    try {
      const emp = employees.find(e => e.id === selectedEmployee);
      await addManualMutation.mutateAsync({
        work_order_id: workOrderId,
        work_order_number: workOrderNumber,
        employee_id: selectedEmployee,
        employee_name: getEmployeeName(selectedEmployee),
        employee_code: getEmployeeCode(selectedEmployee),
        hours_worked: hours,
        work_type: workType,
        task_description: manualDescription || undefined,
        hourly_rate: emp?.hourly_rate || 0,
      });

      setShowManualModal(false);
      setSelectedEmployee(null);
      setManualHours('');
      setManualDescription('');
      setEmployeeSearch('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add entry');
    }
  }, [selectedEmployee, manualHours, manualDescription, workOrderId, workOrderNumber, workType, employees]);

  const handleDelete = useCallback((entryId: string) => {
    Alert.alert(
      'Delete Entry',
      'Remove this labor entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutateAsync(entryId),
        },
      ]
    );
  }, []);

  // ========== COMPLETED ENTRIES ==========
  const completedEntries = useMemo(() => {
    return entries.filter(e => e.end_time !== null);
  }, [entries]);

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // ========== EMPLOYEE PICKER (shared between modals) ==========
  const renderEmployeePicker = () => (
    <View>
      <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Select Employee</Text>
      <TextInput
        style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
        placeholder="Search by name or code..."
        placeholderTextColor={colors.textTertiary}
        value={employeeSearch}
        onChangeText={setEmployeeSearch}
      />
      <ScrollView style={styles.employeeList} nestedScrollEnabled>
        {filteredEmployees.map(emp => {
          const isSelected = selectedEmployee === emp.id;
          const isActive = hasActiveTimer(emp.id);
          return (
            <Pressable
              key={emp.id}
              style={[
                styles.employeeRow,
                {
                  backgroundColor: isSelected ? colors.primary + '20' : colors.background,
                  borderColor: isSelected ? colors.primary : colors.border,
                  opacity: isActive ? 0.5 : 1,
                },
              ]}
              onPress={() => !isActive && setSelectedEmployee(emp.id)}
              disabled={isActive}
            >
              <View style={[styles.employeeAvatar, { backgroundColor: isSelected ? colors.primary : colors.border }]}>
                <User size={14} color={isSelected ? '#fff' : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.employeeName, { color: colors.text }]}>
                  {emp.first_name} {emp.last_name}
                </Text>
                {emp.employee_code && (
                  <Text style={[styles.employeeCode, { color: colors.textSecondary }]}>
                    {emp.employee_code}
                  </Text>
                )}
              </View>
              {isActive && (
                <View style={[styles.activeBadge, { backgroundColor: '#10B981' + '20' }]}>
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '600' }}>ACTIVE</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        {filteredEmployees.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No employees found</Text>
        )}
      </ScrollView>
    </View>
  );

  // ========== RENDER ==========

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Bar */}
      <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {formatHours(summary.totalHours)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Users size={14} color={colors.textSecondary} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {summary.uniqueWorkers}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Workers</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <DollarSign size={14} color={colors.textSecondary} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            ${summary.totalCost.toFixed(2)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Cost</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Timer size={14} color={activeTimers.length > 0 ? '#10B981' : colors.textSecondary} />
          <Text style={[styles.summaryValue, { color: activeTimers.length > 0 ? '#10B981' : colors.text }]}>
            {activeTimers.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
      </View>

      {/* Active Timers */}
      {activeTimers.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Timers</Text>
          {activeTimers.map(timer => (
            <View
              key={timer.id}
              style={[styles.activeTimerCard, { backgroundColor: '#10B981' + '10', borderColor: '#10B981' + '30' }]}
            >
              <View style={[styles.timerDot, { backgroundColor: '#10B981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.timerName, { color: colors.text }]}>
                  {timer.employee_name}
                </Text>
                {timer.task_description && (
                  <Text style={[styles.timerDesc, { color: colors.textSecondary }]}>
                    {timer.task_description}
                  </Text>
                )}
                <Text style={[styles.timerStarted, { color: colors.textTertiary }]}>
                  Started {formatTime(timer.start_time)}
                </Text>
              </View>
              <ElapsedTime startTime={timer.start_time} />
              <Pressable
                style={[styles.stopButton, { backgroundColor: '#EF4444' }]}
                onPress={() => handleStopTimer(timer.id, timer.employee_name)}
              >
                <Square size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: '#10B981' }]}
          onPress={() => setShowAddModal(true)}
        >
          <Play size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Start Timer</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowManualModal(true)}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Log Hours</Text>
        </Pressable>
      </View>

      {/* Completed Entries */}
      {completedEntries.length > 0 && (
        <View style={styles.section}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => setShowHistory(!showHistory)}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Completed ({completedEntries.length})
            </Text>
            {showHistory
              ? <ChevronUp size={18} color={colors.textSecondary} />
              : <ChevronDown size={18} color={colors.textSecondary} />
            }
          </Pressable>
          {showHistory && completedEntries.map(entry => (
            <View
              key={entry.id}
              style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.entryName, { color: colors.text }]}>
                  {entry.employee_name}
                </Text>
                {entry.task_description && (
                  <Text style={[styles.entryDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {entry.task_description}
                  </Text>
                )}
                <Text style={[styles.entryMeta, { color: colors.textTertiary }]}>
                  {formatDate(entry.start_time)} · {formatTime(entry.start_time)} – {entry.end_time ? formatTime(entry.end_time) : '—'}
                </Text>
              </View>
              <View style={styles.entryRight}>
                <Text style={[styles.entryHours, { color: colors.text }]}>
                  {formatHours(entry.hours_worked)}
                </Text>
                {entry.total_labor_cost > 0 && (
                  <Text style={[styles.entryCost, { color: colors.textSecondary }]}>
                    ${entry.total_labor_cost.toFixed(2)}
                  </Text>
                )}
              </View>
              <Pressable
                style={styles.deleteBtn}
                onPress={() => handleDelete(entry.id)}
              >
                <Trash2 size={14} color="#EF4444" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* ========== START TIMER MODAL ========== */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Start Timer</Text>
              <Pressable onPress={() => { setShowAddModal(false); setSelectedEmployee(null); setEmployeeSearch(''); }}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {renderEmployeePicker()}

            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              Task Description (optional)
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="What are they working on?"
              placeholderTextColor={colors.textTertiary}
              value={taskDescription}
              onChangeText={setTaskDescription}
            />

            <Pressable
              style={[
                styles.modalButton,
                { backgroundColor: selectedEmployee ? '#10B981' : colors.border },
              ]}
              onPress={handleStartTimer}
              disabled={!selectedEmployee || startTimerMutation.isPending}
            >
              {startTimerMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Play size={18} color="#fff" />
                  <Text style={styles.modalButtonText}>Start Timer</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ========== MANUAL ENTRY MODAL ========== */}
      <Modal visible={showManualModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Log Hours</Text>
              <Pressable onPress={() => { setShowManualModal(false); setSelectedEmployee(null); setEmployeeSearch(''); }}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {renderEmployeePicker()}

            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              Hours Worked
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 1.5"
              placeholderTextColor={colors.textTertiary}
              value={manualHours}
              onChangeText={setManualHours}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              Description (optional)
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Work performed"
              placeholderTextColor={colors.textTertiary}
              value={manualDescription}
              onChangeText={setManualDescription}
            />

            <Pressable
              style={[
                styles.modalButton,
                { backgroundColor: selectedEmployee && manualHours ? colors.primary : colors.border },
              ]}
              onPress={handleAddManual}
              disabled={!selectedEmployee || !manualHours || addManualMutation.isPending}
            >
              {addManualMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Plus size={18} color="#fff" />
                  <Text style={styles.modalButtonText}>Log Entry</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================
const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: 30,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  timerDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  timerStarted: {
    fontSize: 11,
    marginTop: 2,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  stopButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  entryName: {
    fontSize: 13,
    fontWeight: '600',
  },
  entryDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  entryMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  entryHours: {
    fontSize: 14,
    fontWeight: '700',
  },
  entryCost: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  searchInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  employeeList: {
    maxHeight: 200,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
    gap: 10,
  },
  employeeAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  employeeCode: {
    fontSize: 11,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 13,
  },
  textInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    fontSize: 14,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
