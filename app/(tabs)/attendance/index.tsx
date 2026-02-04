import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Search,
  Filter,
  Bell,
  AlertTriangle,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
  X,
  Calendar,
  CheckCircle,
  AlertCircle,
  Building2,
  User,
  FileText,
  Timer,
  Minus,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useAttendanceRecords,
  useAttendanceSummary,
  useAttendanceExceptions,
  useAllPointsBalances,
} from '@/hooks/useSupabaseAttendance';
import {
  DEFAULT_ATTENDANCE_POLICY,
  EMPTY_ATTENDANCE_ALERTS,
  EMPTY_EMPLOYEE_SUMMARIES,
  EMPTY_DEPARTMENT_SUMMARIES,
  getOccurrenceTypeLabel,
  getOccurrenceTypeColor,
  getOccurrenceStatusColor,
  getStatusColor,
  getStatusLabel,
  getAlertSeverityColor,
} from '@/constants/attendanceConstants';
import type {
  EmployeeAttendanceSummary,
  OccurrenceStatus,
  AttendanceAlert,
  DepartmentAttendanceSummary,
} from '@/types/attendance';
import type { AttendanceRecord } from '@/hooks/useSupabaseAttendance';

type ViewMode = 'overview' | 'employees' | 'occurrences' | 'alerts' | 'departments';
type FilterStatus = 'all' | OccurrenceStatus;
type OccurrenceType = 'tardy' | 'absent' | 'early_out' | 'no_call_no_show' | 'unexcused_absence';
type FilterType = 'all' | OccurrenceType;

interface TransformedOccurrence {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  type: OccurrenceType;
  status: OccurrenceStatus;
  points: number;
  date: string;
  scheduledTime: string | null;
  actualTime: string | null;
  minutesLate: number | null;
  reason: string | null;
  notes: string | null;
  supervisorName: string | null;
  expirationDate: string;
}

