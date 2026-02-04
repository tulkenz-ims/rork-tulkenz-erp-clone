import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Clock,
  AlertTriangle,
  Users,
  Building2,
  TrendingUp,
  Search,
  Bell,
  BellOff,
  X,
  CheckCircle,
  Calendar,
  DollarSign,
  AlertCircle,
  Activity,
  Shield,
  Eye,
  Check,
  XCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useOvertimeRequests,
  useOvertimeSummary,
  useApproveOvertimeRequest,
  useRejectOvertimeRequest,
  type OvertimeRequest,
} from '@/hooks/useSupabaseOvertime';
import {
  MOCK_OVERTIME_ALERTS,
  MOCK_EMPLOYEE_OVERTIME_SUMMARIES,
  MOCK_DEPARTMENT_OVERTIME_SUMMARIES,
  getAlertSeverityColor,
  getComplianceStatusColor,
  getOvertimeTypeColor,
  getOvertimeStatusColor,
  type OvertimeAlert,
  type EmployeeOvertimeSummary,
  type DepartmentOvertimeSummary,
  type OvertimeAlertSeverity,
} from '@/constants/overtimeConstants';

type ViewMode = 'alerts' | 'employees' | 'departments' | 'records';
type AlertFilter = 'all' | 'unread' | 'critical' | 'high';

interface OvertimeRecordUI {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentCode: string;
  departmentName: string;
  date: string;
  scheduledHours: number;
  actualHours: number;
  overtimeHours: number;
  overtimeType: 'voluntary' | 'mandatory' | 'emergency';
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string;
  approvedAt?: string;
  hourlyRate: number;
  overtimeRate: number;
  overtimePay: number;
  createdAt: string;
}

