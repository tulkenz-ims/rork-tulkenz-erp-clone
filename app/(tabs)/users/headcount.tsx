import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  ChevronRight,
  ChevronLeft,
  Users,
  UserCheck,
  AlertTriangle,
  Plus,
  Minus,
  X,
  Building2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface Department {
  id: string;
  department_code: string;
  name: string;
  color: string;
  budgeted_headcount: number;
  actual_headcount: number;
  facility_id: string;
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
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position_id: string | null;
  position: string | null;
}

const LEVEL_COLORS: Record<string, string> = {
  executive: '#EE3344',
  director:  '#EE4499',
  manager:   '#AA44BB',
  senior:    '#2266DD',
  lead:      '#EE9900',
  mid:       '#00AA55',
  junior:    '#00BBCC',
  entry:     '#6B7280',
};

export default function HeadcountScreen() {
  const { colors, isHUD } = useTheme();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showPositionDetail, setShowPositionDetail] = useState(false);

  const bg   = isHUD ? colors.hudBg      : colors.background;
  const surf = isHUD ? colors.hudSurface  : colors.surface;
  const bdr  = isHUD ? colors.hudBorderBright : colors.border;
  const cyan = isHUD ? colors.hudPrimary  : colors.primary;

  // Load departments
  const { data: departments = [], isLoading: deptsLoading } = useQuery({
    queryKey: ['workforce-departments', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('departments')
        .select('id, department_code, name, color, budgeted_headcount, actual_headcount, facility_id')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!organizationId,
  });

  // Load positions for selected department
  const { data: positions = [], isLoading: posLoading } = useQuery({
    queryKey: ['workforce-positions', organizationId, selectedDept?.department_code],
    queryFn: async () => {
      if (!organizationId || !selectedDept) return [];
      const { data, error } = await supabase
        .from('positions')
        .select('id, position_code, title, short_title, job_level, budgeted_headcount, filled_headcount, open_positions, supervisory_role, sort_order, reports_to_position_title')
        .eq('organization_id', organizationId)
        .eq('department_code', selectedDept.department_code)
        .eq('status', 'active')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Position[];
    },
    enabled: !!organizationId && !!selectedDept,
  });

  // Load employees for selected position
  const { data: assignedEmployees = [] } = useQuery({
    queryKey: ['position-employees', organizationId, selectedPosition?.id],
    queryFn: async () => {
      if (!organizationId || !selectedPosition) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position_id, position')
        .eq('organization_id', organizationId)
        .eq('position_id', selectedPosition.id)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!organizationId && !!selectedPosition,
  });

  // Update budgeted headcount
  const updateHeadcount = useMutation({
    mutationFn: async ({ positionId, newCount }: { positionId: string; newCount: number }) => {
      const { error } = await supabase
        .from('positions')
        .update({ budgeted_headcount: newCount })
        .eq('id', positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce-positions', organizationId, selectedDept?.department_code] });
    },
    onError: () => Alert.alert('Error', 'Failed to update headcount.'),
  });

  const handleHeadcountChange = useCallback((position: Position, delta: number) => {
    const newCount = Math.max(0, position.budgeted_headcount + delta);
    updateHeadcount.mutate({ positionId: position.id, newCount });
  }, [updateHeadcount]);

  // Dept summary stats
  const deptStats = useMemo(() => {
    const totalBudgeted = positions.reduce((s, p) => s + p.budgeted_headcount, 0);
    const totalFilled   = positions.reduce((s, p) => s + p.filled_headcount, 0);
    const totalOpen     = positions.reduce((s, p) => s + (p.open_positions || 0), 0);
    return { totalBudgeted, totalFilled, totalOpen };
  }, [positions]);

  // Company-wide totals
  const companyTotals = useMemo(() => {
    return {
      budgeted: departments.reduce((s, d) => s + (d.budgeted_headcount || 0), 0),
      actual:   departments.reduce((s, d) => s + (d.actual_headcount || 0), 0),
    };
  }, [departments]);

  if (deptsLoading) {
    return (
      <View style={[S.center, { backgroundColor: bg }]}>
        <ActivityIndicator color={cyan} />
        <Text style={[S.loadingText, { color: colors.textSecondary, fontFamily: MONO }]}>
          LOADING HEADCOUNT...
        </Text>
      </View>
    );
  }

  // ── Department drill-down view ─────────────────────────────────
  if (selectedDept) {
    return (
      <View style={[S.container, { backgroundColor: bg }]}>

        {/* Header */}
        <View style={[S.deptHeader, { backgroundColor: surf, borderBottomColor: bdr }]}>
          <TouchableOpacity style={S.backBtn} onPress={() => setSelectedDept(null)}>
            <ChevronLeft size={17} color={cyan} />
            <Text style={[S.backText, { color: cyan, fontFamily: MONO }]}>DEPARTMENTS</Text>
          </TouchableOpacity>
          <View style={[S.deptDot, { backgroundColor: selectedDept.color }]} />
          <Text style={[S.deptHeaderName, { color: colors.text }]}>{selectedDept.name}</Text>
        </View>

        {/* Dept stats */}
        <View style={[S.deptStatsRow, { backgroundColor: surf, borderBottomColor: bdr }]}>
          <View style={S.deptStat}>
            <Text style={[S.deptStatVal, { color: cyan }]}>{deptStats.totalBudgeted}</Text>
            <Text style={[S.deptStatLbl, { color: colors.textSecondary, fontFamily: MONO }]}>BUDGETED</Text>
          </View>
          <View style={[S.deptStatDiv, { backgroundColor: bdr }]} />
          <View style={S.deptStat}>
            <Text style={[S.deptStatVal, { color: colors.success }]}>{deptStats.totalFilled}</Text>
            <Text style={[S.deptStatLbl, { color: colors.textSecondary, fontFamily: MONO }]}>FILLED</Text>
          </View>
          <View style={[S.deptStatDiv, { backgroundColor: bdr }]} />
          <View style={S.deptStat}>
            <Text style={[S.deptStatVal, { color: deptStats.totalOpen > 0 ? colors.warning : colors.success }]}>
              {deptStats.totalOpen}
            </Text>
            <Text style={[S.deptStatLbl, { color: colors.textSecondary, fontFamily: MONO }]}>OPEN</Text>
          </View>
        </View>

        {/* Position list */}
        <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
          {posLoading ? (
            <View style={S.center}>
              <ActivityIndicator color={cyan} />
            </View>
          ) : (
            positions.map(pos => {
              const levelColor = LEVEL_COLORS[pos.job_level] || LEVEL_COLORS.entry;
              const fillPct = pos.budgeted_headcount > 0
                ? (pos.filled_headcount / pos.budgeted_headcount) * 100
                : 0;
              const isUnfilled = pos.open_positions > 0;

              return (
                <Pressable
                  key={pos.id}
                  style={[S.posCard, {
                    backgroundColor: surf,
                    borderColor: bdr,
                    borderLeftColor: selectedDept.color,
                  }]}
                  onPress={() => { setSelectedPosition(pos); setShowPositionDetail(true); }}
                >
                  {/* Top row */}
                  <View style={S.posCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[S.posTitle, { color: colors.text }]}>{pos.title}</Text>
                      <View style={S.posMetaRow}>
                        <View style={[S.levelPill, { backgroundColor: levelColor + '20', borderColor: levelColor + '40' }]}>
                          <Text style={[S.levelPillText, { color: levelColor, fontFamily: MONO }]}>
                            {pos.job_level.toUpperCase()}
                          </Text>
                        </View>
                        {pos.supervisory_role && (
                          <View style={[S.supPill, { backgroundColor: cyan + '18', borderColor: cyan + '35' }]}>
                            <Text style={[S.supPillText, { color: cyan, fontFamily: MONO }]}>SUPERVISORY</Text>
                          </View>
                        )}
                        {pos.reports_to_position_title && (
                          <Text style={[S.reportsTo, { color: colors.textSecondary }]} numberOfLines={1}>
                            → {pos.reports_to_position_title}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Headcount adjuster */}
                    <View style={S.headcountAdjuster}>
                      <TouchableOpacity
                        style={[S.adjBtn, { backgroundColor: colors.error + '18', borderColor: colors.error + '35' }]}
                        onPress={() => handleHeadcountChange(pos, -1)}
                        disabled={updateHeadcount.isPending}
                      >
                        <Minus size={12} color={colors.error} />
                      </TouchableOpacity>
                      <View style={[S.adjCount, { backgroundColor: surf, borderColor: bdr }]}>
                        <Text style={[S.adjCountText, { color: colors.text, fontFamily: MONO }]}>
                          {pos.budgeted_headcount}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[S.adjBtn, { backgroundColor: colors.success + '18', borderColor: colors.success + '35' }]}
                        onPress={() => handleHeadcountChange(pos, 1)}
                        disabled={updateHeadcount.isPending}
                      >
                        <Plus size={12} color={colors.success} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Fill bar */}
                  <View style={[S.fillTrack, { backgroundColor: bdr }]}>
                    <View style={[S.fillBar, {
                      width: `${Math.min(100, fillPct)}%` as any,
                      backgroundColor: fillPct >= 100 ? colors.success : fillPct >= 50 ? colors.warning : colors.error,
                    }]} />
                  </View>

                  {/* Slot counts */}
                  <View style={S.slotRow}>
                    <View style={S.slotItem}>
                      <UserCheck size={11} color={colors.success} />
                      <Text style={[S.slotText, { color: colors.success }]}>
                        {pos.filled_headcount} filled
                      </Text>
                    </View>
                    {isUnfilled && (
                      <View style={S.slotItem}>
                        <AlertTriangle size={11} color={colors.warning} />
                        <Text style={[S.slotText, { color: colors.warning }]}>
                          {pos.open_positions} open
                        </Text>
                      </View>
                    )}
                    <ChevronRight size={13} color={colors.textSecondary} />
                  </View>
                </Pressable>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Position detail modal */}
        <Modal
          visible={showPositionDetail}
          animationType="slide"
          transparent
          onRequestClose={() => setShowPositionDetail(false)}
        >
          <View style={S.overlay}>
            <View style={[S.detailSheet, { backgroundColor: surf, borderTopColor: bdr }]}>
              <View style={[S.detailHead, { borderBottomColor: bdr }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[S.detailTitle, { color: colors.text }]}>{selectedPosition?.title}</Text>
                  <Text style={[S.detailCode, { color: colors.textSecondary, fontFamily: MONO }]}>
                    {selectedPosition?.position_code}
                  </Text>
                </View>
                <Pressable onPress={() => setShowPositionDetail(false)} hitSlop={12}>
                  <X size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Slot visualization */}
              <View style={[S.slotsSection, { borderBottomColor: bdr }]}>
                <Text style={[S.slotsSectionTitle, { color: colors.textSecondary, fontFamily: MONO }]}>
                  POSITION SLOTS ({selectedPosition?.budgeted_headcount} BUDGETED)
                </Text>
                <View style={S.slotsGrid}>
                  {Array.from({ length: selectedPosition?.budgeted_headcount || 0 }).map((_, i) => {
                    const emp = assignedEmployees[i];
                    return (
                      <View
                        key={i}
                        style={[S.slot, {
                          backgroundColor: emp ? colors.success + '18' : colors.backgroundSecondary,
                          borderColor: emp ? colors.success + '40' : bdr,
                          borderStyle: emp ? 'solid' : 'dashed',
                        }]}
                      >
                        {emp ? (
                          <>
                            <View style={[S.slotAvatar, { backgroundColor: colors.success + '25' }]}>
                              <Text style={[S.slotAvatarText, { color: colors.success }]}>
                                {emp.first_name[0]}{emp.last_name[0]}
                              </Text>
                            </View>
                            <Text style={[S.slotEmpName, { color: colors.text }]} numberOfLines={1}>
                              {emp.first_name}
                            </Text>
                            <Text style={[S.slotEmpLast, { color: colors.textSecondary }]} numberOfLines={1}>
                              {emp.last_name}
                            </Text>
                          </>
                        ) : (
                          <>
                            <View style={[S.slotEmpty, { borderColor: colors.textTertiary + '40' }]}>
                              <Plus size={14} color={colors.textTertiary} />
                            </View>
                            <Text style={[S.slotOpenText, { color: colors.textTertiary, fontFamily: MONO }]}>
                              OPEN
                            </Text>
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Headcount adjuster in detail */}
              <View style={S.detailAdjRow}>
                <Text style={[S.detailAdjLabel, { color: colors.textSecondary }]}>
                  Adjust budgeted headcount:
                </Text>
                <View style={S.headcountAdjuster}>
                  <TouchableOpacity
                    style={[S.adjBtn, { backgroundColor: colors.error + '18', borderColor: colors.error + '35' }]}
                    onPress={() => selectedPosition && handleHeadcountChange(selectedPosition, -1)}
                    disabled={updateHeadcount.isPending}
                  >
                    <Minus size={14} color={colors.error} />
                  </TouchableOpacity>
                  <View style={[S.adjCount, { backgroundColor: bg, borderColor: bdr }]}>
                    <Text style={[S.adjCountText, { color: colors.text, fontFamily: MONO }]}>
                      {selectedPosition?.budgeted_headcount}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[S.adjBtn, { backgroundColor: colors.success + '18', borderColor: colors.success + '35' }]}
                    onPress={() => selectedPosition && handleHeadcountChange(selectedPosition, 1)}
                    disabled={updateHeadcount.isPending}
                  >
                    <Plus size={14} color={colors.success} />
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </View>
        </Modal>

      </View>
    );
  }

  // ── Department overview ────────────────────────────────────────
  return (
    <View style={[S.container, { backgroundColor: bg }]}>

      {/* Company totals */}
      <View style={[S.companyBar, { backgroundColor: surf, borderBottomColor: bdr }]}>
        <Building2 size={13} color={cyan} />
        <Text style={[S.companyBarText, { color: colors.textSecondary, fontFamily: MONO }]}>
          COMPANY TOTAL
        </Text>
        <Text style={[S.companyBarVal, { color: cyan, fontFamily: MONO }]}>
          {companyTotals.actual} / {companyTotals.budgeted} FILLED
        </Text>
      </View>

      <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
        {departments.map(dept => {
          const fillPct = dept.budgeted_headcount > 0
            ? (dept.actual_headcount / dept.budgeted_headcount) * 100
            : 0;
          const open = Math.max(0, (dept.budgeted_headcount || 0) - (dept.actual_headcount || 0));

          return (
            <Pressable
              key={dept.id}
              style={[S.deptCard, { backgroundColor: surf, borderColor: bdr, borderLeftColor: dept.color }]}
              onPress={() => setSelectedDept(dept)}
            >
              <View style={S.deptCardTop}>
                <View style={[S.deptColorDot, { backgroundColor: dept.color }]} />
                <Text style={[S.deptName, { color: colors.text }]}>{dept.name}</Text>
                <View style={S.deptCounts}>
                  <Text style={[S.deptFilled, { color: colors.success }]}>
                    {dept.actual_headcount || 0}
                  </Text>
                  <Text style={[S.deptSlash, { color: colors.textSecondary }]}>/</Text>
                  <Text style={[S.deptBudgeted, { color: colors.text }]}>
                    {dept.budgeted_headcount || 0}
                  </Text>
                </View>
                {open > 0 && (
                  <View style={[S.openBadge, { backgroundColor: colors.warning + '20', borderColor: colors.warning + '40' }]}>
                    <Text style={[S.openBadgeText, { color: colors.warning, fontFamily: MONO }]}>
                      {open} OPEN
                    </Text>
                  </View>
                )}
                <ChevronRight size={16} color={colors.textSecondary} />
              </View>

              {/* Fill bar */}
              <View style={[S.fillTrack, { backgroundColor: bdr, marginTop: 10 }]}>
                <View style={[S.fillBar, {
                  width: `${Math.min(100, fillPct)}%` as any,
                  backgroundColor: fillPct >= 100 ? colors.success : fillPct >= 60 ? colors.warning : colors.error,
                }]} />
              </View>

              <Text style={[S.fillPct, { color: colors.textSecondary }]}>
                {Math.round(fillPct)}% staffed
              </Text>
            </Pressable>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText:  { fontSize: 11, letterSpacing: 2 },
  scroll:       { flex: 1 },
  scrollContent:{ padding: 12, gap: 10 },

  // Company bar
  companyBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  companyBarText: { fontSize: 9, fontWeight: '700' as const, letterSpacing: 1.5, flex: 1 },
  companyBarVal:  { fontSize: 12, fontWeight: '800' as const, letterSpacing: 0.5 },

  // Dept card
  deptCard:    { borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, padding: 14 },
  deptCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deptColorDot:{ width: 10, height: 10, borderRadius: 5 },
  deptName:    { flex: 1, fontSize: 14, fontWeight: '600' as const },
  deptCounts:  { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  deptFilled:  { fontSize: 16, fontWeight: '700' as const },
  deptSlash:   { fontSize: 13 },
  deptBudgeted:{ fontSize: 14, fontWeight: '600' as const },
  openBadge:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  openBadgeText:{ fontSize: 9, fontWeight: '800' as const, letterSpacing: 0.5 },
  fillTrack:   { height: 4, borderRadius: 2, overflow: 'hidden' },
  fillBar:     { height: '100%' as any, borderRadius: 2 },
  fillPct:     { fontSize: 10, marginTop: 4 },

  // Dept header (drill-down)
  deptHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:        { flexDirection: 'row', alignItems: 'center', gap: 3 },
  backText:       { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1 },
  deptDot:        { width: 10, height: 10, borderRadius: 5 },
  deptHeaderName: { flex: 1, fontSize: 14, fontWeight: '700' as const },
  deptStatsRow:   { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1 },
  deptStat:       { flex: 1, alignItems: 'center', gap: 3 },
  deptStatVal:    { fontSize: 20, fontWeight: '700' as const },
  deptStatLbl:    { fontSize: 9, fontWeight: '700' as const, letterSpacing: 1 },
  deptStatDiv:    { width: 1, marginVertical: 4 },

  // Position card
  posCard:    { borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, padding: 12 },
  posCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  posTitle:   { fontSize: 14, fontWeight: '600' as const, marginBottom: 5 },
  posMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  levelPill:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  levelPillText:{ fontSize: 8, fontWeight: '800' as const, letterSpacing: 0.5 },
  supPill:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  supPillText:{ fontSize: 8, fontWeight: '700' as const, letterSpacing: 0.5 },
  reportsTo:  { fontSize: 10, flex: 1 },
  slotRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  slotItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotText:   { fontSize: 11, fontWeight: '600' as const },

  // Headcount adjuster
  headcountAdjuster: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adjBtn:    { width: 28, height: 28, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  adjCount:  { minWidth: 36, height: 28, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  adjCountText: { fontSize: 13, fontWeight: '800' as const },

  // Position detail modal
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  detailSheet:  { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, maxHeight: '88%' as any },
  detailHead:   { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  detailTitle:  { fontSize: 17, fontWeight: '700' as const },
  detailCode:   { fontSize: 10, letterSpacing: 1.5, marginTop: 2 },

  // Slots grid
  slotsSection:      { padding: 16, borderBottomWidth: 1 },
  slotsSectionTitle: { fontSize: 9, fontWeight: '800' as const, letterSpacing: 1.5, marginBottom: 12 },
  slotsGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot:              { width: 72, alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, gap: 4 },
  slotAvatar:        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  slotAvatarText:    { fontSize: 11, fontWeight: '700' as const },
  slotEmpName:       { fontSize: 10, fontWeight: '600' as const, textAlign: 'center' },
  slotEmpLast:       { fontSize: 9, textAlign: 'center' },
  slotEmpty:         { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  slotOpenText:      { fontSize: 8, fontWeight: '700' as const, letterSpacing: 0.5 },

  // Detail adjuster row
  detailAdjRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  detailAdjLabel:{ fontSize: 13 },
});
