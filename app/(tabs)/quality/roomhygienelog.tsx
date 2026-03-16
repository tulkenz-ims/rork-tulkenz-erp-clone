import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  DoorOpen,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Lock,
  ChevronDown,
  FileText,
  Zap,
  Shield,
  Droplets,
  Wrench,
  Activity,
} from 'lucide-react-native';
import {
  useRoomHygieneLogQuery,
  useDailyRoomReportsQuery,
  useSignOffDailyReport,
  RoomHygieneEntry,
  DailyRoomHygieneReport,
} from '@/hooks/useRoomHygieneLog';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getDepartmentColor, getDepartmentName } from '@/constants/organizationCodes';
import PinSignatureCapture from '@/components/PinSignatureCapture';
import { SignatureVerification } from '@/hooks/usePinSignature';
import * as Haptics from 'expo-haptics';

// ── HUD Theme ──────────────────────────────────────────────────
const HUD = {
  bg:       '#020912',
  surface:  '#040f1e',
  card:     '#071425',
  border:   '#0d2840',
  borderBright: '#0d3d5f',
  cyan:     '#00e5ff',
  cyanDim:  '#00e5ff18',
  cyanMid:  '#00e5ff40',
  green:    '#00ff88',
  greenDim: '#00ff8818',
  amber:    '#ffb800',
  amberDim: '#ffb80018',
  red:      '#ff2d55',
  redDim:   '#ff2d5518',
  purple:   '#7b61ff',
  purpleDim:'#7b61ff18',
  text:     '#e0f4ff',
  textSec:  '#7aa8c8',
  textDim:  '#2a4a6a',
};

// ── Timezone helper ────────────────────────────────────────────
function getTodayCST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

function formatDateCST(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTimeCST(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric', minute: '2-digit',
  });
}

// ── Build last 30 days for calendar strip ─────────────────────
function buildCalendarDays(): { date: string; label: string; dayName: string; isToday: boolean }[] {
  const days = [];
  const today = getTodayCST();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const dayName = d.toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short' }).slice(0, 1);
    const label = d.toLocaleDateString('en-US', { timeZone: 'America/Chicago', day: 'numeric' });
    days.push({ date: dateStr, label, dayName, isToday: dateStr === today });
  }
  return days;
}

const CALENDAR_DAYS = buildCalendarDays();

const DEPT_FILTERS = [
  { code: undefined, label: 'All' },
  { code: '1001', label: 'Maint' },
  { code: '1002', label: 'Sanit' },
  { code: '1003', label: 'Prod' },
  { code: '1004', label: 'Quality' },
  { code: '1005', label: 'Safety' },
];

const RISK_CONFIG: Record<string, { color: string; label: string }> = {
  none:   { color: HUD.green,  label: 'None' },
  low:    { color: HUD.amber,  label: 'Low' },
  medium: { color: '#ef4444',  label: 'Med' },
  high:   { color: '#dc2626',  label: 'High' },
};