export default function OvertimeTrackingScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const [viewMode, setViewMode] = useState<ViewMode>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all');
  const [selectedAlert, setSelectedAlert] = useState<OvertimeAlert | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOvertimeSummary | null>(null);
  const [, setSelectedDepartment] = useState<DepartmentOvertimeSummary | null>(null);
  const [alerts, setAlerts] = useState(MOCK_OVERTIME_ALERTS);
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecordUI | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const { data: overtimeRequests, isLoading, refetch } = useOvertimeRequests();
  const { summary } = useOvertimeSummary();
  const approveOvertimeMutation = useApproveOvertimeRequest();
  const rejectOvertimeMutation = useRejectOvertimeRequest();

  const styles = createStyles(colors);

  const mapRequestToUI = useCallback((req: OvertimeRequest): OvertimeRecordUI => ({
    id: req.id,
    employeeId: req.employee_id,
    employeeName: req.employee_name,
    employeeCode: req.employee_code || '',
    departmentCode: req.department_code || '',
    departmentName: req.department_name || '',
    date: req.date,
    scheduledHours: req.scheduled_hours,
    actualHours: req.actual_hours || req.scheduled_hours + req.overtime_hours,
    overtimeHours: req.overtime_hours,
    overtimeType: req.overtime_type,
    reason: req.reason,
    status: req.status,
    approvedBy: req.approved_by_name || undefined,
    approvedAt: req.approved_at || undefined,
    hourlyRate: req.hourly_rate || 0,
    overtimeRate: req.overtime_rate || 0,
    overtimePay: req.overtime_pay || 0,
    createdAt: req.created_at,
  }), []);

  const overtimeRecords = useMemo(() => {
    return (overtimeRequests || []).map(mapRequestToUI);
  }, [overtimeRequests, mapRequestToUI]);

  const metrics = useMemo(() => {
    const activeAlerts = alerts.filter(a => !a.isDismissed).length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.isDismissed).length;
    const employeesAtRisk = MOCK_EMPLOYEE_OVERTIME_SUMMARIES.filter(
      e => e.complianceStatus === 'warning' || e.complianceStatus === 'violation'
    ).length;

    return {
      totalOvertimeHours: summary.totalOvertimeHours,
      totalOvertimePay: summary.totalOvertimePay,
      pendingApprovals: summary.pendingCount,
      activeAlerts,
      criticalAlerts,
      employeesAtRisk,
    };
  }, [alerts, summary]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (alert.isDismissed) return false;
      
      const matchesSearch = searchQuery === '' ||
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (alert.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilter = alertFilter === 'all' ||
        (alertFilter === 'unread' && !alert.isRead) ||
        (alertFilter === 'critical' && alert.severity === 'critical') ||
        (alertFilter === 'high' && (alert.severity === 'high' || alert.severity === 'critical'));

      return matchesSearch && matchesFilter;
    });
  }, [alerts, searchQuery, alertFilter]);

  const filteredEmployees = useMemo(() => {
    return MOCK_EMPLOYEE_OVERTIME_SUMMARIES.filter(emp => {
      return searchQuery === '' ||
        emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.departmentName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery]);

  const filteredDepartments = useMemo(() => {
    return MOCK_DEPARTMENT_OVERTIME_SUMMARIES.filter(dept => {
      return searchQuery === '' ||
        dept.departmentName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery]);

  const filteredRecords = useMemo(() => {
    return overtimeRecords.filter(record => {
      return searchQuery === '' ||
        record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.reason.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, overtimeRecords]);

  const onRefresh = useCallback(async () => {
    console.log('[OvertimeScreen] Refreshing data...');
    await refetch();
  }, [refetch]);

  const handleApproveRecord = useCallback(async (record: OvertimeRecordUI) => {
    if (!user) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    Alert.alert(
      'Approve Overtime',
      `Approve ${record.overtimeHours} hours of overtime for ${record.employeeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveOvertimeMutation.mutateAsync({
                requestId: record.id,
                approverId: user.id,
                approverName: `${user.first_name} ${user.last_name}`,
              });
              Alert.alert('Success', 'Overtime request approved');
              setSelectedRecord(null);
            } catch (error) {
              console.error('[OvertimeScreen] Approve error:', error);
              Alert.alert('Error', 'Failed to approve overtime request');
            }
          },
        },
      ]
    );
  }, [user, approveOvertimeMutation]);

  const handleRejectRecord = useCallback(async () => {
    if (!user || !selectedRecord) {
      return;
    }

    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      await rejectOvertimeMutation.mutateAsync({
        requestId: selectedRecord.id,
        rejectorId: user.id,
        rejectorName: `${user.first_name} ${user.last_name}`,
        reason: rejectReason.trim(),
      });
      Alert.alert('Success', 'Overtime request rejected');
      setShowRejectModal(false);
      setSelectedRecord(null);
      setRejectReason('');
    } catch (error) {
      console.error('[OvertimeScreen] Reject error:', error);
      Alert.alert('Error', 'Failed to reject overtime request');
    }
  }, [user, selectedRecord, rejectReason, rejectOvertimeMutation]);

  const openRejectModal = useCallback((record: OvertimeRecordUI) => {
    setSelectedRecord(record);
    setRejectReason('');
    setShowRejectModal(true);
  }, []);

  const handleDismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, isDismissed: true } : a
    ));
    setSelectedAlert(null);
  }, []);

  const handleMarkAsRead = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, isRead: true } : a
    ));
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSeverityIcon = (severity: OvertimeAlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle size={18} color={getAlertSeverityColor(severity)} />;
      case 'high':
        return <AlertCircle size={18} color={getAlertSeverityColor(severity)} />;
      case 'medium':
        return <Bell size={18} color={getAlertSeverityColor(severity)} />;
      default:
        return <Activity size={18} color={getAlertSeverityColor(severity)} />;
    }
  };

  const renderMetricsRow = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.metricsScroll}
    >
      <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.metricIconContainer, { backgroundColor: '#F59E0B20' }]}>
          <Clock size={20} color="#F59E0B" />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.totalOvertimeHours}h</Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total OT Hours</Text>
      </View>

      <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.metricIconContainer, { backgroundColor: '#10B98120' }]}>
          <DollarSign size={20} color="#10B981" />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{formatCurrency(metrics.totalOvertimePay)}</Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>OT Cost</Text>
      </View>

      <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.metricIconContainer, { backgroundColor: '#EF444420' }]}>
          <AlertTriangle size={20} color="#EF4444" />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.criticalAlerts}</Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Critical Alerts</Text>
      </View>

      <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.metricIconContainer, { backgroundColor: '#F97316' + '20' }]}>
          <Users size={20} color="#F97316" />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.employeesAtRisk}</Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>At Risk</Text>
      </View>

      <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.metricIconContainer, { backgroundColor: '#3B82F620' }]}>
          <CheckCircle size={20} color="#3B82F6" />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.pendingApprovals}</Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Pending</Text>
      </View>
    </ScrollView>
  );

  const renderViewModeSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.viewModeScroll}
    >
      {[
        { key: 'alerts' as ViewMode, label: 'Alerts', icon: Bell, count: metrics.activeAlerts },
        { key: 'employees' as ViewMode, label: 'Employees', icon: Users },
        { key: 'departments' as ViewMode, label: 'Departments', icon: Building2 },
        { key: 'records' as ViewMode, label: 'Records', icon: Clock },
      ].map(({ key, label, icon: Icon, count }) => (
        <Pressable
          key={key}
          style={[
            styles.viewModeButton,
            { 
              backgroundColor: viewMode === key ? colors.primary : colors.surface,
              borderColor: viewMode === key ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setViewMode(key)}
        >
          <Icon size={16} color={viewMode === key ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[
            styles.viewModeText,
            { color: viewMode === key ? '#FFFFFF' : colors.textSecondary },
          ]}>
            {label}
          </Text>
          {count !== undefined && count > 0 && (
            <View style={[styles.viewModeBadge, { backgroundColor: viewMode === key ? '#FFFFFF30' : colors.error }]}>
              <Text style={[styles.viewModeBadgeText, { color: viewMode === key ? '#FFFFFF' : '#FFFFFF' }]}>
                {count}
              </Text>
            </View>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderAlertFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScroll}
    >
      {[
        { key: 'all' as AlertFilter, label: 'All' },
        { key: 'unread' as AlertFilter, label: 'Unread' },
        { key: 'critical' as AlertFilter, label: 'Critical' },
        { key: 'high' as AlertFilter, label: 'High Priority' },
      ].map(({ key, label }) => (
        <Pressable
          key={key}
          style={[
            styles.filterChip,
            { 
              backgroundColor: alertFilter === key ? colors.primary + '20' : colors.surface,
              borderColor: alertFilter === key ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setAlertFilter(key)}
        >
          <Text style={[
            styles.filterChipText,
            { color: alertFilter === key ? colors.primary : colors.textSecondary },
          ]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderAlertCard = (alert: OvertimeAlert) => (
    <Pressable
      key={alert.id}
      style={[
        styles.alertCard,
        { 
          backgroundColor: colors.surface, 
          borderColor: colors.border,
          borderLeftColor: getAlertSeverityColor(alert.severity),
          borderLeftWidth: 4,
        },
      ]}
      onPress={() => {
        handleMarkAsRead(alert.id);
        setSelectedAlert(alert);
      }}
    >
      <View style={styles.alertHeader}>
        <View style={styles.alertTitleRow}>
          {getSeverityIcon(alert.severity)}
          <Text style={[styles.alertTitle, { color: colors.text }]} numberOfLines={1}>
            {alert.title}
          </Text>
          {!alert.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )}
        </View>
        <View style={[
          styles.severityBadge, 
          { backgroundColor: getAlertSeverityColor(alert.severity) + '20' }
        ]}>
          <Text style={[styles.severityText, { color: getAlertSeverityColor(alert.severity) }]}>
            {alert.severity.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={[styles.alertMessage, { color: colors.textSecondary }]} numberOfLines={2}>
        {alert.message}
      </Text>

      <View style={styles.alertFooter}>
        {alert.employeeName && (
          <View style={styles.alertMeta}>
            <Users size={12} color={colors.textTertiary} />
            <Text style={[styles.alertMetaText, { color: colors.textTertiary }]}>
              {alert.employeeName}
            </Text>
          </View>
        )}
        {alert.departmentName && !alert.employeeName && (
          <View style={styles.alertMeta}>
            <Building2 size={12} color={colors.textTertiary} />
            <Text style={[styles.alertMetaText, { color: colors.textTertiary }]}>
              {alert.departmentName}
            </Text>
          </View>
        )}
        <Text style={[styles.alertTime, { color: colors.textTertiary }]}>
          {formatDate(alert.createdAt)}
        </Text>
      </View>
    </Pressable>
  );

  const renderEmployeeCard = (employee: EmployeeOvertimeSummary) => {
    const weeklyPercent = (employee.weeklyOvertimeHours / employee.weeklyLimit) * 100;
    const monthlyPercent = (employee.monthlyOvertimeHours / employee.monthlyLimit) * 100;

    return (
      <Pressable
        key={employee.employeeId}
        style={[styles.employeeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setSelectedEmployee(employee)}
      >
        <View style={styles.employeeHeader}>
          <View style={[styles.employeeAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.employeeAvatarText, { color: colors.primary }]}>
              {employee.employeeName.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.employeeInfo}>
            <Text style={[styles.employeeName, { color: colors.text }]}>{employee.employeeName}</Text>
            <Text style={[styles.employeeDept, { color: colors.textSecondary }]}>
              {employee.departmentName} • {employee.employeeCode}
            </Text>
          </View>
          <View style={[
            styles.complianceBadge,
            { backgroundColor: getComplianceStatusColor(employee.complianceStatus) + '20' }
          ]}>
            <View style={[
              styles.complianceDot,
              { backgroundColor: getComplianceStatusColor(employee.complianceStatus) }
            ]} />
            <Text style={[
              styles.complianceText,
              { color: getComplianceStatusColor(employee.complianceStatus) }
            ]}>
              {employee.complianceStatus}
            </Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Weekly</Text>
            <Text style={[styles.progressValue, { color: colors.text }]}>
              {employee.weeklyOvertimeHours}h / {employee.weeklyLimit}h
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: weeklyPercent >= 100 ? '#EF4444' : weeklyPercent >= 85 ? '#F59E0B' : '#10B981',
                  width: `${Math.min(weeklyPercent, 100)}%`,
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Monthly</Text>
            <Text style={[styles.progressValue, { color: colors.text }]}>
              {employee.monthlyOvertimeHours}h / {employee.monthlyLimit}h
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: monthlyPercent >= 100 ? '#EF4444' : monthlyPercent >= 85 ? '#F59E0B' : '#10B981',
                  width: `${Math.min(monthlyPercent, 100)}%`,
                }
              ]} 
            />
          </View>
        </View>

        <View style={[styles.employeeStats, { borderTopColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{employee.consecutiveOvertimeDays}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Consecutive</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{employee.averageWeeklyOvertime}h</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Avg/Week</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{formatCurrency(employee.totalOvertimePay)}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>YTD Pay</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderDepartmentCard = (dept: DepartmentOvertimeSummary) => {
    const budgetPercent = (dept.budgetUsed / dept.budgetAllocated) * 100;

    return (
      <Pressable
        key={dept.departmentCode}
        style={[styles.departmentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setSelectedDepartment(dept)}
      >
        <View style={styles.departmentHeader}>
          <View style={[styles.departmentIcon, { backgroundColor: colors.primary + '20' }]}>
            <Building2 size={20} color={colors.primary} />
          </View>
          <View style={styles.departmentInfo}>
            <Text style={[styles.departmentName, { color: colors.text }]}>{dept.departmentName}</Text>
            <Text style={[styles.departmentMeta, { color: colors.textSecondary }]}>
              {dept.employeesWithOvertime} of {dept.totalEmployees} with OT
            </Text>
          </View>
          <View style={styles.complianceRateContainer}>
            <Text style={[
              styles.complianceRate,
              { color: dept.complianceRate >= 90 ? '#10B981' : dept.complianceRate >= 70 ? '#F59E0B' : '#EF4444' }
            ]}>
              {dept.complianceRate}%
            </Text>
            <Text style={[styles.complianceRateLabel, { color: colors.textTertiary }]}>Compliance</Text>
          </View>
        </View>

        <View style={styles.departmentMetrics}>
          <View style={styles.deptMetricItem}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.deptMetricValue, { color: colors.text }]}>{dept.weeklyOvertimeHours}h</Text>
            <Text style={[styles.deptMetricLabel, { color: colors.textTertiary }]}>This Week</Text>
          </View>
          <View style={styles.deptMetricItem}>
            <TrendingUp size={14} color={colors.textSecondary} />
            <Text style={[styles.deptMetricValue, { color: colors.text }]}>{dept.monthlyOvertimeHours}h</Text>
            <Text style={[styles.deptMetricLabel, { color: colors.textTertiary }]}>This Month</Text>
          </View>
          <View style={styles.deptMetricItem}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={[styles.deptMetricValue, { color: colors.text }]}>{dept.averageOvertimePerEmployee}h</Text>
            <Text style={[styles.deptMetricLabel, { color: colors.textTertiary }]}>Avg/Employee</Text>
          </View>
        </View>

        <View style={styles.budgetSection}>
          <View style={styles.budgetHeader}>
            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>Budget</Text>
            <Text style={[styles.budgetValues, { color: colors.text }]}>
              {formatCurrency(dept.budgetUsed)} / {formatCurrency(dept.budgetAllocated)}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: budgetPercent >= 90 ? '#EF4444' : budgetPercent >= 75 ? '#F59E0B' : '#10B981',
                  width: `${Math.min(budgetPercent, 100)}%`,
                }
              ]} 
            />
          </View>
          <Text style={[styles.budgetRemaining, { color: colors.textTertiary }]}>
            {formatCurrency(dept.budgetRemaining)} remaining
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderRecordCard = (record: OvertimeRecordUI) => (
    <View
      key={record.id}
      style={[styles.recordCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.recordHeader}>
        <View style={styles.recordEmployee}>
          <View style={[styles.recordAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.recordAvatarText, { color: colors.primary }]}>
              {record.employeeName.split(' ').map((n: string) => n[0]).join('')}
            </Text>
          </View>
          <View>
            <Text style={[styles.recordName, { color: colors.text }]}>{record.employeeName}</Text>
            <Text style={[styles.recordDept, { color: colors.textSecondary }]}>{record.departmentName}</Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getOvertimeStatusColor(record.status) + '20' }
        ]}>
          <Text style={[styles.statusText, { color: getOvertimeStatusColor(record.status) }]}>
            {record.status}
          </Text>
        </View>
      </View>

      <View style={[styles.recordDetails, { borderTopColor: colors.border }]}>
        <View style={styles.recordDetailRow}>
          <Calendar size={14} color={colors.textTertiary} />
          <Text style={[styles.recordDetailText, { color: colors.text }]}>{formatDate(record.date)}</Text>
        </View>
        <View style={styles.recordDetailRow}>
          <Clock size={14} color={colors.textTertiary} />
          <Text style={[styles.recordDetailText, { color: colors.text }]}>
            {record.overtimeHours}h overtime ({record.actualHours}h total)
          </Text>
        </View>
        <View style={styles.recordDetailRow}>
          <View style={[
            styles.typeBadge,
            { backgroundColor: getOvertimeTypeColor(record.overtimeType) + '20' }
          ]}>
            <Text style={[styles.typeText, { color: getOvertimeTypeColor(record.overtimeType) }]}>
              {record.overtimeType}
            </Text>
          </View>
          <Text style={[styles.recordPay, { color: '#10B981' }]}>{formatCurrency(record.overtimePay)}</Text>
        </View>
      </View>

      <Text style={[styles.recordReason, { color: colors.textSecondary }]} numberOfLines={2}>
        {record.reason}
      </Text>

      {record.status === 'pending' && (
        <View style={styles.recordActions}>
          <Pressable
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApproveRecord(record)}
            disabled={approveOvertimeMutation.isPending}
          >
            {approveOvertimeMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => openRejectModal(record)}
          >
            <XCircle size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderRejectModal = () => (
    <Modal
      visible={showRejectModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowRejectModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setShowRejectModal(false)} style={styles.modalCloseButton}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Overtime</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.modalContent}>
          {selectedRecord && (
            <View style={[styles.rejectInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.rejectInfoTitle, { color: colors.text }]}>
                {selectedRecord.employeeName}
              </Text>
              <Text style={[styles.rejectInfoDetail, { color: colors.textSecondary }]}>
                {selectedRecord.overtimeHours} hours • {formatDate(selectedRecord.date)}
              </Text>
            </View>
          )}

          <Text style={[styles.rejectLabel, { color: colors.text }]}>Reason for Rejection *</Text>
          <TextInput
            style={[
              styles.rejectInput,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
            ]}
            placeholder="Enter reason for rejection..."
            placeholderTextColor={colors.textTertiary}
            value={rejectReason}
            onChangeText={setRejectReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Pressable
            style={[
              styles.rejectSubmitButton,
              { backgroundColor: colors.error },
              (!rejectReason.trim() || rejectOvertimeMutation.isPending) && styles.disabledButton
            ]}
            onPress={handleRejectRecord}
            disabled={!rejectReason.trim() || rejectOvertimeMutation.isPending}
          >
            {rejectOvertimeMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.rejectSubmitText}>Reject Request</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderAlertDetailModal = () => (
    <Modal
      visible={!!selectedAlert}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedAlert(null)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setSelectedAlert(null)} style={styles.modalCloseButton}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Alert Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {selectedAlert && (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[
              styles.alertDetailHeader,
              { backgroundColor: getAlertSeverityColor(selectedAlert.severity) + '15' }
            ]}>
              {getSeverityIcon(selectedAlert.severity)}
              <View style={styles.alertDetailHeaderText}>
                <Text style={[styles.alertDetailTitle, { color: colors.text }]}>
                  {selectedAlert.title}
                </Text>
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: getAlertSeverityColor(selectedAlert.severity) + '20' }
                ]}>
                  <Text style={[styles.severityText, { color: getAlertSeverityColor(selectedAlert.severity) }]}>
                    {selectedAlert.severity.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.alertDetailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.alertDetailMessage, { color: colors.text }]}>
                {selectedAlert.message}
              </Text>

              {selectedAlert.metric && (
                <View style={[styles.metricDetail, { borderTopColor: colors.border }]}>
                  <Text style={[styles.metricDetailLabel, { color: colors.textSecondary }]}>
                    {selectedAlert.metric}
                  </Text>
                  <View style={styles.metricDetailValues}>
                    {selectedAlert.currentValue !== undefined && (
                      <Text style={[styles.metricCurrentValue, { color: colors.text }]}>
                        Current: {selectedAlert.currentValue}
                      </Text>
                    )}
                    {selectedAlert.threshold !== undefined && (
                      <Text style={[styles.metricThreshold, { color: colors.textSecondary }]}>
                        Limit: {selectedAlert.threshold}
                      </Text>
                    )}
                  </View>
                  {selectedAlert.threshold && selectedAlert.currentValue && (
                    <View style={[styles.progressBar, { backgroundColor: colors.border, marginTop: 8 }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            backgroundColor: getAlertSeverityColor(selectedAlert.severity),
                            width: `${Math.min((selectedAlert.currentValue / selectedAlert.threshold) * 100, 100)}%`,
                          }
                        ]} 
                      />
                    </View>
                  )}
                </View>
              )}

              {selectedAlert.employeeName && (
                <View style={[styles.alertDetailRow, { borderTopColor: colors.border }]}>
                  <Users size={16} color={colors.textSecondary} />
                  <Text style={[styles.alertDetailRowText, { color: colors.text }]}>
                    {selectedAlert.employeeName}
                  </Text>
                </View>
              )}

              {selectedAlert.departmentName && (
                <View style={[styles.alertDetailRow, { borderTopColor: colors.border }]}>
                  <Building2 size={16} color={colors.textSecondary} />
                  <Text style={[styles.alertDetailRowText, { color: colors.text }]}>
                    {selectedAlert.departmentName}
                  </Text>
                </View>
              )}

              <View style={[styles.alertDetailRow, { borderTopColor: colors.border }]}>
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={[styles.alertDetailRowText, { color: colors.text }]}>
                  Created: {formatDate(selectedAlert.createdAt)}
                </Text>
              </View>
            </View>

            <View style={styles.alertActions}>
              <Pressable
                style={[styles.alertActionButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Alert.alert('Action', 'View related overtime records');
                }}
              >
                <Eye size={18} color="#FFFFFF" />
                <Text style={styles.alertActionText}>View Records</Text>
              </Pressable>

              <Pressable
                style={[styles.alertActionButton, { backgroundColor: colors.error }]}
                onPress={() => handleDismissAlert(selectedAlert.id)}
              >
                <BellOff size={18} color="#FFFFFF" />
                <Text style={styles.alertActionText}>Dismiss</Text>
              </Pressable>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const renderEmployeeDetailModal = () => (
    <Modal
      visible={!!selectedEmployee}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedEmployee(null)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setSelectedEmployee(null)} style={styles.modalCloseButton}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Employee Overtime</Text>
          <View style={{ width: 40 }} />
        </View>

        {selectedEmployee && (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.employeeDetailHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.employeeDetailAvatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.employeeDetailAvatarText, { color: colors.primary }]}>
                  {selectedEmployee.employeeName.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <Text style={[styles.employeeDetailName, { color: colors.text }]}>
                {selectedEmployee.employeeName}
              </Text>
              <Text style={[styles.employeeDetailInfo, { color: colors.textSecondary }]}>
                {selectedEmployee.departmentName} • {selectedEmployee.employeeCode}
              </Text>
              <View style={[
                styles.complianceBadgeLarge,
                { backgroundColor: getComplianceStatusColor(selectedEmployee.complianceStatus) + '20' }
              ]}>
                <Shield size={16} color={getComplianceStatusColor(selectedEmployee.complianceStatus)} />
                <Text style={[
                  styles.complianceTextLarge,
                  { color: getComplianceStatusColor(selectedEmployee.complianceStatus) }
                ]}>
                  {selectedEmployee.complianceStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                OVERTIME LIMITS
              </Text>
              
              <View style={styles.limitItem}>
                <View style={styles.limitHeader}>
                  <Text style={[styles.limitLabel, { color: colors.text }]}>Weekly Limit</Text>
                  <Text style={[styles.limitValue, { color: colors.text }]}>
                    {selectedEmployee.weeklyOvertimeHours}h / {selectedEmployee.weeklyLimit}h
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: selectedEmployee.weeklyOvertimeHours >= selectedEmployee.weeklyLimit 
                          ? '#EF4444' 
                          : selectedEmployee.weeklyOvertimeHours >= selectedEmployee.weeklyLimit * 0.85 
                            ? '#F59E0B' 
                            : '#10B981',
                        width: `${Math.min((selectedEmployee.weeklyOvertimeHours / selectedEmployee.weeklyLimit) * 100, 100)}%`,
                      }
                    ]} 
                  />
                </View>
              </View>

              <View style={styles.limitItem}>
                <View style={styles.limitHeader}>
                  <Text style={[styles.limitLabel, { color: colors.text }]}>Monthly Limit</Text>
                  <Text style={[styles.limitValue, { color: colors.text }]}>
                    {selectedEmployee.monthlyOvertimeHours}h / {selectedEmployee.monthlyLimit}h
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: selectedEmployee.monthlyOvertimeHours >= selectedEmployee.monthlyLimit 
                          ? '#EF4444' 
                          : selectedEmployee.monthlyOvertimeHours >= selectedEmployee.monthlyLimit * 0.85 
                            ? '#F59E0B' 
                            : '#10B981',
                        width: `${Math.min((selectedEmployee.monthlyOvertimeHours / selectedEmployee.monthlyLimit) * 100, 100)}%`,
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                STATISTICS
              </Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statsItem}>
                  <Text style={[styles.statsValue, { color: colors.text }]}>
                    {selectedEmployee.consecutiveOvertimeDays}
                  </Text>
                  <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
                    Consecutive Days
                  </Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={[styles.statsValue, { color: colors.text }]}>
                    {selectedEmployee.averageWeeklyOvertime}h
                  </Text>
                  <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
                    Avg Weekly
                  </Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={[styles.statsValue, { color: colors.text }]}>
                    {selectedEmployee.yearToDateOvertimeHours}h
                  </Text>
                  <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
                    YTD Hours
                  </Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={[styles.statsValue, { color: '#10B981' }]}>
                    {formatCurrency(selectedEmployee.totalOvertimePay)}
                  </Text>
                  <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
                    YTD Pay
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                LAST OVERTIME
              </Text>
              <Text style={[styles.lastOvertimeDate, { color: colors.text }]}>
                {formatDate(selectedEmployee.lastOvertimeDate)}
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading overtime data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderMetricsRow()}

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {renderViewModeSelector()}

        {viewMode === 'alerts' && renderAlertFilters()}

        <View style={styles.contentSection}>
          {viewMode === 'alerts' && (
            filteredAlerts.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Bell size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Alerts</Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  All overtime alerts have been addressed
                </Text>
              </View>
            ) : (
              filteredAlerts.map(renderAlertCard)
            )
          )}

          {viewMode === 'employees' && (
            filteredEmployees.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Users size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Results</Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No employees match your search
                </Text>
              </View>
            ) : (
              filteredEmployees.map(renderEmployeeCard)
            )
          )}

          {viewMode === 'departments' && (
            filteredDepartments.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Building2 size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Results</Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No departments match your search
                </Text>
              </View>
            ) : (
              filteredDepartments.map(renderDepartmentCard)
            )
          )}

          {viewMode === 'records' && (
            filteredRecords.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Clock size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Records</Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No overtime records found
                </Text>
              </View>
            ) : (
              filteredRecords.map(renderRecordCard)
            )
          )}
        </View>
      </ScrollView>

      {renderAlertDetailModal()}
      {renderEmployeeDetailModal()}
      {renderRejectModal()}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    metricsScroll: {
      paddingBottom: 16,
      gap: 12,
    },
    metricCard: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      minWidth: 110,
      alignItems: 'center',
      gap: 6,
    },
    metricIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    metricValue: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      padding: 0,
    },
    viewModeScroll: {
      gap: 8,
      marginBottom: 12,
    },
    viewModeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      gap: 8,
    },
    viewModeText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    viewModeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 20,
      alignItems: 'center',
    },
    viewModeBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    filterScroll: {
      gap: 8,
      marginBottom: 16,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    contentSection: {
      gap: 12,
    },
    alertCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      gap: 10,
    },
    alertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    alertTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 8,
    },
    alertTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      flex: 1,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    severityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    severityText: {
      fontSize: 10,
      fontWeight: '700' as const,
    },
    alertMessage: {
      fontSize: 13,
      lineHeight: 18,
    },
    alertFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    alertMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    alertMetaText: {
      fontSize: 12,
    },
    alertTime: {
      fontSize: 11,
    },
    employeeCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
    },
    employeeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    employeeAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    employeeAvatarText: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    employeeInfo: {
      flex: 1,
    },
    employeeName: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    employeeDept: {
      fontSize: 12,
      marginTop: 2,
    },
    complianceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    complianceDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    complianceText: {
      fontSize: 11,
      fontWeight: '600' as const,
      textTransform: 'capitalize' as const,
    },
    progressSection: {
      marginBottom: 10,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    progressValue: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    progressBar: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    employeeStats: {
      flexDirection: 'row',
      borderTopWidth: 1,
      paddingTop: 12,
      marginTop: 4,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    statLabel: {
      fontSize: 10,
      marginTop: 2,
    },
    departmentCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
    },
    departmentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    departmentIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    departmentInfo: {
      flex: 1,
    },
    departmentName: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    departmentMeta: {
      fontSize: 12,
      marginTop: 2,
    },
    complianceRateContainer: {
      alignItems: 'flex-end',
    },
    complianceRate: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    complianceRateLabel: {
      fontSize: 10,
    },
    departmentMetrics: {
      flexDirection: 'row',
      marginBottom: 14,
    },
    deptMetricItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    deptMetricValue: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    deptMetricLabel: {
      fontSize: 10,
    },
    budgetSection: {
      gap: 6,
    },
    budgetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    budgetLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    budgetValues: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    budgetRemaining: {
      fontSize: 11,
      textAlign: 'right' as const,
    },
    recordCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
    },
    recordHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    recordEmployee: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    recordAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordAvatarText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    recordName: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    recordDept: {
      fontSize: 11,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600' as const,
      textTransform: 'capitalize' as const,
    },
    recordDetails: {
      borderTopWidth: 1,
      paddingTop: 12,
      gap: 8,
    },
    recordDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    recordDetailText: {
      fontSize: 13,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    typeText: {
      fontSize: 10,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
    },
    recordPay: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginLeft: 'auto',
    },
    recordReason: {
      fontSize: 12,
      lineHeight: 16,
      marginTop: 10,
    },
    emptyState: {
      padding: 40,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      marginTop: 16,
    },
    emptyStateText: {
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center' as const,
    },
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
    },
    modalCloseButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    alertDetailHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      borderRadius: 12,
      gap: 12,
      marginBottom: 16,
    },
    alertDetailHeaderText: {
      flex: 1,
      gap: 8,
    },
    alertDetailTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    alertDetailCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
      marginBottom: 16,
    },
    alertDetailMessage: {
      fontSize: 15,
      lineHeight: 22,
    },
    metricDetail: {
      borderTopWidth: 1,
      marginTop: 16,
      paddingTop: 16,
    },
    metricDetailLabel: {
      fontSize: 13,
      fontWeight: '500' as const,
      marginBottom: 8,
    },
    metricDetailValues: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    metricCurrentValue: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    metricThreshold: {
      fontSize: 14,
    },
    alertDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderTopWidth: 1,
      marginTop: 12,
      paddingTop: 12,
    },
    alertDetailRowText: {
      fontSize: 14,
    },
    alertActions: {
      flexDirection: 'row',
      gap: 12,
    },
    alertActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 12,
      gap: 8,
    },
    alertActionText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    employeeDetailHeader: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 20,
      alignItems: 'center',
      marginBottom: 16,
    },
    employeeDetailAvatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    employeeDetailAvatarText: {
      fontSize: 24,
      fontWeight: '600' as const,
    },
    employeeDetailName: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    employeeDetailInfo: {
      fontSize: 14,
      marginTop: 4,
      marginBottom: 12,
    },
    complianceBadgeLarge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 6,
    },
    complianceTextLarge: {
      fontSize: 12,
      fontWeight: '700' as const,
    },
    detailSection: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
      marginBottom: 16,
    },
    detailSectionTitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    limitItem: {
      marginBottom: 14,
    },
    limitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    limitLabel: {
      fontSize: 14,
    },
    limitValue: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    statsItem: {
      width: '50%',
      paddingVertical: 10,
      alignItems: 'center',
    },
    statsValue: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    statsLabel: {
      fontSize: 12,
      marginTop: 4,
    },
    lastOvertimeDate: {
      fontSize: 16,
      fontWeight: '500' as const,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
    },
    recordActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    approveButton: {
      backgroundColor: '#10B981',
    },
    rejectButton: {
      backgroundColor: '#EF4444',
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600' as const,
    },
    rejectInfo: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 20,
    },
    rejectInfoTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    rejectInfoDetail: {
      fontSize: 13,
      marginTop: 4,
    },
    rejectLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
      marginBottom: 8,
    },
    rejectInput: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      minHeight: 100,
      fontSize: 15,
    },
    rejectSubmitButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    rejectSubmitText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    disabledButton: {
      opacity: 0.5,
    },
  });
