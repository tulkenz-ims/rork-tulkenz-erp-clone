import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  TrendingUp,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTaskFeedPostsWithTasksQuery } from '@/hooks/useTaskFeedTemplates';
import { getDepartmentColor } from '@/constants/organizationCodes';
import { useTheme } from '@/contexts/ThemeContext';

// ── Production lines to track ──────────────────────────────────
const TRACKED_LINES = [
  { id: 'production_line_1', label: 'Line 1', names: ['Production Line 1'] },
  { id: 'production_line_2', label: 'Line 2', names: ['Production Line 2'] },
  { id: 'production_line_3', label: 'Line 3', names: ['Production Line 3'] },
];

// ── Departments that can be charged with downtime ──────────────
const DOWNTIME_DEPARTMENTS = [
  { code: '1001', label: 'Maint' },
  { code: '1002', label: 'Sanit' },
  { code: '1003', label: 'Prod' },
  { code: '1004', label: 'QA' },
  { code: '1005', label: 'Safety' },
];

// ── Helpers ────────────────────────────────────────────────────
const ROLLING_DAYS = 30;

function resolveLineId(roomLine: string): string | null {
  for (const line of TRACKED_LINES) {
    if (line.names.includes(roomLine) || line.id === roomLine) return line.id;
  }
  return null;
}

function extractRoomLine(post: any): string | null {
  if (post.formData?.roomLine) return post.formData.roomLine;
  if (post.notes) {
    const match = post.notes.match(/Room\/Line:\s*(.+)/);
    if (match) return match[1].split('\n')[0].trim();
  }
  return null;
}

function isProductionStopped(post: any): boolean {
  if (post.formData?.productionStopped === 'Yes') return true;
  if (post.notes && post.notes.includes('PRODUCTION STOPPED')) return true;
  return false;
}

function formatDurationStatic(minutes: number): string {
  if (minutes < 1) return '0m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
  }
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Types ──────────────────────────────────────────────────────
interface DowntimeEvent {
  lineId: string;
  departmentCode: string;
  durationMinutes: number;
  postId: string;
  postNumber: string;
  isActive: boolean;
  startedAt: string;
}

interface LineStats {
  lineId: string;
  label: string;
  isDown: boolean;
  activePostId?: string;
  activePostNumber?: string;
  activeSince?: string;
  activeDeptCode?: string;
  uptimePercent: number;
  downtimePercent: number;
  totalDowntimeMinutes: number;
  deptBreakdown: { code: string; label: string; percent: number; minutes: number }[];
}

