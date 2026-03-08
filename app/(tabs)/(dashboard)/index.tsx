import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  Dimensions,
  useWindowDimensions,
  Alert,
  Modal,
  Animated,
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
  Droplets,
  Microscope,
  HardHat,
  Zap,
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
import BudgetCardsRow from '@/components/BudgetCardsRow';
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

// ── HUD THEME ──────────────────────────────────────────────────────────────────
const HUD = {
  bg:           '#020912',
  bgCard:       '#050f1e',
  bgCardAlt:    '#071525',
  cyan:         '#00e5ff',
  cyanDim:      '#00e5ff22',
  green:        '#00ff88',
  greenDim:     '#00ff8822',
  amber:        '#ffb800',
  amberDim:     '#ffb80022',
  red:          '#ff2d55',
  redDim:       '#ff2d5522',
  purple:       '#7b61ff',
  purpleDim:    '#7b61ff22',
  text:         '#e0f4ff',
  textSec:      '#7aa8c8',
  textDim:      '#3a6080',
  border:       '#0d2840',
  borderBright: '#1a4060',
};

// ── PULSING DOT ────────────────────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const anim = React.useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      width: 7, height: 7, borderRadius: 4,
      backgroundColor: color, opacity: anim,
      shadowColor: color, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1, shadowRadius: 5,
    }} />
  );
}

// ── QUICK ACTION BUTTON ────────────────────────────────────────────────────────
function QuickBtn({
  icon, stat, label, desc, color, onPress,
}: { icon: React.ReactNode; stat: string; label: string; desc: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}
      style={[qS.btn, { borderColor: color + '40' }]}>
      <View style={[qS.iconBox, { backgroundColor: color + '18' }]}>{icon}</View>
      <Text style={[qS.stat, { color }]}>{stat}</Text>
      <Text style={qS.label}>{label}</Text>
      <Text style={qS.desc}>{desc}</Text>
    </TouchableOpacity>
  );
}
const qS = StyleSheet.create({
  btn:     { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 12, backgroundColor: HUD.bgCard, borderWidth: 1, gap: 4, minHeight: 130 },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stat:    { fontSize: 17, fontWeight: '900', letterSpacing: -0.3, textAlign: 'center' },
  label:   { fontSize: 9,  fontWeight: '800', color: HUD.textSec, textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' },
  desc:    { fontSize: 8,  fontWeight: '600', color: HUD.textDim, textAlign: 'center' },
});

// ── SECTION CARD WRAPPER ───────────────────────────────────────────────────────
function HudCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[hcS.card, style]}>{children}</View>;
}
const hcS = StyleSheet.create({
  card: { backgroundColor: HUD.bgCard, borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, padding: 14, marginBottom: 14 },
});