export default function AttendanceScreen() {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<TransformedOccurrence | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAttendanceSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Supabase queries
  const { data: attendanceRecords = [], refetch: refetchRecords } = useAttendanceRecords();
  const { summary: attendanceSummary } = useAttendanceSummary();
  const { data: exceptions = [], refetch: refetchExceptions } = useAttendanceExceptions();
  const { data: pointsBalances = [], refetch: refetchBalances } = useAllPointsBalances();

  console.log('[AttendanceScreen] Stats from Supabase:', {
    recordsCount: attendanceRecords.length,
    exceptionsCount: exceptions.length,
    balancesCount: pointsBalances.length,
    summary: attendanceSummary,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchRecords(),
      refetchExceptions(),
      refetchBalances(),
    ]);
    setRefreshing(false);
  }, [refetchRecords, refetchExceptions, refetchBalances]);

  const transformedOccurrences = useMemo((): TransformedOccurrence[] => {
    const mapOccurrenceType = (record: AttendanceRecord): OccurrenceType => {
      if (record.is_no_call_no_show) return 'no_call_no_show';
      if (record.status === 'absent') return 'absent';
      if (record.is_late) return 'tardy';
      if (record.is_early_departure) return 'early_out';
      return 'unexcused_absence';
    };

    const mapOccurrenceStatus = (record: AttendanceRecord): OccurrenceStatus => {
      if (record.exception_approved) return 'excused';
      if (record.approved_at) return 'approved';
      return 'pending';
    };

    return attendanceRecords
      .filter(r => r.is_late || r.is_early_departure || r.is_no_call_no_show || r.status === 'absent')
      .map(record => ({
        id: record.id,
        employeeId: record.employee_id,
        employeeName: record.employee_name,
        employeeCode: record.employee_code || '',
        departmentName: record.department_name || 'Unassigned',
        type: mapOccurrenceType(record),
        status: mapOccurrenceStatus(record),
        points: record.occurrence_points || 0,
        date: record.date,
        scheduledTime: record.scheduled_start,
        actualTime: record.actual_clock_in,
        minutesLate: record.late_minutes > 0 ? record.late_minutes : null,
        reason: record.exception_reason,
        notes: record.notes,
        supervisorName: record.approved_by_name,
        expirationDate: new Date(new Date(record.date).setFullYear(new Date(record.date).getFullYear() + 1)).toISOString(),
      }));
  }, [attendanceRecords]);

  const filteredOccurrences = useMemo(() => {
    return transformedOccurrences.filter((occ) => {
      const matchesSearch =
        searchQuery === '' ||
        occ.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        occ.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        occ.departmentName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'all' || occ.status === filterStatus;
      const matchesType = filterType === 'all' || occ.type === filterType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [transformedOccurrences, searchQuery, filterStatus, filterType]);

  const filteredEmployees = useMemo(() => {
    return EMPTY_EMPLOYEE_SUMMARIES.filter((emp: EmployeeAttendanceSummary) => {
      return (
        searchQuery === '' ||
        emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.departmentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery]);

  const unreadAlerts = useMemo(() => {
    return EMPTY_ATTENDANCE_ALERTS.filter((a: AttendanceAlert) => !a.isRead && !a.isDismissed);
  }, []);

  const stats = useMemo(() => {
    // Use real data from Supabase hooks
    const totalOccurrences = attendanceRecords.filter(r => 
      r.is_late || r.is_early_departure || r.is_no_call_no_show || r.status === 'absent'
    ).length;
    const pendingOccurrences = exceptions.filter((e) => e.status === 'pending').length;
    const employeesAtRisk = pointsBalances.filter(
      (e) => e.warning_level !== 'none'
    ).length;
    const avgPoints = pointsBalances.length > 0
      ? pointsBalances.reduce((sum, e) => sum + e.current_points, 0) / pointsBalances.length
      : 0;

    return { totalOccurrences, pendingOccurrences, employeesAtRisk, avgPoints };
  }, [attendanceRecords, exceptions, pointsBalances]);

  const handleApproveOccurrence = (occurrence: TransformedOccurrence) => {
    Alert.alert(
      'Approve Occurrence',
      `Are you sure you want to approve this ${getOccurrenceTypeLabel(occurrence.type)} for ${occurrence.employeeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => setSelectedOccurrence(null) },
      ]
    );
  };

  const handleExcuseOccurrence = (occurrence: TransformedOccurrence) => {
    Alert.alert(
      'Excuse Occurrence',
      `Are you sure you want to excuse this ${getOccurrenceTypeLabel(occurrence.type)} for ${occurrence.employeeName}? No points will be assessed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Excuse', onPress: () => setSelectedOccurrence(null) },
      ]
    );
  };

  const renderViewTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {[
        { key: 'overview', label: 'Overview', icon: TrendingUp },
        { key: 'employees', label: 'Employees', icon: Users },
        { key: 'occurrences', label: 'Occurrences', icon: Clock },
        { key: 'alerts', label: 'Alerts', icon: Bell, badge: unreadAlerts.length },
        { key: 'departments', label: 'Departments', icon: Building2 },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            { backgroundColor: viewMode === tab.key ? colors.primary : colors.surface },
          ]}
          onPress={() => setViewMode(tab.key as ViewMode)}
        >
          <tab.icon
            size={18}
            color={viewMode === tab.key ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: viewMode === tab.key ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {tab.label}
          </Text>
          {tab.badge && tab.badge > 0 && (
            <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.badgeText}>{tab.badge}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderOverview = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#3B82F620' }]}>
            <FileText size={24} color="#3B82F6" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalOccurrences}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Occurrences</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B20' }]}>
            <Clock size={24} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.pendingOccurrences}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending Review</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#EF444420' }]}>
            <AlertTriangle size={24} color="#EF4444" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.employeesAtRisk}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>At Risk</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#10B98120' }]}>
            <TrendingUp size={24} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.avgPoints.toFixed(1)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Points</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Policy Thresholds</Text>
        </View>
        <View style={styles.thresholdGrid}>
          <View style={styles.thresholdItem}>
            <View style={[styles.thresholdDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Warning</Text>
            <Text style={[styles.thresholdValue, { color: colors.text }]}>
              {DEFAULT_ATTENDANCE_POLICY.warningThreshold} pts
            </Text>
          </View>
          <View style={styles.thresholdItem}>
            <View style={[styles.thresholdDot, { backgroundColor: '#F97316' }]} />
            <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Probation</Text>
            <Text style={[styles.thresholdValue, { color: colors.text }]}>
              {DEFAULT_ATTENDANCE_POLICY.probationThreshold} pts
            </Text>
          </View>
          <View style={styles.thresholdItem}>
            <View style={[styles.thresholdDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Final</Text>
            <Text style={[styles.thresholdValue, { color: colors.text }]}>
              {DEFAULT_ATTENDANCE_POLICY.finalWarningThreshold} pts
            </Text>
          </View>
          <View style={styles.thresholdItem}>
            <View style={[styles.thresholdDot, { backgroundColor: '#DC2626' }]} />
            <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Term</Text>
            <Text style={[styles.thresholdValue, { color: colors.text }]}>
              {DEFAULT_ATTENDANCE_POLICY.terminationThreshold} pts
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Point Values</Text>
        </View>
        <View style={styles.pointValuesList}>
          <View style={styles.pointValueRow}>
            <View style={styles.pointValueLeft}>
              <View style={[styles.pointTypeDot, { backgroundColor: getOccurrenceTypeColor('tardy') }]} />
              <Text style={[styles.pointValueLabel, { color: colors.text }]}>Tardy</Text>
            </View>
            <Text style={[styles.pointValueAmount, { color: colors.textSecondary }]}>
              {DEFAULT_ATTENDANCE_POLICY.pointsPerTardy} pts
            </Text>
          </View>
          <View style={styles.pointValueRow}>
            <View style={styles.pointValueLeft}>
              <View style={[styles.pointTypeDot, { backgroundColor: getOccurrenceTypeColor('absent') }]} />
              <Text style={[styles.pointValueLabel, { color: colors.text }]}>Absent</Text>
            </View>
            <Text style={[styles.pointValueAmount, { color: colors.textSecondary }]}>
              {DEFAULT_ATTENDANCE_POLICY.pointsPerAbsent} pts
            </Text>
          </View>
          <View style={styles.pointValueRow}>
            <View style={styles.pointValueLeft}>
              <View style={[styles.pointTypeDot, { backgroundColor: getOccurrenceTypeColor('early_out') }]} />
              <Text style={[styles.pointValueLabel, { color: colors.text }]}>Early Out</Text>
            </View>
            <Text style={[styles.pointValueAmount, { color: colors.textSecondary }]}>
              {DEFAULT_ATTENDANCE_POLICY.pointsPerEarlyOut} pts
            </Text>
          </View>
          <View style={styles.pointValueRow}>
            <View style={styles.pointValueLeft}>
              <View style={[styles.pointTypeDot, { backgroundColor: getOccurrenceTypeColor('no_call_no_show') }]} />
              <Text style={[styles.pointValueLabel, { color: colors.text }]}>No Call/No Show</Text>
            </View>
            <Text style={[styles.pointValueAmount, { color: colors.textSecondary }]}>
              {DEFAULT_ATTENDANCE_POLICY.pointsPerNoCallNoShow} pts
            </Text>
          </View>
          <View style={styles.pointValueRow}>
            <View style={styles.pointValueLeft}>
              <View style={[styles.pointTypeDot, { backgroundColor: getOccurrenceTypeColor('unexcused_absence') }]} />
              <Text style={[styles.pointValueLabel, { color: colors.text }]}>Unexcused Absence</Text>
            </View>
            <Text style={[styles.pointValueAmount, { color: colors.textSecondary }]}>
              {DEFAULT_ATTENDANCE_POLICY.pointsPerUnexcusedAbsence} pts
            </Text>
          </View>
        </View>
      </View>

      {unreadAlerts.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Alerts</Text>
            <TouchableOpacity onPress={() => setViewMode('alerts')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {unreadAlerts.slice(0, 3).map((alert: AttendanceAlert) => (
            <View
              key={alert.id}
              style={[styles.alertItem, { borderLeftColor: getAlertSeverityColor(alert.severity) }]}
            >
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: colors.text }]}>{alert.title}</Text>
                <Text style={[styles.alertMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                  {alert.message}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Employees At Risk</Text>
          <TouchableOpacity onPress={() => setViewMode('employees')}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        {EMPTY_EMPLOYEE_SUMMARIES.filter((e: EmployeeAttendanceSummary) => e.status !== 'good')
          .slice(0, 5)
          .map((employee: EmployeeAttendanceSummary) => (
            <TouchableOpacity
              key={employee.employeeId}
              style={styles.employeeRow}
              onPress={() => setSelectedEmployee(employee)}
            >
              <View style={styles.employeeInfo}>
                <View style={[styles.avatarContainer, { backgroundColor: colors.border }]}>
                  <Text style={[styles.avatarText, { color: colors.text }]}>
                    {employee.employeeName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.employeeDetails}>
                  <Text style={[styles.employeeName, { color: colors.text }]}>
                    {employee.employeeName}
                  </Text>
                  <Text style={[styles.employeeDept, { color: colors.textSecondary }]}>
                    {employee.departmentName}
                  </Text>
                </View>
              </View>
              <View style={styles.employeeRight}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(employee.status) + '20' },
                  ]}
                >
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(employee.status) }]}>
                    {employee.currentPoints} pts
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
      </View>
    </ScrollView>
  );

  const renderEmployees = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search employees..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {filteredEmployees.map((employee: EmployeeAttendanceSummary) => (
        <TouchableOpacity
          key={employee.employeeId}
          style={[styles.employeeCard, { backgroundColor: colors.surface }]}
          onPress={() => setSelectedEmployee(employee)}
        >
          <View style={styles.employeeCardHeader}>
            <View style={styles.employeeInfo}>
              <View style={[styles.avatarContainer, { backgroundColor: getStatusColor(employee.status) + '30' }]}>
                <Text style={[styles.avatarText, { color: getStatusColor(employee.status) }]}>
                  {employee.employeeName.charAt(0)}
                </Text>
              </View>
              <View style={styles.employeeDetails}>
                <Text style={[styles.employeeName, { color: colors.text }]}>
                  {employee.employeeName}
                </Text>
                <Text style={[styles.employeeCode, { color: colors.textSecondary }]}>
                  {employee.employeeCode} • {employee.departmentName}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </View>

          <View style={styles.pointsBar}>
            <View style={styles.pointsBarLabels}>
              <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>Points</Text>
              <Text style={[styles.pointsValue, { color: colors.text }]}>
                {employee.currentPoints} / {employee.maxPoints}
              </Text>
            </View>
            <View style={[styles.pointsBarTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.pointsBarFill,
                  {
                    backgroundColor: getStatusColor(employee.status),
                    width: `${(employee.currentPoints / employee.maxPoints) * 100}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.thresholdMarker,
                  { left: `${(DEFAULT_ATTENDANCE_POLICY.warningThreshold / employee.maxPoints) * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.thresholdMarker,
                  { left: `${(DEFAULT_ATTENDANCE_POLICY.probationThreshold / employee.maxPoints) * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.thresholdMarker,
                  { left: `${(DEFAULT_ATTENDANCE_POLICY.finalWarningThreshold / employee.maxPoints) * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.employeeStats}>
            <View style={styles.employeeStat}>
              <Text style={[styles.employeeStatValue, { color: colors.text }]}>
                {employee.occurrencesCount}
              </Text>
              <Text style={[styles.employeeStatLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.employeeStat}>
              <Text style={[styles.employeeStatValue, { color: colors.text }]}>
                {employee.tardyCount}
              </Text>
              <Text style={[styles.employeeStatLabel, { color: colors.textSecondary }]}>Tardy</Text>
            </View>
            <View style={styles.employeeStat}>
              <Text style={[styles.employeeStatValue, { color: colors.text }]}>
                {employee.absentCount}
              </Text>
              <Text style={[styles.employeeStatLabel, { color: colors.textSecondary }]}>Absent</Text>
            </View>
            <View style={styles.employeeStat}>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: getStatusColor(employee.status) + '20' },
                ]}
              >
                <Text style={[styles.statusPillText, { color: getStatusColor(employee.status) }]}>
                  {getStatusLabel(employee.status)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderOccurrences = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search occurrences..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => setShowFilters(true)}>
          <Filter size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {(filterStatus !== 'all' || filterType !== 'all') && (
        <View style={styles.activeFilters}>
          {filterStatus !== 'all' && (
            <TouchableOpacity
              style={[styles.filterChip, { backgroundColor: colors.primary + '20' }]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[styles.filterChipText, { color: colors.primary }]}>
                {filterStatus}
              </Text>
              <X size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
          {filterType !== 'all' && (
            <TouchableOpacity
              style={[styles.filterChip, { backgroundColor: colors.primary + '20' }]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[styles.filterChipText, { color: colors.primary }]}>
                {getOccurrenceTypeLabel(filterType as OccurrenceType)}
              </Text>
              <X size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {filteredOccurrences.map((occurrence) => (
        <TouchableOpacity
          key={occurrence.id}
          style={[styles.occurrenceCard, { backgroundColor: colors.surface }]}
          onPress={() => setSelectedOccurrence(occurrence)}
        >
          <View style={styles.occurrenceHeader}>
            <View
              style={[
                styles.occurrenceTypeBadge,
                { backgroundColor: getOccurrenceTypeColor(occurrence.type) + '20' },
              ]}
            >
              <Text
                style={[styles.occurrenceTypeText, { color: getOccurrenceTypeColor(occurrence.type) }]}
              >
                {getOccurrenceTypeLabel(occurrence.type)}
              </Text>
            </View>
            <View
              style={[
                styles.occurrenceStatusBadge,
                { backgroundColor: getOccurrenceStatusColor(occurrence.status) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.occurrenceStatusText,
                  { color: getOccurrenceStatusColor(occurrence.status) },
                ]}
              >
                {occurrence.status}
              </Text>
            </View>
          </View>

          <View style={styles.occurrenceInfo}>
            <Text style={[styles.occurrenceEmployee, { color: colors.text }]}>
              {occurrence.employeeName}
            </Text>
            <Text style={[styles.occurrenceDetails, { color: colors.textSecondary }]}>
              {occurrence.employeeCode} • {occurrence.departmentName}
            </Text>
          </View>

          <View style={styles.occurrenceFooter}>
            <View style={styles.occurrenceDate}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.occurrenceDateText, { color: colors.textSecondary }]}>
                {new Date(occurrence.date).toLocaleDateString()}
              </Text>
            </View>
            {occurrence.minutesLate && (
              <View style={styles.occurrenceTime}>
                <Timer size={14} color={colors.textSecondary} />
                <Text style={[styles.occurrenceTimeText, { color: colors.textSecondary }]}>
                  {occurrence.minutesLate} min late
                </Text>
              </View>
            )}
            <View style={styles.occurrencePoints}>
              <Text style={[styles.occurrencePointsText, { color: colors.primary }]}>
                {occurrence.points} pts
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderAlerts = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {EMPTY_ATTENDANCE_ALERTS.map((alert: AttendanceAlert) => (
        <View
          key={alert.id}
          style={[
            styles.alertCard,
            { backgroundColor: colors.surface, borderLeftColor: getAlertSeverityColor(alert.severity) },
          ]}
        >
          <View style={styles.alertCardHeader}>
            <View
              style={[
                styles.alertSeverityBadge,
                { backgroundColor: getAlertSeverityColor(alert.severity) + '20' },
              ]}
            >
              <AlertCircle size={14} color={getAlertSeverityColor(alert.severity)} />
              <Text
                style={[styles.alertSeverityText, { color: getAlertSeverityColor(alert.severity) }]}
              >
                {alert.severity.toUpperCase()}
              </Text>
            </View>
            {!alert.isRead && <View style={styles.unreadDot} />}
          </View>

          <Text style={[styles.alertCardTitle, { color: colors.text }]}>{alert.title}</Text>
          <Text style={[styles.alertCardMessage, { color: colors.textSecondary }]}>
            {alert.message}
          </Text>

          {alert.employeeName && (
            <View style={styles.alertEmployee}>
              <User size={14} color={colors.textSecondary} />
              <Text style={[styles.alertEmployeeText, { color: colors.textSecondary }]}>
                {alert.employeeName}
              </Text>
            </View>
          )}

          <Text style={[styles.alertTimestamp, { color: colors.textSecondary }]}>
            {new Date(alert.createdAt).toLocaleString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderDepartments = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {EMPTY_DEPARTMENT_SUMMARIES.map((dept: DepartmentAttendanceSummary) => (
        <View key={dept.departmentCode} style={[styles.deptCard, { backgroundColor: colors.surface }]}>
          <View style={styles.deptHeader}>
            <View style={styles.deptTitle}>
              <Building2 size={20} color={colors.primary} />
              <Text style={[styles.deptName, { color: colors.text }]}>{dept.departmentName}</Text>
            </View>
            <View
              style={[
                styles.complianceBadge,
                {
                  backgroundColor:
                    dept.complianceScore >= 90
                      ? '#10B98120'
                      : dept.complianceScore >= 80
                      ? '#F59E0B20'
                      : '#EF444420',
                },
              ]}
            >
              <Text
                style={[
                  styles.complianceText,
                  {
                    color:
                      dept.complianceScore >= 90
                        ? '#10B981'
                        : dept.complianceScore >= 80
                        ? '#F59E0B'
                        : '#EF4444',
                  },
                ]}
              >
                {dept.complianceScore}%
              </Text>
            </View>
          </View>

          <View style={styles.deptStats}>
            <View style={styles.deptStat}>
              <Text style={[styles.deptStatValue, { color: colors.text }]}>{dept.totalEmployees}</Text>
              <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>Employees</Text>
            </View>
            <View style={styles.deptStat}>
              <Text style={[styles.deptStatValue, { color: colors.text }]}>
                {dept.employeesWithOccurrences}
              </Text>
              <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>
                w/ Occurrences
              </Text>
            </View>
            <View style={styles.deptStat}>
              <Text style={[styles.deptStatValue, { color: colors.text }]}>
                {dept.avgPointsPerEmployee.toFixed(2)}
              </Text>
              <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>Avg Pts</Text>
            </View>
            <View style={styles.deptStat}>
              <Text style={[styles.deptStatValue, { color: '#EF4444' }]}>{dept.employeesAtRisk}</Text>
              <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>At Risk</Text>
            </View>
          </View>

          <View style={styles.deptRates}>
            <View style={styles.deptRate}>
              <Text style={[styles.deptRateLabel, { color: colors.textSecondary }]}>Tardy Rate</Text>
              <View style={[styles.deptRateBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.deptRateFill,
                    { backgroundColor: '#F59E0B', width: `${Math.min(dept.tardyRate * 5, 100)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.deptRateValue, { color: colors.text }]}>{dept.tardyRate}%</Text>
            </View>
            <View style={styles.deptRate}>
              <Text style={[styles.deptRateLabel, { color: colors.textSecondary }]}>Absent Rate</Text>
              <View style={[styles.deptRateBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.deptRateFill,
                    { backgroundColor: '#3B82F6', width: `${Math.min(dept.absentRate * 5, 100)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.deptRateValue, { color: colors.text }]}>{dept.absentRate}%</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderOccurrenceModal = () => (
    <Modal
      visible={!!selectedOccurrence}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedOccurrence(null)}
    >
      {selectedOccurrence && (
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Occurrence Details</Text>
            <TouchableOpacity onPress={() => setSelectedOccurrence(null)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Employee</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {selectedOccurrence.employeeName}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Code</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {selectedOccurrence.employeeCode}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Department</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {selectedOccurrence.departmentName}
                </Text>
              </View>
            </View>

            <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Type</Text>
                <View
                  style={[
                    styles.occurrenceTypeBadge,
                    { backgroundColor: getOccurrenceTypeColor(selectedOccurrence.type) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.occurrenceTypeText,
                      { color: getOccurrenceTypeColor(selectedOccurrence.type) },
                    ]}
                  >
                    {getOccurrenceTypeLabel(selectedOccurrence.type)}
                  </Text>
                </View>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Status</Text>
                <View
                  style={[
                    styles.occurrenceStatusBadge,
                    { backgroundColor: getOccurrenceStatusColor(selectedOccurrence.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.occurrenceStatusText,
                      { color: getOccurrenceStatusColor(selectedOccurrence.status) },
                    ]}
                  >
                    {selectedOccurrence.status}
                  </Text>
                </View>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Points</Text>
                <Text style={[styles.modalValue, { color: colors.primary }]}>
                  {selectedOccurrence.points}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Date</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {new Date(selectedOccurrence.date).toLocaleDateString()}
                </Text>
              </View>
              {selectedOccurrence.scheduledTime && (
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Scheduled</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {selectedOccurrence.scheduledTime}
                  </Text>
                </View>
              )}
              {selectedOccurrence.actualTime && (
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Actual</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {selectedOccurrence.actualTime}
                  </Text>
                </View>
              )}
              {selectedOccurrence.minutesLate && (
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Minutes Late</Text>
                  <Text style={[styles.modalValue, { color: '#EF4444' }]}>
                    {selectedOccurrence.minutesLate}
                  </Text>
                </View>
              )}
            </View>

            {selectedOccurrence.reason && (
              <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Reason</Text>
                <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                  {selectedOccurrence.reason}
                </Text>
              </View>
            )}

            {selectedOccurrence.notes && (
              <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Notes</Text>
                <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                  {selectedOccurrence.notes}
                </Text>
              </View>
            )}

            <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Supervisor</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {selectedOccurrence.supervisorName || 'N/A'}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Expires</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {new Date(selectedOccurrence.expirationDate).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {selectedOccurrence.status === 'pending' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                  onPress={() => handleApproveOccurrence(selectedOccurrence)}
                >
                  <CheckCircle size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                  onPress={() => handleExcuseOccurrence(selectedOccurrence)}
                >
                  <Minus size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Excuse</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </Modal>
  );

  const renderEmployeeModal = () => (
    <Modal
      visible={!!selectedEmployee}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedEmployee(null)}
    >
      {selectedEmployee && (
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Employee Details</Text>
            <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.employeeProfileHeader, { backgroundColor: colors.surface }]}>
              <View
                style={[
                  styles.largeAvatar,
                  { backgroundColor: getStatusColor(selectedEmployee.status) + '30' },
                ]}
              >
                <Text style={[styles.largeAvatarText, { color: getStatusColor(selectedEmployee.status) }]}>
                  {selectedEmployee.employeeName.charAt(0)}
                </Text>
              </View>
              <Text style={[styles.employeeProfileName, { color: colors.text }]}>
                {selectedEmployee.employeeName}
              </Text>
              <Text style={[styles.employeeProfileCode, { color: colors.textSecondary }]}>
                {selectedEmployee.employeeCode} • {selectedEmployee.departmentName}
              </Text>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: getStatusColor(selectedEmployee.status) + '20', marginTop: 8 },
                ]}
              >
                <Text style={[styles.statusPillText, { color: getStatusColor(selectedEmployee.status) }]}>
                  {getStatusLabel(selectedEmployee.status)}
                </Text>
              </View>
            </View>

            <View style={[styles.pointsSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.pointsSectionTitle, { color: colors.text }]}>Attendance Points</Text>
              <View style={styles.pointsDisplay}>
                <Text style={[styles.currentPoints, { color: getStatusColor(selectedEmployee.status) }]}>
                  {selectedEmployee.currentPoints}
                </Text>
                <Text style={[styles.maxPoints, { color: colors.textSecondary }]}>
                  / {selectedEmployee.maxPoints}
                </Text>
              </View>
              <View style={[styles.largePointsBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.largePointsFill,
                    {
                      backgroundColor: getStatusColor(selectedEmployee.status),
                      width: `${(selectedEmployee.currentPoints / selectedEmployee.maxPoints) * 100}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.thresholdLegend}>
                <View style={styles.thresholdLegendItem}>
                  <View style={[styles.thresholdLegendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.thresholdLegendText, { color: colors.textSecondary }]}>
                    Warning: {DEFAULT_ATTENDANCE_POLICY.warningThreshold}
                  </Text>
                </View>
                <View style={styles.thresholdLegendItem}>
                  <View style={[styles.thresholdLegendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.thresholdLegendText, { color: colors.textSecondary }]}>
                    Final: {DEFAULT_ATTENDANCE_POLICY.finalWarningThreshold}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Occurrence Breakdown</Text>
              <View style={styles.breakdownGrid}>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: '#F59E0B' }]}>
                    {selectedEmployee.tardyCount}
                  </Text>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Tardy</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: '#3B82F6' }]}>
                    {selectedEmployee.absentCount}
                  </Text>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Absent</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: '#8B5CF6' }]}>
                    {selectedEmployee.earlyOutCount}
                  </Text>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Early Out</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownValue, { color: '#EF4444' }]}>
                    {selectedEmployee.noCallNoShowCount}
                  </Text>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>NCNS</Text>
                </View>
              </View>
            </View>

            <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Points Summary</Text>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>This Month</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {selectedEmployee.pointsThisMonth}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>This Quarter</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {selectedEmployee.pointsThisQuarter}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>This Year</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {selectedEmployee.pointsThisYear}
                </Text>
              </View>
            </View>

            {selectedEmployee.nextExpirationDate && (
              <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Next Expiration</Text>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Date</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {new Date(selectedEmployee.nextExpirationDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Points</Text>
                  <Text style={[styles.modalValue, { color: '#10B981' }]}>
                    -{selectedEmployee.nextExpirationPoints}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </Modal>
  );

  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={[styles.filterSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Status</Text>
            <View style={styles.filterOptions}>
              {['all', 'pending', 'approved', 'excused', 'disputed', 'expired'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: filterStatus === status ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFilterStatus(status as FilterStatus)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: filterStatus === status ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {status === 'all' ? 'All' : status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.filterSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Type</Text>
            <View style={styles.filterOptions}>
              {['all', 'tardy', 'absent', 'early_out', 'no_call_no_show', 'unexcused_absence'].map(
                (type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor: filterType === type ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setFilterType(type as FilterType)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        { color: filterType === type ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {type === 'all' ? 'All' : getOccurrenceTypeLabel(type as OccurrenceType)}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.applyFiltersButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyFiltersText}>Apply Filters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.clearFiltersButton, { borderColor: colors.border }]}
            onPress={() => {
              setFilterStatus('all');
              setFilterType('all');
              setShowFilters(false);
            }}
          >
            <Text style={[styles.clearFiltersText, { color: colors.textSecondary }]}>
              Clear All Filters
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderViewTabs()}
      {viewMode === 'overview' && renderOverview()}
      {viewMode === 'employees' && renderEmployees()}
      {viewMode === 'occurrences' && renderOccurrences()}
      {viewMode === 'alerts' && renderAlerts()}
      {viewMode === 'departments' && renderDepartments()}
      {renderOccurrenceModal()}
      {renderEmployeeModal()}
      {renderFiltersModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    maxHeight: 50,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  thresholdGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  thresholdItem: {
    alignItems: 'center',
  },
  thresholdDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  thresholdLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  thresholdValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  pointValuesList: {
    gap: 12,
  },
  pointValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointValueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pointValueLabel: {
    fontSize: 14,
  },
  pointValueAmount: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  alertItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 12,
  },
  alertContent: {},
  alertTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 13,
  },
  employeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  employeeDept: {
    fontSize: 12,
    marginTop: 2,
  },
  employeeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'capitalize' as const,
  },
  employeeCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  employeeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeCode: {
    fontSize: 12,
    marginTop: 2,
  },
  pointsBar: {
    marginBottom: 12,
  },
  pointsBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pointsLabel: {
    fontSize: 12,
  },
  pointsValue: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  pointsBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  pointsBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  thresholdMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  employeeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeStat: {
    alignItems: 'center',
  },
  employeeStatValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  employeeStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  occurrenceCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  occurrenceHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  occurrenceTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  occurrenceTypeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  occurrenceStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  occurrenceStatusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  occurrenceInfo: {
    marginBottom: 12,
  },
  occurrenceEmployee: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  occurrenceDetails: {
    fontSize: 13,
    marginTop: 2,
  },
  occurrenceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  occurrenceDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  occurrenceDateText: {
    fontSize: 12,
  },
  occurrenceTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  occurrenceTimeText: {
    fontSize: 12,
  },
  occurrencePoints: {
    marginLeft: 'auto',
  },
  occurrencePointsText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  alertCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertSeverityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  alertSeverityText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  alertCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  alertCardMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  alertEmployee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  alertEmployeeText: {
    fontSize: 13,
  },
  alertTimestamp: {
    fontSize: 12,
  },
  deptCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  deptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deptTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deptName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  complianceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  complianceText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  deptStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  deptStat: {
    alignItems: 'center',
  },
  deptStatValue: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  deptStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  deptRates: {
    gap: 12,
  },
  deptRate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deptRateLabel: {
    fontSize: 12,
    width: 70,
  },
  deptRateBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  deptRateFill: {
    height: '100%',
    borderRadius: 3,
  },
  deptRateValue: {
    fontSize: 12,
    fontWeight: '500' as const,
    width: 40,
    textAlign: 'right' as const,
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
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
  },
  modalSection: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalLabel: {
    fontSize: 14,
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    margin: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  employeeProfileHeader: {
    alignItems: 'center',
    padding: 24,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  largeAvatarText: {
    fontSize: 32,
    fontWeight: '600' as const,
  },
  employeeProfileName: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  employeeProfileCode: {
    fontSize: 14,
    marginTop: 4,
  },
  pointsSection: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  pointsSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  pointsDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  currentPoints: {
    fontSize: 48,
    fontWeight: '700' as const,
  },
  maxPoints: {
    fontSize: 24,
  },
  largePointsBar: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  largePointsFill: {
    height: '100%',
    borderRadius: 6,
  },
  thresholdLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  thresholdLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thresholdLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thresholdLegendText: {
    fontSize: 12,
  },
  breakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownValue: {
    fontSize: 24,
    fontWeight: '600' as const,
  },
  breakdownLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  filterSection: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    textTransform: 'capitalize' as const,
  },
  applyFiltersButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  clearFiltersButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
});
