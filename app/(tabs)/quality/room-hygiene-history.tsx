import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  User,
  FileText,
  Shield,
  AlertTriangle,
  Zap,
  Wrench,
  ChevronDown,
  Filter,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocations } from '@/hooks/useLocations';
import {
  useRoomHygieneLogQuery,
  useDailyRoomReportsQuery,
  RoomHygieneEntry,
} from '@/hooks/useRoomHygieneLog';

// ── Date Helpers ──────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isToday(d: Date): boolean {
  const t = new Date();
  return d.toDateString() === t.toDateString();
}

function isFuture(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(d);
  check.setHours(0, 0, 0, 0);
  return check > today;
}

// ── Calendar Picker ───────────────────────────────────────────

function CalendarPicker({ date, onDateChange, colors }: {
  date: Date; onDateChange: (d: Date) => void; colors: any;
}) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date(date.getFullYear(), date.getMonth(), 1));

  const monthName = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) currentWeek.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const today = new Date();

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    if (next <= new Date(today.getFullYear(), today.getMonth(), 1) || next.getMonth() === today.getMonth()) {
      setViewMonth(next);
    }
  };

  return (
    <View style={[styles.calendarContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Month header */}
      <View style={styles.calMonthRow}>
        <Pressable onPress={prevMonth} style={styles.calArrow}>
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.calMonthText, { color: colors.text }]}>{monthName}</Text>
        <Pressable onPress={nextMonth} style={styles.calArrow}>
          <ChevronRight size={20} color={isFuture(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)) ? colors.border : colors.text} />
        </Pressable>
      </View>

      {/* Day headers */}
      <View style={styles.calWeekRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <Text key={d} style={[styles.calDayHeader, { color: colors.textSecondary }]}>{d}</Text>
        ))}
      </View>

      {/* Days */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.calWeekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.calDayCell} />;

            const thisDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
            const isSelected = formatDate(thisDate) === formatDate(date);
            const isTodayDay = thisDate.toDateString() === today.toDateString();
            const isFutureDay = thisDate > today;

            return (
              <Pressable
                key={di}
                style={[
                  styles.calDayCell,
                  isSelected && { backgroundColor: '#8B5CF6', borderRadius: 20 },
                  isTodayDay && !isSelected && { borderWidth: 1, borderColor: '#8B5CF6', borderRadius: 20 },
                ]}
                onPress={() => !isFutureDay && onDateChange(thisDate)}
                disabled={isFutureDay}
              >
                <Text style={[
                  styles.calDayText,
                  { color: isFutureDay ? colors.border : colors.text },
                  isSelected && { color: '#FFF', fontWeight: '700' },
                ]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Purpose Badge ─────────────────────────────────────────────

function PurposeBadge({ purpose, colors }: { purpose: string; colors: any }) {
  const config = purpose === 'task_feed'
    ? { icon: Zap, color: '#F97316', label: 'Task Feed' }
    : purpose === 'work_order'
    ? { icon: Wrench, color: '#3B82F6', label: 'Work Order' }
    : purpose === 'manual'
    ? { icon: User, color: '#10B981', label: 'Manual' }
    : { icon: FileText, color: colors.textSecondary, label: purpose || 'Other' };

  return (
    <View style={[styles.badge, { backgroundColor: config.color + '15', borderColor: config.color + '30' }]}>
      <config.icon size={11} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ── Risk Badge ────────────────────────────────────────────────

function RiskBadge({ risk, colors }: { risk: string; colors: any }) {
  if (!risk || risk === 'none') return null;
  const config = risk === 'high'
    ? { color: '#EF4444', label: 'HIGH RISK' }
    : risk === 'medium'
    ? { color: '#F59E0B', label: 'MEDIUM RISK' }
    : { color: '#10B981', label: 'LOW RISK' };
  return (
    <View style={[styles.badge, { backgroundColor: config.color + '15', borderColor: config.color + '30' }]}>
      <AlertTriangle size={11} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ── Entry Card ────────────────────────────────────────────────

function EntryCard({ entry, colors }: { entry: RoomHygieneEntry; colors: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <View style={styles.entryHeader}>
        <View style={styles.entryLeft}>
          <Text style={[styles.entryPerson, { color: colors.text }]}>
            {entry.enteredByName || 'Unknown'}
          </Text>
          <Text style={[styles.entryDept, { color: colors.textSecondary }]}>
            {entry.departmentName || entry.departmentCode}
          </Text>
        </View>
        <View style={styles.entryRight}>
          <Text style={[styles.entryTime, { color: '#8B5CF6' }]}>
            {formatTime(entry.entryTime)}
          </Text>
          <ChevronDown
            size={14}
            color={colors.textSecondary}
            style={expanded ? { transform: [{ rotate: '180deg' }] } : undefined}
          />
        </View>
      </View>

      {/* Badges */}
      <View style={styles.badgeRow}>
        <PurposeBadge purpose={entry.purpose} colors={colors} />
        <RiskBadge risk={entry.contaminationRisk} colors={colors} />
        {entry.status === 'flagged' && (
          <View style={[styles.badge, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <AlertTriangle size={11} color="#EF4444" />
            <Text style={[styles.badgeText, { color: '#EF4444' }]}>FLAGGED</Text>
          </View>
        )}
      </View>

      {/* Room */}
      <View style={styles.roomRow}>
        <MapPin size={12} color={colors.textSecondary} />
        <Text style={[styles.roomText, { color: colors.textSecondary }]}>
          {entry.roomName || 'Unknown Room'}
        </Text>
      </View>

      {/* Purpose detail */}
      {entry.purposeDetail ? (
        <Text style={[styles.purposeDetail, { color: colors.text }]} numberOfLines={expanded ? 10 : 1}>
          {entry.purposeDetail}
        </Text>
      ) : null}

      {/* Expanded */}
      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
          {entry.actionsPerformed ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Actions:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{entry.actionsPerformed}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Entry:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{formatTime(entry.entryTime)}</Text>
          </View>
          {entry.exitTime && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Exit:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{formatTime(entry.exitTime)}</Text>
            </View>
          )}
          {entry.durationMinutes > 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Duration:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{entry.durationMinutes} min</Text>
            </View>
          )}
          {/* PPE */}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>PPE:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {[
                entry.hairnet && 'Hairnet',
                entry.gloves && 'Gloves',
                entry.smock && 'Smock',
                entry.bootCovers && 'Boot Covers',
              ].filter(Boolean).join(', ') || 'None recorded'}
            </Text>
          </View>
          {entry.handwashOnEntry && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Handwash:</Text>
              <Text style={[styles.detailValue, { color: '#10B981' }]}>Yes</Text>
            </View>
          )}
          {entry.notes ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{entry.notes}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════

export default function RoomHygieneHistoryScreen() {
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [filterRoom, setFilterRoom] = useState<string | undefined>(undefined);
  const [showRoomFilter, setShowRoomFilter] = useState(false);

  const dateStr = formatDate(selectedDate);

  // Queries
  const { data: entries = [], isFetching, refetch } = useRoomHygieneLogQuery({
    date: dateStr,
    roomId: filterRoom,
    limit: 500,
  });

  const { data: dailyReports = [] } = useDailyRoomReportsQuery({
    date: dateStr,
  });

  // Locations for room filter
  const { data: locations = [] } = useLocations();
  const hygieneRooms = useMemo(() =>
    locations.filter(loc => loc.status === 'active' && (loc as any).hygiene_log_required === true),
    [locations]
  );

  // Stats
  const totalEntries = entries.length;
  const uniqueDepts = new Set(entries.map(e => e.departmentCode)).size;
  const flaggedCount = entries.filter(e => e.status === 'flagged' || e.contaminationRisk === 'high').length;
  const taskFeedCount = entries.filter(e => e.purpose === 'task_feed').length;
  const woCount = entries.filter(e => e.purpose === 'work_order').length;

  // Group by room
  const entriesByRoom = useMemo(() => {
    const grouped: Record<string, RoomHygieneEntry[]> = {};
    entries.forEach(e => {
      const room = e.roomName || 'Unknown Room';
      if (!grouped[room]) grouped[room] = [];
      grouped[room].push(e);
    });
    return grouped;
  }, [entries]);

  const selectedRoomName = filterRoom
    ? hygieneRooms.find(r => r.id === filterRoom)?.name || 'Selected Room'
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      >
        {/* ── Date Navigator ───────────────────────── */}
        <View style={[styles.dateNav, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={() => setSelectedDate(addDays(selectedDate, -1))} style={styles.dateArrow}>
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>

          <Pressable style={styles.dateCenter} onPress={() => setShowCalendar(!showCalendar)}>
            <Calendar size={16} color="#8B5CF6" />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {isToday(selectedDate) ? 'Today' : formatDisplay(selectedDate)}
            </Text>
            <ChevronDown size={14} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => !isToday(selectedDate) && setSelectedDate(addDays(selectedDate, 1))}
            style={styles.dateArrow}
            disabled={isToday(selectedDate)}
          >
            <ChevronRight size={22} color={isToday(selectedDate) ? colors.border : colors.text} />
          </Pressable>
        </View>

        {/* Quick date buttons */}
        <View style={styles.quickDates}>
          <Pressable
            style={[styles.quickBtn, isToday(selectedDate) && { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }, { borderColor: colors.border }]}
            onPress={() => setSelectedDate(new Date())}
          >
            <Text style={[styles.quickBtnText, { color: isToday(selectedDate) ? '#8B5CF6' : colors.textSecondary }]}>Today</Text>
          </Pressable>
          <Pressable
            style={[styles.quickBtn, { borderColor: colors.border }]}
            onPress={() => setSelectedDate(addDays(new Date(), -1))}
          >
            <Text style={[styles.quickBtnText, { color: colors.textSecondary }]}>Yesterday</Text>
          </Pressable>
          <Pressable
            style={[styles.quickBtn, { borderColor: colors.border }]}
            onPress={() => setSelectedDate(addDays(new Date(), -7))}
          >
            <Text style={[styles.quickBtnText, { color: colors.textSecondary }]}>7 Days Ago</Text>
          </Pressable>
        </View>

        {/* Calendar dropdown */}
        {showCalendar && (
          <CalendarPicker
            date={selectedDate}
            onDateChange={(d) => { setSelectedDate(d); setShowCalendar(false); }}
            colors={colors}
          />
        )}

        {/* ── Room Filter ──────────────────────────── */}
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: filterRoom ? '#8B5CF6' : colors.border }]}
            onPress={() => setShowRoomFilter(!showRoomFilter)}
          >
            <Filter size={14} color={filterRoom ? '#8B5CF6' : colors.textSecondary} />
            <Text style={[styles.filterText, { color: filterRoom ? '#8B5CF6' : colors.textSecondary }]}>
              {selectedRoomName || 'All Rooms'}
            </Text>
            <ChevronDown size={14} color={colors.textSecondary} />
          </Pressable>

          {filterRoom && (
            <Pressable
              style={[styles.clearBtn, { backgroundColor: '#EF444415' }]}
              onPress={() => { setFilterRoom(undefined); setShowRoomFilter(false); }}
            >
              <X size={14} color="#EF4444" />
            </Pressable>
          )}
        </View>

        {showRoomFilter && (
          <View style={[styles.roomDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              style={[styles.roomOption, !filterRoom && { backgroundColor: '#8B5CF610' }]}
              onPress={() => { setFilterRoom(undefined); setShowRoomFilter(false); }}
            >
              <Text style={[styles.roomOptionText, { color: !filterRoom ? '#8B5CF6' : colors.text }]}>All Rooms</Text>
            </Pressable>
            {hygieneRooms.map(room => (
              <Pressable
                key={room.id}
                style={[styles.roomOption, filterRoom === room.id && { backgroundColor: '#8B5CF610' }]}
                onPress={() => { setFilterRoom(room.id); setShowRoomFilter(false); }}
              >
                <Text style={[styles.roomOptionText, { color: filterRoom === room.id ? '#8B5CF6' : colors.text }]}>
                  {room.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Stats Row ────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#8B5CF610', borderColor: '#8B5CF630' }]}>
            <Text style={[styles.statNum, { color: '#8B5CF6' }]}>{totalEntries}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Entries</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#3B82F610', borderColor: '#3B82F630' }]}>
            <Text style={[styles.statNum, { color: '#3B82F6' }]}>{uniqueDepts}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Depts</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#F9731610', borderColor: '#F9731630' }]}>
            <Text style={[styles.statNum, { color: '#F97316' }]}>{taskFeedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Task Feed</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: flaggedCount > 0 ? '#EF444410' : '#10B98110', borderColor: flaggedCount > 0 ? '#EF444430' : '#10B98130' }]}>
            <Text style={[styles.statNum, { color: flaggedCount > 0 ? '#EF4444' : '#10B981' }]}>{flaggedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Flagged</Text>
          </View>
        </View>

        {/* ── Daily Report Status ──────────────────── */}
        {dailyReports.length > 0 && (
          <View style={[styles.reportSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.reportTitle, { color: colors.text }]}>Daily Reports</Text>
            {dailyReports.map((rpt: any) => (
              <View key={rpt.id} style={[styles.reportCard, { borderColor: colors.border }]}>
                <View style={styles.reportHeader}>
                  <MapPin size={14} color="#8B5CF6" />
                  <Text style={[styles.reportRoom, { color: colors.text }]}>{rpt.roomName}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: rpt.status === 'signed_off' ? '#10B98120' : rpt.status === 'open' ? '#F59E0B20' : '#3B82F620' },
                  ]}>
                    <Text style={[styles.statusText, { color: rpt.status === 'signed_off' ? '#10B981' : rpt.status === 'open' ? '#F59E0B' : '#3B82F6' }]}>
                      {rpt.status === 'signed_off' ? 'Signed Off' : rpt.status === 'open' ? 'Open' : rpt.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.reportMeta, { color: colors.textSecondary }]}>
                  {rpt.totalEntries || 0} entries  •  {rpt.completedEntries || 0} completed
                  {rpt.signedOffByName ? `  •  Signed by ${rpt.signedOffByName}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Entry List ───────────────────────────── */}
        {totalEntries === 0 && !isFetching ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Shield size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Entries</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              No room hygiene log entries found for {isToday(selectedDate) ? 'today' : formatDisplay(selectedDate)}.
              {filterRoom ? ' Try clearing the room filter.' : ''}
            </Text>
          </View>
        ) : filterRoom ? (
          // Flat list when filtering by room
          entries.map(entry => (
            <EntryCard key={entry.id} entry={entry} colors={colors} />
          ))
        ) : (
          // Grouped by room
          Object.entries(entriesByRoom).map(([room, roomEntries]) => (
            <View key={room}>
              <View style={styles.roomGroupHeader}>
                <MapPin size={14} color="#8B5CF6" />
                <Text style={[styles.roomGroupTitle, { color: colors.text }]}>{room}</Text>
                <Text style={[styles.roomGroupCount, { color: '#8B5CF6' }]}>{roomEntries.length}</Text>
              </View>
              {roomEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} colors={colors} />
              ))}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },

  // Date nav
  dateNav: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 12, borderRadius: 12, borderWidth: 1, padding: 4 },
  dateArrow: { padding: 10 },
  dateCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  dateText: { fontSize: 16, fontWeight: '700' },

  // Quick dates
  quickDates: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginTop: 8 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  quickBtnText: { fontSize: 13, fontWeight: '600' },

  // Calendar
  calendarContainer: { marginHorizontal: 12, marginTop: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  calMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calArrow: { padding: 6 },
  calMonthText: { fontSize: 16, fontWeight: '700' },
  calWeekRow: { flexDirection: 'row' },
  calDayHeader: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', paddingVertical: 4 },
  calDayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 36 },
  calDayText: { fontSize: 14 },

  // Filter
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginTop: 10 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  filterText: { flex: 1, fontSize: 14, fontWeight: '600' },
  clearBtn: { padding: 10, borderRadius: 10 },
  roomDropdown: { marginHorizontal: 12, marginTop: 4, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  roomOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#00000010' },
  roomOptionText: { fontSize: 14, fontWeight: '500' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginTop: 12 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },

  // Daily reports
  reportSection: { marginHorizontal: 12, marginTop: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  reportTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  reportCard: { paddingVertical: 10, borderTopWidth: 1 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportRoom: { flex: 1, fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  reportMeta: { fontSize: 12, marginTop: 4, marginLeft: 22 },

  // Entry card
  entryCard: { marginHorizontal: 12, marginTop: 8, borderRadius: 12, borderWidth: 1, padding: 14 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryLeft: { flex: 1 },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entryPerson: { fontSize: 15, fontWeight: '700' },
  entryDept: { fontSize: 12, marginTop: 2 },
  entryTime: { fontSize: 13, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  roomText: { fontSize: 12 },
  purposeDetail: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  expandedSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  detailLabel: { width: 80, fontSize: 12, fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 12, lineHeight: 17 },

  // Room group
  roomGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  roomGroupTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  roomGroupCount: { fontSize: 14, fontWeight: '800' },

  // Empty
  emptyState: { marginHorizontal: 12, marginTop: 16, borderRadius: 12, borderWidth: 1, padding: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
