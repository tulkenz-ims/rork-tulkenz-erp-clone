import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  XCircle,
  ArrowDownLeft,
  User,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  RejectionHistoryEntry,
  ApprovalTierLevel,
  tierLevelLabels,
  tierLevelColors,
} from '@/types/approvalWorkflows';

interface RejectionHistoryTimelineProps {
  rejections: RejectionHistoryEntry[];
  compact?: boolean;
  showHeader?: boolean;
  maxVisible?: number;
}

export function RejectionHistoryTimeline({
  rejections,
  compact = false,
  showHeader = true,
  maxVisible,
}: RejectionHistoryTimelineProps) {
  const { colors } = useTheme();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const sortedRejections = [...rejections].sort(
    (a, b) => new Date(b.rejectedAt).getTime() - new Date(a.rejectedAt).getTime()
  );

  const visibleRejections = maxVisible && !showAll 
    ? sortedRejections.slice(0, maxVisible)
    : sortedRejections;

  const hasMore = maxVisible && sortedRejections.length > maxVisible;

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const getTierColor = (tier: ApprovalTierLevel) => {
    return tierLevelColors[tier] || '#6B7280';
  };

  const getDestinationText = (entry: RejectionHistoryEntry) => {
    if (entry.returnedToRequestor) {
      return 'Returned to Requestor';
    }
    if (entry.returnedToTier) {
      return `Cascaded to Tier ${entry.returnedToTier}`;
    }
    return 'Rejected';
  };

  const getDestinationIcon = (entry: RejectionHistoryEntry) => {
    if (entry.returnedToRequestor) {
      return <RotateCcw size={12} color="#EF4444" />;
    }
    if (entry.returnedToTier) {
      return <ArrowDownLeft size={12} color="#F59E0B" />;
    }
    return <XCircle size={12} color="#EF4444" />;
  };

  if (rejections.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.compactHeader}>
          <AlertTriangle size={14} color="#EF4444" />
          <Text style={[styles.compactTitle, { color: colors.text }]}>
            {rejections.length} Rejection{rejections.length > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.compactChips}>
          {sortedRejections.slice(0, 3).map((entry, index) => (
            <View 
              key={entry.id}
              style={[styles.compactChip, { backgroundColor: `${getTierColor(entry.tierLevel)}15` }]}
            >
              <Text style={[styles.compactChipText, { color: getTierColor(entry.tierLevel) }]}>
                T{entry.tierLevel}
              </Text>
            </View>
          ))}
          {rejections.length > 3 && (
            <Text style={[styles.compactMore, { color: colors.textTertiary }]}>
              +{rejections.length - 3}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: '#EF444415' }]}>
            <AlertTriangle size={16} color="#EF4444" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Rejection History</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
              {rejections.length} rejection{rejections.length > 1 ? 's' : ''} recorded
            </Text>
          </View>
        </View>
      )}

      <View style={styles.timeline}>
        {visibleRejections.map((entry, index) => {
          const isExpanded = expandedIds.has(entry.id);
          const isLast = index === visibleRejections.length - 1;
          const tierColor = getTierColor(entry.tierLevel);

          return (
            <View key={entry.id} style={styles.entryContainer}>
              <View style={styles.entryIndicatorColumn}>
                <View style={[styles.entryIndicator, { backgroundColor: '#EF4444' }]}>
                  <XCircle size={14} color="#FFF" />
                </View>
                {!isLast && (
                  <View style={[styles.entryLine, { backgroundColor: colors.border }]} />
                )}
              </View>

              <Pressable
                style={[
                  styles.entryContent,
                  { 
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => toggleExpand(entry.id)}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.entryHeaderLeft}>
                    <View style={styles.tierBadgeRow}>
                      <View style={[styles.tierBadge, { backgroundColor: `${tierColor}15` }]}>
                        <Text style={[styles.tierBadgeText, { color: tierColor }]}>
                          Tier {entry.tierLevel}
                        </Text>
                      </View>
                      <View style={[styles.destinationBadge, { backgroundColor: colors.backgroundSecondary }]}>
                        {getDestinationIcon(entry)}
                        <Text style={[styles.destinationText, { color: colors.textSecondary }]}>
                          {getDestinationText(entry)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.entryTime, { color: colors.textTertiary }]}>
                      {formatRelativeTime(entry.rejectedAt)}
                    </Text>
                  </View>
                  <View style={styles.entryHeaderRight}>
                    {isExpanded 
                      ? <ChevronUp size={18} color={colors.textTertiary} />
                      : <ChevronDown size={18} color={colors.textTertiary} />
                    }
                  </View>
                </View>

                <View style={styles.rejectorRow}>
                  <View style={[styles.rejectorAvatar, { backgroundColor: colors.backgroundSecondary }]}>
                    <User size={12} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.rejectorName, { color: colors.text }]}>
                    {entry.rejectedBy}
                  </Text>
                </View>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                    <View style={[styles.reasonBox, { backgroundColor: colors.backgroundSecondary }]}>
                      <View style={styles.reasonHeader}>
                        <MessageSquare size={12} color={colors.textTertiary} />
                        <Text style={[styles.reasonLabel, { color: colors.textTertiary }]}>
                          Rejection Reason
                        </Text>
                      </View>
                      <Text style={[styles.reasonText, { color: colors.text }]}>
                        {entry.reason}
                      </Text>
                    </View>

                    <View style={styles.detailsGrid}>
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                          Date & Time
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {formatDate(entry.rejectedAt)}
                        </Text>
                      </View>

                      {entry.stepName && (
                        <View style={styles.detailItem}>
                          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                            Step
                          </Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>
                            {entry.stepName}
                          </Text>
                        </View>
                      )}

                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                          Previous Status
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {entry.previousStatus.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Text>
                      </View>

                      {entry.returnedToTier && !entry.returnedToRequestor && (
                        <View style={styles.detailItem}>
                          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                            Cascaded To
                          </Text>
                          <View style={styles.cascadeIndicator}>
                            <ArrowLeft size={12} color={getTierColor(entry.returnedToTier)} />
                            <Text style={[styles.detailValue, { color: getTierColor(entry.returnedToTier) }]}>
                              {tierLevelLabels[entry.returnedToTier]}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      {hasMore && (
        <Pressable
          style={[styles.showMoreButton, { borderColor: colors.border }]}
          onPress={() => setShowAll(!showAll)}
        >
          <Text style={[styles.showMoreText, { color: colors.primary }]}>
            {showAll ? 'Show Less' : `Show ${sortedRejections.length - (maxVisible || 0)} More`}
          </Text>
          {showAll 
            ? <ChevronUp size={16} color={colors.primary} />
            : <ChevronDown size={16} color={colors.primary} />
          }
        </Pressable>
      )}
    </View>
  );
}

export function RejectionCascadeIndicator({
  fromTier,
  toTier,
  toRequestor,
}: {
  fromTier: ApprovalTierLevel;
  toTier?: ApprovalTierLevel;
  toRequestor?: boolean;
}) {
  const fromColor = tierLevelColors[fromTier];
  const toColor = toTier ? tierLevelColors[toTier] : '#6B7280';

  return (
    <View style={styles.cascadeContainer}>
      <View style={[styles.cascadeBadge, { backgroundColor: `${fromColor}15` }]}>
        <Text style={[styles.cascadeBadgeText, { color: fromColor }]}>T{fromTier}</Text>
      </View>
      <View style={styles.cascadeArrow}>
        <ArrowDownLeft size={14} color="#9CA3AF" />
      </View>
      {toRequestor ? (
        <View style={[styles.cascadeBadge, { backgroundColor: '#EF444415' }]}>
          <RotateCcw size={12} color="#EF4444" />
          <Text style={[styles.cascadeBadgeText, { color: '#EF4444', marginLeft: 4 }]}>
            Requestor
          </Text>
        </View>
      ) : toTier ? (
        <View style={[styles.cascadeBadge, { backgroundColor: `${toColor}15` }]}>
          <Text style={[styles.cascadeBadgeText, { color: toColor }]}>T{toTier}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function RejectionSummaryBadge({
  count,
  lastRejectionTier,
  onPress,
}: {
  count: number;
  lastRejectionTier?: ApprovalTierLevel;
  onPress?: () => void;
}) {
  if (count === 0) return null;

  const tierColor = lastRejectionTier ? tierLevelColors[lastRejectionTier] : '#EF4444';

  return (
    <Pressable
      style={[styles.summaryBadge, { backgroundColor: '#EF444415' }]}
      onPress={onPress}
    >
      <XCircle size={12} color="#EF4444" />
      <Text style={[styles.summaryBadgeText, { color: '#EF4444' }]}>
        {count} rejection{count > 1 ? 's' : ''}
      </Text>
      {lastRejectionTier && (
        <View style={[styles.summaryTierDot, { backgroundColor: tierColor }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  timeline: {
    gap: 0,
  },
  entryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  entryIndicatorColumn: {
    alignItems: 'center',
    width: 28,
  },
  entryIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
  },
  entryContent: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    paddingBottom: 8,
  },
  entryHeaderLeft: {
    flex: 1,
    gap: 6,
  },
  entryHeaderRight: {
    paddingLeft: 8,
  },
  tierBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  destinationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  destinationText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  entryTime: {
    fontSize: 11,
  },
  rejectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  rejectorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectorName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: 12,
    gap: 12,
  },
  reasonBox: {
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  detailsGrid: {
    gap: 10,
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  cascadeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactTitle: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  compactChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactChipText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  compactMore: {
    fontSize: 10,
    marginLeft: 2,
  },
  cascadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cascadeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cascadeBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  cascadeArrow: {
    padding: 2,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  summaryTierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default RejectionHistoryTimeline;
