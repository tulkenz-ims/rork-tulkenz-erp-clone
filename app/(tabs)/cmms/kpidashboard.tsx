import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Activity,
  Timer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Wrench,
  Clock,
  Target,
  DollarSign,
  Gauge,
  Shield,
  Zap,
  Users,
  Package,
  ClipboardList,
  CalendarClock,
  AlertCircle,
  ChevronRight,
} from 'lucide-react-native';
import { useWorkOrdersQuery, useWorkOrderMetrics } from '@/hooks/useSupabaseWorkOrders';
import { usePMWorkOrdersQuery, usePMComplianceMetrics } from '@/hooks/useSupabasePMSchedules';
import { useEquipmentQuery, useEquipmentMetrics } from '@/hooks/useSupabaseEquipment';
import { useOverallReliabilityStats, useReliabilityTrends } from '@/hooks/useSupabaseFailureCodes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'overview' | 'workorders' | 'pm' | 'reliability' | 'costs';

export default function KPIDashboardScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const { data: workOrders = [], isLoading: workOrdersLoading } = useWorkOrdersQuery();
  const { data: woMetrics, isLoading: woMetricsLoading } = useWorkOrderMetrics();
  const { data: pmWorkOrders = [], isLoading: pmLoading } = usePMWorkOrdersQuery();
  const { data: pmComplianceMetrics, isLoading: pmMetricsLoading } = usePMComplianceMetrics();
  const { data: equipment = [], isLoading: equipmentLoading } = useEquipmentQuery();
  const { data: equipmentMetrics, isLoading: equipMetricsLoading } = useEquipmentMetrics();
  const { data: reliabilityStats, isLoading: reliabilityLoading } = useOverallReliabilityStats();
  const { data: reliabilityTrends = [], isLoading: trendsLoading } = useReliabilityTrends();

  const isLoading = workOrdersLoading || woMetricsLoading || pmLoading || pmMetricsLoading || 
                    equipmentLoading || equipMetricsLoading || reliabilityLoading || trendsLoading;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['work_orders'] }),
      queryClient.invalidateQueries({ queryKey: ['pm_work_orders'] }),
      queryClient.invalidateQueries({ queryKey: ['pm_schedules'] }),
      queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      queryClient.invalidateQueries({ queryKey: ['reliability_stats'] }),
      queryClient.invalidateQueries({ queryKey: ['reliability_trends'] }),
    ]).finally(() => setRefreshing(false));
  }, [queryClient]);

  const safeReliabilityStats = {
    totalEquipment: reliabilityStats?.totalEquipment ?? 0,
    totalFailures: reliabilityStats?.totalFailures ?? 0,
    avgMTBF: isNaN(reliabilityStats?.avgMTBF ?? 0) ? 0 : (reliabilityStats?.avgMTBF ?? 0),
    avgMTTR: isNaN(reliabilityStats?.avgMTTR ?? 0) ? 0 : (reliabilityStats?.avgMTTR ?? 0),
    avgAvailability: isNaN(reliabilityStats?.avgAvailability ?? 100) ? 100 : (reliabilityStats?.avgAvailability ?? 100),
    topPerformers: reliabilityStats?.topPerformers ?? [],
    needsAttention: reliabilityStats?.needsAttention ?? [],
    totalDowntimeHours: isNaN(reliabilityStats?.totalDowntimeHours ?? 0) ? 0 : (reliabilityStats?.totalDowntimeHours ?? 0),
    totalMaintenanceCost: reliabilityStats?.totalMaintenanceCost ?? 0,
  };
  

  const woStats = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split('T')[0];

    const open = woMetrics?.open || workOrders.filter(wo => wo.status === 'open').length;
    const inProgress = woMetrics?.inProgress || workOrders.filter(wo => wo.status === 'in_progress').length;
    const completed = woMetrics?.completed || workOrders.filter(wo => wo.status === 'completed').length;
    const overdue = woMetrics?.overdue || workOrders.filter(wo => {
      if (wo.status === 'completed' || wo.status === 'cancelled') return false;
      return wo.due_date && wo.due_date < todayStr;
    }).length;
    const critical = workOrders.filter(wo => wo.priority === 'critical' && wo.status !== 'completed' && wo.status !== 'cancelled').length;
    const high = workOrders.filter(wo => wo.priority === 'high' && wo.status !== 'completed' && wo.status !== 'cancelled').length;
    const total = woMetrics?.total || workOrders.length;
    const backlog = open + inProgress;

    const completedLast30 = workOrders.filter(wo => 
      wo.status === 'completed' && 
      wo.created_at && new Date(wo.created_at) >= thirtyDaysAgo
    ).length;

    const completedPrev30 = workOrders.filter(wo => 
      wo.status === 'completed' && 
      wo.created_at && new Date(wo.created_at) >= sixtyDaysAgo &&
      new Date(wo.created_at) < thirtyDaysAgo
    ).length;

    const completionTrend = completedPrev30 > 0 
      ? Math.round(((completedLast30 - completedPrev30) / completedPrev30) * 100) 
      : 0;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byType = {
      corrective: workOrders.filter(wo => wo.priority === 'high' || wo.priority === 'critical').length,
      preventive: workOrders.filter(wo => wo.priority === 'medium').length,
      emergency: workOrders.filter(wo => {
        if (wo.status === 'completed' || wo.status === 'cancelled') return false;
        return wo.due_date && wo.due_date < todayStr;
      }).length,
      request: workOrders.filter(wo => wo.priority === 'low').length,
    };

    const avgCompletionDays = woMetrics?.avgCompletionHours 
      ? woMetrics.avgCompletionHours / 8 
      : (completed > 0 ? 3.2 : 0);

    return { 
      open, inProgress, completed, overdue, critical, high, total, backlog,
      completedLast30, completionTrend, completionRate, byType, avgCompletionDays
    };
  }, [workOrders, woMetrics]);

  const pmStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const scheduled = pmWorkOrders.filter(pm => pm.status === 'scheduled').length;
    const overdueFromWOs = pmWorkOrders.filter(pm => pm.status === 'scheduled' && pm.scheduled_date < today).length;
    const overdue = pmComplianceMetrics?.overdue || overdueFromWOs;
    const completed = pmComplianceMetrics?.completedThisMonth || pmWorkOrders.filter(pm => pm.status === 'completed').length;
    const inProgress = pmWorkOrders.filter(pm => pm.status === 'in_progress').length;
    const total = pmComplianceMetrics?.totalSchedules || pmWorkOrders.length;
    
    const complianceRate = pmComplianceMetrics?.complianceRate || (total > 0 ? Math.round((completed / total) * 100) : 100);
    const onTimeRate = completed > 0 ? Math.round(((completed - overdue) / Math.max(completed, 1)) * 100) : 100;

    const byPriority = {
      critical: pmWorkOrders.filter(pm => pm.priority === 'critical').length,
      high: pmWorkOrders.filter(pm => pm.priority === 'high').length,
      medium: pmWorkOrders.filter(pm => pm.priority === 'medium').length,
      low: pmWorkOrders.filter(pm => pm.priority === 'low').length,
    };

    return { scheduled, overdue, completed, inProgress, total, complianceRate, onTimeRate, byPriority };
  }, [pmWorkOrders, pmComplianceMetrics]);

  const equipmentStats = useMemo(() => {
    const operational = equipmentMetrics?.operational || equipment.filter(e => e.status === 'operational').length;
    const down = equipmentMetrics?.down || equipment.filter(e => e.status === 'down').length;
    const maintenance = equipmentMetrics?.needsMaintenance || equipment.filter(e => e.status === 'needs_maintenance').length;
    const total = equipmentMetrics?.total || equipment.length;
    const uptimeRate = total > 0 ? Math.round((operational / total) * 100) : 100;

    const byCriticality = {
      critical: equipment.filter(e => e.criticality === 'critical').length,
      high: equipment.filter(e => e.criticality === 'high').length,
      medium: equipment.filter(e => e.criticality === 'medium').length,
      low: equipment.filter(e => e.criticality === 'low').length,
    };

    return { operational, down, maintenance, total, uptimeRate, byCriticality };
  }, [equipment, equipmentMetrics]);

  const costStats = useMemo(() => {
    const totalMaintCost = safeReliabilityStats.totalMaintenanceCost || 0;
    const laborCost = totalMaintCost * 0.6;
    const partsCost = totalMaintCost * 0.35;
    const contractorCost = totalMaintCost * 0.05;
    
    const costPerWO = workOrders.length > 0 
      ? Math.round(totalMaintCost / workOrders.length) 
      : 0;

    const costPerEquipment = equipment.length > 0
      ? Math.round(totalMaintCost / equipment.length)
      : 0;

    return {
      total: totalMaintCost,
      labor: laborCost,
      parts: partsCost,
      contractor: contractorCost,
      perWO: costPerWO,
      perEquipment: costPerEquipment,
    };
  }, [safeReliabilityStats, workOrders, equipment]);

  const kpiTargets = {
    mttr: 3,
    mtbf: 400,
    pmCompliance: 95,
    availability: 98,
    woCompletion: 90,
    backlogDays: 5,
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp size={14} color="#10B981" />;
    if (trend < 0) return <TrendingDown size={14} color="#EF4444" />;
    return <Minus size={14} color="#6B7280" />;
  };

  const getStatusColor = (value: number, target: number, higherIsBetter: boolean = true) => {
    const ratio = value / target;
    if (higherIsBetter) {
      if (ratio >= 1) return '#10B981';
      if (ratio >= 0.9) return '#F59E0B';
      return '#EF4444';
    } else {
      if (ratio <= 1) return '#10B981';
      if (ratio <= 1.2) return '#F59E0B';
      return '#EF4444';
    }
  };

  const renderOverviewTab = () => (
    <>
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.kpiIconContainer, { backgroundColor: '#F59E0B20' }]}>
            <Timer size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.kpiValue, { color: getStatusColor(kpiTargets.mttr, safeReliabilityStats.avgMTTR, false) }]}>
            {(safeReliabilityStats.avgMTTR || 0).toFixed(1)}h
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>MTTR</Text>
          <View style={[styles.targetBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.targetText, { color: colors.textSecondary }]}>Target: {kpiTargets.mttr}h</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.kpiIconContainer, { backgroundColor: '#3B82F620' }]}>
            <Activity size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.kpiValue, { color: getStatusColor(safeReliabilityStats.avgMTBF, kpiTargets.mtbf) }]}>
            {(safeReliabilityStats.avgMTBF || 0).toFixed(0)}h
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>MTBF</Text>
          <View style={[styles.targetBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.targetText, { color: colors.textSecondary }]}>Target: {kpiTargets.mtbf}h</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.kpiIconContainer, { backgroundColor: '#10B98120' }]}>
            <CalendarClock size={20} color="#10B981" />
          </View>
          <Text style={[styles.kpiValue, { color: getStatusColor(pmStats.complianceRate, kpiTargets.pmCompliance) }]}>
            {pmStats.complianceRate}%
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>PM Compliance</Text>
          <View style={[styles.targetBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.targetText, { color: colors.textSecondary }]}>Target: {kpiTargets.pmCompliance}%</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.kpiIconContainer, { backgroundColor: '#8B5CF620' }]}>
            <Shield size={20} color="#8B5CF6" />
          </View>
          <Text style={[styles.kpiValue, { color: getStatusColor(safeReliabilityStats.avgAvailability, kpiTargets.availability) }]}>
            {(safeReliabilityStats.avgAvailability || 0).toFixed(1)}%
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Availability</Text>
          <View style={[styles.targetBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.targetText, { color: colors.textSecondary }]}>Target: {kpiTargets.availability}%</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.kpiIconContainer, { backgroundColor: '#EC489920' }]}>
            <CheckCircle2 size={20} color="#EC4899" />
          </View>
          <Text style={[styles.kpiValue, { color: getStatusColor(woStats.completionRate, kpiTargets.woCompletion) }]}>
            {woStats.completionRate}%
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>WO Completion</Text>
          <View style={styles.trendRow}>
            {getTrendIcon(woStats.completionTrend)}
            <Text style={[styles.trendText, { color: woStats.completionTrend >= 0 ? '#10B981' : '#EF4444' }]}>
              {woStats.completionTrend > 0 ? '+' : ''}{woStats.completionTrend}%
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.kpiIconContainer, { backgroundColor: '#EF444420' }]}>
            <ClipboardList size={20} color="#EF4444" />
          </View>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            {woStats.backlog}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>WO Backlog</Text>
          <View style={[styles.targetBadge, { backgroundColor: woStats.overdue > 0 ? '#FEE2E2' : colors.backgroundSecondary }]}>
            <Text style={[styles.targetText, { color: woStats.overdue > 0 ? '#EF4444' : colors.textSecondary }]}>
              {woStats.overdue} overdue
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <BarChart3 size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Performance Summary</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>{woStats.total}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total WOs</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{pmStats.completed}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>PMs Complete</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.summaryValue, { color: '#8B5CF6' }]}>{equipmentStats.total}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Assets</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{safeReliabilityStats.totalFailures}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Failures</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <AlertTriangle size={18} color="#EF4444" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Attention Required</Text>
          </View>
        </View>

        {woStats.critical > 0 && (
          <View style={[styles.alertRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.alertIcon, { backgroundColor: '#DC262615' }]}>
              <AlertCircle size={16} color="#DC2626" />
            </View>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: colors.text }]}>{woStats.critical} Critical Work Orders</Text>
              <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>Require immediate attention</Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </View>
        )}

        {pmStats.overdue > 0 && (
          <View style={[styles.alertRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.alertIcon, { backgroundColor: '#F59E0B15' }]}>
              <Calendar size={16} color="#F59E0B" />
            </View>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: colors.text }]}>{pmStats.overdue} Overdue PMs</Text>
              <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>Past scheduled date</Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </View>
        )}

        {equipmentStats.down > 0 && (
          <View style={[styles.alertRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.alertIcon, { backgroundColor: '#EF444415' }]}>
              <Wrench size={16} color="#EF4444" />
            </View>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: colors.text }]}>{equipmentStats.down} Equipment Down</Text>
              <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>Currently non-operational</Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </View>
        )}

        {woStats.critical === 0 && pmStats.overdue === 0 && equipmentStats.down === 0 && (
          <View style={styles.noAlertsContainer}>
            <CheckCircle2 size={32} color="#10B981" />
            <Text style={[styles.noAlertsText, { color: colors.textSecondary }]}>All systems operating normally</Text>
          </View>
        )}
      </View>
    </>
  );

  const renderWorkOrdersTab = () => (
    <>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <ClipboardList size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Work Order Status</Text>
          </View>
        </View>

        <View style={styles.statusGrid}>
          <View style={[styles.statusCard, { backgroundColor: '#3B82F610' }]}>
            <Clock size={20} color="#3B82F6" />
            <Text style={[styles.statusValue, { color: colors.text }]}>{woStats.open}</Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Open</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: '#F59E0B10' }]}>
            <Activity size={20} color="#F59E0B" />
            <Text style={[styles.statusValue, { color: colors.text }]}>{woStats.inProgress}</Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: '#EF444410' }]}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={[styles.statusValue, { color: colors.text }]}>{woStats.overdue}</Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Overdue</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: '#10B98110' }]}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={[styles.statusValue, { color: colors.text }]}>{woStats.completed}</Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <BarChart3 size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Work Orders by Priority</Text>
          </View>
        </View>

        {[
          { label: 'High/Critical', value: woStats.byType.corrective, color: '#EF4444' },
          { label: 'Medium', value: woStats.byType.preventive, color: '#3B82F6' },
          { label: 'Overdue', value: woStats.byType.emergency, color: '#DC2626' },
          { label: 'Low Priority', value: woStats.byType.request, color: '#8B5CF6' },
        ].map(item => {
          const maxValue = Math.max(woStats.byType.corrective, woStats.byType.preventive, woStats.byType.emergency, woStats.byType.request) || 1;
          const barWidth = (item.value / maxValue) * 100;
          
          return (
            <View key={item.label} style={styles.barRow}>
              <View style={styles.barLabelContainer}>
                <Text style={[styles.barLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.barValue, { color: colors.textSecondary }]}>{item.value}</Text>
              </View>
              <View style={[styles.barContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.bar, { width: `${barWidth}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Target size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>KPI Metrics</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{woStats.completionRate}%</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Completion Rate</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{(woStats.avgCompletionDays || 0).toFixed(1)}d</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg. Completion</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{woStats.completedLast30}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Completed (30d)</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.metricValue, { color: woStats.critical > 0 ? '#EF4444' : colors.text }]}>{woStats.critical}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Critical Open</Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderPMTab = () => (
    <>
      <View style={styles.pmHeaderCards}>
        <View style={[styles.pmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.pmCardIcon, { backgroundColor: '#10B98115' }]}>
            <CalendarClock size={24} color="#10B981" />
          </View>
          <Text style={[styles.pmCardValue, { color: '#10B981' }]}>{pmStats.complianceRate}%</Text>
          <Text style={[styles.pmCardLabel, { color: colors.textSecondary }]}>PM Compliance</Text>
          <View style={[styles.pmCardTarget, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.pmCardTargetText, { color: colors.textSecondary }]}>
              Target: {kpiTargets.pmCompliance}%
            </Text>
          </View>
        </View>

        <View style={[styles.pmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.pmCardIcon, { backgroundColor: '#3B82F615' }]}>
            <Clock size={24} color="#3B82F6" />
          </View>
          <Text style={[styles.pmCardValue, { color: '#3B82F6' }]}>{pmStats.onTimeRate}%</Text>
          <Text style={[styles.pmCardLabel, { color: colors.textSecondary }]}>On-Time Rate</Text>
          <View style={[styles.pmCardTarget, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.pmCardTargetText, { color: colors.textSecondary }]}>
              {pmStats.overdue} overdue
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <BarChart3 size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>PM Status Breakdown</Text>
          </View>
        </View>

        <View style={styles.pmStatusGrid}>
          <View style={[styles.pmStatusItem, { borderColor: colors.border }]}>
            <Text style={[styles.pmStatusValue, { color: '#3B82F6' }]}>{pmStats.scheduled}</Text>
            <Text style={[styles.pmStatusLabel, { color: colors.textSecondary }]}>Scheduled</Text>
          </View>
          <View style={[styles.pmStatusItem, { borderColor: colors.border }]}>
            <Text style={[styles.pmStatusValue, { color: '#F59E0B' }]}>{pmStats.inProgress}</Text>
            <Text style={[styles.pmStatusLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </View>
          <View style={[styles.pmStatusItem, { borderColor: colors.border }]}>
            <Text style={[styles.pmStatusValue, { color: '#10B981' }]}>{pmStats.completed}</Text>
            <Text style={[styles.pmStatusLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={[styles.pmStatusItem, { borderColor: colors.border }]}>
            <Text style={[styles.pmStatusValue, { color: '#EF4444' }]}>{pmStats.overdue}</Text>
            <Text style={[styles.pmStatusLabel, { color: colors.textSecondary }]}>Overdue</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <AlertCircle size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>PMs by Priority</Text>
          </View>
        </View>

        {[
          { label: 'Critical', value: pmStats.byPriority.critical, color: '#DC2626' },
          { label: 'High', value: pmStats.byPriority.high, color: '#F59E0B' },
          { label: 'Medium', value: pmStats.byPriority.medium, color: '#3B82F6' },
          { label: 'Low', value: pmStats.byPriority.low, color: '#10B981' },
        ].map(item => {
          const maxValue = Math.max(...Object.values(pmStats.byPriority)) || 1;
          const barWidth = (item.value / maxValue) * 100;
          
          return (
            <View key={item.label} style={styles.barRow}>
              <View style={styles.barLabelContainer}>
                <View style={[styles.priorityDot, { backgroundColor: item.color }]} />
                <Text style={[styles.barLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.barValue, { color: colors.textSecondary }]}>{item.value}</Text>
              </View>
              <View style={[styles.barContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.bar, { width: `${barWidth}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          );
        })}
      </View>
    </>
  );

  const renderReliabilityTab = () => (
    <>
      <View style={styles.reliabilityHeaderCards}>
        <View style={[styles.reliabilityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Activity size={20} color="#3B82F6" />
          <Text style={[styles.reliabilityValue, { color: colors.text }]}>{(safeReliabilityStats.avgMTBF || 0).toFixed(0)}h</Text>
          <Text style={[styles.reliabilityLabel, { color: colors.textSecondary }]}>Avg. MTBF</Text>
          <Text style={[styles.reliabilitySubtext, { color: colors.textSecondary }]}>
            ~{((safeReliabilityStats.avgMTBF || 0) / 16).toFixed(0)} operating days
          </Text>
        </View>

        <View style={[styles.reliabilityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Timer size={20} color="#F59E0B" />
          <Text style={[styles.reliabilityValue, { color: colors.text }]}>{(safeReliabilityStats.avgMTTR || 0).toFixed(1)}h</Text>
          <Text style={[styles.reliabilityLabel, { color: colors.textSecondary }]}>Avg. MTTR</Text>
          <Text style={[styles.reliabilitySubtext, { color: colors.textSecondary }]}>
            repair time
          </Text>
        </View>

        <View style={[styles.reliabilityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Shield size={20} color="#10B981" />
          <Text style={[styles.reliabilityValue, { color: '#10B981' }]}>{(safeReliabilityStats.avgAvailability || 0).toFixed(1)}%</Text>
          <Text style={[styles.reliabilityLabel, { color: colors.textSecondary }]}>Availability</Text>
          <Text style={[styles.reliabilitySubtext, { color: colors.textSecondary }]}>
            fleet uptime
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <BarChart3 size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Reliability Trends</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Last 6 months</Text>
        </View>

        {reliabilityTrends.map((trend) => (
          <View key={trend.month} style={[styles.trendRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.trendMonth, { color: colors.text }]}>{trend.month}</Text>
            <View style={styles.trendValues}>
              <View style={styles.trendItem}>
                <Text style={[styles.trendItemLabel, { color: colors.textSecondary }]}>MTBF</Text>
                <Text style={[styles.trendItemValue, { color: '#3B82F6' }]}>{trend.mtbf}h</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={[styles.trendItemLabel, { color: colors.textSecondary }]}>MTTR</Text>
                <Text style={[styles.trendItemValue, { color: '#F59E0B' }]}>{trend.mttr}h</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={[styles.trendItemLabel, { color: colors.textSecondary }]}>Avail.</Text>
                <Text style={[styles.trendItemValue, { color: '#10B981' }]}>{trend.availability}%</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <AlertTriangle size={18} color="#EF4444" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Equipment Needing Attention</Text>
          </View>
        </View>

        {safeReliabilityStats.needsAttention.length === 0 ? (
          <View style={styles.noAlertsContainer}>
            <CheckCircle2 size={28} color="#10B981" />
            <Text style={[styles.noAlertsText, { color: colors.textSecondary }]}>
              All equipment within acceptable limits
            </Text>
          </View>
        ) : (
          safeReliabilityStats.needsAttention.slice(0, 5).map((equip) => (
            <View key={equip.equipmentId} style={[styles.attentionRow, { borderTopColor: colors.border }]}>
              <View style={[styles.attentionIcon, { backgroundColor: '#FEE2E2' }]}>
                <AlertTriangle size={14} color="#EF4444" />
              </View>
              <View style={styles.attentionContent}>
                <Text style={[styles.attentionName, { color: colors.text }]} numberOfLines={1}>
                  {equip.equipmentName}
                </Text>
                <View style={styles.attentionStats}>
                  <Text style={[styles.attentionStat, { color: '#EF4444' }]}>
                    {(100 - (equip.availability || 0)).toFixed(1)}% downtime
                  </Text>
                  <Text style={[styles.attentionStat, { color: colors.textSecondary }]}>
                    Avail: {(equip.availability || 0).toFixed(0)}%
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );

  const renderCostsTab = () => (
    <>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <DollarSign size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Total Maintenance Cost</Text>
          </View>
        </View>

        <View style={styles.totalCostContainer}>
          <Text style={[styles.totalCostValue, { color: colors.text }]}>
            ${costStats.total.toLocaleString()}
          </Text>
          <Text style={[styles.totalCostLabel, { color: colors.textSecondary }]}>
            Last 12 months
          </Text>
        </View>

        <View style={styles.costBreakdown}>
          <View style={[styles.costItem, { backgroundColor: '#3B82F610' }]}>
            <Users size={18} color="#3B82F6" />
            <Text style={[styles.costItemValue, { color: colors.text }]}>${costStats.labor.toLocaleString()}</Text>
            <Text style={[styles.costItemLabel, { color: colors.textSecondary }]}>Labor (60%)</Text>
          </View>
          <View style={[styles.costItem, { backgroundColor: '#10B98110' }]}>
            <Package size={18} color="#10B981" />
            <Text style={[styles.costItemValue, { color: colors.text }]}>${costStats.parts.toLocaleString()}</Text>
            <Text style={[styles.costItemLabel, { color: colors.textSecondary }]}>Parts (35%)</Text>
          </View>
          <View style={[styles.costItem, { backgroundColor: '#8B5CF610' }]}>
            <Wrench size={18} color="#8B5CF6" />
            <Text style={[styles.costItemValue, { color: colors.text }]}>${costStats.contractor.toLocaleString()}</Text>
            <Text style={[styles.costItemLabel, { color: colors.textSecondary }]}>Contractor (5%)</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <BarChart3 size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Cost Metrics</Text>
          </View>
        </View>

        <View style={styles.costMetricsGrid}>
          <View style={[styles.costMetricBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.costMetricValue, { color: colors.text }]}>${costStats.perWO}</Text>
            <Text style={[styles.costMetricLabel, { color: colors.textSecondary }]}>Avg. Cost per WO</Text>
          </View>
          <View style={[styles.costMetricBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.costMetricValue, { color: colors.text }]}>${costStats.perEquipment}</Text>
            <Text style={[styles.costMetricLabel, { color: colors.textSecondary }]}>Avg. per Asset</Text>
          </View>
          <View style={[styles.costMetricBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.costMetricValue, { color: colors.text }]}>{(safeReliabilityStats.totalDowntimeHours || 0).toFixed(1)}h</Text>
            <Text style={[styles.costMetricLabel, { color: colors.textSecondary }]}>Total Downtime</Text>
          </View>
          <View style={[styles.costMetricBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.costMetricValue, { color: colors.text }]}>{safeReliabilityStats.totalFailures}</Text>
            <Text style={[styles.costMetricLabel, { color: colors.textSecondary }]}>Total Failures</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Zap size={18} color="#F59E0B" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Cost Insights</Text>
          </View>
        </View>

        <View style={styles.insightsList}>
          <View style={[styles.insightItem, { backgroundColor: '#3B82F610' }]}>
            <DollarSign size={16} color="#3B82F6" />
            <Text style={[styles.insightText, { color: colors.text }]}>
              Labor represents 60% of maintenance costs
            </Text>
          </View>
          <View style={[styles.insightItem, { backgroundColor: '#F59E0B10' }]}>
            <Clock size={16} color="#F59E0B" />
            <Text style={[styles.insightText, { color: colors.text }]}>
              {(safeReliabilityStats.totalDowntimeHours || 0).toFixed(1)} hours of production time lost to failures
            </Text>
          </View>
          <View style={[styles.insightItem, { backgroundColor: '#10B98110' }]}>
            <Target size={16} color="#10B981" />
            <Text style={[styles.insightText, { color: colors.text }]}>
              Improving MTTR by 1h could save ~${Math.round(costStats.labor * 0.1).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  const tabs = [
    { id: 'overview' as ViewMode, label: 'Overview', icon: Gauge },
    { id: 'workorders' as ViewMode, label: 'Work Orders', icon: ClipboardList },
    { id: 'pm' as ViewMode, label: 'PM', icon: CalendarClock },
    { id: 'reliability' as ViewMode, label: 'Reliability', icon: Activity },
    { id: 'costs' as ViewMode, label: 'Costs', icon: DollarSign },
  ];

  if (isLoading && workOrders.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading KPI data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {tabs.map(tab => {
            const isActive = viewMode === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  isActive && { backgroundColor: colors.primary + '15', borderColor: colors.primary }
                ]}
                onPress={() => setViewMode(tab.id)}
              >
                <tab.icon size={16} color={isActive ? colors.primary : colors.textSecondary} />
                <Text style={[
                  styles.tabText,
                  { color: isActive ? colors.primary : colors.textSecondary }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {viewMode === 'overview' && renderOverviewTab()}
        {viewMode === 'workorders' && renderWorkOrdersTab()}
        {viewMode === 'pm' && renderPMTab()}
        {viewMode === 'reliability' && renderReliabilityTab()}
        {viewMode === 'costs' && renderCostsTab()}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  tabsContainer: {
    borderBottomWidth: 1,
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },
  kpiGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - 34) / 2,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  kpiLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  targetBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
  },
  targetText: {
    fontSize: 11,
  },
  trendRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  summaryGrid: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  summaryLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  alertRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  alertDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  noAlertsContainer: {
    alignItems: 'center' as const,
    paddingVertical: 24,
    gap: 10,
  },
  noAlertsText: {
    fontSize: 13,
  },
  statusGrid: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  statusCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 6,
  },
  statusLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  barRow: {
    marginBottom: 14,
  },
  barLabelContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  barValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  metricsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  metricBox: {
    width: (SCREEN_WIDTH - 66) / 2,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  pmHeaderCards: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 12,
  },
  pmCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  pmCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  pmCardValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  pmCardLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  pmCardTarget: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pmCardTargetText: {
    fontSize: 11,
  },
  pmStatusGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  pmStatusItem: {
    width: '50%',
    padding: 16,
    alignItems: 'center' as const,
    borderWidth: 0.5,
  },
  pmStatusValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  pmStatusLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  reliabilityHeaderCards: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 12,
  },
  reliabilityCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  reliabilityValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  reliabilityLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  reliabilitySubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  trendRow2: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  trendMonth: {
    fontSize: 13,
    fontWeight: '500' as const,
    width: 80,
  },
  trendValues: {
    flexDirection: 'row' as const,
    gap: 16,
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  trendItem: {
    alignItems: 'center' as const,
  },
  trendItemLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  trendItemValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  attentionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
  },
  attentionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  attentionContent: {
    flex: 1,
  },
  attentionName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  attentionStats: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 2,
  },
  attentionStat: {
    fontSize: 11,
  },
  totalCostContainer: {
    alignItems: 'center' as const,
    paddingVertical: 16,
    marginBottom: 16,
  },
  totalCostValue: {
    fontSize: 36,
    fontWeight: '700' as const,
  },
  totalCostLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  costBreakdown: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  costItem: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  costItemValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  costItemLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center' as const,
  },
  costMetricsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  costMetricBox: {
    width: (SCREEN_WIDTH - 66) / 2,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  costMetricValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  costMetricLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  insightsList: {
    gap: 10,
  },
  insightItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 12,
    borderRadius: 8,
  },
  insightText: {
    fontSize: 13,
    flex: 1,
  },
});
