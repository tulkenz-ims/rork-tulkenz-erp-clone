import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator,
  Pressable, TouchableOpacity, useWindowDimensions,
  Alert, Modal, Animated, Platform, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Package, Wrench, Users, RefreshCw, Clock, CheckCircle,
  ChevronRight, Flame, Siren, Tornado, ShieldAlert, X,
  ClipboardList, MapPin, ChevronDown, ShoppingCart,
  Droplets, Microscope, HardHat, Zap,
} from 'lucide-react-native';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeStyle } from '@/hooks/useThemeStyle';
import { ThemedCard, ThemedHeader, ThemedSectionLabel, ThemedBadge, ThemedDivider, ThemedMetric } from '@/components/Themed';
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
import { useEmployees, useFacilities } from '@/hooks/useSupabaseEmployees';
import { useAllAggregatedApprovals } from '@/hooks/useAggregatedApprovals';
import { usePurchaseRequestsQuery, usePurchaseRequisitionsQuery, useProcurementPurchaseOrdersQuery } from '@/hooks/useSupabaseProcurement';
import { useTaskFeedPostsQuery } from '@/hooks/useTaskFeedTemplates';
import { useBudgetsQuery } from '@/hooks/useSupabaseFinance';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// ── Corner brackets (HUD only) ─────────────────────────────────
function Brackets({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: color }} />
      <View style={{ position: 'absolute', top: 0, right: 0, width: size, height: size, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: color }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, width: size, height: size, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: color }} />
      <View style={{ position: 'absolute', bottom: 0, right: 0, width: size, height: size, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: color }} />
    </>
  );
}

// ── Pulsing dot ────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, opacity: anim }} />;
}

// ── Adaptive card — HUD brackets on HUD, rounded shadow on light ─
function DashCard({ children, style, accentColor, title, titleColor, sub }: {
  children: React.ReactNode; style?: any;
  accentColor?: string; title?: string; titleColor?: string; sub?: string;
}) {
  const { colors } = useTheme();
  const ts = useThemeStyle();
  const ac = accentColor || colors.hudPrimary;
  const tc = titleColor || colors.hudPrimary;

  return (
    <View style={[
      ts.card.surface,
      { marginBottom: 10, position: 'relative', overflow: 'hidden' },
      style,
    ]}>
      {/* HUD corner brackets */}
      {ts.isHUD && <Brackets color={ac} size={10} />}

      {/* Classic top rule */}
      {ts.isClassic && <View style={{ height: 3, backgroundColor: ac, opacity: 0.7 }} />}

      {/* Ghost Protocol left border accent */}
      {ts.isGhost && title && (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: ac }} />
      )}

      {/* Card header */}
      {title && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8,
          borderBottomWidth: 1, borderBottomColor: colors.border,
          paddingLeft: ts.isGhost ? 18 : 12,
        }}>
          {ts.isHUD && <View style={{ width: 2, height: 12, backgroundColor: tc }} />}
          {ts.isClean && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tc }} />}
          <Text style={[ts.label.section, { color: tc, flex: 1 }]}>
            {ts.isHUD ? title.toUpperCase() : title}
          </Text>
          {sub && <Text style={[ts.label.hint, { letterSpacing: ts.isHUD ? 1.5 : 0.5 }]}>
            {ts.isHUD ? sub : sub.toLowerCase()}
          </Text>}
        </View>
      )}

      <View style={{ padding: 12 }}>
        {children}
      </View>
    </View>
  );
}

// ── Quick action button ────────────────────────────────────────
function QuickBtn({ icon, stat, label, desc, color, onPress }: {
  icon: React.ReactNode; stat: string; label: string; desc: string; color: string; onPress: () => void;
}) {
  const { colors } = useTheme();
  const ts = useThemeStyle();
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4,
        backgroundColor: ts.isHUD ? colors.hudSurface : colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: ts.isHUD ? color + '45' : colors.border,
        borderRadius: ts.radius.md,
        gap: 5, minHeight: 115, position: 'relative',
      }}
    >
      {ts.isHUD && <Brackets color={color + '60'} size={7} />}
      {ts.isClean && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: color, borderTopLeftRadius: ts.radius.md, borderTopRightRadius: ts.radius.md }} />}
      <View style={{ width: 30, height: 30, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', borderRadius: ts.radius.sm }}>
        {icon}
      </View>
      <Text style={{ fontSize: 18, fontWeight: '900', color, fontFamily: ts.isHUD ? MONO : ts.font.primary, letterSpacing: ts.isHUD ? -0.5 : 0 }}>{stat}</Text>
      <Text style={[ts.label.section, { color, textAlign: 'center' }]}>{label}</Text>
      <Text style={[ts.label.hint, { textAlign: 'center', letterSpacing: 0.5 }]}>{desc}</Text>
    </TouchableOpacity>
  );
}