// ── Component ──────────────────────────────────────────────────
export default function RoomHygieneLogScreen() {
  const router = useRouter();
  const { organizationId } = useOrganization();

  const todayStr = getTodayCST();
  const calendarRef = useRef<ScrollView>(null);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'entries' | 'reports'>('entries');

  // Sign-off modal state
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [signOffReport, setSignOffReport] = useState<DailyRoomHygieneReport | null>(null);
  const [signOffVerification, setSignOffVerification] = useState<SignatureVerification | null>(null);
  const [signOffNotes, setSignOffNotes] = useState('');

  // ── Queries ────────────────────────────────────────────────
  const { data: entries = [], isLoading, isFetching, refetch } = useRoomHygieneLogQuery({
    date: selectedDate,
    departmentCode: deptFilter,
    limit: 200,
  });

  const { data: dailyReports = [], isLoading: reportsInitialLoading, isFetching: reportsFetching, refetch: refetchReports } = useDailyRoomReportsQuery({
    date: selectedDate,
  });

  // ── Build entry count per day for calendar dots ────────────
  // We query a broader range to show dots — use all entries in memory
  const { data: allRecentReports = [] } = useDailyRoomReportsQuery({});

  const reportsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    allRecentReports.forEach(r => {
      map[r.reportDate] = (map[r.reportDate] || 0) + r.totalEntries;
    });
    return map;
  }, [allRecentReports]);

  // ── Sign-off mutation ──────────────────────────────────────
  const signOffMutation = useSignOffDailyReport({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSignOffModal(false);
      setSignOffReport(null);
      setSignOffVerification(null);
      setSignOffNotes('');
      refetchReports();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  // ── Filter entries by search ────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      e.roomName?.toLowerCase().includes(q) ||
      e.enteredByName?.toLowerCase().includes(q) ||
      e.actionsPerformed?.toLowerCase().includes(q) ||
      e.purpose?.toLowerCase().includes(q) ||
      e.purposeDetail?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const handleSignOff = (report: DailyRoomHygieneReport) => {
    if (report.activeEntries > 0) {
      Alert.alert('Cannot Sign Off', `${report.activeEntries} active entries still open.`);
      return;
    }
    setSignOffReport(report);
    setSignOffVerification(null);
    setSignOffNotes('');
    setShowSignOffModal(true);
  };

  const submitSignOff = () => {
    if (!signOffReport || !signOffVerification) {
      Alert.alert('Required', 'Signature required to sign off.');
      return;
    }
    signOffMutation.mutate({
      reportId: signOffReport.id,
      signedOffById: signOffVerification.employeeId,
      signedOffByName: signOffVerification.employeeName,
      signatureStamp: signOffVerification.signatureStamp,
      notes: signOffNotes.trim() || undefined,
    });
  };

  const getRiskConfig = (risk: string) => RISK_CONFIG[risk] || RISK_CONFIG.none;

  const openReports = dailyReports.filter(r => r.status === 'open');
  const signedReports = dailyReports.filter(r => r.status === 'signed_off');

  // ── Entry Card ─────────────────────────────────────────────
  const renderEntry = ({ item: entry }: { item: RoomHygieneEntry }) => {
    const deptColor = getDepartmentColor(entry.departmentCode) || HUD.cyan;
    const risk = getRiskConfig(entry.contaminationRisk);
    const isFlagged = entry.status === 'flagged';
    const accentColor = isFlagged ? HUD.red : deptColor;

    return (
      <View style={[s.entryCard, { borderLeftColor: accentColor }]}>
        {/* Row 1: Room + risk badge + time */}
        <View style={s.entryRow}>
          <View style={s.entryRoomRow}>
            <DoorOpen size={12} color={accentColor} />
            <Text style={[s.entryRoom, { color: accentColor }]}>{entry.roomName}</Text>
            {isFlagged && (
              <View style={[s.badge, { backgroundColor: HUD.redDim, borderColor: HUD.red }]}>
                <Text style={[s.badgeText, { color: HUD.red }]}>FLAGGED</Text>
              </View>
            )}
          </View>
          <Text style={s.entryTime}>
            {formatTimeCST(entry.entryTime)}
            {entry.exitTime ? ` → ${formatTimeCST(entry.exitTime)}` : ' (active)'}
          </Text>
        </View>

        {/* Row 2: Dept badge + name + risk */}
        <View style={s.entryRow}>
          <View style={[s.deptBadge, { backgroundColor: deptColor + '18', borderColor: deptColor + '40' }]}>
            <Text style={[s.deptBadgeText, { color: deptColor }]}>
              {getDepartmentName(entry.departmentCode)}
            </Text>
          </View>
          <Text style={s.entryName}>{entry.enteredByName}</Text>
          <View style={[s.riskBadge, { backgroundColor: risk.color + '18', borderColor: risk.color + '50' }]}>
            <View style={[s.riskDot, { backgroundColor: risk.color }]} />
            <Text style={[s.riskText, { color: risk.color }]}>{risk.label}</Text>
          </View>
        </View>

        {/* Row 3: Actions performed */}
        {entry.actionsPerformed ? (
          <Text style={s.entryActions} numberOfLines={2}>{entry.actionsPerformed}</Text>
        ) : null}

        {/* Row 4: Reference link */}
        {(entry.taskFeedPostId || entry.workOrderId || (entry as any).sanitationWorkOrderId) && (
          <View style={s.refRow}>
            <Zap size={10} color={HUD.textDim} />
            <Text style={s.refText}>
              {entry.taskFeedPostId
                ? `Task Feed: ${entry.taskFeedPostId.slice(0, 8)}`
                : entry.workOrderId
                ? `WO: ${entry.workOrderId.slice(0, 8)}`
                : `San WO: ${(entry as any).sanitationWorkOrderId?.slice(0, 8)}`}
            </Text>
            {entry.durationMinutes != null && entry.durationMinutes > 0 && (
              <Text style={s.refText}> · {entry.durationMinutes}m</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // ── Report Card ────────────────────────────────────────────
  const isSigned = report.status === 'signed_off';
const isOverdue = !isSigned && report.reportDate < getTodayCST();
const accentColor = isSigned ? HUD.green : isOverdue ? HUD.red : HUD.amber;

    return (
      <View key={report.id} style={[s.reportCard, { borderLeftColor: accentColor }]}>
        <View style={s.reportHeader}>
          <View style={s.entryRoomRow}>
            {isSigned
              ? <CheckCircle size={14} color={HUD.green} />
              : <Clock size={14} color={HUD.amber} />}
            <Text style={[s.reportRoom, { color: accentColor }]}>{report.roomName}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: accentColor + '18', borderColor: accentColor + '50' }]}>
            <Text style={[s.badgeText, { color: accentColor }]}>
              {isSigned ? 'SIGNED OFF' : 'OPEN'}
            </Text>
          </View>
        </View>

        <View style={s.reportStats}>
          {[
            { label: 'Total', value: report.totalEntries, color: HUD.text },
            { label: 'Done', value: report.completedEntries, color: HUD.green },
            { label: 'Active', value: report.activeEntries, color: HUD.amber },
            { label: 'Flagged', value: report.flaggedEntries, color: HUD.red },
          ].map(stat => (
            <View key={stat.label} style={s.reportStat}>
              <Text style={[s.reportStatNum, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.reportStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {isSigned && report.signatureStamp ? (
          <Text style={s.signedStamp}>{report.signatureStamp}</Text>
        ) : (
          <Pressable
            style={[s.signOffBtn, { borderColor: HUD.purple + '60' }]}
            onPress={() => handleSignOff(report)}
          >
            <Lock size={12} color={HUD.purple} />
            <Text style={[s.signOffBtnText, { color: HUD.purple }]}>Sign Off — End of Day</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            <Activity size={18} color={HUD.cyan} />
            <View>
              <Text style={s.headerTitle}>ROOM HYGIENE LOG</Text>
              <Text style={s.headerSub}>
                {formatDateCST(selectedDate + 'T12:00:00')} · {entries.length} entries
              </Text>
            </View>
          </View>
          {isFetching && <ActivityIndicator size="small" color={HUD.cyan} />}
        </View>

        {/* ── CALENDAR STRIP ─────────────────────────────── */}
        <ScrollView
          ref={calendarRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.calendarStrip}
          contentContainerStyle={s.calendarContent}
          onLayout={() => {
            // Scroll to end (today) on mount
            setTimeout(() => calendarRef.current?.scrollToEnd({ animated: false }), 100);
          }}
        >
          {CALENDAR_DAYS.map(day => {
            const count = reportsByDate[day.date] || 0;
            const isSelected = day.date === selectedDate;
            return (
              <Pressable
                key={day.date}
                style={[
                  s.calendarDay,
                  isSelected && { backgroundColor: HUD.cyanDim, borderColor: HUD.cyan },
                  day.isToday && !isSelected && { borderColor: HUD.cyanMid },
                ]}
                onPress={() => setSelectedDate(day.date)}
              >
                <Text style={[s.calDayName, { color: isSelected ? HUD.cyan : HUD.textDim }]}>
                  {day.dayName}
                </Text>
                <Text style={[s.calDayNum, { color: isSelected ? HUD.cyan : HUD.textSec }]}>
                  {day.label}
                </Text>
                {count > 0 ? (
                  <View style={[s.calDot, { backgroundColor: isSelected ? HUD.cyan : HUD.green }]}>
                    <Text style={s.calDotText}>{count > 9 ? '9+' : count}</Text>
                  </View>
                ) : (
                  <View style={s.calDotEmpty} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── SEARCH + DEPT FILTER ───────────────────────── */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Search size={14} color={HUD.textSec} />
            <TextInput
              style={s.searchInput}
              placeholder="Search entries..."
              placeholderTextColor={HUD.textDim}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <X size={14} color={HUD.textSec} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── DEPT FILTER CHIPS ─────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.deptRow}>
          {DEPT_FILTERS.map(f => {
            const active = deptFilter === f.code;
            const color = f.code ? getDepartmentColor(f.code) || HUD.cyan : HUD.cyan;
            return (
              <Pressable
                key={f.label}
                style={[s.deptChip, active && { backgroundColor: color + '20', borderColor: color }]}
                onPress={() => setDeptFilter(active ? undefined : f.code)}
              >
                <Text style={[s.deptChipText, { color: active ? color : HUD.textSec }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── TABS ──────────────────────────────────────── */}
        <View style={s.tabRow}>
          {(['entries', 'reports'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[s.tab, activeTab === tab && { borderBottomColor: HUD.cyan, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, { color: activeTab === tab ? HUD.cyan : HUD.textSec }]}>
                {tab === 'entries'
                  ? `Entries (${filtered.length})`
                  : `Reports (${dailyReports.length})`}
              </Text>
              {tab === 'reports' && openReports.length > 0 && (
                <View style={s.tabBadge}>
                  <Text style={s.tabBadgeText}>{openReports.length}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── ENTRIES TAB ───────────────────────────────────── */}
      {activeTab === 'entries' && (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderEntry}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={HUD.cyan} />}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            isLoading ? (
              <View style={s.emptyState}>
                <ActivityIndicator color={HUD.cyan} />
                <Text style={s.emptyText}>Loading entries...</Text>
              </View>
            ) : (
              <View style={s.emptyState}>
                <DoorOpen size={32} color={HUD.textDim} />
                <Text style={s.emptyText}>No entries for {formatDateCST(selectedDate + 'T12:00:00')}</Text>
                <Text style={s.emptyTextSub}>Entries auto-populate from Task Feed completions</Text>
              </View>
            )
          }
        />
      )}

      {/* ── REPORTS TAB ───────────────────────────────────── */}
      {activeTab === 'reports' && (
        <ScrollView
          style={s.list}
          refreshControl={<RefreshControl refreshing={reportsFetching && !reportsInitialLoading} onRefresh={refetchReports} tintColor={HUD.cyan} />}
          contentContainerStyle={s.listContent}
        >
          {reportsInitialLoading ? (
            <View style={s.emptyState}>
              <ActivityIndicator color={HUD.cyan} />
            </View>
          ) : dailyReports.length === 0 ? (
            <View style={s.emptyState}>
              <FileText size={32} color={HUD.textDim} />
              <Text style={s.emptyText}>No reports for this date</Text>
              <Text style={s.emptyTextSub}>Reports auto-create when entries are logged</Text>
            </View>
          ) : (
            <>
              {openReports.length > 0 && (
                <View style={s.section}>
                  <Text style={[s.sectionLabel, { color: HUD.amber }]}>AWAITING SIGN-OFF</Text>
                  {openReports.map(renderReport)}
                </View>
              )}
              {signedReports.length > 0 && (
                <View style={s.section}>
                  <Text style={[s.sectionLabel, { color: HUD.green }]}>SIGNED OFF</Text>
                  {signedReports.map(renderReport)}
                </View>
              )}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── SIGN-OFF MODAL ────────────────────────────────── */}
      <Modal visible={showSignOffModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View style={s.entryRoomRow}>
                <Lock size={16} color={HUD.purple} />
                <Text style={s.modalTitle}>Sign Off Daily Report</Text>
              </View>
              <Pressable onPress={() => setShowSignOffModal(false)}>
                <X size={20} color={HUD.textSec} />
              </Pressable>
            </View>

            <ScrollView style={s.modalBody}>
              {signOffReport && (
                <>
                  <View style={s.signOffSummary}>
                    <Text style={s.signOffRoom}>{signOffReport.roomName}</Text>
                    <Text style={s.signOffDate}>{signOffReport.reportDate}</Text>
                    <View style={s.reportStats}>
                      <View style={s.reportStat}>
                        <Text style={[s.reportStatNum, { color: HUD.text }]}>{signOffReport.totalEntries}</Text>
                        <Text style={s.reportStatLabel}>Entries</Text>
                      </View>
                      <View style={s.reportStat}>
                        <Text style={[s.reportStatNum, { color: HUD.red }]}>{signOffReport.flaggedEntries}</Text>
                        <Text style={s.reportStatLabel}>Flagged</Text>
                      </View>
                      <View style={s.reportStat}>
                        <Text style={[s.reportStatNum, { color: getRiskConfig(signOffReport.highestContaminationRisk).color }]}>
                          {signOffReport.highestContaminationRisk.toUpperCase()}
                        </Text>
                        <Text style={s.reportStatLabel}>Risk</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={s.fieldLabel}>Notes (optional)</Text>
                  <TextInput
                    style={s.textInput}
                    placeholder="Sign-off observations..."
                    placeholderTextColor={HUD.textDim}
                    value={signOffNotes}
                    onChangeText={setSignOffNotes}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />

                  <Text style={[s.fieldLabel, { marginTop: 16 }]}>Quality Signature *</Text>
                  <PinSignatureCapture
                    onVerified={v => setSignOffVerification(v)}
                    onCleared={() => setSignOffVerification(null)}
                    formLabel="Daily Room Hygiene Sign-Off"
                    existingVerification={signOffVerification}
                    required
                    accentColor={HUD.purple}
                  />
                </>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={s.modalFooter}>
              <Pressable style={s.cancelBtn} onPress={() => setShowSignOffModal(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.submitBtn, { backgroundColor: signOffVerification ? HUD.green + '20' : HUD.border, borderColor: signOffVerification ? HUD.green : HUD.border }]}
                onPress={submitSignOff}
                disabled={!signOffVerification || signOffMutation.isPending}
              >
                {signOffMutation.isPending ? (
                  <ActivityIndicator size="small" color={HUD.green} />
                ) : (
                  <>
                    <CheckCircle size={14} color={HUD.green} />
                    <Text style={[s.submitBtnText, { color: HUD.green }]}>Sign Off</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: HUD.bg },
  header:          { backgroundColor: HUD.surface, borderBottomWidth: 1, borderBottomColor: HUD.border },
  headerTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle:     { fontSize: 14, fontWeight: '800', letterSpacing: 2, color: HUD.cyan },
  headerSub:       { fontSize: 11, color: HUD.textSec, marginTop: 1 },

  calendarStrip:   { paddingVertical: 8 },
  calendarContent: { paddingHorizontal: 12, gap: 6, flexDirection: 'row' },
  calendarDay:     { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: HUD.border, minWidth: 40 },
  calDayName:      { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  calDayNum:       { fontSize: 14, fontWeight: '700', marginTop: 1 },
  calDot:          { marginTop: 3, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  calDotText:      { fontSize: 8, fontWeight: '800', color: HUD.bg },
  calDotEmpty:     { marginTop: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },

  searchRow:       { paddingHorizontal: 12, paddingBottom: 8 },
  searchBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: HUD.card, borderWidth: 1, borderColor: HUD.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput:     { flex: 1, fontSize: 13, color: HUD.text, padding: 0 },

  deptRow:         { paddingHorizontal: 12, paddingBottom: 10 },
  deptChip:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: HUD.border, marginRight: 6 },
  deptChipText:    { fontSize: 11, fontWeight: '700' },

  tabRow:          { flexDirection: 'row' },
  tab:             { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
  tabText:         { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  tabBadge:        { backgroundColor: HUD.amber, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeText:    { fontSize: 9, fontWeight: '800', color: HUD.bg },

  list:            { flex: 1 },
  listContent:     { padding: 12, gap: 8 },

  entryCard:       { backgroundColor: HUD.card, borderLeftWidth: 3, borderRadius: 10, padding: 12, gap: 6, borderWidth: 1, borderColor: HUD.border },
  entryRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  entryRoomRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  entryRoom:       { fontSize: 13, fontWeight: '700' },
  entryTime:       { fontSize: 11, color: HUD.textSec, fontWeight: '600' },
  entryName:       { fontSize: 12, color: HUD.textSec, flex: 1 },
  entryActions:    { fontSize: 12, color: HUD.textSec, lineHeight: 17 },
  deptBadge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  deptBadgeText:   { fontSize: 10, fontWeight: '700' },
  riskBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  riskDot:         { width: 5, height: 5, borderRadius: 3 },
  riskText:        { fontSize: 9, fontWeight: '800' },
  badge:           { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  badgeText:       { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  refRow:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refText:         { fontSize: 10, color: HUD.textDim, fontFamily: 'monospace' },

  section:         { marginBottom: 12 },
  sectionLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  reportCard:      { backgroundColor: HUD.card, borderLeftWidth: 3, borderRadius: 10, padding: 12, gap: 10, borderWidth: 1, borderColor: HUD.border, marginBottom: 8 },
  reportHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportRoom:      { fontSize: 14, fontWeight: '700' },
  reportStats:     { flexDirection: 'row', gap: 16 },
  reportStat:      { alignItems: 'center', gap: 2 },
  reportStatNum:   { fontSize: 18, fontWeight: '800' },
  reportStatLabel: { fontSize: 10, color: HUD.textSec, fontWeight: '500' },
  signOffBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  signOffBtnText:  { fontSize: 13, fontWeight: '700' },
  signedStamp:     { fontSize: 11, color: HUD.green, fontStyle: 'italic' },

  emptyState:      { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText:       { fontSize: 14, color: HUD.textSec, fontWeight: '600' },
  emptyTextSub:    { fontSize: 12, color: HUD.textDim, textAlign: 'center', paddingHorizontal: 40 },

  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent:    { backgroundColor: HUD.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', borderTopWidth: 1, borderColor: HUD.border },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: HUD.border },
  modalTitle:      { fontSize: 15, fontWeight: '700', color: HUD.text },
  modalBody:       { paddingHorizontal: 20, paddingTop: 12 },
  modalFooter:     { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: HUD.border },

  signOffSummary:  { backgroundColor: HUD.card, borderRadius: 10, padding: 14, gap: 6, marginBottom: 16, borderWidth: 1, borderColor: HUD.border },
  signOffRoom:     { fontSize: 16, fontWeight: '700', color: HUD.text },
  signOffDate:     { fontSize: 12, color: HUD.textSec },

  fieldLabel:      { fontSize: 12, fontWeight: '700', color: HUD.textSec, marginBottom: 6, letterSpacing: 0.5 },
  textInput:       { backgroundColor: HUD.card, borderWidth: 1, borderColor: HUD.border, borderRadius: 10, padding: 12, fontSize: 13, color: HUD.text, minHeight: 60 },

  cancelBtn:       { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: HUD.border },
  cancelBtnText:   { fontSize: 14, fontWeight: '600', color: HUD.textSec },
  submitBtn:       { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  submitBtnText:   { fontSize: 14, fontWeight: '700' },
});
