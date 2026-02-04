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
} from 'react-native';
import {
  Calendar,
  AlertTriangle,
  Users,
  Building2,
  Search,
  Bell,
  BellOff,
  X,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  Shield,
  Eye,
  Heart,
  Baby,
  Briefcase,
  UserX,
  Accessibility,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  MOCK_LEAVE_REQUESTS,
  MOCK_LEAVE_ALERTS,
  MOCK_EMPLOYEE_LEAVE_SUMMARIES,
  MOCK_DEPARTMENT_LEAVE_SUMMARIES,
  getLeaveTypeLabel,
  getLeaveTypeColor,
  getLeaveStatusColor,
  getAlertSeverityColor,
  type LeaveRequest,
  type LeaveAlert,
  type EmployeeLeaveSummary,
  type DepartmentLeaveSummary,
  type AlertSeverity,
  type LeaveType,
} from '@/constants/fmlaConstants';

type ViewMode = 'alerts' | 'requests' | 'employees' | 'departments';
type AlertFilter = 'all' | 'unread' | 'critical' | 'documentation';
type RequestFilter = 'all' | 'pending' | 'active' | 'fmla';

export default function FMLATrackingScreen() {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all');
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<LeaveAlert | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLeaveSummary | null>(null);
  const [alerts, setAlerts] = useState(MOCK_LEAVE_ALERTS);

  const styles = createStyles(colors);

  const metrics = useMemo(() => {
    const activeLeaves = MOCK_LEAVE_REQUESTS.filter(r => r.status === 'active').length;
    const pendingRequests = MOCK_LEAVE_REQUESTS.filter(r => r.status === 'pending').length;
    const fmlaLeaves = MOCK_LEAVE_REQUESTS.filter(r => r.leaveType === 'fmla').length;
    const activeAlerts = alerts.filter(a => !a.isDismissed).length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.isDismissed).length;
    const employeesOnLeave = MOCK_EMPLOYEE_LEAVE_SUMMARIES.filter(e => e.activeLeaves > 0).length;
    const documentationNeeded = alerts.filter(a => a.type === 'documentation_needed' && !a.isDismissed).length;

    return {
      activeLeaves,
      pendingRequests,
      fmlaLeaves,
      activeAlerts,
      criticalAlerts,
      employeesOnLeave,
      documentationNeeded,
    };
  }, [alerts]);

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
        (alertFilter === 'documentation' && alert.type === 'documentation_needed');

      return matchesSearch && matchesFilter;
    });
  }, [alerts, searchQuery, alertFilter]);

  const filteredRequests = useMemo(() => {
    return MOCK_LEAVE_REQUESTS.filter(request => {
      const matchesSearch = searchQuery === '' ||
        request.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.departmentName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = requestFilter === 'all' ||
        (requestFilter === 'pending' && request.status === 'pending') ||
        (requestFilter === 'active' && request.status === 'active') ||
        (requestFilter === 'fmla' && request.leaveType === 'fmla');

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, requestFilter]);

  const filteredEmployees = useMemo(() => {
    return MOCK_EMPLOYEE_LEAVE_SUMMARIES.filter(emp => {
      return searchQuery === '' ||
        emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.departmentName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery]);

  const filteredDepartments = useMemo(() => {
    return MOCK_DEPARTMENT_LEAVE_SUMMARIES.filter(dept => {
      return searchQuery === '' ||
        dept.departmentName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getLeaveTypeIcon = (type: LeaveType) => {
    const iconProps = { size: 16, color: getLeaveTypeColor(type) };
    switch (type) {
      case 'fmla':
        return <Shield {...iconProps} />;
      case 'medical':
        return <Heart {...iconProps} />;
      case 'parental':
        return <Baby {...iconProps} />;
      case 'military':
        return <Briefcase {...iconProps} />;
      case 'bereavement':
        return <UserX {...iconProps} />;
      case 'ada_accommodation':
        return <Accessibility {...iconProps} />;
      default:
        return <Calendar {...iconProps} />;
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle size={18} color={getAlertSeverityColor(severity)} />;
      case 'high':
        return <AlertCircle size={18} color={getAlertSeverityColor(severity)} />;
      case 'medium':
        return <Bell size={18} color={getAlertSeverityColor(severity)} />;
      default:
        return <FileText size={18} color={getAlertSeverityColor(severity)} />;
    }
  };

  const renderMetricsRow = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.metricsScroll}
    >
      <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.metricIconContainer, { backgroundColor: '#10B98120' }]}>
          <CheckCircle size={20} color="#10B981" />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.activeLeaves}</Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Active Leaves</Text>
      </View>

      <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.metricIconContainer, { backgroundColor: '#F59E0B20' }]}>
          <Clock size={20} color="#F59E0B" />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.pendingRequests}</Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Pending</Text>
      </View>

      <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.metricIconContainer, { backgroundColor: '#3B82F620' }]}>
          <Shield size={20} color="#3B82F6" />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.fmlaLeaves}</Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>FMLA Cases</Text>
      </View>

      <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.metricIconContainer, { backgroundColor: '#EF444420' }]}>
          <AlertTriangle size={20} color="#EF4444" />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.criticalAlerts}</Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Critical</Text>
      </View>

      <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.metricIconContainer, { backgroundColor: '#EC489920' }]}>
          <FileText size={20} color="#EC4899" />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.documentationNeeded}</Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Docs Needed</Text>
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
        { key: 'requests' as ViewMode, label: 'Requests', icon: FileText },
        { key: 'employees' as ViewMode, label: 'Employees', icon: Users },
        { key: 'departments' as ViewMode, label: 'Departments', icon: Building2 },
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
              <Text style={[styles.viewModeBadgeText, { color: '#FFFFFF' }]}>
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
        { key: 'documentation' as AlertFilter, label: 'Docs Needed' },
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

  const renderRequestFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScroll}
    >
      {[
        { key: 'all' as RequestFilter, label: 'All' },
        { key: 'pending' as RequestFilter, label: 'Pending' },
        { key: 'active' as RequestFilter, label: 'Active' },
        { key: 'fmla' as RequestFilter, label: 'FMLA Only' },
      ].map(({ key, label }) => (
        <Pressable
          key={key}
          style={[
            styles.filterChip,
            { 
              backgroundColor: requestFilter === key ? colors.primary + '20' : colors.surface,
              borderColor: requestFilter === key ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setRequestFilter(key)}
        >
          <Text style={[
            styles.filterChipText,
            { color: requestFilter === key ? colors.primary : colors.textSecondary },
          ]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderAlertCard = (alert: LeaveAlert) => (
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
        {alert.dueDate && (
          <View style={styles.alertMeta}>
            <Calendar size={12} color={colors.textTertiary} />
            <Text style={[styles.alertMetaText, { color: colors.textTertiary }]}>
              Due: {formatDate(alert.dueDate)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  const renderRequestCard = (request: LeaveRequest) => (
    <Pressable
      key={request.id}
      style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => setSelectedRequest(request)}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestEmployee}>
          <View style={[styles.requestAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.requestAvatarText, { color: colors.primary }]}>
              {request.employeeName.split(' ').map((n: string) => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.requestEmployeeInfo}>
            <Text style={[styles.requestName, { color: colors.text }]}>{request.employeeName}</Text>
            <Text style={[styles.requestDept, { color: colors.textSecondary }]}>{request.departmentName}</Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getLeaveStatusColor(request.status) + '20' }
        ]}>
          <Text style={[styles.statusText, { color: getLeaveStatusColor(request.status) }]}>
            {request.status}
          </Text>
        </View>
      </View>

      <View style={[styles.requestTypeRow, { borderTopColor: colors.border }]}>
        <View style={[styles.leaveTypeBadge, { backgroundColor: getLeaveTypeColor(request.leaveType) + '20' }]}>
          {getLeaveTypeIcon(request.leaveType)}
          <Text style={[styles.leaveTypeText, { color: getLeaveTypeColor(request.leaveType) }]}>
            {getLeaveTypeLabel(request.leaveType)}
          </Text>
        </View>
        {request.intermittent && (
          <View style={[styles.intermittentBadge, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.intermittentText, { color: colors.warning }]}>Intermittent</Text>
          </View>
        )}
      </View>

      <View style={styles.requestDates}>
        <View style={styles.dateItem}>
          <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>Start</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(request.startDate)}</Text>
        </View>
        <View style={styles.dateSeparator}>
          <Text style={[styles.dateSeparatorText, { color: colors.textTertiary }]}>→</Text>
        </View>
        <View style={styles.dateItem}>
          <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>End</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(request.endDate)}</Text>
        </View>
        <View style={[styles.daysCount, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.daysCountText, { color: colors.primary }]}>{request.totalDays} days</Text>
        </View>
      </View>

      <Text style={[styles.requestReason, { color: colors.textSecondary }]} numberOfLines={2}>
        {request.reason}
      </Text>

      {!request.medicalCertification && request.leaveType === 'fmla' && (
        <View style={[styles.warningBanner, { backgroundColor: '#F59E0B15' }]}>
          <AlertTriangle size={14} color="#F59E0B" />
          <Text style={[styles.warningText, { color: '#F59E0B' }]}>Medical certification pending</Text>
        </View>
      )}
    </Pressable>
  );

  const renderEmployeeCard = (employee: EmployeeLeaveSummary) => {
    const usagePercent = (employee.fmlaHoursUsed / employee.fmlaHoursEntitled) * 100;

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
          {employee.activeLeaves > 0 && (
            <View style={[styles.activeLeaveBadge, { backgroundColor: '#10B98120' }]}>
              <Text style={[styles.activeLeaveText, { color: '#10B981' }]}>On Leave</Text>
            </View>
          )}
        </View>

        <View style={styles.fmlaSection}>
          <View style={styles.fmlaHeader}>
            <Text style={[styles.fmlaLabel, { color: colors.textSecondary }]}>FMLA Balance</Text>
            <Text style={[styles.fmlaValue, { color: colors.text }]}>
              {employee.fmlaHoursUsed}h / {employee.fmlaHoursEntitled}h used
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: usagePercent >= 90 ? '#EF4444' : usagePercent >= 70 ? '#F59E0B' : '#10B981',
                  width: `${Math.min(usagePercent, 100)}%`,
                }
              ]} 
            />
          </View>
          <Text style={[styles.fmlaRemaining, { color: colors.textTertiary }]}>
            {employee.fmlaHoursRemaining}h remaining
          </Text>
        </View>

        <View style={[styles.employeeStats, { borderTopColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{employee.activeLeaves}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{employee.totalLeaveDays}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Days YTD</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: employee.fmlaEligible ? '#10B981' : '#EF4444' }]}>
              {employee.fmlaEligible ? 'Yes' : 'No'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Eligible</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderDepartmentCard = (dept: DepartmentLeaveSummary) => (
    <View
      key={dept.departmentCode}
      style={[styles.departmentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.departmentHeader}>
        <View style={[styles.departmentIcon, { backgroundColor: colors.primary + '20' }]}>
          <Building2 size={20} color={colors.primary} />
        </View>
        <View style={styles.departmentInfo}>
          <Text style={[styles.departmentName, { color: colors.text }]}>{dept.departmentName}</Text>
          <Text style={[styles.departmentMeta, { color: colors.textSecondary }]}>
            {dept.employeesOnLeave} of {dept.totalEmployees} on leave
          </Text>
        </View>
        <View style={styles.complianceContainer}>
          <Text style={[
            styles.complianceScore,
            { color: dept.complianceScore >= 90 ? '#10B981' : dept.complianceScore >= 70 ? '#F59E0B' : '#EF4444' }
          ]}>
            {dept.complianceScore}%
          </Text>
          <Text style={[styles.complianceLabel, { color: colors.textTertiary }]}>Compliance</Text>
        </View>
      </View>

      <View style={styles.departmentMetrics}>
        <View style={styles.deptMetricItem}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={[styles.deptMetricValue, { color: colors.text }]}>{dept.pendingRequests}</Text>
          <Text style={[styles.deptMetricLabel, { color: colors.textTertiary }]}>Pending</Text>
        </View>
        <View style={styles.deptMetricItem}>
          <CheckCircle size={14} color={colors.textSecondary} />
          <Text style={[styles.deptMetricValue, { color: colors.text }]}>{dept.activeLeaves}</Text>
          <Text style={[styles.deptMetricLabel, { color: colors.textTertiary }]}>Active</Text>
        </View>
        <View style={styles.deptMetricItem}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={[styles.deptMetricValue, { color: colors.text }]}>{dept.avgLeaveDays}</Text>
          <Text style={[styles.deptMetricLabel, { color: colors.textTertiary }]}>Avg Days</Text>
        </View>
        <View style={styles.deptMetricItem}>
          <Shield size={14} color={colors.textSecondary} />
          <Text style={[styles.deptMetricValue, { color: colors.text }]}>{dept.fmlaUsageRate}%</Text>
          <Text style={[styles.deptMetricLabel, { color: colors.textTertiary }]}>FMLA Rate</Text>
        </View>
      </View>
    </View>
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

              {selectedAlert.dueDate && (
                <View style={[styles.alertDetailRow, { borderTopColor: colors.border }]}>
                  <Calendar size={16} color={colors.textSecondary} />
                  <Text style={[styles.alertDetailRowText, { color: colors.text }]}>
                    Due: {formatDate(selectedAlert.dueDate)}
                    {selectedAlert.daysUntilDue !== undefined && (
                      <Text style={{ color: selectedAlert.daysUntilDue <= 5 ? '#EF4444' : colors.textSecondary }}>
                        {' '}({selectedAlert.daysUntilDue} days)
                      </Text>
                    )}
                  </Text>
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
            </View>

            <View style={styles.alertActions}>
              <Pressable
                style={[styles.alertActionButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Alert.alert('Action', 'View related leave request');
                }}
              >
                <Eye size={18} color="#FFFFFF" />
                <Text style={styles.alertActionText}>View Request</Text>
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

  const renderRequestDetailModal = () => (
    <Modal
      visible={!!selectedRequest}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedRequest(null)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setSelectedRequest(null)} style={styles.modalCloseButton}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Leave Request</Text>
          <View style={{ width: 40 }} />
        </View>

        {selectedRequest && (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.requestDetailHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.requestDetailAvatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.requestDetailAvatarText, { color: colors.primary }]}>
                  {selectedRequest.employeeName.split(' ').map((n: string) => n[0]).join('')}
                </Text>
              </View>
              <Text style={[styles.requestDetailName, { color: colors.text }]}>
                {selectedRequest.employeeName}
              </Text>
              <Text style={[styles.requestDetailInfo, { color: colors.textSecondary }]}>
                {selectedRequest.departmentName} • {selectedRequest.employeeCode}
              </Text>
              <View style={[
                styles.statusBadgeLarge,
                { backgroundColor: getLeaveStatusColor(selectedRequest.status) + '20' }
              ]}>
                <Text style={[
                  styles.statusTextLarge,
                  { color: getLeaveStatusColor(selectedRequest.status) }
                ]}>
                  {selectedRequest.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                LEAVE TYPE
              </Text>
              <View style={[styles.leaveTypeBadgeLarge, { backgroundColor: getLeaveTypeColor(selectedRequest.leaveType) + '20' }]}>
                {getLeaveTypeIcon(selectedRequest.leaveType)}
                <Text style={[styles.leaveTypeTextLarge, { color: getLeaveTypeColor(selectedRequest.leaveType) }]}>
                  {getLeaveTypeLabel(selectedRequest.leaveType)}
                </Text>
              </View>
              {selectedRequest.intermittent && (
                <View style={styles.intermittentInfo}>
                  <Text style={[styles.intermittentLabel, { color: colors.textSecondary }]}>Schedule:</Text>
                  <Text style={[styles.intermittentSchedule, { color: colors.text }]}>
                    {selectedRequest.intermittentSchedule}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                DATES & DURATION
              </Text>
              <View style={styles.datesGrid}>
                <View style={styles.dateGridItem}>
                  <Text style={[styles.dateGridLabel, { color: colors.textTertiary }]}>Start Date</Text>
                  <Text style={[styles.dateGridValue, { color: colors.text }]}>{formatDate(selectedRequest.startDate)}</Text>
                </View>
                <View style={styles.dateGridItem}>
                  <Text style={[styles.dateGridLabel, { color: colors.textTertiary }]}>End Date</Text>
                  <Text style={[styles.dateGridValue, { color: colors.text }]}>{formatDate(selectedRequest.endDate)}</Text>
                </View>
                <View style={styles.dateGridItem}>
                  <Text style={[styles.dateGridLabel, { color: colors.textTertiary }]}>Return Date</Text>
                  <Text style={[styles.dateGridValue, { color: colors.text }]}>{formatDate(selectedRequest.expectedReturnDate)}</Text>
                </View>
                <View style={styles.dateGridItem}>
                  <Text style={[styles.dateGridLabel, { color: colors.textTertiary }]}>Total Days</Text>
                  <Text style={[styles.dateGridValue, { color: colors.primary }]}>{selectedRequest.totalDays}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                HOURS TRACKING
              </Text>
              <View style={styles.hoursGrid}>
                <View style={styles.hoursItem}>
                  <Text style={[styles.hoursValue, { color: colors.text }]}>{selectedRequest.hoursRequested}h</Text>
                  <Text style={[styles.hoursLabel, { color: colors.textSecondary }]}>Requested</Text>
                </View>
                <View style={styles.hoursItem}>
                  <Text style={[styles.hoursValue, { color: '#F59E0B' }]}>{selectedRequest.hoursUsed}h</Text>
                  <Text style={[styles.hoursLabel, { color: colors.textSecondary }]}>Used</Text>
                </View>
                <View style={styles.hoursItem}>
                  <Text style={[styles.hoursValue, { color: '#10B981' }]}>{selectedRequest.hoursRemaining}h</Text>
                  <Text style={[styles.hoursLabel, { color: colors.textSecondary }]}>Remaining</Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                REASON
              </Text>
              <Text style={[styles.reasonText, { color: colors.text }]}>{selectedRequest.reason}</Text>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                DOCUMENTATION
              </Text>
              <View style={styles.certificationRow}>
                <View style={[
                  styles.certBadge,
                  { backgroundColor: selectedRequest.medicalCertification ? '#10B98120' : '#EF444420' }
                ]}>
                  {selectedRequest.medicalCertification ? (
                    <CheckCircle size={16} color="#10B981" />
                  ) : (
                    <AlertTriangle size={16} color="#EF4444" />
                  )}
                  <Text style={[
                    styles.certText,
                    { color: selectedRequest.medicalCertification ? '#10B981' : '#EF4444' }
                  ]}>
                    {selectedRequest.medicalCertification ? 'Certification Received' : 'Certification Pending'}
                  </Text>
                </View>
              </View>
              {selectedRequest.certificationDate && (
                <Text style={[styles.certDate, { color: colors.textSecondary }]}>
                  Certified: {formatDate(selectedRequest.certificationDate)}
                </Text>
              )}
              {selectedRequest.recertificationDue && (
                <Text style={[styles.certDate, { color: '#F59E0B' }]}>
                  Recertification Due: {formatDate(selectedRequest.recertificationDue)}
                </Text>
              )}
            </View>

            {selectedRequest.approvedBy && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                  APPROVAL
                </Text>
                <Text style={[styles.approvalText, { color: colors.text }]}>
                  Approved by {selectedRequest.approvedBy}
                </Text>
                {selectedRequest.approvedAt && (
                  <Text style={[styles.approvalDate, { color: colors.textSecondary }]}>
                    {formatDate(selectedRequest.approvedAt)}
                  </Text>
                )}
              </View>
            )}

            {selectedRequest.notes && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                  NOTES
                </Text>
                <Text style={[styles.notesText, { color: colors.text }]}>{selectedRequest.notes}</Text>
              </View>
            )}

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
          <Text style={[styles.modalTitle, { color: colors.text }]}>Employee Leave</Text>
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
                styles.eligibilityBadge,
                { backgroundColor: selectedEmployee.fmlaEligible ? '#10B98120' : '#EF444420' }
              ]}>
                <Shield size={16} color={selectedEmployee.fmlaEligible ? '#10B981' : '#EF4444'} />
                <Text style={[
                  styles.eligibilityText,
                  { color: selectedEmployee.fmlaEligible ? '#10B981' : '#EF4444' }
                ]}>
                  {selectedEmployee.fmlaEligible ? 'FMLA ELIGIBLE' : 'NOT ELIGIBLE'}
                </Text>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                FMLA BALANCE
              </Text>
              
              <View style={styles.balanceItem}>
                <View style={styles.balanceHeader}>
                  <Text style={[styles.balanceLabel, { color: colors.text }]}>Hours Used</Text>
                  <Text style={[styles.balanceValue, { color: colors.text }]}>
                    {selectedEmployee.fmlaHoursUsed}h / {selectedEmployee.fmlaHoursEntitled}h
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: selectedEmployee.fmlaHoursUsed >= selectedEmployee.fmlaHoursEntitled * 0.9
                          ? '#EF4444' 
                          : selectedEmployee.fmlaHoursUsed >= selectedEmployee.fmlaHoursEntitled * 0.7 
                            ? '#F59E0B' 
                            : '#10B981',
                        width: `${Math.min((selectedEmployee.fmlaHoursUsed / selectedEmployee.fmlaHoursEntitled) * 100, 100)}%`,
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.balanceRemaining, { color: '#10B981' }]}>
                  {selectedEmployee.fmlaHoursRemaining}h remaining
                </Text>
              </View>

              <View style={styles.yearInfo}>
                <Text style={[styles.yearLabel, { color: colors.textSecondary }]}>Leave Year:</Text>
                <Text style={[styles.yearValue, { color: colors.text }]}>
                  {formatDate(selectedEmployee.fmlaYearStart)} - {formatDate(selectedEmployee.fmlaYearEnd)}
                </Text>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                ELIGIBILITY REQUIREMENTS
              </Text>
              
              <View style={styles.eligibilityGrid}>
                <View style={styles.eligibilityItem}>
                  <Text style={[styles.eligibilityValue, { color: colors.text }]}>
                    {selectedEmployee.monthsEmployed}
                  </Text>
                  <Text style={[styles.eligibilityLabel, { color: colors.textSecondary }]}>
                    Months Employed
                  </Text>
                  <Text style={[styles.eligibilityReq, { color: selectedEmployee.monthsEmployed >= 12 ? '#10B981' : '#EF4444' }]}>
                    (Req: 12+)
                  </Text>
                </View>
                <View style={styles.eligibilityItem}>
                  <Text style={[styles.eligibilityValue, { color: colors.text }]}>
                    {selectedEmployee.hoursWorked12Months}
                  </Text>
                  <Text style={[styles.eligibilityLabel, { color: colors.textSecondary }]}>
                    Hours (12 mo)
                  </Text>
                  <Text style={[styles.eligibilityReq, { color: selectedEmployee.hoursWorked12Months >= 1250 ? '#10B981' : '#EF4444' }]}>
                    (Req: 1,250+)
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                LEAVE HISTORY
              </Text>
              
              <View style={styles.historyGrid}>
                <View style={styles.historyItem}>
                  <Text style={[styles.historyValue, { color: colors.text }]}>
                    {selectedEmployee.activeLeaves}
                  </Text>
                  <Text style={[styles.historyLabel, { color: colors.textSecondary }]}>
                    Active Leaves
                  </Text>
                </View>
                <View style={styles.historyItem}>
                  <Text style={[styles.historyValue, { color: colors.text }]}>
                    {selectedEmployee.totalLeaveDays}
                  </Text>
                  <Text style={[styles.historyLabel, { color: colors.textSecondary }]}>
                    Days YTD
                  </Text>
                </View>
              </View>

              {selectedEmployee.lastLeaveDate && (
                <View style={styles.lastLeaveRow}>
                  <Text style={[styles.lastLeaveLabel, { color: colors.textSecondary }]}>Last Leave:</Text>
                  <Text style={[styles.lastLeaveValue, { color: colors.text }]}>
                    {formatDate(selectedEmployee.lastLeaveDate)}
                  </Text>
                </View>
              )}

              <View style={styles.hireDateRow}>
                <Text style={[styles.hireDateLabel, { color: colors.textSecondary }]}>Hire Date:</Text>
                <Text style={[styles.hireDateValue, { color: colors.text }]}>
                  {formatDate(selectedEmployee.hireDate)}
                </Text>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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
        {viewMode === 'requests' && renderRequestFilters()}

        <View style={styles.contentSection}>
          {viewMode === 'alerts' && (
            filteredAlerts.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Bell size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Alerts</Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  All leave alerts have been addressed
                </Text>
              </View>
            ) : (
              filteredAlerts.map(renderAlertCard)
            )
          )}

          {viewMode === 'requests' && (
            filteredRequests.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FileText size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Requests</Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No leave requests match your filters
                </Text>
              </View>
            ) : (
              filteredRequests.map(renderRequestCard)
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
        </View>
      </ScrollView>

      {renderAlertDetailModal()}
      {renderRequestDetailModal()}
      {renderEmployeeDetailModal()}
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
    requestCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
    },
    requestHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    requestEmployee: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    requestAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    requestAvatarText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    requestEmployeeInfo: {
      gap: 2,
    },
    requestName: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    requestDept: {
      fontSize: 12,
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
    requestTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      marginBottom: 12,
    },
    leaveTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      gap: 6,
    },
    leaveTypeText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    intermittentBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    intermittentText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    requestDates: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    dateItem: {
      flex: 1,
    },
    dateLabel: {
      fontSize: 10,
      marginBottom: 2,
    },
    dateValue: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    dateSeparator: {
      paddingHorizontal: 8,
    },
    dateSeparatorText: {
      fontSize: 16,
    },
    daysCount: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    daysCountText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    requestReason: {
      fontSize: 12,
      lineHeight: 16,
    },
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 6,
      marginTop: 10,
    },
    warningText: {
      fontSize: 12,
      fontWeight: '500' as const,
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
    activeLeaveBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    activeLeaveText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    fmlaSection: {
      marginBottom: 12,
    },
    fmlaHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    fmlaLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    fmlaValue: {
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
    fmlaRemaining: {
      fontSize: 11,
      marginTop: 4,
      textAlign: 'right' as const,
    },
    employeeStats: {
      flexDirection: 'row',
      borderTopWidth: 1,
      paddingTop: 12,
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
    complianceContainer: {
      alignItems: 'flex-end',
    },
    complianceScore: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    complianceLabel: {
      fontSize: 10,
    },
    departmentMetrics: {
      flexDirection: 'row',
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
    requestDetailHeader: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 20,
      alignItems: 'center',
      marginBottom: 16,
    },
    requestDetailAvatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    requestDetailAvatarText: {
      fontSize: 24,
      fontWeight: '600' as const,
    },
    requestDetailName: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    requestDetailInfo: {
      fontSize: 14,
      marginTop: 4,
      marginBottom: 12,
    },
    statusBadgeLarge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
    },
    statusTextLarge: {
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
    leaveTypeBadgeLarge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 8,
    },
    leaveTypeTextLarge: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    intermittentInfo: {
      marginTop: 12,
    },
    intermittentLabel: {
      fontSize: 12,
      marginBottom: 4,
    },
    intermittentSchedule: {
      fontSize: 14,
    },
    datesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dateGridItem: {
      width: '50%',
      paddingVertical: 8,
    },
    dateGridLabel: {
      fontSize: 11,
      marginBottom: 4,
    },
    dateGridValue: {
      fontSize: 15,
      fontWeight: '500' as const,
    },
    hoursGrid: {
      flexDirection: 'row',
    },
    hoursItem: {
      flex: 1,
      alignItems: 'center',
    },
    hoursValue: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    hoursLabel: {
      fontSize: 12,
      marginTop: 4,
    },
    reasonText: {
      fontSize: 15,
      lineHeight: 22,
    },
    certificationRow: {
      marginBottom: 8,
    },
    certBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 8,
    },
    certText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    certDate: {
      fontSize: 13,
      marginTop: 8,
    },
    approvalText: {
      fontSize: 15,
    },
    approvalDate: {
      fontSize: 13,
      marginTop: 4,
    },
    notesText: {
      fontSize: 14,
      lineHeight: 20,
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
    eligibilityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 6,
    },
    eligibilityText: {
      fontSize: 12,
      fontWeight: '700' as const,
    },
    balanceItem: {
      marginBottom: 12,
    },
    balanceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    balanceLabel: {
      fontSize: 14,
    },
    balanceValue: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    balanceRemaining: {
      fontSize: 13,
      fontWeight: '500' as const,
      marginTop: 6,
      textAlign: 'right' as const,
    },
    yearInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    yearLabel: {
      fontSize: 13,
    },
    yearValue: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    eligibilityGrid: {
      flexDirection: 'row',
    },
    eligibilityItem: {
      flex: 1,
      alignItems: 'center',
    },
    eligibilityValue: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    eligibilityLabel: {
      fontSize: 11,
      marginTop: 4,
      textAlign: 'center' as const,
    },
    eligibilityReq: {
      fontSize: 10,
      marginTop: 2,
    },
    historyGrid: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    historyItem: {
      flex: 1,
      alignItems: 'center',
    },
    historyValue: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    historyLabel: {
      fontSize: 11,
      marginTop: 4,
    },
    lastLeaveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    lastLeaveLabel: {
      fontSize: 13,
    },
    lastLeaveValue: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    hireDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    hireDateLabel: {
      fontSize: 13,
    },
    hireDateValue: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
  });