// ── SECTION HEADER ─────────────────────────────────────────────────────────────
function SectionHead({ icon, title, sub, color = HUD.cyan }: { icon: React.ReactNode; title: string; sub?: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 2, color, flex: 1, textTransform: 'uppercase' }}>{title}</Text>
      {sub ? <Text style={{ fontSize: 9, color: HUD.textDim, fontWeight: '600', letterSpacing: 0.8 }}>{sub}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const { company, loading: authLoading, isAuthenticated, isEmployee } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors: Colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 768;

  // ── ALL ORIGINAL DATA HOOKS — UNCHANGED ──────────────────────────────────
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

  const { data: checkedInCount = 0 } = useQuery({
    queryKey: ['dashboard-checked-in-count', company?.id],
    queryFn: async () => {
      if (!company?.id) return 0;
      const { count, error } = await supabase
        .from('time_entries')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', company.id)
        .is('clock_out', null);
      if (error) { console.error('[Dashboard] Error fetching checked-in count:', error); return 0; }
      return count || 0;
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const erpLoading = materialsLoading || workOrdersLoading || employeesLoading || approvalsLoading;

  const approvals = useMemo(() => {
    return [
      ...purchaseApprovals.map(a => ({ ...a, type: 'purchase' as const, status: a.status === 'pending' || a.status === 'in_progress' ? 'pending' as const : a.status as 'approved' | 'rejected', amount: a.amount || 0 })),
      ...timeApprovals.map(a => ({ ...a, type: a.type as 'time_off' | 'overtime' | 'schedule_change', status: a.status === 'pending' || a.status === 'in_progress' ? 'pending' as const : a.status as 'approved' | 'rejected' })),
      ...permitApprovals.map(a => ({ ...a, type: 'permit' as const, status: a.status === 'pending' || a.status === 'in_progress' ? 'pending' as const : a.status as 'approved' | 'rejected' })),
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
    return { totalMaterials, lowStockCount, outOfStockCount, openWorkOrders, inProgressWorkOrders, completedWorkOrders, overdueWorkOrders, totalEmployees, activeEmployees };
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
    router.push({ pathname: '/inventory/itemrecords', params: { materialId, fromAlert: 'true' } });
  }, [router]);

  const materialsList = useMemo(() => materials.map(m => ({ ...m, facility_name: m.facility_name || 'Unassigned', vendor: m.vendor || 'Unknown Vendor' })), [materials]);

  const handleCreatePurchaseRequest = useCallback((materialId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const material = materialsList.find(m => m.id === materialId);
    if (!material) { Alert.alert('Error', 'Material not found'); return; }
    const suggestedQty = Math.max(material.max_level - material.on_hand, material.min_level * 2);
    setShowLowStockAlerts(false);
    router.push({ pathname: '/procurement/requisitions', params: { createPR: 'true', materialId, materialName: material.name, materialSku: material.sku, suggestedQty: suggestedQty.toString(), vendor: material.vendor || 'Unknown Vendor', unitPrice: material.unit_price.toString() } });
  }, [materialsList, router]);

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(t); }, []);

  const inventoryValue = useMemo(() => materialsList.reduce((sum, m) => sum + (m.on_hand * m.unit_price), 0), [materialsList]);

  const performanceMetrics = useMemo(() => {
    const stockHealth = stats.totalMaterials > 0 ? Math.round((1 - (stats.lowStockCount + stats.outOfStockCount) / stats.totalMaterials) * 100) : 100;
    const woCompletion = workOrders.length > 0 ? Math.round((stats.completedWorkOrders / workOrders.length) * 100) : 0;
    const laborUtilization = stats.activeEmployees > 0 ? Math.round((checkedInCount / stats.activeEmployees) * 100) : 0;
    return { stockHealth, woCompletion, laborUtilization };
  }, [stats, workOrders, checkedInCount]);

  const facilityBreakdown = useMemo(() => {
    const facilityMap: Record<string, { value: number; items: number; lowStock: number }> = {};
    materialsList.forEach(m => {
      const facility = m.facility_name || 'Unassigned';
      if (!facilityMap[facility]) facilityMap[facility] = { value: 0, items: 0, lowStock: 0 };
      facilityMap[facility].value += m.on_hand * m.unit_price;
      facilityMap[facility].items++;
      if (m.on_hand <= m.min_level) facilityMap[facility].lowStock++;
    });
    return Object.entries(facilityMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.value - a.value);
  }, [materialsList]);

  const facilityNames = useMemo(() => ['All Facilities', ...facilities.map(f => f.name).sort()], [facilities]);

  useEffect(() => {
    console.log('Auth state:', { authLoading, isAuthenticated });
    if (!authLoading && !isAuthenticated) { console.log('Not authenticated, redirecting to login'); router.replace('/login'); }
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
    } catch (error) { console.error('[Dashboard] Refresh error:', error); }
    finally { setRefreshing(false); }
  }, [queryClient]);

  // ── LOADING / AUTH GUARDS ────────────────────────────────────────────────
  if (authLoading || erpLoading) {
    return (
      <SafeAreaView style={S.loadingContainer}>
        <ActivityIndicator size="large" color={HUD.cyan} />
        <Text style={S.loadingText}>{authLoading ? 'AUTHENTICATING...' : 'LOADING SYSTEMS...'}</Text>
      </SafeAreaView>
    );
  }
  if (!isAuthenticated) return null;
  if (isEmployee) return <EmployeeHome />;

  // Derived status
  const alertCount = stats.lowStockCount + stats.outOfStockCount + stats.overdueWorkOrders;
  const overallStatus = alertCount === 0 ? HUD.green : alertCount <= 3 ? HUD.amber : HUD.red;

  // Shared scorecard gauge builder helpers (kept identical to original)
  const pendingRequestsCount = purchaseRequests.filter(r => r.status === 'pending' || r.status === 'submitted').length;
  const pendingApprovalsCount = purchaseOrders.filter(po => po.status === 'pending_approval').length;
  const pendingReqsCount = purchaseRequisitions.filter(r => r.status === 'pending' || r.status === 'pending_approval').length;
  const pendingReceiptCount = purchaseOrders.filter(po => po.status === 'approved' || po.status === 'ordered' || po.status === 'shipped').length;
  const activePOsCount = purchaseOrders.filter(po => po.status !== 'cancelled' && po.status !== 'closed').length;

  return (
    <View style={S.container}>
      <ScrollView
        style={S.scrollView}
        contentContainerStyle={S.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <View style={S.header}>
          <View style={S.headerTop}>
            <View style={S.headerLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <PulsingDot color={overallStatus} />
                <Text style={S.eyebrow}>EXECUTIVE OVERVIEW</Text>
              </View>
              <Text style={S.companyName}>{company?.name || 'TulKenz OPS'}</Text>
            </View>
            <View style={S.headerActions}>
              <TouchableOpacity activeOpacity={0.7} style={S.facilityButton} onPress={() => setShowFacilityPicker(true)}>
                <MapPin size={13} color={HUD.cyan} />
                <Text style={S.facilityButtonText} numberOfLines={1}>
                  {selectedFacility === 'all' ? 'ALL FACILITIES' : selectedFacility.toUpperCase().slice(0, 12)}
                </Text>
                <ChevronDown size={11} color={HUD.textDim} />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} style={S.iconBtn} onPress={onRefresh}>
                <RefreshCw size={16} color={HUD.textSec} />
              </TouchableOpacity>
              <UserProfileMenu />
            </View>
          </View>

          <View style={S.dateRow}>
            <Clock size={11} color={HUD.textDim} />
            <Text style={S.dateText}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>

          {/* Status strip */}
          <View style={S.statusStrip}>
            {[
              { label: 'INVENTORY',   value: `${stats.totalMaterials} SKUs`, color: stats.lowStockCount > 0 ? HUD.amber : HUD.green },
              { label: 'LOW STOCK',   value: `${stats.lowStockCount}`,        color: stats.lowStockCount > 0 ? HUD.amber : HUD.green },
              { label: 'OUT OF STOCK',value: `${stats.outOfStockCount}`,       color: stats.outOfStockCount > 0 ? HUD.red : HUD.green },
              { label: 'OPEN WOs',    value: `${stats.openWorkOrders}`,        color: stats.overdueWorkOrders > 0 ? HUD.amber : HUD.green },
              { label: 'OVERDUE',     value: `${stats.overdueWorkOrders}`,     color: stats.overdueWorkOrders > 0 ? HUD.red : HUD.green },
              { label: 'CHECKED IN',  value: `${checkedInCount}/${stats.activeEmployees}`, color: checkedInCount > 0 ? HUD.cyan : HUD.textDim },
              { label: 'TASK FEED',   value: `${taskFeedPendingCount}`,        color: taskFeedPendingCount > 0 ? HUD.amber : HUD.green },
            ].map((item, i, arr) => (
              <View key={item.label} style={[S.statusItem, i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: HUD.border }]}>
                <Text style={[S.statusValue, { color: item.color }]}>{item.value}</Text>
                <Text style={S.statusLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── ROW 1: QUICK ACTIONS + COMPLIANCE ─────────────────────────── */}
        <View style={isWide ? S.wideRow : undefined}>
          <View style={isWide ? S.wideHalf : undefined}>
            <HudCard>
              <SectionHead icon={<Zap size={13} color={HUD.amber} />} title="Quick Actions" color={HUD.amber} />
              <View style={S.quickActionBar}>
                <QuickBtn
                  icon={<ClipboardList size={16} color={taskFeedPendingCount > 0 ? HUD.amber : HUD.green} />}
                  stat={taskFeedPendingCount.toString()}
                  label="Task Feed"
                  desc="Pending items"
                  color={taskFeedPendingCount > 0 ? HUD.amber : HUD.green}
                  onPress={() => router.push('/taskfeed')}
                />
                <QuickBtn
                  icon={<Users size={16} color={HUD.cyan} />}
                  stat={`${checkedInCount}/${stats.activeEmployees}`}
                  label="Headcount"
                  desc="Checked in now"
                  color={HUD.cyan}
                  onPress={() => router.push('/timeclock')}
                />
                <QuickBtn
                  icon={<Siren size={16} color={HUD.red} />}
                  stat="SOS"
                  label="Emergency"
                  desc="Initiate protocol"
                  color={HUD.red}
                  onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setShowEmergencyModal(true); }}
                />
              </View>
            </HudCard>
          </View>
          <View style={isWide ? S.wideHalf : undefined}>
            <HudCard>
              <SectionHead icon={<Package size={13} color={HUD.amber} />} title="Compliance" color={HUD.amber} />
              <ComplianceCountdown />
            </HudCard>
          </View>
        </View>

        {/* ── LINE STATUS ────────────────────────────────────────────────── */}
        <HudCard>
          <SectionHead icon={<Zap size={13} color={HUD.green} />} title="Line Status" sub="LIVE" color={HUD.green} />
          <LineStatusWidget />
        </HudCard>

        {/* ── PROCUREMENT + INVENTORY SCORECARDS ─────────────────────────── */}
        <View style={isWide ? S.wideRow : undefined}>
          <View style={isWide ? S.wideHalf : undefined}>
            <HudCard>
              <SectionHead icon={<ShoppingCart size={13} color={HUD.green} />} title="Procurement Scorecard" sub="THIS MONTH" color={HUD.green} />
              <ScoreCardSection
                title="" subtitle="" icon={null}
                cardStyle={{ minHeight: 150 }}
                gauges={[
                  { label: 'Pending Requests',  value: Math.max(0, 100 - (pendingRequestsCount * 20)),  displayValue: `${pendingRequestsCount}`,  color: pendingRequestsCount > 0  ? HUD.amber : HUD.green },
                  { label: 'Pending Approvals', value: Math.max(0, 100 - (pendingApprovalsCount * 25)), displayValue: `${pendingApprovalsCount}`, color: pendingApprovalsCount > 0 ? HUD.amber : HUD.green },
                  { label: 'Pending Reqs',      value: Math.max(0, 100 - (pendingReqsCount * 20)),      displayValue: `${pendingReqsCount}`,      color: pendingReqsCount > 0      ? HUD.amber : HUD.green },
                  { label: 'Pending Receipt',   value: Math.max(0, 100 - (pendingReceiptCount * 15)),   displayValue: `${pendingReceiptCount}`,   color: pendingReceiptCount > 0   ? HUD.cyan  : HUD.green },
                  { label: 'Active POs',        value: purchaseOrders.length > 0 ? 65 : 0,             displayValue: `${activePOsCount}`,        color: HUD.cyan },
                  {
                    label: 'Avg Days',
                    value: (() => { const c = purchaseOrders.filter(po => po.status === 'received' && po.created_at); if (!c.length) return 100; const avg = c.reduce((s, po) => s + Math.max(1, Math.round((new Date(po.updated_at || po.created_at).getTime() - new Date(po.created_at).getTime()) / 86400000)), 0) / c.length; return Math.max(0, 100 - avg * 5); })(),
                    displayValue: (() => { const c = purchaseOrders.filter(po => po.status === 'received' && po.created_at); if (!c.length) return 'N/A'; const avg = c.reduce((s, po) => s + Math.max(1, Math.round((new Date(po.updated_at || po.created_at).getTime() - new Date(po.created_at).getTime()) / 86400000)), 0) / c.length; return `${Math.round(avg)}d`; })(),
                    color: HUD.purple,
                  },
                ]}
              />
            </HudCard>
          </View>
          <View style={isWide ? S.wideHalf : undefined}>
            <HudCard>
              <SectionHead icon={<Package size={13} color={HUD.cyan} />} title="Inventory Scorecard" color={HUD.cyan} />
              <ScoreCardSection
                title="" subtitle="" icon={null}
                cardStyle={{ minHeight: 150 }}
                gauges={[
                  { label: 'Stock Health',  value: performanceMetrics.stockHealth, displayValue: `${performanceMetrics.stockHealth}%` },
                  { label: 'Fill Rate',     value: stats.totalMaterials > 0 ? Math.round(((stats.totalMaterials - stats.outOfStockCount) / stats.totalMaterials) * 100) : 100, displayValue: `${stats.totalMaterials > 0 ? Math.round(((stats.totalMaterials - stats.outOfStockCount) / stats.totalMaterials) * 100) : 100}%` },
                  { label: 'Low Stock',     value: Math.max(0, 100 - (stats.lowStockCount / Math.max(stats.totalMaterials, 1)) * 100), displayValue: `${stats.lowStockCount}`,     color: stats.lowStockCount  > 0 ? HUD.amber : HUD.green },
                  { label: 'Out of Stock',  value: Math.max(0, 100 - (stats.outOfStockCount / Math.max(stats.totalMaterials, 1)) * 100), displayValue: `${stats.outOfStockCount}`, color: stats.outOfStockCount > 0 ? HUD.red   : HUD.green },
                  { label: 'Total SKUs',    value: Math.min(100, stats.totalMaterials * 10), displayValue: `${stats.totalMaterials}`, color: HUD.cyan },
                  { label: 'Value',         value: 75, displayValue: `$${(inventoryValue / 1000).toFixed(0)}K`, color: HUD.green },
                ]}
              />
            </HudCard>
          </View>
        </View>

        {/* ── DEPARTMENT BUDGETS ──────────────────────────────────────────── */}
        {budgets.length > 0 && (
          <HudCard>
            <SectionHead icon={<Package size={13} color={HUD.purple} />} title="Department Budgets" color={HUD.purple} />
            <BudgetCardsRow budgets={budgets} />
          </HudCard>
        )}

        {/* ── CMMS PERFORMANCE ───────────────────────────────────────────── */}
        <HudCard>
          <SectionHead icon={<Wrench size={13} color={HUD.amber} />} title="CMMS Performance" sub="30-DAY" color={HUD.amber} />
          <MetricCardsSection
            title="" subtitle="" icon={null}
            cards={(() => {
              const open = stats.openWorkOrders;
              const inProg = stats.inProgressWorkOrders;
              const completed = stats.completedWorkOrders;
              const planned = workOrders.filter(wo => wo.type === 'preventive' || wo.type === 'pm' || wo.priority === 'low' || wo.priority === 'medium').length;
              const unplanned = workOrders.filter(wo => wo.type === 'reactive' || wo.type === 'emergency' || wo.type === 'corrective' || wo.priority === 'critical' || wo.priority === 'emergency').length;
              const pmWOs = workOrders.filter(wo => wo.type === 'preventive' || wo.type === 'pm');
              const pmCompleted = pmWOs.filter(wo => wo.status === 'completed').length;
              const pmCompliance = pmWOs.length > 0 ? Math.round((pmCompleted / pmWOs.length) * 100) : 100;
              return [
                { label: 'MTTR',          value: '0', unit: 'hrs', trend: 0, trendLabel: 'Avg Repair' },
                { label: 'MTBF',          value: '0', unit: 'hrs', trend: 0, trendLabel: 'Avg Between' },
                { label: 'PM Compliance', value: pmCompliance.toString(), unit: '%', trend: 0, trendLabel: `${pmCompleted}/${pmWOs.length} PMs`, color: pmCompliance >= 90 ? HUD.green : pmCompliance >= 70 ? HUD.amber : HUD.red },
                { label: 'Backlog',       value: open.toString(), unit: 'WOs', trend: 0, trendLabel: `${stats.overdueWorkOrders} overdue`, color: open > 5 ? HUD.amber : HUD.green },
                { label: 'In Progress',   value: inProg.toString(), unit: 'WOs', trend: 0, trendLabel: 'Active now', color: HUD.cyan },
                { label: 'Completed',     value: completed.toString(), unit: 'WOs', trend: 0, trendLabel: 'This period', color: HUD.green },
                { label: 'Planned',       value: planned.toString(), unit: 'WOs', trend: 0, trendLabel: 'Scheduled', color: HUD.cyan },
                { label: 'Unplanned',     value: unplanned.toString(), unit: 'WOs', trend: 0, trendLabel: 'Reactive', color: unplanned > 0 ? HUD.red : HUD.green },
              ];
            })()}
          />
        </HudCard>

        {/* ── SANITATION ─────────────────────────────────────────────────── */}
        <HudCard>
          <SectionHead icon={<Droplets size={13} color={HUD.cyan} />} title="Sanitation" sub="THIS WEEK" color={HUD.cyan} />
          <MetricCardsSection title="" subtitle="" icon={null} cards={[
            { label: 'Pre-Op Inspections', value: '0', unit: '/ 5',  trend: 0, trendLabel: 'Completed',          color: HUD.cyan },
            { label: 'CIP Cycles',         value: '0', unit: '/ 3',  trend: 0, trendLabel: 'Completed',          color: HUD.cyan },
            { label: 'Swab Tests',         value: '0', unit: 'pass', trend: 0, trendLabel: 'All passed',         color: HUD.green },
            { label: 'Open CARs',          value: '0',               trend: 0, trendLabel: 'Corrective actions', color: HUD.green },
            { label: 'Zone 1 Clean',       value: '100', unit: '%',  trend: 0, trendLabel: 'Product contact',    color: HUD.green },
            { label: 'Zone 2 Clean',       value: '100', unit: '%',  trend: 0, trendLabel: 'Non-contact',        color: HUD.green },
            { label: 'Chemical Logs',      value: '0', unit: '/ 5',  trend: 0, trendLabel: 'Verified',           color: HUD.cyan },
            { label: 'Overdue Tasks',      value: '0',               trend: 0, trendLabel: 'Past due',           color: HUD.green },
          ]} />
        </HudCard>

        {/* ── QUALITY ────────────────────────────────────────────────────── */}
        <HudCard>
          <SectionHead icon={<Microscope size={13} color={HUD.purple} />} title="Quality" sub="THIS MONTH" color={HUD.purple} />
          <MetricCardsSection title="" subtitle="" icon={null} cards={[
            { label: 'Hold Lots',           value: '0',         trend: 0, trendLabel: 'On hold',            color: HUD.green },
            { label: 'Rejections',          value: '0',         trend: 0, trendLabel: 'This period',        color: HUD.green },
            { label: 'NCRs Open',           value: '0',         trend: 0, trendLabel: 'Non-conformance',    color: HUD.green },
            { label: 'CCP Deviations',      value: '0',         trend: 0, trendLabel: 'Critical control',   color: HUD.green },
            { label: 'COA Pending',         value: '0',         trend: 0, trendLabel: 'Certificates',       color: HUD.green },
            { label: 'Spec Compliance',     value: '100', unit: '%', trend: 0, trendLabel: 'In spec',        color: HUD.green },
            { label: 'Foreign Material',    value: '0',         trend: 0, trendLabel: 'Incidents',          color: HUD.green },
            { label: 'Customer Complaints', value: '0',         trend: 0, trendLabel: 'Open items',         color: HUD.green },
          ]} />
        </HudCard>

        {/* ── SAFETY ─────────────────────────────────────────────────────── */}
        <HudCard>
          <SectionHead icon={<HardHat size={13} color={HUD.amber} />} title="Safety" sub="YTD" color={HUD.amber} />
          <MetricCardsSection title="" subtitle="" icon={null} cards={[
            { label: 'Days No Incident',  value: '0',          trend: 0, trendLabel: 'Recordable',          color: HUD.green },
            { label: 'Near Misses',       value: '0',          trend: 0, trendLabel: 'Reported',            color: HUD.green },
            { label: 'Open Actions',      value: '0',          trend: 0, trendLabel: 'Corrective',          color: HUD.green },
            { label: 'Training Due',      value: '0',          trend: 0, trendLabel: 'Employees',           color: HUD.green },
            { label: 'PPE Compliance',    value: '100', unit: '%', trend: 0, trendLabel: 'Audited',          color: HUD.green },
            { label: 'Permits Active',    value: '0',          trend: 0, trendLabel: 'Hot work / confined',  color: HUD.cyan },
            { label: 'OSHA Recordable',   value: '0',          trend: 0, trendLabel: 'YTD injuries',        color: HUD.green },
            { label: 'JSA Reviews',       value: '0',          trend: 0, trendLabel: 'Job safety analysis', color: HUD.green },
          ]} />
        </HudCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── EMERGENCY MODAL ─────────────────────────────────────────────── */}
      <Modal visible={showEmergencyModal} animationType="slide" transparent onRequestClose={() => setShowEmergencyModal(false)}>
        <View style={M.overlay}>
          <View style={M.sheet}>
            <View style={M.sheetHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Siren size={16} color={HUD.red} />
                <Text style={M.sheetTitle}>EMERGENCY PROTOCOL</Text>
              </View>
              <Pressable onPress={() => setShowEmergencyModal(false)} hitSlop={12}>
                <X size={20} color={HUD.textSec} />
              </Pressable>
            </View>
            <Text style={M.sheetDesc}>Select type — roll call starts immediately. Details can be added after.</Text>

            <Text style={M.sectionLbl}>LIVE EMERGENCY</Text>
            {[
              { type: 'fire',          label: 'Fire',          Icon: Flame,       color: HUD.red },
              { type: 'tornado',       label: 'Tornado',       Icon: Tornado,     color: HUD.purple },
              { type: 'active_shooter',label: 'Active Shooter',Icon: ShieldAlert, color: HUD.red },
            ].map(({ type, label, Icon, color }) => (
              <TouchableOpacity key={type} activeOpacity={0.8}
                style={[M.row, { borderLeftColor: color }]}
                onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setShowEmergencyModal(false); router.push({ pathname: '/headcount/emergencyprotocol', params: { type, drill: 'false' } }); }}>
                <View style={[M.rowIcon, { backgroundColor: color + '20' }]}><Icon size={20} color={color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={M.rowTitle}>{label} Emergency</Text>
                  <Text style={M.rowSub}>Live — starts roll call now</Text>
                </View>
                <ChevronRight size={16} color={HUD.textDim} />
              </TouchableOpacity>
            ))}

            <Text style={[M.sectionLbl, { marginTop: 14 }]}>DRILL MODE</Text>
            {[
              { type: 'fire',          label: 'Fire Drill',          Icon: Flame,       color: HUD.amber },
              { type: 'tornado',       label: 'Tornado Drill',       Icon: Tornado,     color: HUD.purple },
              { type: 'active_shooter',label: 'Active Shooter Drill',Icon: ShieldAlert, color: HUD.textSec },
            ].map(({ type, label, Icon, color }) => (
              <TouchableOpacity key={`drill-${type}`} activeOpacity={0.8}
                style={[M.row, { borderLeftColor: HUD.cyan }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowEmergencyModal(false); router.push({ pathname: '/headcount/emergencyprotocol', params: { type, drill: 'true' } }); }}>
                <View style={[M.rowIcon, { backgroundColor: HUD.cyan + '15' }]}><Icon size={20} color={HUD.cyan} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={M.rowTitle}>{label}</Text>
                  <Text style={M.rowSub}>Training exercise — starts roll call</Text>
                </View>
                <ChevronRight size={16} color={HUD.textDim} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity activeOpacity={0.7} style={M.moreBtn}
              onPress={() => { setShowEmergencyModal(false); router.push('/safety/emergencyinitiation' as any); }}>
              <Text style={M.moreTxt}>More Emergency Types & Options →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── FACILITY PICKER ─────────────────────────────────────────────── */}
      <Modal visible={showFacilityPicker} transparent animationType="fade" onRequestClose={() => setShowFacilityPicker(false)}>
        <Pressable style={M.fpOverlay} onPress={() => setShowFacilityPicker(false)}>
          <View style={M.fpCard}>
            <View style={M.fpHead}>
              <MapPin size={13} color={HUD.cyan} />
              <Text style={M.fpTitle}>SELECT FACILITY</Text>
            </View>
            {facilityNames.map(name => {
              const key = name === 'All Facilities' ? 'all' : name;
              const active = selectedFacility === key;
              return (
                <Pressable key={name} style={[M.fpItem, active && { backgroundColor: HUD.cyan + '15' }]}
                  onPress={() => { setSelectedFacility(key); setShowFacilityPicker(false); }}>
                  <Text style={[M.fpItemTxt, active && { color: HUD.cyan, fontWeight: '700' }]}>{name}</Text>
                  {active && <CheckCircle size={14} color={HUD.cyan} />}
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

// ── MAIN STYLES ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container:        { flex: 1, backgroundColor: HUD.bg },
  loadingContainer: { flex: 1, backgroundColor: HUD.bg, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText:      { color: HUD.cyan, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  scrollView:       { flex: 1 },
  scrollContent:    { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 40 },

  // Header
  header:           { marginBottom: 14 },
  headerTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  headerLeft:       { flex: 1 },
  eyebrow:          { fontSize: 10, fontWeight: '800', color: HUD.textDim, letterSpacing: 2 },
  companyName:      { fontSize: 26, fontWeight: '900', color: HUD.text, letterSpacing: -0.5 },
  headerActions:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  facilityButton:   { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 10, borderRadius: 10, backgroundColor: HUD.bgCard, borderWidth: 1, borderColor: HUD.borderBright, gap: 5 },
  facilityButtonText: { fontSize: 9, fontWeight: '800', color: HUD.cyan, letterSpacing: 0.8, maxWidth: 100 },
  iconBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: HUD.bgCard, borderWidth: 1, borderColor: HUD.borderBright, alignItems: 'center', justifyContent: 'center' },
  dateRow:          { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  dateText:         { fontSize: 11, color: HUD.textDim, fontWeight: '600', letterSpacing: 0.3 },

  // Status strip
  statusStrip:  { flexDirection: 'row', backgroundColor: HUD.bgCard, borderRadius: 12, borderWidth: 1, borderColor: HUD.borderBright, padding: 10 },
  statusItem:   { flex: 1, alignItems: 'center', gap: 3 },
  statusValue:  { fontSize: 12, fontWeight: '900', letterSpacing: -0.3 },
  statusLabel:  { fontSize: 6, fontWeight: '800', color: HUD.textDim, letterSpacing: 0.6, textAlign: 'center', textTransform: 'uppercase' },

  // Layout
  wideRow:      { flexDirection: 'row', gap: 12 },
  wideHalf:     { flex: 1 },
  quickActionBar: { flexDirection: 'row', gap: 8 },
});

// ── MODAL STYLES ───────────────────────────────────────────────────────────────
const M = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: HUD.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: HUD.borderBright, padding: 20, paddingBottom: 36, maxHeight: '85%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sheetTitle:{ fontSize: 13, fontWeight: '900', color: HUD.text, letterSpacing: 2 },
  sheetDesc: { fontSize: 12, color: HUD.textSec, marginBottom: 16, lineHeight: 17 },
  sectionLbl:{ fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },
  row:       { flexDirection: 'row', alignItems: 'center', backgroundColor: HUD.bg, borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderWidth: 1, borderColor: HUD.border, gap: 12 },
  rowIcon:   { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle:  { fontSize: 14, fontWeight: '700', color: HUD.text, marginBottom: 2 },
  rowSub:    { fontSize: 11, color: HUD.textSec },
  moreBtn:   { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
  moreTxt:   { fontSize: 13, fontWeight: '700', color: HUD.cyan },

  fpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  fpCard:    { backgroundColor: HUD.bgCard, borderRadius: 16, padding: 8, width: '100%', maxWidth: 320, borderWidth: 1, borderColor: HUD.borderBright },
  fpHead:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: HUD.border, marginBottom: 4 },
  fpTitle:   { fontSize: 10, fontWeight: '900', color: HUD.cyan, letterSpacing: 2 },
  fpItem:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  fpItemTxt: { fontSize: 13, color: HUD.text },
});
