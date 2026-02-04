import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Clock,
  Users,
  Search,
  Calendar,
  Edit3,
  Trash2,
  Plus,
  ChevronRight,
  X,
  Check,
  History,
  FileText,
  AlertTriangle,
  Coffee,
  LogIn,
  LogOut,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useAdminEmployeesList,
  useAdminEmployeeTimeEntries,
  useAdminEmployeeTimePunches,
  useAdminUpdateTimeEntry,
  useAdminDeleteTimeEntry,
  useAdminDeleteTimePunch,
  useAdminCreateTimeEntry,
  useTimeAuditLogs,
  type TimeEntry,
  type TimePunch,
} from '@/hooks/useSupabaseTimeClock';
import DatePickerModal from '@/components/DatePickerModal';

type ViewMode = 'entries' | 'punches' | 'audit';

const PUNCH_TYPE_LABELS: Record<string, string> = {
  clock_in: 'Clock In',
  clock_out: 'Clock Out',
  break_start: 'Break Start',
  break_end: 'Break End',
};

const PUNCH_TYPE_COLORS: Record<string, string> = {
  clock_in: '#10B981',
  clock_out: '#EF4444',
  break_start: '#F59E0B',
  break_end: '#3B82F6',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  completed: '#3B82F6',
  pending_approval: '#F59E0B',
  approved: '#8B5CF6',
};

