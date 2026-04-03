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
  Dimensions,
} from 'react-native';
import {
  Search,
  X,
  Check,
  ChevronLeft,
  GitBranch,
  Users,
  UserPlus,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const { width: SW } = Dimensions.get('window');

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  department_code: string | null;
  manager_id: string | null;
  status: string;
}

const DEPT_PALETTE: Record<string, { color: string; dim: string }> = {
  production:  { color: '#EE9900', dim: '#EE990022' },
  quality:     { color: '#AA44BB', dim: '#AA44BB22' },
  maintenance: { color: '#2266DD', dim: '#2266DD22' },
  sanitation:  { color: '#00AA55', dim: '#00AA5522' },
  safety:      { color: '#EE3344', dim: '#EE334422' },
  hr:          { color: '#EE4499', dim: '#EE449922' },
  warehouse:   { color: '#44BB44', dim: '#44BB4422' },
  it:          { color: '#00BBCC', dim: '#00BBCC22' },
  default:     { color: '#6B7280', dim: '#6B728022' },
};

function getDeptStyle(code: string | null) {
  if (!code) return DEPT_PALETTE.default;
  const key = Object.keys(DEPT_PALETTE).find(k => code.toLowerCase().includes(k));
  return key ? DEPT_PALETTE[key] : DEPT_PALETTE.default;
}

