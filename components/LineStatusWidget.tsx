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
  Clock,
  Zap,
  CircleOff,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTaskFeedPostsQuery } from '@/hooks/useTaskFeedTemplates';

// The production lines to track — matches ROOM_LINE_OPTIONS in taskfeed
const TRACKED_LINES = [
  { id: 'production_line_1', label: 'Line 1', shortLabel: '1' },
  { id: 'production_line_2', label: 'Line 2', shortLabel: '2' },
  { id: 'production_line_3', label: 'Line 3', shortLabel: '3' },
  { id: 'packaging_line_1', label: 'Pkg 1', shortLabel: 'P1' },
  { id: 'packaging_line_2', label: 'Pkg 2', shortLabel: 'P2' },
];

// Map from notes/form_data room line text to our tracked line IDs
const LINE_NAME_MAP: Record<string, string> = {
  'Production Line 1': 'production_line_1',
  'Production Line 2': 'production_line_2',
  'Production Line 3': 'production_line_3',
  'Packaging Line 1': 'packaging_line_1',
  'Packaging Line 2': 'packaging_line_2',
  'production_line_1': 'production_line_1',
  'production_line_2': 'production_line_2',
  'production_line_3': 'production_line_3',
  'packaging_line_1': 'packaging_line_1',
  'packaging_line_2': 'packaging_line_2',
};

interface DownLine {
  lineId: string;
  postId: string;
  postNumber: string;
  reason: string;
  stoppedAt: string;
  reportedBy: string;
}

export default function LineStatusWidget() {
  const router = useRouter();

  // Query all non-completed task feed posts
  const { data: posts = [] } = useTaskFeedPostsQuery({
    limit: 100,
  });

  // Find active production stoppages
  const downLines = useMemo<DownLine[]>(() => {
    const active: DownLine[] = [];

    for (const post of posts) {
      // Skip completed/cancelled posts — those lines are back up
      if (post.status === 'completed' || post.status === 'cancelled') continue;

      // Check notes for PRODUCTION STOPPED
      const hasStoppageInNotes = post.notes && post.notes.includes('PRODUCTION STOPPED');

      // Check form_data for productionStopped
      const formData = post.formData || {};
      const hasStoppageInForm = formData.productionStopped === 'Yes';

      if (!hasStoppageInNotes && !hasStoppageInForm) continue;

      // Extract room/line
      let roomLine: string | undefined;

      // Try form_data first
      if (formData.roomLine) {
        roomLine = formData.roomLine;
      }

      // Try notes as fallback
      if (!roomLine && post.notes) {
        const match = post.notes.match(/Room\/Line:\s*(.+)/);
        if (match) {
          roomLine = match[1].split('\n')[0].trim();
        }
      }

      if (!roomLine) continue;

      // Map to our tracked line ID
      const lineId = LINE_NAME_MAP[roomLine];
      if (!lineId) continue;

      // Check if we already have this line down (take the most recent)
      if (!active.find(a => a.lineId === lineId)) {
        // Extract reason from notes or template name
        let reason = post.templateName || 'Issue Reported';
        if (post.notes) {
          const firstLine = post.notes.split('\n')[0];
          if (firstLine && firstLine.length < 80) {
            reason = firstLine;
          }
        }

        active.push({
          lineId,
          postId: post.id,
          postNumber: post.postNumber,
          reason,
          stoppedAt: post.createdAt,
          reportedBy: post.createdByName,
        });
      }
    }

    return active;
  }, [posts]);

  const downLineIds = useMemo(() => new Set(downLines.map(d => d.lineId)), [downLines]);
  const linesUp = TRACKED_LINES.filter(l => !downLineIds.has(l.id)).length;
  const linesDown = downLines.length;
  const allUp = linesDown === 0;

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: allUp ? '#10B98120' : '#EF444420' }]}>
            <Activity size={16} color={allUp ? '#10B981' : '#EF4444'} />
          </View>
          <Text style={styles.headerTitle}>Production Status</Text>
        </View>
        <View style={[styles.overallBadge, { backgroundColor: allUp ? '#10B981' : '#EF4444' }]}>
          <View style={[styles.pulseDot, { backgroundColor: '#FFFFFF' }]} />
          <Text style={styles.overallText}>
            {allUp ? 'ALL RUNNING' : `${linesDown} DOWN`}
          </Text>
        </View>
      </View>

      {/* Line Status Grid */}
      <View style={styles.lineGrid}>
        {TRACKED_LINES.map(line => {
          const isDown = downLineIds.has(line.id);
          const downInfo = downLines.find(d => d.lineId === line.id);

          return (
            <Pressable
              key={line.id}
              style={[
                styles.lineCard,
                {
                  backgroundColor: isDown ? '#EF444415' : '#10B98110',
                  borderColor: isDown ? '#EF444440' : '#10B98130',
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (isDown && downInfo) {
                  router.push(`/taskfeed/${downInfo.postId}`);
                } else {
                  router.push('/taskfeed');
                }
              }}
            >
              {/* Status Indicator Dot */}
              <View style={[
                styles.statusDot,
                { backgroundColor: isDown ? '#EF4444' : '#10B981' },
              ]} />

              {/* Line Label */}
              <Text style={[
                styles.lineLabel,
                { color: isDown ? '#EF4444' : '#10B981' },
              ]}>
                {line.label}
              </Text>

              {/* Status Text */}
              <Text style={[
                styles.statusText,
                { color: isDown ? '#FCA5A5' : '#6EE7B7' },
              ]}>
                {isDown ? 'DOWN' : 'Running'}
              </Text>

              {/* Down info */}
              {isDown && downInfo && (
                <View style={styles.downInfo}>
                  <Clock size={8} color="#FCA5A5" />
                  <Text style={styles.downTime}>{formatTimeAgo(downInfo.stoppedAt)}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Active Stoppages Detail */}
      {linesDown > 0 && (
        <View style={styles.stoppageList}>
          {downLines.map(dl => {
            const lineInfo = TRACKED_LINES.find(l => l.id === dl.lineId);
            return (
              <Pressable
                key={dl.lineId}
                style={styles.stoppageRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/taskfeed/${dl.postId}`);
                }}
              >
                <View style={styles.stoppageIconBox}>
                  <AlertTriangle size={12} color="#EF4444" />
                </View>
                <View style={styles.stoppageInfo}>
                  <Text style={styles.stoppageLine}>{lineInfo?.label || dl.lineId}</Text>
                  <Text style={styles.stoppageReason} numberOfLines={1}>{dl.reason}</Text>
                </View>
                <View style={styles.stoppageMeta}>
                  <Text style={styles.stoppageRef}>{dl.postNumber}</Text>
                  <Text style={styles.stoppageTime}>{formatTimeAgo(dl.stoppedAt)}</Text>
                </View>
                <ChevronRight size={14} color="#6B7280" />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

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
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
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
  },
  overallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  lineGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  lineCard: {
    flex: 1,
    minWidth: 60,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 2,
  },
  lineLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  downInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  downTime: {
    fontSize: 8,
    color: '#FCA5A5',
    fontWeight: '500',
  },
  stoppageList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A3E',
    paddingTop: 10,
    gap: 6,
  },
  stoppageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444410',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  stoppageIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EF444420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stoppageInfo: {
    flex: 1,
  },
  stoppageLine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  stoppageReason: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  stoppageMeta: {
    alignItems: 'flex-end',
  },
  stoppageRef: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
  },
  stoppageTime: {
    fontSize: 9,
    color: '#9CA3AF',
  },
});
