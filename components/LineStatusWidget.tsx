import React, { useMemo } from 'react';
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
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Package,
  Radio,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

// ══════════════════════════════════ TYPES ══════════════════════════════════

interface RoomStatus {
  room_code: string;
  room_name: string;
  status: string;
  andon_color: string;
  bags_today: number;
  bags_per_minute: number;
  target_bags_per_minute: number;
  uptime_percent: number;
  personnel_count: number;
  current_run_number: string | null;
  updated_at: string;
}

// ══════════════════════════════════ CONSTANTS ══════════════════════════════════

const ANDON_COLORS: Record<string, string> = {
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  blue: '#3B82F6',
  gray: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  running: 'RUNNING',
  idle: 'IDLE',
  cleaning: 'CLEANING',
  loto: 'LOTO',
  setup: 'SETUP',
};

const ROOM_ICONS: Record<string, string> = {
  PA1: '📦',
  PR1: '🏭',
  PR2: '🏭',
};

// ══════════════════════════════════ COMPONENT ══════════════════════════════════

export default function LineStatusWidget() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  // ── Fetch room statuses ──
  const { data: rooms = [] } = useQuery({
    queryKey: ['room_status', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('room_status')
        .select('*')
        .eq('organization_id', organizationId)
        .in('room_code', ['PR1', 'PR2', 'PA1'])
        .order('room_code');
      if (error) {
        console.error('[LineStatusWidget] Error:', error);
        return [];
      }
      return (data || []) as RoomStatus[];
    },
    enabled: !!organizationId,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // ── Derived stats ──
  const anyIssue = rooms.some(r => r.andon_color === 'red' || r.andon_color === 'yellow');
  const runningCount = rooms.filter(r => r.status === 'running' && r.andon_color === 'green').length;
  const totalRooms = rooms.length;

  const handleRoomPress = (roomCode: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/production/room-dashboard?room=${roomCode}`);
  };

  // ── If no rooms configured yet, show placeholder ──
  if (rooms.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Activity size={16} color={colors.warning || '#F59E0B'} />
            <View>
              <Text style={styles.headerTitle}>Live Room Status</Text>
              <Text style={styles.headerSub}>Real-time production monitoring</Text>
            </View>
          </View>
          <View style={[styles.overallBadge, { backgroundColor: '#6B7280' }]}>
            <View style={styles.pulseDot} />
            <Text style={styles.overallBadgeText}>NO DATA</Text>
          </View>
        </View>
        <View style={[styles.placeholderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Radio size={24} color={colors.textTertiary} />
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            Start the simulator to see live room data
          </Text>
          <Text style={[styles.placeholderSub, { color: colors.textTertiary }]}>
            /api/simulator?action=start
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Activity size={16} color={colors.warning || '#F59E0B'} />
          <View>
            <Text style={styles.headerTitle}>Live Room Status</Text>
            <Text style={styles.headerSub}>Real-time · Tap room for details</Text>
          </View>
        </View>
        <View style={[
          styles.overallBadge, 
          { backgroundColor: anyIssue ? '#EF4444' : runningCount > 0 ? '#10B981' : '#6B7280' }
        ]}>
          <View style={styles.pulseDot} />
          <Text style={styles.overallBadgeText}>
            {anyIssue ? 'ALERT' : runningCount > 0 ? `${runningCount}/${totalRooms} LIVE` : 'ALL IDLE'}
          </Text>
        </View>
      </View>

      {/* ── Room Cards ── */}
      <View style={styles.roomsRow}>
        {rooms.map(room => {
          const andonColor = ANDON_COLORS[room.andon_color] || '#6B7280';
          const isRunning = room.status === 'running';
          const bpmPercent = room.target_bags_per_minute > 0 
            ? (room.bags_per_minute / room.target_bags_per_minute) * 100 
            : 0;
          const bpmColor = bpmPercent >= 90 ? '#10B981' : bpmPercent >= 70 ? '#F59E0B' : bpmPercent > 0 ? '#EF4444' : '#6B7280';

          return (
            <Pressable
              key={room.room_code}
              style={({ pressed }) => [
                styles.roomCard,
                { borderColor: andonColor + '60' },
                pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => handleRoomPress(room.room_code)}
            >
              {/* Andon strip at top */}
              <View style={[styles.andonStrip, { backgroundColor: andonColor }]} />

              {/* Status badge */}
              <View style={styles.roomCardTop}>
                <View style={[styles.andonDot, { backgroundColor: andonColor }]} />
                <View style={[styles.statusLabel, { backgroundColor: andonColor + '20' }]}>
                  <Text style={[styles.statusLabelText, { color: andonColor }]}>
                    {STATUS_LABELS[room.status] || room.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Main metric */}
              {isRunning && room.bags_per_minute > 0 ? (
                <View style={styles.heroSection}>
                  <Text style={[styles.heroValue, { color: bpmColor }]}>
                    {Math.round(room.bags_per_minute)}
                  </Text>
                  <Text style={[styles.heroUnit, { color: colors.textTertiary }]}>
                    /{room.target_bags_per_minute} bags/min
                  </Text>
                </View>
              ) : (
                <View style={styles.heroSection}>
                  <Text style={[styles.heroValue, { color: andonColor }]}>
                    {room.status === 'idle' ? '—' : room.status === 'cleaning' ? '🧹' : room.status === 'loto' ? '🔒' : '⚙️'}
                  </Text>
                  <Text style={[styles.heroUnit, { color: colors.textTertiary }]}>
                    {STATUS_LABELS[room.status] || room.status}
                  </Text>
                </View>
              )}

              {/* Room name */}
              <Text style={[styles.roomName, { color: colors.text }]}>{room.room_name}</Text>
              <Text style={[styles.roomCode, { color: colors.textTertiary }]}>{room.room_code}</Text>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Package size={10} color={colors.textTertiary} />
                  <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                    {room.bags_today > 0 ? room.bags_today.toLocaleString() : '0'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <TrendingUp size={10} color={colors.textTertiary} />
                  <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                    {room.uptime_percent || 0}%
                  </Text>
                </View>
              </View>

              {/* BPM progress bar */}
              {isRunning && room.target_bags_per_minute > 0 && (
                <View style={styles.bpmBar}>
                  <View style={[styles.bpmTrack, { backgroundColor: colors.backgroundSecondary }]}>
                    <View style={[
                      styles.bpmFill, 
                      { 
                        width: `${Math.min(100, bpmPercent)}%`,
                        backgroundColor: bpmColor,
                      }
                    ]} />
                  </View>
                </View>
              )}

              {/* Tap indicator */}
              <View style={styles.tapIndicator}>
                <ChevronRight size={12} color={colors.textTertiary} />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ── Alert bar if any room has issues ── */}
      {rooms.some(r => r.andon_color === 'red') && (
        <View style={styles.alertBar}>
          <AlertTriangle size={12} color="#FCA5A5" />
          <Text style={styles.alertText}>
            {rooms.filter(r => r.andon_color === 'red').map(r => r.room_code).join(', ')} — Equipment alert active
          </Text>
        </View>
      )}
    </View>
  );
}

// ══════════════════════════════════ STYLES ══════════════════════════════════

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
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 10,
    color: colors.textTertiary,
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
  overallBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  roomsRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  roomCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    paddingTop: 6,
    borderWidth: 1,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  andonStrip: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  roomCardTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  andonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusLabelText: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
  },
  heroSection: {
    marginBottom: 6,
  },
  heroValue: {
    fontSize: 26,
    fontWeight: '800' as const,
  },
  heroUnit: {
    fontSize: 10,
    marginTop: 1,
  },
  roomName: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  roomCode: {
    fontSize: 10,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  statValue: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  bpmBar: {
    marginTop: 8,
  },
  bpmTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  bpmFill: {
    height: '100%' as any,
    borderRadius: 2,
  },
  tapIndicator: {
    position: 'absolute' as const,
    bottom: 8,
    right: 8,
  },
  alertBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#EF444415',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 6,
  },
  alertText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FCA5A5',
    flex: 1,
  },
  placeholderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center' as const,
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  placeholderSub: {
    fontSize: 11,
    textAlign: 'center' as const,
  },
});
