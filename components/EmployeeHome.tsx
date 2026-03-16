/**
 * components/EmployeeHome.tsx
 *
 * Unified HUD dashboard for ALL employee logins.
 * Modules filtered by role permissions — same screen for floor workers and managers.
 * Tony Stark HUD theme matching the rest of TulKenz OPS.
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Package,
  Wrench,
  Clock,
  ChevronRight,
  Target,
  ShoppingCart,
  CheckSquare,
  Megaphone,
  Users,
  LogOut,
  ClipboardList,
  Microscope,
  Droplets,
  HardHat,
  FileText,
  Shield,
  FlaskConical,
  BookOpen,
  BarChart2,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/contexts/UserContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useEmployees, SupabaseEmployee } from '@/hooks/useSupabaseEmployees';
import {
  useActiveTimeEntry,
  useIsOnBreak,
  useBreakHistory,
  useActiveBreak,
  TimePunch,
} from '@/hooks/useSupabaseTimeClock';

// ── HUD Theme ──────────────────────────────────────────────────
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
  teal:         '#00b894',
  blue:         '#3b82f6',
  orange:       '#f97316',
  text:         '#e0f4ff',
  textSec:      '#7aa8c8',
  textDim:      '#3a6080',
  border:       '#0d2840',
  borderBright: '#1a4060',
};

// ── Pulsing dot ────────────────────────────────────────────────
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

// ── Module definition ──────────────────────────────────────────
interface ModuleCardData {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  route: string;
  requiresClockIn?: boolean;
  permission?: string;
}

// Quick access — always visible regardless of permissions
const QUICK_ACCESS: ModuleCardData[] = [
  {
    key: 'taskfeed',
    title: 'Task Feed',
    description: 'Scheduled tasks, issue reports & purchase requests',
    icon: ClipboardList,
    color: HUD.cyan,
    route: '/(tabs)/taskfeed',
  },
  {
    key: 'bulletin',
    title: 'Bulletin Board',
    description: 'Company announcements and updates',
    icon: Megaphone,
    color: HUD.amber,
    route: '/(tabs)/portal/bulletin',
  },
  {
    key: 'directory',
    title: 'Company Directory',
    description: 'Find employees by name or department',
    icon: Users,
    color: HUD.purple,
    route: '/(tabs)/portal/directory',
  },
];

// Work modules — each gated by permission key
const WORK_MODULES: ModuleCardData[] = [
  { key: 'service',    title: 'Work Orders',   description: 'View and manage maintenance work orders',         icon: Wrench,       color: HUD.orange,  route: '/(tabs)/service',                permission: 'work_orders',            requiresClockIn: true  },
  { key: 'planner',   title: 'PM Planner',    description: 'Preventive maintenance schedules and tasks',      icon: Target,       color: HUD.purple,  route: '/(tabs)/planner',               permission: 'preventive_maintenance',  requiresClockIn: true  },
  { key: 'quality',   title: 'Quality',       description: 'NCRs, CAPAs, inspections & documentation',       icon: Microscope,   color: HUD.teal,    route: '/(tabs)/quality',               permission: 'quality',                requiresClockIn: true  },
  { key: 'sanitation',title: 'Sanitation',    description: 'Sanitation schedules, pre-op & ATP records',     icon: Droplets,     color: HUD.cyan,    route: '/(tabs)/sanitation',            permission: 'sanitation',             requiresClockIn: true  },
  { key: 'safety',    title: 'Safety',        description: 'OSHA permits, incidents & training records',     icon: HardHat,      color: HUD.amber,   route: '/(tabs)/safety',                permission: 'safety',                 requiresClockIn: true  },
  { key: 'inventory', title: 'Inventory',     description: 'Materials, stock levels & MRO parts',           icon: Package,      color: HUD.green,   route: '/(tabs)/inventory',             permission: 'inventory',              requiresClockIn: true  },
  { key: 'procurement',title:'Procurement',   description: 'Purchase orders and vendor management',          icon: ShoppingCart, color: HUD.amber,   route: '/(tabs)/procurement',           permission: 'procurement',            requiresClockIn: true  },
  { key: 'approvals', title: 'Approvals',     description: 'Review and approve pending requests',            icon: CheckSquare,  color: HUD.purple,  route: '/(tabs)/approvals',             permission: 'approvals',              requiresClockIn: true  },
  { key: 'portal',    title: 'Auditor Portal',description: 'Compliance audit access & frameworks',           icon: Shield,       color: HUD.teal,    route: '/(tabs)/quality/auditor',       permission: 'portal',                 requiresClockIn: false },
  { key: 'documents', title: 'Documents',     description: 'Policies, procedures, SOPs & forms',            icon: FileText,     color: HUD.blue,    route: '/(tabs)/documents',             permission: 'documents',              requiresClockIn: false },
  { key: 'sds',       title: 'SDS Manager',   description: 'Safety data sheets & chemical inventory',       icon: FlaskConical, color: HUD.red,     route: '/(tabs)/safety/sds',            permission: 'safety',                 requiresClockIn: false },
  { key: 'training',  title: 'Training',      description: 'Training records and certifications',           icon: BookOpen,     color: HUD.green,   route: '/(tabs)/safety/training',       permission: 'training',               requiresClockIn: false },
  { key: 'vendors',   title: 'Vendors',       description: 'Vendor approvals and supplier management',      icon: Users,        color: HUD.teal,    route: '/(tabs)/procurement/vendors',   permission: 'vendors',                requiresClockIn: false },
  { key: 'reports',   title: 'Reports',       description: 'Analytics, KPIs and performance reports',       icon: BarChart2,    color: HUD.purple,  route: '/(tabs)/reports',               permission: 'reports',                requiresClockIn: false },
];

// ══════════════════════════════════════════════════════════════
export default function EmployeeHome() {
  const { userProfile, signOut } = useUser();
  const { hasAnyPermission } = usePermissions();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: supabaseEmployees = [] } = useEmployees({ status: 'active' });

  const currentEmployee = useMemo((): SupabaseEmployee | null => {
    if (!userProfile || supabaseEmployees.length === 0) return supabaseEmployees[0] || null;
    return supabaseEmployees.find(e => e.email === userProfile.email) || supabaseEmployees[0] || null;
  }, [userProfile, supabaseEmployees]);

  const employeeId = currentEmployee?.id;

  const { data: activeTimeEntryData, refetch: refetchTimeEntry } = useActiveTimeEntry(employeeId);
  const { data: onBreakData, refetch: refetchBreakStatus } = useIsOnBreak(employeeId);
  const { data: breakHistory = [], refetch: refetchBreakHistory } = useBreakHistory(employeeId);
  const { data: activeBreakData } = useActiveBreak(employeeId);

  const activeTimeEntry = useMemo(() => {
    if (!activeTimeEntryData) return null;
    return {
      id: activeTimeEntryData.id,
      clockIn: activeTimeEntryData.clock_in,
      clockOut: activeTimeEntryData.clock_out,
      totalHours: activeTimeEntryData.total_hours,
      breakMinutes: activeTimeEntryData.break_minutes,
      status: activeTimeEntryData.status,
      date: activeTimeEntryData.date,
    };
  }, [activeTimeEntryData]);

  const onBreak = onBreakData ?? false;
  const isClockedIn = !!activeTimeEntry;

  const breakDetails = useMemo(() => {
    if (!breakHistory || breakHistory.length === 0) return null;
    const breaks: { startTime: string; endTime: string | null; duration: number; breakType: 'paid' | 'unpaid'; scheduledMinutes: number; }[] = [];
    let currentBreakStart: (TimePunch & { break_type?: string; scheduled_minutes?: number }) | null = null;
    let paidBreakMinutes = 0;
    let unpaidBreakMinutes = 0;
    for (const punch of breakHistory as (TimePunch & { break_type?: string; scheduled_minutes?: number })[]) {
      if (punch.type === 'break_start') {
        currentBreakStart = punch;
      } else if (punch.type === 'break_end' && currentBreakStart) {
        const duration = Math.round((new Date(punch.timestamp).getTime() - new Date(currentBreakStart.timestamp).getTime()) / 60000);
        const breakType = (currentBreakStart.break_type || 'unpaid') as 'paid' | 'unpaid';
        if (breakType === 'paid') paidBreakMinutes += duration; else unpaidBreakMinutes += duration;
        breaks.push({ startTime: currentBreakStart.timestamp, endTime: punch.timestamp, duration, breakType, scheduledMinutes: currentBreakStart.scheduled_minutes || 30 });
        currentBreakStart = null;
      }
    }
    if (currentBreakStart) {
      const duration = Math.round((new Date().getTime() - new Date(currentBreakStart.timestamp).getTime()) / 60000);
      breaks.push({ startTime: currentBreakStart.timestamp, endTime: null, duration, breakType: (currentBreakStart.break_type || 'unpaid') as 'paid' | 'unpaid', scheduledMinutes: currentBreakStart.scheduled_minutes || 30 });
    }
    return { breaks, totalBreakMinutes: paidBreakMinutes + unpaidBreakMinutes, totalDeductibleBreakMinutes: unpaidBreakMinutes, paidBreakMinutes, unpaidBreakMinutes };
  }, [breakHistory]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const displayName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Employee';
  const position = userProfile?.position || currentEmployee?.position || '';

  // Filter work modules by permissions
  const visibleWorkModules = useMemo(() =>
    WORK_MODULES.filter(m => !m.permission || hasAnyPermission(m.permission)),
    [hasAnyPermission]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTimeEntry(), refetchBreakStatus(), refetchBreakHistory()]);
    setRefreshing(false);
  }, [refetchTimeEntry, refetchBreakStatus, refetchBreakHistory]);

  const handleLogout = useCallback(() => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await signOut();
        router.replace('/login');
      }},
    ]);
  }, [signOut, router]);

  const handleModulePress = useCallback((card: ModuleCardData) => {
    if (card.requiresClockIn && !isClockedIn) {
      Alert.alert(
        'Check In Required',
        'You must check in before accessing work modules.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Time Clock', onPress: () => router.push('/(tabs)/portal' as any) },
        ]
      );
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(card.route as any);
  }, [router, isClockedIn]);

  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const formatDuration = (clockIn: string, breakMins: number = 0) => {
    const mins = Math.floor((new Date().getTime() - new Date(clockIn).getTime()) / 60000) - breakMins;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };
  const formatBreakDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const clockColor = isClockedIn ? (onBreak ? HUD.amber : HUD.green) : HUD.textDim;
  const clockLabel = isClockedIn ? (onBreak ? 'ON BREAK' : 'CHECKED IN') : 'NOT CHECKED IN';

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <PulsingDot color={clockColor} />
                <Text style={s.eyebrow}>EMPLOYEE PORTAL</Text>
              </View>
              <Text style={s.userName}>{displayName}</Text>
              {!!position && <Text style={s.position}>{position}</Text>}
            </View>
            <Pressable style={s.logoutBtn} onPress={handleLogout}>
              <LogOut size={18} color={HUD.red} />
            </Pressable>
          </View>
        </View>

        {/* ── TIME TRACKING ── */}
        <View style={s.card}>
          {/* Card header */}
          <View style={s.cardHead}>
            <View style={[s.headIcon, { backgroundColor: HUD.cyanDim }]}>
              <Clock size={13} color={HUD.cyan} />
            </View>
            <Text style={[s.cardHeadLabel, { color: HUD.cyan }]}>TIME TRACKING</Text>
            <View style={[s.pill, { backgroundColor: clockColor + '22', borderColor: clockColor + '55' }]}>
              <PulsingDot color={clockColor} />
              <Text style={[s.pillText, { color: clockColor }]}>{clockLabel}</Text>
            </View>
          </View>

          {/* Time display */}
          <View style={s.timeCenter}>
            <Text style={s.bigTime}>{formatTime(currentTime)}</Text>
            <Text style={s.dateText}>{formatDate(currentTime)}</Text>
          </View>

          {/* Shift stats */}
          {isClockedIn && activeTimeEntry?.clockIn && (
            <View style={s.shiftRow}>
              <View style={s.shiftItem}>
                <Text style={s.shiftLabel}>SHIFT STARTED</Text>
                <Text style={s.shiftVal}>
                  {new Date(activeTimeEntry.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={s.shiftDiv} />
              <View style={s.shiftItem}>
                <Text style={s.shiftLabel}>BREAK</Text>
                <Text style={[s.shiftVal, { color: HUD.amber }]}>
                  {formatBreakDuration(breakDetails?.totalBreakMinutes ?? activeTimeEntry.breakMinutes ?? 0)}
                </Text>
                {breakDetails && (breakDetails.paidBreakMinutes > 0 || breakDetails.unpaidBreakMinutes > 0) && (
                  <Text style={s.breakHint}>
                    {breakDetails.paidBreakMinutes > 0 ? `${breakDetails.paidBreakMinutes}m paid` : ''}
                    {breakDetails.paidBreakMinutes > 0 && breakDetails.unpaidBreakMinutes > 0 ? ' · ' : ''}
                    {breakDetails.unpaidBreakMinutes > 0 ? `${breakDetails.unpaidBreakMinutes}m unpaid` : ''}
                  </Text>
                )}
              </View>
              <View style={s.shiftDiv} />
              <View style={s.shiftItem}>
                <Text style={s.shiftLabel}>WORKING</Text>
                <Text style={[s.shiftVal, { color: HUD.cyan }]}>
                  {formatDuration(activeTimeEntry.clockIn, breakDetails?.totalDeductibleBreakMinutes ?? activeTimeEntry.breakMinutes ?? 0)}
                </Text>
              </View>
            </View>
          )}

          {/* Break history chips */}
          {isClockedIn && breakDetails && breakDetails.breaks.length > 0 && (
            <View style={s.breakChips}>
              {breakDetails.breaks.map((brk, idx) => {
                const isPaid = brk.breakType === 'paid';
                const c = isPaid ? HUD.green : HUD.amber;
                return (
                  <View key={idx} style={[s.breakChip, { backgroundColor: c + '15', borderColor: c + '40' }]}>
                    <Text style={[s.breakChipLabel, { color: c }]}>{isPaid ? 'PAID' : 'UNPAID'}</Text>
                    <Text style={s.breakChipTime}>
                      {new Date(brk.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {brk.endTime
                        ? ` → ${new Date(brk.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                        : <Text style={{ color: c }}> (active)</Text>
                      }
                    </Text>
                    <Text style={s.breakChipDur}>{formatBreakDuration(brk.duration)}{!isPaid ? ' deducted' : ''}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* View history link */}
          <Pressable
            style={s.historyLink}
            onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/portal' as any); }}
          >
            <Clock size={14} color={HUD.cyan} />
            <Text style={s.historyLinkText}>{isClockedIn ? 'View Time History & Schedule' : 'Check In / View Schedule'}</Text>
            <ChevronRight size={14} color={HUD.cyan} />
          </Pressable>
        </View>

        {/* ── QUICK ACCESS ── */}
        <View style={s.sectionHead}>
          <View style={[s.headIcon, { backgroundColor: HUD.amberDim }]}>
            <Zap size={13} color={HUD.amber} />
          </View>
          <Text style={[s.sectionLabel, { color: HUD.amber }]}>QUICK ACCESS</Text>
        </View>

        <View style={s.moduleList}>
          {QUICK_ACCESS.map(card => {
            const Icon = card.icon;
            return (
              <Pressable
                key={card.key}
                style={s.moduleRow}
                onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(card.route as any); }}
              >
                <View style={[s.modIcon, { backgroundColor: card.color + '18' }]}>
                  <Icon size={20} color={card.color} />
                </View>
                <View style={s.modContent}>
                  <Text style={s.modTitle}>{card.title}</Text>
                  <Text style={s.modDesc}>{card.description}</Text>
                </View>
                <ChevronRight size={16} color={HUD.textDim} />
              </Pressable>
            );
          })}
        </View>

        {/* ── WORK MODULES ── */}
        {visibleWorkModules.length > 0 && (
          <>
            <View style={s.sectionHead}>
              <View style={[s.headIcon, { backgroundColor: HUD.cyanDim }]}>
                <Wrench size={13} color={HUD.cyan} />
              </View>
              <Text style={[s.sectionLabel, { color: HUD.cyan }]}>WORK MODULES</Text>
              {!isClockedIn && (
                <View style={[s.hint, { backgroundColor: HUD.amberDim }]}>
                  <Clock size={10} color={HUD.amber} />
                  <Text style={[s.hintText, { color: HUD.amber }]}>Check in required for some</Text>
                </View>
              )}
            </View>

            <View style={s.moduleList}>
              {visibleWorkModules.map(card => {
                const Icon = card.icon;
                const locked = !!card.requiresClockIn && !isClockedIn;
                return (
                  <Pressable
                    key={card.key}
                    style={[s.moduleRow, locked && s.moduleRowLocked]}
                    onPress={() => handleModulePress(card)}
                  >
                    <View style={[s.modIcon, { backgroundColor: locked ? HUD.textDim + '18' : card.color + '18' }]}>
                      <Icon size={20} color={locked ? HUD.textDim : card.color} />
                    </View>
                    <View style={s.modContent}>
                      <Text style={[s.modTitle, locked && { color: HUD.textDim }]}>{card.title}</Text>
                      <Text style={s.modDesc}>{card.description}</Text>
                    </View>
                    {locked
                      ? <View style={[s.lockBadge, { backgroundColor: HUD.amberDim }]}><Clock size={11} color={HUD.amber} /></View>
                      : <ChevronRight size={16} color={HUD.textDim} />
                    }
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: HUD.bg },
  scroll:       { flex: 1 },
  scrollContent:{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 40 },

  // Header
  header:   { marginBottom: 16 },
  headerRow:{ flexDirection: 'row', alignItems: 'flex-start' },
  eyebrow:  { fontSize: 10, fontWeight: '800', color: HUD.textDim, letterSpacing: 2 },
  userName: { fontSize: 26, fontWeight: '900', color: HUD.text, letterSpacing: -0.5, marginTop: 2 },
  position: { fontSize: 13, color: HUD.textSec, marginTop: 2 },
  logoutBtn:{ width: 38, height: 38, borderRadius: 10, backgroundColor: HUD.redDim, borderWidth: 1, borderColor: HUD.red + '40', alignItems: 'center', justifyContent: 'center' },

  // Card
  card:        { backgroundColor: HUD.bgCard, borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, padding: 14, marginBottom: 16 },
  cardHead:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  headIcon:    { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  cardHeadLabel:{ fontSize: 10, fontWeight: '900', letterSpacing: 2, flex: 1 },

  // Status pill
  pill:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  pillText:{ fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  // Time
  timeCenter:{ alignItems: 'center', marginBottom: 14 },
  bigTime:   { fontSize: 36, fontWeight: '900', color: HUD.text, fontVariant: ['tabular-nums'] as any, letterSpacing: -1 },
  dateText:  { fontSize: 12, color: HUD.textSec, marginTop: 2 },

  // Shift row
  shiftRow: { flexDirection: 'row', backgroundColor: HUD.bg, borderRadius: 10, padding: 12, marginBottom: 12 },
  shiftItem:{ flex: 1, alignItems: 'center' },
  shiftLabel:{ fontSize: 8, fontWeight: '800', color: HUD.textDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 },
  shiftVal: { fontSize: 15, fontWeight: '700', color: HUD.text },
  shiftDiv: { width: 1, backgroundColor: HUD.border, marginVertical: 2 },
  breakHint:{ fontSize: 9, color: HUD.textDim, marginTop: 2 },

  // Break chips
  breakChips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  breakChip:   { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  breakChipLabel:{ fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  breakChipTime: { fontSize: 11, color: HUD.text, fontWeight: '500' },
  breakChipDur:  { fontSize: 10, color: HUD.textSec, marginTop: 1 },

  // View history
  historyLink:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: HUD.border, gap: 6 },
  historyLinkText:{ fontSize: 13, fontWeight: '600', color: HUD.cyan },

  // Section headers
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 6 },
  sectionLabel:{ fontSize: 10, fontWeight: '900', letterSpacing: 2, flex: 1 },
  hint:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  hintText:    { fontSize: 9, fontWeight: '700' },

  // Module rows
  moduleList:    { gap: 8, marginBottom: 16 },
  moduleRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: HUD.bgCard, borderRadius: 12, borderWidth: 1, borderColor: HUD.border, padding: 13, gap: 12 },
  moduleRowLocked:{ opacity: 0.55 },
  modIcon:       { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  modContent:    { flex: 1 },
  modTitle:      { fontSize: 14, fontWeight: '700', color: HUD.text, marginBottom: 2 },
  modDesc:       { fontSize: 11, color: HUD.textSec, lineHeight: 15 },
  lockBadge:     { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
