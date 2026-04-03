import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TouchableOpacity, ActivityIndicator, Platform, Animated,
} from 'react-native';
import { ChevronLeft, GitBranch, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
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
  reports_to_position_id: string | null;
  reports_to_position_title: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position_id: string | null;
}

interface PositionNode extends Position {
  employees: Employee[];
  children: PositionNode[];
}

// ── Helpers ────────────────────────────────────────────────────
function initials(e: Employee) {
  return `${e.first_name[0]}${e.last_name[0]}`.toUpperCase();
}

function buildTree(positions: Position[], employees: Employee[]): PositionNode[] {
  const byId: Record<string, PositionNode> = {};
  positions.forEach(p => {
    byId[p.id] = { ...p, employees: employees.filter(e => e.position_id === p.id), children: [] };
  });
  const roots: PositionNode[] = [];
  positions.forEach(p => {
    if (p.reports_to_position_id && byId[p.reports_to_position_id]) {
      byId[p.reports_to_position_id].children.push(byId[p.id]);
    } else {
      roots.push(byId[p.id]);
    }
  });
  const sort = (nodes: PositionNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach(n => sort(n.children));
  };
  sort(roots);
  return roots;
}

// ── Tree Row (left-aligned, indented) ──────────────────────────
function TreeRow({
  node, deptColor, colors, isHUD, depth,
}: {
  node: PositionNode;
  deptColor: string;
  colors: any;
  isHUD: boolean;
  depth: number;
}) {
  const bdr    = isHUD ? '#1a4060' : colors.border;
  const bg     = isHUD ? '#050f1e' : colors.surface;
  const indent = depth * 20;

  const slots = Array.from({ length: node.budgeted_headcount }).map((_, i) => ({
    emp: node.employees[i] || null,
    i,
  }));

  return (
    <View>
      {/* Row card */}
      <View style={{ paddingLeft: indent }}>
        <View style={[
          S.rowCard,
          {
            backgroundColor: bg,
            borderColor: depth === 0 ? deptColor + '55' : bdr,
            borderLeftColor: deptColor,
          },
        ]}>
          {depth === 0 && <View style={[S.rowAccent, { backgroundColor: deptColor }]} />}

          {/* Title row */}
          <View style={S.rowTop}>
            <View style={{ flex: 1 }}>
              <Text style={[S.rowTitle, { color: colors.text }]}>{node.title}</Text>
              <View style={S.rowPills}>
                <View style={[S.pill, { backgroundColor: deptColor + '18', borderColor: deptColor + '35' }]}>
                  <Text style={[S.pillText, { color: deptColor, fontFamily: MONO }]}>
                    {node.job_level.toUpperCase()}
                  </Text>
                </View>
                {node.supervisory_role && (
                  <View style={[S.pill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                    <Text style={[S.pillText, { color: colors.primary, fontFamily: MONO }]}>SUPERVISORY</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Headcount summary */}
            <View style={S.rowCount}>
              <Text style={[S.countFilled, { color: colors.success }]}>{node.employees.length}</Text>
              <Text style={[S.countSlash, { color: colors.textSecondary }]}>/</Text>
              <Text style={[S.countTotal, { color: colors.text }]}>{node.budgeted_headcount}</Text>
              {(node.open_positions || 0) > 0 && (
                <View style={[S.openBadge, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
                  <Text style={[S.openBadgeText, { color: colors.error, fontFamily: MONO }]}>
                    {node.open_positions} OPEN
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Slot cards */}
          {node.budgeted_headcount > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.slotsRow}
              style={{ marginTop: 8 }}
            >
              {slots.map(({ emp, i }) => (
                <View
                  key={i}
                  style={[
                    S.slot,
                    {
                      backgroundColor: emp ? deptColor + '15' : (isHUD ? '#020912' : colors.backgroundSecondary),
                      borderColor: emp ? deptColor + '40' : bdr,
                      borderStyle: emp ? 'solid' : 'dashed',
                    },
                  ]}
                >
                  <View style={[S.slotAvatar, { backgroundColor: emp ? deptColor + '22' : colors.textTertiary + '18' }]}>
                    {emp ? (
                      <Text style={[S.slotAvatarText, { color: deptColor, fontFamily: MONO }]}>
                        {initials(emp)}
                      </Text>
                    ) : (
                      <UserPlus size={11} color={colors.textTertiary} />
                    )}
                  </View>
                  <Text style={[S.slotName, { color: emp ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                    {emp ? emp.first_name : 'OPEN'}
                  </Text>
                  {emp && (
                    <Text style={[S.slotLast, { color: colors.textSecondary }]} numberOfLines={1}>
                      {emp.last_name}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Children — indented with left border line */}
      {node.children.length > 0 && (
        <View style={[S.childBlock, { borderLeftColor: deptColor + '30', marginLeft: indent + 16 }]}>
          {node.children.map(child => (
            <TreeRow
              key={child.id}
              node={child}
              deptColor={deptColor}
              colors={colors}
              isHUD={isHUD}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Dept Card ──────────────────────────────────────────────────
function DeptCard({ dept, colors, isHUD, onPress }: {
  dept: Department; colors: any; isHUD: boolean; onPress: () => void;
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
        { backgroundColor: bg, borderColor: bdr, borderLeftColor: dept.color, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={S.deptCardTop}>
        <View style={[S.deptDot, { backgroundColor: dept.color }]} />
        <Text style={[S.deptName, { color: colors.text }]}>{dept.name}</Text>
        <View style={S.deptCounts}>
          <Text style={[S.deptFilled, { color: colors.success }]}>{dept.actual_headcount || 0}</Text>
          <Text style={[S.deptSlash, { color: colors.textSecondary }]}>/</Text>
          <Text style={[S.deptBudget, { color: colors.text }]}>{dept.budgeted_headcount || 0}</Text>
        </View>
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
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  const bg   = isHUD ? '#020912' : colors.background;
  const surf = isHUD ? '#050f1e' : colors.surface;
  const bdr  = isHUD ? '#1a4060' : colors.border;
  const cyan = isHUD ? '#00D4EE' : colors.primary;

  const fade = (cb: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
      cb();
      Animated.timing(fadeAnim, { toValue: 1, duration: 170, useNativeDriver: true }).start();
    });
  };

  // Departments
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

  // Positions for selected dept
  const { data: positions = [], isLoading: posLoading } = useQuery({
    queryKey: ['org-positions', organizationId, selectedDept?.department_code],
    queryFn: async () => {
      if (!organizationId || !selectedDept) return [];
      const { data, error } = await supabase
        .from('positions')
        .select('id, position_code, title, short_title, job_level, budgeted_headcount, filled_headcount, open_positions, supervisory_role, sort_order, reports_to_position_id, reports_to_position_title')
        .eq('organization_id', organizationId)
        .eq('department_code', selectedDept.department_code)
        .eq('status', 'active')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Position[];
    },
    enabled: !!organizationId && !!selectedDept,
  });

  // Employees for selected dept
  const { data: deptEmployees = [], isLoading: empLoading } = useQuery({
    queryKey: ['org-employees', organizationId, selectedDept?.department_code],
    queryFn: async () => {
      if (!organizationId || !selectedDept) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position_id')
        .eq('organization_id', organizationId)
        .eq('department_code', selectedDept.department_code)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!organizationId && !!selectedDept,
  });

  const positionTree = useMemo(
    () => buildTree(positions, deptEmployees),
    [positions, deptEmployees]
  );

  const handleDeptPress = useCallback((dept: Department) => {
    fade(() => setSelectedDept(dept));
  }, []);

  const handleBack = useCallback(() => {
    fade(() => setSelectedDept(null));
  }, []);

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

  // ── Dept drill-down ────────────────────────────────────────────
  if (selectedDept) {
    const totalFilled   = positions.reduce((s, p) => s + p.filled_headcount, 0);
    const totalBudgeted = positions.reduce((s, p) => s + p.budgeted_headcount, 0);
    const totalOpen     = totalBudgeted - totalFilled;

    return (
      <View style={[S.container, { backgroundColor: bg }]}>
        <View style={[S.topBar, { backgroundColor: surf, borderBottomColor: bdr }]}>
          <TouchableOpacity style={S.backBtn} onPress={handleBack}>
            <ChevronLeft size={17} color={cyan} />
            <Text style={[S.backText, { color: cyan, fontFamily: MONO }]}>DEPARTMENTS</Text>
          </TouchableOpacity>
          <View style={[S.deptDot, { backgroundColor: selectedDept.color }]} />
          <Text style={[S.topBarDeptName, { color: colors.text }]}>{selectedDept.name}</Text>
          <Text style={[S.topBarCount, { color: colors.textSecondary, fontFamily: MONO }]}>
            {totalFilled}/{totalBudgeted} · {totalOpen} OPEN
          </Text>
        </View>

        <Animated.ScrollView
          style={{ flex: 1, opacity: fadeAnim }}
          contentContainerStyle={S.treeContent}
          showsVerticalScrollIndicator={false}
        >
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
              <TreeRow
                key={root.id}
                node={root}
                deptColor={selectedDept.color}
                colors={colors}
                isHUD={isHUD}
                depth={0}
              />
            ))
          )}
          <View style={{ height: 60 }} />
        </Animated.ScrollView>
      </View>
    );
  }

  // ── Company overview ────────────────────────────────────────────
  const totalBudgeted = departments.reduce((s, d) => s + (d.budgeted_headcount || 0), 0);
  const totalActual   = departments.reduce((s, d) => s + (d.actual_headcount || 0), 0);

  return (
    <View style={[S.container, { backgroundColor: bg }]}>
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
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText:  { fontSize: 11, letterSpacing: 2, marginTop: 8 },

  // Top bar
  topBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  topBarLeft:    { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  topBarLabel:   { fontSize: 11, fontWeight: '800' as const, letterSpacing: 2 },
  topBarDeptName:{ flex: 1, fontSize: 14, fontWeight: '600' as const },
  topBarCount:   { fontSize: 9, letterSpacing: 1 },
  backBtn:       { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  backText:      { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1 },
  deptDot:       { width: 10, height: 10, borderRadius: 5 },

  // Dept grid
  deptGrid:    { padding: 12, gap: 10 },
  deptCard:    { borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, padding: 14, gap: 7 },
  deptCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptName:    { flex: 1, fontSize: 14, fontWeight: '600' as const },
  deptCounts:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deptFilled:  { fontSize: 16, fontWeight: '700' as const },
  deptSlash:   { fontSize: 13 },
  deptBudget:  { fontSize: 14, fontWeight: '600' as const },
  fillTrack:   { height: 4, borderRadius: 2, overflow: 'hidden' },
  fillBar:     { height: '100%' as any, borderRadius: 2 },
  fillPct:     { fontSize: 10 },

  // Tree
  treeContent: { padding: 12, gap: 10 },

  // Row card
  rowCard: {
    borderRadius: 10, borderWidth: 1, borderLeftWidth: 3,
    padding: 12, marginBottom: 8, overflow: 'hidden',
  },
  rowAccent:  { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  rowTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowInfo:    { flex: 1 },
  rowTitle:   { fontSize: 13, fontWeight: '600' as const, marginBottom: 5 },
  rowPills:   { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  pill:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  pillText:   { fontSize: 8, fontWeight: '800' as const, letterSpacing: 0.5 },
  supPill:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  supPillText:{ fontSize: 8, fontWeight: '700' as const, letterSpacing: 0.5 },

  // Headcount
  rowCount:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countFilled:  { fontSize: 16, fontWeight: '700' as const },
  countSlash:   { fontSize: 12 },
  countTotal:   { fontSize: 13, fontWeight: '600' as const },
  openBadge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, marginLeft: 4 },
  openBadgeText:{ fontSize: 8, fontWeight: '800' as const, letterSpacing: 0.5 },

  // Slot cards
  slotsRow:     { paddingBottom: 2, gap: 8, flexDirection: 'row' },
  slot: {
    width: 72, alignItems: 'center', padding: 8,
    borderRadius: 8, borderWidth: 1, gap: 3,
  },
  slotAvatar:     { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  slotAvatarText: { fontSize: 11, fontWeight: '800' as const },
  slotName:       { fontSize: 9, fontWeight: '600' as const, textAlign: 'center' },
  slotLast:       { fontSize: 8, textAlign: 'center' },

  // Child indentation
  childBlock: { borderLeftWidth: 1, paddingLeft: 12, marginBottom: 4, marginTop: 0 },

  // Empty
  empty:     { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyText: { fontSize: 13 },
});
