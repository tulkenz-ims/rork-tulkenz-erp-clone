import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building2,
  Package,
  Wrench,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Target,
  Zap,
  Flame,
  Siren,
  Tornado,
  ShieldAlert,
  X,
  ClipboardList,
  BarChart3,
  MapPin,
  ChevronDown,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import Colors from '@/constants/colors';
import EmployeeHome from '@/components/EmployeeHome';
import AlertSummaryWidget from '@/components/AlertSummaryWidget';
import LowStockAlerts from '@/components/LowStockAlerts';
import UserProfileMenu from '@/components/UserProfileMenu';
import ProcurementWidget from '@/components/ProcurementWidget';
import LineStatusWidget from '@/components/LineStatusWidget';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import { useWorkOrdersQuery } from '@/hooks/useSupabaseWorkOrders';
import { useEmployees } from '@/hooks/useSupabaseEmployees';
import { useAllAggregatedApprovals } from '@/hooks/useAggregatedApprovals';
import { useTaskFeedPostsQuery } from '@/hooks/useTaskFeedTemplates';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface KPIData {
  label: string;
  value: string;
  subValue?: string;
  trend?: number;
  trendLabel?: string;
  color: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

interface ActionItem {
  id: string;
  type: 'approval' | 'alert' | 'task';
  title: string;
  subtitle: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  count?: number;
  value?: string;
}

export default function ExecutiveDashboard() {
  const { company, loading: authLoading, isAuthenticated, isEmployee } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading: materialsLoading } = useMaterialsQuery();
  const { data: workOrders = [], isLoading: workOrdersLoading } = useWorkOrdersQuery();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { purchaseApprovals, timeApprovals, permitApprovals, isLoading: approvalsLoading } = useAllAggregatedApprovals();
  const { data: pendingPosts = [] } = useTaskFeedPostsQuery({ status: 'pending' });
  const { data: inProgressPosts = [] } = useTaskFeedPostsQuery({ status: 'in_progress' });
  const taskFeedPendingCount = pendingPosts.length + inProgressPosts.length;

  const erpLoading = materialsLoading || workOrdersLoading || employeesLoading || approvalsLoading;

  const approvals = useMemo(() => {
    return [
      ...purchaseApprovals.map(a => ({
        ...a,
        type: 'purchase' as const,
        status: a.status === 'pending' || a.status === 'in_progress' ? 'pending' as const : a.status as 'approved' | 'rejected',
        amount: a.amount || 0,
      })),
      ...timeApprovals.map(a => ({
        ...a,
        type: a.type as 'time_off' | 'overtime' | 'schedule_change',
        status: a.status === 'pending' || a.status === 'in_progress' ? 'pending' as const : a.status as 'approved' | 'rejected',
      })),
      ...permitApprovals.map(a => ({
        ...a,
        type: 'permit' as const,
        status: a.status === 'pending' || a.status === 'in_progress' ? 'pending' as const : a.status as 'approved' | 'rejected',
      })),
    ];
  }, [purchaseApprovals, timeApprovals, permitApprovals]);

  const stats = useMemo(() => {
    const totalMaterials = materials.length;
    const lowStockCount = materials.filter(m => m.on_hand <= m.min_level && m.on_hand > 0).length;
    const outOfStockCount = materials.filter(m => m.on_hand <= 0).length;
    
    const openWorkOrders = workOrders.filter(w => w.status === 'open').length;
    const inProgressWorkOrders = workOrders.filter(w => w.status === 'in_progress').length;
    const completedWorkOrders = workOrders.filter(w => w.status === 'completed').length;
    const overdueWorkOrders = workOrders.filter(w => {
      if (w.status === 'completed' || w.status === 'cancelled') return false;
      if (!w.due_date) return false;
      return new Date(w.due_date) < new Date();
    }).length;
    
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.status === 'active').length;
    
    return {
      totalMaterials,
      lowStockCount,
      outOfStockCount,
      openWorkOrders,
      inProgressWorkOrders,
      completedWorkOrders,
      overdueWorkOrders,
      totalEmployees,
      activeEmployees,
    };
  }, [materials, workOrders, employees]);

  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLowStockAlerts, setShowLowStockAlerts] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showFacilityPicker, setShowFacilityPicker] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string>('all');

  const handleMaterialPress = useCallback((materialId: string) => {
    console.log('[Dashboard] handleMaterialPress called with materialId:', materialId);
    Haptics.selectionAsync();
    setShowLowStockAlerts(false);
    router.push({
      pathname: '/inventory/itemrecords',
      params: { materialId, fromAlert: 'true' },
    });
  }, [router]);

  const materialsList = useMemo(() => {
    return materials.map(m => ({
      ...m,
      facility_name: 'Main Facility',
      vendor: m.vendor || 'Unknown Vendor',
    }));
  }, [materials]);

  const handleCreatePurchaseRequest = useCallback((materialId: string) => {
    console.log('[Dashboard] handleCreatePurchaseRequest called with materialId:', materialId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const material = materialsList.find(m => m.id === materialId);
    if (!material) {
      console.warn('[Dashboard] Material not found:', materialId);
      Alert.alert('Error', 'Material not found');
      return;
    }

    const suggestedQty = Math.max(
      material.max_level - material.on_hand,
      material.min_level * 2
    );
    const vendorName = material.vendor || 'Unknown Vendor';

    console.log('[Dashboard] Navigating to procurement requisitions with:', {
      materialId,
      materialName: material.name,
      materialSku: material.sku,
      suggestedQty,
      vendor: vendorName,
      unitPrice: material.unit_price,
    });

    setShowLowStockAlerts(false);
    router.push({
      pathname: '/procurement/requisitions',
      params: {
        createPR: 'true',
        materialId,
        materialName: material.name,
        materialSku: material.sku,
        suggestedQty: suggestedQty.toString(),
        vendor: vendorName,
        unitPrice: material.unit_price.toString(),
      },
    });
  }, [materialsList, router]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const inventoryValue = useMemo(() => {
    return materialsList.reduce((sum, m) => sum + (m.on_hand * m.unit_price), 0);
  }, [materialsList]);

  const kpis = useMemo<KPIData[]>(() => [
    {
      label: 'Inventory Value',
      value: `$${(inventoryValue / 1000).toFixed(0)}K`,
      subValue: `${stats.totalMaterials} SKUs`,
      trend: 5.2,
      trendLabel: 'vs last month',
      color: '#10B981',
      icon: DollarSign,
    },
    {
      label: 'Active Work Orders',
      value: (stats.openWorkOrders + stats.inProgressWorkOrders).toString(),
      subValue: `${stats.overdueWorkOrders} overdue`,
      trend: stats.overdueWorkOrders > 0 ? -12 : 8,
      trendLabel: 'completion rate',
      color: stats.overdueWorkOrders > 0 ? '#F59E0B' : '#3B82F6',
      icon: Wrench,
    },
    {
      label: 'Employees Active',
      value: stats.activeEmployees.toString(),
      subValue: `of ${stats.totalEmployees} total`,
      trend: Math.round((stats.activeEmployees / Math.max(stats.totalEmployees, 1)) * 100),
      trendLabel: 'attendance',
      color: '#8B5CF6',
      icon: Users,
    },
    {
      label: 'Stock Alerts',
      value: (stats.lowStockCount + stats.outOfStockCount).toString(),
      subValue: `${stats.outOfStockCount} critical`,
      trend: stats.outOfStockCount > 0 ? -100 : 0,
      color: stats.outOfStockCount > 0 ? '#EF4444' : '#10B981',
      icon: Package,
    },
  ], [stats, inventoryValue]);

  const actionItems = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];
    
    const purchaseApprovals = approvals.filter(a => a.type === 'purchase' && a.status === 'pending');
    if (purchaseApprovals.length > 0) {
      const totalValue = purchaseApprovals.reduce((acc, a) => {
        if (a.type === 'purchase') return acc + a.amount;
        return acc;
      }, 0);
      items.push({
        id: 'purchase-approvals',
        type: 'approval',
        title: 'Purchase Approvals',
        subtitle: `${purchaseApprovals.length} pending requests`,
        urgency: purchaseApprovals.some(a => a.urgency === 'high') ? 'high' : 'medium',
        count: purchaseApprovals.length,
        value: `$${totalValue.toLocaleString()}`,
      });
    }

    const timeApprovals = approvals.filter(a => 
      (a.type === 'time_off' || a.type === 'overtime' || a.type === 'schedule_change') && 
      a.status === 'pending'
    );
    if (timeApprovals.length > 0) {
      items.push({
        id: 'time-approvals',
        type: 'approval',
        title: 'Time Requests',
        subtitle: `${timeApprovals.length} awaiting review`,
        urgency: timeApprovals.some(a => a.urgency === 'high') ? 'high' : 'low',
        count: timeApprovals.length,
      });
    }

    if (stats.outOfStockCount > 0) {
      items.push({
        id: 'out-of-stock',
        type: 'alert',
        title: 'Out of Stock Items',
        subtitle: `${stats.outOfStockCount} items need immediate attention`,
        urgency: 'critical',
        count: stats.outOfStockCount,
      });
    }

    if (stats.overdueWorkOrders > 0) {
      items.push({
        id: 'overdue-wo',
        type: 'alert',
        title: 'Overdue Work Orders',
        subtitle: `${stats.overdueWorkOrders} past due date`,
        urgency: 'high',
        count: stats.overdueWorkOrders,
      });
    }

    if (stats.lowStockCount > 3) {
      items.push({
        id: 'low-stock',
        type: 'alert',
        title: 'Low Stock Warning',
        subtitle: `${stats.lowStockCount} items below minimum`,
        urgency: 'medium',
        count: stats.lowStockCount,
      });
    }

    return items.slice(0, 5);
  }, [approvals, stats]);

  const performanceMetrics = useMemo(() => {
    const stockHealth = stats.totalMaterials > 0 
      ? Math.round((1 - (stats.lowStockCount + stats.outOfStockCount) / stats.totalMaterials) * 100)
      : 100;
    
    const woCompletion = workOrders.length > 0 
      ? Math.round((stats.completedWorkOrders / workOrders.length) * 100)
      : 0;
    
    const laborUtilization = stats.totalEmployees > 0 
      ? Math.round((stats.activeEmployees / stats.totalEmployees) * 100)
      : 0;

    return { stockHealth, woCompletion, laborUtilization };
  }, [stats, workOrders]);

  const facilityBreakdown = useMemo(() => {
    const facilities: Record<string, { value: number; items: number; lowStock: number }> = {};
    
    materialsList.forEach(m => {
      const facility = m.facility_name || 'Unassigned';
      if (!facilities[facility]) {
        facilities[facility] = { value: 0, items: 0, lowStock: 0 };
      }
      facilities[facility].value += m.on_hand * m.unit_price;
      facilities[facility].items++;
      if (m.on_hand <= m.min_level) facilities[facility].lowStock++;
    });
    
    return Object.entries(facilities)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);
  }, [materialsList]);

  const facilityNames = useMemo(() => {
    const names = new Set<string>();
    materialsList.forEach(m => { if (m.facility_name) names.add(m.facility_name); });
    if (names.size === 0) names.add('Main Facility');
    return ['All Facilities', ...Array.from(names).sort()];
  }, [materialsList]);

  useEffect(() => {
    console.log('Auth state:', { authLoading, isAuthenticated });
    if (!authLoading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to login');
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['materials'] }),
        queryClient.invalidateQueries({ queryKey: ['work_orders'] }),
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['aggregated_purchase_approvals'] }),
        queryClient.invalidateQueries({ queryKey: ['aggregated_time_approvals'] }),
        queryClient.invalidateQueries({ queryKey: ['aggregated_permit_approvals'] }),
      ]);
      console.log('[Dashboard] Refresh completed');
    } catch (error) {
      console.error('[Dashboard] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#10B981';
      default: return Colors.textSecondary;
    }
  };

  const getActionIcon = (type: string, urgency: string) => {
    if (type === 'alert') {
      return urgency === 'critical' ? XCircle : AlertTriangle;
    }
    return CheckCircle;
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isEmployee) {
    return <EmployeeHome />;
  }

  if (erpLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Executive Overview</Text>
              <Text style={styles.companyName}>{company?.name || 'TulKenz IMS'}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
                onPress={onRefresh}
              >
                <RefreshCw size={20} color={Colors.text} />
              </Pressable>
              <UserProfileMenu />
            </View>
          </View>
          <View style={styles.dateRow}>
            <Clock size={14} color={Colors.textSecondary} />
            <Text style={styles.dateText}>
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
        </View>

        {/* Quick Action Bar */}
        <View style={styles.quickActionBar}>
          <Pressable
            style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setShowFacilityPicker(true)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F620' }]}>
              <MapPin size={18} color="#3B82F6" />
            </View>
            <Text style={styles.quickActionStat} numberOfLines={1}>
              {selectedFacility === 'all' ? `${facilityNames.length - 1}` : '1'}
            </Text>
            <Text style={styles.quickActionLabel} numberOfLines={1}>
              {selectedFacility === 'all' ? (facilityNames.length - 1 === 1 ? 'Facility' : 'Facilities') : selectedFacility.length > 10 ? selectedFacility.slice(0, 9) + '…' : selectedFacility}
            </Text>
            <ChevronDown size={10} color={Colors.textSecondary} style={{ marginTop: -2 }} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.7 }]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setShowEmergencyModal(true);
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#DC262620' }]}>
              <Siren size={18} color="#DC2626" />
            </View>
            <Text style={[styles.quickActionStat, { color: '#DC2626' }]}>SOS</Text>
            <Text style={styles.quickActionLabel}>Emergency</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/timeclock')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#10B98120' }]}>
              <Users size={18} color="#10B981" />
            </View>
            <Text style={[styles.quickActionStat, { color: '#10B981' }]}>
              {stats.activeEmployees}/{stats.totalEmployees}
            </Text>
            <Text style={styles.quickActionLabel}>Active</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/taskfeed')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B20' }]}>
              <ClipboardList size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.quickActionStat, { color: taskFeedPendingCount > 0 ? '#F59E0B' : '#10B981' }]}>
              {taskFeedPendingCount}
            </Text>
            <Text style={styles.quickActionLabel}>Pending</Text>
          </Pressable>
        </View>

        <LineStatusWidget />

        <View style={styles.kpiGrid}>
          {kpis.map((kpi, index) => {
            const KpiIcon = kpi.icon;
            return (
              <View key={index} style={styles.kpiCard}>
                <View style={styles.kpiHeader}>
                  <View style={[styles.kpiIconBox, { backgroundColor: `${kpi.color}20` }]}>
                    <KpiIcon size={20} color={kpi.color} />
                  </View>
                  {kpi.trend !== undefined && kpi.trend !== 0 && (
                    <View style={[
                      styles.trendBadge, 
                      { backgroundColor: kpi.trend > 0 ? '#10B98120' : '#EF444420' }
                    ]}>
                      {kpi.trend > 0 ? (
                        <TrendingUp size={12} color="#10B981" />
                      ) : (
                        <TrendingDown size={12} color="#EF4444" />
                      )}
                      <Text style={[
                        styles.trendText, 
                        { color: kpi.trend > 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {Math.abs(kpi.trend)}%
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                {kpi.subValue && (
                  <Text style={styles.kpiSubValue}>{kpi.subValue}</Text>
                )}
              </View>
            );
          })}
        </View>

        <AlertSummaryWidget onPress={() => setShowLowStockAlerts(true)} />

        <View style={styles.section}>
          <ProcurementWidget />
        </View>

        {actionItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Zap size={18} color={Colors.warning} />
                <Text style={styles.sectionTitle}>Requires Attention</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{actionItems.length}</Text>
              </View>
            </View>
            
            {actionItems.map((item) => {
              const ActionIcon = getActionIcon(item.type, item.urgency);
              const urgencyColor = getUrgencyColor(item.urgency);
              
              return (
                <Pressable 
                  key={item.id}
                  style={({ pressed }) => [
                    styles.actionCard,
                    pressed && styles.pressed
                  ]}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: `${urgencyColor}15` }]}>
                    <ActionIcon size={20} color={urgencyColor} />
                  </View>
                  <View style={styles.actionContent}>
                    <View style={styles.actionTitleRow}>
                      <Text style={styles.actionTitle}>{item.title}</Text>
                      {item.count && (
                        <View style={[styles.actionCountBadge, { backgroundColor: `${urgencyColor}20` }]}>
                          <Text style={[styles.actionCountText, { color: urgencyColor }]}>{item.count}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
                    {item.value && (
                      <Text style={[styles.actionValue, { color: urgencyColor }]}>{item.value}</Text>
                    )}
                  </View>
                  <ChevronRight size={20} color={Colors.textTertiary} />
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Target size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Performance Scorecard</Text>
            </View>
          </View>
          
          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <View style={styles.performanceItem}>
                <View style={styles.performanceCircle}>
                  <Text style={[
                    styles.performanceValue,
                    { color: performanceMetrics.stockHealth >= 80 ? '#10B981' : performanceMetrics.stockHealth >= 60 ? '#F59E0B' : '#EF4444' }
                  ]}>
                    {performanceMetrics.stockHealth}%
                  </Text>
                </View>
                <Text style={styles.performanceLabel}>Stock Health</Text>
              </View>
              
              <View style={styles.performanceItem}>
                <View style={styles.performanceCircle}>
                  <Text style={[
                    styles.performanceValue,
                    { color: performanceMetrics.woCompletion >= 80 ? '#10B981' : performanceMetrics.woCompletion >= 60 ? '#F59E0B' : '#EF4444' }
                  ]}>
                    {performanceMetrics.woCompletion}%
                  </Text>
                </View>
                <Text style={styles.performanceLabel}>WO Completion</Text>
              </View>
              
              <View style={styles.performanceItem}>
                <View style={styles.performanceCircle}>
                  <Text style={[
                    styles.performanceValue,
                    { color: performanceMetrics.laborUtilization >= 80 ? '#10B981' : performanceMetrics.laborUtilization >= 60 ? '#F59E0B' : '#EF4444' }
                  ]}>
                    {performanceMetrics.laborUtilization}%
                  </Text>
                </View>
                <Text style={styles.performanceLabel}>Labor Active</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Activity size={18} color={Colors.info} />
              <Text style={styles.sectionTitle}>Operations Summary</Text>
            </View>
          </View>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Package size={16} color={Colors.info} />
                <Text style={styles.summaryTitle}>Inventory</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total SKUs</Text>
                <Text style={styles.summaryValue}>{stats.totalMaterials}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Low Stock</Text>
                <Text style={[styles.summaryValue, stats.lowStockCount > 0 && { color: Colors.warning }]}>
                  {stats.lowStockCount}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Out of Stock</Text>
                <Text style={[styles.summaryValue, stats.outOfStockCount > 0 && { color: Colors.error }]}>
                  {stats.outOfStockCount}
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Wrench size={16} color={Colors.warning} />
                <Text style={styles.summaryTitle}>Work Orders</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Open</Text>
                <Text style={styles.summaryValue}>{stats.openWorkOrders}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>In Progress</Text>
                <Text style={[styles.summaryValue, { color: Colors.info }]}>{stats.inProgressWorkOrders}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Overdue</Text>
                <Text style={[styles.summaryValue, stats.overdueWorkOrders > 0 && { color: Colors.error }]}>
                  {stats.overdueWorkOrders}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Building2 size={18} color={Colors.purple} />
              <Text style={styles.sectionTitle}>Facility Overview</Text>
            </View>
          </View>
          
          {facilityBreakdown.length > 0 ? (
            facilityBreakdown.map((facility, index) => {
              const percentage = inventoryValue > 0 
                ? Math.round((facility.value / inventoryValue) * 100) 
                : 0;
              
              return (
                <View key={facility.name} style={styles.facilityCard}>
                  <View style={styles.facilityHeader}>
                    <View style={styles.facilityInfo}>
                      <Text style={styles.facilityName}>{facility.name}</Text>
                      <Text style={styles.facilityMeta}>
                        {facility.items} items • {facility.lowStock > 0 ? `${facility.lowStock} low` : 'All stocked'}
                      </Text>
                    </View>
                    <View style={styles.facilityValueContainer}>
                      <Text style={styles.facilityValue}>${(facility.value / 1000).toFixed(1)}K</Text>
                      <Text style={styles.facilityPercent}>{percentage}%</Text>
                    </View>
                  </View>
                  <View style={styles.facilityBarContainer}>
                    <View 
                      style={[
                        styles.facilityBar, 
                        { 
                          width: `${percentage}%`,
                          backgroundColor: facility.lowStock > 0 ? Colors.warning : Colors.success
                        }
                      ]} 
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No facilities configured</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Users size={18} color={Colors.purple} />
              <Text style={styles.sectionTitle}>Workforce</Text>
            </View>
          </View>
          
          <View style={styles.workforceCard}>
            <View style={styles.workforceStats}>
              <View style={styles.workforceStat}>
                <Text style={styles.workforceStatValue}>{stats.totalEmployees}</Text>
                <Text style={styles.workforceStatLabel}>Total</Text>
              </View>
              <View style={styles.workforceDivider} />
              <View style={styles.workforceStat}>
                <Text style={[styles.workforceStatValue, { color: Colors.success }]}>{stats.activeEmployees}</Text>
                <Text style={styles.workforceStatLabel}>Active Today</Text>
              </View>
              <View style={styles.workforceDivider} />
              <View style={styles.workforceStat}>
                <Text style={[styles.workforceStatValue, { color: Colors.warning }]}>
                  {employees.filter(e => e.status === 'on_leave').length}
                </Text>
                <Text style={styles.workforceStatLabel}>On Leave</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showEmergencyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEmergencyModal(false)}
      >
        <View style={styles.emergencyModalOverlay}>
          <View style={styles.emergencyModalContent}>
            <View style={styles.emergencyModalHeader}>
              <Text style={styles.emergencyModalTitle}>Initiate Emergency or Drill</Text>
              <Pressable onPress={() => setShowEmergencyModal(false)} hitSlop={12}>
                <X size={22} color={Colors.text} />
              </Pressable>
            </View>
            <Text style={styles.emergencyModalDesc}>
              Select type — roll call starts immediately. Details can be added after.
            </Text>

            <Text style={styles.emergencyModalSectionLabel}>LIVE EMERGENCY</Text>
            {[
              { type: 'fire', label: 'Fire', Icon: Flame, color: '#EF4444' },
              { type: 'tornado', label: 'Tornado', Icon: Tornado, color: '#7C3AED' },
              { type: 'active_shooter', label: 'Active Shooter', Icon: ShieldAlert, color: '#DC2626' },
            ].map(({ type, label, Icon, color }) => (
              <Pressable
                key={type}
                style={({ pressed }) => [
                  styles.emergencyModalRow,
                  { borderLeftColor: color, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  setShowEmergencyModal(false);
                  router.push({
                    pathname: '/headcount/emergencyprotocol',
                    params: { type, drill: 'false' },
                  });
                }}
              >
                <View style={[styles.emergencyModalIconBox, { backgroundColor: color + '18' }]}>
                  <Icon size={22} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emergencyModalRowTitle}>{label} Emergency</Text>
                  <Text style={styles.emergencyModalRowSub}>Live — starts roll call now</Text>
                </View>
                <ChevronRight size={18} color={Colors.textTertiary} />
              </Pressable>
            ))}

            <Text style={[styles.emergencyModalSectionLabel, { marginTop: 16 }]}>DRILL MODE</Text>
            {[
              { type: 'fire', label: 'Fire Drill', Icon: Flame, color: '#F97316' },
              { type: 'tornado', label: 'Tornado Drill', Icon: Tornado, color: '#7C3AED' },
              { type: 'active_shooter', label: 'Active Shooter Drill', Icon: ShieldAlert, color: '#6B7280' },
            ].map(({ type, label, Icon, color }) => (
              <Pressable
                key={`drill-${type}`}
                style={({ pressed }) => [
                  styles.emergencyModalRow,
                  { borderLeftColor: '#3B82F6', opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowEmergencyModal(false);
                  router.push({
                    pathname: '/headcount/emergencyprotocol',
                    params: { type, drill: 'true' },
                  });
                }}
              >
                <View style={[styles.emergencyModalIconBox, { backgroundColor: '#3B82F618' }]}>
                  <Icon size={22} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emergencyModalRowTitle}>{label}</Text>
                  <Text style={styles.emergencyModalRowSub}>Training exercise — starts roll call</Text>
                </View>
                <ChevronRight size={18} color={Colors.textTertiary} />
              </Pressable>
            ))}

            <Pressable
              style={({ pressed }) => [
                styles.emergencyModalMoreBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                setShowEmergencyModal(false);
                router.push('/safety/emergencyinitiation' as any);
              }}
            >
              <Text style={styles.emergencyModalMoreText}>More Emergency Types & Options →</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Facility Picker Modal */}
      <Modal
        visible={showFacilityPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFacilityPicker(false)}
      >
        <Pressable 
          style={styles.facilityPickerOverlay} 
          onPress={() => setShowFacilityPicker(false)}
        >
          <View style={styles.facilityPickerContent}>
            <View style={styles.facilityPickerHeader}>
              <MapPin size={16} color={Colors.primary} />
              <Text style={styles.facilityPickerTitle}>Select Facility</Text>
            </View>
            {facilityNames.map((name) => {
              const key = name === 'All Facilities' ? 'all' : name;
              const isSelected = selectedFacility === key;
              return (
                <Pressable
                  key={name}
                  style={[styles.facilityPickerItem, isSelected && styles.facilityPickerItemActive]}
                  onPress={() => {
                    setSelectedFacility(key);
                    setShowFacilityPicker(false);
                  }}
                >
                  <Text style={[
                    styles.facilityPickerItemText,
                    isSelected && { color: Colors.primary, fontWeight: '600' }
                  ]}>
                    {name}
                  </Text>
                  {isSelected && <CheckCircle size={16} color={Colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <LowStockAlerts
        visible={showLowStockAlerts}
        onClose={() => setShowLowStockAlerts(false)}
        onMaterialPress={handleMaterialPress}
        onCreatePurchaseRequest={handleCreatePurchaseRequest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  companyName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  kpiLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  kpiSubValue: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  actionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  actionCountText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  actionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  performanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.border,
  },
  performanceValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  performanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '500' as const,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  facilityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  facilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  facilityInfo: {
    flex: 1,
  },
  facilityName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  facilityMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  facilityValueContainer: {
    alignItems: 'flex-end',
  },
  facilityValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.success,
  },
  facilityPercent: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  facilityBarContainer: {
    height: 6,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  facilityBar: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  workforceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workforceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  workforceStat: {
    alignItems: 'center',
  },
  workforceStatValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  workforceStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  workforceDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  bottomPadding: {
    height: 40,
  },
  quickActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 6,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  quickActionStat: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  emergencyIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyTextContainer: {
    flex: 1,
  },
  emergencyButtonTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  emergencyButtonSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  facilityPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  facilityPickerContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 8,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  facilityPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 4,
  },
  facilityPickerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  facilityPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  facilityPickerItemActive: {
    backgroundColor: `${Colors.primary}15`,
  },
  facilityPickerItemText: {
    fontSize: 14,
    color: Colors.text,
  },
  emergencyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  emergencyModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  emergencyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  emergencyModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  emergencyModalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 18,
    lineHeight: 18,
  },
  emergencyModalSectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  emergencyModalRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    gap: 12,
  },
  emergencyModalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  emergencyModalRowTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emergencyModalRowSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  emergencyModalMoreBtn: {
    marginTop: 14,
    alignItems: 'center' as const,
    paddingVertical: 10,
  },
  emergencyModalMoreText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
