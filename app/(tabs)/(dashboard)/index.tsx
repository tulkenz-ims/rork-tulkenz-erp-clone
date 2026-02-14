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
  Package,
  Wrench,
  Users,
  RefreshCw,
  Clock,
  CheckCircle,
  ChevronRight,
  Flame,
  Siren,
  Tornado,
  ShieldAlert,
  X,
  ClipboardList,
  MapPin,
  ChevronDown,
  ShoppingCart,
  DollarSign,
  Droplets,
  Microscope,
  HardHat,
} from 'lucide-react-native';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import EmployeeHome from '@/components/EmployeeHome';
import LowStockAlerts from '@/components/LowStockAlerts';
import UserProfileMenu from '@/components/UserProfileMenu';
import LineStatusWidget from '@/components/LineStatusWidget';
import ComplianceCountdown from '@/components/ComplianceCountdown';
import MetricCardsSection from '@/components/MetricCardsSection';
import ScoreCardSection from '@/components/ScoreCardSection';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import { useWorkOrdersQuery } from '@/hooks/useSupabaseWorkOrders';
import { useEmployees } from '@/hooks/useSupabaseEmployees';
import { useFacilities } from '@/hooks/useSupabaseEmployees';
import { useAllAggregatedApprovals } from '@/hooks/useAggregatedApprovals';
import { usePurchaseRequestsQuery, usePurchaseRequisitionsQuery, useProcurementPurchaseOrdersQuery } from '@/hooks/useSupabaseProcurement';
import { useTaskFeedPostsQuery } from '@/hooks/useTaskFeedTemplates';
import { useBudgetsQuery } from '@/hooks/useSupabaseFinance';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ExecutiveDashboard() {
  const { company, loading: authLoading, isAuthenticated, isEmployee } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const { data: materials = [], isLoading: materialsLoading } = useMaterialsQuery();
  const { data: workOrders = [], isLoading: workOrdersLoading } = useWorkOrdersQuery();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { data: facilities = [] } = useFacilities();
  const { purchaseApprovals, timeApprovals, permitApprovals, isLoading: approvalsLoading } = useAllAggregatedApprovals();
  const { data: purchaseRequests = [] } = usePurchaseRequestsQuery();
  const { data: purchaseRequisitions = [] } = usePurchaseRequisitionsQuery();
  const { data: purchaseOrders = [] } = useProcurementPurchaseOrdersQuery();
  const { data: pendingPosts = [] } = useTaskFeedPostsQuery({ status: 'pending' });
  const { data: inProgressPosts = [] } = useTaskFeedPostsQuery({ status: 'in_progress' });
  const { data: budgets = [] } = useBudgetsQuery();
  const taskFeedPendingCount = pendingPosts.length + inProgressPosts.length;

  // Real-time checked-in count: employees with active time entries (no clock_out)
  const { data: checkedInCount = 0 } = useQuery({
    queryKey: ['dashboard-checked-in-count', company?.id],
    queryFn: async () => {
      if (!company?.id) return 0;
      const { count, error } = await supabase
        .from('time_entries')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', company.id)
        .is('clock_out', null);
      if (error) {
        console.error('[Dashboard] Error fetching checked-in count:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
    staleTime: 15000,
  });

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
      facility_name: m.facility_name || 'Unassigned',
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


  const performanceMetrics = useMemo(() => {
    const stockHealth = stats.totalMaterials > 0 
      ? Math.round((1 - (stats.lowStockCount + stats.outOfStockCount) / stats.totalMaterials) * 100)
      : 100;
    
    const woCompletion = workOrders.length > 0 
      ? Math.round((stats.completedWorkOrders / workOrders.length) * 100)
      : 0;
    
    const laborUtilization = stats.activeEmployees > 0 
      ? Math.round((checkedInCount / stats.activeEmployees) * 100)
      : 0;

    return { stockHealth, woCompletion, laborUtilization };
  }, [stats, workOrders, checkedInCount]);

  const facilityBreakdown = useMemo(() => {
    const facilityMap: Record<string, { value: number; items: number; lowStock: number }> = {};
    
    materialsList.forEach(m => {
      const facility = m.facility_name || 'Unassigned';
      if (!facilityMap[facility]) {
        facilityMap[facility] = { value: 0, items: 0, lowStock: 0 };
      }
      facilityMap[facility].value += m.on_hand * m.unit_price;
      facilityMap[facility].items++;
      if (m.on_hand <= m.min_level) facilityMap[facility].lowStock++;
    });
    
    return Object.entries(facilityMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);
  }, [materialsList]);

  const facilityNames = useMemo(() => {
    const names = facilities.map(f => f.name).sort();
    return ['All Facilities', ...names];
  }, [facilities]);

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
        queryClient.invalidateQueries({ queryKey: ['dashboard-checked-in-count'] }),
        queryClient.invalidateQueries({ queryKey: ['facilities'] }),
      ]);
      console.log('[Dashboard] Refresh completed');
    } catch (error) {
      console.error('[Dashboard] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

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
                style={({ pressed }) => [styles.facilityButton, pressed && styles.pressed]}
                onPress={() => setShowFacilityPicker(true)}
              >
                <MapPin size={16} color="#3B82F6" />
                <Text style={styles.facilityButtonText} numberOfLines={1}>
                  {selectedFacility === 'all' ? 'All Facilities' : selectedFacility.length > 12 ? selectedFacility.slice(0, 11) + '…' : selectedFacility}
                </Text>
                <ChevronDown size={12} color={Colors.textSecondary} />
              </Pressable>
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

        {/* Quick Actions */}
        <Text style={styles.quickActionTitle}>Quick Actions</Text>
        <View style={styles.quickActionBar}>
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
            <Text style={styles.quickActionLabel}>Task Feed</Text>
            <Text style={styles.quickActionDesc}>Pending Items</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/timeclock')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#10B98120' }]}>
              <Users size={18} color="#10B981" />
            </View>
            <Text style={[styles.quickActionStat, { color: checkedInCount > 0 ? '#10B981' : Colors.textTertiary }]}>
              {checkedInCount}/{stats.activeEmployees}
            </Text>
            <Text style={styles.quickActionLabel}>Facility Headcount</Text>
            <Text style={styles.quickActionDesc}>Checked In Now</Text>
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
            <Text style={styles.quickActionDesc}>Initiate Protocol</Text>
          </Pressable>
        </View>

        <ComplianceCountdown />

        <LineStatusWidget />

        {/* ── Procurement Scorecard ── */}
        <ScoreCardSection
          title="Procurement Scorecard"
          subtitle="This month"
          icon={<ShoppingCart size={16} color={Colors.success} />}
          gauges={[
            {
              label: 'Pending Requests',
              value: Math.max(0, 100 - (purchaseRequests.filter(r => r.status === 'pending' || r.status === 'submitted').length * 20)),
              displayValue: `${purchaseRequests.filter(r => r.status === 'pending' || r.status === 'submitted').length}`,
              color: purchaseRequests.filter(r => r.status === 'pending' || r.status === 'submitted').length > 0 ? '#F59E0B' : '#10B981',
            },
            {
              label: 'Pending Approvals',
              value: Math.max(0, 100 - (purchaseOrders.filter(po => po.status === 'pending_approval').length * 25)),
              displayValue: `${purchaseOrders.filter(po => po.status === 'pending_approval').length}`,
              color: purchaseOrders.filter(po => po.status === 'pending_approval').length > 0 ? '#F59E0B' : '#10B981',
            },
            {
              label: 'Pending Reqs',
              value: Math.max(0, 100 - (purchaseRequisitions.filter(r => r.status === 'pending' || r.status === 'pending_approval').length * 20)),
              displayValue: `${purchaseRequisitions.filter(r => r.status === 'pending' || r.status === 'pending_approval').length}`,
              color: purchaseRequisitions.filter(r => r.status === 'pending' || r.status === 'pending_approval').length > 0 ? '#F59E0B' : '#10B981',
            },
            {
              label: 'Pending Receipt',
              value: Math.max(0, 100 - (purchaseOrders.filter(po => po.status === 'approved' || po.status === 'ordered' || po.status === 'shipped').length * 15)),
              displayValue: `${purchaseOrders.filter(po => po.status === 'approved' || po.status === 'ordered' || po.status === 'shipped').length}`,
              color: purchaseOrders.filter(po => po.status === 'approved' || po.status === 'ordered' || po.status === 'shipped').length > 0 ? '#3B82F6' : '#10B981',
            },
            {
              label: 'Active POs',
              value: purchaseOrders.length > 0 ? 65 : 0,
              displayValue: `${purchaseOrders.filter(po => po.status !== 'cancelled' && po.status !== 'closed').length}`,
              color: '#3B82F6',
            },
            {
              label: 'Avg Days',
              value: (() => {
                const completed = purchaseOrders.filter(po => po.status === 'received' && po.created_at);
                if (completed.length === 0) return 100;
                const avgDays = completed.reduce((sum, po) => {
                  const created = new Date(po.created_at);
                  const updated = new Date(po.updated_at || po.created_at);
                  return sum + Math.max(1, Math.round((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
                }, 0) / completed.length;
                return Math.max(0, 100 - (avgDays * 5));
              })(),
              displayValue: (() => {
                const completed = purchaseOrders.filter(po => po.status === 'received' && po.created_at);
                if (completed.length === 0) return 'N/A';
                const avgDays = completed.reduce((sum, po) => {
                  const created = new Date(po.created_at);
                  const updated = new Date(po.updated_at || po.created_at);
                  return sum + Math.max(1, Math.round((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
                }, 0) / completed.length;
                return `${Math.round(avgDays)}d`;
              })(),
              color: '#8B5CF6',
            },
          ]}
        />

        {/* ── Department Budgets ── */}
        {budgets.length > 0 && (
          <MetricCardsSection
            title="Department Budgets"
            subtitle={`FY${budgets[0]?.fiscalYear || new Date().getFullYear()}`}
            icon={<DollarSign size={16} color="#10B981" />}
            compact
            cards={budgets.map(b => {
              const usedPct = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
              return {
                label: b.departmentName || b.departmentCode,
                value: `${usedPct}`,
                unit: '%',
                trend: usedPct > 100 ? -(usedPct - 100) : 0,
                trendLabel: `$${(b.remaining / 1000).toFixed(0)}K`,
                color: usedPct > 100 ? '#EF4444' : usedPct > 80 ? '#F59E0B' : '#10B981',
              };
            })}
          />
        )}

        {/* ── Inventory Scorecard ── */}
        <ScoreCardSection
          title="Inventory Scorecard"
          icon={<Package size={16} color={Colors.info} />}
          gauges={[
            {
              label: 'Stock Health',
              value: performanceMetrics.stockHealth,
              displayValue: `${performanceMetrics.stockHealth}%`,
            },
            {
              label: 'Fill Rate',
              value: stats.totalMaterials > 0
                ? Math.round(((stats.totalMaterials - stats.outOfStockCount) / stats.totalMaterials) * 100)
                : 100,
              displayValue: `${stats.totalMaterials > 0
                ? Math.round(((stats.totalMaterials - stats.outOfStockCount) / stats.totalMaterials) * 100)
                : 100}%`,
            },
            {
              label: 'Low Stock',
              value: Math.max(0, 100 - (stats.lowStockCount / Math.max(stats.totalMaterials, 1)) * 100),
              displayValue: `${stats.lowStockCount}`,
              color: stats.lowStockCount > 0 ? '#F59E0B' : '#10B981',
            },
            {
              label: 'Out of Stock',
              value: Math.max(0, 100 - (stats.outOfStockCount / Math.max(stats.totalMaterials, 1)) * 100),
              displayValue: `${stats.outOfStockCount}`,
              color: stats.outOfStockCount > 0 ? '#EF4444' : '#10B981',
            },
            {
              label: 'Total SKUs',
              value: Math.min(100, stats.totalMaterials * 10),
              displayValue: `${stats.totalMaterials}`,
              color: '#3B82F6',
            },
            {
              label: 'Value',
              value: 75,
              displayValue: `$${(inventoryValue / 1000).toFixed(0)}K`,
              color: '#10B981',
            },
          ]}
        />

        {/* ── CMMS Performance Cards ── */}
        <MetricCardsSection
          title="CMMS Performance"
          subtitle="30-day"
          icon={<Wrench size={16} color={Colors.warning} />}
          compact
          cards={(() => {
            const open = stats.openWorkOrders;
            const planned = workOrders.filter(wo => wo.type === 'preventive' || wo.type === 'pm' || wo.priority === 'low' || wo.priority === 'medium').length;
            const unplanned = workOrders.filter(wo => wo.type === 'reactive' || wo.type === 'emergency' || wo.type === 'corrective' || wo.priority === 'critical' || wo.priority === 'emergency').length;
            const pmWOs = workOrders.filter(wo => wo.type === 'preventive' || wo.type === 'pm');
            const pmCompleted = pmWOs.filter(wo => wo.status === 'completed').length;
            const pmCompliance = pmWOs.length > 0 ? Math.round((pmCompleted / pmWOs.length) * 100) : 100;

            return [
              { label: 'MTTR', value: '0', unit: 'hrs', trend: 0 },
              { label: 'MTBF', value: '0', unit: 'hrs', trend: 0 },
              { label: 'PM Compliance', value: pmCompliance.toString(), unit: '%', trend: 0, color: pmCompliance >= 90 ? '#10B981' : pmCompliance >= 70 ? '#F59E0B' : '#EF4444' },
              { label: 'Backlog', value: open.toString(), unit: 'WOs', trend: 0, color: open > 5 ? '#F59E0B' : '#10B981' },
              { label: 'Planned', value: planned.toString(), unit: 'WOs', trend: 0, color: '#3B82F6' },
              { label: 'Unplanned', value: unplanned.toString(), unit: 'WOs', trend: 0, color: unplanned > 0 ? '#EF4444' : '#10B981' },
            ];
          })()}
        />

        {/* ── Sanitation ── */}
        <MetricCardsSection
          title="Sanitation"
          subtitle="This week"
          icon={<Droplets size={16} color="#06B6D4" />}
          compact
          cards={[
            { label: 'Pre-Op Done', value: '0', unit: '/ 5', trend: 0, color: '#06B6D4' },
            { label: 'CIP Cycles', value: '0', unit: '/ 3', trend: 0, color: '#06B6D4' },
            { label: 'Swab Tests', value: '0', unit: 'pass', trend: 0, color: '#10B981' },
            { label: 'Open CARs', value: '0', trend: 0, color: '#10B981' },
            { label: 'Zone 1 Clean', value: '100', unit: '%', trend: 0, color: '#10B981' },
            { label: 'Overdue Tasks', value: '0', trend: 0, color: '#10B981' },
          ]}
        />

        {/* ── Quality ── */}
        <MetricCardsSection
          title="Quality"
          subtitle="This month"
          icon={<Microscope size={16} color="#8B5CF6" />}
          compact
          cards={[
            { label: 'Hold Lots', value: '0', trend: 0, color: '#10B981' },
            { label: 'Rejections', value: '0', trend: 0, color: '#10B981' },
            { label: 'NCRs Open', value: '0', trend: 0, color: '#10B981' },
            { label: 'CCP Deviations', value: '0', trend: 0, color: '#10B981' },
            { label: 'COA Pending', value: '0', trend: 0, color: '#10B981' },
            { label: 'Spec Compliance', value: '100', unit: '%', trend: 0, color: '#10B981' },
          ]}
        />

        {/* ── Safety ── */}
        <MetricCardsSection
          title="Safety"
          subtitle="YTD"
          icon={<HardHat size={16} color="#F59E0B" />}
          compact
          cards={[
            { label: 'Days No Incident', value: '0', trend: 0, color: '#10B981' },
            { label: 'Near Misses', value: '0', trend: 0, color: '#10B981' },
            { label: 'Open Actions', value: '0', trend: 0, color: '#10B981' },
            { label: 'Training Due', value: '0', trend: 0, color: '#10B981' },
            { label: 'PPE Compliance', value: '100', unit: '%', trend: 0, color: '#10B981' },
            { label: 'Permits Active', value: '0', trend: 0, color: '#3B82F6' },
          ]}
        />

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

const createStyles = (Colors: any) => StyleSheet.create({
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
  facilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  facilityButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    maxWidth: 120,
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
  bottomPadding: {
    height: 40,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    letterSpacing: 0.3,
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
  quickActionDesc: {
    fontSize: 9,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 1,
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
