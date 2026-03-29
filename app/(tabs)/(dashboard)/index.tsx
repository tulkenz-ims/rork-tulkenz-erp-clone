import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  Modal,
  Animated,
  Platform,
  StyleSheet,
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
import { useEmployees, useFacilities } from '@/hooks/useSupabaseEmployees';
import { useAllAggregatedApprovals } from '@/hooks/useAggregatedApprovals';
import { usePurchaseRequestsQuery, usePurchaseRequisitionsQuery, useProcurementPurchaseOrdersQuery } from '@/hooks/useSupabaseProcurement';
import { useTaskFeedPostsQuery } from '@/hooks/useTaskFeedTemplates';
import { useBudgetsQuery } from '@/hooks/useSupabaseFinance';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// ── Corner brackets ────────────────────────────────────────────
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

// ── HUD Card ───────────────────────────────────────────────────
function HudCard({ children, style, accent, title, titleColor, sub }: {
  children: React.ReactNode;
  style?: any;
  accent?: string;
  title?: string;
  titleColor?: string;
  sub?: string;
}) {
  const { colors } = useTheme();
  const c = accent || colors.hudBorderBright;
  const tc = titleColor || colors.hudPrimary;

  return (
    <View style={[{
      backgroundColor: colors.hudSurface,
      borderWidth: 1,
      borderColor: colors.hudBorder,
      marginBottom: 10,
      position: 'relative',
    }, style]}>
      <Brackets color={c} size={10} />
      {title && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.hudBorder }}>
          <View style={{ width: 2, height: 12, backgroundColor: tc }} />
          <Text style={{ fontSize: 9, fontWeight: '800', color: tc, letterSpacing: 2.5, fontFamily: MONO, flex: 1 }}>
            {title.toUpperCase()}
          </Text>
          {sub && <Text style={{ fontSize: 8, color: tc, opacity: 0.6, letterSpacing: 1.5, fontFamily: MONO }}>{sub}</Text>}
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
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        backgroundColor: colors.hudSurface,
        borderWidth: 1,
        borderColor: color + '45',
        gap: 5,
        minHeight: 115,
        position: 'relative',
      }}
    >
      <Brackets color={color + '60'} size={7} />
      <View style={{ width: 30, height: 30, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <Text style={{ fontSize: 18, fontWeight: '900', color, fontFamily: MONO, letterSpacing: -0.5 }}>{stat}</Text>
      <Text style={{ fontSize: 7, fontWeight: '800', color, letterSpacing: 2, fontFamily: MONO, textAlign: 'center', opacity: 0.85 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 6.5, color: colors.textTertiary, textAlign: 'center', letterSpacing: 0.5, fontFamily: MONO }}>
        {desc.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

// ── Status item ────────────────────────────────────────────────
function StatusItem({ label, value, color, last }: { label: string; value: string; color: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      gap: 3,
      borderRightWidth: last ? 0 : 1,
      borderRightColor: colors.hudBorder,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '900', color, fontFamily: MONO }}>{value}</Text>
      <Text style={{ fontSize: 6, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1, textAlign: 'center', fontFamily: MONO }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

// ── Radar eye (JARVIS center) ──────────────────────────────────
function RadarEye({ overallStatus, alertCount, checkedIn, total, primary, secondary }: {
  overallStatus: string;
  alertCount: number;
  checkedIn: number;
  total: number;
  primary: string;
  secondary: string;
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
      <Animated.View style={{
        position: 'absolute',
        width: SIZE, height: SIZE,
        borderRadius: SIZE / 2,
        borderWidth: 1,
        borderColor: primary + '25',
        borderStyle: 'dashed',
        transform: [{ rotate: rot1 }],
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: SIZE * 0.75, height: SIZE * 0.75,
        borderRadius: SIZE * 0.75 / 2,
        borderWidth: 1,
        borderColor: primary + '35',
        transform: [{ rotate: rot2 }],
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: SIZE * 0.75, height: SIZE * 0.75,
        borderRadius: SIZE * 0.75 / 2,
        borderWidth: 2,
        borderColor: 'transparent',
        borderTopColor: primary,
        borderRightColor: primary + '40',
        transform: [{ rotate: rot2 }],
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: SIZE * 0.52, height: SIZE * 0.52,
        borderRadius: SIZE * 0.52 / 2,
        borderWidth: 1,
        borderColor: secondary + '45',
        transform: [{ rotate: rot3 }],
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: SIZE * 0.52, height: SIZE * 0.52,
        borderRadius: SIZE * 0.52 / 2,
        borderWidth: 1.5,
        borderColor: 'transparent',
        borderBottomColor: secondary,
        borderLeftColor: secondary + '40',
        transform: [{ rotate: rot3 }],
      }} />
      <View style={{ position: 'absolute', width: SIZE * 0.8, height: 1, backgroundColor: primary + '18' }} />
      <View style={{ position: 'absolute', width: 1, height: SIZE * 0.8, backgroundColor: primary + '18' }} />
      <Animated.View style={{
        width: SIZE * 0.32, height: SIZE * 0.32,
        borderRadius: SIZE * 0.32 / 2,
        backgroundColor: overallStatus + '15',
        borderWidth: 2,
        borderColor: overallStatus,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pulse,
      }}>
        <Text style={{ fontSize: alertCount > 0 ? 18 : 14, fontWeight: '900', color: overallStatus, fontFamily: MONO, lineHeight: alertCount > 0 ? 20 : 16 }}>
          {alertCount > 0 ? alertCount.toString() : '\u2713'}
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

// ── Modal row ──────────────────────────────────────────────────
function ModalRow({ Icon, color, title, sub, onPress }: {
  Icon: any; color: string; title: string; sub: string; onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.hudBg,
        borderWidth: 1,
        borderColor: colors.hudBorder,
        borderLeftWidth: 3,
        borderLeftColor: color,
        padding: 12,
        marginBottom: 6,
        gap: 12,
        position: 'relative',
      }}
    >
      <View style={{ width: 36, height: 36, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.hudTextStrong, fontFamily: MONO, marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: MONO }}>{sub}</Text>
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
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 768;

  const C = {
    p:      colors.hudPrimary,
    s:      colors.hudSecondary,
    text:   colors.hudTextStrong,
    textS:  colors.textSecondary,
    textD:  colors.textTertiary,
    bdr:    colors.hudBorder,
    bdrB:   colors.hudBorderBright,
    surf:   colors.hudSurface,
    bg:     colors.hudBg,
    green:  '#00FF88',
    amber:  '#FFB800',
    red:    '#FF3344',
    purple: '#CC44FF',
  };

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
        .from('time_entries')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', company.id)
        .is('clock_out', null);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
    staleTime: 15000,
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
    ...m,
    facility_name: m.facility_name || 'Unassigned',
    vendor: m.vendor || 'Unknown Vendor',
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
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <ActivityIndicator size="large" color={C.p} />
        <Text style={{ color: C.p, fontSize: 11, fontWeight: '800', letterSpacing: 3, fontFamily: MONO }}>
          {authLoading ? 'AUTHENTICATING...' : 'LOADING SYSTEMS...'}
        </Text>
      </View>
    );
  }
  if (!isAuthenticated) return null;
  if (isEmployee) return <EmployeeHome />;

  const alertCount = stats.lowStockCount + stats.outOfStockCount + stats.overdueWorkOrders;
  const overallStatus = alertCount === 0 ? C.green : alertCount <= 3 ? C.amber : C.red;

  const pendingRequestsCount = purchaseRequests.filter(r => r.status === 'pending' || r.status === 'submitted').length;
  const pendingApprovalsCount = purchaseOrders.filter(po => po.status === 'pending_approval').length;
  const pendingReqsCount = purchaseRequisitions.filter(r => r.status === 'pending' || r.status === 'pending_approval').length;
  const pendingReceiptCount = purchaseOrders.filter(po => ['approved','ordered','shipped'].includes(po.status)).length;
  const activePOsCount = purchaseOrders.filter(po => !['cancelled','closed'].includes(po.status)).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 52, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.p} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── SYSTEM TOP BAR ──────────────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: C.bdr,
          backgroundColor: C.surf + '80',
          padding: 8,
          marginBottom: 10,
          position: 'relative',
        }}>
          <Brackets color={C.bdrB} size={8} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PulsingDot color={overallStatus} />
            <Text style={{ fontSize: 9, color: C.textD, fontFamily: MONO, letterSpacing: 2 }}>EXECUTIVE OVERVIEW</Text>
          </View>
          <Text style={{ fontSize: 8, color: C.textD, fontFamily: MONO, letterSpacing: 1 }}>
            {currentTime.toLocaleTimeString('en-US', { hour12: false })} CST
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.bdrB, paddingHorizontal: 8, paddingVertical: 4 }}
              onPress={() => setShowFacilityPicker(true)}
            >
              <MapPin size={10} color={C.p} />
              <Text style={{ fontSize: 8, color: C.p, fontFamily: MONO, letterSpacing: 1 }}>
                {selectedFacility === 'all' ? 'ALL FACILITIES' : selectedFacility.toUpperCase().slice(0, 12)}
              </Text>
              <ChevronDown size={9} color={C.textD} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={{ padding: 4, borderWidth: 1, borderColor: C.bdrB }}>
              <RefreshCw size={13} color={C.textS} />
            </TouchableOpacity>
            <UserProfileMenu />
          </View>
        </View>

        {/* ── RADAR EYE HEADER ────────────────────────────────── */}
        <View style={{
          borderWidth: 1,
          borderColor: C.bdrB,
          backgroundColor: C.surf,
          marginBottom: 10,
          padding: 16,
          position: 'relative',
          alignItems: 'center',
        }}>
          <Brackets color={C.p} size={14} />
          <Text style={{ fontSize: 10, color: C.textD, fontFamily: MONO, letterSpacing: 3, marginBottom: 4 }}>
            {company?.name?.toUpperCase() || 'TULKENZ OPS'}
          </Text>
          <RadarEye
            overallStatus={overallStatus}
            alertCount={alertCount}
            checkedIn={checkedInCount}
            total={stats.activeEmployees}
            primary={C.p}
            secondary={C.s}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
            <Clock size={10} color={C.textD} />
            <Text style={{ fontSize: 9, color: C.textD, fontFamily: MONO, letterSpacing: 1 }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── TELEMETRY STATUS STRIP ──────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: C.bdrB,
          backgroundColor: C.surf,
          marginBottom: 10,
          paddingVertical: 10,
          position: 'relative',
        }}>
          <Brackets color={C.bdrB} size={8} />
          {[
            { label: 'INVENTORY',    value: `${stats.totalMaterials}`, color: C.p },
            { label: 'LOW STOCK',    value: `${stats.lowStockCount}`, color: stats.lowStockCount > 0 ? C.amber : C.green },
            { label: 'OUT OF STOCK', value: `${stats.outOfStockCount}`, color: stats.outOfStockCount > 0 ? C.red : C.green },
            { label: 'OPEN WOs',     value: `${stats.openWorkOrders}`, color: stats.overdueWorkOrders > 0 ? C.amber : C.green },
            { label: 'OVERDUE',      value: `${stats.overdueWorkOrders}`, color: stats.overdueWorkOrders > 0 ? C.red : C.green },
            { label: 'ON SITE',      value: `${checkedInCount}/${stats.activeEmployees}`, color: checkedInCount > 0 ? C.p : C.textD },
            { label: 'TASK FEED',    value: `${taskFeedPendingCount}`, color: taskFeedPendingCount > 0 ? C.amber : C.green },
          ].map((item, i, arr) => (
            <StatusItem key={item.label} label={item.label} value={item.value} color={item.color} last={i === arr.length - 1} />
          ))}
        </View>

        {/* ── ROW 1: QUICK ACTIONS + COMPLIANCE ───────────────── */}
        <View style={isWide ? { flexDirection: 'row', gap: 10, marginBottom: 0 } : undefined}>
          <View style={isWide ? { flex: 1 } : undefined}>
            <HudCard title="Quick Actions" titleColor={C.amber} accent={C.amber}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <QuickBtn
                  icon={<ClipboardList size={15} color={taskFeedPendingCount > 0 ? C.amber : C.green} />}
                  stat={taskFeedPendingCount.toString()}
                  label="Task Feed"
                  desc="Pending items"
                  color={taskFeedPendingCount > 0 ? C.amber : C.green}
                  onPress={() => router.push('/taskfeed')}
                />
                <QuickBtn
                  icon={<Users size={15} color={C.p} />}
                  stat={`${checkedInCount}/${stats.activeEmployees}`}
                  label="Headcount"
                  desc="Checked in now"
                  color={C.p}
                  onPress={() => router.push('/timeclock')}
                />
                <QuickBtn
                  icon={<Siren size={15} color={C.red} />}
                  stat="SOS"
                  label="Emergency"
                  desc="Initiate protocol"
                  color={C.red}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    setShowEmergencyModal(true);
                  }}
                />
              </View>
            </HudCard>
          </View>
          {/* Compliance — no title prop so ComplianceCountdown owns its own header with Manage button */}
          <View style={isWide ? { flex: 1 } : undefined}>
            <HudCard accent={C.amber}>
              <ComplianceCountdown />
            </HudCard>
          </View>
        </View>

        {/* ── LINE STATUS ──────────────────────────────────────── */}
        <HudCard title="Line Status" titleColor={C.green} accent={C.green} sub="LIVE">
          <LineStatusWidget />
        </HudCard>

        {/* ── SCORECARDS ───────────────────────────────────────── */}
        <View style={isWide ? { flexDirection: 'row', gap: 10 } : undefined}>
          <View style={isWide ? { flex: 1 } : undefined}>
            <HudCard title="Procurement Scorecard" titleColor={C.green} accent={C.green} sub="THIS MONTH">
              <ScoreCardSection
                title="" subtitle="" icon={null}
                cardStyle={{ minHeight: 140 }}
                gauges={[
                  { label: 'Pending Requests',  value: Math.max(0, 100 - (pendingRequestsCount * 20)),  displayValue: `${pendingRequestsCount}`,  color: pendingRequestsCount > 0  ? C.amber : C.green },
                  { label: 'Pending Approvals', value: Math.max(0, 100 - (pendingApprovalsCount * 25)), displayValue: `${pendingApprovalsCount}`, color: pendingApprovalsCount > 0 ? C.amber : C.green },
                  { label: 'Pending Reqs',      value: Math.max(0, 100 - (pendingReqsCount * 20)),      displayValue: `${pendingReqsCount}`,      color: pendingReqsCount > 0      ? C.amber : C.green },
                  { label: 'Pending Receipt',   value: Math.max(0, 100 - (pendingReceiptCount * 15)),   displayValue: `${pendingReceiptCount}`,   color: pendingReceiptCount > 0   ? C.p : C.green },
                  { label: 'Active POs',        value: purchaseOrders.length > 0 ? 65 : 0,             displayValue: `${activePOsCount}`,        color: C.p },
                  {
                    label: 'Avg Days',
                    value: (() => { const c = purchaseOrders.filter(po => po.status === 'received' && po.created_at); if (!c.length) return 100; const avg = c.reduce((s, po) => s + Math.max(1, Math.round((new Date(po.updated_at || po.created_at).getTime() - new Date(po.created_at).getTime()) / 86400000)), 0) / c.length; return Math.max(0, 100 - avg * 5); })(),
                    displayValue: (() => { const c = purchaseOrders.filter(po => po.status === 'received' && po.created_at); if (!c.length) return 'N/A'; const avg = c.reduce((s, po) => s + Math.max(1, Math.round((new Date(po.updated_at || po.created_at).getTime() - new Date(po.created_at).getTime()) / 86400000)), 0) / c.length; return `${Math.round(avg)}d`; })(),
                    color: C.purple,
                  },
                ]}
              />
            </HudCard>
          </View>
          <View style={isWide ? { flex: 1 } : undefined}>
            <HudCard title="Inventory Scorecard" titleColor={C.p} accent={C.p}>
              <ScoreCardSection
                title="" subtitle="" icon={null}
                cardStyle={{ minHeight: 140 }}
                gauges={[
                  { label: 'Stock Health', value: performanceMetrics.stockHealth, displayValue: `${performanceMetrics.stockHealth}%` },
                  { label: 'Fill Rate', value: stats.totalMaterials > 0 ? Math.round(((stats.totalMaterials - stats.outOfStockCount) / stats.totalMaterials) * 100) : 100, displayValue: `${stats.totalMaterials > 0 ? Math.round(((stats.totalMaterials - stats.outOfStockCount) / stats.totalMaterials) * 100) : 100}%` },
                  { label: 'Low Stock', value: Math.max(0, 100 - (stats.lowStockCount / Math.max(stats.totalMaterials, 1)) * 100), displayValue: `${stats.lowStockCount}`, color: stats.lowStockCount > 0 ? C.amber : C.green },
                  { label: 'Out of Stock', value: Math.max(0, 100 - (stats.outOfStockCount / Math.max(stats.totalMaterials, 1)) * 100), displayValue: `${stats.outOfStockCount}`, color: stats.outOfStockCount > 0 ? C.red : C.green },
                  { label: 'Total SKUs', value: Math.min(100, stats.totalMaterials * 10), displayValue: `${stats.totalMaterials}`, color: C.p },
                  { label: 'Value', value: 75, displayValue: `$${(inventoryValue / 1000).toFixed(0)}K`, color: C.green },
                ]}
              />
            </HudCard>
          </View>
        </View>

        {/* ── DEPARTMENT BUDGETS ───────────────────────────────── */}
        {budgets.length > 0 && (
          <HudCard title="Department Budgets" titleColor={C.purple} accent={C.purple}>
            <BudgetCardsRow budgets={budgets} />
          </HudCard>
        )}

        {/* ── CMMS PERFORMANCE ────────────────────────────────── */}
        <HudCard title="CMMS Performance" titleColor={C.amber} accent={C.amber} sub="30-DAY">
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
                { label: 'PM Compliance', value: pmCompliance.toString(), unit: '%', trend: 0, trendLabel: `${pmCompleted}/${pmWOs.length} PMs`, color: pmCompliance >= 90 ? C.green : pmCompliance >= 70 ? C.amber : C.red },
                { label: 'Backlog',       value: open.toString(), unit: 'WOs', trend: 0, trendLabel: `${stats.overdueWorkOrders} overdue`, color: open > 5 ? C.amber : C.green },
                { label: 'In Progress',   value: inProg.toString(), unit: 'WOs', trend: 0, trendLabel: 'Active now', color: C.p },
                { label: 'Completed',     value: completed.toString(), unit: 'WOs', trend: 0, trendLabel: 'This period', color: C.green },
                { label: 'Planned',       value: planned.toString(), unit: 'WOs', trend: 0, trendLabel: 'Scheduled', color: C.p },
                { label: 'Unplanned',     value: unplanned.toString(), unit: 'WOs', trend: 0, trendLabel: 'Reactive', color: unplanned > 0 ? C.red : C.green },
              ];
            })()}
          />
        </HudCard>

        {/* ── SANITATION ───────────────────────────────────────── */}
        <HudCard title="Sanitation" titleColor={C.p} accent={C.p} sub="THIS WEEK">
          <MetricCardsSection title="" subtitle="" icon={null} cards={[
            { label: 'Pre-Op Inspections', value: '0', unit: '/ 5',  trend: 0, trendLabel: 'Completed', color: C.p },
            { label: 'CIP Cycles',         value: '0', unit: '/ 3',  trend: 0, trendLabel: 'Completed', color: C.p },
            { label: 'Swab Tests',         value: '0', unit: 'pass', trend: 0, trendLabel: 'All passed', color: C.green },
            { label: 'Open CARs',          value: '0',               trend: 0, trendLabel: 'Corrective', color: C.green },
            { label: 'Zone 1 Clean',       value: '100', unit: '%',  trend: 0, trendLabel: 'Product contact', color: C.green },
            { label: 'Zone 2 Clean',       value: '100', unit: '%',  trend: 0, trendLabel: 'Non-contact', color: C.green },
            { label: 'Chemical Logs',      value: '0', unit: '/ 5',  trend: 0, trendLabel: 'Verified', color: C.p },
            { label: 'Overdue Tasks',      value: '0',               trend: 0, trendLabel: 'Past due', color: C.green },
          ]} />
        </HudCard>

        {/* ── QUALITY ──────────────────────────────────────────── */}
        <HudCard title="Quality" titleColor={C.purple} accent={C.purple} sub="THIS MONTH">
          <MetricCardsSection title="" subtitle="" icon={null} cards={[
            { label: 'Hold Lots',           value: '0', trend: 0, trendLabel: 'On hold', color: C.green },
            { label: 'Rejections',          value: '0', trend: 0, trendLabel: 'This period', color: C.green },
            { label: 'NCRs Open',           value: '0', trend: 0, trendLabel: 'Non-conformance', color: C.green },
            { label: 'CCP Deviations',      value: '0', trend: 0, trendLabel: 'Critical control', color: C.green },
            { label: 'COA Pending',         value: '0', trend: 0, trendLabel: 'Certificates', color: C.green },
            { label: 'Spec Compliance',     value: '100', unit: '%', trend: 0, trendLabel: 'In spec', color: C.green },
            { label: 'Foreign Material',    value: '0', trend: 0, trendLabel: 'Incidents', color: C.green },
            { label: 'Customer Complaints', value: '0', trend: 0, trendLabel: 'Open items', color: C.green },
          ]} />
        </HudCard>

        {/* ── SAFETY ───────────────────────────────────────────── */}
        <HudCard title="Safety" titleColor={C.amber} accent={C.amber} sub="YTD">
          <MetricCardsSection title="" subtitle="" icon={null} cards={[
            { label: 'Days No Incident', value: '0',          trend: 0, trendLabel: 'Recordable', color: C.green },
            { label: 'Near Misses',      value: '0',          trend: 0, trendLabel: 'Reported', color: C.green },
            { label: 'Open Actions',     value: '0',          trend: 0, trendLabel: 'Corrective', color: C.green },
            { label: 'Training Due',     value: '0',          trend: 0, trendLabel: 'Employees', color: C.green },
            { label: 'PPE Compliance',   value: '100', unit: '%', trend: 0, trendLabel: 'Audited', color: C.green },
            { label: 'Permits Active',   value: '0',          trend: 0, trendLabel: 'Hot work / confined', color: C.p },
            { label: 'OSHA Recordable',  value: '0',          trend: 0, trendLabel: 'YTD injuries', color: C.green },
            { label: 'JSA Reviews',      value: '0',          trend: 0, trendLabel: 'Job safety analysis', color: C.green },
          ]} />
        </HudCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── EMERGENCY MODAL ────────────────────────────────────── */}
      <Modal visible={showEmergencyModal} animationType="slide" transparent onRequestClose={() => setShowEmergencyModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.surf, borderTopWidth: 2, borderColor: C.red, padding: 20, paddingBottom: 36, maxHeight: '85%', position: 'relative' }}>
            <Brackets color={C.red} size={12} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 2, height: 14, backgroundColor: C.red }} />
                <Siren size={15} color={C.red} />
                <Text style={{ fontSize: 11, fontWeight: '900', color: C.text, letterSpacing: 3, fontFamily: MONO }}>
                  EMERGENCY PROTOCOL
                </Text>
              </View>
              <Pressable onPress={() => setShowEmergencyModal(false)} hitSlop={12}>
                <X size={18} color={C.textS} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 11, color: C.textS, marginBottom: 16, fontFamily: MONO, letterSpacing: 0.5 }}>
              SELECT TYPE — ROLL CALL STARTS IMMEDIATELY
            </Text>

            <Text style={{ fontSize: 8, color: C.textD, letterSpacing: 2, marginBottom: 8, fontFamily: MONO }}>LIVE EMERGENCY</Text>
            {[
              { type: 'fire', label: 'Fire Emergency', Icon: Flame, color: C.red },
              { type: 'tornado', label: 'Tornado Emergency', Icon: Tornado, color: C.purple },
              { type: 'active_shooter', label: 'Active Shooter', Icon: ShieldAlert, color: C.red },
            ].map(({ type, label, Icon, color }) => (
              <ModalRow key={type} Icon={Icon} color={color} title={label} sub="LIVE — STARTS ROLL CALL NOW"
                onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setShowEmergencyModal(false); router.push({ pathname: '/headcount/emergencyprotocol', params: { type, drill: 'false' } }); }}
              />
            ))}

            <Text style={{ fontSize: 8, color: C.textD, letterSpacing: 2, marginBottom: 8, marginTop: 12, fontFamily: MONO }}>DRILL MODE</Text>
            {[
              { type: 'fire', label: 'Fire Drill', Icon: Flame, color: C.amber },
              { type: 'tornado', label: 'Tornado Drill', Icon: Tornado, color: C.purple },
              { type: 'active_shooter', label: 'Active Shooter Drill', Icon: ShieldAlert, color: C.textS },
            ].map(({ type, label, Icon, color }) => (
              <ModalRow key={`drill-${type}`} Icon={Icon} color={C.p} title={label} sub="TRAINING EXERCISE — STARTS ROLL CALL"
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowEmergencyModal(false); router.push({ pathname: '/headcount/emergencyprotocol', params: { type, drill: 'true' } }); }}
              />
            ))}

            <TouchableOpacity activeOpacity={0.7} style={{ marginTop: 14, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: C.bdrB }}
              onPress={() => { setShowEmergencyModal(false); router.push('/safety/emergencyinitiation' as any); }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.p, fontFamily: MONO, letterSpacing: 1 }}>
                MORE EMERGENCY TYPES →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── FACILITY PICKER ─────────────────────────────────────── */}
      <Modal visible={showFacilityPicker} transparent animationType="fade" onRequestClose={() => setShowFacilityPicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 40 }} onPress={() => setShowFacilityPicker(false)}>
          <View style={{ backgroundColor: C.surf, borderWidth: 1, borderColor: C.bdrB, width: '100%', maxWidth: 320, position: 'relative' }}>
            <Brackets color={C.p} size={10} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.bdr }}>
              <View style={{ width: 2, height: 12, backgroundColor: C.p }} />
              <MapPin size={11} color={C.p} />
              <Text style={{ fontSize: 9, fontWeight: '900', color: C.p, letterSpacing: 2, fontFamily: MONO }}>SELECT FACILITY</Text>
            </View>
            {facilityNames.map(name => {
              const key = name === 'All Facilities' ? 'all' : name;
              const active = selectedFacility === key;
              return (
                <Pressable
                  key={name}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.bdr, backgroundColor: active ? C.p + '12' : 'transparent' }}
                  onPress={() => { setSelectedFacility(key); setShowFacilityPicker(false); }}
                >
                  <Text style={{ fontSize: 13, color: active ? C.p : C.text, fontFamily: MONO, fontWeight: active ? '700' : '400' }}>{name}</Text>
                  {active && <CheckCircle size={13} color={C.p} />}
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