// ── Live Timer Hook ────────────────────────────────────────────
function useLiveTimer(startedAt: string | undefined, isActive: boolean) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isActive || !startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isActive, startedAt]);

  if (!startedAt || !isActive) return null;

  const diffMs = now - new Date(startedAt).getTime();
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Line Card Sub-component ────────────────────────────────────
function LineCard({
  line,
  isExpanded,
  onToggle,
  colors,
  styles,
}: {
  line: LineStats;
  isExpanded: boolean;
  onToggle: () => void;
  colors: any;
  styles: any;
}) {
  const timer = useLiveTimer(line.activeSince, line.isDown);
  const statusColor = line.isDown ? colors.error : colors.success;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.lineCard,
        isExpanded && styles.lineCardExpanded,
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
    >
      {/* Icon + trend badge */}
      <View style={styles.lineCardTop}>
        <View style={[styles.lineIconBox, { backgroundColor: statusColor + '20' }]}>
          <Activity size={20} color={statusColor} />
        </View>
        {!line.isDown && line.downtimePercent > 0 && (
          <View style={[styles.lineTrendBadge, { backgroundColor: colors.errorBg }]}>
            <AlertTriangle size={10} color={colors.error} />
            <Text style={[styles.lineTrendText, { color: colors.error }]}>
              {line.downtimePercent.toFixed(1)}%
            </Text>
          </View>
        )}
        {!line.isDown && line.downtimePercent === 0 && (
          <View style={[styles.lineTrendBadge, { backgroundColor: colors.successBg }]}>
            <TrendingUp size={10} color={colors.success} />
            <Text style={[styles.lineTrendText, { color: colors.success }]}>100%</Text>
          </View>
        )}
      </View>

      {/* Hero number */}
      {line.isDown ? (
        <View>
          <Text style={[styles.lineHeroValue, { color: colors.error }]}>{timer}</Text>
          <Text style={[styles.lineStatusLabel, { color: colors.error }]}>DOWN</Text>
        </View>
      ) : (
        <View>
          <Text style={[styles.lineHeroValue, { color: colors.success }]}>
            {line.uptimePercent.toFixed(1)}%
          </Text>
          <Text style={[styles.lineStatusLabel, { color: colors.success }]}>RUNNING</Text>
        </View>
      )}

      {/* Line name */}
      <Text style={styles.lineLabel}>{line.label}</Text>
      {!line.isDown && line.totalDowntimeMinutes > 0 && (
        <Text style={styles.lineSubLabel}>
          {formatDurationStatic(line.totalDowntimeMinutes)} downtime
        </Text>
      )}

      {/* Expand chevron */}
      <View style={styles.expandChevron}>
        {isExpanded ? (
          <ChevronDown size={14} color={colors.textTertiary} />
        ) : (
          <ChevronRight size={14} color={colors.textTertiary} />
        )}
      </View>
    </Pressable>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function LineStatusWidget() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  const { data: posts = [] } = useTaskFeedPostsWithTasksQuery({ limit: 200 });

  const lineStats = useMemo<LineStats[]>(() => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - ROLLING_DAYS * 24 * 60 * 60 * 1000);
    const totalWindowMinutes = ROLLING_DAYS * 24 * 60;

    const events: DowntimeEvent[] = [];

    for (const post of posts) {
      if (!isProductionStopped(post)) continue;

      const roomLine = extractRoomLine(post);
      if (!roomLine) continue;

      const lineId = resolveLineId(roomLine);
      if (!lineId) continue;

      let deptCode = '1003';
      if (post.departmentTasks && post.departmentTasks.length > 0) {
        deptCode = post.departmentTasks[0].departmentCode;
      }

      const startedAt = new Date(post.createdAt);
      const endedAt = post.status === 'completed' || post.status === 'cancelled'
        ? new Date(post.completedAt || post.updatedAt)
        : now;

      const effectiveStart = startedAt < windowStart ? windowStart : startedAt;
      const effectiveEnd = endedAt > now ? now : endedAt;
      if (effectiveEnd <= effectiveStart) continue;

      const durationMinutes = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60);
      const isActive = post.status !== 'completed' && post.status !== 'cancelled';

      events.push({
        lineId,
        departmentCode: deptCode,
        durationMinutes,
        postId: post.id,
        postNumber: post.postNumber,
        isActive,
        startedAt: post.createdAt,
      });
    }

    return TRACKED_LINES.map(line => {
      const lineEvents = events.filter(e => e.lineId === line.id);
      const totalDowntimeMinutes = lineEvents.reduce((sum, e) => sum + e.durationMinutes, 0);
      const downtimePercent = totalWindowMinutes > 0
        ? Math.min(100, (totalDowntimeMinutes / totalWindowMinutes) * 100)
        : 0;
      const uptimePercent = 100 - downtimePercent;

      const activeEvent = lineEvents.find(e => e.isActive);

      const deptMinutes: Record<string, number> = {};
      for (const e of lineEvents) {
        deptMinutes[e.departmentCode] = (deptMinutes[e.departmentCode] || 0) + e.durationMinutes;
      }

      const deptBreakdown = DOWNTIME_DEPARTMENTS.map(dept => ({
        code: dept.code,
        label: dept.label,
        minutes: deptMinutes[dept.code] || 0,
        percent: totalDowntimeMinutes > 0
          ? ((deptMinutes[dept.code] || 0) / totalDowntimeMinutes) * 100
          : 0,
      }));

      return {
        lineId: line.id,
        label: line.label,
        isDown: !!activeEvent,
        activePostId: activeEvent?.postId,
        activePostNumber: activeEvent?.postNumber,
        activeSince: activeEvent?.startedAt,
        activeDeptCode: activeEvent?.departmentCode,
        uptimePercent: Math.round(uptimePercent * 10) / 10,
        downtimePercent: Math.round(downtimePercent * 10) / 10,
        totalDowntimeMinutes,
        deptBreakdown,
      };
    });
  }, [posts]);

  const anyDown = lineStats.some(l => l.isDown);
  const downCount = lineStats.filter(l => l.isDown).length;
  const expandedLineData = lineStats.find(l => l.lineId === expandedLine);

  return (
    <View style={styles.container}>
      {/* ── Header Row ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Activity size={16} color={colors.warning || '#F59E0B'} />
          <View>
            <Text style={styles.headerTitle}>Production Line Status</Text>
            <Text style={styles.headerSub}>Real-time uptime · 30-day rolling</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: anyDown ? colors.error : colors.success }]}>
          <View style={styles.pulseDot} />
          <Text style={styles.statusBadgeText}>
            {anyDown ? `${downCount} DOWN` : 'ALL RUNNING'}
          </Text>
        </View>
      </View>

      {/* ── Line Cards — side by side ── */}
      <View style={styles.linesRow}>
        {lineStats.map(line => (
          <LineCard
            key={line.lineId}
            line={line}
            isExpanded={expandedLine === line.lineId}
            onToggle={() => setExpandedLine(expandedLine === line.lineId ? null : line.lineId)}
            colors={colors}
            styles={styles}
          />
        ))}
      </View>

      {/* ── Active stoppage alert ── */}
      {expandedLineData?.isDown && (
        <Pressable
          style={styles.activeAlert}
          onPress={() => {
            if (expandedLineData.activePostId) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/taskfeed/${expandedLineData.activePostId}`);
            }
          }}
        >
          <AlertTriangle size={12} color={colors.errorLight} />
          <Text style={styles.activeAlertText}>
            {expandedLineData.activePostNumber} · Tap to view issue
          </Text>
          <ChevronRight size={12} color={colors.errorLight} />
        </Pressable>
      )}

      {/* ── Expanded: Department Breakdown ── */}
      {expandedLineData && (
        <View style={styles.deptBreakdown}>
          <Text style={styles.deptBreakdownTitle}>
            {expandedLineData.label} · Downtime by Department
            {expandedLineData.totalDowntimeMinutes > 0 ? ` · ${formatDurationStatic(expandedLineData.totalDowntimeMinutes)} total` : ''}
          </Text>
          {expandedLineData.totalDowntimeMinutes === 0 ? (
            <Text style={styles.noDtText}>No downtime recorded in last {ROLLING_DAYS} days</Text>
          ) : (
            <View style={styles.deptRows}>
              {expandedLineData.deptBreakdown
                .sort((a, b) => b.minutes - a.minutes)
                .map(dept => {
                  const deptColor = getDepartmentColor(dept.code);
                  if (dept.minutes === 0) {
                    return (
                      <View key={dept.code} style={styles.deptRow}>
                        <View style={[styles.deptDot, { backgroundColor: deptColor + '40' }]} />
                        <Text style={styles.deptLabel}>{dept.label}</Text>
                        <View style={styles.deptBarTrack}>
                          <View style={[styles.deptBarFill, { width: '0%', backgroundColor: deptColor }]} />
                        </View>
                        <Text style={[styles.deptValue, { color: colors.textTertiary }]}>—</Text>
                      </View>
                    );
                  }
                  return (
                    <View key={dept.code} style={styles.deptRow}>
                      <View style={[styles.deptDot, { backgroundColor: deptColor }]} />
                      <Text style={[styles.deptLabel, { color: colors.text }]}>{dept.label}</Text>
                      <View style={styles.deptBarTrack}>
                        <View
                          style={[
                            styles.deptBarFill,
                            { width: `${dept.percent}%`, backgroundColor: deptColor },
                          ]}
                        />
                      </View>
                      <Text style={[styles.deptValue, { color: deptColor }]}>
                        {dept.percent.toFixed(0)}%
                      </Text>
                      <Text style={styles.deptTime}>{formatDurationStatic(dept.minutes)}</Text>
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  linesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  lineCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineCardExpanded: {
    borderColor: colors.primary,
  },
  lineCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  lineTrendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  lineHeroValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  lineStatusLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  lineLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  lineSubLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  expandChevron: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  activeAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 6,
  },
  activeAlertText: {
    flex: 1,
    fontSize: 11,
    color: colors.errorLight,
    fontWeight: '600',
  },
  deptBreakdown: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deptBreakdownTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  noDtText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  deptRows: {
    gap: 6,
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deptLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 44,
  },
  deptBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  deptBarFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 2,
  },
  deptValue: {
    fontSize: 11,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
  },
  deptTime: {
    fontSize: 9,
    color: colors.textTertiary,
    width: 34,
    textAlign: 'right',
  },
});