export default function TimeEditorScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('entries');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });
  
  const [editEntryModalVisible, setEditEntryModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [createEntryModalVisible, setCreateEntryModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [selectedPunch, setSelectedPunch] = useState<TimePunch | null>(null);
  const [deleteType, setDeleteType] = useState<'entry' | 'punch'>('entry');
  const [editReason, setEditReason] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'start' | 'end' | 'entryDate' | 'clockIn' | 'clockOut'>('start');

  const [editFormData, setEditFormData] = useState({
    clockIn: '',
    clockOut: '',
    breakMinutes: '0',
    paidBreakMinutes: '0',
    unpaidBreakMinutes: '0',
    notes: '',
  });

  const [createFormData, setCreateFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    clockIn: '',
    clockOut: '',
    breakMinutes: '0',
    notes: '',
  });

  const { data: employees = [], isLoading: loadingEmployees } = useAdminEmployeesList();
  const { data: entries = [], isLoading: loadingEntries, refetch: refetchEntries } = useAdminEmployeeTimeEntries(
    selectedEmployeeId || undefined,
    { startDate: dateRange.start, endDate: dateRange.end, limit: 100 }
  );
  const { data: punches = [], isLoading: loadingPunches, refetch: refetchPunches } = useAdminEmployeeTimePunches(
    selectedEmployeeId || undefined,
    { startDate: dateRange.start, endDate: dateRange.end, limit: 200 }
  );
  const { data: auditLogs = [], isLoading: loadingAudit, refetch: refetchAudit } = useTimeAuditLogs(
    { employeeId: selectedEmployeeId || undefined, limit: 100 }
  );

  const updateEntryMutation = useAdminUpdateTimeEntry();
  const deleteEntryMutation = useAdminDeleteTimeEntry();
  const deletePunchMutation = useAdminDeleteTimePunch();
  const createEntryMutation = useAdminCreateTimeEntry();

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(query) ||
      emp.employee_code.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  const handleSelectEmployee = useCallback((empId: string) => {
    setSelectedEmployeeId(empId);
    setViewMode('entries');
  }, []);

  const handleEditEntry = useCallback((entry: TimeEntry) => {
    setSelectedEntry(entry);
    setEditFormData({
      clockIn: entry.clock_in || '',
      clockOut: entry.clock_out || '',
      breakMinutes: String(entry.break_minutes || 0),
      paidBreakMinutes: String((entry as any).paid_break_minutes || 0),
      unpaidBreakMinutes: String((entry as any).unpaid_break_minutes || 0),
      notes: (entry as any).notes || '',
    });
    setEditReason('');
    setEditEntryModalVisible(true);
  }, []);

  const handleSaveEntry = useCallback(async () => {
    if (!selectedEntry || !user || !selectedEmployeeId) return;

    try {
      await updateEntryMutation.mutateAsync({
        entryId: selectedEntry.id,
        employeeId: selectedEmployeeId,
        updates: {
          clock_in: editFormData.clockIn || undefined,
          clock_out: editFormData.clockOut || undefined,
          break_minutes: parseInt(editFormData.breakMinutes) || 0,
          paid_break_minutes: parseInt(editFormData.paidBreakMinutes) || 0,
          unpaid_break_minutes: parseInt(editFormData.unpaidBreakMinutes) || 0,
          notes: editFormData.notes || undefined,
        },
        reason: editReason,
        adminId: user.id,
        adminName: `${user.first_name} ${user.last_name}`,
      });
      setEditEntryModalVisible(false);
      Alert.alert('Success', 'Time entry updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update time entry');
    }
  }, [selectedEntry, user, selectedEmployeeId, editFormData, editReason, updateEntryMutation]);

  const handleDeleteEntry = useCallback((entry: TimeEntry) => {
    setSelectedEntry(entry);
    setDeleteType('entry');
    setEditReason('');
    setDeleteConfirmVisible(true);
  }, []);

  const handleDeletePunch = useCallback((punch: TimePunch) => {
    setSelectedPunch(punch);
    setDeleteType('punch');
    setEditReason('');
    setDeleteConfirmVisible(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    console.log('[TimeEditor] handleConfirmDelete called', {
      hasUser: !!user,
      userId: user?.id,
      userFirstName: user?.first_name,
      userLastName: user?.last_name,
      userRole: user?.role,
      selectedEmployeeId,
      deleteType,
      hasSelectedEntry: !!selectedEntry,
      selectedEntryId: selectedEntry?.id,
      hasSelectedPunch: !!selectedPunch,
      selectedPunchId: selectedPunch?.id,
      editReason,
    });

    if (!user || !user.id) {
      console.error('[TimeEditor] No user logged in or user.id missing');
      Alert.alert('Error', 'You must be logged in to perform this action. Please log out and log back in.');
      return;
    }

    if (!selectedEmployeeId) {
      console.error('[TimeEditor] No selected employee ID');
      Alert.alert('Error', 'No employee selected');
      return;
    }

    const adminId = user.id;
    const adminName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Admin';

    try {
      if (deleteType === 'entry' && selectedEntry) {
        console.log('[TimeEditor] Deleting time entry:', selectedEntry.id, 'by admin:', adminId, adminName);
        await deleteEntryMutation.mutateAsync({
          entryId: selectedEntry.id,
          employeeId: selectedEmployeeId,
          reason: editReason || 'Admin deleted time entry',
          adminId,
          adminName,
        });
        console.log('[TimeEditor] Time entry deleted successfully');
        setDeleteConfirmVisible(false);
        setSelectedEntry(null);
        refetchEntries();
        Alert.alert('Success', 'Time entry deleted');
      } else if (deleteType === 'punch' && selectedPunch) {
        console.log('[TimeEditor] Deleting time punch:', selectedPunch.id, 'by admin:', adminId, adminName);
        await deletePunchMutation.mutateAsync({
          punchId: selectedPunch.id,
          employeeId: selectedEmployeeId,
          reason: editReason || 'Admin deleted time punch',
          adminId,
          adminName,
        });
        console.log('[TimeEditor] Time punch deleted successfully');
        setDeleteConfirmVisible(false);
        setSelectedPunch(null);
        refetchPunches();
        Alert.alert('Success', 'Time punch deleted');
      } else {
        console.error('[TimeEditor] No entry or punch selected for deletion', { deleteType, selectedEntry, selectedPunch });
        Alert.alert('Error', 'No record selected for deletion');
      }
    } catch (error: any) {
      console.error('[TimeEditor] Delete failed:', error);
      console.error('[TimeEditor] Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error) : 'Failed to delete record');
      Alert.alert('Error', errorMessage);
    }
  }, [deleteType, selectedEntry, selectedPunch, user, selectedEmployeeId, editReason, deleteEntryMutation, deletePunchMutation, refetchEntries, refetchPunches]);

  const handleCreateEntry = useCallback(async () => {
    if (!user || !selectedEmployeeId) return;

    if (!createFormData.clockIn) {
      Alert.alert('Required', 'Clock in time is required');
      return;
    }

    try {
      await createEntryMutation.mutateAsync({
        employeeId: selectedEmployeeId,
        date: createFormData.date,
        clockIn: createFormData.clockIn,
        clockOut: createFormData.clockOut || undefined,
        breakMinutes: parseInt(createFormData.breakMinutes) || 0,
        notes: createFormData.notes || undefined,
        adminId: user.id,
        adminName: `${user.first_name} ${user.last_name}`,
        reason: 'Admin manually created time entry',
      });
      setCreateEntryModalVisible(false);
      setCreateFormData({
        date: new Date().toISOString().split('T')[0],
        clockIn: '',
        clockOut: '',
        breakMinutes: '0',
        notes: '',
      });
      Alert.alert('Success', 'Time entry created successfully');
    } catch {
      Alert.alert('Error', 'Failed to create time entry');
    }
  }, [user, selectedEmployeeId, createFormData, createEntryMutation]);

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDateSelect = useCallback((date: Date) => {
    const dateStr = date.toISOString();
    if (datePickerField === 'start') {
      setDateRange(prev => ({ ...prev, start: dateStr.split('T')[0] }));
    } else if (datePickerField === 'end') {
      setDateRange(prev => ({ ...prev, end: dateStr.split('T')[0] }));
    } else if (datePickerField === 'entryDate') {
      setCreateFormData(prev => ({ ...prev, date: dateStr.split('T')[0] }));
    } else if (datePickerField === 'clockIn') {
      setEditFormData(prev => ({ ...prev, clockIn: dateStr }));
    } else if (datePickerField === 'clockOut') {
      setEditFormData(prev => ({ ...prev, clockOut: dateStr }));
    }
    setDatePickerVisible(false);
  }, [datePickerField]);

  const onRefresh = useCallback(() => {
    refetchEntries();
    refetchPunches();
    refetchAudit();
  }, [refetchEntries, refetchPunches, refetchAudit]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      height: 44,
      fontSize: 16,
      color: colors.text,
    },
    content: {
      flex: 1,
    },
    splitView: {
      flex: 1,
      flexDirection: 'row',
    },
    employeeList: {
      width: '100%',
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    employeeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    employeeItemSelected: {
      backgroundColor: colors.primary + '15',
    },
    employeeAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    employeeInfo: {
      flex: 1,
    },
    employeeName: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    employeeMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    employeeCode: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500' as const,
    },
    detailPanel: {
      flex: 1,
      padding: 16,
    },
    detailHeader: {
      marginBottom: 16,
    },
    selectedEmployeeName: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
    },
    selectedEmployeeMeta: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    tabsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    dateRangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateButtonText: {
      fontSize: 13,
      color: colors.text,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.primary,
      marginLeft: 'auto',
    },
    addButtonText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    entryCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderLeftWidth: 4,
    },
    entryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    entryDate: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    entryStatus: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    entryStatusText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    entryDetails: {
      gap: 6,
    },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    entryLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      width: 80,
    },
    entryValue: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '500' as const,
    },
    entryActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    editButton: {
      backgroundColor: colors.primary + '15',
    },
    deleteButton: {
      backgroundColor: '#EF444415',
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    punchCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    punchIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    punchInfo: {
      flex: 1,
    },
    punchType: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    punchTime: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    punchDelete: {
      padding: 8,
    },
    auditCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
    },
    auditHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    auditAction: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    auditBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    auditBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    auditDetails: {
      gap: 4,
    },
    auditText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    auditBy: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic' as const,
      marginTop: 6,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    closeButton: {
      padding: 8,
    },
    modalBody: {
      padding: 20,
    },
    formGroup: {
      marginBottom: 20,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    formInput: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      color: colors.text,
    },
    formInputMultiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    formHalf: {
      flex: 1,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    modalButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
    },
    cancelButton: {
      backgroundColor: colors.background,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    deleteConfirmButton: {
      backgroundColor: '#EF4444',
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    cancelButtonText: {
      color: colors.text,
    },
    saveButtonText: {
      color: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    warningBox: {
      backgroundColor: '#FEF3C7',
      borderRadius: 10,
      padding: 14,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    warningText: {
      flex: 1,
      fontSize: 14,
      color: '#92400E',
      lineHeight: 20,
    },
  });

  const getPunchIcon = (type: string) => {
    switch (type) {
      case 'clock_in': return LogIn;
      case 'clock_out': return LogOut;
      case 'break_start': return Coffee;
      case 'break_end': return Coffee;
      default: return Clock;
    }
  };

  const getAuditColor = (action: string) => {
    switch (action) {
      case 'create': return '#10B981';
      case 'update': return '#F59E0B';
      case 'delete': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Employee Time Editor',
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select an employee to view/edit time data</Text>
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.content}>
        {!selectedEmployeeId ? (
          <ScrollView
            style={styles.employeeList}
            refreshControl={
              <RefreshControl refreshing={loadingEmployees} onRefresh={onRefresh} />
            }
          >
            {filteredEmployees.map(emp => (
              <TouchableOpacity
                key={emp.id}
                style={[
                  styles.employeeItem,
                  selectedEmployeeId === emp.id && styles.employeeItemSelected,
                ]}
                onPress={() => handleSelectEmployee(emp.id)}
              >
                <View style={styles.employeeAvatar}>
                  <Users size={20} color={colors.primary} />
                </View>
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{emp.name}</Text>
                  <Text style={styles.employeeMeta}>{emp.department} • {emp.position}</Text>
                </View>
                <Text style={styles.employeeCode}>{emp.employee_code}</Text>
                <ChevronRight size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.detailPanel}
            refreshControl={
              <RefreshControl
                refreshing={loadingEntries || loadingPunches || loadingAudit}
                onRefresh={onRefresh}
              />
            }
          >
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setSelectedEmployeeId(null)}>
                <Text style={{ color: colors.primary, marginBottom: 8 }}>← Back to list</Text>
              </TouchableOpacity>
              <Text style={styles.selectedEmployeeName}>{selectedEmployee?.name}</Text>
              <Text style={styles.selectedEmployeeMeta}>
                {selectedEmployee?.department} • {selectedEmployee?.position} • {selectedEmployee?.employee_code}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tabsRow}>
                <TouchableOpacity
                  style={[styles.tab, viewMode === 'entries' && styles.tabActive]}
                  onPress={() => setViewMode('entries')}
                >
                  <FileText size={16} color={viewMode === 'entries' ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.tabText, viewMode === 'entries' && styles.tabTextActive]}>
                    Time Entries
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, viewMode === 'punches' && styles.tabActive]}
                  onPress={() => setViewMode('punches')}
                >
                  <Clock size={16} color={viewMode === 'punches' ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.tabText, viewMode === 'punches' && styles.tabTextActive]}>
                    Punches
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, viewMode === 'audit' && styles.tabActive]}
                  onPress={() => setViewMode('audit')}
                >
                  <History size={16} color={viewMode === 'audit' ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.tabText, viewMode === 'audit' && styles.tabTextActive]}>
                    Audit Trail
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.dateRangeRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => { setDatePickerField('start'); setDatePickerVisible(true); }}
              >
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={styles.dateButtonText}>{formatDate(dateRange.start)}</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.textSecondary }}>to</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => { setDatePickerField('end'); setDatePickerVisible(true); }}
              >
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={styles.dateButtonText}>{formatDate(dateRange.end)}</Text>
              </TouchableOpacity>

              {viewMode === 'entries' && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setCreateEntryModalVisible(true)}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add Entry</Text>
                </TouchableOpacity>
              )}
            </View>

            {viewMode === 'entries' && (
              <>
                {loadingEntries ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : entries.length === 0 ? (
                  <View style={styles.emptyState}>
                    <FileText size={48} color={colors.textSecondary} style={styles.emptyIcon} />
                    <Text style={styles.emptyText}>No time entries found for this period</Text>
                  </View>
                ) : (
                  entries.map(entry => (
                    <View
                      key={entry.id}
                      style={[
                        styles.entryCard,
                        { borderLeftColor: STATUS_COLORS[entry.status] || colors.border },
                      ]}
                    >
                      <View style={styles.entryHeader}>
                        <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                        <View style={[styles.entryStatus, { backgroundColor: STATUS_COLORS[entry.status] }]}>
                          <Text style={styles.entryStatusText}>{entry.status}</Text>
                        </View>
                      </View>
                      <View style={styles.entryDetails}>
                        <View style={styles.entryRow}>
                          <Text style={styles.entryLabel}>Clock In:</Text>
                          <Text style={styles.entryValue}>{formatTime(entry.clock_in)}</Text>
                        </View>
                        <View style={styles.entryRow}>
                          <Text style={styles.entryLabel}>Clock Out:</Text>
                          <Text style={styles.entryValue}>{formatTime(entry.clock_out)}</Text>
                        </View>
                        <View style={styles.entryRow}>
                          <Text style={styles.entryLabel}>Break:</Text>
                          <Text style={styles.entryValue}>{entry.break_minutes} min</Text>
                        </View>
                        <View style={styles.entryRow}>
                          <Text style={styles.entryLabel}>Total:</Text>
                          <Text style={[styles.entryValue, { color: colors.primary }]}>
                            {entry.total_hours.toFixed(2)} hrs
                          </Text>
                        </View>
                      </View>
                      <View style={styles.entryActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.editButton]}
                          onPress={() => handleEditEntry(entry)}
                        >
                          <Edit3 size={14} color={colors.primary} />
                          <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => handleDeleteEntry(entry)}
                        >
                          <Trash2 size={14} color="#EF4444" />
                          <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {viewMode === 'punches' && (
              <>
                {loadingPunches ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : punches.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Clock size={48} color={colors.textSecondary} style={styles.emptyIcon} />
                    <Text style={styles.emptyText}>No punches found for this period</Text>
                  </View>
                ) : (
                  punches.map(punch => {
                    const IconComponent = getPunchIcon(punch.type);
                    const punchColor = PUNCH_TYPE_COLORS[punch.type] || colors.textSecondary;
                    return (
                      <View key={punch.id} style={styles.punchCard}>
                        <View style={[styles.punchIcon, { backgroundColor: punchColor + '20' }]}>
                          <IconComponent size={18} color={punchColor} />
                        </View>
                        <View style={styles.punchInfo}>
                          <Text style={styles.punchType}>{PUNCH_TYPE_LABELS[punch.type]}</Text>
                          <Text style={styles.punchTime}>{formatDateTime(punch.timestamp)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.punchDelete}
                          onPress={() => handleDeletePunch(punch)}
                        >
                          <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </>
            )}

            {viewMode === 'audit' && (
              <>
                {loadingAudit ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : auditLogs.length === 0 ? (
                  <View style={styles.emptyState}>
                    <History size={48} color={colors.textSecondary} style={styles.emptyIcon} />
                    <Text style={styles.emptyText}>No audit history found</Text>
                  </View>
                ) : (
                  auditLogs.map(log => (
                    <View key={log.id} style={styles.auditCard}>
                      <View style={styles.auditHeader}>
                        <View style={[styles.auditBadge, { backgroundColor: getAuditColor(log.action_type) }]}>
                          <Text style={styles.auditBadgeText}>{log.action_type.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.auditAction}>{log.table_name.replace('_', ' ')}</Text>
                      </View>
                      <View style={styles.auditDetails}>
                        <Text style={styles.auditText}>
                          {formatDateTime(log.created_at)}
                        </Text>
                        {log.reason && (
                          <Text style={styles.auditText}>Reason: {log.reason}</Text>
                        )}
                      </View>
                      <Text style={styles.auditBy}>By: {log.performed_by_name}</Text>
                    </View>
                  ))
                )}
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>

      {/* Edit Entry Modal */}
      <Modal
        visible={editEntryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditEntryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Time Entry</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setEditEntryModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Clock In</Text>
                    <TouchableOpacity
                      style={styles.formInput}
                      onPress={() => { setDatePickerField('clockIn'); setDatePickerVisible(true); }}
                    >
                      <Text style={{ color: editFormData.clockIn ? colors.text : colors.textSecondary }}>
                        {editFormData.clockIn ? formatDateTime(editFormData.clockIn) : 'Select time'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.formHalf}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Clock Out</Text>
                    <TouchableOpacity
                      style={styles.formInput}
                      onPress={() => { setDatePickerField('clockOut'); setDatePickerVisible(true); }}
                    >
                      <Text style={{ color: editFormData.clockOut ? colors.text : colors.textSecondary }}>
                        {editFormData.clockOut ? formatDateTime(editFormData.clockOut) : 'Select time'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Break Minutes</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editFormData.breakMinutes}
                      onChangeText={(v) => setEditFormData(prev => ({ ...prev, breakMinutes: v }))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.formHalf}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Paid Break Min</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editFormData.paidBreakMinutes}
                      onChangeText={(v) => setEditFormData(prev => ({ ...prev, paidBreakMinutes: v }))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  value={editFormData.notes}
                  onChangeText={(v) => setEditFormData(prev => ({ ...prev, notes: v }))}
                  multiline
                  placeholder="Optional notes..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reason for Change *</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  value={editReason}
                  onChangeText={setEditReason}
                  multiline
                  placeholder="Why is this change being made?"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditEntryModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEntry}
                disabled={updateEntryMutation.isPending}
              >
                {updateEntryMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" />
                    <Text style={[styles.modalButtonText, styles.saveButtonText]}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Entry Modal */}
      <Modal
        visible={createEntryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateEntryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Time Entry</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setCreateEntryModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.warningBox}>
                <AlertTriangle size={20} color="#D97706" />
                <Text style={styles.warningText}>
                  Creating a manual time entry will be logged in the audit trail.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date *</Text>
                <TouchableOpacity
                  style={styles.formInput}
                  onPress={() => { setDatePickerField('entryDate'); setDatePickerVisible(true); }}
                >
                  <Text style={{ color: colors.text }}>{formatDate(createFormData.date)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Clock In *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={createFormData.clockIn}
                      onChangeText={(v) => setCreateFormData(prev => ({ ...prev, clockIn: v }))}
                      placeholder="2025-01-25T08:00:00"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
                <View style={styles.formHalf}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Clock Out</Text>
                    <TextInput
                      style={styles.formInput}
                      value={createFormData.clockOut}
                      onChangeText={(v) => setCreateFormData(prev => ({ ...prev, clockOut: v }))}
                      placeholder="2025-01-25T17:00:00"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Break Minutes</Text>
                <TextInput
                  style={styles.formInput}
                  value={createFormData.breakMinutes}
                  onChangeText={(v) => setCreateFormData(prev => ({ ...prev, breakMinutes: v }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  value={createFormData.notes}
                  onChangeText={(v) => setCreateFormData(prev => ({ ...prev, notes: v }))}
                  multiline
                  placeholder="Optional notes..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCreateEntryModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCreateEntry}
                disabled={createEntryMutation.isPending}
              >
                {createEntryMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Plus size={18} color="#FFFFFF" />
                    <Text style={[styles.modalButtonText, styles.saveButtonText]}>Create</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderRadius: 16, marginHorizontal: 20, marginBottom: 'auto', marginTop: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Delete</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setDeleteConfirmVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.warningBox}>
                <AlertTriangle size={20} color="#D97706" />
                <Text style={styles.warningText}>
                  This action cannot be undone. The deletion will be logged in the audit trail.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reason for Deletion *</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  value={editReason}
                  onChangeText={setEditReason}
                  multiline
                  placeholder="Why is this record being deleted?"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={handleConfirmDelete}
                disabled={deleteEntryMutation.isPending || deletePunchMutation.isPending}
              >
                {(deleteEntryMutation.isPending || deletePunchMutation.isPending) ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Trash2 size={18} color="#FFFFFF" />
                    <Text style={[styles.modalButtonText, styles.saveButtonText]}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onSelect={handleDateSelect}
        selectedDate={
          datePickerField === 'start' ? new Date(dateRange.start) :
          datePickerField === 'end' ? new Date(dateRange.end) :
          datePickerField === 'entryDate' ? new Date(createFormData.date) :
          new Date()
        }
        title={
          datePickerField === 'start' ? 'Select Start Date' :
          datePickerField === 'end' ? 'Select End Date' :
          datePickerField === 'entryDate' ? 'Select Date' :
          'Select Date & Time'
        }
      />
    </View>
  );
}
