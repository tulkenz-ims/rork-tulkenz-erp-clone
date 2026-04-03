import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import {
  Search, X, Check, ChevronLeft, GitBranch,
  UserPlus, Users, Building2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// ── Types ──────────────────────────────────────────────────────
interface Department {
  id: string;
  department_code: string;
  name: string;
  color: string;
  budgeted_headcount: number;
  actual_headcount: number;
  sort_order: number;
}

interface Position {
  id: string;
  position_code: string;
  title: string;
  short_title: string;
  job_level: string;
  budgeted_headcount: number;
  filled_headcount: number;
  open_positions: number;
  supervisory_role: boolean;
  sort_order: number;
  reports_to_position_title: string | null;
  reports_to_position_id: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position_id: string | null;
  position: string | null;
  department_code: string | null;
  manager_id: string | null;
}

interface PositionWithEmployees extends Position {
  employees: Employee[];
  children: PositionWithEmployees[];
}

// ── Helpers ────────────────────────────────────────────────────
function initials(emp: Employee) {
  return `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase();
}

function buildPositionTree(positions: Position[], employees: Employee[]): PositionWithEmployees[] {
  const byId: Record<string, PositionWithEmployees> = {};
  positions.forEach(p => {
    byId[p.id] = {
      ...p,
      employees: employees.filter(e => e.position_id === p.id),
      children: [],
    };
  });

  const roots: PositionWithEmployees[] = [];
  positions.forEach(p => {
    if (p.reports_to_position_id && byId[p.reports_to_position_id]) {
      byId[p.reports_to_position_id].children.push(byId[p.id]);
    } else {
      roots.push(byId[p.id]);
    }
  });

  // Sort children by sort_order
  const sortChildren = (nodes: PositionWithEmployees[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach(n => sortChildren(n.children));
  };
  sortChildren(roots);
  roots.sort((a, b) => a.sort_order - b.sort_order);

  return roots;
}

// ── Slot Card ──────────────────────────────────────────────────
function SlotCard({
  employee,
  position,
  deptColor,
  colors,
  isHUD,
  onPress,
}: {
  employee: Employee | null;
  position: Position;
  deptColor: string;
  colors: any;
  isHUD: boolean;
  onPress: () => void;
}) {
  const bg   = isHUD ? '#050f1e' : colors.surface;
  const bdr  = isHUD ? '#1a4060' : colors.border;

  if (employee) {
    return (
      <Pressable
        style={[
          S.slotCard,
          {
            backgroundColor: bg,
            borderColor: deptColor + '50',
            borderLeftColor: deptColor,
          },
        ]}
        onPress={onPress}
      >
        <View style={[S.slotAccent, { backgroundColor: deptColor }]} />
        <View style={[S.slotAvatar, { backgroundColor: deptColor + '22' }]}>
          <Text style={[S.slotAvatarText, { color: deptColor, fontFamily: MONO }]}>
            {initials(employee)}
          </Text>
        </View>
        <Text style={[S.slotName, { color: colors.text }]} numberOfLines={1}>
          {employee.first_name}
        </Text>
        <Text style={[S.slotLast, { color: colors.text }]} numberOfLines={1}>
          {employee.last_name}
        </Text>
        <Text style={[S.slotTitle, { color: colors.textSecondary, fontFamily: MONO }]} numberOfLines={2}>
          {position.short_title || position.title}
        </Text>
        <View style={[S.slotBadge, { backgroundColor: deptColor + '18', borderColor: deptColor + '35' }]}>
          <Text style={[S.slotBadgeText, { color: deptColor, fontFamily: MONO }]}>FILLED</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[S.slotCard, S.slotCardOpen, { backgroundColor: isHUD ? '#020912' : colors.backgroundSecondary, borderColor: bdr }]}
      onPress={onPress}
    >
      <View style={[S.slotAvatar, { backgroundColor: colors.textTertiary + '15' }]}>
        <UserPlus size={14} color={colors.textTertiary} />
      </View>
      <Text style={[S.slotName, { color: colors.textSecondary }]}>Open</Text>
      <Text style={[S.slotTitle, { color: colors.textSecondary, fontFamily: MONO }]} numberOfLines={2}>
        {position.short_title || position.title}
      </Text>
      <View style={[S.slotBadge, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
        <Text style={[S.slotBadgeText, { color: colors.error, fontFamily: MONO }]}>HIRE</Text>
      </View>
    </Pressable>
  );
}

// ── Cluster (multiple slots for same position) ─────────────────
function PositionCluster({
  position,
  deptColor,
  colors,
  isHUD,
  onSlotPress,
}: {
  position: PositionWithEmployees;
  deptColor: string;
  colors: any;
  isHUD: boolean;
  onSlotPress: () => void;
}) {
  const bdr = isHUD ? '#1a4060' : colors.border;
  const slots = Array.from({ length: position.budgeted_headcount }).map((_, i) => ({
    employee: position.employees[i] || null,
    index: i,
  }));

  if (position.budgeted_headcount === 1) {
    return (
      <SlotCard
        employee={position.employees[0] || null}
        position={position}
        deptColor={deptColor}
        colors={colors}
        isHUD={isHUD}
        onPress={onSlotPress}
      />
    );
  }

  return (
    <View style={S.cluster}>
      <View style={[S.clusterHeader, { backgroundColor: deptColor + '15', borderColor: deptColor + '30' }]}>
        <Text style={[S.clusterTitle, { color: deptColor, fontFamily: MONO }]}>
          {position.title.toUpperCase()}
        </Text>
        <Text style={[S.clusterCount, { color: deptColor, fontFamily: MONO }]}>
          {position.employees.length}/{position.budgeted_headcount}
        </Text>
      </View>
      <View style={S.clusterSlots}>
        {slots.map(({ employee, index }) => (
          <SlotCard
            key={index}
            employee={employee}
            position={position}
            deptColor={deptColor}
            colors={colors}
            isHUD={isHUD}
            onPress={onSlotPress}
          />
        ))}
      </View>
    </View>
  );
}

// ── Tree Node ──────────────────────────────────────────────────
function TreeNode({
  position,
  deptColor,
  colors,
  isHUD,
  isRoot,
  onSlotPress,
}: {
  position: PositionWithEmployees;
  deptColor: string;
  colors: any;
  isHUD: boolean;
  isRoot: boolean;
  onSlotPress: () => void;
}) {
  const bdrColor = isHUD ? '#1a4060' : colors.border;
  const hasChildren = position.children.length > 0;

  return (
    <View style={S.treeNode}>
      {/* The position cluster */}
      <PositionCluster
        position={position}
        deptColor={deptColor}
        colors={colors}
        isHUD={isHUD}
        onSlotPress={onSlotPress}
      />

      {/* Connector down */}
      {hasChildren && (
        <View style={[S.connectorDown, { backgroundColor: bdrColor }]} />
      )}

      {/* Children row */}
      {hasChildren && (
        <View style={S.childrenWrap}>
          {/* Horizontal bar connecting children */}
          {position.children.length > 1 && (
            <View style={[S.connectorHBar, { backgroundColor: bdrColor }]} />
          )}
          <View style={S.childrenRow}>
            {position.children.map((child, i) => (
              <View key={child.id} style={S.childBranch}>
                {/* Vertical drop to child */}
                <View style={[S.connectorUp, { backgroundColor: bdrColor }]} />
                <TreeNode
                  position={child}
                  deptColor={deptColor}
                  colors={colors}
                  isHUD={isHUD}
                  isRoot={false}
                  onSlotPress={onSlotPress}
                />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Dept Card (company overview) ───────────────────────────────
function DeptCard({
  dept,
  colors,
  isHUD,
  onPress,
}: {
  dept: Department;
  colors: any;
  isHUD: boolean;
  onPress: () => void;
}) {
  const bg  = isHUD ? '#050f1e' : colors.surface;
  const bdr = isHUD ? '#1a4060' : colors.border;
  const open = Math.max(0, (dept.budgeted_headcount || 0) - (dept.actual_headcount || 0));
  const pct  = dept.budgeted_headcount > 0
    ? Math.round((dept.actual_headcount / dept.budgeted_headcount) * 100)
    : 0;
  const barColor = pct >= 80 ? colors.success : pct >= 40 ? colors.warning : colors.error;

  return (
    <Pressable
      style={({ pressed }) => [
        S.deptCard,
        {
          backgroundColor: bg,
          borderColor: bdr,
          borderLeftColor: dept.color,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={S.deptCardTop}>
        <View style={[S.deptDot, { backgroundColor: dept.color }]} />
        <Text style={[S.deptName, { color: colors.text }]}>{dept.name}</Text>
      </View>
      <View style={S.deptCounts}>
        <Text style={[S.deptFilled, { color: colors.success }]}>{dept.actual_headcount || 0}</Text>
        <Text style={[S.deptSlash, { color: colors.textSecondary }]}>/</Text>
        <Text style={[S.deptBudget, { color: colors.text }]}>{dept.budgeted_headcount || 0}</Text>
        {open > 0 && (
          <View style={[S.openBadge, { backgroundColor: colors.warning + '20', borderColor: colors.warning + '40' }]}>
            <Text style={[S.openBadgeText, { color: colors.warning, fontFamily: MONO }]}>{open} OPEN</Text>
          </View>
        )}
      </View>
      <View style={[S.fillTrack, { backgroundColor: isHUD ? '#1a4060' : colors.border }]}>
        <View style={[S.fillBar, { width: `${Math.min(100, pct)}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[S.fillPct, { color: colors.textSecondary }]}>{pct}% staffed</Text>
    </Pressable>
  );
}

