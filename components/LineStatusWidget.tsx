import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Clock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTaskFeedPostsWithTasksQuery } from '@/hooks/useTaskFeedTemplates';
import { getDepartmentColor } from '@/constants/organizationCodes';

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

// ── Component ──────────────────────────────────────────────────
export default function LineStatusWidget() {
  const router = useRouter();
  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  const { data: posts = [] } = useTaskFeedPostsWithTasksQuery({ limit: 200 });

  const lineStats = useMemo<LineStats[]>(() => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - ROLLING_DAYS * 24 * 60 * 60 * 1000);
    const totalWindowMinutes = ROLLING_DAYS * 24 * 60;

    // Collect all downtime events
    const events: DowntimeEvent[] = [];

    for (const post of posts) {
      if (!isProductionStopped(post)) continue;

      const roomLine = extractRoomLine(post);
      if (!roomLine) continue;

      const lineId = resolveLineId(roomLine);
      if (!lineId) continue;

      // Department that owns this downtime = first assigned department
      let deptCode = '1003'; // default to Production
      if (post.departmentTasks && post.departmentTasks.length > 0) {
        deptCode = post.departmentTasks[0].departmentCode;
      }

      const startedAt = new Date(post.createdAt);
      const endedAt = post.status === 'completed' || post.status === 'cancelled'
        ? new Date(post.completedAt || post.updatedAt)
        : now;

      // Clamp to rolling window
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

    // Build stats per line
    return TRACKED_LINES.map(line => {
      const lineEvents = events.filter(e => e.lineId === line.id);
      const totalDowntimeMinutes = lineEvents.reduce((sum, e) => sum + e.durationMinutes, 0);
      const downtimePercent = totalWindowMinutes > 0
        ? Math.min(100, (totalDowntimeMinutes / totalWindowMinutes) * 100)
        : 0;
      const uptimePercent = 100 - downtimePercent;

      // Active stoppage (most recent active event)
      const activeEvent = lineEvents.find(e => e.isActive);

      // Department breakdown — percent of THIS LINE'S downtime
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

  const formatDuration = (minutes: number) => {
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
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: anyDown ? '#EF444420' : '#10B98120' }]}>
            <Activity size={16} color={anyDown ? '#EF4444' : '#10B981'} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Production Line Status</Text>
            <Text style={styles.headerSub}>Rolling {ROLLING_DAYS}-day uptime</Text>
          </View>
        </View>
        <View style={[styles.overallBadge, { backgroundColor: anyDown ? '#EF4444' : '#10B981' }]}>
          <View style={styles.pulseDot} />
          <Text style={styles.overallText}>
            {anyDown ? `${downCount} DOWN` : 'ALL RUNNING'}
          </Text>
        </View>
      </View>

      {/* ── Line Cards ── */}
      {lineStats.map(line => {
        const isExpanded = expandedLine === line.lineId;

        return (
          <View key={line.lineId} style={styles.lineSection}>
            {/* Line Row */}
            <Pressable
              style={[
                styles.lineRow,
                { borderLeftColor: line.isDown ? '#EF4444' : '#10B981' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedLine(isExpanded ? null : line.lineId);
              }}
            >
              {/* Status + Label */}
              <View style={styles.lineIdentity}>
                <View style={[styles.statusDot, { backgroundColor: line.isDown ? '#EF4444' : '#10B981' }]} />
                <View>
                  <Text style={styles.lineLabel}>{line.label}</Text>
                  <Text style={[styles.lineStatus, { color: line.isDown ? '#EF4444' : '#10B981' }]}>
                    {line.isDown ? 'DOWN' : 'Running'}
                  </Text>
                </View>
              </View>

              {/* Uptime / Downtime bars */}
              <View style={styles.lineMetrics}>
                {/* Uptime bar */}
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Up</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFillUp, { width: `${line.uptimePercent}%` }]} />
                  </View>
                  <Text style={[styles.metricValue, { color: '#10B981' }]}>
                    {line.uptimePercent.toFixed(1)}%
                  </Text>
                </View>
                {/* Downtime bar — scale up for visibility when small */}
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Dn</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFillDown, { width: `${Math.min(line.downtimePercent * 5, 100)}%` }]} />
                  </View>
                  <Text style={[styles.metricValue, { color: line.downtimePercent > 0 ? '#EF4444' : '#6B7280' }]}>
                    {line.downtimePercent.toFixed(1)}%
                  </Text>
                </View>
              </View>

              {/* Expand arrow */}
              {isExpanded ? (
                <ChevronDown size={16} color="#6B7280" />
              ) : (
                <ChevronRight size={16} color="#6B7280" />
              )}
            </Pressable>

            {/* Active stoppage alert */}
            {line.isDown && (
              <Pressable
                style={styles.activeAlert}
                onPress={() => {
                  if (line.activePostId) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/taskfeed/${line.activePostId}`);
                  }
                }}
              >
                <AlertTriangle size={12} color="#FCA5A5" />
                <Text style={styles.activeAlertText}>
                  Stopped {line.activeSince ? formatTimeAgo(line.activeSince) : ''} · {line.activePostNumber}
                </Text>
                <ChevronRight size={12} color="#FCA5A5" />
              </Pressable>
            )}

            {/* ── Expanded: Department Breakdown ── */}
            {isExpanded && (
              <View style={styles.deptBreakdown}>
                <Text style={styles.deptBreakdownTitle}>
                  Downtime by Department{line.totalDowntimeMinutes > 0 ? ` · ${formatDuration(line.totalDowntimeMinutes)} total` : ''}
                </Text>
                {line.totalDowntimeMinutes === 0 ? (
                  <Text style={styles.noDtText}>No downtime recorded in last {ROLLING_DAYS} days</Text>
                ) : (
                  <View style={styles.deptRows}>
                    {line.deptBreakdown
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
                              <Text style={[styles.deptValue, { color: '#4B5563' }]}>—</Text>
                            </View>
                          );
                        }
                        return (
                          <View key={dept.code} style={styles.deptRow}>
                            <View style={[styles.deptDot, { backgroundColor: deptColor }]} />
                            <Text style={[styles.deptLabel, { color: '#E5E7EB' }]}>{dept.label}</Text>
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
                            <Text style={styles.deptTime}>{formatDuration(dept.minutes)}</Text>
                          </View>
                        );
                      })}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  overallBadge: {
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
  overallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // ── Line section ──
  lineSection: {
    marginBottom: 4,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16162480',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    gap: 12,
  },
  lineIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 80,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lineLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lineStatus: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Metrics (uptime / downtime bars) ──
  lineMetrics: {
    flex: 1,
    gap: 4,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    width: 16,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#2A2A3E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFillUp: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  barFillDown: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 3,
  },
  metricValue: {
    fontSize: 10,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
  },

  // ── Active alert ──
  activeAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
    marginLeft: 3,
    gap: 6,
  },
  activeAlertText: {
    flex: 1,
    fontSize: 10,
    color: '#FCA5A5',
    fontWeight: '600',
  },

  // ── Department breakdown ──
  deptBreakdown: {
    backgroundColor: '#13132080',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    marginLeft: 3,
  },
  deptBreakdownTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  noDtText: {
    fontSize: 11,
    color: '#4B5563',
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
    color: '#9CA3AF',
    width: 44,
  },
  deptBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#2A2A3E',
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
    color: '#6B7280',
    width: 34,
    textAlign: 'right',
  },
});