function OrgCard({
  employee, reportCount, onPress, onDrillDown, colors, isHUD,
}: {
  employee: Employee;
  reportCount: number;
  onPress: (e: Employee) => void;
  onDrillDown?: (e: Employee) => void;
  colors: any;
  isHUD: boolean;
}) {
  const ds = getDeptStyle(employee.department_code);
  const cardBg = isHUD ? '#050f1e' : colors.surface;
  const cardBorder = isHUD ? '#1a4060' : colors.border;

  return (
    <Pressable
      onPress={() => onPress(employee)}
      style={({ pressed }) => [
        C.card,
        { backgroundColor: cardBg, borderColor: cardBorder, borderLeftColor: ds.color, opacity: pressed ? 0.82 : 1, shadowColor: ds.color },
      ]}
    >
      <View style={[C.cardAccent, { backgroundColor: ds.color }]} />
      <View style={[C.cardAvatar, { backgroundColor: ds.dim }]}>
        <Text style={[C.cardAvatarText, { color: ds.color, fontFamily: MONO }]}>
          {employee.first_name[0]}{employee.last_name[0]}
        </Text>
      </View>
      <Text style={[C.cardName, { color: colors.text }]} numberOfLines={2}>
        {employee.first_name}{'\n'}{employee.last_name}
      </Text>
      <Text style={[C.cardPos, { color: colors.textSecondary, fontFamily: MONO }]} numberOfLines={2}>
        {employee.position || 'No title'}
      </Text>
      {employee.department_code && (
        <View style={[C.deptPill, { backgroundColor: ds.dim, borderColor: ds.color + '44' }]}>
          <Text style={[C.deptPillText, { color: ds.color, fontFamily: MONO }]}>
            {employee.department_code.toUpperCase()}
          </Text>
        </View>
      )}
      {reportCount > 0 && onDrillDown && (
        <Pressable
          style={[C.drillBtn, { backgroundColor: ds.color + '18', borderColor: ds.color + '40' }]}
          onPress={() => onDrillDown(employee)}
        >
          <Users size={9} color={ds.color} />
          <Text style={[C.drillBtnText, { color: ds.color, fontFamily: MONO }]}>
            {reportCount} REPORT{reportCount !== 1 ? 'S' : ''}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

function LevelRow({
  employees, allEmployees, onSelect, onDrillDown, colors, isHUD, accentColor, label,
}: {
  employees: Employee[];
  allEmployees: Employee[];
  onSelect: (e: Employee) => void;
  onDrillDown?: (e: Employee) => void;
  colors: any;
  isHUD: boolean;
  accentColor: string;
  label: string;
}) {
  const reportCount = (emp: Employee) =>
    allEmployees.filter(e => e.manager_id === emp.id).length;

  return (
    <View style={C.levelWrap}>
      <View style={C.levelLabelRow}>
        <View style={[C.levelLine, { backgroundColor: accentColor + '35' }]} />
        <Text style={[C.levelLabel, { color: accentColor, fontFamily: MONO }]}>{label.toUpperCase()}</Text>
        <View style={[C.levelLine, { backgroundColor: accentColor + '35' }]} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={C.cardsRow}>
        {employees.map(emp => (
          <OrgCard
            key={emp.id}
            employee={emp}
            reportCount={reportCount(emp)}
            onPress={onSelect}
            onDrillDown={onDrillDown}
            colors={colors}
            isHUD={isHUD}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const LEVEL_LABELS = ['Executive', 'Leadership', 'Management', 'Coordination', 'Leads', 'Operators', 'Staff'];

export default function OrgChartScreen() {
  const { colors, isHUD } = useTheme();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [drillTarget, setDrillTarget] = useState<Employee | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [showPicker, setShowPicker]   = useState(false);
  const [search, setSearch]           = useState('');

  const bg   = isHUD ? '#020912' : colors.background;
  const cyan = isHUD ? '#00D4EE' : colors.primary;
  const card = isHUD ? '#050f1e' : colors.surface;
  const bdr  = isHUD ? '#1a4060' : colors.border;

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['org-chart-employees', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position, department_code, manager_id, status')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('last_name');
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!organizationId,
  });

  const updateManager = useMutation({
    mutationFn: async ({ employeeId, managerId }: { employeeId: string; managerId: string | null }) => {
      const { error } = await supabase
        .from('employees').update({ manager_id: managerId }).eq('id', employeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-chart-employees', organizationId] });
      setShowPicker(false);
      setSelectedEmp(null);
      setSearch('');
    },
    onError: () => Alert.alert('Error', 'Failed to update. Please try again.'),
  });

  const activeIds = useMemo(() => new Set(employees.map(e => e.id)), [employees]);

  // Build levels for company or drill view
  const buildLevels = useCallback((startIds: string[]): Employee[][] => {
    const levels: Employee[][] = [];
    let current = startIds;
    let safety = 0;
    while (safety < 8) {
      const next = employees
        .filter(e => e.manager_id && current.includes(e.manager_id))
        .sort((a, b) => a.last_name.localeCompare(b.last_name));
      if (next.length === 0) break;
      levels.push(next);
      current = next.map(e => e.id);
      safety++;
    }
    return levels;
  }, [employees]);

  const roots = useMemo(() =>
    employees.filter(e => !e.manager_id || !activeIds.has(e.manager_id))
      .sort((a, b) => a.last_name.localeCompare(b.last_name)),
    [employees, activeIds]
  );

  const companyLevels = useMemo(() => {
    if (roots.length === 0) return [];
    return [roots, ...buildLevels(roots.map(e => e.id))];
  }, [roots, buildLevels]);

  const drillLevels = useMemo(() => {
    if (!drillTarget) return [];
    return [[drillTarget], ...buildLevels([drillTarget.id])];
  }, [drillTarget, buildLevels]);

  const unmapped = useMemo(() =>
    employees.filter(e => !e.manager_id),
    [employees]
  );

  const fade = (cb: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      cb();
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  const handleDrillDown = useCallback((emp: Employee) => fade(() => setDrillTarget(emp)), []);
  const handleBack      = useCallback(() => fade(() => setDrillTarget(null)), []);
  const handleSelect    = useCallback((emp: Employee) => { setSelectedEmp(emp); setSearch(''); setShowPicker(true); }, []);

  const managerOptions = useMemo(() => {
    if (!selectedEmp) return [];
    const excl = new Set<string>([selectedEmp.id]);
    const addSubs = (id: string) =>
      employees.filter(e => e.manager_id === id).forEach(e => { excl.add(e.id); addSubs(e.id); });
    addSubs(selectedEmp.id);
    const q = search.toLowerCase();
    return employees
      .filter(e => !excl.has(e.id) && (q === '' || `${e.first_name} ${e.last_name} ${e.position}`.toLowerCase().includes(q)))
      .sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [employees, selectedEmp, search]);

  const currentManager = selectedEmp ? employees.find(e => e.id === selectedEmp.manager_id) : null;
  const activeLevels   = drillTarget ? drillLevels : companyLevels;
  const drillColor     = drillTarget ? getDeptStyle(drillTarget.department_code).color : cyan;

  if (isLoading) {
    return (
      <View style={[C.center, { backgroundColor: bg }]}>
        <ActivityIndicator color={cyan} size="large" />
        <Text style={[C.loadingText, { color: colors.textSecondary, fontFamily: MONO }]}>LOADING ORG CHART...</Text>
      </View>
    );
  }

  return (
    <View style={[C.container, { backgroundColor: bg }]}>

      {/* Top bar */}
      <View style={[C.topBar, { backgroundColor: card, borderBottomColor: bdr }]}>
        {drillTarget ? (
          <>
            <TouchableOpacity style={C.backBtn} onPress={handleBack}>
              <ChevronLeft size={17} color={cyan} />
              <Text style={[C.backText, { color: cyan, fontFamily: MONO }]}>COMPANY</Text>
            </TouchableOpacity>
            <Text style={[C.drillTitle, { color: colors.text }]}>
              {drillTarget.first_name} {drillTarget.last_name}
            </Text>
          </>
        ) : (
          <View style={C.topBarLeft}>
            <GitBranch size={13} color={cyan} />
            <Text style={[C.topBarTitle, { color: cyan, fontFamily: MONO }]}>ORG CHART</Text>
          </View>
        )}
        <Text style={[C.topBarCount, { color: colors.textSecondary, fontFamily: MONO }]}>
          {employees.length} EMPLOYEES
        </Text>
      </View>

      {/* Chart */}
      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={C.chartContent}
        showsVerticalScrollIndicator={false}
      >
        {activeLevels.map((level, i) => (
          <View key={i}>
            {i > 0 && (
              <View style={C.vertConnector}>
                <View style={[C.vertLine, { backgroundColor: drillColor + '50' }]} />
              </View>
            )}
            <LevelRow
              employees={level}
              allEmployees={employees}
              onSelect={handleSelect}
              onDrillDown={drillTarget || i === 0 ? undefined : handleDrillDown}
              colors={colors}
              isHUD={isHUD}
              accentColor={i === 0 ? cyan : drillColor}
              label={drillTarget
                ? (i === 0 ? (drillTarget.position || drillTarget.department_code || 'Root') : LEVEL_LABELS[i] || `Level ${i + 1}`)
                : (LEVEL_LABELS[i] || `Level ${i + 1}`)
              }
            />
          </View>
        ))}

        {/* Unmapped — company view only */}
        {!drillTarget && unmapped.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <View style={C.levelLabelRow}>
              <View style={[C.levelLine, { backgroundColor: colors.textTertiary + '30' }]} />
              <Text style={[C.levelLabel, { color: colors.textTertiary, fontFamily: MONO }]}>UNMAPPED ({unmapped.length})</Text>
              <View style={[C.levelLine, { backgroundColor: colors.textTertiary + '30' }]} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={C.cardsRow}>
              {unmapped.sort((a, b) => a.last_name.localeCompare(b.last_name)).map(emp => (
                <Pressable
                  key={emp.id}
                  style={[C.unmappedCard, { backgroundColor: card, borderColor: bdr }]}
                  onPress={() => handleSelect(emp)}
                >
                  <View style={[C.cardAvatar, { backgroundColor: colors.textTertiary + '15' }]}>
                    <Text style={[C.cardAvatarText, { color: colors.textSecondary, fontFamily: MONO }]}>
                      {emp.first_name[0]}{emp.last_name[0]}
                    </Text>
                  </View>
                  <Text style={[C.cardName, { color: colors.text }]} numberOfLines={2}>
                    {emp.first_name}{'\n'}{emp.last_name}
                  </Text>
                  <Text style={[C.cardPos, { color: colors.textSecondary, fontFamily: MONO }]} numberOfLines={1}>
                    {emp.position || 'No title'}
                  </Text>
                  <View style={[C.assignPrompt, { backgroundColor: cyan + '15', borderColor: cyan + '35' }]}>
                    <UserPlus size={9} color={cyan} />
                    <Text style={[C.assignText, { color: cyan, fontFamily: MONO }]}>ASSIGN</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 60 }} />
      </Animated.ScrollView>

      {/* Manager picker */}
      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <View style={C.overlay}>
          <View style={[C.pickerSheet, { backgroundColor: card, borderTopColor: bdr }]}>
            <View style={[C.pickerHead, { borderBottomColor: bdr }]}>
              <View style={{ flex: 1 }}>
                <Text style={[C.pickerTitle, { color: colors.text, fontFamily: MONO }]}>ASSIGN MANAGER</Text>
                <Text style={[C.pickerSub, { color: colors.textSecondary }]}>
                  {selectedEmp?.first_name} {selectedEmp?.last_name} · {selectedEmp?.position || 'No title'}
                </Text>
              </View>
              <Pressable onPress={() => { setShowPicker(false); setSelectedEmp(null); }} hitSlop={12}>
                <X size={21} color={colors.textSecondary} />
              </Pressable>
            </View>

            {currentManager && (
              <View style={[C.currentMgr, { backgroundColor: cyan + '10', borderColor: cyan + '28' }]}>
                <Text style={[C.currentMgrLabel, { color: colors.textSecondary, fontFamily: MONO }]}>CURRENT MANAGER</Text>
                <Text style={[C.currentMgrName, { color: colors.text }]}>
                  {currentManager.first_name} {currentManager.last_name} · {currentManager.position}
                </Text>
              </View>
            )}

            <View style={[C.searchBox, { backgroundColor: bg, borderColor: bdr }]}>
              <Search size={14} color={colors.textSecondary} />
              <TextInput
                style={[C.searchInput, { color: colors.text }]}
                placeholder="Search by name or title..."
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}><X size={13} color={colors.textSecondary} /></Pressable>
              )}
            </View>

            {selectedEmp?.manager_id && (
              <Pressable
                style={[C.removeBtn, { backgroundColor: colors.error + '10', borderColor: colors.error + '35' }]}
                onPress={() => updateManager.mutate({ employeeId: selectedEmp.id, managerId: null })}
                disabled={updateManager.isPending}
              >
                <X size={12} color={colors.error} />
                <Text style={[C.removeBtnText, { color: colors.error, fontFamily: MONO }]}>REMOVE MANAGER</Text>
              </Pressable>
            )}

            <ScrollView style={C.pickerList} showsVerticalScrollIndicator={false}>
              {managerOptions.map(emp => {
                const isSelected = emp.id === selectedEmp?.manager_id;
                const ds = getDeptStyle(emp.department_code);
                return (
                  <Pressable
                    key={emp.id}
                    style={[C.pickerRow, {
                      borderColor: isSelected ? cyan + '55' : bdr,
                      backgroundColor: isSelected ? cyan + '10' : bg,
                    }]}
                    onPress={() => updateManager.mutate({ employeeId: selectedEmp!.id, managerId: emp.id })}
                    disabled={updateManager.isPending}
                  >
                    <View style={[C.cardAvatar, { backgroundColor: ds.dim, width: 36, height: 36, borderRadius: 18 }]}>
                      <Text style={[C.cardAvatarText, { color: ds.color, fontFamily: MONO, fontSize: 12 }]}>
                        {emp.first_name[0]}{emp.last_name[0]}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[C.pickerName, { color: colors.text }]}>{emp.first_name} {emp.last_name}</Text>
                      <Text style={[C.pickerSub2, { color: colors.textSecondary }]} numberOfLines={1}>
                        {emp.position || 'No title'}{emp.department_code ? ` · ${emp.department_code}` : ''}
                      </Text>
                    </View>
                    {updateManager.isPending
                      ? <ActivityIndicator size="small" color={cyan} />
                      : isSelected ? <Check size={15} color={cyan} /> : null
                    }
                  </Pressable>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const C = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText:  { fontSize: 11, letterSpacing: 2, marginTop: 8 },
  topBar:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  topBarLeft:   { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  topBarTitle:  { fontSize: 11, fontWeight: '800' as const, letterSpacing: 2 },
  topBarCount:  { fontSize: 9, letterSpacing: 1 },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  backText:     { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1 },
  drillTitle:   { flex: 2, fontSize: 13, fontWeight: '600' as const, textAlign: 'center' },
  chartContent: { paddingVertical: 20 },
  levelWrap:    { marginBottom: 4 },
  levelLabelRow:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 10 },
  levelLine:    { flex: 1, height: 1 },
  levelLabel:   { fontSize: 9, fontWeight: '800' as const, letterSpacing: 2 },
  cardsRow:     { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  vertConnector:{ alignItems: 'center', paddingVertical: 2, marginBottom: 4 },
  vertLine:     { width: 1, height: 30 },
  card: {
    width: 140, borderRadius: 10, borderWidth: 1, borderLeftWidth: 3,
    overflow: 'hidden', padding: 12, alignItems: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  cardAccent:    { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  cardAvatar:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardAvatarText:{ fontSize: 14, fontWeight: '900' as const },
  cardName:      { fontSize: 13, fontWeight: '700' as const, textAlign: 'center', lineHeight: 17, marginBottom: 4 },
  cardPos:       { fontSize: 9, textAlign: 'center', lineHeight: 13, letterSpacing: 0.3, marginBottom: 6 },
  deptPill:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1, marginBottom: 6 },
  deptPillText:  { fontSize: 8, fontWeight: '800' as const, letterSpacing: 1 },
  drillBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  drillBtnText:  { fontSize: 8, fontWeight: '800' as const, letterSpacing: 0.5 },
  unmappedCard:  { width: 130, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', padding: 12, alignItems: 'center', opacity: 0.7 },
  assignPrompt:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, borderWidth: 1, marginTop: 6 },
  assignText:    { fontSize: 8, fontWeight: '800' as const, letterSpacing: 1 },
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerSheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, maxHeight: '88%' as any },
  pickerHead:    { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  pickerTitle:   { fontSize: 13, fontWeight: '800' as const, letterSpacing: 2 },
  pickerSub:     { fontSize: 12, marginTop: 3 },
  pickerList:    { maxHeight: 380, paddingHorizontal: 12 },
  currentMgr:    { margin: 12, marginBottom: 4, padding: 12, borderRadius: 10, borderWidth: 1 },
  currentMgrLabel:{ fontSize: 9, fontWeight: '700' as const, letterSpacing: 1.5, marginBottom: 3 },
  currentMgrName: { fontSize: 13, fontWeight: '600' as const },
  searchBox:     { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  searchInput:   { flex: 1, fontSize: 14 },
  removeBtn:     { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 12, marginBottom: 6, padding: 10, borderRadius: 8, borderWidth: 1 },
  removeBtnText: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1 },
  pickerRow:     { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6, gap: 10 },
  pickerName:    { fontSize: 14, fontWeight: '600' as const, marginBottom: 2 },
  pickerSub2:    { fontSize: 11 },
});