// ── Main Screen ────────────────────────────────────────────────
export default function OrgChartScreen() {
  const { colors, isHUD } = useTheme();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [showManagerPicker, setShowManagerPicker] = useState(false);
  const [search, setSearch] = useState('');

  const bg   = isHUD ? '#020912' : colors.background;
  const surf = isHUD ? '#050f1e' : colors.surface;
  const bdr  = isHUD ? '#1a4060' : colors.border;
  const cyan = isHUD ? '#00D4EE' : colors.primary;

  // ── Departments ────────────────────────────────────────────────
  const { data: departments = [], isLoading: deptsLoading } = useQuery({
    queryKey: ['org-departments', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('departments')
        .select('id, department_code, name, color, budgeted_headcount, actual_headcount, sort_order')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!organizationId,
  });

  // ── Positions for selected dept ────────────────────────────────
  const { data: positions = [], isLoading: posLoading } = useQuery({
    queryKey: ['org-positions', organizationId, selectedDept?.department_code],
    queryFn: async () => {
      if (!organizationId || !selectedDept) return [];
      const { data, error } = await supabase
        .from('positions')
        .select('id, position_code, title, short_title, job_level, budgeted_headcount, filled_headcount, open_positions, supervisory_role, sort_order, reports_to_position_title, reports_to_position_id')
        .eq('organization_id', organizationId)
        .eq('department_code', selectedDept.department_code)
        .eq('status', 'active')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Position[];
    },
    enabled: !!organizationId && !!selectedDept,
  });

  // ── Employees for selected dept ────────────────────────────────
  const { data: deptEmployees = [], isLoading: empLoading } = useQuery({
    queryKey: ['org-employees', organizationId, selectedDept?.department_code],
    queryFn: async () => {
      if (!organizationId || !selectedDept) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position_id, position, department_code, manager_id')
        .eq('organization_id', organizationId)
        .eq('department_code', selectedDept.department_code)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!organizationId && !!selectedDept,
  });

  // ── Build tree ──────────────────────────────────────────────────
  const positionTree = useMemo(
    () => buildPositionTree(positions, deptEmployees),
    [positions, deptEmployees]
  );

  // ── Fade transition ─────────────────────────────────────────────
  const fade = (cb: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
      cb();
      Animated.timing(fadeAnim, { toValue: 1, duration: 170, useNativeDriver: true }).start();
    });
  };

  const handleDeptPress = useCallback((dept: Department) => {
    fade(() => setSelectedDept(dept));
  }, []);

  const handleBack = useCallback(() => {
    fade(() => setSelectedDept(null));
  }, []);

  // ── Loading ─────────────────────────────────────────────────────
  if (deptsLoading) {
    return (
      <View style={[S.center, { backgroundColor: bg }]}>
        <ActivityIndicator color={cyan} size="large" />
        <Text style={[S.loadingText, { color: colors.textSecondary, fontFamily: MONO }]}>
          LOADING ORG CHART...
        </Text>
      </View>
    );
  }

  // ── Dept drill-down view ────────────────────────────────────────
  if (selectedDept) {
    const totalFilled   = positions.reduce((s, p) => s + p.filled_headcount, 0);
    const totalBudgeted = positions.reduce((s, p) => s + p.budgeted_headcount, 0);
    const totalOpen     = totalBudgeted - totalFilled;

    return (
      <View style={[S.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={[S.topBar, { backgroundColor: surf, borderBottomColor: bdr }]}>
          <TouchableOpacity style={S.backBtn} onPress={handleBack}>
            <ChevronLeft size={17} color={cyan} />
            <Text style={[S.backText, { color: cyan, fontFamily: MONO }]}>COMPANY</Text>
          </TouchableOpacity>
          <View style={[S.deptDot, { backgroundColor: selectedDept.color }]} />
          <Text style={[S.topBarTitle, { color: colors.text }]}>{selectedDept.name}</Text>
          <Text style={[S.topBarCount, { color: colors.textSecondary, fontFamily: MONO }]}>
            {totalFilled}/{totalBudgeted} · {totalOpen} OPEN
          </Text>
        </View>

        {/* Tree */}
        <Animated.ScrollView
          style={{ flex: 1, opacity: fadeAnim }}
          contentContainerStyle={S.treeScroll}
          showsVerticalScrollIndicator={false}
          horizontal={false}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={S.treeRoot}>
              {posLoading || empLoading ? (
                <View style={S.center}>
                  <ActivityIndicator color={cyan} />
                </View>
              ) : positionTree.length === 0 ? (
                <View style={S.empty}>
                  <GitBranch size={32} color={colors.textTertiary} />
                  <Text style={[S.emptyText, { color: colors.textSecondary }]}>
                    No positions defined yet
                  </Text>
                </View>
              ) : (
                positionTree.map(root => (
                  <TreeNode
                    key={root.id}
                    position={root}
                    deptColor={selectedDept.color}
                    colors={colors}
                    isHUD={isHUD}
                    isRoot={true}
                    onSlotPress={() => {}}
                  />
                ))
              )}
            </View>
          </ScrollView>
        </Animated.ScrollView>
      </View>
    );
  }

  // ── Company overview ────────────────────────────────────────────
  const totalBudgeted = departments.reduce((s, d) => s + (d.budgeted_headcount || 0), 0);
  const totalActual   = departments.reduce((s, d) => s + (d.actual_headcount || 0), 0);

  return (
    <View style={[S.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[S.topBar, { backgroundColor: surf, borderBottomColor: bdr }]}>
        <View style={S.topBarLeft}>
          <GitBranch size={13} color={cyan} />
          <Text style={[S.topBarLabel, { color: cyan, fontFamily: MONO }]}>ORG CHART</Text>
        </View>
        <Text style={[S.topBarCount, { color: colors.textSecondary, fontFamily: MONO }]}>
          {totalActual}/{totalBudgeted} COMPANY TOTAL
        </Text>
      </View>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={S.deptGrid}
        showsVerticalScrollIndicator={false}
      >
        {departments.map(dept => (
          <DeptCard
            key={dept.id}
            dept={dept}
            colors={colors}
            isHUD={isHUD}
            onPress={() => handleDeptPress(dept)}
          />
        ))}
        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const S = StyleSheet.create({
  container:   { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText: { fontSize: 11, letterSpacing: 2, marginTop: 8 },

  // Top bar
  topBar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  topBarLabel:{ fontSize: 11, fontWeight: '800' as const, letterSpacing: 2 },
  topBarTitle:{ flex: 1, fontSize: 14, fontWeight: '600' as const },
  topBarCount:{ fontSize: 9, letterSpacing: 1 },
  backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  backText:   { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1 },
  deptDot:    { width: 10, height: 10, borderRadius: 5 },

  // Dept grid (company view)
  deptGrid: { padding: 12, gap: 10 },
  deptCard: {
    borderRadius: 12, borderWidth: 1, borderLeftWidth: 3,
    padding: 14, gap: 6,
  },
  deptCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptName:    { flex: 1, fontSize: 14, fontWeight: '600' as const },
  deptCounts:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deptFilled:  { fontSize: 18, fontWeight: '700' as const },
  deptSlash:   { fontSize: 14 },
  deptBudget:  { fontSize: 15, fontWeight: '600' as const },
  openBadge:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  openBadgeText:{ fontSize: 9, fontWeight: '800' as const, letterSpacing: 0.5 },
  fillTrack:   { height: 4, borderRadius: 2, overflow: 'hidden' },
  fillBar:     { height: '100%' as any, borderRadius: 2 },
  fillPct:     { fontSize: 10 },

  // Tree layout
  treeScroll:  { padding: 16, paddingBottom: 60 },
  treeRoot:    { flexDirection: 'column', alignItems: 'center', gap: 0, paddingBottom: 40 },
  treeNode:    { flexDirection: 'column', alignItems: 'center' },
  connectorDown:{ width: 1, height: 20 },
  childrenWrap: { position: 'relative', flexDirection: 'column', alignItems: 'center' },
  connectorHBar:{ height: 1, position: 'absolute', top: 0, left: '10%', right: '10%' },
  childrenRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  childBranch:  { flexDirection: 'column', alignItems: 'center' },
  connectorUp:  { width: 1, height: 16 },

  // Slot card
  slotCard: {
    width: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  slotCardOpen: { borderStyle: 'dashed', borderLeftWidth: 1, opacity: 0.75 },
  slotAccent:    { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  slotAvatar:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  slotAvatarText:{ fontSize: 13, fontWeight: '900' as const },
  slotName:      { fontSize: 12, fontWeight: '700' as const, textAlign: 'center' },
  slotLast:      { fontSize: 12, fontWeight: '700' as const, textAlign: 'center', marginBottom: 3 },
  slotTitle:     { fontSize: 8, textAlign: 'center', letterSpacing: 0.3, lineHeight: 12, marginBottom: 5 },
  slotBadge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  slotBadgeText: { fontSize: 8, fontWeight: '800' as const, letterSpacing: 0.5 },

  // Cluster
  cluster:       { alignItems: 'center' },
  clusterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, marginBottom: 8, gap: 8 },
  clusterTitle:  { fontSize: 9, fontWeight: '800' as const, letterSpacing: 1 },
  clusterCount:  { fontSize: 11, fontWeight: '700' as const },
  clusterSlots:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 500 },

  // Empty
  empty:     { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyText: { fontSize: 13 },
});