// ── Status item ────────────────────────────────────────────────
function StatusItem({ label, value, color, last }: { label: string; value: string; color: string; last?: boolean }) {
  const { colors } = useTheme();
  const ts = useThemeStyle();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 3, borderRightWidth: last ? 0 : 1, borderRightColor: colors.border }}>
      <Text style={{ fontSize: 12, fontWeight: '900', color, fontFamily: ts.isHUD ? MONO : ts.font.primary }}>{value}</Text>
      <Text style={[ts.label.hint, { fontSize: 6, letterSpacing: ts.isHUD ? 1 : 0.5, textAlign: 'center' }]}>
        {ts.isHUD ? label.toUpperCase() : label}
      </Text>
    </View>
  );
}

// ── Radar eye (HUD only) ───────────────────────────────────────
function RadarEye({ overallStatus, alertCount, checkedIn, total, primary, secondary }: {
  overallStatus: string; alertCount: number; checkedIn: number;
  total: number; primary: string; secondary: string;
}) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(ring1, { toValue: 1, duration: 8000, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring2, { toValue: 1, duration: 5000, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring3, { toValue: 1, duration: 12000, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, []);

  const rot1 = ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rot2 = ring2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const rot3 = ring3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const SIZE = 180;

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', position: 'relative' }}>
      <Animated.View style={{ position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 1, borderColor: primary + '25', borderStyle: 'dashed', transform: [{ rotate: rot1 }] }} />
      <Animated.View style={{ position: 'absolute', width: SIZE * 0.75, height: SIZE * 0.75, borderRadius: SIZE * 0.75 / 2, borderWidth: 1, borderColor: primary + '35', transform: [{ rotate: rot2 }] }} />
      <Animated.View style={{ position: 'absolute', width: SIZE * 0.75, height: SIZE * 0.75, borderRadius: SIZE * 0.75 / 2, borderWidth: 2, borderColor: 'transparent', borderTopColor: primary, borderRightColor: primary + '40', transform: [{ rotate: rot2 }] }} />
      <Animated.View style={{ position: 'absolute', width: SIZE * 0.52, height: SIZE * 0.52, borderRadius: SIZE * 0.52 / 2, borderWidth: 1, borderColor: secondary + '45', transform: [{ rotate: rot3 }] }} />
      <Animated.View style={{ position: 'absolute', width: SIZE * 0.52, height: SIZE * 0.52, borderRadius: SIZE * 0.52 / 2, borderWidth: 1.5, borderColor: 'transparent', borderBottomColor: secondary, borderLeftColor: secondary + '40', transform: [{ rotate: rot3 }] }} />
      <View style={{ position: 'absolute', width: SIZE * 0.8, height: 1, backgroundColor: primary + '18' }} />
      <View style={{ position: 'absolute', width: 1, height: SIZE * 0.8, backgroundColor: primary + '18' }} />
      <Animated.View style={{ width: SIZE * 0.32, height: SIZE * 0.32, borderRadius: SIZE * 0.32 / 2, backgroundColor: overallStatus + '15', borderWidth: 2, borderColor: overallStatus, alignItems: 'center', justifyContent: 'center', opacity: pulse }}>
        <Text style={{ fontSize: alertCount > 0 ? 18 : 14, fontWeight: '900', color: overallStatus, fontFamily: MONO, lineHeight: alertCount > 0 ? 20 : 16 }}>
          {alertCount > 0 ? alertCount.toString() : '✓'}
        </Text>
        <Text style={{ fontSize: 6, color: overallStatus, letterSpacing: 1, fontFamily: MONO, opacity: 0.8 }}>
          {alertCount > 0 ? 'ALERTS' : 'OK'}
        </Text>
      </Animated.View>
      <View style={{ position: 'absolute', bottom: 8 }}>
        <Text style={{ fontSize: 7, color: primary + '80', fontFamily: MONO, letterSpacing: 1, textAlign: 'center' }}>
          {checkedIn}/{total} ON SITE
        </Text>
      </View>
    </View>
  );
}

// ── Light theme status summary (replaces radar on light themes) ──
function StatusSummary({ alertCount, checkedIn, total, overallStatus, companyName, currentTime }: {
  alertCount: number; checkedIn: number; total: number;
  overallStatus: string; companyName: string; currentTime: Date;
}) {
  const { colors } = useTheme();
  const ts = useThemeStyle();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
      <Text style={[ts.label.hint, { marginBottom: 4 }]}>
        {companyName.toUpperCase()}
      </Text>
      <View style={{
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: overallStatus + '15',
        borderWidth: 3, borderColor: overallStatus,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
      }}>
        <Text style={{ fontSize: alertCount > 0 ? 28 : 22, fontWeight: '900', color: overallStatus }}>
          {alertCount > 0 ? alertCount : '✓'}
        </Text>
        <Text style={[ts.label.hint, { color: overallStatus, fontSize: 10 }]}>
          {alertCount > 0 ? 'Alerts' : 'All Clear'}
        </Text>
      </View>
      <Text style={[ts.label.secondary, { marginBottom: 4 }]}>
        {checkedIn} of {total} employees on site
      </Text>
      <Text style={[ts.label.hint]}>
        {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </Text>
    </View>
  );
}

// ── Modal row ──────────────────────────────────────────────────
function ModalRow({ Icon, color, title, sub, onPress }: {
  Icon: any; color: string; title: string; sub: string; onPress: () => void;
}) {
  const { colors } = useTheme();
  const ts = useThemeStyle();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1, borderColor: colors.border,
        borderLeftWidth: 3, borderLeftColor: color,
        borderRadius: ts.radius.md,
        padding: 12, marginBottom: 6, gap: 12, position: 'relative',
      }}
    >
      <View style={{ width: 36, height: 36, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center', borderRadius: ts.radius.sm }}>
        <Icon size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ts.label.body, { fontWeight: '700', marginBottom: 2 }]}>{title}</Text>
        <Text style={ts.label.hint}>{sub}</Text>
      </View>
      <ChevronRight size={14} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const { company, loading: authLoading, isAuthenticated, isEmployee } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const ts = useThemeStyle();
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 768;

  // Semantic colors — same across themes
  const GREEN  = '#00CC66';
  const AMBER  = '#CC9900';
  const RED    = '#DD2233';
  const PURPLE = '#8844BB';

  // ── ALL DATA HOOKS — UNCHANGED ────────────────────────────────
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
        .from('time_entries').select('*', { count: 'exact', head: true })
        .eq('organization_id', company.id).is('clock_out', null);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!company?.id, refetchInterval: 30000, staleTime: 15000,
  });

  const erpLoading = materialsLoading || workOrdersLoading || employeesLoading || approvalsLoading;

  const approvals = useMemo(() => ([
    ...purchaseApprovals.map(a => ({ ...a, type: 'purchase' as const, status: a.status === 'pending' || a.status === 'in_progress' ? 'pending' as const : a.status as 'approved' | 'rejected', amount: a.amount || 0 })),
    ...timeApprovals.map(a => ({ ...a, type: a.type as 'time_off' | 'overtime' | 'schedule_change', status: a.status === 'pending' || a.status === 'in_progress' ? 'pending' as const : a.status as 'approved' | 'rejected' })),
    ...permitApprovals.map(a => ({ ...a, type: 'permit' as const, status: a.status === 'pending' || a.status === 'in_progress' ? 'pending' as const : a.status as 'approved' | 'rejected' })),
  ]), [purchaseApprovals, timeApprovals, permitApprovals]);

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
    Haptics.selectionAsync();
    setShowLowStockAlerts(false);
    router.push({ pathname: '/inventory/itemrecords', params: { materialId, fromAlert: 'true' } });
  }, [router]);

  const materialsList = useMemo(() => materials.map(m => ({
    ...m, facility_name: m.facility_name || 'Unassigned', vendor: m.vendor || 'Unknown Vendor',
  })), [materials]);

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

  const facilityNames = useMemo(() => ['All Facilities', ...facilities.map(f => f.name).sort()], [facilities]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
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
    } catch (e) { console.error('[Dashboard] Refresh error:', e); }
    finally { setRefreshing(false); }
  }, [queryClient]);

  // ── GUARDS ────────────────────────────────────────────────────
  if (authLoading || erpLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[ts.label.section, { color: colors.primary }]}>
          {authLoading ? 'AUTHENTICATING...' : 'LOADING SYSTEMS...'}
        </Text>
      </View>
    );
  }
  if (!isAuthenticated) return null;
  if (isEmployee) return <EmployeeHome />;

  const alertCount = stats.lowStockCount + stats.outOfStockCount + stats.overdueWorkOrders;
  const overallStatus = alertCount === 0 ? GREEN : alertCount <= 3 ? AMBER : RED;

  const pendingRequestsCount = purchaseRequests.filter(r => r.status === 'pending' || r.status === 'submitted').length;
  const pendingApprovalsCount = purchaseOrders.filter(po => po.status === 'pending_approval').length;
  const pendingReqsCount = purchaseRequisitions.filter(r => r.status === 'pending' || r.status === 'pending_approval').length;
  const pendingReceiptCount = purchaseOrders.filter(po => ['approved', 'ordered', 'shipped'].includes(po.status)).length;
  const activePOsCount = purchaseOrders.filter(po => !['cancelled', 'closed'].includes(po.status)).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 52, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── TOP STATUS BAR ──────────────────────────────────── */}
        <View style={[ts.card.surface, {
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          padding: 8, marginBottom: 10, position: 'relative',
          backgroundColor: ts.isHUD ? colors.hudSurface + '80' : colors.surface,
        }]}>
          {ts.isHUD && <Brackets color={colors.hudBorderBright} size={8} />}
          {ts.isGhost && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#111111' }} />}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PulsingDot color={overallStatus} />
            <Text style={[ts.label.section, { color: colors.textSecondary }]}>
              {ts.isHUD ? 'EXECUTIVE OVERVIEW' : 'Executive Overview'}
            </Text>
          </View>
          <Text style={[ts.label.hint, { fontFamily: MONO }]}>
            {currentTime.toLocaleTimeString('en-US', { hour12: false })} CST
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                borderWidth: 1, borderColor: colors.hudBorderBright,
                borderRadius: ts.radius.sm, paddingHorizontal: 8, paddingVertical: 4,
              }}
              onPress={() => setShowFacilityPicker(true)}
            >
              <MapPin size={10} color={colors.primary} />
              <Text style={[ts.label.hint, { color: colors.primary }]}>
                {selectedFacility === 'all' ? 'All Facilities' : selectedFacility.slice(0, 12)}
              </Text>
              <ChevronDown size={9} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={{ padding: 4, borderWidth: 1, borderColor: colors.border, borderRadius: ts.radius.sm }}>
              <RefreshCw size={13} color={colors.textSecondary} />
            </TouchableOpacity>
            <UserProfileMenu />
          </View>
        </View>

        {/* ── HEADER — Radar (HUD) or Summary card (light) ─────── */}
        <View style={[ts.card.surface, {
          marginBottom: 10, padding: 16, position: 'relative', alignItems: 'center',
        }]}>
          {ts.isHUD && <Brackets color={colors.hudPrimary} size={14} />}
          <Text style={[ts.label.section, { marginBottom: 4 }]}>
            {company?.name || 'TulKenz OPS'}
          </Text>

          {ts.isHUD ? (
            <RadarEye
              overallStatus={overallStatus} alertCount={alertCount}
              checkedIn={checkedInCount} total={stats.activeEmployees}
              primary={colors.hudPrimary} secondary={colors.hudSecondary}
            />
          ) : (
            <StatusSummary
              alertCount={alertCount} checkedIn={checkedInCount}
              total={stats.activeEmployees} overallStatus={overallStatus}
              companyName={company?.name || 'TulKenz OPS'} currentTime={currentTime}
            />
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
            <Clock size={10} color={colors.textTertiary} />
            <Text style={[ts.label.hint]}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* ── TELEMETRY STATUS STRIP ──────────────────────────── */}
        <View style={[ts.card.surface, {
          flexDirection: 'row', marginBottom: 10, paddingVertical: 10, position: 'relative',
        }]}>
          {ts.isHUD && <Brackets color={colors.hudBorderBright} size={8} />}
          {[
            { label: ts.isHUD ? 'INVENTORY'    : 'Inventory',   value: `${stats.totalMaterials}`, color: colors.primary },
            { label: ts.isHUD ? 'LOW STOCK'    : 'Low Stock',   value: `${stats.lowStockCount}`,  color: stats.lowStockCount > 0 ? AMBER : GREEN },
            { label: ts.isHUD ? 'OUT OF STOCK' : 'Out of Stock',value: `${stats.outOfStockCount}`,color: stats.outOfStockCount > 0 ? RED : GREEN },
            { label: ts.isHUD ? 'OPEN WOs'     : 'Open WOs',    value: `${stats.openWorkOrders}`, color: stats.overdueWorkOrders > 0 ? AMBER : GREEN },
            { label: ts.isHUD ? 'OVERDUE'      : 'Overdue',     value: `${stats.overdueWorkOrders}`, color: stats.overdueWorkOrders > 0 ? RED : GREEN },
            { label: ts.isHUD ? 'ON SITE'      : 'On Site',     value: `${checkedInCount}/${stats.activeEmployees}`, color: checkedInCount > 0 ? colors.primary : colors.textTertiary },
            { label: ts.isHUD ? 'TASK FEED'    : 'Tasks',       value: `${taskFeedPendingCount}`, color: taskFeedPendingCount > 0 ? AMBER : GREEN },
          ].map((item, i, arr) => (
            <StatusItem key={item.label} label={item.label} value={item.value} color={item.color} last={i === arr.length - 1} />
          ))}
        </View>

        {/* ── ROW 1: QUICK ACTIONS + COMPLIANCE ───────────────── */}
        <View style={isWide ? { flexDirection: 'row', gap: 10, marginBottom: 0 } : undefined}>
          <View style={isWide ? { flex: 1 } : undefined}>
            <DashCard title={ts.isHUD ? 'Quick Actions' : 'Quick Actions'} accentColor={AMBER} titleColor={AMBER}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <QuickBtn
                  icon={<ClipboardList size={15} color={taskFeedPendingCount > 0 ? AMBER : GREEN} />}
                  stat={taskFeedPendingCount.toString()} label="Task Feed" desc="Pending items"
                  color={taskFeedPendingCount > 0 ? AMBER : GREEN}
                  onPress={() => router.push('/taskfeed')}
                />
                <QuickBtn
                  icon={<Users size={15} color={colors.primary} />}
                  stat={`${checkedInCount}/${stats.activeEmployees}`} label="Headcount" desc="Checked in now"
                  color={colors.primary} onPress={() => router.push('/timeclock')}
                />
                <QuickBtn
                  icon={<Siren size={15} color={RED} />}
                  stat="SOS" label="Emergency" desc="Initiate protocol"
                  color={RED}
                  onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setShowEmergencyModal(true); }}
                />
              </View>
            </DashCard>
          </View>
          <View style={isWide ? { flex: 1 } : undefined}>
            <DashCard accentColor={AMBER}>
              <ComplianceCountdown />
            </DashCard>
          </View>
        </View>

        {/* ── LINE STATUS ──────────────────────────────────────── */}
        <DashCard title="Line Status" accentColor={GREEN} titleColor={GREEN} sub={ts.isHUD ? 'LIVE' : 'Live'}>
          <LineStatusWidget />
        </DashCard>

        {/* ── SCORECARDS ───────────────────────────────────────── */}
        <View style={isWide ? { flexDirection: 'row', gap: 10 } : undefined}>
          <View style={isWide ? { flex: 1 } : undefined}>
            <DashCard title="Procurement Scorecard" accentColor={GREEN} titleColor={GREEN} sub={ts.isHUD ? 'THIS MONTH' : 'This Month'}>
              <ScoreCardSection
                title="" subtitle="" icon={null} cardStyle={{ minHeight: 140 }}
                gauges={[
                  { label: 'Pending Requests',  value: Math.max(0, 100 - (pendingRequestsCount * 20)),  displayValue: `${pendingRequestsCount}`,  color: pendingRequestsCount > 0  ? AMBER : GREEN },
                  { label: 'Pending Approvals', value: Math.max(0, 100 - (pendingApprovalsCount * 25)), displayValue: `${pendingApprovalsCount}`, color: pendingApprovalsCount > 0 ? AMBER : GREEN },
                  { label: 'Pending Reqs',      value: Math.max(0, 100 - (pendingReqsCount * 20)),      displayValue: `${pendingReqsCount}`,      color: pendingReqsCount > 0      ? AMBER : GREEN },
                  { label: 'Pending Receipt',   value: Math.max(0, 100 - (pendingReceiptCount * 15)),   displayValue: `${pendingReceiptCount}`,   color: pendingReceiptCount > 0   ? colors.primary : GREEN },
                  { label: 'Active POs',        value: purchaseOrders.length > 0 ? 65 : 0,             displayValue: `${activePOsCount}`,        color: colors.primary },
                  {
                    label: 'Avg Days',
                    value: (() => { const c = purchaseOrders.filter(po => po.status === 'received' && po.created_at); if (!c.length) return 100; const avg = c.reduce((s, po) => s + Math.max(1, Math.round((new Date(po.updated_at || po.created_at).getTime() - new Date(po.created_at).getTime()) / 86400000)), 0) / c.length; return Math.max(0, 100 - avg * 5); })(),
                    displayValue: (() => { const c = purchaseOrders.filter(po => po.status === 'received' && po.created_at); if (!c.length) return 'N/A'; const avg = c.reduce((s, po) => s + Math.max(1, Math.round((new Date(po.updated_at || po.created_at).getTime() - new Date(po.created_at).getTime()) / 86400000)), 0) / c.length; return `${Math.round(avg)}d`; })(),
                    color: PURPLE,
                  },
                ]}
              />
            </DashCard>
          </View>
          <View style={isWide ? { flex: 1 } : undefined}>
            <DashCard title="Inventory Scorecard" accentColor={colors.primary} titleColor={colors.primary}>
              <ScoreCardSection
                title="" subtitle="" icon={null} cardStyle={{ minHeight: 140 }}
                gauges={[
                  { label: 'Stock Health', value: performanceMetrics.stockHealth, displayValue: `${performanceMetrics.stockHealth}%` },
                  { label: 'Fill Rate', value: stats.totalMaterials > 0 ? Math.round(((stats.totalMaterials - stats.outOfStockCount) / stats.totalMaterials) * 100) : 100, displayValue: `${stats.totalMaterials > 0 ? Math.round(((stats.totalMaterials - stats.outOfStockCount) / stats.totalMaterials) * 100) : 100}%` },
                  { label: 'Low Stock', value: Math.max(0, 100 - (stats.lowStockCount / Math.max(stats.totalMaterials, 1)) * 100), displayValue: `${stats.lowStockCount}`, color: stats.lowStockCount > 0 ? AMBER : GREEN },
                  { label: 'Out of Stock', value: Math.max(0, 100 - (stats.outOfStockCount / Math.max(stats.totalMaterials, 1)) * 100), displayValue: `${stats.outOfStockCount}`, color: stats.outOfStockCount > 0 ? RED : GREEN },
                  { label: 'Total SKUs', value: Math.min(100, stats.totalMaterials * 10), displayValue: `${stats.totalMaterials}`, color: colors.primary },
                  { label: 'Value', value: 75, displayValue: `$${(inventoryValue / 1000).toFixed(0)}K`, color: GREEN },
                ]}
              />
            </DashCard>
          </View>
        </View>

        {/* ── DEPARTMENT BUDGETS ───────────────────────────────── */}
        {budgets.length > 0 && (
          <DashCard title="Department Budgets" accentColor={PURPLE} titleColor={PURPLE}>
            <BudgetCardsRow budgets={budgets} />
          </DashCard>
        )}

        {/* ── CMMS PERFORMANCE ────────────────────────────────── */}
        <DashCard title="CMMS Performance" accentColor={AMBER} titleColor={AMBER} sub={ts.isHUD ? '30-DAY' : '30 Day'}>
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
                { label: 'MTTR', value: '0', unit: 'hrs', trend: 0, trendLabel: 'Avg Repair' },
                { label: 'MTBF', value: '0', unit: 'hrs', trend: 0, trendLabel: 'Avg Between' },
                { label: 'PM Compliance', value: pmCompliance.toString(), unit: '%', trend: 0, trendLabel: `${pmCompleted}/${pmWOs.length} PMs`, color: pmCompliance >= 90 ? GREEN : pmCompliance >= 70 ? AMBER : RED },
                { label: 'Backlog', value: open.toString(), unit: 'WOs', trend: 0, trendLabel: `${stats.overdueWorkOrders} overdue`, color: open > 5 ? AMBER : GREEN },
                { label: 'In Progress', value: inProg.toString(), unit: 'WOs', trend: 0, trendLabel: 'Active now', color: colors.primary },
                { label: 'Completed', value: completed.toString(), unit: 'WOs', trend: 0, trendLabel: 'This period', color: GREEN },
                { label: 'Planned', value: planned.toString(), unit: 'WOs', trend: 0, trendLabel: 'Scheduled', color: colors.primary },
                { label: 'Unplanned', value: unplanned.toString(), unit: 'WOs', trend: 0, trendLabel: 'Reactive', color: unplanned > 0 ? RED : GREEN },
              ];
            })()}
          />
        </DashCard>

        {/* ── SANITATION ───────────────────────────────────────── */}
        <DashCard title="Sanitation" accentColor={colors.primary} titleColor={colors.primary} sub={ts.isHUD ? 'THIS WEEK' : 'This Week'}>
          <MetricCardsSection title="" subtitle="" icon={null} cards={[
            { label: 'Pre-Op Inspections', value: '0', unit: '/ 5',  trend: 0, trendLabel: 'Completed', color: colors.primary },
            { label: 'CIP Cycles',         value: '0', unit: '/ 3',  trend: 0, trendLabel: 'Completed', color: colors.primary },
            { label: 'Swab Tests',         value: '0', unit: 'pass', trend: 0, trendLabel: 'All passed', color: GREEN },
            { label: 'Open CARs',          value: '0',               trend: 0, trendLabel: 'Corrective', color: GREEN },
            { label: 'Zone 1 Clean',       value: '100', unit: '%',  trend: 0, trendLabel: 'Product contact', color: GREEN },
            { label: 'Zone 2 Clean',       value: '100', unit: '%',  trend: 0, trendLabel: 'Non-contact', color: GREEN },
            { label: 'Chemical Logs',      value: '0', unit: '/ 5',  trend: 0, trendLabel: 'Verified', color: colors.primary },
            { label: 'Overdue Tasks',      value: '0',               trend: 0, trendLabel: 'Past due', color: GREEN },
          ]} />
        </DashCard>

        {/* ── QUALITY ──────────────────────────────────────────── */}
        <DashCard title="Quality" accentColor={PURPLE} titleColor={PURPLE} sub={ts.isHUD ? 'THIS MONTH' : 'This Month'}>
          <MetricCardsSection title="" subtitle="" icon={null} cards={[
            { label: 'Hold Lots',           value: '0', trend: 0, trendLabel: 'On hold', color: GREEN },
            { label: 'Rejections',          value: '0', trend: 0, trendLabel: 'This period', color: GREEN },
            { label: 'NCRs Open',           value: '0', trend: 0, trendLabel: 'Non-conformance', color: GREEN },
            { label: 'CCP Deviations',      value: '0', trend: 0, trendLabel: 'Critical control', color: GREEN },
            { label: 'COA Pending',         value: '0', trend: 0, trendLabel: 'Certificates', color: GREEN },
            { label: 'Spec Compliance',     value: '100', unit: '%', trend: 0, trendLabel: 'In spec', color: GREEN },
            { label: 'Foreign Material',    value: '0', trend: 0, trendLabel: 'Incidents', color: GREEN },
            { label: 'Customer Complaints', value: '0', trend: 0, trendLabel: 'Open items', color: GREEN },
          ]} />
        </DashCard>

        {/* ── SAFETY ───────────────────────────────────────────── */}
        <DashCard title="Safety" accentColor={AMBER} titleColor={AMBER} sub={ts.isHUD ? 'YTD' : 'Year to Date'}>
          <MetricCardsSection title="" subtitle="" icon={null} cards={[
            { label: 'Days No Incident', value: '0',          trend: 0, trendLabel: 'Recordable', color: GREEN },
            { label: 'Near Misses',      value: '0',          trend: 0, trendLabel: 'Reported', color: GREEN },
            { label: 'Open Actions',     value: '0',          trend: 0, trendLabel: 'Corrective', color: GREEN },
            { label: 'Training Due',     value: '0',          trend: 0, trendLabel: 'Employees', color: GREEN },
            { label: 'PPE Compliance',   value: '100', unit: '%', trend: 0, trendLabel: 'Audited', color: GREEN },
            { label: 'Permits Active',   value: '0',          trend: 0, trendLabel: 'Hot work / confined', color: colors.primary },
            { label: 'OSHA Recordable',  value: '0',          trend: 0, trendLabel: 'YTD injuries', color: GREEN },
            { label: 'JSA Reviews',      value: '0',          trend: 0, trendLabel: 'Job safety analysis', color: GREEN },
          ]} />
        </DashCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── EMERGENCY MODAL ────────────────────────────────────── */}
      <Modal visible={showEmergencyModal} animationType="slide" transparent onRequestClose={() => setShowEmergencyModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' }}>
          <View style={[ts.card.surface, { borderTopWidth: 2, borderColor: RED, padding: 20, paddingBottom: 36, maxHeight: '85%', position: 'relative' }]}>
            {ts.isHUD && <Brackets color={RED} size={12} />}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {ts.isHUD && <View style={{ width: 2, height: 14, backgroundColor: RED }} />}
                <Siren size={15} color={RED} />
                <Text style={[ts.label.section, { color: colors.text }]}>EMERGENCY PROTOCOL</Text>
              </View>
              <Pressable onPress={() => setShowEmergencyModal(false)} hitSlop={12}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[ts.label.secondary, { marginBottom: 16 }]}>
              Select type — roll call starts immediately
            </Text>
            <Text style={[ts.label.section, { marginBottom: 8 }]}>LIVE EMERGENCY</Text>
            {[
              { type: 'fire', label: 'Fire Emergency', Icon: Flame, color: RED },
              { type: 'tornado', label: 'Tornado Emergency', Icon: Tornado, color: PURPLE },
              { type: 'active_shooter', label: 'Active Shooter', Icon: ShieldAlert, color: RED },
            ].map(({ type, label, Icon, color }) => (
              <ModalRow key={type} Icon={Icon} color={color} title={label} sub="Live — starts roll call now"
                onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setShowEmergencyModal(false); router.push({ pathname: '/headcount/emergencyprotocol', params: { type, drill: 'false' } }); }}
              />
            ))}
            <Text style={[ts.label.section, { marginBottom: 8, marginTop: 12 }]}>DRILL MODE</Text>
            {[
              { type: 'fire', label: 'Fire Drill', Icon: Flame, color: AMBER },
              { type: 'tornado', label: 'Tornado Drill', Icon: Tornado, color: PURPLE },
              { type: 'active_shooter', label: 'Active Shooter Drill', Icon: ShieldAlert, color: colors.textSecondary },
            ].map(({ type, label, Icon, color }) => (
              <ModalRow key={`drill-${type}`} Icon={Icon} color={colors.primary} title={label} sub="Training exercise — starts roll call"
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowEmergencyModal(false); router.push({ pathname: '/headcount/emergencyprotocol', params: { type, drill: 'true' } }); }}
              />
            ))}
            <TouchableOpacity activeOpacity={0.7}
              style={{ marginTop: 14, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: ts.radius.md }}
              onPress={() => { setShowEmergencyModal(false); router.push('/safety/emergencyinitiation' as any); }}>
              <Text style={[ts.label.body, { color: colors.primary, fontWeight: '600' }]}>
                More Emergency Types →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── FACILITY PICKER ─────────────────────────────────────── */}
      <Modal visible={showFacilityPicker} transparent animationType="fade" onRequestClose={() => setShowFacilityPicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 40 }} onPress={() => setShowFacilityPicker(false)}>
          <View style={[ts.card.surface, { width: '100%', maxWidth: 320, position: 'relative' }]}>
            {ts.isHUD && <Brackets color={colors.hudPrimary} size={10} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <MapPin size={11} color={colors.primary} />
              <Text style={[ts.label.section, { color: colors.primary }]}>SELECT FACILITY</Text>
            </View>
            {facilityNames.map(name => {
              const key = name === 'All Facilities' ? 'all' : name;
              const active = selectedFacility === key;
              return (
                <Pressable
                  key={name}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: active ? colors.primary + '12' : 'transparent' }}
                  onPress={() => { setSelectedFacility(key); setShowFacilityPicker(false); }}
                >
                  <Text style={[ts.label.body, { color: active ? colors.primary : colors.text, fontWeight: active ? '700' : '400' }]}>{name}</Text>
                  {active && <CheckCircle size={13} color={colors.primary} />}
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
