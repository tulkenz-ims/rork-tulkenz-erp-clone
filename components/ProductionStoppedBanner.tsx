import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Siren, CheckCircle, Clock } from 'lucide-react-native';

interface Props {
  notes: string;
  status: string; // 'flagged' = active, 'verified' = resolved
  createdAt: string; // ISO timestamp - start of downtime
  resolvedAt?: string; // ISO timestamp - end of downtime (updated_at when resolved)
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default function ProductionStoppedBanner({ notes, status, createdAt, resolvedAt }: Props) {
  const [now, setNow] = useState(Date.now());
  const isResolved = status === 'verified';

  // Live timer tick every second when active
  useEffect(() => {
    if (isResolved) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isResolved]);

  // Extract room/line from notes
  const roomLineMatch = notes.match(/Room\/Line:\s*(.+)/);
  const roomLine = roomLineMatch?.[1]?.split('\n')[0]?.trim();

  // Calculate duration
  const startTime = new Date(createdAt).getTime();
  const endTime = isResolved && resolvedAt ? new Date(resolvedAt).getTime() : now;
  const durationMs = Math.max(0, endTime - startTime);
  const durationStr = formatDuration(durationMs);

  if (isResolved) {
    // ── Resolved banner ──
    return (
      <View style={styles.resolvedBanner}>
        <View style={styles.resolvedIcon}>
          <CheckCircle size={14} color="#10B981" />
        </View>
        <View style={styles.content}>
          <Text style={styles.resolvedTitle}>PRODUCTION RESTORED</Text>
          {roomLine && (
            <Text style={styles.resolvedLine}>{roomLine}</Text>
          )}
        </View>
        <View style={styles.resolvedDuration}>
          <Clock size={10} color="#6B7280" />
          <Text style={styles.resolvedDurationText}>Down {durationStr}</Text>
        </View>
      </View>
    );
  }

  // ── Active banner with live timer ──
  return (
    <View style={styles.activeBanner}>
      <View style={styles.activeIcon}>
        <Siren size={14} color="#FFFFFF" />
      </View>
      <View style={styles.content}>
        <Text style={styles.activeTitle}>PRODUCTION STOPPED</Text>
        {roomLine && (
          <Text style={styles.activeLine}>{roomLine}</Text>
        )}
      </View>
      <View style={styles.timerBadge}>
        <Clock size={10} color="#FFFFFF" />
        <Text style={styles.timerText}>{durationStr}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Active (red) ──
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 10,
  },
  activeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  activeTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeLine: {
    color: '#FECACA',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF40',
    gap: 4,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // ── Resolved (dark with green accent) ──
  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  resolvedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resolvedTitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  resolvedLine: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  resolvedDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  resolvedDurationText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
});
